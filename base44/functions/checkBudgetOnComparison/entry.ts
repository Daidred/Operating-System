import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Pull a numeric total out of a (possibly messy) extracted data object.
function extractTotal(data) {
  if (!data || typeof data !== 'object') return null;

  // Common direct keys
  const directKeys = ['total', 'total_amount', 'grand_total', 'total_value', 'amount', 'invoice_total', 'po_total'];
  for (const k of directKeys) {
    const v = data[k];
    const n = toNumber(v);
    if (n !== null) return n;
  }

  // Sum line items if present
  const lineKeys = ['line_items', 'items', 'lines', 'sublines'];
  for (const k of lineKeys) {
    if (Array.isArray(data[k])) {
      let sum = 0;
      let found = false;
      for (const item of data[k]) {
        const amt = toNumber(item?.amount ?? item?.total ?? item?.line_total);
        if (amt !== null) { sum += amt; found = true; continue; }
        const qty = toNumber(item?.quantity ?? item?.qty);
        const price = toNumber(item?.unit_price ?? item?.price);
        if (qty !== null && price !== null) { sum += qty * price; found = true; }
      }
      if (found) return sum;
    }
  }
  return null;
}

function toNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.\-]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const event = body?.event || {};
    const comparisonId = event?.entity_id || body?.entity_id;

    if (!comparisonId) {
      return Response.json({ error: 'Missing comparison entity_id' }, { status: 400 });
    }

    const comparison = await base44.asServiceRole.entities.POInvoiceComparison.get(comparisonId);
    if (!comparison) {
      return Response.json({ error: 'Comparison not found' }, { status: 404 });
    }

    // Resolve the linked project (if any)
    let project = null;
    if (comparison.project_id) {
      project = await base44.asServiceRole.entities.SourcingProject.get(comparison.project_id).catch(() => null);
    }

    const poTotal = extractTotal(comparison.po_data);
    const invoiceTotal = extractTotal(comparison.invoice_data);
    const compareTotal = invoiceTotal ?? poTotal;

    let budget_check;

    if (!project) {
      budget_check = {
        po_total: poTotal,
        invoice_total: invoiceTotal,
        verdict: 'No Budget Set',
        over_budget: false,
        message: 'No sourcing project linked to this comparison, so no budget check was performed.'
      };
    } else if (project.target_price === null || project.target_price === undefined) {
      budget_check = {
        project_target_price: null,
        project_currency: project.target_price_currency || 'USD',
        po_total: poTotal,
        invoice_total: invoiceTotal,
        verdict: 'No Budget Set',
        over_budget: false,
        message: `Project "${project.name}" has no target price set.`
      };
    } else if (compareTotal === null) {
      budget_check = {
        project_target_price: project.target_price,
        project_currency: project.target_price_currency || 'USD',
        po_total: poTotal,
        invoice_total: invoiceTotal,
        verdict: 'Insufficient Data',
        over_budget: false,
        message: 'Could not determine a total amount from the PO or invoice data.'
      };
    } else {
      const budget = project.target_price;
      const variance = compareTotal - budget;
      const variancePct = budget !== 0 ? (variance / budget) * 100 : 0;
      const overBudget = variance > 0;
      budget_check = {
        project_target_price: budget,
        project_currency: project.target_price_currency || 'USD',
        po_total: poTotal,
        invoice_total: invoiceTotal,
        over_budget: overBudget,
        variance_amount: Math.round(variance * 100) / 100,
        variance_pct: Math.round(variancePct * 100) / 100,
        verdict: overBudget ? 'Over Budget' : 'Within Budget',
        message: overBudget
          ? `Over budget by ${Math.round(variance * 100) / 100} (${Math.round(variancePct * 100) / 100}%) vs target of ${budget}.`
          : `Within budget — ${Math.round(Math.abs(variance) * 100) / 100} (${Math.round(Math.abs(variancePct) * 100) / 100}%) under target of ${budget}.`
      };
    }

    await base44.asServiceRole.entities.POInvoiceComparison.update(comparisonId, { budget_check });

    return Response.json({ success: true, comparisonId, budget_check });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
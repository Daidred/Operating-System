import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, Trophy, TrendingDown, Save, X, FileDown } from 'lucide-react';
import { format } from 'date-fns';

const INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP', 'FCA', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'THB', 'CNY', 'GBP', 'Other'];
const STATUSES = ['Pending Review', 'Shortlisted', 'Rejected', 'Approved'];

const STATUS_COLOR = {
  'Pending Review': 'bg-amber-100 text-amber-700',
  Shortlisted: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700',
  Approved: 'bg-emerald-100 text-emerald-700',
};

function Cell({ children, className = '' }) {
  return <td className={`px-3 py-2 text-xs border-b border-border align-middle ${className}`}>{children}</td>;
}

function InlineInput({ value, onChange, placeholder, type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground/50 focus:bg-primary/5 rounded px-1 py-0.5 ${className}`}
    />
  );
}

function QuoteRow({ quote, isBest, targetPrice, onUpdate, onDelete }) {
  const [row, setRow] = useState({ ...quote });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(quote.id, row);
    setDirty(false);
    setSaving(false);
  };

  const priceDiff = targetPrice && row.price
    ? ((row.price - targetPrice) / targetPrice * 100).toFixed(1)
    : null;

  const rowBg = row.status === 'Approved' ? 'bg-emerald-50/60' :
    row.status === 'Rejected' ? 'bg-red-50/30 opacity-60' :
    isBest ? 'bg-primary/5' : '';

  return (
    <tr className={`group hover:bg-muted/20 transition-colors ${rowBg}`}>
      <Cell>
        <div className="flex items-center gap-1">
          {isBest && <Trophy className="w-3 h-3 text-primary shrink-0" />}
          <InlineInput value={row.supplier_name} onChange={v => set('supplier_name', v)} placeholder="Supplier name" className="font-medium" />
        </div>
      </Cell>
      <Cell><InlineInput value={row.product} onChange={v => set('product', v)} placeholder="e.g. 10/12 OZ" /></Cell>
      <Cell><InlineInput value={row.origin} onChange={v => set('origin', v)} placeholder="Country" /></Cell>
      <Cell className="min-w-[130px]">
        <div className="flex items-center gap-1">
          <InlineInput type="number" value={row.price} onChange={v => set('price', parseFloat(v))} placeholder="0.00" className="w-16 font-semibold" />
          <Select value={row.currency || 'USD'} onValueChange={v => set('currency', v)}>
            <SelectTrigger className="h-5 w-16 text-[10px] border-0 bg-transparent px-1 py-0 focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {priceDiff !== null && (
          <span className={`text-[10px] font-semibold ${parseFloat(priceDiff) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {parseFloat(priceDiff) > 0 ? `+${priceDiff}%` : `${priceDiff}%`} vs target
          </span>
        )}
      </Cell>
      <Cell>
        <Select value={row.incoterm || 'FOB'} onValueChange={v => set('incoterm', v)}>
          <SelectTrigger className="h-5 w-20 text-[10px] border-0 bg-transparent px-1 py-0 focus:ring-0"><SelectValue /></SelectTrigger>
          <SelectContent>{INCOTERMS.map(i => <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>)}</SelectContent>
        </Select>
      </Cell>
      {/* Landed cost THB */}
      <Cell className="min-w-[110px]">
        <div className="flex items-center gap-0.5">
          <InlineInput type="number" value={row.landed_cost_thb} onChange={v => set('landed_cost_thb', parseFloat(v))} placeholder="0" className="w-20 font-semibold text-emerald-700" />
          <span className="text-[10px] text-muted-foreground shrink-0">฿</span>
        </div>
      </Cell>
      <Cell><InlineInput value={row.moq} onChange={v => set('moq', v)} placeholder="e.g. 1 FCL" /></Cell>
      <Cell><InlineInput value={row.lead_time} onChange={v => set('lead_time', v)} placeholder="e.g. 6 wks" /></Cell>
      <Cell><InlineInput value={row.payment_terms} onChange={v => set('payment_terms', v)} placeholder="e.g. 30% TT" /></Cell>
      <Cell>
        <Select value={row.status || 'Pending Review'} onValueChange={v => set('status', v)}>
          <SelectTrigger className={`h-6 text-[10px] border-0 px-2 rounded-full font-semibold focus:ring-0 ${STATUS_COLOR[row.status] || STATUS_COLOR['Pending Review']}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </Cell>
      <Cell className="w-16">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {dirty && (
            <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            </button>
          )}
          <button onClick={() => onDelete(quote.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </Cell>
    </tr>
  );
}

function NewQuoteRow({ projectId, project, supplierNames, onSave, onCancel }) {
  const [row, setRow] = useState({
    project_id: projectId,
    project_name: project?.name || '',
    status: 'Pending Review',
    currency: 'USD',
    incoterm: 'CIF',
  });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setRow(p => ({ ...p, [f]: v }));

  const handleSave = async () => {
    if (!row.supplier_name) return;
    setSaving(true);
    await onSave(row);
    setSaving(false);
  };

  return (
    <tr className="bg-primary/5 border-t-2 border-primary/30">
      <Cell>
        {supplierNames.length > 0 ? (
          <Select value={row.supplier_name || ''} onValueChange={v => set('supplier_name', v)}>
            <SelectTrigger className="h-6 text-xs border border-primary/30"><SelectValue placeholder="Supplier *" /></SelectTrigger>
            <SelectContent>{supplierNames.map(s => <SelectItem key={s.id} value={s.name} className="text-xs">{s.name}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <input autoFocus value={row.supplier_name || ''} onChange={e => set('supplier_name', e.target.value)} placeholder="Supplier name *"
            className="w-full h-6 px-2 text-xs border border-primary/30 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" />
        )}
      </Cell>
      <Cell><input value={row.product || ''} onChange={e => set('product', e.target.value)} placeholder="Product / size" className="w-full h-6 px-1 text-xs border border-border rounded focus:outline-none" /></Cell>
      <Cell><input value={row.origin || ''} onChange={e => set('origin', e.target.value)} placeholder="Country" className="w-full h-6 px-1 text-xs border border-border rounded focus:outline-none" /></Cell>
      <Cell>
        <div className="flex items-center gap-1">
          <input type="number" value={row.price || ''} onChange={e => set('price', parseFloat(e.target.value))} placeholder="0.00" className="w-16 h-6 px-1 text-xs border border-border rounded focus:outline-none" />
          <Select value={row.currency} onValueChange={v => set('currency', v)}>
            <SelectTrigger className="h-6 w-16 text-[10px] px-1"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Cell>
      <Cell>
        <Select value={row.incoterm} onValueChange={v => set('incoterm', v)}>
          <SelectTrigger className="h-6 w-20 text-[10px] px-1"><SelectValue /></SelectTrigger>
          <SelectContent>{INCOTERMS.map(i => <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>)}</SelectContent>
        </Select>
      </Cell>
      <Cell>
        <div className="flex items-center gap-0.5">
          <input type="number" value={row.landed_cost_thb || ''} onChange={e => set('landed_cost_thb', parseFloat(e.target.value))} placeholder="0" className="w-20 h-6 px-1 text-xs border border-border rounded focus:outline-none" />
          <span className="text-[10px] text-muted-foreground">฿</span>
        </div>
      </Cell>
      <Cell><input value={row.moq || ''} onChange={e => set('moq', e.target.value)} placeholder="MOQ" className="w-full h-6 px-1 text-xs border border-border rounded focus:outline-none" /></Cell>
      <Cell><input value={row.lead_time || ''} onChange={e => set('lead_time', e.target.value)} placeholder="Lead time" className="w-full h-6 px-1 text-xs border border-border rounded focus:outline-none" /></Cell>
      <Cell><input value={row.payment_terms || ''} onChange={e => set('payment_terms', e.target.value)} placeholder="Payment" className="w-full h-6 px-1 text-xs border border-border rounded focus:outline-none" /></Cell>
      <Cell>
        <Select value={row.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="h-6 text-[10px] px-1"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </Cell>
      <Cell>
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={saving || !row.supplier_name} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
      </Cell>
    </tr>
  );
}

// ─── PDF Report Generator ────────────────────────────────────────────────────
function generateReport(project, quotes, bestPrice) {
  const today = format(new Date(), 'dd MMM yyyy');
  const sorted = [...quotes].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

  const statusBadge = (status) => {
    const colors = {
      'Approved': '#d1fae5',
      'Shortlisted': '#dbeafe',
      'Rejected': '#fee2e2',
      'Pending Review': '#fef3c7',
    };
    const text = {
      'Approved': '#065f46',
      'Shortlisted': '#1e40af',
      'Rejected': '#991b1b',
      'Pending Review': '#92400e',
    };
    return `<span style="background:${colors[status]||'#f3f4f6'};color:${text[status]||'#374151'};padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;">${status}</span>`;
  };

  const rows = sorted.map((q, i) => {
    const isBest = q.price === bestPrice && q.status !== 'Rejected';
    const priceDiff = project?.target_price && q.price
      ? ((q.price - project.target_price) / project.target_price * 100).toFixed(1)
      : null;
    return `
      <tr style="background:${isBest ? '#f0fdf4' : i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
          ${isBest ? '🏆 ' : ''}<strong>${q.supplier_name || '—'}</strong>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${q.product || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${q.origin || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">
          ${q.price ? `${q.price} ${q.currency || 'USD'}` : '—'}
          ${priceDiff !== null ? `<br><span style="font-size:10px;color:${parseFloat(priceDiff) > 0 ? '#ef4444' : '#10b981'};font-weight:600;">${parseFloat(priceDiff) > 0 ? '+' : ''}${priceDiff}% vs target</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${q.incoterm || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#059669;">
          ${q.landed_cost_thb ? `฿${Number(q.landed_cost_thb).toLocaleString()}` : '—'}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${q.moq || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${q.lead_time || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${q.payment_terms || '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${statusBadge(q.status || 'Pending Review')}</td>
      </tr>
    `;
  }).join('');

  const validPrices = quotes.filter(q => q.price && q.status !== 'Rejected').map(q => q.price);
  const avgPrice = validPrices.length > 0 ? (validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2) : null;
  const approved = quotes.filter(q => q.status === 'Approved');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Price Comparison Report — ${project?.name || 'Project'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; }
    .page { max-width: 1100px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1a3a4a; }
    .logo { font-size: 22px; font-weight: 800; color: #1a3a4a; }
    .logo span { color: #e8796a; }
    .meta { text-align: right; font-size: 12px; color: #6b7280; }
    .title { font-size: 26px; font-weight: 700; color: #1a3a4a; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; text-align: center; }
    .kpi.best { background: #f0fdf4; border-color: #6ee7b7; }
    .kpi-val { font-size: 20px; font-weight: 700; color: #1a3a4a; }
    .kpi.best .kpi-val { color: #059669; }
    .kpi-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }
    .section-title { font-size: 13px; font-weight: 700; color: #1a3a4a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1a3a4a; color: #fff; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .target-bar { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 12px; display: flex; gap: 16px; align-items: center; }
    .notes { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
    ${approved.length > 0 ? '.approved-box { background:#f0fdf4; border:1px solid #6ee7b7; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:12px; color:#065f46; }' : ''}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">Thammachart <span>Seafood</span></div>
      <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Sourcing CRM — Price Comparison Report</div>
    </div>
    <div class="meta">
      <div>Generated: ${today}</div>
      ${project?.deadline ? `<div>Deadline: ${project.deadline}</div>` : ''}
    </div>
  </div>

  <div class="title">${project?.name || 'Project'}</div>
  <div class="subtitle">
    ${[project?.product_category, project?.target_origin].filter(Boolean).join(' · ')}
    ${project?.product_specification ? ` · ${project.product_specification}` : ''}
  </div>

  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${quotes.length}</div><div class="kpi-label">Quotes received</div></div>
    <div class="kpi best"><div class="kpi-val">${bestPrice ? `${bestPrice} ${quotes.find(q => q.price === bestPrice)?.currency || 'USD'}` : '—'}</div><div class="kpi-label">Best price</div></div>
    <div class="kpi"><div class="kpi-val">${avgPrice ? `${avgPrice} USD` : '—'}</div><div class="kpi-label">Average price</div></div>
    <div class="kpi"><div class="kpi-val">${approved.length > 0 ? approved[0].supplier_name : '—'}</div><div class="kpi-label">Approved supplier</div></div>
  </div>

  ${project?.target_price ? `
  <div class="target-bar">
    🎯 <strong>Target price:</strong> ${project.target_price} ${project.target_price_currency || 'USD'}
    ${bestPrice && bestPrice <= project.target_price ? '&nbsp;&nbsp;✅ <strong>Target met!</strong>' : ''}
  </div>` : ''}

  ${approved.length > 0 ? `<div class="approved-box">✅ <strong>Approved supplier:</strong> ${approved.map(q => `${q.supplier_name}${q.price ? ` — ${q.price} ${q.currency || 'USD'}` : ''}`).join(', ')}</div>` : ''}

  <div class="section-title">Supplier Comparison</div>
  <table>
    <thead>
      <tr>
        <th>Supplier</th>
        <th>Product / Size</th>
        <th>Origin</th>
        <th>Unit Price</th>
        <th>Incoterm</th>
        <th>Landed Cost (THB)</th>
        <th>MOQ</th>
        <th>Lead Time</th>
        <th>Payment</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="notes">
    <p>This report was generated automatically by the Thammachart Seafood Sourcing CRM on ${today}.</p>
    <p>Prices and terms are subject to final supplier confirmation. All figures are indicative.</p>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Price_Comparison_${(project?.name || 'Report').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectPriceComparisonTab({ projectId, project }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['project-quotations', projectId],
    queryFn: () => base44.entities.Quotation.filter({ project_id: projectId }, 'created_date', 50),
  });

  const { data: supplierLinks = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplierLink.filter({ project_id: projectId }),
  });

  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Quotation.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-quotations', projectId] }); setAdding(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quotation.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-quotations', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Quotation.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-quotations', projectId] }),
  });

  const linkedSupplierNames = supplierLinks.map(l => {
    const s = allSuppliers.find(sup => sup.id === l.supplier_id);
    return s ? { id: s.id, name: s.name } : { id: l.supplier_id, name: l.supplier_name };
  });

  const validPrices = quotes.filter(q => q.price && q.status !== 'Rejected').map(q => q.price);
  const bestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
  const avgPrice = validPrices.length > 0 ? (validPrices.reduce((a, b) => a + b, 0) / validPrices.length).toFixed(2) : null;

  const sorted = [...quotes].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

  return (
    <div className="space-y-3">
      {/* Summary KPIs */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-foreground">{quotes.length}</p>
            <p className="text-[10px] text-muted-foreground">Quotes received</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-emerald-700">{bestPrice ? `${bestPrice} ${quotes.find(q => q.price === bestPrice)?.currency || 'USD'}` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Best price</p>
          </div>
          <div className="bg-card border rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-foreground">{avgPrice ? `${avgPrice} USD` : '—'}</p>
            <p className="text-[10px] text-muted-foreground">Average price</p>
          </div>
        </div>
      )}

      {/* Target price */}
      {project?.target_price && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border text-xs">
          <TrendingDown className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-muted-foreground">Target:</span>
          <span className="font-semibold">{project.target_price} {project.target_price_currency || 'USD'}</span>
          {bestPrice && bestPrice <= project.target_price && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">✓ Target met!</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        {quotes.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => generateReport(project, quotes, bestPrice)}>
            <FileDown className="w-3.5 h-3.5 mr-1" /> Export Report
          </Button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Quote
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Supplier</th>
                <th className="px-3 py-2 font-semibold">Product / Size</th>
                <th className="px-3 py-2 font-semibold">Origin</th>
                <th className="px-3 py-2 font-semibold">Price</th>
                <th className="px-3 py-2 font-semibold">Incoterm</th>
                <th className="px-3 py-2 font-semibold text-emerald-700">Landed Cost (฿)</th>
                <th className="px-3 py-2 font-semibold">MOQ</th>
                <th className="px-3 py-2 font-semibold">Lead Time</th>
                <th className="px-3 py-2 font-semibold">Payment</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(q => (
                <QuoteRow
                  key={q.id}
                  quote={q}
                  isBest={q.price === bestPrice && q.status !== 'Rejected'}
                  targetPrice={project?.target_price}
                  onUpdate={(id, data) => updateMutation.mutateAsync({ id, data })}
                  onDelete={id => deleteMutation.mutate(id)}
                />
              ))}
              {adding && (
                <NewQuoteRow
                  projectId={projectId}
                  project={project}
                  supplierNames={linkedSupplierNames}
                  onSave={data => createMutation.mutateAsync(data)}
                  onCancel={() => setAdding(false)}
                />
              )}
              {sorted.length === 0 && !adding && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No quotes yet — click "Add Quote" to start comparing
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
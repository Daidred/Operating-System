import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Search, Loader2, Save, X, ChevronDown, ChevronRight, GripVertical, Sparkles, Table2, CalendarDays, Archive, ArchiveRestore } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import InlineFileZone, { GlobalAnalyzingToast } from '@/components/shipments/InlineFileZone.jsx';
import ShipmentCalendar from '@/components/shipments/ShipmentCalendar';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const STATUS_COLORS = {
  Pending:      'bg-yellow-50',
  'In Transit': 'bg-blue-50',
  Arrived:      'bg-green-50',
  Cleared:      'bg-teal-50',
  Delivered:    'bg-emerald-50',
  Delayed:      'bg-red-50',
};

const STATUS_BADGE = {
  Pending:      'bg-yellow-100 text-yellow-800',
  'In Transit': 'bg-blue-100 text-blue-800',
  Arrived:      'bg-green-100 text-green-800',
  Cleared:      'bg-teal-100 text-teal-800',
  Delivered:    'bg-emerald-100 text-emerald-800',
  Delayed:      'bg-red-100 text-red-800',
};

const INCOTERMS = ["EXW", "FOB", "CFR", "CIF", "DAP", "DDP", "FCA", "Other"];
const STATUSES = ["Pending", "In Transit", "Arrived", "Cleared", "Delivered", "Delayed"];
const EMPTY = {
  reference: '', mode: 'Sea', status: 'Pending', supplier: '',
  origin: '', destination: '', etd: '', eta: '', actual_arrival: '',
  swb_no: '', bl_no: '', awb_no: '', container_no: '', vessel_flight: '',
  incoterm: '', description: '', cbm: '', gross_weight: '',
  documents: [], sublines: [],
};

function CI({ value, onChange, type = 'text', placeholder = '', autoFocus = false, className = '' }) {
  return (
    <input
      autoFocus={autoFocus}
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 ${className}`}
    />
  );
}

function CS({ value, options, onChange, placeholder = '—' }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:ring-1 focus:ring-primary/40 px-1">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// Subline row — with invoice qty comparison
function SublineRow({ sub, onChange, onDelete }) {
  const hasInvoiceQty = sub.invoice_qty != null && sub.invoice_qty !== '';
  const poQty = parseFloat(sub.quantity) || 0;
  const invQty = parseFloat(sub.invoice_qty) || 0;
  const diff = hasInvoiceQty ? invQty - poQty : null;
  const diffColor = diff === null ? '' : diff < 0 ? 'text-red-600 font-semibold' : diff > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600';

  return (
    <tr className="bg-slate-50 border-b border-slate-100">
      <td className="pl-10 pr-1 py-1 w-[90px]">
        <CI value={sub.code_no} onChange={v => onChange('code_no', v)} placeholder="Code" />
      </td>
      <td className="px-1 py-1 max-w-[160px]">
        <input
          type="text"
          value={sub.description || ''}
          onChange={e => onChange('description', e.target.value)}
          placeholder="Description"
          title={sub.description}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 truncate"
        />
      </td>
      <td className="px-1 py-1 w-[65px]">
        <CI value={sub.quantity} onChange={v => onChange('quantity', v)} type="number" placeholder="PO Qty" />
      </td>
      <td className="px-1 py-1 w-[70px]">
        <div className="relative">
          <CI value={sub.invoice_qty} onChange={v => onChange('invoice_qty', v)} type="number" placeholder="Inv Qty" />
        </div>
      </td>
      <td className="px-1 py-1 w-[55px]">
        {diff !== null && (
          <span className={`text-xs ${diffColor}`} title="Invoice qty − PO qty">
            {diff > 0 ? '+' : ''}{diff}
          </span>
        )}
      </td>
      <td className="px-1 py-1 w-[55px]">
        <CI value={sub.unit} onChange={v => onChange('unit', v)} placeholder="Unit" />
      </td>
      <td className="px-2 py-1" colSpan={6}>
        <button onClick={onDelete} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </td>
    </tr>
  );
}

// Main editable row
function ShipmentRow({ shipment, onSave, onDelete, onArchive, onUnarchive, provided, isDragging, knownProducts }) {
  const [row, setRow] = useState({ ...shipment, sublines: shipment.sublines || [], documents: shipment.documents || [] });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [aiFlash, setAiFlash] = useState(false);

  const set = (field, value) => { setRow(prev => ({ ...prev, [field]: value })); setDirty(true); };

  const handleAiExtract = ({ fields, document_type }) => {
    const isPO = document_type === 'Purchase Order';
    const isInvoice = document_type === 'Invoice';
    const isWaybill = document_type === 'Sea Waybill' || document_type === 'Bill of Lading' || document_type === 'Air Waybill';

    const PO_FIELDS = ['reference', 'supplier'];
    const WAYBILL_FIELDS = ['origin', 'destination', 'swb_no', 'awb_no', 'bl_no'];
    const AUTOFILL_FIELDS = isPO ? PO_FIELDS : isWaybill ? WAYBILL_FIELDS : [];

    setRow(prev => {
      const merged = { ...prev };
      // Auto-fill header fields
      AUTOFILL_FIELDS.forEach(key => {
        if (fields[key] != null && fields[key] !== '' && !prev[key]) merged[key] = fields[key];
      });
      // PO → populate sublines
      if (isPO && fields.sublines?.length && (!prev.sublines || prev.sublines.length === 0)) {
        merged.sublines = fields.sublines;
      }
      // Invoice → merge invoice_qty; AI already copies exact PO code_no/description so code_no match is reliable
      if (isInvoice && fields.invoice_sublines?.length) {
        const existing = [...(prev.sublines || [])];
        fields.invoice_sublines.forEach(inv => {
          // 1. Exact code_no match (AI copies PO code_no so this should almost always hit)
          let idx = (inv.code_no && inv.code_no.trim())
            ? existing.findIndex(s => s.code_no && s.code_no.trim() === inv.code_no.trim())
            : -1;
          // 2. Exact description match (fallback)
          if (idx < 0 && inv.description) {
            idx = existing.findIndex(s => s.description &&
              s.description.trim().toLowerCase() === inv.description.trim().toLowerCase());
          }
          // 3. Partial description match — first meaningful word + any number token overlap
          if (idx < 0 && inv.description) {
            const tokens = (d) => d.toLowerCase().match(/\b[a-z]{3,}\b|\b\d+\b/g) || [];
            const invTokens = tokens(inv.description);
            idx = existing.findIndex(s => {
              if (!s.description) return false;
              const subTokens = tokens(s.description);
              // Must share at least the main species word (first long alpha token)
              const speciesMatch = invTokens.some(t => /^[a-z]{4,}$/.test(t) && subTokens.includes(t));
              return speciesMatch;
            });
          }
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], invoice_qty: inv.invoice_qty };
          }
        });
        merged.sublines = existing;
        if (existing.length > 0) setExpanded(true);
      }
      return merged;
    });

    if (isPO && fields.sublines?.length) setExpanded(true);
    setDirty(true);
    setAiFlash(true);
    setTimeout(() => setAiFlash(false), 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...row, cbm: parseFloat(row.cbm) || 0, gross_weight: parseFloat(row.gross_weight) || 0 };
    await onSave(payload);
    setSaving(false);
    setDirty(false);
  };

  const addSubline = () => {
    set('sublines', [...(row.sublines || []), { code_no: '', description: '', quantity: '', invoice_qty: '', unit: '' }]);
    setExpanded(true);
  };

  const updateSubline = (idx, field, value) => {
    const updated = row.sublines.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    set('sublines', updated);
  };

  const deleteSubline = (idx) => set('sublines', row.sublines.filter((_, i) => i !== idx));

  const isSea = row.mode === 'Sea';
  const rowBg = STATUS_COLORS[row.status] || 'bg-white';
  const hasSublines = (row.sublines || []).length > 0;

  return (
    <>
      <tr
        ref={provided.innerRef}
        {...provided.draggableProps}
        className={`border-b transition-colors ${rowBg} ${dirty ? 'outline outline-1 outline-primary/30' : ''} ${isDragging ? 'opacity-80 shadow-lg' : ''} ${aiFlash ? 'ring-2 ring-primary/40' : ''}`}
      >
        {/* Expand toggle + Mode */}
        <td className="px-2 py-1 min-w-[110px]">
          <div className="flex items-center gap-1">
            <span {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <Select value={row.mode} onValueChange={v => set('mode', v)}>
              <SelectTrigger className={`h-7 text-xs font-medium px-1.5 rounded-full border-0 ${row.mode === 'Sea' ? 'text-blue-700 bg-blue-100' : 'text-sky-700 bg-sky-100'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sea" className="text-xs">🚢 Sea</SelectItem>
                <SelectItem value="Air" className="text-xs">✈️ Air</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </td>
        <td className="px-2 py-1 min-w-[110px]"><CI value={row.reference} onChange={v => set('reference', v)} placeholder="PO Ref" /></td>
        <td className="px-2 py-1 min-w-[180px]"><CI value={row.supplier} onChange={v => set('supplier', v)} placeholder="Supplier" /></td>
        <td className="px-2 py-1 min-w-[160px]">
          <div className="flex items-center gap-1">
            <CI value={row.origin} onChange={v => set('origin', v)} placeholder="Origin" />
            <span className="text-muted-foreground text-xs shrink-0">→</span>
            <CI value={row.destination} onChange={v => set('destination', v)} placeholder="Dest." />
          </div>
        </td>
        <td className="px-2 py-1 min-w-[140px]">
          {isSea ? (
            <CI value={row.swb_no} onChange={v => set('swb_no', v)} placeholder="SWB No." />
          ) : (
            <CI value={row.awb_no} onChange={v => set('awb_no', v)} placeholder="AWB No." />
          )}
        </td>
        <td className="px-2 py-1 min-w-[110px]"><CI type="date" value={row.etd} onChange={v => set('etd', v)} /></td>
        <td className="px-2 py-1 min-w-[110px]"><CI type="date" value={row.eta} onChange={v => set('eta', v)} /></td>
        <td className="px-2 py-1 min-w-[110px]"><CI type="date" value={row.actual_arrival} onChange={v => set('actual_arrival', v)} /></td>
        <td className="px-2 py-1 min-w-[120px]">
          <Select value={row.status} onValueChange={v => set('status', v)}>
            <SelectTrigger className={`h-7 text-xs font-semibold px-2 rounded-full border-0 ${STATUS_BADGE[row.status] || 'bg-muted text-muted-foreground'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </td>
        <td className="px-2 py-1 min-w-[90px]"><CS value={row.incoterm} options={INCOTERMS} onChange={v => set('incoterm', v)} /></td>
        <td className="px-2 py-1 min-w-[140px]">
          <InlineFileZone
            files={row.documents}
            onChange={docs => set('documents', docs)}
            onAiExtract={handleAiExtract}
            existingSublines={row.sublines || []}
            knownProducts={knownProducts}
          />
        </td>
        <td className="px-2 py-1 min-w-[100px]">
          <div className="flex items-center gap-1">
            {aiFlash && <Sparkles className="w-3 h-3 text-primary animate-pulse shrink-0" title="AI filled fields" />}
            <button onClick={addSubline} title="Add subline" className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
            {dirty && (
              <>
                <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 transition-colors">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { setRow({ ...shipment, sublines: shipment.sublines || [], documents: shipment.documents || [] }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {!shipment.archived && (
              <button onClick={() => onArchive(shipment.id)} title="Archive shipment" className="p-1 rounded text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors">
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            {shipment.archived && (
              <button onClick={() => onUnarchive(shipment.id)} title="Restore shipment" className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                <ArchiveRestore className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => onDelete(shipment.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Subline header */}
      {expanded && (
        <tr className="bg-slate-100 border-b border-slate-200">
          <td className="pl-10 pr-1 py-0.5 w-[90px]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Code</span></td>
          <td className="px-1 py-0.5 max-w-[160px]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Description</span></td>
          <td className="px-1 py-0.5 w-[65px]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">PO Qty</span></td>
          <td className="px-1 py-0.5 w-[70px]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Inv Qty</span></td>
          <td className="px-1 py-0.5 w-[55px]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Diff</span></td>
          <td className="px-1 py-0.5 w-[55px]"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Unit</span></td>
          <td colSpan={6} />
        </tr>
      )}
      {/* Sublines */}
      {expanded && (row.sublines || []).map((sub, idx) => (
        <SublineRow
          key={idx}
          sub={sub}
          onChange={(field, value) => updateSubline(idx, field, value)}
          onDelete={() => deleteSubline(idx)}
        />
      ))}
      {expanded && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={14} className="pl-10 py-1">
            <button onClick={addSubline} className="text-xs text-primary/70 hover:text-primary flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add subline
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

// New row (top of table)
function NewShipmentRow({ onSave, onCancel, knownProducts }) {
  const [row, setRow] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [aiFlash, setAiFlash] = useState(false);
  const set = (f, v) => setRow(prev => ({ ...prev, [f]: v }));
  const isSea = row.mode === 'Sea';

  const handleAiExtract = ({ fields, document_type }) => {
    const isPO = document_type === 'Purchase Order';
    const isInvoice = document_type === 'Invoice';
    const isWaybill = document_type === 'Sea Waybill' || document_type === 'Bill of Lading' || document_type === 'Air Waybill';

    const PO_FIELDS = ['reference', 'supplier'];
    const WAYBILL_FIELDS = ['origin', 'destination', 'swb_no', 'awb_no', 'bl_no'];
    const AUTOFILL_FIELDS = isPO ? PO_FIELDS : isWaybill ? WAYBILL_FIELDS : [];

    setRow(prev => {
      const merged = { ...prev };
      AUTOFILL_FIELDS.forEach(key => {
        if (fields[key] != null && fields[key] !== '' && !prev[key]) merged[key] = fields[key];
      });
      if (isPO && fields.sublines?.length && (!prev.sublines || prev.sublines.length === 0)) {
        merged.sublines = fields.sublines;
      }
      if (isInvoice && fields.invoice_sublines?.length) {
        const existing = [...(prev.sublines || [])];
        const tokens = (d) => d.toLowerCase().match(/\b[a-z]{3,}\b|\b\d+\b/g) || [];
        fields.invoice_sublines.forEach(inv => {
          let idx = (inv.code_no && inv.code_no.trim())
            ? existing.findIndex(s => s.code_no && s.code_no.trim() === inv.code_no.trim())
            : -1;
          if (idx < 0 && inv.description) {
            idx = existing.findIndex(s => s.description &&
              s.description.trim().toLowerCase() === inv.description.trim().toLowerCase());
          }
          if (idx < 0 && inv.description) {
            const invTokens = tokens(inv.description);
            idx = existing.findIndex(s => {
              if (!s.description) return false;
              const subTokens = tokens(s.description);
              return invTokens.some(t => /^[a-z]{4,}$/.test(t) && subTokens.includes(t));
            });
          }
          if (idx >= 0) existing[idx] = { ...existing[idx], invoice_qty: inv.invoice_qty };
        });
        merged.sublines = existing;
      }
      return merged;
    });
    setAiFlash(true);
    setTimeout(() => setAiFlash(false), 4000);
  };

  const handleSave = async () => {
    if (!row.reference || !row.supplier) return;
    setSaving(true);
    await onSave({ ...row, cbm: parseFloat(row.cbm) || 0, gross_weight: parseFloat(row.gross_weight) || 0 });
    setSaving(false);
  };

  return (
    <tr className={`border-b bg-primary/5 outline outline-2 outline-primary/30 ${aiFlash ? 'ring-2 ring-primary/40' : ''}`}>
      <td className="px-2 py-1 min-w-[110px]">
        <div className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-30" />
          <Select value={row.mode} onValueChange={v => set('mode', v)}>
            <SelectTrigger className={`h-7 text-xs font-medium px-1.5 rounded-full border-0 ${row.mode === 'Sea' ? 'text-blue-700 bg-blue-100' : 'text-sky-700 bg-sky-100'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sea" className="text-xs">🚢 Sea</SelectItem>
              <SelectItem value="Air" className="text-xs">✈️ Air</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-2 py-1"><input autoFocus className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" placeholder="PO Ref *" value={row.reference} onChange={e => set('reference', e.target.value)} /></td>
      <td className="px-2 py-1 min-w-[180px]"><input className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" placeholder="Supplier *" value={row.supplier} onChange={e => set('supplier', e.target.value)} /></td>
      <td className="px-2 py-1 min-w-[160px]">
        <div className="flex items-center gap-1">
          <input className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Origin" value={row.origin} onChange={e => set('origin', e.target.value)} />
          <span className="text-xs shrink-0 text-muted-foreground">→</span>
          <input className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Dest." value={row.destination} onChange={e => set('destination', e.target.value)} />
        </div>
      </td>
      <td className="px-2 py-1 min-w-[140px]">
        {isSea ? (
          <input className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="SWB No." value={row.swb_no} onChange={e => set('swb_no', e.target.value)} />
        ) : (
          <input className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="AWB No." value={row.awb_no} onChange={e => set('awb_no', e.target.value)} />
        )}
      </td>
      <td className="px-2 py-1"><input type="date" className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" value={row.etd} onChange={e => set('etd', e.target.value)} /></td>
      <td className="px-2 py-1"><input type="date" className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" value={row.eta} onChange={e => set('eta', e.target.value)} /></td>
      <td className="px-2 py-1"><input type="date" className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" value={row.actual_arrival} onChange={e => set('actual_arrival', e.target.value)} /></td>
      <td className="px-2 py-1 min-w-[120px]">
        <Select value={row.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className={`h-7 text-xs font-semibold px-2 rounded-full border-0 ${STATUS_BADGE[row.status]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1 min-w-[90px]">
        <Select value={row.incoterm || ''} onValueChange={v => set('incoterm', v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-1"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{INCOTERMS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1 min-w-[140px]">
        <InlineFileZone
          files={row.documents}
          onChange={docs => set('documents', docs)}
          onAiExtract={handleAiExtract}
          existingSublines={row.sublines || []}
          knownProducts={knownProducts}
        />
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          {aiFlash && <Sparkles className="w-3 h-3 text-primary animate-pulse shrink-0" title="AI filled fields" />}
          <button onClick={handleSave} disabled={saving || !row.reference || !row.supplier} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ShipmentTracker() {
  const qc = useQueryClient();
  const [view, setView] = useState('table');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => base44.entities.Shipment.list('-created_date', 200),
  });

  const [orderedIds, setOrderedIds] = useState([]);

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shipment.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Shipment.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shipments'] }); setAdding(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Shipment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: id => base44.entities.Shipment.update(id, { archived: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  });

  const unarchiveMutation = useMutation({
    mutationFn: id => base44.entities.Shipment.update(id, { archived: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
  });

  // Build a deduplicated product catalog from all saved sublines — the AI learns from this
  const knownProducts = useMemo(() => {
    const seen = new Set();
    const products = [];
    shipments.forEach(s => (s.sublines || []).forEach(sub => {
      if (!sub.description) return;
      const key = `${sub.code_no || ''}|${sub.description.toLowerCase().trim()}`;
      if (!seen.has(key)) { seen.add(key); products.push(sub); }
    }));
    return products;
  }, [shipments]);

  const matchesSearch = (s) => {
    const q = search.toLowerCase();
    return !q || s.reference?.toLowerCase().includes(q) || s.supplier?.toLowerCase().includes(q) || s.swb_no?.toLowerCase().includes(q) || s.awb_no?.toLowerCase().includes(q) || s.bl_no?.toLowerCase().includes(q);
  };

  const filtered = shipments.filter(s =>
    !s.archived && matchesSearch(s)
    && (filterMode === 'all' || s.mode === filterMode)
    && (filterStatus === 'all' || s.status === filterStatus)
  );

  const archivedFiltered = shipments.filter(s =>
    s.archived && matchesSearch(s)
    && (filterMode === 'all' || s.mode === filterMode)
    && (filterStatus === 'all' || s.status === filterStatus)
  );

  // Build a stable ordered list for DnD (local order, not persisted)
  const displayList = useMemo(() => {
    if (orderedIds.length === 0) return filtered;
    const map = Object.fromEntries(filtered.map(s => [s.id, s]));
    const ordered = orderedIds.map(id => map[id]).filter(Boolean);
    const rest = filtered.filter(s => !orderedIds.includes(s.id));
    return [...ordered, ...rest];
  }, [filtered, orderedIds]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = [...displayList];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderedIds(items.map(s => s.id));
  };

  const headers = ['Mode', 'PO Ref', 'Supplier', 'Origin → Destination', 'SWB / AWB No.', 'ETD', 'ETA', 'Actual Arrival', 'Status', 'Incoterm', 'Documents', ''];

  return (
    <div className="space-y-5">
      <GlobalAnalyzingToast />
      <PageHeader title="Shipment Tracker" subtitle={view === 'table' ? "Click any cell to edit — drag ⠿ to reorder — ▶ to expand sublines" : "ETA-based arrival calendar"}>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'table' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Table2 className="w-3.5 h-3.5" /> Table
          </button>
          <button onClick={() => setView('calendar')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${view === 'calendar' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
        {view === 'table' && <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> New Shipment</Button>}
      </PageHeader>

      {view === 'calendar' && <ShipmentCalendar />}

      {view === 'table' && <>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search reference, supplier, AWB, SWB..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterMode} onValueChange={setFilterMode}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="Sea">🚢 Sea</SelectItem>
              <SelectItem value="Air">✈️ Air</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-700 text-white">
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="shipments">
                      {(provided) => (
                        <tbody ref={provided.innerRef} {...provided.droppableProps}>
                          {adding && (
                            <NewShipmentRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} knownProducts={knownProducts} />
                          )}
                          {displayList.length === 0 && !adding ? (
                            <tr>
                              <td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">
                                No shipments — click "New Shipment" to add one
                              </td>
                            </tr>
                          ) : displayList.map((s, index) => (
                            <Draggable key={s.id} draggableId={s.id} index={index}>
                              {(prov, snapshot) => (
                                <ShipmentRow
                                  shipment={s}
                                  provided={prov}
                                  isDragging={snapshot.isDragging}
                                  onSave={async row => saveMutation.mutateAsync({ id: s.id, data: row })}
                                  onDelete={id => deleteMutation.mutate(id)}
                                  onArchive={id => archiveMutation.mutate(id)}
                                  onUnarchive={id => unarchiveMutation.mutate(id)}
                                  knownProducts={knownProducts}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </tbody>
                      )}
                    </Droppable>
                  </DragDropContext>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Archived section */}
        <div className="mt-2">
          <button
            onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {showArchived ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Archive className="w-3.5 h-3.5" />
            Archived Shipments ({archivedFiltered.length})
          </button>

          {showArchived && archivedFiltered.length > 0 && (
            <Card className="overflow-hidden mt-2 opacity-80">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-400 text-white">
                        {headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <DragDropContext onDragEnd={() => {}}>
                      <Droppable droppableId="archived-shipments">
                        {(provided) => (
                          <tbody ref={provided.innerRef} {...provided.droppableProps}>
                            {archivedFiltered.map((s, index) => (
                              <Draggable key={s.id} draggableId={`archived-${s.id}`} index={index}>
                                {(prov, snapshot) => (
                                  <ShipmentRow
                                    shipment={s}
                                    provided={prov}
                                    isDragging={snapshot.isDragging}
                                    onSave={async row => saveMutation.mutateAsync({ id: s.id, data: row })}
                                    onDelete={id => deleteMutation.mutate(id)}
                                    onArchive={id => archiveMutation.mutate(id)}
                                    onUnarchive={id => unarchiveMutation.mutate(id)}
                                    knownProducts={knownProducts}
                                  />
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </tbody>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
          {showArchived && archivedFiltered.length === 0 && (
            <p className="text-xs text-muted-foreground italic mt-2 pl-1">No archived shipments.</p>
          )}
        </div>
      </>}
    </div>
  );
}
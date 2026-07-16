import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Save, X, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { isPast, parseISO, addDays } from 'date-fns';
import SourcingFileZone from '@/components/sourcing/SourcingFileZone';

const INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP', 'FCA', 'Other'];
const STATUSES = ['Pending Review', 'Shortlisted', 'Rejected', 'Approved'];
const CURRENCIES = ['USD', 'EUR', 'THB', 'CNY', 'GBP', 'Other'];

const STATUS_COLOR = {
  'Pending Review': 'bg-amber-100 text-amber-700', Shortlisted: 'bg-blue-100 text-blue-700',
  Rejected: 'bg-red-100 text-red-700', Approved: 'bg-emerald-100 text-emerald-700',
};

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  try { const d = parseISO(dateStr); return !isPast(d) && d <= addDays(new Date(), 7); } catch { return false; }
}
function isExpired(dateStr) {
  if (!dateStr) return false;
  try { return isPast(parseISO(dateStr)); } catch { return false; }
}

function CS({ value, options, onChange, colorMap }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={`h-7 text-xs border-0 px-1.5 ${colorMap?.[value] ? 'rounded-full ' + colorMap[value] : 'bg-transparent'}`}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function QuotationRow({ quotation, onSave, onDelete }) {
  const [row, setRow] = useState({ ...quotation });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };
  const handleSave = async () => { setSaving(true); await onSave(row); setSaving(false); setDirty(false); };

  const expiringSoon = isExpiringSoon(row.validity_date);
  const expired = isExpired(row.validity_date);

  return (
    <>
      <tr className={`border-b hover:bg-muted/30 transition-colors ${dirty ? 'outline outline-1 outline-primary/30' : ''} ${expiringSoon ? 'bg-orange-50/50' : ''}`}>
        <td className="px-2 py-1">
          <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td className="px-2 py-1 min-w-[140px]"><input value={row.supplier_name || ''} onChange={e => { set('supplier_name', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium" placeholder="Supplier" /></td>
        <td className="px-2 py-1 min-w-[140px]"><input value={row.product || ''} onChange={e => { set('product', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Product" /></td>
        <td className="px-2 py-1 min-w-[100px]"><input value={row.origin || ''} onChange={e => { set('origin', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Origin" /></td>
        <td className="px-2 py-1 min-w-[90px]">
          <div className="flex gap-1">
            <input type="number" value={row.price || ''} onChange={e => { set('price', e.target.value); }}
              className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Price" />
            <select value={row.currency || 'USD'} onChange={e => { set('currency', e.target.value); }}
              className="h-7 px-1 text-xs bg-transparent border-0 rounded focus:outline-none text-muted-foreground">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </td>
        <td className="px-2 py-1 min-w-[80px]"><CS value={row.incoterm} options={INCOTERMS} onChange={v => set('incoterm', v)} /></td>
        <td className="px-2 py-1 min-w-[80px]"><input value={row.moq || ''} onChange={e => { set('moq', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="MOQ" /></td>
        <td className="px-2 py-1 min-w-[105px]">
          <input type="date" value={row.validity_date || ''} onChange={e => { set('validity_date', e.target.value); }}
            className={`w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none ${expired ? 'text-red-600' : expiringSoon ? 'text-orange-600 font-semibold' : ''}`} />
        </td>
        <td className="px-2 py-1 min-w-[120px]"><CS value={row.status} options={STATUSES} onChange={v => set('status', v)} colorMap={STATUS_COLOR} /></td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            {dirty && <>
              <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setRow({ ...quotation }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
            </>}
            <button onClick={() => onDelete(quotation.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={10} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Specification</label>
                <input value={row.specification || ''} onChange={e => { set('specification', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Packing</label>
                <input value={row.packing || ''} onChange={e => { set('packing', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Lead Time</label>
                <input value={row.lead_time || ''} onChange={e => { set('lead_time', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Payment Terms</label>
                <input value={row.payment_terms || ''} onChange={e => { set('payment_terms', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Related Project</label>
                <input value={row.project_name || ''} onChange={e => { set('project_name', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Received Date</label>
                <input type="date" value={row.received_date || ''} onChange={e => { set('received_date', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] flex items-center gap-2">Documents Received
                <input type="checkbox" checked={row.documents_received || false} onChange={e => { set('documents_received', e.target.checked); }} className="ml-1" />
              </label></div>
              <div className="col-span-3"><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Comments</label>
                <textarea value={row.comments || ''} onChange={e => { set('comments', e.target.value); }} rows={2}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div className="col-span-3">
                <label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-2">Files & Documents</label>
                <SourcingFileZone files={row.files || []} onChange={v => set('files', v)} />
              </div>
            </div>
            {dirty && <div className="mt-2 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground flex items-center gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              <button onClick={() => { setRow({ ...quotation }); setDirty(false); }} className="px-3 py-1.5 rounded-md text-xs bg-muted">Cancel</button>
            </div>}
          </td>
        </tr>
      )}
    </>
  );
}

function NewQuotationRow({ onSave, onCancel, approvedSuppliers = [] }) {
  const [row, setRow] = useState({ status: 'Pending Review', currency: 'USD', incoterm: 'FOB' });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setRow(p => ({ ...p, [f]: v }));
  const handleSave = async () => {
    if (!row.supplier_name || !row.product) return;
    setSaving(true);
    await onSave(row);
    setSaving(false);
  };
  return (
    <tr className="border-b bg-primary/5 outline outline-2 outline-primary/30">
      <td className="px-2 py-1" />
      <td className="px-2 py-1">
        {approvedSuppliers.length > 0 ? (
          <Select value={row.supplier_name || ''} onValueChange={v => set('supplier_name', v)}>
            <SelectTrigger className="h-7 text-xs bg-white border border-primary/40"><SelectValue placeholder="Supplier *" /></SelectTrigger>
            <SelectContent>{approvedSuppliers.map(s => <SelectItem key={s.id} value={s.name} className="text-xs">{s.name}</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <input autoFocus value={row.supplier_name || ''} onChange={e => set('supplier_name', e.target.value)} placeholder="Supplier *"
            className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" />
        )}
      </td>
      <td className="px-2 py-1"><input value={row.product || ''} onChange={e => set('product', e.target.value)} placeholder="Product *"
        className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><input value={row.origin || ''} onChange={e => set('origin', e.target.value)} placeholder="Origin"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input type="number" value={row.price || ''} onChange={e => set('price', e.target.value)} placeholder="Price"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1">
        <Select value={row.incoterm} onValueChange={v => set('incoterm', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{INCOTERMS.map(i => <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1"><input value={row.moq || ''} onChange={e => set('moq', e.target.value)} placeholder="MOQ"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input type="date" value={row.validity_date || ''} onChange={e => set('validity_date', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1">
        <Select value={row.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving || !row.supplier_name || !row.product} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

export default function QuotationTracker() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [adding, setAdding] = useState(false);

  const { data: quotations = [], isLoading } = useQuery({ queryKey: ['quotations'], queryFn: () => base44.entities.Quotation.list('-created_date', 200) });
  const { data: allSuppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list('-created_date', 200) });
  const approvedSuppliers = useMemo(() => allSuppliers, [allSuppliers]);

  const saveMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Quotation.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }) });
  const createMutation = useMutation({ mutationFn: data => base44.entities.Quotation.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotations'] }); setAdding(false); } });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.Quotation.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['quotations'] }) });

  const filtered = useMemo(() => quotations.filter(q => {
    const s = search.toLowerCase();
    const matchSearch = !s || q.supplier_name?.toLowerCase().includes(s) || q.product?.toLowerCase().includes(s);
    const matchStatus = filterStatus === 'all' || q.status === filterStatus;
    return matchSearch && matchStatus;
  }), [quotations, search, filterStatus]);

  const headers = ['', 'Supplier', 'Product', 'Origin', 'Price', 'Incoterm', 'MOQ', 'Valid Until', 'Status', ''];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> Add Quotation</Button>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-accent text-accent-foreground">
                    {headers.map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {adding && <NewQuotationRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} approvedSuppliers={approvedSuppliers} />}
                  {filtered.length === 0 && !adding && (
                    <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">No quotations found</td></tr>
                  )}
                  {filtered.map(q => (
                    <QuotationRow key={q.id} quotation={q}
                      onSave={async row => saveMutation.mutateAsync({ id: q.id, data: row })}
                      onDelete={id => deleteMutation.mutate(id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
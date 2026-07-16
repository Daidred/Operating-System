import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Save, X, Trash2, Loader2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { isPast, parseISO, addDays } from 'date-fns';
import SourcingFileZone from '@/components/sourcing/SourcingFileZone';

const DOC_TYPES = ['HACCP', 'BRC', 'IFS', 'ASC', 'MSC', 'BAP', 'FDA', 'EU Approval', 'Health Certificate', 'Company Profile', 'Product Specification', 'Other'];

function isExpiringSoon(dateStr, days = 30) {
  if (!dateStr) return false;
  try { const d = parseISO(dateStr); return !isPast(d) && d <= addDays(new Date(), days); } catch { return false; }
}
function isExpired(dateStr) {
  if (!dateStr) return false;
  try { return isPast(parseISO(dateStr)); } catch { return false; }
}

function DocRow({ doc, onSave, onDelete }) {
  const [row, setRow] = useState({ ...doc });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };
  const handleSave = async () => { setSaving(true); await onSave(row); setSaving(false); setDirty(false); };

  const expiring = isExpiringSoon(row.expiry_date);
  const expired = isExpired(row.expiry_date);

  return (
    <>
      <tr className={`border-b hover:bg-muted/30 transition-colors ${dirty ? 'outline outline-1 outline-primary/30' : ''} ${expired ? 'bg-red-50/40' : expiring ? 'bg-amber-50/40' : ''}`}>
        <td className="px-2 py-1">
          <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td className="px-2 py-1 min-w-[140px]"><input value={row.supplier_name || ''} onChange={e => { set('supplier_name', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium" placeholder="Supplier" /></td>
        <td className="px-2 py-1 min-w-[150px]">
          <Select value={row.document_type || ''} onValueChange={v => set('document_type', v)}>
            <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-1"><SelectValue /></SelectTrigger>
            <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
          </Select>
        </td>
        <td className="px-2 py-1 text-center">
          <input type="checkbox" checked={row.received || false} onChange={e => { set('received', e.target.checked); }}
            className="w-4 h-4 cursor-pointer accent-primary" />
        </td>
        <td className="px-2 py-1 min-w-[105px]">
          <div className="flex items-center gap-1">
            <input type="date" value={row.expiry_date || ''} onChange={e => { set('expiry_date', e.target.value); }}
              className={`w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none ${expired ? 'text-red-600 font-semibold' : expiring ? 'text-amber-600 font-semibold' : ''}`} />
            {(expired || expiring) && <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${expired ? 'text-red-500' : 'text-amber-500'}`} />}
          </div>
        </td>
        <td className="px-2 py-1 min-w-[180px]"><input value={row.notes || ''} onChange={e => { set('notes', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Notes" /></td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            {dirty && <>
              <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setRow({ ...doc }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
            </>}
            <button onClick={() => onDelete(doc.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={7} className="px-6 py-3">
            <label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-2">Files & Documents</label>
            <SourcingFileZone files={row.files || []} onChange={v => set('files', v)} />
            {dirty && <div className="mt-3 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground flex items-center gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              <button onClick={() => { setRow({ ...doc }); setDirty(false); }} className="px-3 py-1.5 rounded-md text-xs bg-muted">Cancel</button>
            </div>}
          </td>
        </tr>
      )}
    </>
  );
}

function NewDocRow({ onSave, onCancel, approvedSuppliers = [] }) {
  const [row, setRow] = useState({ received: false, document_type: 'HACCP' });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setRow(p => ({ ...p, [f]: v }));
  const handleSave = async () => {
    if (!row.supplier_name) return;
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
      <td className="px-2 py-1">
        <Select value={row.document_type} onValueChange={v => set('document_type', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1 text-center"><input type="checkbox" checked={row.received || false} onChange={e => set('received', e.target.checked)} className="w-4 h-4 cursor-pointer" /></td>
      <td className="px-2 py-1"><input type="date" value={row.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><input value={row.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Notes"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving || !row.supplier_name} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}



export default function DocumentsCerts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [adding, setAdding] = useState(false);

  const { data: docs = [], isLoading } = useQuery({ queryKey: ['supplier-docs'], queryFn: () => base44.entities.SupplierDocument.list('-created_date', 200) });
  const { data: allSuppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list('-created_date', 200) });
  const approvedSuppliers = useMemo(() => allSuppliers.filter(s => s.approval_status === 'Approved'), [allSuppliers]);

  const saveMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.SupplierDocument.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-docs'] }) });
  const createMutation = useMutation({ mutationFn: data => base44.entities.SupplierDocument.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-docs'] }); setAdding(false); } });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.SupplierDocument.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-docs'] }) });

  const filtered = useMemo(() => docs.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.supplier_name?.toLowerCase().includes(q) || d.document_type?.toLowerCase().includes(q);
    const matchType = filterType === 'all' || d.document_type === filterType;
    return matchSearch && matchType;
  }), [docs, search, filterType]);

  const expiringSoon = filtered.filter(d => isExpiringSoon(d.expiry_date));
  const expired = filtered.filter(d => isExpired(d.expiry_date));

  const headers = ['', 'Supplier', 'Document Type', 'Received', 'Expiry Date', 'Notes', ''];

  return (
    <div className="space-y-4">
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="flex gap-4 flex-wrap">
          {expired.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertTriangle className="w-3.5 h-3.5" /> <strong>{expired.length}</strong> expired document{expired.length > 1 ? 's' : ''}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" /> <strong>{expiringSoon.length}</strong> expiring within 30 days
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> Add Document</Button>
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
                  {adding && <NewDocRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} approvedSuppliers={approvedSuppliers} />}
                  {filtered.length === 0 && !adding && (
                    <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">No documents found</td></tr>
                  )}
                  {filtered.map(d => (
                    <DocRow key={d.id} doc={d}
                      onSave={async row => saveMutation.mutateAsync({ id: d.id, data: row })}
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
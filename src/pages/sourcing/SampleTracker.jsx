import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Save, X, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import SourcingFileZone from '@/components/sourcing/SourcingFileZone';

const EVAL_STATUSES = ['Requested', 'Shipped', 'Received', 'Under Evaluation', 'Evaluated'];
const QUALITY_RESULTS = ['Pending', 'Pass', 'Conditional Pass', 'Fail'];
const FINAL_DECISIONS = ['Pending', 'Approved', 'Rejected', 'Re-sample Required'];

const EVAL_COLOR = {
  Requested: 'bg-slate-100 text-slate-600', Shipped: 'bg-blue-100 text-blue-700',
  Received: 'bg-indigo-100 text-indigo-700', 'Under Evaluation': 'bg-amber-100 text-amber-700', Evaluated: 'bg-emerald-100 text-emerald-700',
};
const QUALITY_COLOR = { Pending: 'bg-slate-100 text-slate-600', Pass: 'bg-emerald-100 text-emerald-700', 'Conditional Pass': 'bg-amber-100 text-amber-700', Fail: 'bg-red-100 text-red-700' };
const DECISION_COLOR = { Pending: 'bg-slate-100 text-slate-600', Approved: 'bg-emerald-100 text-emerald-700', Rejected: 'bg-red-100 text-red-700', 'Re-sample Required': 'bg-orange-100 text-orange-700' };

function CS({ value, options, onChange, colorMap }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={`h-7 text-xs border-0 px-1.5 ${colorMap?.[value] ? 'rounded-full ' + colorMap[value] : 'bg-transparent'}`}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function SampleRow({ sample, onSave, onDelete }) {
  const [row, setRow] = useState({ ...sample });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };
  const handleSave = async () => { setSaving(true); await onSave(row); setSaving(false); setDirty(false); };

  return (
    <>
      <tr className={`border-b hover:bg-muted/30 transition-colors ${dirty ? 'outline outline-1 outline-primary/30' : ''}`}>
        <td className="px-2 py-1">
          <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td className="px-2 py-1 min-w-[130px]"><input value={row.supplier_name || ''} onChange={e => { set('supplier_name', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium" placeholder="Supplier" /></td>
        <td className="px-2 py-1 min-w-[140px]"><input value={row.product || ''} onChange={e => { set('product', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Product" /></td>
        <td className="px-2 py-1 min-w-[110px]"><input value={row.project_name || ''} onChange={e => { set('project_name', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Project" /></td>
        <td className="px-2 py-1 min-w-[105px]"><input type="date" value={row.requested_date || ''} onChange={e => { set('requested_date', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
        <td className="px-2 py-1 min-w-[105px]"><input type="date" value={row.received_date || ''} onChange={e => { set('received_date', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
        <td className="px-2 py-1 min-w-[130px]"><CS value={row.evaluation_status} options={EVAL_STATUSES} onChange={v => set('evaluation_status', v)} colorMap={EVAL_COLOR} /></td>
        <td className="px-2 py-1 min-w-[120px]"><CS value={row.quality_result} options={QUALITY_RESULTS} onChange={v => set('quality_result', v)} colorMap={QUALITY_COLOR} /></td>
        <td className="px-2 py-1 min-w-[120px]"><CS value={row.final_decision} options={FINAL_DECISIONS} onChange={v => set('final_decision', v)} colorMap={DECISION_COLOR} /></td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            {dirty && <>
              <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setRow({ ...sample }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
            </>}
            <button onClick={() => onDelete(sample.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={10} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Shipped Date</label>
                <input type="date" value={row.shipped_date || ''} onChange={e => { set('shipped_date', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Courier / Tracking</label>
                <input value={row.courier_tracking || ''} onChange={e => { set('courier_tracking', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Taste Notes</label>
                <input value={row.taste_notes || ''} onChange={e => { set('taste_notes', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Appearance Notes</label>
                <input value={row.appearance_notes || ''} onChange={e => { set('appearance_notes', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Texture Notes</label>
                <input value={row.texture_notes || ''} onChange={e => { set('texture_notes', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div className="col-span-3"><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Internal Feedback</label>
                <textarea value={row.internal_feedback || ''} onChange={e => { set('internal_feedback', e.target.value); }} rows={2}
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
              <button onClick={() => { setRow({ ...sample }); setDirty(false); }} className="px-3 py-1.5 rounded-md text-xs bg-muted">Cancel</button>
            </div>}
          </td>
        </tr>
      )}
    </>
  );
}

function NewSampleRow({ onSave, onCancel, approvedSuppliers = [] }) {
  const [row, setRow] = useState({ evaluation_status: 'Requested', quality_result: 'Pending', final_decision: 'Pending' });
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
      <td className="px-2 py-1"><input value={row.project_name || ''} onChange={e => set('project_name', e.target.value)} placeholder="Project"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input type="date" value={row.requested_date || ''} onChange={e => set('requested_date', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1" />
      <td className="px-2 py-1">
        <Select value={row.evaluation_status} onValueChange={v => set('evaluation_status', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{EVAL_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td colSpan={2} />
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

export default function SampleTracker() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [adding, setAdding] = useState(false);

  const { data: samples = [], isLoading } = useQuery({ queryKey: ['samples'], queryFn: () => base44.entities.Sample.list('-created_date', 200) });
  const { data: allSuppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list('-created_date', 200) });
  const approvedSuppliers = useMemo(() => allSuppliers.filter(s => s.approval_status === 'Approved'), [allSuppliers]);

  const saveMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.Sample.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['samples'] }) });
  const createMutation = useMutation({ mutationFn: data => base44.entities.Sample.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['samples'] }); setAdding(false); } });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.Sample.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['samples'] }) });

  const filtered = useMemo(() => samples.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.supplier_name?.toLowerCase().includes(q) || s.product?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.evaluation_status === filterStatus;
    return matchSearch && matchStatus;
  }), [samples, search, filterStatus]);

  const headers = ['', 'Supplier', 'Product', 'Project', 'Requested', 'Received', 'Eval. Status', 'Quality', 'Decision', ''];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search samples..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{EVAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> Add Sample</Button>
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
                  {adding && <NewSampleRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} approvedSuppliers={approvedSuppliers} />}
                  {filtered.length === 0 && !adding && (
                    <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">No samples yet</td></tr>
                  )}
                  {filtered.map(s => (
                    <SampleRow key={s.id} sample={s}
                      onSave={async row => saveMutation.mutateAsync({ id: s.id, data: row })}
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
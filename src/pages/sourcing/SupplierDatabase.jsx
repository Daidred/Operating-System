import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Save, X, Trash2, Loader2, ChevronDown, ChevronRight, Star, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import SupplierApprovalDialog from '@/components/sourcing/SupplierApprovalDialog';
import SourcingFileZone from '@/components/sourcing/SourcingFileZone';
import SupplierDetailPanel from '@/components/suppliers/SupplierDetailPanel';

const APPROVAL_STATUSES = ['Not Started', 'Pending', 'In Review', 'Approved', 'Rejected'];
const SUPPLIER_STATUSES = ['Active', 'Inactive', 'Blacklisted', 'Approved', 'Rejected'];

const STATUS_COLOR = {
  Active: 'bg-emerald-100 text-emerald-700', Inactive: 'bg-slate-100 text-slate-600',
  Blacklisted: 'bg-red-100 text-red-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700',
};

const APPROVAL_BADGE = {
  'Pending Approval': { cls: 'bg-amber-100 text-amber-700', icon: Clock },
  'Approved': { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'Rejected': { cls: 'bg-red-100 text-red-700', icon: XCircle },
};

function RatingInput({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className={`w-4 h-4 ${(value || 0) >= n ? 'text-amber-400' : 'text-muted-foreground/30'}`}>
          <Star className="w-3.5 h-3.5 fill-current" />
        </button>
      ))}
    </div>
  );
}

function CS({ value, options, onChange, placeholder = '—' }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:ring-1 focus:ring-primary/40 px-1"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function ApprovalBadge({ status, onApprove, onReject }) {
  const cfg = APPROVAL_BADGE[status] || APPROVAL_BADGE['Pending Approval'];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
        <Icon className="w-3 h-3" />{status || 'Pending Approval'}
      </span>
      {status !== 'Approved' && (
        <button onClick={onApprove} className="p-0.5 rounded text-emerald-600 hover:bg-emerald-100" title="Approve">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      )}
      {status !== 'Rejected' && (
        <button onClick={onReject} className="p-0.5 rounded text-red-500 hover:bg-red-50" title="Reject">
          <XCircle className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function SupplierRow({ supplier, onSave, onDelete, onOpen }) {
  const [row, setRow] = useState({ ...supplier });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };
  const handleSave = async () => { setSaving(true); await onSave(row); setSaving(false); setDirty(false); };

  const handleApprove = () => { set('approval_status', 'Approved'); };
  const handleReject = () => { set('approval_status', 'Rejected'); };

  return (
    <>
      <tr className={`border-b hover:bg-muted/30 transition-colors ${dirty ? 'outline outline-1 outline-primary/30' : ''}`}>
        <td className="px-2 py-1">
          <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </td>
        <td className="px-2 py-1 min-w-[160px]"><input value={row.name || ''} onChange={e => set('name', e.target.value)}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium" /></td>
        <td className="px-2 py-1 min-w-[100px]"><input value={row.country || ''} onChange={e => set('country', e.target.value)}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
        <td className="px-2 py-1 min-w-[120px]"><input value={row.contact_person || ''} onChange={e => set('contact_person', e.target.value)}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
        <td className="px-2 py-1 min-w-[160px]"><input value={row.email || ''} onChange={e => set('email', e.target.value)}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
        <td className="px-2 py-1 min-w-[120px]"><input value={row.product_categories || ''} onChange={e => set('product_categories', e.target.value)}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="e.g. Shrimp, Tuna" /></td>
        <td className="px-2 py-1 min-w-[120px]"><CS value={row.status} options={SUPPLIER_STATUSES} onChange={v => set('status', v)} /></td>
        <td className="px-2 py-1 min-w-[80px]"><RatingInput value={row.quality_rating} onChange={v => set('quality_rating', v)} /></td>
        <td className="px-2 py-1 min-w-[180px]">
          <ApprovalBadge status={row.approval_status} onApprove={handleApprove} onReject={handleReject} />
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            {dirty && <>
              <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setRow({ ...supplier }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
            </>}
            <button onClick={() => onOpen(supplier)} title="Open supplier details" className="p-1 rounded text-primary hover:bg-primary/10"><ExternalLink className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(supplier.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Phone / WhatsApp</label>
                <input value={row.phone || ''} onChange={e => set('phone', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Website</label>
                <input value={row.website || ''} onChange={e => set('website', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Certifications</label>
                <input value={row.certifications || ''} onChange={e => set('certifications', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Factory Approval</label>
                <Select value={row.factory_approval_status || ''} onValueChange={v => set('factory_approval_status', v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{APPROVAL_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Last Contact</label>
                <input type="date" value={row.last_contact_date || ''} onChange={e => set('last_contact_date', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Next Follow-up</label>
                <input type="date" value={row.next_followup_date || ''} onChange={e => set('next_followup_date', e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-1">Reliability</label>
                <RatingInput value={row.reliability_rating} onChange={v => set('reliability_rating', v)} /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-1">Price Competitiveness</label>
                <RatingInput value={row.price_competitiveness_rating} onChange={v => set('price_competitiveness_rating', v)} /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-1">Communication</label>
                <RatingInput value={row.communication_rating} onChange={v => set('communication_rating', v)} /></div>
              <div className="col-span-3"><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Notes</label>
                <textarea value={row.notes || ''} onChange={e => set('notes', e.target.value)} rows={2}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div className="col-span-3">
                <label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] block mb-2">Files & Documents</label>
                <SourcingFileZone files={row.files || []} onChange={v => set('files', v)} />
              </div>
            </div>
            {dirty && <div className="mt-3 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              <button onClick={() => { setRow({ ...supplier }); setDirty(false); }} className="px-3 py-1.5 rounded-md text-xs bg-muted text-foreground">Cancel</button>
            </div>}
          </td>
        </tr>
      )}
    </>
  );
}

function NewSupplierRow({ onSave, onCancel }) {
  const [row, setRow] = useState({ status: 'Active', factory_approval_status: 'Not Started', approval_status: 'Pending Approval' });
  const [saving, setSaving] = useState(false);
  const set = (f, v) => setRow(p => ({ ...p, [f]: v }));
  const handleSave = async () => {
    if (!row.name) return;
    setSaving(true);
    await onSave(row);
    setSaving(false);
  };
  return (
    <tr className="border-b bg-primary/5 outline outline-2 outline-primary/30">
      <td className="px-2 py-1" />
      <td className="px-2 py-1"><input autoFocus value={row.name || ''} onChange={e => set('name', e.target.value)} placeholder="Supplier name *"
        className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><input value={row.country || ''} onChange={e => set('country', e.target.value)} placeholder="Country"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input value={row.contact_person || ''} onChange={e => set('contact_person', e.target.value)} placeholder="Contact"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input value={row.email || ''} onChange={e => set('email', e.target.value)} placeholder="Email"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input value={row.product_categories || ''} onChange={e => set('product_categories', e.target.value)} placeholder="Categories"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1">
        <Select value={row.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{SUPPLIER_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td colSpan={2} />
      <td className="px-2 py-1">
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving || !row.name} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

export default function SupplierDatabase() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatusLocal, setFilterStatusLocal] = useState('all');
  const [adding, setAdding] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200)
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  });
  const createMutation = useMutation({
    mutationFn: data => base44.entities.Supplier.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setAdding(false);
      setPendingApproval(created); // show approval dialog
    }
  });
  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Supplier.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  });

  const handleApproveDialog = async () => {
    await saveMutation.mutateAsync({ id: pendingApproval.id, data: { ...pendingApproval, approval_status: 'Approved' } });
    setPendingApproval(null);
  };
  const handleRejectDialog = async () => {
    await saveMutation.mutateAsync({ id: pendingApproval.id, data: { ...pendingApproval, approval_status: 'Rejected' } });
    setPendingApproval(null);
  };

  const filtered = useMemo(() => suppliers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q) || s.contact_person?.toLowerCase().includes(q);
    const matchStatus = filterStatusLocal === 'all' || s.status === filterStatusLocal;
    return matchSearch && matchStatus;
  }), [suppliers, search, filterStatusLocal]);

  const headers = ['', 'Supplier Name', 'Country', 'Contact', 'Email', 'Products', 'Status', 'Quality ⭐', 'Approval', ''];

  return (
    <>
    {selectedSupplier && (
      <SupplierDetailPanel
        supplier={selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        onSave={async (row) => {
          await saveMutation.mutateAsync({ id: selectedSupplier.id, data: row });
          setSelectedSupplier(row);
        }}
      />
    )}
    <div className="space-y-4">
      <SupplierApprovalDialog
        supplier={pendingApproval}
        onApprove={handleApproveDialog}
        onReject={handleRejectDialog}
        onClose={() => setPendingApproval(null)}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatusLocal} onValueChange={setFilterStatusLocal}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{SUPPLIER_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> Add Supplier</Button>
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
                  {adding && <NewSupplierRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} />}
                  {filtered.length === 0 && !adding && (
                    <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">No suppliers found</td></tr>
                  )}
                  {filtered.map(s => (
                    <SupplierRow key={s.id} supplier={s}
                      onSave={async row => saveMutation.mutateAsync({ id: s.id, data: row })}
                      onDelete={id => deleteMutation.mutate(id)}
                      onOpen={setSelectedSupplier}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
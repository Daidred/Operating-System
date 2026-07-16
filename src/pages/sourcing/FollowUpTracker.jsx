import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Save, X, Trash2, Loader2 } from 'lucide-react';
import { isPast, isToday, parseISO } from 'date-fns';

const REPLY_STATUSES = ['No Reply', 'Replied', 'Quotation Sent', 'Sample Arranged', 'Rejected', 'Waiting'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const REPLY_COLOR = {
  'No Reply': 'bg-red-100 text-red-700', 'Replied': 'bg-emerald-100 text-emerald-700',
  'Quotation Sent': 'bg-purple-100 text-purple-700', 'Sample Arranged': 'bg-blue-100 text-blue-700',
  'Rejected': 'bg-gray-100 text-gray-600', 'Waiting': 'bg-amber-100 text-amber-700',
};
const PRIORITY_COLOR = { Urgent: 'bg-red-100 text-red-700', High: 'bg-orange-100 text-orange-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-slate-100 text-slate-600' };

function isOverdue(dateStr) {
  if (!dateStr) return false;
  try { return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr)); } catch { return false; }
}
function isDueToday(dateStr) {
  if (!dateStr) return false;
  try { return isToday(parseISO(dateStr)); } catch { return false; }
}

function CS({ value, options, onChange, colorMap }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={`h-7 text-xs border-0 px-1.5 rounded-full ${colorMap?.[value] || 'bg-muted text-foreground'}`}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function FollowUpRow({ followup, onSave, onDelete }) {
  const [row, setRow] = useState({ ...followup });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };
  const handleSave = async () => { setSaving(true); await onSave(row); setSaving(false); setDirty(false); };

  const overdue = isOverdue(row.next_followup_date);
  const dueToday = isDueToday(row.next_followup_date);

  return (
    <tr className={`border-b hover:bg-muted/30 transition-colors ${dirty ? 'outline outline-1 outline-primary/30' : ''} ${overdue ? 'bg-red-50/50' : dueToday ? 'bg-amber-50/50' : ''}`}>
      <td className="px-2 py-1 min-w-[140px]">
        <input value={row.supplier_name || ''} onChange={e => { set('supplier_name', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 font-medium" placeholder="Supplier" />
      </td>
      <td className="px-2 py-1 min-w-[120px]">
        <input value={row.project_name || ''} onChange={e => { set('project_name', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Project" />
      </td>
      <td className="px-2 py-1 min-w-[105px]">
        <input type="date" value={row.date_contacted || ''} onChange={e => { set('date_contacted', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" />
      </td>
      <td className="px-2 py-1 min-w-[120px]"><CS value={row.reply_status} options={REPLY_STATUSES} onChange={v => set('reply_status', v)} colorMap={REPLY_COLOR} /></td>
      <td className="px-2 py-1 min-w-[160px]">
        <input value={row.next_action || ''} onChange={e => { set('next_action', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Next action" />
      </td>
      <td className="px-2 py-1 min-w-[105px]">
        <input type="date" value={row.next_followup_date || ''} onChange={e => { set('next_followup_date', e.target.value); }}
          className={`w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none ${overdue ? 'text-red-600 font-semibold' : dueToday ? 'text-amber-600 font-semibold' : ''}`} />
      </td>
      <td className="px-2 py-1 min-w-[100px]"><CS value={row.priority} options={PRIORITIES} onChange={v => set('priority', v)} colorMap={PRIORITY_COLOR} /></td>
      <td className="px-2 py-1 min-w-[160px]">
        <input value={row.last_message_sent || ''} onChange={e => { set('last_message_sent', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Last message..." />
      </td>
      <td className="px-2 py-1 min-w-[160px]">
        <input value={row.notes || ''} onChange={e => { set('notes', e.target.value); }}
          className="w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Notes..." />
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          {dirty && <>
            <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => { setRow({ ...followup }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
          </>}
          <button onClick={() => onDelete(followup.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

function NewFollowUpRow({ onSave, onCancel }) {
  const [row, setRow] = useState({ reply_status: 'No Reply', priority: 'Medium' });
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
      <td className="px-2 py-1"><input autoFocus value={row.supplier_name || ''} onChange={e => set('supplier_name', e.target.value)} placeholder="Supplier *"
        className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><input value={row.project_name || ''} onChange={e => set('project_name', e.target.value)} placeholder="Project"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input type="date" value={row.date_contacted || ''} onChange={e => set('date_contacted', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1">
        <Select value={row.reply_status} onValueChange={v => set('reply_status', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{REPLY_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1"><input value={row.next_action || ''} onChange={e => set('next_action', e.target.value)} placeholder="Next action"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input type="date" value={row.next_followup_date || ''} onChange={e => set('next_followup_date', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1">
        <Select value={row.priority} onValueChange={v => set('priority', v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td colSpan={2} />
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

export default function FollowUpTracker({ overdueOnly = false }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [adding, setAdding] = useState(false);

  const { data: followUps = [], isLoading } = useQuery({ queryKey: ['followups'], queryFn: () => base44.entities.FollowUp.list('-created_date', 200) });

  const saveMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.FollowUp.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['followups'] }) });
  const createMutation = useMutation({ mutationFn: data => base44.entities.FollowUp.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['followups'] }); setAdding(false); } });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.FollowUp.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['followups'] }) });

  const filtered = useMemo(() => followUps.filter(f => {
    if (overdueOnly && !isOverdue(f.next_followup_date) && !isDueToday(f.next_followup_date)) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || f.supplier_name?.toLowerCase().includes(q) || f.project_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || f.reply_status === filterStatus;
    const matchPriority = filterPriority === 'all' || f.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  }), [followUps, search, filterStatus, filterPriority, overdueOnly]);

  const headers = ['Supplier', 'Project', 'Date Contacted', 'Reply Status', 'Next Action', 'Follow-up Date', 'Priority', 'Last Message', 'Notes', ''];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search follow-ups..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Statuses</SelectItem>{REPLY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Priorities</SelectItem>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> Add Follow-up</Button>
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
                  {adding && <NewFollowUpRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} />}
                  {filtered.length === 0 && !adding && (
                    <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">
                      {overdueOnly ? 'No overdue follow-ups 🎉' : 'No follow-ups yet'}
                    </td></tr>
                  )}
                  {filtered.map(f => (
                    <FollowUpRow key={f.id} followup={f}
                      onSave={async row => saveMutation.mutateAsync({ id: f.id, data: row })}
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
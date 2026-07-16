import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, ChevronDown, ChevronRight, Save, X, Trash2, Archive, ArchiveRestore, Loader2, ExternalLink } from 'lucide-react';
import ProjectDetailPanel from '@/components/projects/ProjectDetailPanel';

const CATEGORIES = ['Shrimp', 'Salmon', 'Tuna', 'Crab', 'Squid', 'Shellfish', 'Value-Added', 'Frozen Seafood', 'Fresh Seafood', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['Idea', 'Supplier Search', 'Supplier Contacted', 'Quotation Received', 'Sample Requested', 'Sample Testing', 'Negotiation', 'Approved', 'Rejected', 'Paused'];


function CI({ value, onChange, type = 'text', placeholder = '', className = '', autoFocus = false }) {
  return <input autoFocus={autoFocus} type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 ${className}`} />;
}
function CS({ value, options, onChange, placeholder = '—' }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:ring-1 focus:ring-primary/40 px-1"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function ProjectRow({ project, onSave, onDelete, onArchive, onUnarchive, onOpen }) {
  const [row, setRow] = useState({ ...project });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await onSave(row);
    setSaving(false);
    setDirty(false);
  };

  return (
    <>
      <tr className={`border-b hover:bg-muted/30 transition-colors ${dirty ? 'outline outline-1 outline-primary/30' : ''}`}>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <CS value={row.priority} options={PRIORITIES} onChange={v => set('priority', v)} />
          </div>
        </td>
        <td className="px-2 py-1 min-w-[180px]"><CI value={row.name} onChange={v => set('name', v)} placeholder="Project name" /></td>
        <td className="px-2 py-1 min-w-[120px]"><CS value={row.product_category} options={CATEGORIES} onChange={v => set('product_category', v)} /></td>
        <td className="px-2 py-1 min-w-[100px]"><CI value={row.target_origin} onChange={v => set('target_origin', v)} placeholder="Origin" /></td>
        <td className="px-2 py-1 min-w-[90px]">
          <div className="flex gap-1"><CI value={row.target_price} onChange={v => set('target_price', v)} type="number" placeholder="Price" /><CI value={row.target_price_currency} onChange={v => set('target_price_currency', v)} className="w-10" /></div>
        </td>
        <td className="px-2 py-1 min-w-[110px]"><CI value={row.target_volume} onChange={v => set('target_volume', v)} placeholder="Volume" /></td>
        <td className="px-2 py-1 min-w-[140px]"><CS value={row.status} options={STATUSES} onChange={v => set('status', v)} /></td>
        <td className="px-2 py-1 min-w-[105px]"><CI value={row.deadline} onChange={v => set('deadline', v)} type="date" /></td>
        <td className="px-2 py-1 min-w-[105px]"><CI value={row.next_followup_date} onChange={v => set('next_followup_date', v)} type="date" /></td>
        <td className="px-2 py-1 min-w-[160px]"><CI value={row.next_action} onChange={v => set('next_action', v)} placeholder="Next action" /></td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1">
            {dirty && <>
              <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => { setRow({ ...project }); setDirty(false); }} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
            </>}
            <button onClick={() => onOpen(project)} title="Open project" className="p-1 rounded text-primary hover:bg-primary/10"><ExternalLink className="w-3.5 h-3.5" /></button>
            {!project.archived
              ? <button onClick={() => onArchive(project.id)} title="Archive" className="p-1 rounded text-muted-foreground hover:text-amber-600 hover:bg-amber-50"><Archive className="w-3.5 h-3.5" /></button>
              : <button onClick={() => onUnarchive(project.id)} title="Restore" className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"><ArchiveRestore className="w-3.5 h-3.5" /></button>
            }
            <button onClick={() => onDelete(project.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={11} className="px-6 py-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Specification</label>
                <textarea value={row.product_specification || ''} onChange={e => { set('product_specification', e.target.value); }} rows={2}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Required Certifications</label>
                <input value={row.required_certifications || ''} onChange={e => { set('required_certifications', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Customer / Internal Request</label>
                <input value={row.customer_request || ''} onChange={e => { set('customer_request', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Start Date</label>
                <input type="date" value={row.start_date || ''} onChange={e => { set('start_date', e.target.value); }}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
              <div className="col-span-2"><label className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Notes</label>
                <textarea value={row.notes || ''} onChange={e => { set('notes', e.target.value); }} rows={2}
                  className="w-full mt-1 px-2 py-1.5 border border-border rounded-md text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" /></div>
            </div>
            {dirty && <div className="mt-2 flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              <button onClick={() => { setRow({ ...project }); setDirty(false); }} className="px-3 py-1.5 rounded-md text-xs bg-muted text-foreground hover:bg-muted/80">Cancel</button>
            </div>}
          </td>
        </tr>
      )}
    </>
  );
}

function NewProjectRow({ onSave, onCancel }) {
  const [row, setRow] = useState({ product_category: 'Shrimp', priority: 'Medium', status: 'Idea', target_price_currency: 'USD' });
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
      <td className="px-2 py-1 min-w-[110px]"><CS value={row.priority} options={PRIORITIES} onChange={v => set('priority', v)} /></td>
      <td className="px-2 py-1 min-w-[180px]"><input autoFocus value={row.name || ''} onChange={e => set('name', e.target.value)} placeholder="Project name *"
        className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><CS value={row.product_category} options={CATEGORIES} onChange={v => set('product_category', v)} /></td>
      <td className="px-2 py-1"><input value={row.target_origin || ''} onChange={e => set('target_origin', e.target.value)} placeholder="Origin"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input type="number" value={row.target_price || ''} onChange={e => set('target_price', e.target.value)} placeholder="Price"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><input value={row.target_volume || ''} onChange={e => set('target_volume', e.target.value)} placeholder="Volume"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1"><CS value={row.status} options={STATUSES} onChange={v => set('status', v)} /></td>
      <td className="px-2 py-1"><input type="date" value={row.deadline || ''} onChange={e => set('deadline', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><input type="date" value={row.next_followup_date || ''} onChange={e => set('next_followup_date', e.target.value)}
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" /></td>
      <td className="px-2 py-1"><input value={row.next_action || ''} onChange={e => set('next_action', e.target.value)} placeholder="Next action"
        className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40" /></td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={saving || !row.name} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted"><X className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

export default function SourcingProjects({ filterArchived = false, filterStatus = null }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatusLocal, setFilterStatusLocal] = useState(filterStatus || 'all');
  const [adding, setAdding] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['sourcing-projects'], queryFn: () => base44.entities.SourcingProject.list('-created_date', 200) });

  const saveMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.SourcingProject.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing-projects'] }) });
  const createMutation = useMutation({ mutationFn: data => base44.entities.SourcingProject.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sourcing-projects'] }); setAdding(false); } });
  const deleteMutation = useMutation({ mutationFn: id => base44.entities.SourcingProject.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing-projects'] }) });
  const archiveMutation = useMutation({ mutationFn: id => base44.entities.SourcingProject.update(id, { archived: true }), onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing-projects'] }) });
  const unarchiveMutation = useMutation({ mutationFn: id => base44.entities.SourcingProject.update(id, { archived: false }), onSuccess: () => qc.invalidateQueries({ queryKey: ['sourcing-projects'] }) });

  const filtered = useMemo(() => projects.filter(p => {
    if (filterArchived) return p.archived;
    if (!filterArchived && p.archived) return false;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.target_origin?.toLowerCase().includes(q) || p.product_category?.toLowerCase().includes(q);
    const matchPriority = filterPriority === 'all' || p.priority === filterPriority;
    const matchStatus = filterStatusLocal === 'all' || p.status === filterStatusLocal;
    return matchSearch && matchPriority && matchStatus;
  }), [projects, search, filterPriority, filterStatusLocal, filterArchived]);

  const headers = ['Priority', 'Project Name', 'Category', 'Origin', 'Target Price', 'Volume', 'Status', 'Deadline', 'Follow-up Date', 'Next Action', ''];

  return (
    <>
    <div className="space-y-4">
      {!filterArchived && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Priorities</SelectItem>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterStatusLocal} onValueChange={setFilterStatusLocal}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> New Project</Button>
        </div>
      )}
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
                  {adding && <NewProjectRow onSave={data => createMutation.mutateAsync(data)} onCancel={() => setAdding(false)} />}
                  {filtered.length === 0 && !adding && (
                    <tr><td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">
                      {filterArchived ? 'No archived projects' : 'No projects — click "New Project" to add one'}
                    </td></tr>
                  )}
                  {filtered.map(p => (
                    <ProjectRow key={p.id} project={p}
                      onSave={async row => saveMutation.mutateAsync({ id: p.id, data: row })}
                      onDelete={id => deleteMutation.mutate(id)}
                      onArchive={id => archiveMutation.mutate(id)}
                      onUnarchive={id => unarchiveMutation.mutate(id)}
                      onOpen={setSelectedProject}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    {selectedProject && (
      <ProjectDetailPanel
        project={selectedProject}
        currentUser={currentUser}
        onClose={() => setSelectedProject(null)}
      />
    )}
    </>
  );
}
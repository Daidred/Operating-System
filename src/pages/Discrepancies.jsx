import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Save, X, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import InlineFileZone from '@/components/shipments/InlineFileZone';
import { format } from 'date-fns';

const BUS_UNITS = ["Food Service", "Retail", "CTK", "F&B", "QA/QC", "DC 1", "DC 2", "Marketing", "Purchasing"];
const ISSUE_TYPES = [
  "Wrong Forecast", "Late Order Request", "Incorrect SKU", "Last-Minute Quantity Change",
  "Missing Approval", "Supplier Communication Failure", "Urgent Import Request",
  "Wrong Packaging Request", "Inventory Mismatch", "Sales Overcommitment", "SOP Violation",
  "Data Entry Error", "Product Rejection", "Quality Non-Conformance", "Other"
];
const IMPACT_LEVELS = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["Open", "Under Review", "Validated", "Resolved", "Rejected"];

const IMPACT_COLORS = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100 text-red-800',
};
const STATUS_COLORS = {
  Open: 'bg-blue-100 text-blue-800',
  'Under Review': 'bg-purple-100 text-purple-800',
  Validated: 'bg-cyan-100 text-cyan-800',
  Resolved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
};
const ROW_BG = {
  Open: 'bg-blue-50/40',
  'Under Review': 'bg-purple-50/40',
  Validated: 'bg-cyan-50/40',
  Resolved: 'bg-emerald-50/40',
  Rejected: 'bg-red-50/40',
};

function CI({ value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-7 px-1.5 text-xs bg-transparent border-0 rounded focus:outline-none focus:ring-1 focus:ring-primary/40 ${className}`}
    />
  );
}

function CS({ value, options, onChange, placeholder = '—', colorMap }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={`h-7 text-xs border-0 px-1.5 rounded-full focus:ring-1 focus:ring-primary/40 ${colorMap ? (colorMap[value] || 'bg-muted text-muted-foreground') : 'bg-transparent'}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function DiscrepancyRow({ discrepancy, onSave, onDelete, onOpenDetail }) {
  const [row, setRow] = useState({ ...discrepancy, attachments: discrepancy.attachments || [] });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => { setRow(prev => ({ ...prev, [field]: value })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await onSave(row);
    setSaving(false);
    setDirty(false);
  };

  const rowBg = ROW_BG[row.status] || 'bg-white';

  return (
    <tr className={`border-b transition-colors ${rowBg} ${dirty ? 'outline outline-1 outline-primary/30' : ''}`}>
      <td className="px-2 py-1 min-w-[180px]">
        <CI value={row.title} onChange={v => set('title', v)} placeholder="Title" className="font-medium" />
      </td>
      <td className="px-2 py-1 min-w-[90px]">
        <CI value={row.date} onChange={v => set('date', v)} type="date" />
      </td>
      <td className="px-2 py-1 min-w-[120px]">
        <CS value={row.business_unit} options={BUS_UNITS} onChange={v => set('business_unit', v)} placeholder="BU" />
      </td>
      <td className="px-2 py-1 min-w-[170px]">
        <CS value={row.issue_type} options={ISSUE_TYPES} onChange={v => set('issue_type', v)} placeholder="Issue Type" />
      </td>
      <td className="px-2 py-1 min-w-[110px]">
        <CI value={row.responsible_person} onChange={v => set('responsible_person', v)} placeholder="Responsible" />
      </td>
      <td className="px-2 py-1 min-w-[100px]">
        <CS value={row.impact_level} options={IMPACT_LEVELS} onChange={v => set('impact_level', v)} placeholder="Impact" colorMap={IMPACT_COLORS} />
      </td>
      <td className="px-2 py-1 min-w-[90px]">
        <CS value={row.status} options={STATUSES} onChange={v => set('status', v)} placeholder="Status" colorMap={STATUS_COLORS} />
      </td>
      <td className="px-2 py-1 min-w-[70px]">
        <CI value={row.purchasing_hours_lost} onChange={v => set('purchasing_hours_lost', parseFloat(v) || 0)} type="number" placeholder="0" />
      </td>
      <td className="px-2 py-1 min-w-[90px]">
        <CI value={row.additional_cost} onChange={v => set('additional_cost', parseFloat(v) || 0)} type="number" placeholder="0" />
      </td>
      <td className="px-2 py-1 min-w-[140px]">
        <InlineFileZone files={row.attachments} onChange={files => set('attachments', files)} />
      </td>
      <td className="px-2 py-1 min-w-[100px]">
        <div className="flex items-center gap-1">
          <button onClick={() => onOpenDetail(discrepancy.id)} className="p-1 rounded text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors" title="Open detail">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {dirty && (
            <>
              <button onClick={handleSave} disabled={saving} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => { setRow({ ...discrepancy, attachments: discrepancy.attachments || [] }); setDirty(false); }}
                className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={() => { if (confirm('Delete this discrepancy?')) onDelete(discrepancy.id); }} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewDiscrepancyRow({ onSave, onCancel }) {
  const [row, setRow] = useState({
    title: '', date: format(new Date(), 'yyyy-MM-dd'),
    business_unit: '', issue_type: '', responsible_person: '',
    impact_level: '', status: 'Open',
    purchasing_hours_lost: 0, additional_cost: 0,
    description: '', attachments: [],
    requester: '', requester_name: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setRow(prev => ({ ...prev, requester: user.email || '', requester_name: user.full_name || user.email || '' }));
    });
  }, []);

  const set = (f, v) => setRow(prev => ({ ...prev, [f]: v }));

  const handleSave = async () => {
    if (!row.title) return;
    setSaving(true);
    await onSave(row);
    setSaving(false);
  };

  return (
    <tr className="border-b bg-primary/5 outline outline-2 outline-primary/30">
      <td className="px-2 py-1 min-w-[180px]">
        <input autoFocus className="w-full h-7 px-1.5 text-xs bg-white border border-primary/40 rounded focus:outline-none" placeholder="Title *" value={row.title} onChange={e => set('title', e.target.value)} />
      </td>
      <td className="px-2 py-1"><input type="date" className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" value={row.date} onChange={e => set('date', e.target.value)} /></td>
      <td className="px-2 py-1 min-w-[120px]">
        <Select value={row.business_unit} onValueChange={v => set('business_unit', v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-1"><SelectValue placeholder="BU" /></SelectTrigger>
          <SelectContent>{BUS_UNITS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1 min-w-[170px]">
        <Select value={row.issue_type} onValueChange={v => set('issue_type', v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-1"><SelectValue placeholder="Issue Type" /></SelectTrigger>
          <SelectContent>{ISSUE_TYPES.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1"><input className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" placeholder="Responsible" value={row.responsible_person} onChange={e => set('responsible_person', e.target.value)} /></td>
      <td className="px-2 py-1 min-w-[100px]">
        <Select value={row.impact_level} onValueChange={v => set('impact_level', v)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-1"><SelectValue placeholder="Impact" /></SelectTrigger>
          <SelectContent>{IMPACT_LEVELS.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1 min-w-[90px]">
        <Select value={row.status} onValueChange={v => set('status', v)}>
          <SelectTrigger className={`h-7 text-xs border-0 px-1 rounded-full ${STATUS_COLORS[row.status] || ''}`}><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-2 py-1"><input type="number" className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" placeholder="0" value={row.purchasing_hours_lost} onChange={e => set('purchasing_hours_lost', parseFloat(e.target.value) || 0)} /></td>
      <td className="px-2 py-1"><input type="number" className="w-full h-7 px-1.5 text-xs bg-transparent rounded focus:outline-none" placeholder="0" value={row.additional_cost} onChange={e => set('additional_cost', parseFloat(e.target.value) || 0)} /></td>
      <td className="px-2 py-1 min-w-[140px]">
        <InlineFileZone files={row.attachments} onChange={files => set('attachments', files)} />
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <button onClick={handleSave} disabled={saving || !row.title} className="p-1 rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 transition-colors">
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

export default function Discrepancies({ onOpenDetail }) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [filterBU, setFilterBU] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterImpact, setFilterImpact] = useState('all');
  const queryClient = useQueryClient();

  const { data: discrepancies = [], isLoading } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => base44.entities.Discrepancy.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Discrepancy.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discrepancies'] }),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.Discrepancy.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['discrepancies'] }); setAdding(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Discrepancy.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discrepancies'] }),
  });

  const filtered = discrepancies.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.title?.toLowerCase().includes(q) || d.responsible_person?.toLowerCase().includes(q))
      && (filterBU === 'all' || d.business_unit === filterBU)
      && (filterStatus === 'all' || d.status === filterStatus)
      && (filterImpact === 'all' || d.impact_level === filterImpact);
  });

  const headers = ['Title', 'Date', 'Business Unit', 'Issue Type', 'Responsible', 'Impact', 'Status', 'Hours Lost', 'Cost (฿)', 'Attachments', ''];

  return (
    <div className="space-y-5">
      <PageHeader title="Discrepancies" subtitle={`${filtered.length} records`}>
        <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-1" /> New Entry</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title, responsible..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterBU} onValueChange={setFilterBU}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Units" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {BUS_UNITS.map(bu => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterImpact} onValueChange={setFilterImpact}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Impact" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Impact</SelectItem>
            {IMPACT_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
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
                <tbody>
                  {adding && (
                    <NewDiscrepancyRow
                      onSave={data => createMutation.mutateAsync(data)}
                      onCancel={() => setAdding(false)}
                    />
                  )}
                  {filtered.length === 0 && !adding ? (
                    <tr>
                      <td colSpan={headers.length} className="text-center py-12 text-muted-foreground text-sm">
                        No discrepancies — click "New Entry" to add one
                      </td>
                    </tr>
                  ) : filtered.map(d => (
                    <DiscrepancyRow
                      key={d.id}
                      discrepancy={d}
                      onSave={async row => saveMutation.mutateAsync({ id: d.id, data: row })}
                      onDelete={id => deleteMutation.mutate(id)}
                      onOpenDetail={onOpenDetail}
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
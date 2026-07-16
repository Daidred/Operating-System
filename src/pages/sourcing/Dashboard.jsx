import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, MessageSquare, FolderOpen, CheckCircle2, FileText, FlaskConical, Users, TrendingUp } from 'lucide-react';
import { isToday, isPast, addDays, parseISO } from 'date-fns';


function KpiCard({ icon: Icon, label, value, color = 'text-primary', bg = 'bg-primary/10', onClick }) {
  return (
    <Card className={`transition-shadow ${onClick ? 'hover:shadow-md cursor-pointer hover:border-primary/30' : ''}`} onClick={onClick}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const PRIORITY_BADGE = {
  Urgent: 'bg-red-100 text-red-700',
  High: 'bg-orange-100 text-orange-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low: 'bg-slate-100 text-slate-600',
};

const STATUS_BADGE = {
  Idea: 'bg-slate-100 text-slate-600',
  'Supplier Search': 'bg-blue-100 text-blue-700',
  'Supplier Contacted': 'bg-indigo-100 text-indigo-700',
  'Quotation Received': 'bg-purple-100 text-purple-700',
  'Sample Requested': 'bg-amber-100 text-amber-700',
  'Sample Testing': 'bg-orange-100 text-orange-700',
  Negotiation: 'bg-cyan-100 text-cyan-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Paused: 'bg-gray-100 text-gray-600',
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  try { return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr)); } catch { return false; }
}
function isDueToday(dateStr) {
  if (!dateStr) return false;
  try { return isToday(parseISO(dateStr)); } catch { return false; }
}
function isDueSoon(dateStr, days = 7) {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr);
    return !isPast(d) && d <= addDays(new Date(), days);
  } catch { return false; }
}

export default function SourcingDashboard({ onNavigate }) {
  const { data: projects = [] } = useQuery({ queryKey: ['sourcing-projects'], queryFn: () => base44.entities.SourcingProject.list('-created_date', 200) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => base44.entities.Supplier.list('-created_date', 200) });
  const { data: followUps = [] } = useQuery({ queryKey: ['followups'], queryFn: () => base44.entities.FollowUp.list('-created_date', 200) });
  const { data: quotations = [] } = useQuery({ queryKey: ['quotations'], queryFn: () => base44.entities.Quotation.list('-created_date', 200) });
  const { data: samples = [] } = useQuery({ queryKey: ['samples'], queryFn: () => base44.entities.Sample.list('-created_date', 200) });
  const { data: documents = [] } = useQuery({ queryKey: ['supplier-docs'], queryFn: () => base44.entities.SupplierDocument.list('-created_date', 200) });

  const activeProjects = useMemo(() => projects.filter(p => !p.archived && !['Approved', 'Rejected', 'Paused'].includes(p.status)), [projects]);
  const urgentFollowUps = useMemo(() => followUps.filter(f => isOverdue(f.next_followup_date) || isDueToday(f.next_followup_date)), [followUps]);
  const waitingSuppliers = useMemo(() => followUps.filter(f => f.reply_status === 'No Reply' || f.reply_status === 'Waiting'), [followUps]);
  const pendingQuotations = useMemo(() => quotations.filter(q => q.status === 'Pending Review'), [quotations]);
  const samplesInProgress = useMemo(() => samples.filter(s => !['Evaluated'].includes(s.evaluation_status)), [samples]);
  const approvedSuppliers = useMemo(() => suppliers.filter(s => s.status === 'Approved'), [suppliers]);
  const expiringDocs = useMemo(() => documents.filter(d => isDueSoon(d.expiry_date, 30)), [documents]);
  const expiringQuotations = useMemo(() => quotations.filter(q => isDueSoon(q.validity_date, 7)), [quotations]);
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={FolderOpen} label="Active Projects" value={activeProjects.length} color="text-blue-600" bg="bg-blue-50" onClick={() => onNavigate?.('projects')} />
        <KpiCard icon={Users} label="Suppliers Contacted" value={suppliers.length} color="text-indigo-600" bg="bg-indigo-50" onClick={() => onNavigate?.('suppliers')} />
        <KpiCard icon={FileText} label="Pending Quotations" value={pendingQuotations.length} color="text-amber-600" bg="bg-amber-50" onClick={() => onNavigate?.('quotations')} />
        <KpiCard icon={FlaskConical} label="Samples In Progress" value={samplesInProgress.length} color="text-purple-600" bg="bg-purple-50" onClick={() => onNavigate?.('samples')} />
        <KpiCard icon={CheckCircle2} label="Approved Suppliers" value={approvedSuppliers.length} color="text-emerald-600" bg="bg-emerald-50" onClick={() => onNavigate?.('suppliers-approved')} />
        <KpiCard icon={AlertTriangle} label="Urgent Follow-ups" value={urgentFollowUps.length} color="text-red-600" bg="bg-red-50" onClick={() => onNavigate?.('followups-due')} />
      </div>

      {/* Alerts Row */}
      {(urgentFollowUps.length > 0 || expiringDocs.length > 0 || expiringQuotations.length > 0) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Alerts & Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {urgentFollowUps.slice(0, 3).map(f => (
              <div key={f.id} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-red-100">
                <Clock className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="font-medium text-red-700">Overdue Follow-up:</span>
                <span className="text-foreground">{f.supplier_name} — {f.next_action || 'No action set'}</span>
                <span className="ml-auto text-red-500 font-medium">{f.next_followup_date}</span>
              </div>
            ))}
            {expiringDocs.slice(0, 3).map(d => (
              <div key={d.id} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-amber-100">
                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-medium text-amber-700">Cert Expiring:</span>
                <span className="text-foreground">{d.supplier_name} — {d.document_type}</span>
                <span className="ml-auto text-amber-600 font-medium">{d.expiry_date}</span>
              </div>
            ))}
            {expiringQuotations.slice(0, 3).map(q => (
              <div key={q.id} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-orange-100">
                <TrendingUp className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span className="font-medium text-orange-700">Quotation Expiring:</span>
                <span className="text-foreground">{q.supplier_name} — {q.product}</span>
                <span className="ml-auto text-orange-600 font-medium">{q.validity_date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-primary" /> Active Sourcing Projects
              {onNavigate && <button onClick={() => onNavigate('projects')} className="ml-auto text-[10px] text-primary hover:underline font-normal">View all →</button>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {activeProjects.length === 0 && <p className="text-xs text-muted-foreground italic">No active projects</p>}
            {activeProjects.slice(0, 6).map(p => (
              <button key={p.id} onClick={() => onNavigate?.('projects')}
                className="w-full flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-muted/50 rounded px-1 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.product_category} · {p.target_origin || '—'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[p.priority]}`}>{p.priority}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Urgent Follow-ups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" /> Follow-ups Due Today / Overdue
              {onNavigate && <button onClick={() => onNavigate('followups-due')} className="ml-auto text-[10px] text-primary hover:underline font-normal">View all →</button>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {urgentFollowUps.length === 0 && <p className="text-xs text-muted-foreground italic">No urgent follow-ups 🎉</p>}
            {urgentFollowUps.slice(0, 6).map(f => (
              <button key={f.id} onClick={() => onNavigate?.('followups-due')}
                className="w-full flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-muted/50 rounded px-1 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.supplier_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.next_action || f.project_name || '—'}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isOverdue(f.next_followup_date) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isOverdue(f.next_followup_date) ? 'Overdue' : 'Today'}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Suppliers Waiting Reply */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" /> Suppliers Waiting for Reply
              {onNavigate && <button onClick={() => onNavigate('followups')} className="ml-auto text-[10px] text-primary hover:underline font-normal">View all →</button>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {waitingSuppliers.length === 0 && <p className="text-xs text-muted-foreground italic">No pending replies</p>}
            {waitingSuppliers.slice(0, 6).map(f => (
              <button key={f.id} onClick={() => onNavigate?.('followups')}
                className="w-full flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-muted/50 rounded px-1 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.supplier_name}</p>
                  <p className="text-xs text-muted-foreground">Contacted: {f.date_contacted || '—'}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_BADGE[f.priority] || 'bg-slate-100 text-slate-600'}`}>{f.priority}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Samples Requested */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-500" /> Samples In Progress
              {onNavigate && <button onClick={() => onNavigate('samples')} className="ml-auto text-[10px] text-primary hover:underline font-normal">View all →</button>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {samplesInProgress.length === 0 && <p className="text-xs text-muted-foreground italic">No samples in progress</p>}
            {samplesInProgress.slice(0, 6).map(s => (
              <button key={s.id} onClick={() => onNavigate?.('samples')}
                className="w-full flex items-center gap-3 py-2 border-b border-border last:border-0 hover:bg-muted/50 rounded px-1 transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.product}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.supplier_name}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                  s.evaluation_status === 'Requested' ? 'bg-amber-100 text-amber-700' :
                  s.evaluation_status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                  s.evaluation_status === 'Received' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-purple-100 text-purple-700'
                }`}>{s.evaluation_status}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
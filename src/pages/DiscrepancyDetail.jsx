import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Clock, DollarSign, User, Building2, Tag, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import DiscrepancyForm from '@/components/discrepancies/DiscrepancyForm';
import WorkloadForm from '@/components/workload/WorkloadForm';
import { format } from 'date-fns';

export default function DiscrepancyDetail({ id, onBack }) {
  const [editOpen, setEditOpen] = useState(false);
  const [workloadFormOpen, setWorkloadFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: discrepancy, isLoading } = useQuery({
    queryKey: ['discrepancy', id],
    queryFn: async () => {
      const items = await base44.entities.Discrepancy.filter({ id });
      return items[0];
    },
    enabled: !!id,
  });

  const { data: workloads = [] } = useQuery({
    queryKey: ['workloads', id],
    queryFn: () => base44.entities.WorkloadEntry.filter({ discrepancy_id: id }),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus) => base44.entities.Discrepancy.update(id, { 
      status: newStatus,
      ...(newStatus === 'Resolved' ? { resolution_date: format(new Date(), 'yyyy-MM-dd') } : {})
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discrepancy', id] }),
  });

  const deleteWorkload = useMutation({
    mutationFn: (wId) => base44.entities.WorkloadEntry.delete(wId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workloads', id] });
      // Recalculate and sync totals on the discrepancy
      const remaining = await base44.entities.WorkloadEntry.filter({ discrepancy_id: id });
      const totalHours = remaining.reduce((s, w) => s + (w.hours_spent || 0), 0);
      const totalCost = remaining.reduce((s, w) => s + (w.estimated_cost || 0), 0);
      await base44.entities.Discrepancy.update(id, { purchasing_hours_lost: totalHours, additional_cost: totalCost });
      queryClient.invalidateQueries({ queryKey: ['discrepancy', id] });
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
    },
  });

  if (isLoading || !discrepancy) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const totalWorkloadHours = workloads.reduce((s, w) => s + (w.hours_spent || 0), 0);
  const totalWorkloadCost = workloads.reduce((s, w) => s + (w.estimated_cost || 0), 0);
  const overtimeEntries = workloads.filter(w => w.overtime).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <PageHeader title={discrepancy.title} subtitle={`Reported on ${discrepancy.date ? format(new Date(discrepancy.date), 'MMMM d, yyyy') : 'N/A'}`}>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
            <Select value={discrepancy.status} onValueChange={v => statusMutation.mutate(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Open", "Under Review", "Validated", "Resolved", "Rejected"].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PageHeader>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoItem icon={Building2} label="Business Unit" value={discrepancy.business_unit} />
                <InfoItem icon={Tag} label="Issue Type" value={discrepancy.issue_type} />
                <InfoItem icon={Clock} label="Hours Lost" value={`${discrepancy.purchasing_hours_lost || 0}h`} />
                <InfoItem icon={DollarSign} label="Additional Cost" value={`฿${(discrepancy.additional_cost || 0).toLocaleString()}`} />
              </div>
              <Separator />
              <div className="flex gap-3">
                <StatusBadge value={discrepancy.status} />
                <StatusBadge value={discrepancy.impact_level} type="impact" />
                {discrepancy.root_cause_category && (
                  <StatusBadge value={discrepancy.root_cause_category} type="impact" />
                )}
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                <p className="text-sm text-foreground leading-relaxed">{discrepancy.description}</p>
              </div>
              {discrepancy.responsible_person && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Responsible:</span>
                  <span className="text-sm font-medium">{discrepancy.responsible_person}</span>
                </div>
              )}
              {discrepancy.root_cause && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Root Cause</h3>
                  <p className="text-sm text-foreground leading-relaxed">{discrepancy.root_cause}</p>
                </div>
              )}
              {discrepancy.corrective_action && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Corrective Action</h3>
                  <p className="text-sm text-foreground leading-relaxed">{discrepancy.corrective_action}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {discrepancy.attachments?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evidence & Attachments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {discrepancy.attachments.map((att, idx) => (
                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">{att.name}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Workload Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workload Impact</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setWorkloadFormOpen(true)}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-lg font-bold text-foreground">{totalWorkloadHours}h</p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-lg font-bold text-foreground">{overtimeEntries}</p>
                  <p className="text-xs text-muted-foreground">OT Entries</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-lg font-bold text-foreground">฿{totalWorkloadCost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Est. Cost</p>
                </div>
              </div>
              <Separator />
              {workloads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No workload entries yet</p>
              ) : (
                workloads.map(w => (
                  <div key={w.id} className="p-3 rounded-lg border bg-card space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">{w.activity_type}</p>
                      <button onClick={() => deleteWorkload.mutate(w.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{w.employee_name} • {w.hours_spent}h {w.overtime ? '(OT)' : ''}</p>
                    {w.estimated_cost > 0 && <p className="text-xs text-muted-foreground">Cost: ฿{w.estimated_cost.toLocaleString()}</p>}
                    {w.comments && <p className="text-xs text-muted-foreground mt-1">{w.comments}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editOpen && (
        <DiscrepancyForm
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['discrepancy', id] })}
          editData={discrepancy}
        />
      )}

      {workloadFormOpen && (
        <WorkloadForm
          open={workloadFormOpen}
          onClose={() => setWorkloadFormOpen(false)}
          discrepancyId={id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['workloads', id] });
            queryClient.invalidateQueries({ queryKey: ['discrepancy', id] });
            queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
          }}
        />
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
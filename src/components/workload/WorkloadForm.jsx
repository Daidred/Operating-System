import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

const ACTIVITY_TYPES = [
  "Emergency Supplier Coordination",
  "Additional Shipping Arrangements",
  "Rework",
  "Urgent Documentation",
  "Extra Meetings",
  "Container Changes",
  "Re-Planning",
  "Other"
];

export default function WorkloadForm({ open, onClose, discrepancyId, onSuccess }) {
  const { data: appUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: discrepancies = [] } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => base44.entities.Discrepancy.list('-created_date', 200),
    enabled: !discrepancyId, // only load if no discrepancy pre-selected
  });

  const [form, setForm] = useState({
    discrepancy_id: discrepancyId || '',
    employee_name: '',
    hours_spent: 0,
    overtime: false,
    activity_type: '',
    urgency_level: 'Normal',
    estimated_cost: 0,
    comments: '',
  });
  const [saving, setSaving] = useState(false);

  // Keep discrepancy_id in sync if prop changes
  useEffect(() => {
    if (discrepancyId) setForm(prev => ({ ...prev, discrepancy_id: discrepancyId }));
  }, [discrepancyId]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await base44.entities.WorkloadEntry.create(form);

    // Auto-sync purchasing_hours_lost on the linked discrepancy
    const linkedDiscId = form.discrepancy_id;
    if (linkedDiscId) {
      const allEntries = await base44.entities.WorkloadEntry.filter({ discrepancy_id: linkedDiscId });
      const totalHours = allEntries.reduce((s, w) => s + (w.hours_spent || 0), 0);
      const totalCost = allEntries.reduce((s, w) => s + (w.estimated_cost || 0), 0);
      await base44.entities.Discrepancy.update(linkedDiscId, {
        purchasing_hours_lost: totalHours,
        additional_cost: totalCost,
      });
    }

    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Workload Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!discrepancyId && (
            <div>
              <Label>Linked Discrepancy *</Label>
              <Select value={form.discrepancy_id} onValueChange={v => handleChange('discrepancy_id', v)} required>
                <SelectTrigger><SelectValue placeholder="Select discrepancy" /></SelectTrigger>
                <SelectContent>
                  {discrepancies.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      [{d.business_unit}] {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Employee *</Label>
            <Select value={form.employee_name} onValueChange={v => handleChange('employee_name', v)} required>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {appUsers.map(u => (
                  <SelectItem key={u.id} value={u.full_name || u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Activity Type *</Label>
            <Select value={form.activity_type} onValueChange={v => handleChange('activity_type', v)} required>
              <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hours Spent *</Label>
              <Input type="number" step="0.5" min="0" value={form.hours_spent} onChange={e => handleChange('hours_spent', parseFloat(e.target.value) || 0)} required />
            </div>
            <div>
              <Label>Urgency</Label>
              <Select value={form.urgency_level} onValueChange={v => handleChange('urgency_level', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Estimated Cost (฿)</Label>
            <Input type="number" min="0" value={form.estimated_cost} onChange={e => handleChange('estimated_cost', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.overtime} onCheckedChange={v => handleChange('overtime', v)} />
            <Label>Overtime work</Label>
          </div>
          <div>
            <Label>Comments</Label>
            <Textarea value={form.comments} onChange={e => handleChange('comments', e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Add Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, User } from 'lucide-react';
// Upload, X removed — handled by FileDropZone
import FileDropZone from '@/components/shipments/FileDropZone';
import { format } from 'date-fns';

const ISSUE_TYPES = [
  "Wrong Forecast", "Late Order Request", "Incorrect SKU", "Last-Minute Quantity Change",
  "Missing Approval", "Supplier Communication Failure", "Urgent Import Request",
  "Wrong Packaging Request", "Inventory Mismatch", "Sales Overcommitment", "SOP Violation",
  "Data Entry Error", "Product Rejection", "Quality Non-Conformance", "Other"
];

const BUS_UNITS = ["Food Service", "Retail", "CTK", "F&B", "QA/QC", "DC 1", "DC 2", "Marketing", "Purchasing"];
const IMPACT_LEVELS = ["Low", "Medium", "High", "Critical"];

export default function DiscrepancyForm({ open, onClose, onSuccess, editData }) {
  const [form, setForm] = useState(editData || {
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    business_unit: '',
    issue_type: '',
    description: '',
    impact_level: '',
    responsible_person: '',
    purchasing_hours_lost: 0,
    additional_cost: 0,
    root_cause: '',
    corrective_action: '',
    attachments: [],
    requester: '',
    requester_name: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editData) {
      base44.auth.me().then(user => {
        setForm(prev => ({
          ...prev,
          requester: user.email || '',
          requester_name: user.full_name || user.email || '',
        }));
      });
    }
  }, [editData]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));



  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editData?.id) {
      await base44.entities.Discrepancy.update(editData.id, form);
    } else {
      await base44.entities.Discrepancy.create(form);
    }
    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Discrepancy' : 'Report New Discrepancy'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => handleChange('title', e.target.value)} placeholder="Brief description of the issue" required />
            </div>

            {/* Reporter - auto-filled from logged-in account, read-only */}
            <div className="sm:col-span-2">
              <Label>Reported By (your account)</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-md text-sm text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span>{form.requester_name || form.requester || (editData ? 'N/A' : 'Loading...')}</span>
                {form.requester && form.requester_name !== form.requester && (
                  <span className="text-xs opacity-60">({form.requester})</span>
                )}
              </div>
            </div>

            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} required />
            </div>
            <div>
              <Label>Business Unit *</Label>
              <Select value={form.business_unit} onValueChange={v => handleChange('business_unit', v)} required>
                <SelectTrigger><SelectValue placeholder="Select BU" /></SelectTrigger>
                <SelectContent>
                  {BUS_UNITS.map(bu => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Issue Type *</Label>
              <Select value={form.issue_type} onValueChange={v => handleChange('issue_type', v)} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact Level *</Label>
              <Select value={form.impact_level} onValueChange={v => handleChange('impact_level', v)} required>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Detailed description of what happened" rows={3} required />
            </div>
            <div>
              <Label>Responsible Person</Label>
              <Input value={form.responsible_person} onChange={e => handleChange('responsible_person', e.target.value)} placeholder="Name of person responsible" />
            </div>
            <div>
              <Label>Purchasing Hours Lost</Label>
              <Input type="number" step="0.5" min="0" value={form.purchasing_hours_lost} onChange={e => handleChange('purchasing_hours_lost', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Additional Cost (฿)</Label>
              <Input type="number" min="0" value={form.additional_cost} onChange={e => handleChange('additional_cost', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Root Cause</Label>
              <Textarea value={form.root_cause} onChange={e => handleChange('root_cause', e.target.value)} placeholder="What caused this issue?" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Corrective Action</Label>
              <Textarea value={form.corrective_action} onChange={e => handleChange('corrective_action', e.target.value)} placeholder="Proposed or taken corrective action" rows={2} />
            </div>

            {/* Attachments */}
            <div className="sm:col-span-2">
              <Label>Evidence / Attachments</Label>
              <div className="mt-2">
                <FileDropZone
                  files={form.attachments || []}
                  onChange={files => handleChange('attachments', files)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : editData ? 'Update' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
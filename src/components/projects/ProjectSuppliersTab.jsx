import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, User, Mail, Phone, Globe, Pencil, X, Check, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';

const BLANK_FORM = { name: '', country: '', contact_person: '', email: '', phone: '' };
const BLANK_CONTACT = { name: '', role: '', email: '', phone: '' };

// ─── Contact row (add / display) ────────────────────────────────────────────
function ContactRow({ contact, onUpdate, onRemove, isNew = false, onSave, onCancel }) {
  const [editing, setEditing] = useState(isNew);
  const [draft, setDraft] = useState({ ...contact });
  const set = (f, v) => setDraft(p => ({ ...p, [f]: v }));

  const handleSave = () => {
    onUpdate ? onUpdate(draft) : onSave(draft);
    if (!isNew) setEditing(false);
  };

  if (!editing && !isNew) {
    return (
      <div className="flex items-center gap-2 py-1 pl-2 group/contact">
        <div className="flex-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {contact.name && <span className="text-xs text-foreground flex items-center gap-1"><User className="w-3 h-3 text-muted-foreground" />{contact.name}{contact.role && <span className="text-muted-foreground">({contact.role})</span>}</span>}
          {contact.email && <a href={`mailto:${contact.email}`} className="text-xs text-primary flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" />{contact.email}</a>}
          {contact.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover/contact:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setEditing(true)} className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-3 h-3" /></button>
          <button onClick={onRemove} className="p-0.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1.5 p-2 bg-muted/30 rounded-lg border border-border">
      <Input placeholder="Contact name" className="h-7 text-xs" value={draft.name} onChange={e => set('name', e.target.value)} />
      <Input placeholder="Role / Title" className="h-7 text-xs" value={draft.role} onChange={e => set('role', e.target.value)} />
      <Input placeholder="Email" className="h-7 text-xs" value={draft.email} onChange={e => set('email', e.target.value)} />
      <Input placeholder="Phone" className="h-7 text-xs" value={draft.phone} onChange={e => set('phone', e.target.value)} />
      <div className="col-span-2 flex justify-end gap-1">
        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={isNew ? onCancel : () => { setDraft({ ...contact }); setEditing(false); }}>
          <X className="w-3 h-3 mr-1" />Cancel
        </Button>
        <Button size="sm" className="h-6 text-xs px-2" onClick={handleSave} disabled={!draft.name && !draft.email}>
          <Check className="w-3 h-3 mr-1" />Save
        </Button>
      </div>
    </div>
  );
}

// ─── Supplier card with expand/edit ─────────────────────────────────────────
function SupplierCard({ link, supplier, onRemoveLink, onUpdateSupplier }) {
  const [expanded, setExpanded] = useState(false);
  const [editingMain, setEditingMain] = useState(false);
  const [draft, setDraft] = useState(null);
  const [addingContact, setAddingContact] = useState(false);

  const s = supplier || {};
  const contacts = s.contacts || [];

  const startEdit = () => {
    setDraft({ name: s.name || link.supplier_name, country: s.country || '', contact_person: s.contact_person || '', email: s.email || '', phone: s.phone || '' });
    setEditingMain(true);
    setExpanded(true);
  };

  const saveMain = () => {
    onUpdateSupplier({ ...s, ...draft });
    setEditingMain(false);
  };

  const saveContact = (newContact) => {
    const updated = { ...s, contacts: [...contacts, newContact] };
    onUpdateSupplier(updated);
    setAddingContact(false);
  };

  const updateContact = (idx, updated) => {
    const newContacts = contacts.map((c, i) => i === idx ? updated : c);
    onUpdateSupplier({ ...s, contacts: newContacts });
  };

  const removeContact = (idx) => {
    const newContacts = contacts.filter((_, i) => i !== idx);
    onUpdateSupplier({ ...s, contacts: newContacts });
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          {editingMain ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <Input placeholder="Supplier name *" className="h-7 text-xs font-semibold" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                <Input placeholder="Country" className="h-7 text-xs" value={draft.country} onChange={e => setDraft(d => ({ ...d, country: e.target.value }))} />
                <Input placeholder="Primary contact person" className="h-7 text-xs" value={draft.contact_person} onChange={e => setDraft(d => ({ ...d, contact_person: e.target.value }))} />
                <Input placeholder="Primary email" className="h-7 text-xs" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} />
                <Input placeholder="Primary phone" className="h-7 text-xs col-span-2" value={draft.phone} onChange={e => setDraft(d => ({ ...d, phone: e.target.value }))} />
              </div>
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingMain(false)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                <Button size="sm" className="h-6 text-xs" onClick={saveMain} disabled={!draft.name?.trim()}><Check className="w-3 h-3 mr-1" />Save</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">{link.supplier_name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {s.contact_person && <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{s.contact_person}</span>}
                {s.email && <a href={`mailto:${s.email}`} className="text-xs text-primary flex items-center gap-1 hover:underline"><Mail className="w-3 h-3" />{s.email}</a>}
                {s.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                {s.country && <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{s.country}</span>}
              </div>
            </>
          )}
        </div>
        {/* Action buttons */}
        {!editingMain && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={startEdit} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit supplier">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setExpanded(e => !e); }} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Expand contacts">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onRemoveLink(link.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove from project">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded contacts section */}
      {expanded && !editingMain && (
        <div className="border-t border-border px-3 py-2 bg-muted/20 space-y-1">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Additional Contacts</p>
            {!addingContact && (
              <button onClick={() => setAddingContact(true)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <UserPlus className="w-3 h-3" /> Add contact
              </button>
            )}
          </div>

          {contacts.length === 0 && !addingContact && (
            <p className="text-xs text-muted-foreground py-1">No additional contacts — click "Add contact" to add more</p>
          )}

          {contacts.map((c, i) => (
            <ContactRow
              key={i}
              contact={c}
              onUpdate={(updated) => updateContact(i, updated)}
              onRemove={() => removeContact(i)}
            />
          ))}

          {addingContact && (
            <ContactRow
              contact={BLANK_CONTACT}
              isNew
              onSave={saveContact}
              onCancel={() => setAddingContact(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ────────────────────────────────────────────────────────────────
export default function ProjectSuppliersTab({ projectId, onActivityLog }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [form, setForm] = useState(BLANK_FORM);

  const { data: links = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplierLink.filter({ project_id: projectId })
  });

  const { data: allSuppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date', 200)
  });

  const linkedIds = new Set(links.map(l => l.supplier_id));
  const available = allSuppliers.filter(s => !linkedIds.has(s.id));

  const cancel = () => { setMode(null); setSelectedSupplierId(''); setForm(BLANK_FORM); };

  const addExistingMutation = useMutation({
    mutationFn: async (supplierId) => {
      const supplier = allSuppliers.find(s => s.id === supplierId);
      await base44.entities.ProjectSupplierLink.create({ project_id: projectId, supplier_id: supplierId, supplier_name: supplier.name });
      await onActivityLog('supplier_added', `Supplier "${supplier.name}" added to project`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-suppliers', projectId] }); cancel(); }
  });

  const addNewMutation = useMutation({
    mutationFn: async (data) => {
      const supplier = await base44.entities.Supplier.create({ ...data, status: 'Active' });
      await base44.entities.ProjectSupplierLink.create({ project_id: projectId, supplier_id: supplier.id, supplier_name: supplier.name });
      await onActivityLog('supplier_added', `New supplier "${supplier.name}" created and added to project`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-suppliers', projectId] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      cancel();
    }
  });

  const removeMutation = useMutation({
    mutationFn: (linkId) => base44.entities.ProjectSupplierLink.delete(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-suppliers', projectId] })
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] })
  });

  const getSupplierDetail = (supplierId) => allSuppliers.find(s => s.id === supplierId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{links.length} supplier{links.length !== 1 ? 's' : ''} linked to this project</p>
        {!mode && (
          <Button size="sm" variant="outline" onClick={() => setMode('existing')}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Supplier
          </Button>
        )}
      </div>

      {/* Mode selector */}
      {mode && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setMode('existing')} className={`text-xs px-3 py-1 rounded-full border transition-colors ${mode === 'existing' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              Select existing
            </button>
            <button onClick={() => setMode('new')} className={`text-xs px-3 py-1 rounded-full border transition-colors ${mode === 'new' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              Add new supplier
            </button>
          </div>

          {mode === 'existing' && (
            <div className="flex gap-2">
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="flex-1 text-xs h-8"><SelectValue placeholder="Select a supplier..." /></SelectTrigger>
                <SelectContent>
                  {available.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name} — {s.country}</SelectItem>)}
                  {available.length === 0 && <SelectItem value="_none" disabled className="text-xs">All suppliers already linked</SelectItem>}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!selectedSupplierId || addExistingMutation.isPending} onClick={() => addExistingMutation.mutate(selectedSupplierId)}>Add</Button>
              <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Supplier name *" className="h-8 text-xs" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Input placeholder="Country" className="h-8 text-xs" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
                <Input placeholder="Contact person" className="h-8 text-xs" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} />
                <Input placeholder="Email" className="h-8 text-xs" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                <Input placeholder="Phone" className="h-8 text-xs col-span-2" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
                <Button size="sm" disabled={!form.name.trim() || addNewMutation.isPending} onClick={() => addNewMutation.mutate(form)}>
                  {addNewMutation.isPending ? 'Saving...' : 'Create & Add'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {links.length === 0 && !mode && (
        <div className="text-center py-8 text-muted-foreground text-sm">No suppliers linked yet</div>
      )}

      <div className="space-y-2">
        {links.map(link => {
          const s = getSupplierDetail(link.supplier_id);
          return (
            <SupplierCard
              key={link.id}
              link={link}
              supplier={s}
              onRemoveLink={(linkId) => removeMutation.mutate(linkId)}
              onUpdateSupplier={(updatedData) => {
                if (s?.id) updateSupplierMutation.mutate({ id: s.id, data: updatedData });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
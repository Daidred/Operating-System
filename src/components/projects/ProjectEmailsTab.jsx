import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Inbox, ChevronDown, ChevronRight, Plus, Trash2, Search, Sparkles, Loader2, Reply } from 'lucide-react';
import { format } from 'date-fns';

const DIRECTION_COLOR = { Sent: 'bg-blue-100 text-blue-700', Received: 'bg-emerald-100 text-emerald-700', Draft: 'bg-gray-100 text-gray-500' };

function EmailRow({ email, onDelete, onLogReply }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${DIRECTION_COLOR[email.direction] || DIRECTION_COLOR.Sent}`}>
          {email.direction === 'Received' ? <Inbox className="w-3 h-3 inline mr-0.5" /> : <Send className="w-3 h-3 inline mr-0.5" />}
          {email.direction}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{email.subject}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {email.direction === 'Received' ? `From: ${email.sender}` : `To: ${email.recipients}`}
            </span>
            {email.supplier_name && <span className="text-xs text-muted-foreground">· {email.supplier_name}</span>}
            <span className="text-xs text-muted-foreground">
              · {email.sent_at ? format(new Date(email.sent_at), 'MMM d, yyyy · HH:mm') : (email.created_date ? format(new Date(email.created_date), 'MMM d, yyyy') : '')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {email.direction === 'Sent' && (
            <button
              onClick={e => { e.stopPropagation(); onLogReply(email); }}
              title="Log supplier reply"
              className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(email.id); }} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20">
          <div className="text-xs text-muted-foreground space-y-1 mb-3">
            {email.sender && <p><span className="font-medium">From:</span> {email.sender}</p>}
            {email.recipients && <p><span className="font-medium">To:</span> {email.recipients}</p>}
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-card border border-border rounded-md p-3">
            {email.body || <span className="text-muted-foreground italic">No body content</span>}
          </div>
          {email.attachments?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {email.attachments.map((a, i) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors">
                  📎 {a.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComposeModal({ projectId, suppliers, currentUser, project, onSave, onClose, defaultValues }) {
  const [form, setForm] = useState({
    direction: defaultValues?.direction || 'Sent',
    subject: defaultValues?.subject || '',
    recipients: defaultValues?.recipients || '',
    sender: defaultValues?.sender || currentUser?.email || '',
    supplier_name: defaultValues?.supplier_name || '',
    body: ''
  });
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const generateDraft = async () => {
    setAiLoading(true);
    const supplierContext = form.supplier_name ? `for supplier: ${form.supplier_name}` : '';
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a professional seafood sourcing buyer at Thammachart Seafood Retail, a Thai company specializing in seafood import and export. Write a professional sourcing email ${supplierContext} for the following context:

    Project: ${project?.name || 'Sourcing Project'}
    Product: ${project?.product_category || 'seafood product'}
    Specification: ${project?.product_specification || 'Not specified'}
    Target Origin: ${project?.target_origin || 'Not specified'}
    Target Price: ${project?.target_price ? `${project.target_price} ${project.target_price_currency || 'USD'}` : 'Not specified'}
    Required Certifications: ${project?.required_certifications || 'None specified'}
    Email Subject: ${form.subject || 'Sourcing Inquiry'}
    Recipient/Supplier: ${form.supplier_name || 'Supplier'}

    Write a clear, professional email appropriate for international seafood trade. Where relevant, mention Thai import requirements (Thai FDA approval, health certificates, certifications like HACCP/BRC/ASC/MSC), preferred incoterms (FOB/CFR/CIF), and request key commercial details (price per kg/unit, MOQ, lead time, payment terms, validity). Be concise and specific. Include placeholders like [YOUR NAME] and [COMPANY] where appropriate. Return only the email body text, no subject line.`,
    });
    set('body', typeof result === 'string' ? result : JSON.stringify(result));
    setAiLoading(false);
  };

  const handleSave = async (doSend = false) => {
    setError('');
    if (!form.subject) { setError('Subject is required.'); return; }
    if (form.direction === 'Sent' && !form.recipients) { setError('Recipient email address is required to send.'); return; }
    if (form.direction === 'Received' && !form.sender) { setError('Please enter the sender email address.'); return; }
    setSaving(true);
    try {
      if (doSend && form.direction === 'Sent') {
        await base44.integrations.Core.SendEmail({
          to: form.recipients,
          subject: form.subject,
          body: form.body,
          from_name: currentUser?.full_name || 'Thammachart Seafood Retail',
        });
      }
      await onSave({ ...form, project_id: projectId, status: form.direction, sent_at: new Date().toISOString() });
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to save email. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold">{form.direction === 'Sent' ? 'Compose & Send Email' : 'Log Received Email'}</h3>
          <Select value={form.direction} onValueChange={v => set('direction', v)}>
            <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Sent" className="text-xs">Sent</SelectItem>
              <SelectItem value="Received" className="text-xs">Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input value={form.sender} onChange={e => set('sender', e.target.value)} placeholder="sender@email.com" className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input value={form.recipients} onChange={e => set('recipients', e.target.value)} placeholder="recipient@email.com" className="mt-1 h-8 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject *</label>
            <Input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Email subject" className="mt-1 h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Supplier (optional)</label>
            <Select value={form.supplier_name} onValueChange={v => set('supplier_name', v)}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Link to supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" " className="text-xs text-muted-foreground">— None —</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.supplier_name} className="text-xs">{s.supplier_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">Email Body</label>
            <button onClick={generateDraft} disabled={aiLoading}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 disabled:opacity-50 font-medium">
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {aiLoading ? 'Drafting...' : 'AI Draft'}
            </button>
          </div>
          <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={7} placeholder="Paste or type the email content here, or use AI Draft..."
            className="w-full mt-0 px-3 py-2 text-xs border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {form.direction === 'Sent' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? 'Saving...' : 'Log Only'}
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
                {saving ? 'Sending...' : <><Send className="w-3.5 h-3.5 mr-1" />Send & Log</>}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Log Email'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectEmailsTab({ projectId, project, currentUser, onActivityLog }) {
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [composeDefaults, setComposeDefaults] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');

  const handleLogReply = (sentEmail) => {
    setComposeDefaults({
      direction: 'Received',
      subject: `Re: ${sentEmail.subject}`,
      sender: sentEmail.recipients,
      recipients: sentEmail.sender,
      supplier_name: sentEmail.supplier_name,
    });
    setComposing(true);
  };

  const { data: emails = [] } = useQuery({
    queryKey: ['project-emails', projectId],
    queryFn: () => base44.entities.ProjectEmail.filter({ project_id: projectId }, '-sent_at', 200)
  });

  const { data: supplierLinks = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplierLink.filter({ project_id: projectId })
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const email = await base44.entities.ProjectEmail.create(data);
      const type = data.direction === 'Received' ? 'email_received' : 'email_sent';
      const label = data.direction === 'Received' ? 'Email received' : 'Email sent';
      await onActivityLog(type, `${label}: "${data.subject}"${data.supplier_name?.trim() ? ` · ${data.supplier_name.trim()}` : ''}`);
      return email;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-emails', projectId] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectEmail.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-emails', projectId] })
  });

  const supplierNames = [...new Set(emails.map(e => e.supplier_name).filter(Boolean))];

  const filtered = emails.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.subject?.toLowerCase().includes(q) || e.body?.toLowerCase().includes(q) || e.sender?.toLowerCase().includes(q) || e.recipients?.toLowerCase().includes(q);
    const matchDir = filterDir === 'all' || e.direction === filterDir;
    const matchSup = filterSupplier === 'all' || e.supplier_name === filterSupplier;
    return matchSearch && matchDir && matchSup;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40" />
        </div>
        <Select value={filterDir} onValueChange={setFilterDir}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All</SelectItem>
            <SelectItem value="Sent" className="text-xs">Sent</SelectItem>
            <SelectItem value="Received" className="text-xs">Received</SelectItem>
          </SelectContent>
        </Select>
        {supplierNames.length > 0 && (
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All suppliers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All suppliers</SelectItem>
              {supplierNames.map(n => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" className="ml-auto" onClick={() => { setComposeDefaults(null); setComposing(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Compose Email
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No emails logged yet</p>
          <p className="text-xs mt-1">Click "Log Email" to record sent or received emails</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(e => <EmailRow key={e.id} email={e} onDelete={id => deleteMutation.mutate(id)} onLogReply={handleLogReply} />)}
      </div>

      {composing && (
        <ComposeModal
          projectId={projectId}
          project={project}
          suppliers={supplierLinks}
          currentUser={currentUser}
          defaultValues={composeDefaults}
          onSave={data => createMutation.mutateAsync(data)}
          onClose={() => { setComposing(false); setComposeDefaults(null); }}
        />
      )}
    </div>
  );
}
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Mail, FileText, User, Upload, Loader2, Trash2, ExternalLink, Download, Save, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const TABS = [
  { id: 'info', label: 'Info & Ratings' },
  { id: 'emails', label: 'Emails' },
  { id: 'documents', label: 'Documents' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'tds', label: 'Technical Data Sheet' },
];

const FILE_ICONS = { pdf: '📄', xlsx: '📊', xls: '📊', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', doc: '📝', docx: '📝' };
const getIcon = (name) => FILE_ICONS[name?.split('.').pop()?.toLowerCase()] || '📎';

const DOC_CATEGORIES = ['Quotation', 'Product Specification', 'Certification', 'Test Report', 'Technical Data Sheet', 'Product Photo', 'Contract', 'Other'];
const INCOTERMS = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP', 'FCA', 'Other'];
const CURRENCIES = ['USD', 'EUR', 'THB', 'CNY', 'GBP', 'Other'];

function RatingStars({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange?.(n)} disabled={!onChange}
          className={`w-4 h-4 ${(value||0)>=n ? 'text-amber-400' : 'text-muted-foreground/30'}`}>
          <Star className="w-3.5 h-3.5 fill-current" />
        </button>
      ))}
    </div>
  );
}

function InfoTab({ supplier, onSave }) {
  const [row, setRow] = useState({ ...supplier });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (f, v) => { setRow(p => ({ ...p, [f]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true);
    await onSave(row);
    setSaving(false);
    setDirty(false);
  };

  const fields = [
    { label: 'Contact Person', key: 'contact_person' },
    { label: 'Email', key: 'email', type: 'email' },
    { label: 'Phone / WhatsApp', key: 'phone' },
    { label: 'Website', key: 'website' },
    { label: 'Country', key: 'country' },
    { label: 'Product Categories', key: 'product_categories' },
    { label: 'Certifications', key: 'certifications' },
    { label: 'Last Contact', key: 'last_contact_date', type: 'date' },
    { label: 'Next Follow-up', key: 'next_followup_date', type: 'date' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-[10px] font-semibold uppercase text-muted-foreground">{f.label}</label>
            <input type={f.type || 'text'} value={row[f.key] || ''} onChange={e => set(f.key, e.target.value)}
              className="mt-1 w-full h-8 px-2 text-xs border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/40" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
        {[['reliability_rating','Reliability'],['quality_rating','Quality'],['communication_rating','Communication'],['price_competitiveness_rating','Price Competitiveness']].map(([k,l]) => (
          <div key={k}>
            <label className="text-[10px] font-semibold uppercase text-muted-foreground block mb-1">{l}</label>
            <RatingStars value={row[k]} onChange={v => set(k, v)} />
          </div>
        ))}
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Notes</label>
        <textarea value={row.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
          className="mt-1 w-full px-2 py-1.5 text-xs border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" />
      </div>
      {dirty && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />} Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setRow({ ...supplier }); setDirty(false); }}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

function EmailsTab({ supplierId }) {
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['supplier-emails', supplierId],
    queryFn: () => base44.entities.ProjectEmail.filter({ supplier_id: supplierId }, '-sent_at', 100),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (emails.length === 0) return <div className="text-center py-10 text-muted-foreground text-sm">No emails logged for this supplier</div>;

  return (
    <div className="space-y-2">
      {emails.map(e => (
        <div key={e.id} className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{e.subject}</p>
              <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                <span className={`px-1.5 py-0.5 rounded-full ${e.direction==='Sent' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{e.direction}</span>
                {e.sender_name && <span>{e.sender_name}</span>}
                {e.sent_at && <span>{format(new Date(e.sent_at), 'MMM d, yyyy')}</span>}
              </div>
            </div>
          </div>
          {e.body && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{e.body}</p>}
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ supplierId, supplierName }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('Other');
  const [dragging, setDragging] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['supplier-docs', supplierId],
    queryFn: () => base44.entities.SupplierDocument.filter({ supplier_id: supplierId }, '-created_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SupplierDocument.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-docs', supplierId] }),
  });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SupplierDocument.create({
        supplier_id: supplierId,
        supplier_name: supplierName,
        document_type: category === 'Technical Data Sheet' ? 'Product Specification' : (category === 'Other' ? 'Other' : category.replace(' ','').substring(0,20)),
        file_url,
        notes: file.name,
        files: [{ name: file.name, url: file_url, type: file.type }],
      });
    }
    qc.invalidateQueries({ queryKey: ['supplier-docs', supplierId] });
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Category:</span>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44 h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{DOC_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
      >
        {uploading ? <div className="flex flex-col items-center gap-1"><Loader2 className="w-5 h-5 animate-spin text-primary" /><p className="text-xs text-muted-foreground">Uploading...</p></div>
          : <><Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" /><p className="text-xs text-muted-foreground">Drop files or click to upload</p></>}
        <input ref={fileRef} type="file" multiple hidden onChange={e => handleFiles(e.target.files)} />
      </div>
      {isLoading ? <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div> : docs.length === 0 ?
        <p className="text-center py-6 text-muted-foreground text-sm">No documents yet</p> : (
        <div className="space-y-2">
          {docs.map(doc => {
            const f = doc.files?.[0];
            return (
              <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/20">
                <span className="text-lg shrink-0">{getIcon(f?.name || doc.notes)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{f?.name || doc.notes || 'Document'}</p>
                  <span className="text-[10px] text-muted-foreground">{doc.document_type}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {(f?.url || doc.file_url) && <>
                    <a href={f?.url || doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><ExternalLink className="w-3.5 h-3.5" /></a>
                    <a href={f?.url || doc.file_url} download className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Download className="w-3.5 h-3.5" /></a>
                  </>}
                  <button onClick={() => deleteMutation.mutate(doc.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuotationsTab({ supplierId }) {
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['supplier-quotations', supplierId],
    queryFn: () => base44.entities.Quotation.filter({ supplier_id: supplierId }, '-created_date', 100),
  });

  const STATUS_COLOR = { 'Pending Review': 'bg-amber-100 text-amber-700', Shortlisted: 'bg-blue-100 text-blue-700', Rejected: 'bg-red-100 text-red-700', Approved: 'bg-emerald-100 text-emerald-700' };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (quotes.length === 0) return <div className="text-center py-10 text-muted-foreground text-sm">No quotations for this supplier yet</div>;

  return (
    <div className="space-y-2">
      {quotes.map(q => (
        <div key={q.id} className="p-3 rounded-lg border border-border bg-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{q.product}</p>
              {q.project_name && <p className="text-xs text-muted-foreground">Project: {q.project_name}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold">{q.price ? `${q.price} ${q.currency || 'USD'}` : '—'}</p>
              <p className="text-xs text-muted-foreground">{q.incoterm}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {q.origin && <span>🌍 {q.origin}</span>}
            {q.moq && <span>MOQ: {q.moq}</span>}
            {q.validity_date && <span>Valid until: {q.validity_date}</span>}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[q.status] || ''}`}>{q.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TDSTab({ supplierId, supplierName }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['supplier-tds', supplierId],
    queryFn: () => base44.entities.SupplierDocument.filter({ supplier_id: supplierId }, '-created_date', 100),
  });

  const tdsFiles = docs.filter(d => d.document_type === 'Product Specification');

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.SupplierDocument.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier-tds', supplierId] }),
  });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SupplierDocument.create({
        supplier_id: supplierId,
        supplier_name: supplierName,
        document_type: 'Product Specification',
        file_url,
        notes: file.name,
        files: [{ name: file.name, url: file_url, type: file.type }],
      });
    }
    qc.invalidateQueries({ queryKey: ['supplier-tds', supplierId] });
    setUploading(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Upload Technical Data Sheets, product specifications, and test reports for this supplier.</p>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
      >
        {uploading ? <div className="flex flex-col items-center gap-1"><Loader2 className="w-5 h-5 animate-spin text-primary" /><p className="text-xs">Uploading...</p></div>
          : <><FileText className="w-6 h-6 mx-auto mb-1 text-muted-foreground" /><p className="text-xs text-muted-foreground">Drop TDS / spec sheets here, or click to browse</p></>}
        <input ref={fileRef} type="file" multiple hidden onChange={e => handleFiles(e.target.files)} />
      </div>
      {isLoading ? <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        : tdsFiles.length === 0 ? <p className="text-center py-6 text-muted-foreground text-sm">No TDS uploaded yet</p> : (
        <div className="space-y-2">
          {tdsFiles.map(doc => {
            const f = doc.files?.[0];
            return (
              <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/20">
                <span className="text-lg shrink-0">{getIcon(f?.name || doc.notes)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{f?.name || doc.notes || 'Technical Data Sheet'}</p>
                  {doc.created_date && <p className="text-[10px] text-muted-foreground">{format(new Date(doc.created_date), 'MMM d, yyyy')}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {(f?.url || doc.file_url) && <>
                    <a href={f?.url || doc.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><ExternalLink className="w-3.5 h-3.5" /></a>
                    <a href={f?.url || doc.file_url} download className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Download className="w-3.5 h-3.5" /></a>
                  </>}
                  <button onClick={() => deleteMutation.mutate(doc.id)} className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SupplierDetailPanel({ supplier, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('info');
  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-2xl bg-card shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-4 bg-accent text-accent-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{supplier.name}</h2>
              <div className="flex gap-3 mt-0.5 text-xs text-accent-foreground/70">
                {supplier.country && <span>🌍 {supplier.country}</span>}
                {supplier.contact_person && <span><User className="w-3 h-3 inline mr-0.5" />{supplier.contact_person}</span>}
                {supplier.email && <a href={`mailto:${supplier.email}`} className="hover:underline"><Mail className="w-3 h-3 inline mr-0.5" />{supplier.email}</a>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent-foreground/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-card text-foreground border-primary' : 'text-accent-foreground/70 border-transparent hover:bg-accent-foreground/10'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && <InfoTab supplier={supplier} onSave={onSave} />}
          {activeTab === 'emails' && <EmailsTab supplierId={supplier.id} />}
          {activeTab === 'documents' && <DocumentsTab supplierId={supplier.id} supplierName={supplier.name} />}
          {activeTab === 'quotations' && <QuotationsTab supplierId={supplier.id} />}
          {activeTab === 'tds' && <TDSTab supplierId={supplier.id} supplierName={supplier.name} />}
        </div>
      </div>
    </div>
  );
}
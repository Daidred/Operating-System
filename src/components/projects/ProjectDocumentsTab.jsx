import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Download, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['Quotation', 'Product Specification', 'Certification', 'Test Report', 'Product Photo', 'Contract', 'Shipment Document', 'Excel File', 'PDF', 'Other'];
const FILE_ICONS = { pdf: '📄', xlsx: '📊', xls: '📊', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', doc: '📝', docx: '📝' };
const getFileIcon = (name) => FILE_ICONS[name?.split('.').pop()?.toLowerCase()] || '📎';

export default function ProjectDocumentsTab({ projectId, currentUser, onActivityLog }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('Other');
  const [supplierName, setSupplierName] = useState('');
  const [dragging, setDragging] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ['project-documents', projectId],
    queryFn: () => base44.entities.ProjectDocument.filter({ project_id: projectId }, '-created_date', 200)
  });

  const { data: supplierLinks = [] } = useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: () => base44.entities.ProjectSupplierLink.filter({ project_id: projectId })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectDocument.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-documents', projectId] })
  });

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ProjectDocument.create({
        project_id: projectId,
        name: file.name,
        url: file_url,
        file_type: file.type,
        document_category: category,
        uploaded_by_name: supplierName || currentUser?.full_name || 'Unknown',
        uploaded_by_email: currentUser?.email || '',
        notes: supplierName ? `Supplier: ${supplierName}` : ''
      });
      await onActivityLog('document_uploaded', `Document "${file.name}" uploaded${supplierName ? ` for ${supplierName}` : ''}`);
    }
    qc.invalidateQueries({ queryKey: ['project-documents', projectId] });
    setUploading(false);
  };

  // Group docs by supplier (stored in uploaded_by_name when supplier is set, or notes)
  const supplierNames = [...new Set(docs.map(d => {
    if (d.notes?.startsWith('Supplier: ')) return d.notes.replace('Supplier: ', '');
    return null;
  }).filter(Boolean))];

  const untagged = docs.filter(d => !d.notes?.startsWith('Supplier: '));
  const bySupplier = supplierNames.map(s => ({
    name: s,
    docs: docs.filter(d => d.notes === `Supplier: ${s}`)
  }));

  return (
    <div className="space-y-4">
      {/* Upload controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Supplier:</span>
          <Select value={supplierName} onValueChange={setSupplierName}>
            <SelectTrigger className="w-40 h-7 text-xs"><SelectValue placeholder="General (no supplier)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null} className="text-xs">General</SelectItem>
              {supplierLinks.map(l => <SelectItem key={l.id} value={l.supplier_name} className="text-xs">{l.supplier_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Category:</span>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44 h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-1"><Loader2 className="w-5 h-5 animate-spin text-primary" /><p className="text-xs text-muted-foreground">Uploading...</p></div>
        ) : (
          <>
            <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Drag & drop files here, or click to browse</p>
            {supplierName && <p className="text-xs text-primary mt-1 font-medium">→ Will be tagged to: {supplierName}</p>}
          </>
        )}
        <input ref={fileRef} type="file" multiple hidden onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Documents grouped by supplier */}
      {docs.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">No documents uploaded yet</div>}

      {bySupplier.map(group => (
        <div key={group.name}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">📦 {group.name}</p>
          <div className="space-y-1.5">
            {group.docs.map(doc => <DocRow key={doc.id} doc={doc} onDelete={() => deleteMutation.mutate(doc.id)} />)}
          </div>
        </div>
      ))}

      {untagged.length > 0 && (
        <div>
          {bySupplier.length > 0 && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">📁 General</p>}
          <div className="space-y-1.5">
            {untagged.map(doc => <DocRow key={doc.id} doc={doc} onDelete={() => deleteMutation.mutate(doc.id)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function DocRow({ doc, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
      <span className="text-lg shrink-0">{getFileIcon(doc.name)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{doc.document_category}</span>
          {doc.created_date && <span className="text-[10px] text-muted-foreground">{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><ExternalLink className="w-3.5 h-3.5" /></a>
        <a href={doc.url} download={doc.name} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Download className="w-3.5 h-3.5" /></a>
        <button onClick={onDelete} className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
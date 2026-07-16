import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Loader2, X, Sparkles, FileText, Pencil, Check, Download, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// ── Global analyzing tracker ──────────────────────────────────────────────────
const analyzingJobs = { count: 0, listeners: [] };
function notifyListeners() { analyzingJobs.listeners.forEach(fn => fn(analyzingJobs.count)); }
function incrementAnalyzing() { analyzingJobs.count++; notifyListeners(); }
function decrementAnalyzing() { analyzingJobs.count = Math.max(0, analyzingJobs.count - 1); notifyListeners(); }

export function GlobalAnalyzingToast() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const handler = (c) => setCount(c);
    analyzingJobs.listeners.push(handler);
    return () => { analyzingJobs.listeners = analyzingJobs.listeners.filter(l => l !== handler); };
  }, []);
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-accent text-accent-foreground text-xs px-4 py-2.5 rounded-xl shadow-xl">
      <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
      AI analyzing {count} document{count > 1 ? 's' : ''}…
    </div>
  );
}

// ── Extraction schema ─────────────────────────────────────────────────────────
const DOCUMENT_TYPE_SCHEMA = {
  type: 'object',
  properties: {
    document_type: { type: 'string', enum: ['Purchase Order', 'Invoice', 'Sea Waybill', 'Bill of Lading', 'Air Waybill', 'Other'] },
    reference: { type: 'string' },
    supplier: { type: 'string' },
    origin: { type: 'string' },
    destination: { type: 'string' },
    swb_no: { type: 'string' },
    bl_no: { type: 'string' },
    awb_no: { type: 'string' },
    sublines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code_no: { type: 'string' },
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
        },
      },
    },
    invoice_sublines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code_no: { type: 'string' },
          description: { type: 'string' },
          invoice_qty: { type: 'number' },
          unit: { type: 'string' },
        },
      },
    },
  },
};

// ── Main component ────────────────────────────────────────────────────────────
export default function InlineFileZone({ files = [], onChange, onAiExtract, existingSublines = [], knownProducts = [] }) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef();
  const popoverRef = useRef();
  const zoneRef = useRef();

  // No click-outside needed — modal uses backdrop click to close

  const processFiles = async (fileList) => {
    setUploading(true);
    const newFiles = [];
    for (const file of Array.from(fileList)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newFiles.push({ name: file.name, url: file_url, type: file.type });

      if (onAiExtract) {
        incrementAnalyzing();

        // Build a rich context prompt that includes known products and existing sublines
        // so the AI evolves its understanding with each upload
        const knownProductsContext = knownProducts.length > 0
          ? `\n\nKnown product catalog from previous shipments (use this to help match descriptions even if names differ slightly):\n${knownProducts.slice(0, 80).map(p => `- ${p.code_no ? `[${p.code_no}] ` : ''}${p.description}`).join('\n')}`
          : '';

        const existingSublineContext = existingSublines.length > 0
          ? `\n\nExisting PO sublines for this shipment (for invoice matching — match even if descriptions differ, e.g. "langoustine 20/30" should match "langoustine 21/30", use semantic similarity):\n${existingSublines.map(s => `- code: ${s.code_no || 'N/A'}, desc: "${s.description}", PO qty: ${s.quantity} ${s.unit || ''}`).join('\n')}`
          : '';

        const prompt = `You are an expert import/export document analyst for a seafood trading company.
Extract structured data from this document. Identify the document type and extract all relevant fields.

For Purchase Orders: extract reference, supplier, and all line items (code_no, description, quantity, unit) into "sublines".
For Invoices: extract all line items into "invoice_sublines" with code_no, description, invoice_qty, unit.
For Waybills/BL/AWB: extract transport reference numbers (swb_no, bl_no, awb_no), origin, destination.
${knownProductsContext}${existingSublineContext}

CRITICAL for invoice matching: The existing PO sublines are listed above. For EACH invoice line item, you MUST find the best matching PO subline and copy its EXACT code_no and EXACT description into the invoice_subline output. Do NOT use the invoice's own description or code — always use the PO's values. Match semantically: same species + similar size range = same product (e.g. "Langoustine 20/30" matches "Frozen Langoustine 21-30 pcs/kg"). If no PO sublines exist, use the raw invoice values.`;

        base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: [file_url],
          response_json_schema: DOCUMENT_TYPE_SCHEMA,
        }).then(result => {
          onAiExtract({ fields: result, document_type: result.document_type });
        }).finally(() => {
          decrementAnalyzing();
        });
      }
    }
    onChange([...files, ...newFiles]);
    setUploading(false);
    if (newFiles.length > 0) setPopoverOpen(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); };
  const handleDragLeave = (e) => { e.stopPropagation(); setDragging(false); };
  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx));
  const renameFile = (idx, newName) => onChange(files.map((f, i) => i === idx ? { ...f, name: newName } : f));

  return (
    <div className="relative flex items-center gap-1 h-7" ref={zoneRef}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`flex items-center gap-1.5 h-7 px-3 rounded-md cursor-pointer text-xs font-medium transition-all select-none border
          ${dragging
            ? 'bg-primary/15 border-primary border-dashed text-primary scale-105'
            : 'border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted/60'
          }`}
        title="Click or drag & drop files here"
        style={{ minWidth: '110px' }}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => processFiles(e.target.files)} />
        {uploading
          ? <><Loader2 className="w-3 h-3 animate-spin shrink-0" /><span>Uploading…</span></>
          : dragging
            ? <><Sparkles className="w-3 h-3 shrink-0" /><span>Drop here</span></>
            : <><Paperclip className="w-3 h-3 shrink-0" /><span>Drop / click</span></>
        }
      </div>

      {/* File count badge */}
      {files.length > 0 && (
        <button
          onClick={() => setPopoverOpen(o => !o)}
          className="flex items-center gap-1 h-6 px-1.5 rounded bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors shrink-0"
          title="View attached files"
        >
          <FileText className="w-3 h-3" />
          {files.length}
        </button>
      )}

      {/* File modal overlay */}
      {popoverOpen && files.length > 0 && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setPopoverOpen(false)}
          />
          {/* Panel */}
          <div
            ref={popoverRef}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-2xl shadow-2xl w-[480px] max-w-[95vw]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Attached Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''} — click name to open, pencil to rename</p>
              </div>
              <button onClick={() => setPopoverOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* File list */}
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {files.map((f, idx) => (
                <FileRow
                  key={idx}
                  file={f}
                  onRename={(name) => renameFile(idx, name)}
                  onRemove={() => removeFile(idx)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilePreviewModal({ file, onClose }) {
  const isImage = file.type?.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.url?.toLowerCase().endsWith('.pdf');

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.8)' }} onClick={onClose} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0" style={{ background: 'white' }}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold truncate">{file.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={file.url}
              download={file.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#f1f5f9' }}>
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow" />
            </div>
          ) : isPdf ? (
            <iframe src={file.url} title={file.name} className="w-full h-full border-0" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <FileText className="w-16 h-16 opacity-30" />
              <p className="text-sm">Preview not available for this file type.</p>
              <a
                href={file.url}
                download={file.name}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FileRow({ file, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const openPreview = () => window.open(file.url, '_blank', 'noopener,noreferrer');
  const [previewing, setPreviewing] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    else setDraft(file.name);
    setEditing(false);
  };

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(file.name); setEditing(false); } }}
              className="w-full text-sm bg-card border border-primary/40 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          ) : (
            <button
              onClick={openPreview}
              className="text-sm text-primary hover:underline font-medium truncate block text-left w-full"
              title="Click to open in new tab"
            >
              {file.name}
            </button>
          )}
          <span className="text-xs text-muted-foreground truncate block">{file.type || 'document'}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={openPreview} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Open in new tab">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <a
            href={file.url}
            download={file.name}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          {editing ? (
            <button onClick={commit} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors" title="Save name">
              <Check className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={() => { setDraft(file.name); setEditing(true); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Rename">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onRemove} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {previewing && <FilePreviewModal file={file} onClose={() => setPreviewing(false)} />}

    </>
  );
}
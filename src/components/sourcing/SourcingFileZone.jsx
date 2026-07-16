import React, { useState, useRef } from 'react';
import { Paperclip, Loader2, X, FileText, Pencil, Check, Download, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function FileRow({ file, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const inputRef = useRef();

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onRename(trimmed);
    else setDraft(file.name);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(file.name); setEditing(false); } }}
            className="w-full text-xs bg-card border border-primary/40 rounded-md px-2 py-1 focus:outline-none"
          />
        ) : (
          <button onClick={() => window.open(file.url, '_blank')} className="text-xs text-primary hover:underline font-medium truncate block text-left w-full">
            {file.name}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => window.open(file.url, '_blank')} className="p-1 rounded text-muted-foreground hover:text-primary" title="Open"><Eye className="w-3 h-3" /></button>
        <a href={file.url} download={file.name} className="p-1 rounded text-muted-foreground hover:text-emerald-600" title="Download"><Download className="w-3 h-3" /></a>
        {editing
          ? <button onClick={commit} className="p-1 rounded text-emerald-600"><Check className="w-3 h-3" /></button>
          : <button onClick={() => { setDraft(file.name); setEditing(true); inputRef.current?.focus(); }} className="p-1 rounded text-muted-foreground hover:text-foreground"><Pencil className="w-3 h-3" /></button>
        }
        <button onClick={onRemove} className="p-1 rounded text-muted-foreground hover:text-red-500"><X className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

export default function SourcingFileZone({ files = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const processFiles = async (fileList) => {
    setUploading(true);
    const newFiles = [];
    for (const file of Array.from(fileList)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newFiles.push({ name: file.name, url: file_url, type: file.type });
    }
    onChange([...files, ...newFiles]);
    setUploading(false);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); };
  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx));
  const renameFile = (idx, name) => onChange(files.map((f, i) => i === idx ? { ...f, name } : f));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-md cursor-pointer text-xs font-medium border-dashed border transition-all
            ${dragging ? 'bg-primary/15 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-muted/60'}`}
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={e => processFiles(e.target.files)} />
          {uploading
            ? <><Loader2 className="w-3 h-3 animate-spin" /><span>Uploading…</span></>
            : <><Paperclip className="w-3 h-3" /><span>{dragging ? 'Drop here' : 'Attach files'}</span></>
          }
        </div>
        {files.length > 0 && <span className="text-xs text-muted-foreground">{files.length} file{files.length !== 1 ? 's' : ''} attached</span>}
      </div>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, idx) => (
            <FileRow key={idx} file={f} onRename={name => renameFile(idx, name)} onRemove={() => removeFile(idx)} />
          ))}
        </div>
      )}
    </div>
  );
}
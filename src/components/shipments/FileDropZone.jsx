import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function FileDropZone({ files = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [renamingIdx, setRenamingIdx] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const inputRef = useRef();

  const uploadFiles = async (fileList) => {
    setUploading(true);
    const updated = [...files];
    for (const file of Array.from(fileList)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updated.push({ name: file.name, url: file_url, type: file.type });
    }
    onChange(updated);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx));

  const startRename = (idx) => {
    setRenamingIdx(idx);
    setRenameValue(files[idx].name);
  };

  const confirmRename = (idx) => {
    const updated = files.map((f, i) => i === idx ? { ...f, name: renameValue.trim() || f.name } : f);
    onChange(updated);
    setRenamingIdx(null);
  };

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={e => uploadFiles(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {dragging ? 'Drop files here' : 'Click or drag & drop files here'}
            </span>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              {renamingIdx === idx ? (
                <>
                  <input
                    className="flex-1 bg-transparent text-sm outline-none border-b border-primary"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmRename(idx)}
                    autoFocus
                  />
                  <button type="button" onClick={() => confirmRename(idx)} className="text-primary hover:text-primary/80">
                    <Check className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-primary hover:underline truncate">
                    {f.name}
                  </a>
                  <button type="button" onClick={() => startRename(idx)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Phone, Users, Handshake, Calendar, FileText, Trash2, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const TYPE_ICONS = {
  'Note': FileText,
  'Phone Call': Phone,
  'Meeting': Users,
  'Negotiation': Handshake,
  'Follow-up': Calendar,
  'Other': MessageSquare
};

const TYPE_COLORS = {
  'Note': 'bg-slate-100 text-slate-600',
  'Phone Call': 'bg-blue-100 text-blue-700',
  'Meeting': 'bg-purple-100 text-purple-700',
  'Negotiation': 'bg-amber-100 text-amber-700',
  'Follow-up': 'bg-emerald-100 text-emerald-700',
  'Other': 'bg-gray-100 text-gray-600'
};

const TYPES = ['Note', 'Phone Call', 'Meeting', 'Negotiation', 'Follow-up', 'Other'];

export default function ProjectCommentsTab({ projectId, currentUser, onActivityLog }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [type, setType] = useState('Note');
  const [saving, setSaving] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ['project-comments', projectId],
    queryFn: () => base44.entities.ProjectComment.filter({ project_id: projectId }, '-created_date', 100)
  });

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectComment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-comments', projectId] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }) => base44.entities.ProjectComment.update(id, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-comments', projectId] });
      setEditingId(null);
    }
  });

  const startEdit = (c) => { setEditingId(c.id); setEditText(c.text); };
  const cancelEdit = () => setEditingId(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    await base44.entities.ProjectComment.create({
      project_id: projectId,
      text: text.trim(),
      comment_type: type,
      author_name: currentUser?.full_name || 'Unknown',
      author_email: currentUser?.email || ''
    });
    await onActivityLog('comment_added', `${type}: ${text.trim().slice(0, 80)}${text.length > 80 ? '...' : ''}`);
    qc.invalidateQueries({ queryKey: ['project-comments', projectId] });
    setText('');
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="border border-border rounded-lg p-3 space-y-2 bg-card">
        <div className="flex gap-2 items-center">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-36 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">by {currentUser?.full_name || 'You'}</span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a note, call summary, meeting notes, or negotiation update..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || saving}>
            {saving ? 'Saving...' : 'Add Comment'}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">No comments yet</div>
      )}
      <div className="space-y-3">
        {comments.map(c => {
          const Icon = TYPE_ICONS[c.comment_type] || MessageSquare;
          const isEditing = editingId === c.id;
          return (
            <div key={c.id} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${TYPE_COLORS[c.comment_type] || 'bg-slate-100'}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{c.author_name || 'Unknown'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[c.comment_type] || 'bg-slate-100 text-slate-600'}`}>{c.comment_type || 'Note'}</span>
                  <span className="text-[10px] text-muted-foreground">{c.created_date ? format(new Date(c.created_date), 'MMM d, yyyy · HH:mm') : ''}</span>
                </div>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                      className="w-full px-3 py-2 text-sm border border-primary/40 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => updateMutation.mutate({ id: c.id, text: editText })} disabled={!editText.trim() || updateMutation.isPending}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={cancelEdit} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{c.text}</p>
                )}
              </div>
              {!isEditing && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(c)} className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(c.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
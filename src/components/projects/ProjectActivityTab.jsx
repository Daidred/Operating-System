import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Mail, User, Upload, MessageSquare, CheckCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';

const ACTIVITY_CONFIG = {
  supplier_added:   { icon: User, color: 'bg-blue-100 text-blue-700', label: 'Supplier Added' },
  email_sent:       { icon: Mail, color: 'bg-primary/10 text-primary', label: 'Email Sent' },
  email_received:   { icon: Mail, color: 'bg-emerald-100 text-emerald-700', label: 'Email Received' },
  document_uploaded:{ icon: Upload, color: 'bg-purple-100 text-purple-700', label: 'Document Uploaded' },
  comment_added:    { icon: MessageSquare, color: 'bg-amber-100 text-amber-700', label: 'Comment Added' },
  followup_completed:{ icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', label: 'Follow-up Completed' },
  status_changed:   { icon: RefreshCw, color: 'bg-slate-100 text-slate-700', label: 'Status Changed' },
};

export default function ProjectActivityTab({ projectId }) {
  const { data: activities = [] } = useQuery({
    queryKey: ['project-activity', projectId],
    queryFn: () => base44.entities.ProjectActivity.filter({ project_id: projectId }, '-created_date', 200)
  });

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No activity recorded yet</p>
        <p className="text-xs mt-1">Actions like sending emails, adding comments, or uploading documents will appear here</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4">
        {activities.map(a => {
          const cfg = ACTIVITY_CONFIG[a.activity_type] || { icon: RefreshCw, color: 'bg-slate-100 text-slate-600', label: a.activity_type };
          const Icon = cfg.icon;
          return (
            <div key={a.id} className="flex gap-3 relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${cfg.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 pb-4">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                  {a.actor_name && <span className="text-[10px] text-muted-foreground">by {a.actor_name}</span>}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {a.created_date ? format(new Date(a.created_date), 'MMM d, yyyy · HH:mm') : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
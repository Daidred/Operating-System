import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Users, Mail, MessageSquare, Paperclip, Activity, Sparkles, BarChart2 } from 'lucide-react';
import ProjectSuppliersTab from './ProjectSuppliersTab';
import ProjectEmailsTab from './ProjectEmailsTab';
import ProjectCommentsTab from './ProjectCommentsTab';
import ProjectDocumentsTab from './ProjectDocumentsTab';
import ProjectActivityTab from './ProjectActivityTab';
import ProjectAIBrief from '@/components/ai/ProjectAIBrief';
import ProjectPriceComparisonTab from './ProjectPriceComparisonTab';

const TABS = [
  { id: 'ai',        label: 'AI Brief',   icon: Sparkles },
  { id: 'compare',   label: 'Compare',    icon: BarChart2 },
  { id: 'suppliers', label: 'Suppliers',  icon: Users },
  { id: 'emails',    label: 'Emails',     icon: Mail },
  { id: 'comments',  label: 'Comments',   icon: MessageSquare },
  { id: 'documents', label: 'Documents',  icon: Paperclip },
  { id: 'activity',  label: 'Timeline',   icon: Activity },
];

const STATUS_COLOR = {
  Idea: 'bg-slate-100 text-slate-600', 'Supplier Search': 'bg-blue-100 text-blue-700',
  'Supplier Contacted': 'bg-indigo-100 text-indigo-700', 'Quotation Received': 'bg-purple-100 text-purple-700',
  'Sample Requested': 'bg-amber-100 text-amber-700', 'Sample Testing': 'bg-orange-100 text-orange-700',
  Negotiation: 'bg-cyan-100 text-cyan-700', Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700', Paused: 'bg-gray-100 text-gray-600',
};

export default function ProjectDetailPanel({ project, currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('ai');
  const qc = useQueryClient();

  const logActivity = useCallback(async (activity_type, description) => {
    await base44.entities.ProjectActivity.create({
      project_id: project.id,
      activity_type,
      description,
      actor_name: currentUser?.full_name || 'Unknown'
    });
    qc.invalidateQueries({ queryKey: ['project-activity', project.id] });
  }, [project.id, currentUser, qc]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-6xl bg-card shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0 border-b border-border px-6 py-4 bg-accent text-accent-foreground">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[project.status] || 'bg-slate-100 text-slate-600'}`}>
                  {project.status}
                </span>
                {project.priority && <span className="text-[10px] text-accent-foreground/60">{project.priority} priority</span>}
              </div>
              <h2 className="text-lg font-bold mt-1 leading-tight">{project.name}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-accent-foreground/70">
                {project.product_category && <span>{project.product_category}</span>}
                {project.target_origin && <span>· {project.target_origin}</span>}
                {project.target_price && <span>· Target: {project.target_price} {project.target_price_currency || 'USD'}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent-foreground/10 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-4">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'bg-card text-foreground border-primary'
                      : 'text-accent-foreground/70 border-transparent hover:bg-accent-foreground/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'ai' && (
            <ProjectAIBrief project={project} />
          )}
          {activeTab === 'compare' && (
            <ProjectPriceComparisonTab projectId={project.id} project={project} />
          )}
          {activeTab === 'suppliers' && (
            <ProjectSuppliersTab projectId={project.id} onActivityLog={logActivity} />
          )}
          {activeTab === 'emails' && (
            <ProjectEmailsTab projectId={project.id} project={project} currentUser={currentUser} onActivityLog={logActivity} />
          )}
          {activeTab === 'comments' && (
            <ProjectCommentsTab projectId={project.id} currentUser={currentUser} onActivityLog={logActivity} />
          )}
          {activeTab === 'documents' && (
            <ProjectDocumentsTab projectId={project.id} currentUser={currentUser} onActivityLog={logActivity} />
          )}
          {activeTab === 'activity' && (
            <ProjectActivityTab projectId={project.id} />
          )}
        </div>
      </div>
    </div>
  );
}
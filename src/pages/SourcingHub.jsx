import React, { useState } from 'react';
import {
  LayoutDashboard, FolderOpen, Users, Clock, AlertTriangle, FileText,
  FlaskConical, CheckCircle2, XCircle, Archive, BarChart3, ChevronLeft, ChevronRight, Fish, Sparkles, ListTodo
} from 'lucide-react';
import SourcingDashboard from './sourcing/Dashboard';
import SourcingProjects from './sourcing/SourcingProjects';
import SupplierDatabase from './sourcing/SupplierDatabase';
import FollowUpTracker from './sourcing/FollowUpTracker';
import QuotationTracker from './sourcing/QuotationTracker';
import SampleTracker from './sourcing/SampleTracker';
import DocumentsCerts from './sourcing/DocumentsCerts';
import AIAdvisor from './sourcing/AIAdvisor';
import DailyTasks from './sourcing/DailyTasks';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  { id: 'projects', label: 'Sourcing Projects', icon: FolderOpen, group: 'Projects' },
  { id: 'projects-archived', label: 'Archived Projects', icon: Archive, group: 'Projects' },
  { id: 'suppliers', label: 'Supplier Database', icon: Users, group: 'Suppliers' },
  { id: 'suppliers-approved', label: 'Approved Suppliers', icon: CheckCircle2, group: 'Suppliers' },
  { id: 'suppliers-rejected', label: 'Rejected Suppliers', icon: XCircle, group: 'Suppliers' },
  { id: 'followups', label: 'Follow-up Tracker', icon: Clock, group: 'Follow-ups' },
  { id: 'followups-due', label: 'Follow-ups Due', icon: AlertTriangle, group: 'Follow-ups' },
  { id: 'quotations', label: 'Quotations', icon: FileText, group: 'Commercial' },
  { id: 'samples', label: 'Sample Tracker', icon: FlaskConical, group: 'Commercial' },
  { id: 'documents', label: 'Documents & Certs', icon: BarChart3, group: 'Commercial' },
  { id: 'daily-tasks', label: 'Daily Tasks', icon: ListTodo, group: 'Tasks' },
  { id: 'ai-advisor', label: 'AI Advisor', icon: Sparkles, group: 'AI' },
];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onClick(item.id)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left
        ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  projects: 'Sourcing Projects',
  'projects-archived': 'Archived Projects',
  suppliers: 'Supplier Database',
  'suppliers-approved': 'Approved Suppliers',
  'suppliers-rejected': 'Rejected Suppliers',
  followups: 'Follow-up Tracker',
  'followups-due': 'Overdue / Due Follow-ups',
  quotations: 'Quotation Tracker',
  samples: 'Sample Tracker',
  documents: 'Documents & Certifications',
  'daily-tasks': 'Daily Tasks',
  'ai-advisor': 'AI Sourcing Advisor',
};

function renderPage(activeTab, setActiveTab) {
  switch (activeTab) {
    case 'dashboard': return <SourcingDashboard onNavigate={setActiveTab} />;
    case 'projects': return <SourcingProjects />;
    case 'projects-archived': return <SourcingProjects filterArchived={true} />;
    case 'suppliers': return <SupplierDatabase />;
    case 'suppliers-approved': return <SupplierDatabase filterStatus="Approved" />;
    case 'suppliers-rejected': return <SupplierDatabase filterStatus="Rejected" />;
    case 'followups': return <FollowUpTracker />;
    case 'followups-due': return <FollowUpTracker overdueOnly={true} />;
    case 'quotations': return <QuotationTracker />;
    case 'samples': return <SampleTracker />;
    case 'documents': return <DocumentsCerts />;
    case 'daily-tasks': return <DailyTasks onNavigate={setActiveTab} />;
    case 'ai-advisor': return <AIAdvisor />;
    default: return <SourcingDashboard onNavigate={setActiveTab} />;
  }
}

export default function SourcingHub() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const groups = [...new Set(NAV.map(n => n.group))];

  return (
    <div className="flex bg-background" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className={`flex flex-col bg-sidebar shrink-0 transition-all duration-300 ${collapsed ? 'w-14' : 'w-56'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-sidebar-border ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
            <Fish className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-sidebar-foreground leading-tight">Sourcing CRM</p>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Seafood Purchasing</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {groups.map(group => {
            const items = NAV.filter(n => n.group === group);
            return (
              <div key={group}>
                {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">{group}</p>}
                <div className="space-y-0.5">
                  {items.map(item => collapsed ? (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} title={item.label}
                      className={`w-full flex items-center justify-center p-2 rounded-lg transition-all
                        ${activeTab === item.id ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
                      <item.icon className="w-4 h-4" />
                    </button>
                  ) : (
                    <NavItem key={item.id} item={item} active={activeTab === item.id} onClick={setActiveTab} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="px-2 py-3 border-t border-sidebar-border">
          <button onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Collapse</span></>}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 flex items-center px-6 border-b border-border bg-card shrink-0">
          <h1 className="text-sm font-semibold text-foreground">{PAGE_TITLES[activeTab]}</h1>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Private — Your data only
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderPage(activeTab, setActiveTab)}
        </div>
      </div>
    </div>
  );
}
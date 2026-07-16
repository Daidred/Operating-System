import React, { useState } from 'react';
import { LayoutDashboard, AlertTriangle, ClipboardList, FileBarChart, ArrowLeft } from 'lucide-react';
import Dashboard from './Dashboard';
import Discrepancies from './Discrepancies';
import WorkloadTracker from './WorkloadTracker';
import Reports from './Reports';
import DiscrepancyDetail from './DiscrepancyDetail';
import { cn } from '@/lib/utils';

const MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'KPIs, trends and operational overview',
    icon: LayoutDashboard,
    color: 'bg-[#f0f7f8] border-[#b8d5db] hover:bg-[#deeef1]',
    iconColor: 'text-[#1a3a4a] bg-[#c8e0e6]',
    component: Dashboard,
  },
  {
    id: 'discrepancies',
    label: 'Discrepancies',
    description: 'Log and track operational issues',
    icon: AlertTriangle,
    color: 'bg-[#fef4f3] border-[#f2b8b2] hover:bg-[#fde8e6]',
    iconColor: 'text-[#c9463a] bg-[#f9d0cc]',
    component: Discrepancies,
  },
  {
    id: 'workload',
    label: 'Workload Tracker',
    description: 'Monitor purchasing team workload',
    icon: ClipboardList,
    color: 'bg-[#f2f6f8] border-[#9ec5d0] hover:bg-[#e2eef2]',
    iconColor: 'text-[#1a3a4a] bg-[#b8d8e2]',
    component: WorkloadTracker,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Generate and export management reports',
    icon: FileBarChart,
    color: 'bg-[#fef6f5] border-[#eaa89f] hover:bg-[#fdecea]',
    iconColor: 'text-[#e8796a] bg-[#fad9d5]',
    component: Reports,
  },
];

function HubLanding({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent mb-5 shadow-lg">
          <span className="text-primary font-extrabold text-4xl leading-none">t</span>
        </div>
        <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: '#1a3a4a' }}>Operations Center</h2>
        <p className="mt-2 text-base" style={{ color: '#5a7a88' }}>Thammachart Seafood Retail — Select a module to get started</p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {MODULES.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "group flex items-center gap-4 p-6 rounded-2xl border-2 text-left transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5",
              m.color
            )}
          >
            <div className={cn("p-3.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", m.iconColor)}>
              <m.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-base" style={{ color: '#1a3a4a' }}>{m.label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#5a7a88' }}>{m.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer brand */}
      <p className="mt-14 text-xs" style={{ color: '#9ab5be' }}>Thammachart Seafood Retail · Purchasing Operations</p>
    </div>
  );
}

export default function OperationsHub() {
  const [active, setActive] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const module = MODULES.find(m => m.id === active);
  const ActiveComponent = module?.component;

  const handleOpenDetail = (id) => setDetailId(id);
  const handleCloseDetail = () => setDetailId(null);

  return (
    <div className="space-y-0">
      {/* Sub-tab bar when a module is active */}
      {active && (
        <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm -mx-6 lg:-mx-8 px-6 lg:px-8 mb-6">
          <div className="flex items-center gap-2 h-12">
            {detailId ? (
              <button
                onClick={handleCloseDetail}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Discrepancies</span>
              </button>
            ) : (
              <button
                onClick={() => setActive(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Operations</span>
              </button>
            )}
            <span className="text-muted-foreground/40">/</span>
            {detailId ? (
              <span className="text-sm font-medium text-foreground ml-1">Detail</span>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                {MODULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActive(m.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      active === m.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {detailId ? (
        <DiscrepancyDetail id={detailId} onBack={handleCloseDetail} />
      ) : active && ActiveComponent ? (
        <ActiveComponent onOpenDetail={active === 'discrepancies' ? handleOpenDetail : undefined} />
      ) : (
        <HubLanding onSelect={setActive} />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Ship, Layers, Fish } from 'lucide-react';
import OperationsHub from './OperationsHub';
import ShipmentTracker from './ShipmentTracker';
import SourcingHub from './SourcingHub';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'operations', label: 'Operations', icon: Layers, component: OperationsHub },
  { id: 'shipments', label: 'Shipment Tracker', icon: Ship, component: ShipmentTracker },
  { id: 'sourcing', label: 'Sourcing CRM', icon: Fish, component: SourcingHub },
];

export default function MainApp() {
  const [activeTab, setActiveTab] = useState('operations');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || OperationsHub;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Tab Bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="flex items-center px-6 gap-1 h-14 max-w-[1400px] mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-6">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-primary font-extrabold text-lg leading-none">t</span>
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-sm tracking-tight text-foreground">Thammachart</span>
              <span className="text-[10px] text-muted-foreground tracking-wide">Seafood Retail</span>
            </div>
          </div>

          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Page Content */}
      <div className={cn("flex-1 w-full", activeTab === 'sourcing' ? '' : 'p-6 lg:p-8 max-w-[1400px] mx-auto')}>
        <ActiveComponent />
      </div>
    </div>
  );
}
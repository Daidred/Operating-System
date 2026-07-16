import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles = {
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-100 text-amber-700 border-amber-200',
  Validated: 'bg-purple-100 text-purple-700 border-purple-200',
  Resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
};

const impactStyles = {
  Low: 'bg-slate-100 text-slate-600 border-slate-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Critical: 'bg-red-100 text-red-700 border-red-200',
};

export default function StatusBadge({ value, type = 'status' }) {
  const styles = type === 'status' ? statusStyles : impactStyles;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", styles[value] || 'bg-muted text-muted-foreground')}>
      {value}
    </Badge>
  );
}
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, DollarSign, TrendingUp, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import StatCard from '@/components/dashboard/StatCard';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { format, subDays } from 'date-fns';
import { Link } from 'react-router-dom';

const BU_COLORS = {
  'Food Service': 'hsl(199, 89%, 32%)',
  'Retail': 'hsl(173, 58%, 39%)',
  'CTK': 'hsl(43, 74%, 56%)',
  'F&B': 'hsl(12, 76%, 61%)',
};

const PIE_COLORS = ['hsl(199, 89%, 42%)', 'hsl(173, 58%, 45%)', 'hsl(43, 74%, 56%)', 'hsl(12, 76%, 61%)'];

export default function Dashboard() {
  const { data: discrepancies = [], isLoading } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => base44.entities.Discrepancy.list('-created_date', 200),
  });

  const { data: workloads = [] } = useQuery({
    queryKey: ['workloads'],
    queryFn: () => base44.entities.WorkloadEntry.list('-created_date', 500),
  });

  // KPI Calculations
  const totalDiscrepancies = discrepancies.length;
  const openCases = discrepancies.filter(d => d.status === 'Open' || d.status === 'Under Review').length;
  const totalHoursLost = discrepancies.reduce((sum, d) => sum + (d.purchasing_hours_lost || 0), 0);
  const totalAdditionalCost = discrepancies.reduce((sum, d) => sum + (d.additional_cost || 0), 0);
  const totalOvertimeHours = workloads.filter(w => w.overtime).reduce((sum, w) => sum + (w.hours_spent || 0), 0);
  const criticalCount = discrepancies.filter(d => d.impact_level === 'Critical').length;

  // By Business Unit
  const byBU = ['Food Service', 'Retail', 'CTK', 'F&B', 'QA/QC', 'DC 1', 'DC 2', 'Marketing', 'Purchasing'].map(bu => ({
    name: bu,
    count: discrepancies.filter(d => d.business_unit === bu).length,
    hours: discrepancies.filter(d => d.business_unit === bu).reduce((s, d) => s + (d.purchasing_hours_lost || 0), 0),
    cost: discrepancies.filter(d => d.business_unit === bu).reduce((s, d) => s + (d.additional_cost || 0), 0),
  }));

  // By Issue Type
  const issueTypes = {};
  discrepancies.forEach(d => {
    issueTypes[d.issue_type] = (issueTypes[d.issue_type] || 0) + 1;
  });
  const topIssues = Object.entries(issueTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 18) + '...' : name, value, fullName: name }));

  // Recent discrepancies
  const recentDiscrepancies = discrepancies.slice(0, 5);

  // Trend (last 30 days)
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const dayLabel = format(subDays(new Date(), i), 'MMM d');
    const count = discrepancies.filter(d => d.date === day).length;
    last30.push({ date: dayLabel, count });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        subtitle="Operational Discrepancy & Workload Overview"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Discrepancies" value={totalDiscrepancies} icon={AlertTriangle} />
        <StatCard title="Open Cases" value={openCases} icon={Zap} subtitle="Require attention" />
        <StatCard title="Hours Lost" value={`${totalHoursLost.toFixed(1)}h`} icon={Clock} />
        <StatCard title="Additional Cost" value={`฿${totalAdditionalCost.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Overtime Hours" value={`${totalOvertimeHours.toFixed(1)}h`} icon={TrendingUp} />
        <StatCard title="Critical Issues" value={criticalCount} icon={AlertTriangle} className={criticalCount > 0 ? "border-red-200 bg-red-50/50" : ""} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Business Unit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">By Business Unit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byBU} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Discrepancies" fill="hsl(199, 89%, 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hours" name="Hours Lost" fill="hsl(173, 58%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issue Types Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Issue Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={topIssues}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {topIssues.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [value, props.payload.fullName]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {topIssues.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-day trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">30-Day Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', fontSize: '12px' }} />
                <Line type="monotone" dataKey="count" stroke="hsl(199, 89%, 42%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Discrepancies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentDiscrepancies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No discrepancies yet</p>
            ) : (
              recentDiscrepancies.map(d => (
                <Link key={d.id} to={`/discrepancies/${d.id}`} className="block p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{d.title}</p>
                    <StatusBadge value={d.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground">{d.business_unit}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <StatusBadge value={d.impact_level} type="impact" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
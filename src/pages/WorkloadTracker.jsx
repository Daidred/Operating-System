import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Users, DollarSign, AlertTriangle, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const IMPACT_COLORS = {
  Low: 'bg-green-100 text-green-700 border-green-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Critical: 'bg-red-100 text-red-700 border-red-200',
};

const URGENCY_COLORS = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Normal: 'bg-green-100 text-green-700 border-green-200',
};

export default function WorkloadTracker() {
  const [search, setSearch] = useState('');
  const [filterBU, setFilterBU] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [expandedIds, setExpandedIds] = useState({});


  const queryClient = useQueryClient();

  const { data: discrepancies = [], isLoading: loadingDisc } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => base44.entities.Discrepancy.list('-created_date', 500),
  });

  const { data: workloads = [] } = useQuery({
    queryKey: ['all-workloads'],
    queryFn: () => base44.entities.WorkloadEntry.list('-created_date', 500),
  });

  // Real-time subscriptions
  useEffect(() => {
    const u1 = base44.entities.Discrepancy.subscribe(() => queryClient.invalidateQueries({ queryKey: ['discrepancies'] }));
    const u2 = base44.entities.WorkloadEntry.subscribe(() => queryClient.invalidateQueries({ queryKey: ['all-workloads'] }));
    return () => { u1(); u2(); };
  }, [queryClient]);

  // Group workload entries by discrepancy_id
  const workloadsByDisc = {};
  workloads.forEach(w => {
    if (!workloadsByDisc[w.discrepancy_id]) workloadsByDisc[w.discrepancy_id] = [];
    workloadsByDisc[w.discrepancy_id].push(w);
  });

  const businessUnits = [...new Set(discrepancies.map(d => d.business_unit).filter(Boolean))].sort();
  const statuses = [...new Set(discrepancies.map(d => d.status).filter(Boolean))].sort();
  const employees = [...new Set(discrepancies.map(d => d.requester_name || d.requester).filter(Boolean))].sort();

  const filtered = discrepancies.filter(d => {
    const matchSearch = !search ||
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.responsible_person?.toLowerCase().includes(search.toLowerCase()) ||
      d.business_unit?.toLowerCase().includes(search.toLowerCase());
    const matchBU = filterBU === 'all' || d.business_unit === filterBU;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const employeeVal = d.requester_name || d.requester;
    const matchEmployee = filterEmployee === 'all' || employeeVal === filterEmployee;
    return matchSearch && matchBU && matchStatus && matchEmployee;
  });

  // KPIs from filtered discrepancies
  const totalHours = filtered.reduce((s, d) => s + (d.purchasing_hours_lost || 0), 0);
  const totalCost = filtered.reduce((s, d) => s + (d.additional_cost || 0), 0);
  // Overtime hours from workload entries linked to filtered discrepancies
  const filteredDiscIds = new Set(filtered.map(d => d.id));
  const overtimeHours = workloads
    .filter(w => w.overtime && filteredDiscIds.has(w.discrepancy_id))
    .reduce((s, w) => s + (w.hours_spent || 0), 0);
  const staffInvolved = new Set(
    workloads.filter(w => filteredDiscIds.has(w.discrepancy_id)).map(w => w.employee_name).filter(Boolean)
  ).size;

  const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  // Chart data
  const byBU = {};
  filtered.forEach(d => {
    if (!byBU[d.business_unit]) byBU[d.business_unit] = { hours: 0, cost: 0 };
    byBU[d.business_unit].hours += (d.purchasing_hours_lost || 0);
    byBU[d.business_unit].cost += (d.additional_cost || 0);
  });
  const buChartData = Object.entries(byBU).map(([name, v]) => ({ name, hours: v.hours, cost: v.cost })).sort((a, b) => b.hours - a.hours);

  const byEmployeeChart = {};
  filtered.forEach(d => {
    const name = d.requester_name || d.requester;
    if (!name) return;
    if (!byEmployeeChart[name]) byEmployeeChart[name] = { hours: 0, cost: 0 };
    byEmployeeChart[name].hours += (d.purchasing_hours_lost || 0);
    byEmployeeChart[name].cost += (d.additional_cost || 0);
  });
  const employeeChartData = Object.entries(byEmployeeChart).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.hours - a.hours);

  if (loadingDisc) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Workload Tracker" subtitle="Purchasing team workload linked to reported issues">
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Hours Lost" value={`${totalHours.toFixed(1)}h`} icon={Clock} />
        <StatCard title="Overtime Hours" value={`${overtimeHours.toFixed(1)}h`} icon={AlertTriangle} />
        <StatCard title="Est. Total Cost" value={`฿${totalCost.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Staff Involved" value={staffInvolved} icon={Users} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterBU} onValueChange={setFilterBU}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Business Units" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business Units</SelectItem>
              {businessUnits.map(bu => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEmployee} onValueChange={setFilterEmployee}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Employees" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hours Lost by Business Unit</CardTitle>
          </CardHeader>
          <CardContent>
            {buChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={buChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v) => [`${v}h`, 'Hours']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="hours" fill="hsl(199,89%,42%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hours by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No workload entries yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={employeeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="hours" name="Hours Lost" fill="hsl(199,89%,42%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Issues & Workload ({filtered.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead>Issue Title</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hours Lost</TableHead>
                <TableHead>Est. Cost (฿)</TableHead>
                <TableHead>Workload Entries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                    No issues found
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(d => {
                const entries = workloadsByDisc[d.id] || [];
                const isExpanded = expandedIds[d.id];
                return (
                  <React.Fragment key={d.id}>
                    <TableRow className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        {entries.length > 0 && (
                          <button onClick={() => toggleExpand(d.id)} className="p-1 rounded hover:bg-muted">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link to={`/discrepancies/${d.id}`} className="font-medium text-sm text-primary hover:underline line-clamp-1">
                          {d.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">{d.issue_type}</p>
                      </TableCell>
                      <TableCell className="text-sm">{d.business_unit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.requester_name || d.requester || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${IMPACT_COLORS[d.impact_level] || ''}`}>
                          {d.impact_level}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-sm font-medium">{(d.purchasing_hours_lost || 0).toFixed(1)}h</TableCell>
                      <TableCell className="text-sm">฿{(d.additional_cost || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</TableCell>
                    </TableRow>

                    {/* Expanded workload entries */}
                    {isExpanded && entries.map(w => (
                      <TableRow key={w.id} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={2} className="text-xs text-muted-foreground pl-6">
                          ↳ {w.activity_type}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{w.employee_name}</TableCell>
                        <TableCell></TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${URGENCY_COLORS[w.urgency_level] || URGENCY_COLORS.Normal}`}>
                            {w.urgency_level}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{w.hours_spent}h {w.overtime ? <span className="text-orange-600 ml-1">OT</span> : ''}</TableCell>
                        <TableCell className="text-xs">฿{(w.estimated_cost || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground" colSpan={2}>{w.comments || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>


    </div>
  );
}
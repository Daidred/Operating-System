import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Sparkles, Mail, Download, Send, TrendingUp, AlertTriangle, Clock, DollarSign, CheckCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/shared/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';

const ALL_BUS = ["Food Service", "Retail", "CTK", "F&B", "QA/QC", "DC 1", "DC 2", "Marketing", "Purchasing"];
const IMPACT_COLORS = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' };
const STATUS_COLORS = { Open: '#3b82f6', 'Under Review': '#8b5cf6', Validated: '#06b6d4', Resolved: '#16a34a', Rejected: '#6b7280' };
const CHART_COLORS = ['#0e6ea8', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#065f46'];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterBU, setFilterBU] = useState('all');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const { data: appUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: discrepancies = [] } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => base44.entities.Discrepancy.list('-created_date', 500),
  });

  const { data: workloads = [] } = useQuery({
    queryKey: ['all-workloads'],
    queryFn: () => base44.entities.WorkloadEntry.list('-created_date', 1000),
  });

  const setRange = (type) => {
    const now = new Date();
    if (type === 'week') { setDateFrom(format(subDays(now, 7), 'yyyy-MM-dd')); setDateTo(format(now, 'yyyy-MM-dd')); }
    if (type === 'month') { setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd')); setDateTo(format(endOfMonth(now), 'yyyy-MM-dd')); }
    if (type === 'quarter') { setDateFrom(format(startOfQuarter(now), 'yyyy-MM-dd')); setDateTo(format(endOfQuarter(now), 'yyyy-MM-dd')); }
    if (type === 'last-month') { const lm = subMonths(now, 1); setDateFrom(format(startOfMonth(lm), 'yyyy-MM-dd')); setDateTo(format(endOfMonth(lm), 'yyyy-MM-dd')); }
  };

  const filtered = discrepancies.filter(d => {
    const matchDate = (!dateFrom || d.date >= dateFrom) && (!dateTo || d.date <= dateTo);
    const matchBU = filterBU === 'all' || d.business_unit === filterBU;
    return matchDate && matchBU;
  });

  const filteredIds = new Set(filtered.map(d => d.id));
  const filteredWorkloads = workloads.filter(w => filteredIds.has(w.discrepancy_id));

  const totalDisc = filtered.length;
  const byBU = {};
  const byIssueType = {};
  const byImpact = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const byStatus = { Open: 0, 'Under Review': 0, Validated: 0, Resolved: 0, Rejected: 0 };
  let totalHoursLost = 0, totalAdditionalCost = 0;

  filtered.forEach(d => {
    byBU[d.business_unit] = (byBU[d.business_unit] || 0) + 1;
    byIssueType[d.issue_type] = (byIssueType[d.issue_type] || 0) + 1;
    if (d.impact_level) byImpact[d.impact_level] = (byImpact[d.impact_level] || 0) + 1;
    if (d.status) byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    totalHoursLost += (d.purchasing_hours_lost || 0);
    totalAdditionalCost += (d.additional_cost || 0);
  });

  const totalWorkloadHours = filteredWorkloads.reduce((s, w) => s + (w.hours_spent || 0), 0);
  const overtimeHours = filteredWorkloads.filter(w => w.overtime).reduce((s, w) => s + (w.hours_spent || 0), 0);
  const workloadCost = filteredWorkloads.reduce((s, w) => s + (w.estimated_cost || 0), 0);

  const resolvedCases = filtered.filter(d => d.status === 'Resolved');
  const openCases = filtered.filter(d => d.status === 'Open' || d.status === 'Under Review').length;
  const avgResolutionDays = resolvedCases.length > 0
    ? resolvedCases.reduce((sum, d) => {
        if (d.date && d.resolution_date) return sum + Math.ceil((new Date(d.resolution_date) - new Date(d.date)) / 86400000);
        return sum;
      }, 0) / resolvedCases.length
    : 0;

  const buChartData = Object.entries(byBU).sort(([,a],[,b]) => b-a).map(([name, value]) => ({ name, value }));
  const issueChartData = Object.entries(byIssueType).sort(([,a],[,b]) => b-a).slice(0, 6).map(([name, value]) => ({
    name: name.length > 20 ? name.substring(0, 18) + '...' : name, fullName: name, value
  }));
  const statusData = Object.entries(byStatus).filter(([,c]) => c > 0).map(([name, value]) => ({ name, value }));

  // By employee workload
  const byEmployee = {};
  filteredWorkloads.forEach(w => {
    if (!byEmployee[w.employee_name]) byEmployee[w.employee_name] = { hours: 0, cost: 0, entries: 0 };
    byEmployee[w.employee_name].hours += (w.hours_spent || 0);
    byEmployee[w.employee_name].cost += (w.estimated_cost || 0);
    byEmployee[w.employee_name].entries += 1;
  });
  const employeeData = Object.entries(byEmployee).sort(([,a],[,b]) => b.hours - a.hours).slice(0, 6).map(([name, data]) => ({ name, ...data }));

  const generateAISummary = async () => {
    setGeneratingAI(true);
    const topBU = Object.entries(byBU).sort(([,a],[,b]) => b-a)[0];
    const topIssue = Object.entries(byIssueType).sort(([,a],[,b]) => b-a)[0];
    const prompt = `You are writing a management report for a seafood import company. Summarize the operational discrepancies in the purchasing department.

Write in clear, professional English. Be direct and factual.

REPORT PERIOD: ${dateFrom} to ${dateTo}
${filterBU !== 'all' ? `SCOPE: ${filterBU} business unit only` : 'SCOPE: All business units'}

DATA:
- Total issues: ${totalDisc}, Open: ${openCases}, Resolved: ${resolvedCases.length}
- Avg resolution: ${avgResolutionDays.toFixed(1)} days
- Purchasing hours lost: ${totalHoursLost}h, Overtime: ${overtimeHours}h
- Extra cost: ฿${totalAdditionalCost.toLocaleString()}, Workload cost: ฿${workloadCost.toLocaleString()}
- Most affected BU: ${topBU ? `${topBU[0]} (${topBU[1]} issues)` : 'N/A'}
- Most common issue: ${topIssue ? `${topIssue[0]} (${topIssue[1]} times)` : 'N/A'}
- Severity: ${JSON.stringify(byImpact)}
- By department: ${JSON.stringify(byBU)}
- By issue type: ${JSON.stringify(byIssueType)}

Write 5 sections:

**Situation Overview** — 3 sentences. What is the overall picture, how serious is it.

**Key Findings** — 3-4 bullet points with numbers. Most important facts.

**Departmental Impact** — 2 sentences on which departments were most affected and why it matters.

**Workload & Cost Impact** — 2 sentences on extra hours, overtime, and financial impact.

**Recommended Actions** — 3 short, specific, actionable steps.

Keep it under 350 words. No jargon.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiSummary(result);
    setGeneratingAI(false);
  };

  const buildEmailBody = () => {
    const buRows = Object.entries(byBU).sort(([,a],[,b])=>b-a).map(([bu, count]) => {
      const pct = totalDisc ? Math.round((count / totalDisc) * 100) : 0;
      return `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#374151;width:130px;">${bu}</td>
        <td style="padding:6px 12px;"><div style="background:#e5e7eb;border-radius:4px;height:8px;"><div style="background:#0e6ea8;border-radius:4px;height:8px;width:${pct}%;"></div></div></td>
        <td style="padding:6px 12px;font-size:13px;font-weight:700;color:#0f3c64;text-align:right;width:40px;">${count}</td>
      </tr>`;
    }).join('');

    const issueRows = Object.entries(byIssueType).sort(([,a],[,b])=>b-a).map(([type, count]) =>
      `<tr><td style="padding:5px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${type}</td>
       <td style="padding:5px 12px;font-size:12px;font-weight:700;color:#0f3c64;text-align:right;border-bottom:1px solid #f3f4f6;">${count}</td></tr>`
    ).join('');

    const impactCells = Object.entries(byImpact).map(([level, count]) =>
      `<td style="text-align:center;padding:4px;"><div style="background:${IMPACT_COLORS[level]};border-radius:6px;padding:10px 8px;">
        <div style="font-size:22px;font-weight:800;color:#fff;">${count}</div>
        <div style="font-size:10px;color:#ffffffcc;margin-top:2px;">${level}</div></div></td>`
    ).join('');

    const statusCells = Object.entries(byStatus).filter(([,c])=>c>0).map(([status, count]) =>
      `<tr><td style="padding:5px 12px;font-size:12px;color:#6b7280;">${status}</td>
       <td style="padding:5px 12px;font-size:12px;font-weight:700;color:#0f3c64;text-align:right;">${count}</td></tr>`
    ).join('');

    const kpis = [
      ['Total Issues', totalDisc], ['Open Cases', openCases],
      ['Resolved', resolvedCases.length], ['Avg. Resolution', `${avgResolutionDays.toFixed(1)}d`],
      ['Hours Lost', `${totalHoursLost.toFixed(1)}h`], ['Overtime', `${overtimeHours.toFixed(1)}h`],
      ['Extra Cost', `฿${totalAdditionalCost.toLocaleString()}`], ['Workload Cost', `฿${workloadCost.toLocaleString()}`],
    ];

    return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,sans-serif;">
<table width="100%" style="background:#eef2f7;padding:32px 0;"><tr><td align="center">
<table width="640" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">

  <tr><td style="background:linear-gradient(135deg,#0f3c64 0%,#1e6ea8 100%);padding:28px 32px;">
    <table width="100%"><tr>
      <td><div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">OpsTrace</div>
          <div style="font-size:13px;color:#a8d4f0;margin-top:3px;">Operational Discrepancy &amp; Workload Report</div></td>
      <td align="right" style="vertical-align:top;">
        <div style="font-size:11px;color:#7ab8dc;text-align:right;">${format(new Date(), 'dd MMM yyyy')}</div>
        <div style="font-size:11px;color:#7ab8dc;margin-top:2px;">Period: ${dateFrom} — ${dateTo}</div>
        <div style="font-size:11px;color:#7ab8dc;margin-top:2px;">Scope: ${filterBU !== 'all' ? filterBU : 'All Business Units'}</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 32px 0;background:#f8fafd;">
    <table width="100%" style="padding:16px 0;"><tr>
      ${kpis.map(([l,v]) => `<td width="12.5%" style="text-align:center;padding:10px 4px;">
        <div style="font-size:18px;font-weight:800;color:#0f3c64;">${v}</div>
        <div style="font-size:9px;color:#9ca3af;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px;">${l}</div>
      </td>`).join('')}
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <div style="font-size:10px;font-weight:700;color:#0e6ea8;letter-spacing:1px;text-transform:uppercase;border-left:3px solid #0e6ea8;padding-left:8px;margin-bottom:12px;">By Business Unit</div>
    <table width="100%">${buRows}</table>
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <table width="100%"><tr>
      <td width="48%" valign="top">
        <div style="font-size:10px;font-weight:700;color:#0e6ea8;letter-spacing:1px;text-transform:uppercase;border-left:3px solid #0e6ea8;padding-left:8px;margin-bottom:10px;">By Issue Type</div>
        <table width="100%">${issueRows}</table>
      </td>
      <td width="4%"></td>
      <td width="48%" valign="top">
        <div style="font-size:10px;font-weight:700;color:#0e6ea8;letter-spacing:1px;text-transform:uppercase;border-left:3px solid #0e6ea8;padding-left:8px;margin-bottom:10px;">By Status</div>
        <table width="100%">${statusCells}</table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 32px 0;">
    <div style="font-size:10px;font-weight:700;color:#0e6ea8;letter-spacing:1px;text-transform:uppercase;border-left:3px solid #0e6ea8;padding-left:8px;margin-bottom:12px;">Severity Distribution</div>
    <table width="100%"><tr>${impactCells}</tr></table>
  </td></tr>

  ${aiSummary ? `<tr><td style="padding:24px 32px 0;">
    <div style="font-size:10px;font-weight:700;color:#0e6ea8;letter-spacing:1px;text-transform:uppercase;border-left:3px solid #0e6ea8;padding-left:8px;margin-bottom:12px;">AI Executive Summary</div>
    <div style="background:#f0f6fc;border-radius:8px;padding:16px 18px;font-size:12px;color:#374151;line-height:1.8;white-space:pre-wrap;">${aiSummary}</div>
  </td></tr>` : ''}

  <tr><td style="background:#f8fafd;padding:16px 32px;border-top:1px solid #e5e7eb;margin-top:24px;">
    <div style="font-size:10px;color:#9ca3af;text-align:center;">Generated by OpsTrace · ${format(new Date(), 'dd MMM yyyy, HH:mm')}</div>
  </td></tr>

</table></td></tr></table></body></html>`;
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    await base44.integrations.Core.SendEmail({
      to: emailTo,
      subject: `OpsTrace Report — ${dateFrom} to ${dateTo}${filterBU !== 'all' ? ` — ${filterBU}` : ''}`,
      body: buildEmailBody(),
    });
    setSendingEmail(false);
    setEmailOpen(false);
    setEmailTo('');
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const M = 18, PW = 210, CW = PW - M * 2;
    let y = M;

    const newPage = () => { doc.addPage(); y = M; drawPageHeader(); };
    const checkY = (needed = 10) => { if (y + needed > 278) newPage(); };

    const drawPageHeader = () => {
      doc.setFillColor(15, 60, 100);
      doc.rect(0, 0, PW, 18, 'F');
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 200, 230);
      doc.text('OpsTrace — Operational Report', M, 12);
      doc.text(`Period: ${dateFrom} — ${dateTo}`, PW - M, 12, { align: 'right' });
      y = 26;
    };

    const section = (title) => {
      checkY(14);
      y += 3;
      doc.setFillColor(14, 110, 168);
      doc.rect(M, y - 4, 3, 9, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(14, 110, 168);
      doc.text(title, M + 6, y + 1);
      doc.setDrawColor(220, 230, 245);
      doc.line(M + 6, y + 3, PW - M, y + 3);
      y += 8;
    };

    const txt = (text, size, bold, color = [30, 45, 65]) => {
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, CW);
      lines.forEach(l => { checkY(size * 0.5); doc.text(l, M, y); y += size * 0.42; });
    };

    // ── PAGE 1 ──────────────────────────────────────────────
    // Header banner
    doc.setFillColor(15, 60, 100);
    doc.rect(0, 0, PW, 34, 'F');
    doc.setFillColor(20, 80, 130);
    doc.rect(0, 22, PW, 12, 'F');
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('OpsTrace', M, 15);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 210, 240);
    doc.text('Operational Discrepancy & Workload Report', M, 28);
    doc.setTextColor(130, 180, 220);
    doc.setFontSize(8);
    doc.text(`Period: ${dateFrom} — ${dateTo}  |  Scope: ${filterBU !== 'all' ? filterBU : 'All Business Units'}  |  Generated: ${format(new Date(), 'dd MMM yyyy')}`, PW - M, 28, { align: 'right' });
    y = 44;

    // KPI Grid (8 cards, 4 per row)
    const kpis = [
      ['Total Issues', String(totalDisc), [15, 60, 100]],
      ['Open Cases', String(openCases), [220, 80, 30]],
      ['Resolved', String(resolvedCases.length), [22, 140, 80]],
      ['Avg Resolution', `${avgResolutionDays.toFixed(1)} days`, [80, 80, 130]],
      ['Hours Lost', `${totalHoursLost.toFixed(1)}h`, [15, 60, 100]],
      ['Overtime Hours', `${overtimeHours.toFixed(1)}h`, [180, 80, 20]],
      ['Additional Cost', `฿${totalAdditionalCost.toLocaleString()}`, [150, 30, 30]],
      ['Workload Cost', `฿${workloadCost.toLocaleString()}`, [80, 80, 130]],
    ];
    const cw = CW / 4;
    kpis.forEach(([label, val, color], i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const cx = M + col * cw, cy = y + row * 20;
      doc.setFillColor(248, 250, 253); doc.roundedRect(cx + 1, cy - 5, cw - 3, 17, 2, 2, 'F');
      doc.setFillColor(...color); doc.roundedRect(cx + 1, cy - 5, 3, 17, 1, 1, 'F');
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...color);
      doc.text(val, cx + cw / 2 + 1, cy + 3, { align: 'center' });
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 130, 150);
      doc.text(label, cx + cw / 2 + 1, cy + 9, { align: 'center' });
    });
    y += 46;

    // By Business Unit
    section('BY BUSINESS UNIT');
    const sortedBU = Object.entries(byBU).sort(([,a],[,b]) => b - a);
    sortedBU.forEach(([bu, count]) => {
      checkY(8);
      const pct = totalDisc ? (count / totalDisc) : 0;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 65, 85);
      doc.text(bu, M, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 60, 100);
      doc.text(String(count), M + CW, y, { align: 'right' });
      doc.setFillColor(225, 235, 248); doc.roundedRect(M + 42, y - 4, CW - 52, 5, 2, 2, 'F');
      doc.setFillColor(14, 110, 168); doc.roundedRect(M + 42, y - 4, (CW - 52) * pct, 5, 2, 2, 'F');
      y += 9;
    });
    y += 3;

    // By Issue Type (2 columns)
    section('BY ISSUE TYPE');
    const sortedIssues = Object.entries(byIssueType).sort(([,a],[,b]) => b - a);
    const half = Math.ceil(sortedIssues.length / 2);
    const colW2 = CW / 2 - 3;
    for (let i = 0; i < half; i++) {
      checkY(7);
      [[0, M], [half, M + CW / 2]].forEach(([offset, cx]) => {
        const entry = sortedIssues[i + offset];
        if (!entry) return;
        const [type, count] = entry;
        doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(70, 80, 100);
        doc.text(`• ${type}`, cx, y, { maxWidth: colW2 - 15 });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 60, 100);
        doc.text(String(count), cx + colW2, y, { align: 'right' });
      });
      y += 7;
    }
    y += 3;

    // Severity
    section('SEVERITY DISTRIBUTION');
    const impactRgb = { Critical: [200, 40, 40], High: [210, 100, 20], Medium: [190, 140, 0], Low: [30, 150, 80] };
    const iw = CW / 4 - 2;
    Object.entries(byImpact).forEach(([level, count], i) => {
      const [r,g,b] = impactRgb[level];
      const cx = M + i * (CW / 4);
      doc.setFillColor(r, g, b); doc.roundedRect(cx, y - 4, iw, 18, 2, 2, 'F');
      doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(String(count), cx + iw / 2, y + 5, { align: 'center' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(level, cx + iw / 2, y + 11, { align: 'center' });
    });
    y += 26;

    // Status breakdown
    section('STATUS BREAKDOWN');
    const statusEntries = Object.entries(byStatus).filter(([,c]) => c > 0);
    const sw = CW / statusEntries.length - 2;
    statusEntries.forEach(([status, count], i) => {
      const cx = M + i * (CW / statusEntries.length);
      doc.setFillColor(240, 245, 252); doc.roundedRect(cx, y - 4, sw, 16, 2, 2, 'F');
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 60, 100);
      doc.text(String(count), cx + sw / 2, y + 4, { align: 'center' });
      doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 115, 140);
      doc.text(status, cx + sw / 2, y + 10, { align: 'center' });
    });
    y += 24;

    // ── PAGE 2 ──────────────────────────────────────────────
    doc.addPage();
    doc.setFillColor(15, 60, 100);
    doc.rect(0, 0, PW, 18, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 200, 230);
    doc.text('OpsTrace — Operational Report (continued)', M, 12);
    doc.text(`Period: ${dateFrom} — ${dateTo}`, PW - M, 12, { align: 'right' });
    y = 26;

    // Workload by employee
    if (Object.keys(byEmployee).length > 0) {
      section('WORKLOAD BY EMPLOYEE');
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 115, 140);
      doc.text('EMPLOYEE', M, y);
      doc.text('HOURS', M + 80, y, { align: 'right' });
      doc.text('COST (฿)', M + 120, y, { align: 'right' });
      doc.text('TASKS', M + CW, y, { align: 'right' });
      y += 5;
      doc.setDrawColor(220, 230, 245); doc.line(M, y, M + CW, y); y += 4;
      Object.entries(byEmployee).sort(([,a],[,b]) => b.hours - a.hours).forEach(([name, data]) => {
        checkY(7);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 65, 85);
        doc.text(name, M, y);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 60, 100);
        doc.text(`${data.hours.toFixed(1)}h`, M + 80, y, { align: 'right' });
        doc.text(`฿${data.cost.toLocaleString()}`, M + 120, y, { align: 'right' });
        doc.text(String(data.entries), M + CW, y, { align: 'right' });
        y += 8;
      });
      y += 4;
    }

    // Top discrepancies list
    section('TOP DISCREPANCIES BY COST');
    const topDisc = [...filtered].sort((a, b) => (b.additional_cost || 0) - (a.additional_cost || 0)).slice(0, 8);
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 115, 140);
    doc.text('TITLE', M, y); doc.text('BU', M + 95, y); doc.text('IMPACT', M + 125, y); doc.text('COST', M + CW, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(220, 230, 245); doc.line(M, y, M + CW, y); y += 4;
    topDisc.forEach(d => {
      checkY(7);
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 65, 85);
      const titleShort = (d.title || '').length > 40 ? d.title.substring(0, 38) + '...' : (d.title || '');
      doc.text(titleShort, M, y);
      doc.text(d.business_unit || '-', M + 95, y);
      const [ir, ig, ib] = impactRgb[d.impact_level] || [100,100,100];
      doc.setTextColor(ir, ig, ib); doc.setFont('helvetica', 'bold');
      doc.text(d.impact_level || '-', M + 125, y);
      doc.setTextColor(15, 60, 100);
      doc.text(`฿${(d.additional_cost || 0).toLocaleString()}`, M + CW, y, { align: 'right' });
      y += 7;
    });
    y += 4;

    // AI Summary if available
    if (aiSummary) {
      checkY(20);
      section('AI EXECUTIVE SUMMARY');
      doc.setFillColor(240, 247, 255); doc.roundedRect(M, y - 3, CW, 4, 1, 1, 'F');
      txt(aiSummary, 8.5, false, [40, 55, 75]);
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(248, 250, 253);
      doc.rect(0, 285, PW, 12, 'F');
      doc.setDrawColor(220, 230, 245); doc.line(0, 285, PW, 285);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 160, 175);
      doc.text('Generated by OpsTrace — Confidential', M, 291);
      doc.text(`Page ${p} of ${totalPages}`, PW - M, 291, { align: 'right' });
    }

    doc.save(`OpsTrace_Report_${dateFrom}_${dateTo}.pdf`);
    setDownloadingPDF(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Operational impact analysis & export">
        <Button variant="outline" size="sm" onClick={() => setEmailOpen(true)}>
          <Mail className="w-4 h-4 mr-2" /> Send by Email
        </Button>
        <Button size="sm" onClick={handleDownloadPDF} disabled={downloadingPDF}>
          {downloadingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download PDF
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px] mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px] mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Business Unit</Label>
            <Select value={filterBU} onValueChange={setFilterBU}>
              <SelectTrigger className="w-[160px] mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {ALL_BUS.map(bu => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap pb-0.5">
            {[['week','This Week'],['month','This Month'],['last-month','Last Month'],['quarter','This Quarter']].map(([k,l]) => (
              <Button key={k} variant="outline" size="sm" onClick={() => setRange(k)}>{l}</Button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── PAGE 1: KPIs + Charts ── */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Page 1 — Overview & Breakdown</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Issues', value: totalDisc, icon: Activity, color: 'text-primary' },
          { label: 'Open Cases', value: openCases, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Resolved', value: resolvedCases.length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Avg Resolution', value: `${avgResolutionDays.toFixed(1)}d`, icon: Clock, color: 'text-blue-500' },
          { label: 'Hours Lost', value: `${totalHoursLost.toFixed(1)}h`, icon: Clock, color: 'text-primary' },
          { label: 'Overtime', value: `${overtimeHours.toFixed(1)}h`, icon: TrendingUp, color: 'text-orange-500' },
          { label: 'Extra Cost', value: `฿${totalAdditionalCost.toLocaleString()}`, icon: DollarSign, color: 'text-red-500' },
          { label: 'Workload Cost', value: `฿${workloadCost.toLocaleString()}`, icon: DollarSign, color: 'text-purple-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-xs text-muted-foreground truncate">{label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{value}</p>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Issues by Business Unit</CardTitle>
          </CardHeader>
          <CardContent>
            {buChartData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={buChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" name="Issues" fill="#0e6ea8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Issue Types</CardTitle>
          </CardHeader>
          <CardContent>
            {issueChartData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={issueChartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip formatter={(v, n, p) => [v, p.payload.fullName]} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" name="Count" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Severity + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(byImpact).map(([level, count]) => (
                <div key={level} className="rounded-xl p-4 text-center" style={{ backgroundColor: IMPACT_COLORS[level] + '15', border: `1px solid ${IMPACT_COLORS[level]}40` }}>
                  <p className="text-2xl font-bold" style={{ color: IMPACT_COLORS[level] }}>{count}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: IMPACT_COLORS[level] }}>{level}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-28">{status}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${totalDisc ? (count / totalDisc) * 100 : 0}%`, backgroundColor: STATUS_COLORS[status] || '#6b7280' }} />
                  </div>
                  <span className="text-sm font-semibold w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── PAGE 2: Detail Tables + AI Summary ── */}
      <div className="space-y-1 pt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Page 2 — Detail & Analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload by Employee */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workload by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No workload data for this period</p>
            ) : (
              <div className="space-y-2">
                {employeeData.map(({ name, hours, cost, entries }) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{entries} task{entries !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{hours.toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground">฿{cost.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Issues by Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top Issues by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No data for this period</p>
            ) : (
              <div className="space-y-2">
                {[...filtered].sort((a,b) => (b.additional_cost||0) - (a.additional_cost||0)).slice(0, 6).map(d => (
                  <div key={d.id} className="flex items-start justify-between py-2 border-b border-border/40 last:border-0 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{d.business_unit}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: (IMPACT_COLORS[d.impact_level] || '#888') + '20', color: IMPACT_COLORS[d.impact_level] || '#888' }}>{d.impact_level}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap">฿{(d.additional_cost || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue Type detailed table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Issue Type Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byIssueType).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No data for this period</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(byIssueType).sort(([,a],[,b]) => b-a).map(([type, count]) => {
                const pct = totalDisc ? Math.round((count / totalDisc) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{type}</p>
                      <div className="mt-1.5 bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">{count}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Summary */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">AI Executive Summary</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Plain-language management summary — included in PDF & email</p>
          </div>
          <Button onClick={generateAISummary} disabled={generatingAI} size="sm">
            {generatingAI ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generatingAI ? 'Writing...' : 'Generate Summary'}
          </Button>
        </CardHeader>
        <CardContent>
          {aiSummary ? (
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl p-5 border border-primary/10">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{aiSummary}</div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Generate a plain-language summary ready to share with management</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Report by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send the full formatted report for <strong>{dateFrom} to {dateTo}</strong>
              {filterBU !== 'all' ? ` (${filterBU})` : ''}.
            </p>
            <div>
              <Label>Recipient *</Label>
              <Select value={emailTo} onValueChange={setEmailTo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>
                  {appUsers.map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
              <Button onClick={handleSendEmail} disabled={!emailTo || sendingEmail}>
                {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sendingEmail ? 'Sending...' : 'Send Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data for this period</div>;
}
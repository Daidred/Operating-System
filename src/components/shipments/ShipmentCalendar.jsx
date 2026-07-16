import React, { useState, useMemo, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Loader2, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  addMonths, subMonths, addYears, subYears,
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, isSameDay, getDay, getMonth, getYear, setMonth, setYear
} from 'date-fns';

// Group shipments by transport identifier (SWB/AWB/BL)
function groupShipments(shipments) {
  const groups = {};
  shipments.forEach(s => {
    const key = s.swb_no || s.awb_no || s.bl_no || s.id;
    const mode = s.mode || 'Sea';
    const eta = s.eta;
    if (!eta) return;
    if (!groups[key]) {
      groups[key] = { key, mode, eta, suppliers: [], shipments: [] };
    }
    groups[key].shipments.push(s);
    if (s.supplier && !groups[key].suppliers.includes(s.supplier)) {
      groups[key].suppliers.push(s.supplier);
    }
  });
  return Object.values(groups);
}

function ShipmentDot({ group, small = false }) {
  const [tooltip, setTooltip] = useState(false);
  const isAir = group.mode === 'Air';
  const size = small ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-sm';

  return (
    <div className="relative inline-flex" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <span className={`inline-flex items-center justify-center ${size} rounded-full cursor-default select-none shadow-sm
        ${isAir ? 'bg-sky-100 text-sky-700' : 'bg-blue-100 text-blue-700'}`}>
        {isAir ? '✈️' : '🚢'}
      </span>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none">
          <div className="bg-accent text-accent-foreground text-xs rounded-lg shadow-xl px-3 py-2 whitespace-nowrap max-w-[240px]">
            <div className="font-semibold mb-1 text-primary">
              {isAir ? `AWB: ${group.key}` : `SWB: ${group.key}`}
            </div>
            {group.suppliers.length > 0
              ? group.suppliers.map((s, i) => <div key={i} className="truncate">{s}</div>)
              : <div className="italic opacity-60">No supplier info</div>
            }
            {small && <div className="mt-1 opacity-60">ETA: {group.eta}</div>}
          </div>
          <div className="flex justify-center">
            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-accent" />
          </div>
        </div>
      )}
    </div>
  );
}

// Month picker dropdown
function MonthPicker({ currentMonth, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year = getYear(currentMonth);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-semibold transition-colors"
      >
        {format(currentMonth, 'MMMM yyyy')}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-64">
          {/* Year nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => onChange(subYears(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm">{year}</span>
            <button onClick={() => onChange(addYears(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {MONTHS.map((m, i) => {
              const isActive = getMonth(currentMonth) === i && getYear(currentMonth) === year;
              return (
                <button
                  key={m}
                  onClick={() => { onChange(setMonth(setYear(new Date(), year), i)); setOpen(false); }}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Month view ───────────────────────────────────────────────────────────────
function MonthView({ currentMonth, groups }) {
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);
  // Week starts Monday: shift Sunday (0) to 6, others -1
  const rawDay = getDay(startOfMonth(currentMonth));
  const startPad = rawDay === 0 ? 6 : rawDay - 1;
  const getGroupsForDay = (day) => groups.filter(g => g.eta && isSameDay(new Date(g.eta), day));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-border">
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="border-r border-b border-border bg-muted/20 min-h-[90px]" />
          ))}
          {days.map(day => {
            const dayGroups = getGroupsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()}
                className={`border-r border-b border-border min-h-[90px] p-1.5 transition-colors
                  ${isToday ? 'bg-primary/5' : 'bg-card hover:bg-muted/20'}`}>
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex flex-wrap gap-1">
                  {dayGroups.map((g, i) => <ShipmentDot key={i} group={g} />)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Year view ────────────────────────────────────────────────────────────────
function YearView({ currentYear, groups, onMonthClick }) {
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getGroupsForMonth = (monthIdx) =>
    groups.filter(g => {
      if (!g.eta) return false;
      const d = new Date(g.eta);
      return getMonth(d) === monthIdx && getYear(d) === currentYear;
    });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {MONTH_NAMES.map((name, idx) => {
        const monthGroups = getGroupsForMonth(idx);
        const seaCount = monthGroups.filter(g => g.mode !== 'Air').length;
        const airCount = monthGroups.filter(g => g.mode === 'Air').length;
        const isCurrentMonth = getMonth(new Date()) === idx && getYear(new Date()) === currentYear;

        return (
          <Card
            key={name}
            onClick={() => onMonthClick(idx)}
            className={`cursor-pointer hover:shadow-md transition-all ${isCurrentMonth ? 'ring-2 ring-primary/40' : ''}`}
          >
            <CardContent className="p-3">
              <div className={`text-xs font-bold mb-2 ${isCurrentMonth ? 'text-primary' : 'text-foreground'}`}>{name}</div>
              {monthGroups.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No arrivals</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {monthGroups.slice(0, 8).map((g, i) => <ShipmentDot key={i} group={g} small />)}
                    {monthGroups.length > 8 && (
                      <span className="text-xs text-muted-foreground self-center">+{monthGroups.length - 8}</span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {seaCount > 0 && <span>🚢 {seaCount}</span>}
                    {airCount > 0 && <span>✈️ {airCount}</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ShipmentCalendar() {
  const [zoom, setZoom] = useState('month'); // 'month' | 'year'
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const currentYear = getYear(currentMonth);

  const { data: shipments = [], isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => base44.entities.Shipment.list('-eta', 500),
  });

  const groups = useMemo(() => groupShipments(shipments), [shipments]);

  const handleMonthClick = (monthIdx) => {
    setCurrentMonth(setMonth(setYear(new Date(), currentYear), monthIdx));
    setZoom('month');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {zoom === 'month' ? (
            <MonthPicker currentMonth={currentMonth} onChange={setCurrentMonth} />
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentMonth(m => subYears(m, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm px-2">{currentYear}</span>
              <button onClick={() => setCurrentMonth(m => addYears(m, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {zoom === 'month' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button onClick={() => { setCurrentMonth(new Date()); setZoom('month'); }}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 transition-colors">
            Today — {format(new Date(), 'dd MMM yyyy')}
          </button>
        </div>

        {/* Zoom toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setZoom('month')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${zoom === 'month' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            Month
          </button>
          <button onClick={() => setZoom('year')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${zoom === 'year' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            Year
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">🚢 Sea (SWB/BL)</span>
        <span className="flex items-center gap-1">✈️ Air (AWB)</span>
        <span className="italic">Hover icon to see suppliers{zoom === 'year' ? ' — click a month to drill down' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : zoom === 'month' ? (
        <MonthView currentMonth={currentMonth} groups={groups} />
      ) : (
        <YearView currentYear={currentYear} groups={groups} onMonthClick={handleMonthClick} />
      )}
    </div>
  );
}
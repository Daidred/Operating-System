import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CalendarDays, Flag, FolderOpen, X } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';

const PRIORITY_COLORS = {
  Low: 'bg-slate-100 text-slate-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Urgent: 'bg-red-100 text-red-700',
};

const CATEGORY_COLORS = {
  'Follow-up': 'bg-purple-100 text-purple-700',
  Quotation: 'bg-cyan-100 text-cyan-700',
  Sample: 'bg-emerald-100 text-emerald-700',
  Document: 'bg-yellow-100 text-yellow-700',
  Meeting: 'bg-pink-100 text-pink-700',
  Email: 'bg-indigo-100 text-indigo-700',
  Other: 'bg-slate-100 text-slate-600',
};

function AddTaskRow({ onAdd, projects }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Other');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState('none');

  const handleAdd = () => {
    if (!title.trim()) return;
    const proj = projects.find(p => p.id === projectId);
    onAdd({
      title: title.trim(),
      priority,
      category,
      due_date: dueDate || null,
      done: false,
      project_id: proj ? proj.id : null,
      project_name: proj ? proj.name : null,
    });
    setTitle(''); setPriority('Medium'); setCategory('Other'); setDueDate(''); setProjectId('none');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/40 rounded-lg border border-dashed border-border">
      <Input
        placeholder="New task..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 min-w-48 h-8 text-sm"
      />
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['Low','Medium','High','Urgent'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['Follow-up','Quotation','Sample','Document','Meeting','Email','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={projectId} onValueChange={setProjectId}>
        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Link project..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No project</SelectItem>
          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <input
        type="date"
        value={dueDate}
        onChange={e => setDueDate(e.target.value)}
        className="h-8 px-2 rounded-md border border-input bg-transparent text-xs text-foreground"
      />
      <Button size="sm" className="h-8" onClick={handleAdd} disabled={!title.trim()}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add
      </Button>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onNavigateToProject }) {
  const overdue = task.due_date && !task.done && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border bg-card transition-all ${task.done ? 'opacity-50' : ''} ${overdue ? 'border-red-200 bg-red-50/30' : 'border-border'}`}>
      <Checkbox
        checked={task.done}
        onCheckedChange={() => onToggle(task)}
        className="shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </p>
        {task.project_name && (
          <button
            onClick={() => onNavigateToProject && onNavigateToProject(task.project_id)}
            className="flex items-center gap-1 mt-0.5 text-xs text-primary hover:underline"
          >
            <FolderOpen className="w-3 h-3" />
            {task.project_name}
          </button>
        )}
        {task.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.notes}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        <Badge className={`text-xs px-2 py-0.5 ${CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Other}`}>
          {task.category}
        </Badge>
        <Badge className={`text-xs px-2 py-0.5 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium}`}>
          <Flag className="w-2.5 h-2.5 mr-1" />{task.priority}
        </Badge>
        {task.due_date && (
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium
            ${isToday(parseISO(task.due_date)) ? 'bg-blue-100 text-blue-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
            <CalendarDays className="w-2.5 h-2.5" />
            {isToday(parseISO(task.due_date)) ? 'Today' : format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
      <button onClick={() => onDelete(task.id)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors ml-1">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DailyTasks({ onNavigate }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [projectFilter, setProjectFilter] = useState('all');

  const { data: tasks = [] } = useQuery({
    queryKey: ['daily-tasks'],
    queryFn: () => base44.entities.DailyTask.list('-created_date', 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['sourcing-projects-active'],
    queryFn: () => base44.entities.SourcingProject.filter({ archived: false }, 'name', 100),
  });

  const createMutation = useMutation({
    mutationFn: data => base44.entities.DailyTask.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-tasks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyTask.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.DailyTask.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-tasks'] }),
  });

  const handleToggle = (task) => updateMutation.mutate({ id: task.id, data: { done: !task.done } });
  const handleDelete = (id) => deleteMutation.mutate(id);
  const handleAdd = (data) => createMutation.mutate(data);

  // Apply status filter first
  let statusFiltered = filter === 'pending' ? tasks.filter(t => !t.done)
    : filter === 'done' ? tasks.filter(t => t.done)
    : tasks;

  // Apply project filter
  const filtered = projectFilter === 'all' ? statusFiltered
    : projectFilter === 'none' ? statusFiltered.filter(t => !t.project_id)
    : statusFiltered.filter(t => t.project_id === projectFilter);

  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);

  const todayTasks = filtered.filter(t => !t.done && t.due_date && isToday(parseISO(t.due_date)));
  const overdueTasks = filtered.filter(t => !t.done && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)));
  const upcomingTasks = filtered.filter(t => !t.done && (!t.due_date || (!isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)))));

  const handleNavigateToProject = () => {
    if (onNavigate) onNavigate('projects');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{pending.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
        </div>
        <div className={`rounded-xl border p-4 text-center ${tasks.filter(t => !t.done && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length > 0 ? 'bg-red-50 border-red-200' : 'bg-card'}`}>
          <p className={`text-2xl font-bold ${tasks.filter(t => !t.done && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {tasks.filter(t => !t.done && t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Overdue</p>
        </div>
        <div className="bg-card rounded-xl border p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{done.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
        </div>
      </div>

      {/* Add task */}
      <AddTaskRow onAdd={handleAdd} projects={projects} />

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {[['pending','Pending'],['done','Completed'],['all','All']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${filter === val ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-44 h-7 text-xs"><SelectValue placeholder="All projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">No project</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {projectFilter !== 'all' && (
            <button onClick={() => setProjectFilter('all')} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Task list grouped */}
      {filter === 'pending' ? (
        <div className="space-y-4">
          {overdueTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-2">⚠ Overdue</p>
              <div className="space-y-1.5">{overdueTasks.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onNavigateToProject={handleNavigateToProject} />)}</div>
            </div>
          )}
          {todayTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-2">📅 Today</p>
              <div className="space-y-1.5">{todayTasks.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onNavigateToProject={handleNavigateToProject} />)}</div>
            </div>
          )}
          {upcomingTasks.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Upcoming / No date</p>
              <div className="space-y-1.5">{upcomingTasks.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onNavigateToProject={handleNavigateToProject} />)}</div>
            </div>
          )}
          {filtered.filter(t => !t.done).length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <p className="text-3xl mb-2">✅</p>
              All tasks done!
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(t => <TaskItem key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onNavigateToProject={handleNavigateToProject} />)}
          {filtered.length === 0 && <p className="text-center py-8 text-sm text-muted-foreground">No tasks here.</p>}
        </div>
      )}
    </div>
  );
}
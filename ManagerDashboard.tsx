import { useState } from 'react';
import { getAllEmployees } from '@/lib/auth';
import { getTasksForUser, getWeekForUser, saveTasksForUser } from '@/lib/taskStore';
import { Task, DAYS, HOURS, Priority, Effort, DayOfWeek } from '@/lib/types';
import { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Plus, Calendar, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ManagerNavbar from '@/components/ManagerNavbar';

function getTaskColor(priority: Priority, effort: Effort): string {
  if (priority === 'high' && effort === 'intense') return 'priority-high-intense';
  if (priority === 'high' && effort === 'moderate') return 'priority-orange';
  if (priority === 'medium') return 'priority-medium';
  if (priority === 'low') return 'priority-low';
  return 'priority-fixed';
}

function formatHour(h: number): string {
  if (h === 12) return '12PM';
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

function getOptimizedTimes(tasks: Task[]): string {
  const completedTasks = tasks.filter(t => t.status === 'done' && t.scheduledHour !== undefined);
  if (completedTasks.length === 0) return 'No data yet';
  const hourCounts: Record<number, number> = {};
  completedTasks.forEach(t => {
    const h = t.scheduledHour!;
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const sorted = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]));
  return sorted.slice(0, 3).map(([h]) => formatHour(Number(h))).join(', ');
}

export default function ManagerDashboard() {
  const employees = getAllEmployees();
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState<string | null>(null);

  // Assign task form state
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDuration, setTaskDuration] = useState('1');
  const [taskEffort, setTaskEffort] = useState<Effort>('moderate');
  const [taskDay, setTaskDay] = useState<DayOfWeek>('Mon');
  const [taskHour, setTaskHour] = useState('9');
  const [assignToAll, setAssignToAll] = useState(false);

  const resetForm = () => {
    setTaskName(''); setTaskDescription(''); setTaskPriority('medium');
    setTaskDuration('1'); setTaskEffort('moderate'); setTaskDay('Mon');
    setTaskHour('9'); setAssignToAll(false);
  };

  const handleAssignTask = (targetUsername?: string) => {
    if (!taskName.trim()) return;

    const targets = assignToAll
      ? employees.map(e => e.username)
      : targetUsername ? [targetUsername] : [];

    if (targets.length === 0) return;

    for (const username of targets) {
      const existingTasks = getTasksForUser(username);
      const newTask: Task = {
        id: crypto.randomUUID(),
        name: taskName.trim(),
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
        duration: parseFloat(taskDuration) || 1,
        effort: taskEffort,
        preferredTime: '',
        dueDay: taskDay,
        status: 'not-started',
        isFixed: true,
        fixedHour: parseInt(taskHour),
        assignedBy: 'manager',
      };
      saveTasksForUser(username, [...existingTasks, newTask]);
    }

    const msg = assignToAll
      ? `"${taskName.trim()}" assigned to all ${targets.length} employees`
      : `"${taskName.trim()}" assigned to ${targets[0]}`;
    toast({ title: 'Task Assigned', description: msg });
    resetForm();
    setShowAssignForm(null);
  };

  // Assign-to-all form (top-level)
  const [showGlobalAssign, setShowGlobalAssign] = useState(false);

  return (
    <div className="min-h-screen">
      <ManagerNavbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
            <span className="text-sm text-muted-foreground">({employees.length} employees)</span>
          </div>
          <Button
            onClick={() => setShowGlobalAssign(!showGlobalAssign)}
            className="bg-primary text-primary-foreground"
          >
            <Send className="w-4 h-4 mr-2" />
            Assign to All Employees
          </Button>
        </div>

        {/* Global assign form */}
        {showGlobalAssign && (
          <div className="glass-card p-6 mb-6 border-primary/30">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Assign Task to All Employees (e.g. meetings, announcements)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Input placeholder="Task name (e.g. Team Meeting)" value={taskName} onChange={e => setTaskName(e.target.value)}
                className="bg-secondary/50 border-border/50 col-span-2" />
              <Select value={taskPriority} onValueChange={v => setTaskPriority(v as Priority)}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🔵 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" min="0.5" step="0.5" max="8" placeholder="Hours" value={taskDuration}
                onChange={e => setTaskDuration(e.target.value)} className="bg-secondary/50 border-border/50" />
              <Select value={taskEffort} onValueChange={v => setTaskEffort(v as Effort)}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="intense">Intense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={taskDay} onValueChange={v => setTaskDay(v as DayOfWeek)}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={taskHour} onValueChange={setTaskHour}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => (
                    <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => { setAssignToAll(true); handleAssignTask(); }} className="bg-primary text-primary-foreground">
                <Send className="w-4 h-4 mr-1" /> Assign to All
              </Button>
            </div>
            <Textarea placeholder="Description / notes (optional)" value={taskDescription}
              onChange={e => setTaskDescription(e.target.value)} className="bg-secondary/50 border-border/50 min-h-[50px]" rows={2} />
          </div>
        )}

        {employees.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No employees registered yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Employees will appear here after signing up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map(emp => {
              const tasks = getTasksForUser(emp.username);
              const week = getWeekForUser(emp.username);
              const isExpanded = expandedEmployee === emp.username;
              const doneTasks = tasks.filter(t => t.status === 'done').length;
              const totalTasks = tasks.length;
              const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
              const optimizedTimes = getOptimizedTimes(tasks);

              return (
                <div key={emp.username} className="glass-card overflow-hidden">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/10 transition-colors"
                    onClick={() => setExpandedEmployee(isExpanded ? null : emp.username)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {emp.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{emp.displayName}</p>
                        <p className="text-xs text-muted-foreground">{emp.email} · Week {week}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-foreground font-medium">{totalTasks} tasks</p>
                        <p className="text-xs text-muted-foreground">{completionRate}% complete</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Best times</p>
                        <p className="text-xs text-primary font-medium">{optimizedTimes}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/30 text-primary"
                          onClick={(e) => { e.stopPropagation(); setShowAssignForm(showAssignForm === emp.username ? null : emp.username); }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Assign
                        </Button>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    </div>
                  </div>

                  {/* Individual assign form */}
                  {showAssignForm === emp.username && (
                    <div className="px-4 pb-4 border-t border-border/20 pt-4" onClick={e => e.stopPropagation()}>
                      <h4 className="text-sm font-semibold text-foreground mb-3">Assign Task to {emp.displayName}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <Input placeholder="Task name" value={taskName} onChange={e => setTaskName(e.target.value)}
                          className="bg-secondary/50 border-border/50 col-span-2" />
                        <Select value={taskPriority} onValueChange={v => setTaskPriority(v as Priority)}>
                          <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">🔴 High</SelectItem>
                            <SelectItem value="medium">🔵 Medium</SelectItem>
                            <SelectItem value="low">🟢 Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" min="0.5" step="0.5" max="8" placeholder="Hours" value={taskDuration}
                          onChange={e => setTaskDuration(e.target.value)} className="bg-secondary/50 border-border/50" />
                        <Select value={taskEffort} onValueChange={v => setTaskEffort(v as Effort)}>
                          <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="intense">Intense</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={taskDay} onValueChange={v => setTaskDay(v as DayOfWeek)}>
                          <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={taskHour} onValueChange={setTaskHour}>
                          <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {HOURS.map(h => (
                              <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={() => { setAssignToAll(false); handleAssignTask(emp.username); }} className="bg-primary text-primary-foreground">
                          <Plus className="w-4 h-4 mr-1" /> Assign
                        </Button>
                      </div>
                      <Textarea placeholder="Description / notes (optional)" value={taskDescription}
                        onChange={e => setTaskDescription(e.target.value)} className="bg-secondary/50 border-border/50 min-h-[50px]" rows={2} />
                    </div>
                  )}

                  {/* Expanded: show schedule */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/20">
                      <h4 className="text-sm font-semibold text-foreground py-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Weekly Schedule
                      </h4>
                      {tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="grid grid-cols-[50px_repeat(7,1fr)] min-w-[600px]">
                            <div className="p-1" />
                            {DAYS.map(d => (
                              <div key={d} className="p-1 text-center text-xs font-semibold text-foreground border-l border-border/20">{d}</div>
                            ))}
                            {HOURS.filter((_, i) => i % 2 === 0).map(hour => (
                              <div key={hour} className="contents">
                                <div className="p-1 text-[10px] text-muted-foreground text-right">{formatHour(hour)}</div>
                                {DAYS.map(day => {
                                  const slotTasks = tasks.filter(t => t.dueDay === day && t.scheduledHour !== undefined && t.scheduledHour >= hour && t.scheduledHour < hour + 2);
                                  return (
                                    <div key={`${day}-${hour}`} className="border-l border-border/20 p-0.5 min-h-[28px]">
                                      {slotTasks.map(t => (
                                        <div key={t.id} className={`text-[9px] px-1 py-0.5 rounded ${getTaskColor(t.priority, t.effort)} text-foreground truncate mb-0.5`} style={{ color: 'white' }}>
                                          {t.name}
                                          {t.assignedBy && <span className="ml-1 opacity-60">📋</span>}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <h4 className="text-sm font-semibold text-foreground py-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> All Tasks
                      </h4>
                      <div className="space-y-1">
                        {tasks.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/10 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{t.name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-high/20 text-high' : t.priority === 'medium' ? 'bg-primary/20 text-primary' : 'bg-low/20 text-low'}`}>{t.priority}</span>
                              {t.assignedBy && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">📋 Manager</span>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{t.dueDay} · {t.duration}h</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] ${t.status === 'done' ? 'bg-low/20 text-low' : t.status === 'in-progress' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

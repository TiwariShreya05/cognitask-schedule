import { useState, useEffect } from 'react';
import { getTasks, saveTasks, getCurrentWeek, setCurrentWeek, savePattern, generateSchedule, getSimulatedTasks, saveSimulatedTasks, clearSimulatedTasks, getReminders } from '@/lib/taskStore';
import { Task, DAYS, DayOfWeek, TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sparkles, Bell, Clock, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';

const dayIndex = new Date().getDay();
const TODAY: DayOfWeek = DAYS[dayIndex === 0 ? 6 : dayIndex - 1];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatHour(h: number): string {
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function getOptimizedTimeAnalysis(tasks: Task[]): { bestHours: string; bestWindow: string; insight: string } | null {
  const completedTasks = tasks.filter(t => t.status === 'done' && t.scheduledHour !== undefined);
  if (completedTasks.length < 2) return null;

  const hourCounts: Record<number, number> = {};
  completedTasks.forEach(t => {
    const h = t.scheduledHour!;
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });

  const sorted = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]));
  const topHours = sorted.slice(0, 3).map(([h]) => Number(h));
  const bestHours = topHours.map(h => formatHour(h)).join(', ');

  // Determine window
  const avgHour = topHours.reduce((a, b) => a + b, 0) / topHours.length;
  let bestWindow = 'morning (8 AM – 12 PM)';
  if (avgHour >= 12 && avgHour < 17) bestWindow = 'afternoon (12 PM – 5 PM)';
  else if (avgHour >= 17) bestWindow = 'evening (5 PM – 10 PM)';

  // High-priority insight
  const highPriorityDone = completedTasks.filter(t => t.priority === 'high');
  let insight = `You're most productive during the ${bestWindow.split(' (')[0]}.`;
  if (highPriorityDone.length > 0) {
    const hpAvg = highPriorityDone.reduce((a, t) => a + t.scheduledHour!, 0) / highPriorityDone.length;
    insight += ` High-priority tasks are best completed around ${formatHour(Math.round(hpAvg))}.`;
  }

  return { bestHours, bestWindow, insight };
}

const energyData = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  const val = 50 + 40 * Math.sin(((hour - 6) * Math.PI) / 8) * (hour < 14 ? 1 : 0.7);
  return { hour: `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? 'PM' : 'AM'}`, energy: Math.round(val) };
});

const COLORS = ['hsl(0, 72%, 51%)', 'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)'];

const statusLabels: Record<TaskStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'done': 'Done',
};
const statusStyles: Record<TaskStatus, string> = {
  'not-started': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-primary/20 text-primary',
  'done': 'bg-low/20 text-low',
};

export default function Dashboard() {
  const [tasks, setTasksState] = useState<Task[]>(getTasks());
  const [simulatedTasks, setSimulatedTasks] = useState<Task[] | null>(getSimulatedTasks());
  const [showSimulation, setShowSimulation] = useState(false);
  const week = getCurrentWeek();

  useEffect(() => {
    const reminders = getReminders();
    const now = new Date();
    reminders.forEach(r => {
      const reminderTime = new Date(r.time);
      const diff = reminderTime.getTime() - now.getTime();
      if (diff > 0 && diff < 86400000) {
        setTimeout(() => {
          toast({
            title: r.type === 'upcoming' ? '⏰ Upcoming Task' : '📋 Task Due Now',
            description: r.type === 'upcoming' ? `"${r.taskName}" starts in 15 minutes!` : `Time to work on: ${r.taskName}`,
          });
        }, Math.min(diff, 5000));
      } else if (diff <= 0 && diff > -86400000) {
        toast({
          title: '⏰ Overdue Reminder',
          description: `You have a pending task: ${r.taskName}`,
        });
      }
    });
  }, []);

  const todayTasks = tasks
    .filter(t => t.dueDay === TODAY)
    .sort((a, b) => {
      const pw: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return pw[a.priority] - pw[b.priority];
    });

  // Manager-assigned tasks highlighted
  const managerAssignedTasks = tasks.filter(t => t.assignedBy);

  const toggleStatus = (id: string) => {
    const order: TaskStatus[] = ['not-started', 'in-progress', 'done'];
    const updated = tasks.map(t => {
      if (t.id !== id) return t;
      const idx = order.indexOf(t.status);
      const newStatus = order[(idx + 1) % 3];
      if (newStatus === 'done' && t.scheduledHour) {
        savePattern({ priority: t.priority, effort: t.effort, hour: t.scheduledHour, completed: true });
      }
      return { ...t, status: newStatus };
    });
    setTasksState(updated);
    saveTasks(updated);
    clearSimulatedTasks();
    setSimulatedTasks(null);
    setShowSimulation(false);
  };

  const handleSimulateNextWeek = () => {
    if (simulatedTasks) {
      setShowSimulation(!showSimulation);
      return;
    }
    const nextWeekTasks = tasks.map(t => ({
      ...t,
      status: 'not-started' as TaskStatus,
      scheduledHour: t.isFixed ? t.scheduledHour : undefined,
    }));
    const simulated = generateSchedule(nextWeekTasks, week + 1);
    saveSimulatedTasks(simulated);
    setSimulatedTasks(simulated);
    setShowSimulation(true);
    toast({ title: '🔮 Simulation Ready', description: `Week ${week + 1} preview generated based on your patterns` });
  };

  const handleApplySimulation = () => {
    if (!simulatedTasks) return;
    setCurrentWeek(week + 1);
    saveTasks(simulatedTasks);
    clearSimulatedTasks();
    setTasksState(simulatedTasks);
    setSimulatedTasks(null);
    setShowSimulation(false);
    toast({ title: '✅ Week Advanced', description: `You're now on Week ${week + 1}` });
  };

  const displayTasks = showSimulation && simulatedTasks ? simulatedTasks : tasks;
  const completionData = DAYS.map(day => ({
    day,
    completed: displayTasks.filter(t => t.dueDay === day && t.status === 'done').length,
    total: displayTasks.filter(t => t.dueDay === day).length,
  }));

  const priorityData = [
    { name: 'High', value: displayTasks.filter(t => t.priority === 'high').length },
    { name: 'Medium', value: displayTasks.filter(t => t.priority === 'medium').length },
    { name: 'Low', value: displayTasks.filter(t => t.priority === 'low').length },
  ].filter(d => d.value > 0);

  const doneTasks = todayTasks.filter(t => t.status === 'done').length;
  const pendingTasks = todayTasks.filter(t => t.status !== 'done').length;
  const loadLevel = pendingTasks === 0 ? 'Low' : pendingTasks <= 3 ? 'Medium' : 'High';

  const optimizedAnalysis = getOptimizedTimeAnalysis(tasks);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{getGreeting()} 👋</h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — Week {week}
          </p>
        </div>

        {week >= 2 && (
          <div className="glass-card p-4 mb-6 border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold text-sm">Smart Mode Active</span>
            </div>
            <p className="text-xs text-muted-foreground">Tasks auto-scheduled to your most productive time slots.</p>
          </div>
        )}

        {/* Manager-assigned tasks banner */}
        {managerAssignedTasks.length > 0 && (
          <div className="glass-card p-4 mb-6 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-primary">📋 Manager-Assigned Tasks</span>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{managerAssignedTasks.length}</span>
            </div>
            <div className="space-y-1">
              {managerAssignedTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded bg-primary/10">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.dueDay} · {t.duration}h</span>
                    {t.description && <span className="text-xs text-muted-foreground italic">— {t.description}</span>}
                  </div>
                  <button
                    onClick={() => toggleStatus(t.id)}
                    className={`text-xs px-3 py-1 rounded-full font-medium ${statusStyles[t.status]}`}
                  >
                    {statusLabels[t.status]}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimized Time Analysis - written text */}
        {optimizedAnalysis && (
          <div className="glass-card p-5 mb-6 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Your Optimized Schedule</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                <span className="font-medium text-primary">Best time window:</span> {optimizedAnalysis.bestWindow}
              </p>
              <p className="text-sm text-foreground">
                <span className="font-medium text-primary">Peak hours:</span> {optimizedAnalysis.bestHours}
              </p>
              <p className="text-sm text-muted-foreground">{optimizedAnalysis.insight}</p>
            </div>
          </div>
        )}

        {showSimulation && simulatedTasks && (
          <div className="glass-card p-4 mb-6 border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">🔮 Viewing Week {week + 1} Simulation</p>
                <p className="text-xs text-muted-foreground">This is a preview. Apply to advance to next week.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowSimulation(false)} variant="outline" size="sm">Back to Current</Button>
                <Button onClick={handleApplySimulation} size="sm" className="bg-primary text-primary-foreground">Apply & Advance</Button>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Today's Tasks — {TODAY}</h2>
          {todayTasks.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No tasks scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <div key={task.id} className={`flex items-center justify-between p-3 rounded-lg ${task.assignedBy ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/20'}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground text-sm">{task.name}</span>
                    <span className="text-xs text-muted-foreground">{task.duration}h</span>
                    {task.isFixed && <span className="text-xs">🔒</span>}
                    {task.assignedBy && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">📋 Manager</span>}
                  </div>
                  <button
                    onClick={() => toggleStatus(task.id)}
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${statusStyles[task.status]}`}
                  >
                    {statusLabels[task.status]}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Energy Curve</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={energyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="hour" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(217, 33%, 30%)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="energy" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Cognitive Load</h3>
            <div className="flex flex-col items-center justify-center h-[200px]">
              <span className={`text-4xl font-bold ${loadLevel === 'High' ? 'text-high' : loadLevel === 'Medium' ? 'text-primary' : 'text-low'}`}>{loadLevel}</span>
              <span className="text-sm text-muted-foreground mt-2">{doneTasks} done / {pendingTasks} pending</span>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Completion</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 22%)" />
                <XAxis dataKey="day" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(217, 33%, 30%)', borderRadius: 8 }} />
                <Bar dataKey="completed" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" fill="hsl(217, 33%, 22%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Priority Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(217, 33%, 17%)', border: '1px solid hsl(217, 33%, 30%)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSimulateNextWeek} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
            <Sparkles className="w-4 h-4 mr-2" />
            {showSimulation ? 'Hide Simulation' : simulatedTasks ? 'Show Week ' + (week + 1) + ' Simulation' : 'Simulate Next Week'}
          </Button>
        </div>
      </div>
    </div>
  );
}

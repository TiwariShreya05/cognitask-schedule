import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Sparkles, Lock, Bell, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Task, Priority, Effort, TimeOfDay, DayOfWeek, DAYS } from '@/lib/types';
import { getTasks, saveTasks, generateSchedule, getCurrentWeek, addReminder } from '@/lib/taskStore';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';

const priorityColors: Record<Priority, string> = {
  high: 'bg-high/20 text-high border-high/30',
  medium: 'bg-primary/20 text-primary border-primary/30',
  low: 'bg-low/20 text-low border-low/30',
};

export default function AddTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(getTasks());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [duration, setDuration] = useState('1');
  const [effort, setEffort] = useState<Effort>('moderate');
  const [preferredTime, setPreferredTime] = useState<TimeOfDay>('');
  const [dueDay, setDueDay] = useState<DayOfWeek>('Mon');
  const [isFixed, setIsFixed] = useState(false);
  const [fixedHour, setFixedHour] = useState('9');
  const [enableReminder, setEnableReminder] = useState(false);
  const [isEveryday, setIsEveryday] = useState(false);

  const resetForm = () => {
    setName(''); setDescription(''); setPriority('medium'); setDuration('1');
    setEffort('moderate'); setPreferredTime('');
    setEditingId(null); setIsFixed(false); setFixedHour('9');
    setEnableReminder(false); setIsEveryday(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const daysToAdd: DayOfWeek[] = isEveryday ? DAYS : [dueDay];
    let updated = [...tasks];

    for (const day of daysToAdd) {
      const task: Task = {
        id: editingId && daysToAdd.length === 1 ? editingId : crypto.randomUUID(),
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        duration: parseFloat(duration) || 1,
        effort,
        preferredTime: isFixed ? '' : preferredTime,
        dueDay: day,
        status: 'not-started',
        isFixed,
        fixedHour: isFixed ? parseInt(fixedHour) : undefined,
      };

      if (editingId && daysToAdd.length === 1) {
        updated = updated.map(t => t.id === editingId ? task : t);
      } else {
        updated = [...updated, task];
      }
    }

    setTasks(updated);
    saveTasks(updated);

    if (enableReminder) {
      const now = new Date();
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      for (const day of daysToAdd) {
        const targetDay = dayMap[day];
        const diff = (targetDay - now.getDay() + 7) % 7 || 7;
        const reminderDate = new Date(now);
        reminderDate.setDate(now.getDate() + diff);
        reminderDate.setHours(isFixed ? parseInt(fixedHour) : 9, 0, 0, 0);
        // Also set a 15-min-before reminder
        const earlyReminder = new Date(reminderDate.getTime() - 15 * 60 * 1000);
        const matchingTask = updated.find(t => t.name === name.trim() && t.dueDay === day);
        if (matchingTask) {
          addReminder(matchingTask.id, matchingTask.name, earlyReminder.toISOString(), 'upcoming');
          addReminder(matchingTask.id, matchingTask.name, reminderDate.toISOString(), 'due');
        }
      }
      toast({ title: '⏰ Reminder set', description: `You'll be reminded about "${name.trim()}"` });
    }

    resetForm();
  };

  const handleEdit = (task: Task) => {
    setName(task.name); setDescription(task.description || ''); setPriority(task.priority); setDuration(String(task.duration));
    setEffort(task.effort); setPreferredTime(task.preferredTime); setDueDay(task.dueDay);
    setIsFixed(!!task.isFixed); setFixedHour(String(task.fixedHour ?? 9));
    setEditingId(task.id);
  };

  const handleDelete = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveTasks(updated);
  };

  const handleGenerate = () => {
    const scheduled = generateSchedule(tasks);
    saveTasks(scheduled);
    navigate('/schedule');
  };

  const week = getCurrentWeek();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Add Tasks</h1>
          {week >= 2 && (
            <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" /> Smart Mode Active
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 mb-6">
          <Input
            placeholder="Task name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-secondary/50 border-border/50"
            required
          />

          {/* Optional description */}
          <Textarea
            placeholder="Description / notes (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="bg-secondary/50 border-border/50 min-h-[60px]"
            rows={2}
          />

          {/* Fixed task toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isFixed} onCheckedChange={setIsFixed} />
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" /> Fixed Task (locked time, never rescheduled)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
              <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🔵 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" min="0.5" step="0.5" max="8" placeholder="Duration (hrs)" value={duration}
              onChange={e => setDuration(e.target.value)} className="bg-secondary/50 border-border/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select value={effort} onValueChange={v => setEffort(v as Effort)}>
              <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="intense">Intense</SelectItem>
              </SelectContent>
            </Select>

            {isFixed ? (
              <Select value={fixedHour} onValueChange={setFixedHour}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => i + 8).map(h => (
                    <SelectItem key={h} value={String(h)}>
                      {h === 12 ? '12PM' : h > 12 ? `${h - 12}PM` : `${h}AM`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={preferredTime || 'any'} onValueChange={v => setPreferredTime(v === 'any' ? '' : v as TimeOfDay)}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Time</SelectItem>
                  <SelectItem value="morning">🌅 Morning</SelectItem>
                  <SelectItem value="afternoon">☀️ Afternoon</SelectItem>
                  <SelectItem value="evening">🌙 Evening</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Switch checked={isEveryday} onCheckedChange={(checked) => {
                setIsEveryday(checked);
              }} />
              <Label className="text-sm text-muted-foreground">
                📅 Everyday (add to all days)
              </Label>
            </div>
            {!isEveryday && (
              <Select value={dueDay} onValueChange={v => setDueDay(v as DayOfWeek)}>
                <SelectTrigger className="bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reminder toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={enableReminder} onCheckedChange={setEnableReminder} />
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              <Bell className="w-3 h-3" /> Set task reminder (15 min before + at task time)
            </Label>
          </div>

          <Button type="submit" className="w-full bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            {editingId ? 'Update Task' : 'Add Task'}
          </Button>
        </form>

        {tasks.length > 0 && (
          <div className="space-y-2 mb-6">
            {tasks.map(task => (
              <div key={task.id} className="glass-card-hover p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {task.isFixed && <Lock className="w-3 h-3 text-fixed" />}
                    {task.assignedBy && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">📋 Manager</span>}
                    <span className="font-medium text-foreground">{task.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {task.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.duration}h · {task.effort} · {task.dueDay}
                    {task.isFixed && task.fixedHour !== undefined
                      ? ` · Fixed @ ${task.fixedHour > 12 ? task.fixedHour - 12 : task.fixedHour}${task.fixedHour >= 12 ? 'PM' : 'AM'}`
                      : task.preferredTime ? ` · ${task.preferredTime}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(task)} className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(task.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <Button onClick={handleGenerate} className="w-full bg-primary text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Weekly Schedule
          </Button>
        )}
      </div>
    </div>
  );
}

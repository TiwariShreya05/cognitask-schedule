import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks, saveTasks, generateSchedule, clearSimulatedTasks } from '@/lib/taskStore';
import { Task, DAYS, HOURS, Priority, Effort } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard, X, Lock, GripVertical, RefreshCw, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';

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

function taskOccupiesSlot(task: Task, day: string, hour: number): boolean {
  if (task.dueDay !== day || task.scheduledHour === undefined) return false;
  const start = task.scheduledHour;
  const end = start + Math.ceil(task.duration);
  return hour >= start && hour < end;
}

function canPlaceTask(tasks: Task[], day: string, hour: number, duration: number, excludeId: string): boolean {
  for (let i = 0; i < Math.ceil(duration); i++) {
    const slotHour = hour + i;
    if (!HOURS.includes(slotHour)) return false;
    const conflict = tasks.find(t => t.id !== excludeId && taskOccupiesSlot(t, day, slotHour));
    if (conflict) return false;
  }
  return true;
}

export default function WeeklySchedule() {
  const navigate = useNavigate();
  const [tasks, setTasksState] = useState<Task[]>(getTasks());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ day: string; hour: number } | null>(null);
  const [reallocating, setReallocating] = useState(false);

  const openModal = (task: Task) => {
    setSelectedTask(task);
    setEditName(task.name);
    setEditPriority(task.priority);
  };

  const handleSaveEdit = () => {
    if (!selectedTask) return;
    const updated = tasks.map(t => t.id === selectedTask.id ? { ...t, name: editName, priority: editPriority } : t);
    setTasksState(updated);
    saveTasks(updated);
    setSelectedTask(null);
  };

  const handleDeleteFromModal = () => {
    if (!selectedTask) return;
    const updated = tasks.filter(t => t.id !== selectedTask.id);
    setTasksState(updated);
    saveTasks(updated);
    setSelectedTask(null);
  };

  const handleReallocate = () => {
    setReallocating(true);
    setTimeout(() => {
      const pending = tasks.map(t => {
        if (t.isFixed || t.status === 'done') return t;
        return { ...t, scheduledHour: undefined };
      });
      const rescheduled = generateSchedule(pending);
      setTasksState(rescheduled);
      saveTasks(rescheduled);
      clearSimulatedTasks();
      setReallocating(false);
      toast({ title: 'Tasks Re-Allocated', description: 'Schedule has been optimized' });
    }, 800);
  };

  const getTasksStartingAt = (day: string, hour: number) =>
    tasks.filter(t => t.dueDay === day && t.scheduledHour === hour);

  const isOccupiedByContinuation = (day: string, hour: number) =>
    tasks.some(t => {
      if (t.dueDay !== day || t.scheduledHour === undefined) return false;
      return t.scheduledHour < hour && hour < t.scheduledHour + Math.ceil(t.duration);
    });

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.isFixed) { e.preventDefault(); return; }
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }, [tasks]);

  const handleDragOver = useCallback((e: React.DragEvent, day: string, hour: number) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task) return;
    if (canPlaceTask(tasks, day, hour, task.duration, draggedTaskId)) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget({ day, hour });
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropTarget(null);
    }
  }, [draggedTaskId, tasks]);

  const handleDrop = useCallback((e: React.DragEvent, day: string, hour: number) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    if (!task || task.isFixed) return;
    if (!canPlaceTask(tasks, day, hour, task.duration, draggedTaskId)) return;
    const updated = tasks.map(t =>
      t.id === draggedTaskId
        ? { ...t, dueDay: day as Task['dueDay'], scheduledHour: hour }
        : t
    );
    setTasksState(updated);
    saveTasks(updated);
    clearSimulatedTasks();
    setDraggedTaskId(null);
    setDropTarget(null);
  }, [draggedTaskId, tasks]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDropTarget(null);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Weekly Schedule</h1>
          <div className="flex gap-2">
            <Button onClick={handleReallocate} disabled={reallocating} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${reallocating ? 'animate-spin' : ''}`} />
              {reallocating ? 'Re-Allocating...' : 'Re-Allocate Tasks'}
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          {[
            ['priority-high-intense', '🔴 High + Intense'],
            ['priority-orange', '🟠 High + Moderate'],
            ['priority-medium', '🔵 Medium'],
            ['priority-low', '🟢 Low / Light'],
            ['priority-fixed', '🟣 Fixed'],
          ].map(([cls, label]) => (
            <div key={cls} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className={`w-3 h-3 rounded ${cls}`} />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">📋</span>
            Manager Assigned
          </div>
        </div>

        <div className="glass-card overflow-auto">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/30">
            <div className="p-2" />
            {DAYS.map(d => (
              <div key={d} className="p-2 text-center text-sm font-semibold text-foreground border-l border-border/20">
                {d}
              </div>
            ))}
          </div>

          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/10">
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 flex items-start justify-end">
                {formatHour(hour)}
              </div>
              {DAYS.map(day => {
                const slotTasks = getTasksStartingAt(day, hour);
                const isContinuation = isOccupiedByContinuation(day, hour);
                const isDropHere = dropTarget?.day === day && dropTarget?.hour === hour;

                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`relative border-l border-border/20 h-12 ${
                      isContinuation ? '' : isDropHere ? 'bg-primary/10' : 'hover:bg-secondary/20'
                    }`}
                    onDragOver={e => handleDragOver(e, day, hour)}
                    onDrop={e => handleDrop(e, day, hour)}
                  >
                    {slotTasks.map(task => (
                      <div
                        key={task.id}
                        draggable={!task.isFixed}
                        onDragStart={e => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openModal(task)}
                        className={`absolute left-0.5 right-0.5 top-0.5 z-10 p-1.5 rounded-md text-xs font-medium transition-all hover:brightness-110 cursor-pointer ${getTaskColor(task.priority, task.effort)} ${task.isFixed ? 'border-2 border-dashed border-foreground/20' : ''} ${!task.isFixed ? 'hover:scale-[1.02] cursor-grab active:cursor-grabbing' : ''} ${draggedTaskId === task.id ? 'opacity-40' : ''} ${task.assignedBy ? 'ring-2 ring-primary/50' : ''}`}
                        style={{
                          height: `${Math.max(task.duration, 1) * 48 - 4}px`,
                          color: 'white',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {task.isFixed ? <Lock className="w-3 h-3" /> : <GripVertical className="w-3 h-3 opacity-50" />}
                          <span className="truncate">{task.name}</span>
                          {task.assignedBy && <span className="ml-auto text-[9px] opacity-80">📋</span>}
                        </div>
                        <span className="opacity-80">{task.duration}h · {task.priority} {task.isFixed ? '· 🔒' : ''}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Edit Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}>
            <div className="glass-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Edit Task</h3>
                <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedTask.assignedBy && (
                <div className="mb-3 p-2 rounded bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
                  📋 This task was assigned by your manager
                </div>
              )}
              {selectedTask.description && (
                <div className="mb-3 p-2 rounded bg-secondary/20 text-xs text-muted-foreground flex items-start gap-2">
                  <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                  {selectedTask.description}
                </div>
              )}
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary/50 border-border/50 mb-3" />
              <Select value={editPriority} onValueChange={v => setEditPriority(v as Priority)}>
                <SelectTrigger className="bg-secondary/50 border-border/50 mb-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🔵 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
              {selectedTask.isFixed && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                  <Lock className="w-3 h-3" /> This is a fixed task — it won't be rescheduled.
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSaveEdit} className="flex-1 bg-primary text-primary-foreground">Save</Button>
                <Button onClick={handleDeleteFromModal} variant="destructive" className="flex-1">Delete</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

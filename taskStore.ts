import { Task, DayOfWeek, HOURS, Priority, Effort, PatternEntry, WeekData } from './types';
import { getCurrentUser } from './auth';

function userKey(key: string): string {
  const user = getCurrentUser();
  const prefix = user ? user.username : 'anonymous';
  return `cognitask_${prefix}_${key}`;
}

export function getTasksForUser(username: string): Task[] {
  const raw = localStorage.getItem(`cognitask_${username}_tasks`);
  return raw ? JSON.parse(raw) : [];
}

export function getWeekForUser(username: string): number {
  const raw = localStorage.getItem(`cognitask_${username}_week`);
  return raw ? parseInt(raw) : 1;
}

export function getSimulatedTasksForUser(username: string): Task[] | null {
  const raw = localStorage.getItem(`cognitask_${username}_simulated_tasks`);
  return raw ? JSON.parse(raw) : null;
}

export function getTasks(): Task[] {
  const raw = localStorage.getItem(userKey('tasks'));
  return raw ? JSON.parse(raw) : [];
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(userKey('tasks'), JSON.stringify(tasks));
}

export function getCurrentWeek(): number {
  const raw = localStorage.getItem(userKey('week'));
  return raw ? parseInt(raw) : 1;
}

export function setCurrentWeek(week: number) {
  localStorage.setItem(userKey('week'), String(week));
}

export function getPatterns(): PatternEntry[] {
  const raw = localStorage.getItem(userKey('patterns'));
  return raw ? JSON.parse(raw) : [];
}

export function savePattern(entry: PatternEntry) {
  const patterns = getPatterns();
  patterns.push(entry);
  localStorage.setItem(userKey('patterns'), JSON.stringify(patterns));
}

export function getSimulatedTasks(): Task[] | null {
  const raw = localStorage.getItem(userKey('simulated_tasks'));
  return raw ? JSON.parse(raw) : null;
}

export function saveSimulatedTasks(tasks: Task[]) {
  localStorage.setItem(userKey('simulated_tasks'), JSON.stringify(tasks));
}

export function clearSimulatedTasks() {
  localStorage.removeItem(userKey('simulated_tasks'));
}

// Task reminders with type: 'upcoming' (15 min before) or 'due' (at task time)
export interface ReminderEntry {
  taskId: string;
  taskName: string;
  time: string;
  username: string;
  type: 'upcoming' | 'due';
}

export function getReminders(): ReminderEntry[] {
  const raw = localStorage.getItem('cognitask_reminders');
  return raw ? JSON.parse(raw) : [];
}

export function addReminder(taskId: string, taskName: string, time: string, type: 'upcoming' | 'due' = 'due') {
  const user = getCurrentUser();
  if (!user) return;
  const reminders = getReminders();
  reminders.push({ taskId, taskName, time, username: user.username, type });
  localStorage.setItem('cognitask_reminders', JSON.stringify(reminders));
}

export function removeReminder(taskId: string, type?: string) {
  let reminders = getReminders();
  if (type) {
    reminders = reminders.filter(r => !(r.taskId === taskId && r.type === type));
  } else {
    reminders = reminders.filter(r => r.taskId !== taskId);
  }
  localStorage.setItem('cognitask_reminders', JSON.stringify(reminders));
}

export function saveTasksForUser(username: string, tasks: Task[]) {
  localStorage.setItem(`cognitask_${username}_tasks`, JSON.stringify(tasks));
}

function getPreferredHourRange(time: string): number[] {
  if (time === 'morning') return HOURS.filter(h => h >= 8 && h < 12);
  if (time === 'afternoon') return HOURS.filter(h => h >= 12 && h < 17);
  if (time === 'evening') return HOURS.filter(h => h >= 17 && h < 21);
  return HOURS;
}

function getPriorityWeight(p: Priority): number {
  return p === 'high' ? 3 : p === 'medium' ? 2 : 1;
}

function canFitTask(occupied: Set<number>, hour: number, duration: number): boolean {
  for (let i = 0; i < Math.ceil(duration); i++) {
    if (occupied.has(hour + i) || !HOURS.includes(hour + i)) return false;
  }
  return true;
}

function occupySlots(occupied: Set<number>, hour: number, duration: number) {
  for (let i = 0; i < Math.ceil(duration); i++) {
    occupied.add(hour + i);
  }
}

export function generateSchedule(tasks: Task[], weekOverride?: number): Task[] {
  const week = weekOverride ?? getCurrentWeek();
  const patterns = getPatterns();

  const occupied: Record<string, Set<number>> = {};
  const result: Task[] = [];

  const fixedTasks = tasks.filter(t => t.isFixed && t.fixedHour !== undefined);
  const nonFixedTasks = tasks.filter(t => !t.isFixed || t.fixedHour === undefined);

  for (const task of fixedTasks) {
    if (!occupied[task.dueDay]) occupied[task.dueDay] = new Set();
    const hour = task.fixedHour!;
    occupySlots(occupied[task.dueDay], hour, task.duration);
    result.push({ ...task, scheduledHour: hour });
  }

  const sorted = [...nonFixedTasks].sort((a, b) => {
    const pw = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    if (pw !== 0) return pw;
    const ew = { intense: 3, moderate: 2, light: 1 };
    return ew[b.effort] - ew[a.effort];
  });

  if (week >= 2 && patterns.length > 0) {
    const completedByPriority: Record<string, number[]> = {};
    patterns.filter(p => p.completed).forEach(p => {
      if (!completedByPriority[p.priority]) completedByPriority[p.priority] = [];
      if (!completedByPriority[p.priority].includes(p.hour)) {
        completedByPriority[p.priority].push(p.hour);
      }
    });

    for (const task of sorted) {
      if (!occupied[task.dueDay]) occupied[task.dueDay] = new Set();
      const dayOccupied = occupied[task.dueDay];
      const patternHours = completedByPriority[task.priority] || [];
      const preferred = task.preferredTime ? getPreferredHourRange(task.preferredTime) : HOURS;
      const candidates = patternHours.length > 0
        ? [...new Set([...patternHours, ...preferred])]
        : preferred;
      let hour = candidates.find(h => HOURS.includes(h) && canFitTask(dayOccupied, h, task.duration));
      if (hour === undefined) hour = HOURS.find(h => canFitTask(dayOccupied, h, task.duration));
      if (hour === undefined) hour = 8;
      occupySlots(dayOccupied, hour, task.duration);
      result.push({ ...task, scheduledHour: hour });
    }
  } else {
    for (const task of sorted) {
      if (!occupied[task.dueDay]) occupied[task.dueDay] = new Set();
      const dayOccupied = occupied[task.dueDay];
      const preferred = task.preferredTime ? getPreferredHourRange(task.preferredTime) : HOURS;
      let hour = preferred.find(h => canFitTask(dayOccupied, h, task.duration));
      if (hour === undefined) hour = HOURS.find(h => canFitTask(dayOccupied, h, task.duration));
      if (hour === undefined) hour = 8;
      occupySlots(dayOccupied, hour, task.duration);
      result.push({ ...task, scheduledHour: hour });
    }
  }

  return result;
}

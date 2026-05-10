export type Priority = 'high' | 'medium' | 'low';
export type Effort = 'light' | 'moderate' | 'intense';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | '';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type TaskStatus = 'not-started' | 'in-progress' | 'done';
export type UserRole = 'employee' | 'manager';

export interface Task {
  id: string;
  name: string;
  description?: string;
  priority: Priority;
  duration: number;
  effort: Effort;
  preferredTime: TimeOfDay;
  dueDay: DayOfWeek;
  status: TaskStatus;
  scheduledHour?: number;
  isFixed?: boolean;
  fixedHour?: number;
  assignedBy?: string;
  reminderTime?: string;
  reminderSent?: boolean;
}

export interface UserProfile {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface WeekData {
  week: number;
  tasks: Task[];
  patterns: PatternEntry[];
}

export interface PatternEntry {
  priority: Priority;
  effort: Effort;
  hour: number;
  completed: boolean;
}

export const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8AM - 10PM

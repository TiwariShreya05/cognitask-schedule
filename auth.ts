import { UserProfile, UserRole } from './types';

const USERS_KEY = 'cognitask_users';
const CURRENT_USER_KEY = 'cognitask_current_user';

// Default manager account
const DEFAULT_MANAGER: UserProfile = {
  username: 'manager',
  email: 'manager@cognitask.com',
  password: 'manager123',
  role: 'manager',
  displayName: 'Manager',
};

function getUsers(): UserProfile[] {
  const raw = localStorage.getItem(USERS_KEY);
  const users: UserProfile[] = raw ? JSON.parse(raw) : [];
  // Ensure default manager exists
  if (!users.find(u => u.username === 'manager')) {
    users.push(DEFAULT_MANAGER);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  return users;
}

function saveUsers(users: UserProfile[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signup(username: string, email: string, password: string, displayName: string, role: UserRole = 'employee'): { success: boolean; error?: string } {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    return { success: false, error: 'Username already exists' };
  }
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'Email already exists' };
  }
  users.push({ username, email, password, role, displayName });
  saveUsers(users);
  return { success: true };
}

export function login(username: string, password: string): { success: boolean; user?: UserProfile; error?: string } {
  const users = getUsers();
  const user = users.find(u => (u.username === username || u.email === username) && u.password === password);
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return { success: true, user };
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): UserProfile | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

export function isManager(): boolean {
  const user = getCurrentUser();
  return user?.role === 'manager';
}

export function getAllEmployees(): UserProfile[] {
  return getUsers().filter(u => u.role === 'employee');
}

export function getUserByUsername(username: string): UserProfile | undefined {
  return getUsers().find(u => u.username === username);
}

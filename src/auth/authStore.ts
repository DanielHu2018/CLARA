/**
 * CLARA — Auth Store
 * Simple localStorage-backed auth system.
 * Passwords are hashed with SHA-256 (browser-native).
 */

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  avatarColor: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  avatarColor: string;
  loginAt: string;
}

const USERS_KEY = 'CLARA_users_v1';
const SESSION_KEY = 'CLARA_session_v1';

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + 'CLARA_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveUsers(users: User[]) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch { /* ignore */ }
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveSession(session: AuthSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

export async function signUp(name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const users = loadUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }
  const passwordHash = await hashPassword(password);
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    passwordHash,
    createdAt: new Date().toISOString(),
    avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
  };
  saveUsers([...users, user]);
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    loginAt: new Date().toISOString(),
  };
  saveSession(session);
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) return { ok: false, error: 'No account found with that email.' };
  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) return { ok: false, error: 'Incorrect password.' };
  const session: AuthSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarColor: user.avatarColor,
    loginAt: new Date().toISOString(),
  };
  saveSession(session);
  return { ok: true };
}

export function signOut() {
  saveSession(null);
}

export function getCurrentSession(): AuthSession | null {
  return loadSession();
}

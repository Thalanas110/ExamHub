import type { User } from '../data/types';

export const APP_STORAGE_KEYS = {
  token: 'examhub_token',
  user: 'examhub_user',
} as const;

export function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem(APP_STORAGE_KEYS.user);
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    return null;
  }
}

export function persistStoredUser(currentUser: User | null) {
  if (currentUser) {
    localStorage.setItem(APP_STORAGE_KEYS.user, JSON.stringify(currentUser));
    return;
  }

  localStorage.removeItem(APP_STORAGE_KEYS.user);
}

export function readStoredToken() {
  return localStorage.getItem(APP_STORAGE_KEYS.token);
}

export function writeStoredToken(token: string) {
  localStorage.setItem(APP_STORAGE_KEYS.token, token);
}

export function clearStoredSession() {
  localStorage.removeItem(APP_STORAGE_KEYS.token);
  localStorage.removeItem(APP_STORAGE_KEYS.user);
}

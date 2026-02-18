import type { User } from "../types";

const AUTH_USER_KEY = "auth.user";
const AUTH_ACCESS_TOKEN_KEY = "auth.accessToken";
const AUTH_REFRESH_TOKEN_KEY = "auth.refreshToken";

const LEGACY_USER_KEY = "user";
const LEGACY_ACCESS_TOKEN_KEY = "accessToken";

export const AUTH_SESSION_EVENT = "auth:session-changed";

function emitSessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
}

function readSessionString(key: string): string | null {
  return sessionStorage.getItem(key);
}

function migrateLegacyString(key: string, legacyKey?: string): string | null {
  const current = readSessionString(key);
  if (current) return current;

  if (!legacyKey) return null;
  const legacy = localStorage.getItem(legacyKey);
  if (!legacy) return null;

  sessionStorage.setItem(key, legacy);
  localStorage.removeItem(legacyKey);
  return legacy;
}

export function getStoredUser(): User | null {
  const raw = migrateLegacyString(AUTH_USER_KEY, LEGACY_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getStoredAccessToken(): string | null {
  return migrateLegacyString(AUTH_ACCESS_TOKEN_KEY, LEGACY_ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return readSessionString(AUTH_REFRESH_TOKEN_KEY);
}

export function setStoredSession(user: User, accessToken: string, refreshToken: string) {
  sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  sessionStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);

  // cleanup keys from old browser-wide auth approach
  localStorage.removeItem(LEGACY_USER_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);

  emitSessionChanged();
}

export function setStoredAccessToken(accessToken: string) {
  sessionStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  emitSessionChanged();
}

export function clearStoredSession() {
  sessionStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);

  localStorage.removeItem(LEGACY_USER_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);

  emitSessionChanged();
}

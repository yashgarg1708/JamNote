import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "../types";
import { logoutApi } from "../api/auth";
import {
  AUTH_SESSION_EVENT,
  clearStoredSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredSession,
} from "../utils/authSession";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken());

  useEffect(() => {
    const onSessionChanged = () => {
      setUser(getStoredUser());
      setAccessToken(getStoredAccessToken());
    };

    window.addEventListener(AUTH_SESSION_EVENT, onSessionChanged);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, onSessionChanged);
    };
  }, []);

  const setSession = (u: User, nextAccessToken: string, refreshToken: string) => {
    setUser(u);
    setAccessToken(nextAccessToken);
    setStoredSession(u, nextAccessToken, refreshToken);
  };

  const logout = async () => {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {}
    }
    clearStoredSession();
    setUser(null);
    setAccessToken(null);
  };

  const value = useMemo(
    () => ({ user, accessToken, setSession, logout }),
    [user, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

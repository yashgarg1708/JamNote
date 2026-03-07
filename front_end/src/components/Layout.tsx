import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  applyTheme,
  getStoredTheme,
  toggleTheme,
  type ThemeMode,
} from "../utils/theme";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-icon">✦</div>
          <div className="brand-meta">
            <div className="brand-title">JamNotes</div>
            <div className="brand-subtitle">Collaborative workspace</div>
          </div>
        </div>

        <div className="header-spacer" />

        <button
          className="theme-toggle ghost"
          onClick={() => setTheme((prev) => toggleTheme(prev))}
          title="Toggle theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <div className="user-box">
          <div className="user-name">{user?.name}</div>
          <div className="user-email">{user?.email}</div>
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      {children}
    </div>
  );
}

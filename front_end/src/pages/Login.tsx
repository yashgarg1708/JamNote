import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { applyTheme, getStoredTheme, toggleTheme, type ThemeMode } from "../utils/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const nav = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const submit = async () => {
    setErr(null);
    if (!email.trim()) {
      setErr("Email is required");
      return;
    }
    if (!password) {
      setErr("Password is required");
      return;
    }
    try {
      const data = await loginApi({ email: email.trim().toLowerCase(), password });
      setSession(data.user, data.accessToken, data.refreshToken);
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Login failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title-row">
          <h2 className="auth-title">Welcome Back</h2>
          <button className="theme-toggle ghost" onClick={() => setTheme((p) => toggleTheme(p))}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="item-sub">Sign in to access your notebooks and shared notes.</div>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <div className="error-text">{err}</div>}

        <button className="primary" onClick={submit}>
          Login
        </button>

        <div className="auth-links">
          <Link className="link" to="/register">
            Create account
          </Link>
          <Link className="link" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { applyTheme, getStoredTheme, toggleTheme, type ThemeMode } from "../utils/theme";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const nav = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const submit = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    if (!email.trim()) {
      setErr("Email is required");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    try {
      const data = await registerApi({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
      setSession(data.user, data.accessToken, data.refreshToken);
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Register failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title-row">
          <h2 className="auth-title">Create Account</h2>
          <button className="theme-toggle ghost" onClick={() => setTheme((p) => toggleTheme(p))}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="item-sub">Set up your workspace and invite collaborators.</div>

        <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password (min 8 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          placeholder="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {err && <div className="error-text">{err}</div>}

        <button className="primary" onClick={submit}>
          Create account
        </button>

        <div className="auth-links">
          <Link className="link" to="/login">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

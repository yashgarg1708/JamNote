import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordApi } from "../api/auth";
import { applyTheme, getStoredTheme, toggleTheme, type ThemeMode } from "../utils/theme";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (!email.trim()) {
      setErr("Email is required");
      return;
    }
    try {
      const r = await forgotPasswordApi(email.trim().toLowerCase());
      setMsg(r.message + " (Check backend logs for reset URL in local dev.)");
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Request failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title-row">
          <h2 className="auth-title">Forgot Password</h2>
          <button className="theme-toggle ghost" onClick={() => setTheme((p) => toggleTheme(p))}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        <div className="item-sub">Enter your email to receive a reset link.</div>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {msg && <div style={{ color: "var(--owned)", fontSize: 12 }}>{msg}</div>}
        {err && <div className="error-text">{err}</div>}

        <button className="primary" onClick={submit}>
          Send reset link
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

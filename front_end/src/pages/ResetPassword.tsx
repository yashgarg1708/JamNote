import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPasswordApi } from "../api/auth";
import { applyTheme, getStoredTheme, toggleTheme, type ThemeMode } from "../utils/theme";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const token = useMemo(() => sp.get("token") ?? "", [sp]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (newPassword.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    try {
      const r = await resetPasswordApi({ token, newPassword, confirmPassword });
      setMsg(r.message);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "Reset failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title-row">
          <h2 className="auth-title">Reset Password</h2>
          <button className="theme-toggle ghost" onClick={() => setTheme((p) => toggleTheme(p))}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>

        {!token && <div className="error-text">Missing token in URL.</div>}

        <input
          placeholder="New password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          placeholder="Confirm new password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {msg && <div style={{ color: "var(--owned)", fontSize: 12 }}>{msg}</div>}
        {err && <div className="error-text">{err}</div>}

        <button
          className="primary"
          onClick={submit}
          disabled={!token || !newPassword || !confirmPassword}
        >
          Set new password
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

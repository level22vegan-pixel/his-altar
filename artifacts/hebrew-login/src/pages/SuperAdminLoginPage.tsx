import { useState } from "react";
import { useLocation } from "wouter";

function setSASession(token: string) {
  localStorage.setItem("saSession", JSON.stringify({ token, loginAt: Date.now() }));
}

export function getSAToken(): string | null {
  try {
    const raw = localStorage.getItem("saSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.loginAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("saSession");
      return null;
    }
    return parsed.token ?? null;
  } catch { return null; }
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function SuperAdminLoginPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Username and password are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Invalid credentials."); return; }
      setSASession(data.token);
      navigate("/superadmin");
    } catch {
      setError("Connection error. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #080c14 0%, #0d1117 60%, #080c14 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
            marginBottom: 16,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <h1 style={{ color: "#f1f5f9", fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Site Control</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>Platform administrator access</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 16, padding: "32px 28px",
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(""); }}
              placeholder="sysadmin"
              autoComplete="username"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#1e293b", border: "1px solid #334155",
                borderRadius: 10, color: "#f1f5f9", fontSize: 14,
                padding: "11px 14px", outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#1e293b", border: "1px solid #334155",
                  borderRadius: 10, color: "#f1f5f9", fontSize: 14,
                  padding: "11px 42px 11px 14px", outline: "none",
                }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 0, display: "flex" }}>
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {error && <p style={{ color: "#f87171", fontSize: 13, textAlign: "center", margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            background: loading ? "#1e3a8a" : "#1d4ed8",
            border: "none", borderRadius: 10, color: "#fff",
            fontSize: 14, fontWeight: 600, padding: "12px",
            cursor: loading ? "default" : "pointer", transition: "background 0.15s",
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, color: "#334155", fontSize: 12 }}>
          <button onClick={() => navigate("/enter")} style={{ background: "none", border: "none", color: "#334155", fontSize: 12, cursor: "pointer" }}>
            ← Back to login
          </button>
        </p>
      </div>
    </div>
  );
}

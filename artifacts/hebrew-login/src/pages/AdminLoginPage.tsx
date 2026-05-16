import { useState } from "react";
import { useLocation } from "wouter";
import { setAdminSession } from "@/lib/session";

export default function AdminLoginPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password.trim()) { setError("Enter the admin password"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.valid) {
        setAdminSession();
        navigate("/admin");
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <button
          onClick={() => navigate("/home")}
          style={{
            marginBottom: 28,
            color: "hsl(38 30% 42%)",
            fontFamily: "Georgia, serif",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            textAlign: "center",
            color: "hsl(38 60% 65%)",
            fontFamily: "Georgia, serif",
            fontSize: 22,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Admin
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "hsl(38 25% 40%)",
            fontFamily: "Georgia, serif",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          Sign in to continue
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="Admin password"
              autoComplete="current-password"
              autoFocus
              style={{
                width: "100%",
                padding: "11px 44px 11px 14px",
                background: "hsl(35 18% 10%)",
                border: "1px solid hsl(38 20% 22%)",
                borderRadius: 6,
                color: "hsl(38 55% 70%)",
                fontFamily: "Georgia, serif",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "hsl(38 25% 40%)",
                fontSize: 10,
                fontFamily: "Georgia, serif",
              }}
            >
              {showPw ? "hide" : "show"}
            </button>
          </div>

          {error && (
            <p style={{ color: "hsl(0 60% 58%)", fontFamily: "Georgia, serif", fontSize: 12, textAlign: "center", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 0",
              background: "hsl(38 45% 26%)",
              color: "hsl(38 70% 78%)",
              border: "1px solid hsl(38 35% 34%)",
              borderRadius: 6,
              fontFamily: "Georgia, serif",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

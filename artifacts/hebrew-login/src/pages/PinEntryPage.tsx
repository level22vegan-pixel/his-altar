import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { setCampusSession, setAdminSession, setOrgSession } from "@/lib/session";

type Mode = "select" | "campus" | "email";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function PinEntryPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("campus");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Email sign-in state
  const [email, setEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showForgotEmail, setShowForgotEmail] = useState(false);

  useEffect(() => {
    if (mode === "campus") {
      setTimeout(() => inputs.current[0]?.focus(), 80);
    }
  }, [mode]);

  function handleChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError("");
    if (cleaned && index < 3) {
      inputs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "") && cleaned) {
      submit(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function submit(code: string) {
    setLoading(true);
    setError("");
    try {
      // First try campus code
      const res = await fetch("/api/campus-passwords/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        const data = await res.json();
        setCampusSession(data.campus, data.role ?? "campus");
        if (data.role === "attendance") {
          const dest = data.campus === "HALLMARK"
            ? "/campus/hallmark"
            : `/campus/${data.campus.toLowerCase().replace(/\s+/g, "-")}`;
          navigate(dest, { replace: true });
        } else {
          navigate("/team", { replace: true });
        }
        return;
      }

      // Fallback: try admin password
      const adminRes = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: code }),
      });
      const adminData = await adminRes.json();
      if (adminData.valid) {
        setAdminSession(adminData.orgName ?? undefined);
        navigate("/team", { replace: true });
        return;
      }

      // Fallback: try superadmin gateway code
      const saRes = await fetch("/api/superadmin/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (saRes.ok) {
        const saData = await saRes.json();
        if (saData.match) {
          navigate("/superadmin/login", { replace: true });
          return;
        }
      }

      setError("Invalid code. Please try again.");
      setDigits(["", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch {
      setError("Connection error. Please try again.");
      setDigits(["", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMode("select");
    setDigits(["", "", "", ""]);
    setError("");
    setLoading(false);
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !emailPassword.trim()) {
      setEmailError("Please enter your email and password.");
      return;
    }
    setEmailLoading(true);
    setEmailError("");
    try {
      const res = await fetch("/api/orgs/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.message || "Incorrect email or password.");
        return;
      }
      setOrgSession(data.orgId, data.orgName, data.token);
      navigate("/org/dashboard");
    } catch {
      setEmailError("Connection error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  const bg = "linear-gradient(160deg, #0a0a0f 0%, #0f0a1a 60%, #0a0a0f 100%)";

  const cardBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "18px 22px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    transition: "all 0.18s",
  };

  const digitStyle: React.CSSProperties = {
    width: 68,
    height: 80,
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(255,255,255,0.15)",
    borderRadius: 14,
    color: "#ffffff",
    fontFamily: "Georgia, serif",
    fontSize: 36,
    fontWeight: 400,
    textAlign: "center",
    outline: "none",
    caretColor: "transparent",
    transition: "border-color 0.2s, background 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
    }}>
      {/* Glow */}
      <div style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 480,
        height: 480,
        background: "radial-gradient(ellipse, rgba(120,60,200,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 360, position: "relative", zIndex: 1 }}>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{
            color: "#fff",
            fontFamily: "Georgia, serif",
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: "0.06em",
            margin: 0,
            textShadow: "0 0 20px rgba(180,140,255,0.6)",
          }}>
            {mode === "campus" ? "Campus Access" : mode === "email" ? "Sign In" : "His Altar"}
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.3)",
            fontFamily: "Georgia, serif",
            fontSize: 12,
            letterSpacing: "0.1em",
            marginTop: 8,
          }}>
            {mode === "campus" ? "Enter your 4-digit campus code" : mode === "email" ? "Use your church account email and password" : "Select how you're signing in"}
          </p>
        </div>

        {mode === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Campus */}
            <button
              style={cardBase}
              onClick={() => setMode("campus")}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: "rgba(124,58,237,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>🏛</div>
              <div>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#fff", letterSpacing: "0.06em", margin: 0 }}>
                  Campus Login
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", margin: "3px 0 0" }}>
                  Altar entries & check-in
                </p>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: 18 }}>›</span>
            </button>

            {/* Caller */}
            <button
              style={cardBase}
              onClick={() => navigate("/caller-login")}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(56,189,134,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,189,134,0.35)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: "rgba(56,189,134,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>📞</div>
              <div>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#fff", letterSpacing: "0.06em", margin: 0 }}>
                  Caller Login
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", margin: "3px 0 0" }}>
                  Prayer follow-up calls
                </p>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: 18 }}>›</span>
            </button>

            {/* Admin */}
            <button
              style={cardBase}
              onClick={() => navigate("/admin/login")}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(234,179,8,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(234,179,8,0.28)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: "rgba(234,179,8,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>🔑</div>
              <div>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 14, color: "#fff", letterSpacing: "0.06em", margin: 0 }}>
                  Admin Login
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", margin: "3px 0 0" }}>
                  Full admin access
                </p>
              </div>
              <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.2)", fontSize: 18 }}>›</span>
            </button>
          </div>
        )}

        {mode === "campus" && (
          <>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 28 }}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  style={{
                    ...digitStyle,
                    borderColor: d ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.15)",
                    background: d ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.05)",
                  }}
                />
              ))}
            </div>

            {error && (
              <p style={{
                color: "rgba(255,100,100,0.9)",
                fontFamily: "Georgia, serif",
                fontSize: 13,
                letterSpacing: "0.06em",
                marginBottom: 12,
                textAlign: "center",
              }}>
                {error}
              </p>
            )}

            {loading && (
              <p style={{
                color: "rgba(180,140,255,0.6)",
                fontFamily: "Georgia, serif",
                fontSize: 13,
                letterSpacing: "0.08em",
              }}>
                Verifying…
              </p>
            )}
          </div>

          {/* Forgot code link */}
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <button
              onClick={() => { setMode("email"); setError(""); setDigits(["", "", "", ""]); }}
              style={{
                background: "none", border: "none",
                color: "rgba(180,140,255,0.5)",
                fontFamily: "Georgia, serif", fontSize: 11,
                letterSpacing: "0.08em", cursor: "pointer", padding: 0,
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
              onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,140,255,0.85)")}
              onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(180,140,255,0.5)")}
            >
              Forgot your code? Sign in with email →
            </button>
          </div>
          </>
        )}

        {/* Email sign-in mode */}
        {mode === "email" && (
          <form onSubmit={submitEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.4)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="admin@yourchurch.org"
                autoComplete="email"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.12)",
                  borderRadius: 10, color: "#fff",
                  fontFamily: "Georgia, serif", fontSize: 14,
                  padding: "12px 16px", outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "rgba(255,255,255,0.4)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showEmailPw ? "text" : "password"}
                  value={emailPassword}
                  onChange={e => { setEmailPassword(e.target.value); setEmailError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.12)",
                    borderRadius: 10, color: "#fff",
                    fontFamily: "Georgia, serif", fontSize: 14,
                    padding: "12px 44px 12px 16px", outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPw(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(255,255,255,0.3)", padding: 0, display: "flex",
                  }}
                >
                  <EyeIcon open={showEmailPw} />
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowForgotEmail(v => !v)}
                style={{
                  background: "none", border: "none",
                  color: "rgba(180,140,255,0.45)",
                  fontFamily: "Georgia, serif", fontSize: 11,
                  letterSpacing: "0.07em", cursor: "pointer", padding: 0,
                }}
                onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = "rgba(180,140,255,0.8)")}
                onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = "rgba(180,140,255,0.45)")}
              >
                Forgot email or password?
              </button>
              {showForgotEmail && (
                <div style={{
                  textAlign: "left", marginTop: 8, padding: "12px 14px",
                  background: "rgba(180,140,255,0.07)",
                  border: "1px solid rgba(180,140,255,0.18)",
                  borderRadius: 8,
                }}>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Georgia, serif", fontSize: 12, lineHeight: 1.7, margin: 0 }}>
                    Your email and password are the ones used when your church registered. Contact your church administrator to look them up, or email us at{" "}
                    <a href="mailto:support@hisaltar.com" style={{ color: "rgba(180,140,255,0.8)", textDecoration: "none" }}>
                      support@hisaltar.com
                    </a>
                    {" "}and we'll help you recover access.
                  </p>
                </div>
              )}
            </div>

            {emailError && (
              <p style={{ color: "rgba(255,100,100,0.9)", fontFamily: "Georgia, serif", fontSize: 12, textAlign: "center", margin: 0 }}>
                {emailError}
              </p>
            )}

            <button
              type="submit"
              disabled={emailLoading}
              style={{
                background: emailLoading ? "rgba(124,58,237,0.4)" : "rgba(124,58,237,0.85)",
                border: "none", borderRadius: 10, color: "#fff",
                fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.08em",
                padding: "14px", cursor: emailLoading ? "default" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {emailLoading ? "Signing in…" : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("campus"); setEmailError(""); setEmail(""); setEmailPassword(""); }}
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.25)", fontFamily: "Georgia, serif",
                fontSize: 12, letterSpacing: "0.08em", cursor: "pointer", padding: 0,
                textAlign: "center",
              }}
            >
              ← Back to code entry
            </button>
          </form>
        )}

        {/* Back link */}
        {mode !== "email" && (
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <button
              onClick={() => navigate("/")}
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.22)",
                fontFamily: "Georgia, serif", fontSize: 12,
                letterSpacing: "0.08em", cursor: "pointer", padding: 0,
              }}
              onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)")}
              onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.22)")}
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

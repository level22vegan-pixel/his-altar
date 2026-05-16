import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { setCampusSession } from "@/lib/session";

type Mode = "select" | "campus";

export default function PinEntryPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("campus");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

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
      const res = await fetch("/api/campus-passwords/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Invalid code. Please try again.");
        setDigits(["", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        return;
      }
      setCampusSession(data.campus, data.role ?? "campus");
      // Replace /enter in history so back button skips the code screen
      if (data.role === "attendance") {
        const campusRoutes: Record<string, string> = {
          HALLMARK: "/campus/hallmark",
          ARROWHEAD: "/campus/arrowhead",
          RIVERSIDE: "/campus/riverside",
          POMONA: "/campus/pomona",
          LA: "/campus/la",
          ARIZONA: "/campus/arizona",
        };
        const dest = campusRoutes[data.campus] ?? `/campus/${data.campus.toLowerCase().replace(/\s+/g, "-")}`;
        navigate(dest, { replace: true });
      } else {
        navigate("/team", { replace: true });
      }
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
            {mode === "campus" ? "Campus Access" : "His Altar"}
          </h1>
          <p style={{
            color: "rgba(255,255,255,0.3)",
            fontFamily: "Georgia, serif",
            fontSize: 12,
            letterSpacing: "0.1em",
            marginTop: 8,
          }}>
            {mode === "campus" ? "Enter your 4-digit campus code" : "Select how you're signing in"}
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
        )}

        {/* Back link */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.22)",
              fontFamily: "Georgia, serif",
              fontSize: 12,
              letterSpacing: "0.08em",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)")}
            onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.22)")}
          >
            ← Back
          </button>
        </div>

      </div>
    </div>
  );
}

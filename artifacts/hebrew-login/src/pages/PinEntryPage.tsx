import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { setOrgSession } from "@/lib/session";

export default function PinEntryPage() {
  const [, navigate] = useLocation();
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

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

  async function submit(pin: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orgs/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid PIN. Please try again.");
        setDigits(["", "", "", ""]);
        setTimeout(() => inputs.current[0]?.focus(), 50);
        return;
      }
      setOrgSession(data.orgId, data.orgName, data.token);
      navigate("/team");
    } catch {
      setError("Connection error. Please try again.");
      setDigits(["", "", "", ""]);
    } finally {
      setLoading(false);
    }
  }

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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0f0a1a 60%, #0a0a0f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ fontSize: 36, marginBottom: 10, filter: "drop-shadow(0 0 10px rgba(180,140,255,0.3))" }}>✝</div>
        <h1 style={{
          color: "#ffffff",
          fontFamily: "Georgia, serif",
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: "0.06em",
          margin: 0,
        }}>
          Enter Your PIN
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.35)",
          fontFamily: "Georgia, serif",
          fontSize: 13,
          letterSpacing: "0.08em",
          marginTop: 8,
        }}>
          4-digit church access code
        </p>
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 32 }}>
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
          marginBottom: 16,
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

      <div style={{ marginTop: 48, textAlign: "center" }}>
        <a
          href="/"
          style={{
            color: "rgba(255,255,255,0.2)",
            fontFamily: "Georgia, serif",
            fontSize: 12,
            letterSpacing: "0.08em",
            textDecoration: "none",
          }}
          onMouseOver={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.45)")}
          onMouseOut={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.2)")}
        >
          ← Back
        </a>
      </div>
    </div>
  );
}

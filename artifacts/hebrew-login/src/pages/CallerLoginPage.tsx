import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListPxpCallers } from "@workspace/api-client-react";
import { setCallerSession } from "@/lib/session";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid hsl(38 25% 22%)",
  background: "hsl(35 18% 7%)",
  color: "hsl(38 60% 70%)",
  fontFamily: "Georgia, serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const,
  letterSpacing: "0.05em",
};

export default function CallerLoginPage() {
  const [, navigate] = useLocation();
  const [campus, setCampus] = useState("HALLMARK");
  const [selectedCallerId, setSelectedCallerId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const { data, isLoading } = useListPxpCallers({ campus });

  const callers = data?.callers ?? [];

  // Reset caller selection when campus changes
  useEffect(() => {
    setSelectedCallerId(null);
    setPassword("");
    setError("");
  }, [campus]);

  function handleLogin() {
    if (!selectedCallerId || !password.trim()) return;
    const caller = callers.find(c => c.id === selectedCallerId);
    if (!caller) return;

    if (password.trim().toUpperCase() === caller.password.toUpperCase()) {
      setCallerSession(caller.id, caller.name, caller.campus);
      navigate("/admin/pxp");
    } else {
      setError("Incorrect password");
      setShaking(true);
      setPassword("");
      setTimeout(() => {
        setShaking(false);
        setError("");
      }, 1200);
    }
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 60% 40%, hsl(35 30% 16%) 0%, hsl(35 20% 9%) 60%, hsl(30 18% 7%) 100%)" }}
    >
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.8) 100%)" }} />

      {/* Back to login */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(38 45% 55%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← Back
      </button>

      <div className="relative z-10 w-full max-w-xs px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div style={{ fontFamily: "'Arial Hebrew', 'Arial Unicode MS', Arial, sans-serif", fontSize: 48, color: "hsl(38 80% 60%)", marginBottom: 8 }}>
            א
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "hsl(38 55% 62%)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
            Caller Sign In
          </h1>
          <div style={{ width: 40, height: 1, background: "hsl(38 30% 30%)", margin: "10px auto 0" }} />
        </div>

        {/* Form */}
        <div className={shaking ? "shake" : ""} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Campus */}
          <select
            style={{ ...inputStyle, appearance: "none" as const }}
            value={campus}
            onChange={e => setCampus(e.target.value)}
          >
            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Caller name */}
          <select
            style={{ ...inputStyle, appearance: "none" as const, color: selectedCallerId ? "hsl(38 60% 70%)" : "hsl(38 30% 42%)" }}
            value={selectedCallerId ?? ""}
            onChange={e => setSelectedCallerId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={isLoading || callers.length === 0}
          >
            <option value="">
              {isLoading ? "Loading…" : callers.length === 0 ? "No callers registered" : "Select your name…"}
            </option>
            {callers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Password */}
          <input
            type="password"
            style={{ ...inputStyle, border: error ? "1px solid hsl(0 55% 40%)" : inputStyle.border, color: error ? "hsl(0 70% 60%)" : inputStyle.color, letterSpacing: "0.2em" }}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
          />

          {error && (
            <div style={{ color: "hsl(0 65% 55%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!selectedCallerId || !password.trim()}
            style={{
              marginTop: 4,
              padding: "13px 0",
              borderRadius: 8,
              background: selectedCallerId && password.trim()
                ? "linear-gradient(135deg, hsl(38 45% 22%), hsl(35 40% 16%))"
                : "hsl(35 18% 10%)",
              border: `1px solid ${selectedCallerId && password.trim() ? "hsl(38 40% 32%)" : "hsl(38 20% 16%)"}`,
              color: selectedCallerId && password.trim() ? "hsl(38 70% 65%)" : "hsl(38 20% 32%)",
              fontFamily: "Georgia, serif",
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: selectedCallerId && password.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

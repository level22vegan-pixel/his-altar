import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListPxpCallers } from "@workspace/api-client-react";
import { setCallerSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 25% 22%)",
  background: "hsl(270 10% 4%)",
  color: "hsl(270 40% 88%)",
  fontFamily: "Georgia, serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const,
  letterSpacing: "0.05em",
};

export default function CallerLoginPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const [campus, setCampus] = useState(() => CAMPUSES[0] ?? "HALLMARK");
  const [selectedCallerId, setSelectedCallerId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const { data, isLoading } = useListPxpCallers({ campus });
  const callers = data?.callers ?? [];

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

  const canSubmit = !!selectedCallerId && !!password.trim();

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "hsl(270 8% 3%)" }}
    >
      <button
        onClick={() => navigate("/team")}
        style={{
          position: "fixed",
          top: 20,
          left: 24,
          color: "hsl(270 45% 68%)",
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          background: "hsl(270 20% 9%)",
          border: "1px solid hsl(270 30% 22%)",
          borderRadius: 6,
          padding: "5px 12px",
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        ← Back
      </button>

      <div className="relative z-10 w-full max-w-xs px-4">
        <div className="text-center mb-10">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "hsl(270 55% 88%)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
            Follow-Up Team Sign In
          </h1>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, hsl(270 60% 45%), transparent)", margin: "10px auto 0" }} />
        </div>

        <div className={shaking ? "shake" : ""} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select
            style={{ ...inputStyle, appearance: "none" as const }}
            value={campus}
            onChange={e => setCampus(e.target.value)}
          >
            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            style={{ ...inputStyle, appearance: "none" as const, color: selectedCallerId ? "hsl(270 40% 88%)" : "hsl(270 20% 42%)" }}
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

          <input
            type="password"
            style={{
              ...inputStyle,
              border: error ? "1px solid hsl(0 55% 40%)" : inputStyle.border,
              color: error ? "hsl(0 70% 60%)" : inputStyle.color,
              letterSpacing: "0.2em",
            }}
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
            disabled={!canSubmit}
            style={{
              marginTop: 4,
              padding: "13px 0",
              borderRadius: 8,
              background: canSubmit
                ? "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))"
                : "hsl(270 12% 8%)",
              border: `1px solid ${canSubmit ? "hsl(270 55% 46%)" : "hsl(270 15% 14%)"}`,
              color: canSubmit ? "hsl(270 20% 95%)" : "hsl(270 15% 32%)",
              fontFamily: "Georgia, serif",
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "not-allowed",
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

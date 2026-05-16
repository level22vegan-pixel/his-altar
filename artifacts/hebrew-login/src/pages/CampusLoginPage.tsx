import { useState } from "react";
import { useLocation } from "wouter";
import { setCampusSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const ROLES = [
  { id: "lead", label: "Lead", desc: "Admin access for your campus" },
  { id: "deputy_lead", label: "Deputy Lead", desc: "Altar member check-in" },
];

export default function CampusLoginPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const [campus, setCampus] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!campus || !role || !password) {
      setError("Please select a campus, role, and enter your password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/campus-passwords/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campus, role, password }),
      });
      const data = await res.json();
      if (data.valid) {
        setCampusSession(campus, role);
        if (role === "lead") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!campus && !!role && !!password && !loading;

  return (
    <div style={{ minHeight: "100vh", background: "hsl(270 8% 3%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", position: "relative", overflow: "hidden" }}>

      <button
        onClick={() => navigate("/")}
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

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: "hsl(270 55% 88%)", fontFamily: "Georgia, serif", fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0, textShadow: "0 0 30px hsl(270 60% 50% / 0.4)" }}>
            Campus Login
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "10px auto 0" }} />
          <p style={{ color: "hsl(270 30% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", marginTop: 8 }}>
            Select your campus and role
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10 }}>Campus</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {CAMPUSES.map(c => (
              <button
                key={c}
                onClick={() => setCampus(c)}
                style={{
                  padding: "10px 6px",
                  fontFamily: "Georgia, serif",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: campus === c ? "hsl(270 50% 16%)" : "hsl(270 12% 7%)",
                  color: campus === c ? "hsl(270 70% 78%)" : "hsl(270 20% 48%)",
                  border: campus === c ? "1px solid hsl(270 50% 34%)" : "1px solid hsl(270 20% 14%)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10 }}>Role</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  padding: "12px 16px",
                  fontFamily: "Georgia, serif",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "left",
                  background: role === r.id ? "hsl(270 50% 16%)" : "hsl(270 12% 7%)",
                  border: role === r.id ? "1px solid hsl(270 50% 34%)" : "1px solid hsl(270 20% 14%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: role === r.id ? "hsl(270 70% 80%)" : "hsl(270 40% 70%)", fontSize: 13, fontWeight: "bold", letterSpacing: "0.1em" }}>{r.label}</div>
                  <div style={{ color: "hsl(270 20% 48%)", fontSize: 11, marginTop: 2 }}>{r.desc}</div>
                </div>
                {role === r.id && <span style={{ color: "hsl(270 65% 72%)", fontSize: 14 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ color: "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10 }}>Password</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Enter your password"
            style={{
              width: "100%",
              background: "hsl(270 10% 4%)",
              border: `1px solid ${error ? "hsl(0 50% 38%)" : "hsl(270 25% 22%)"}`,
              color: "hsl(270 40% 88%)",
              fontFamily: "Georgia, serif",
              fontSize: 14,
              borderRadius: 6,
              padding: "11px 14px",
              outline: "none",
              boxSizing: "border-box",
              letterSpacing: "0.1em",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 14, textAlign: "center", letterSpacing: "0.05em" }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            background: canSubmit
              ? "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))"
              : "hsl(270 12% 8%)",
            color: canSubmit ? "hsl(270 20% 95%)" : "hsl(270 15% 32%)",
            border: `1px solid ${canSubmit ? "hsl(270 55% 46%)" : "hsl(270 15% 14%)"}`,
            fontFamily: "Georgia, serif",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            padding: "13px 0",
            borderRadius: 6,
            cursor: canSubmit ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Verifying…" : "Sign In"}
        </button>
      </div>
    </div>
  );
}

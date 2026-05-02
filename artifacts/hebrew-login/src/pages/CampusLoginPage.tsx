import { useState } from "react";
import { useLocation } from "wouter";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const ROLES = [
  { id: "lead", label: "Lead", desc: "Admin access for your campus" },
  { id: "deputy_lead", label: "Deputy Lead", desc: "Altar member check-in" },
];

const GOLD = "hsl(38 60% 62%)";
const GOLD_DIM = "hsl(38 28% 42%)";
const GOLD_BRIGHT = "hsl(38 75% 72%)";
const BORDER = "hsl(38 18% 20%)";

export function setCampusSession(campus: string, role: string) {
  localStorage.setItem("campusSession", JSON.stringify({ campus, role }));
}

export function getCampusSession(): { campus: string; role: string } | null {
  try {
    const raw = localStorage.getItem("campusSession");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCampusSession() {
  localStorage.removeItem("campusSession");
}

export default function CampusLoginPage() {
  const [, navigate] = useLocation();
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

  return (
    <div style={{ minHeight: "100vh", background: "hsl(35 20% 9%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 30%, hsl(38 30% 12% / 0.5) 0%, transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420 }}>
        <button
          onClick={() => navigate("/")}
          style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", opacity: 0.55, marginBottom: 32, display: "block" }}
        >
          ← Back
        </button>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>Campus Login</h1>
          <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", marginTop: 8, opacity: 0.7 }}>Select your campus and role</p>
        </div>

        {/* Campus selection */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10, opacity: 0.7 }}>Campus</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {CAMPUSES.map(c => (
              <button
                key={c}
                onClick={() => setCampus(c)}
                style={{
                  padding: "10px 6px", fontFamily: "Georgia, serif", fontSize: 11,
                  letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: 6,
                  cursor: "pointer", transition: "all 0.15s",
                  background: campus === c ? "hsl(38 45% 22%)" : "hsl(35 18% 13%)",
                  color: campus === c ? GOLD_BRIGHT : GOLD_DIM,
                  border: campus === c ? "1px solid hsl(38 45% 34%)" : `1px solid ${BORDER}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Role selection */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10, opacity: 0.7 }}>Role</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                style={{
                  padding: "12px 16px", fontFamily: "Georgia, serif", borderRadius: 6,
                  cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                  background: role === r.id ? "hsl(38 45% 22%)" : "hsl(35 18% 13%)",
                  border: role === r.id ? "1px solid hsl(38 45% 34%)" : `1px solid ${BORDER}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ color: role === r.id ? GOLD_BRIGHT : GOLD, fontSize: 13, fontWeight: "bold", letterSpacing: "0.1em" }}>{r.label}</div>
                  <div style={{ color: GOLD_DIM, fontSize: 11, marginTop: 2, opacity: 0.75 }}>{r.desc}</div>
                </div>
                {role === r.id && <span style={{ color: GOLD_BRIGHT, fontSize: 14 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 10, opacity: 0.7 }}>Password</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Enter your password"
            style={{
              width: "100%", background: "hsl(35 18% 12%)", border: `1px solid ${error ? "hsl(0 50% 38%)" : BORDER}`,
              color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 14, borderRadius: 6,
              padding: "11px 14px", outline: "none", boxSizing: "border-box", letterSpacing: "0.1em",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        {error && (
          <p style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 14, textAlign: "center", letterSpacing: "0.05em" }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !campus || !role || !password}
          style={{
            width: "100%", background: "hsl(38 50% 28%)", color: GOLD_BRIGHT,
            border: "1px solid hsl(38 40% 36%)", fontFamily: "Georgia, serif",
            fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase",
            padding: "13px 0", borderRadius: 6, cursor: "pointer",
            opacity: !campus || !role || !password ? 0.4 : 1, transition: "opacity 0.2s",
          }}
        >
          {loading ? "Verifying..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}

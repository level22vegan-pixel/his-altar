import { useState } from "react";
import { useLocation } from "wouter";
import { useVerifyCampusPassword } from "@workspace/api-client-react";
import { setCampusSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const ROLES = [
  { id: "lead", label: "Lead" },
  { id: "deputy_lead", label: "Deputy Lead" },
];

export default function StaffLoginPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();

  const [campus, setCampus] = useState(CAMPUSES[0] ?? "");
  const [role, setRole] = useState("lead");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const verify = useVerifyCampusPassword();

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "hsl(35 18% 10%)",
    border: "1px solid hsl(38 20% 22%)",
    borderRadius: 6,
    color: "hsl(38 55% 70%)",
    fontFamily: "Georgia, serif",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "hsl(38 30% 45%)",
    fontFamily: "Georgia, serif",
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password.trim()) { setError("Enter your password"); return; }
    verify.mutate(
      { data: { campus, role, password } },
      {
        onSuccess: (res) => {
          if (res.valid) {
            setCampusSession(res.campus ?? campus, res.role ?? role);
            navigate("/home");
          } else {
            setError("Incorrect password");
          }
        },
        onError: () => setError("Something went wrong — try again"),
      }
    );
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
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button
          onClick={() => navigate("/")}
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
          Staff Login
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
          Campus lead access
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Campus</label>
            <select
              value={campus}
              onChange={e => setCampus(e.target.value)}
              style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
            >
              {CAMPUSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <div style={{ display: "flex", gap: 8 }}>
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    fontFamily: "Georgia, serif",
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    borderRadius: 6,
                    border: "1px solid",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: role === r.id ? "hsl(38 40% 22%)" : "hsl(35 18% 10%)",
                    borderColor: role === r.id ? "hsl(38 35% 32%)" : "hsl(38 15% 20%)",
                    color: role === r.id ? "hsl(38 70% 72%)" : "hsl(38 25% 42%)",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 44 }}
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
                  fontSize: 12,
                  fontFamily: "Georgia, serif",
                }}
              >
                {showPw ? "hide" : "show"}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: "hsl(0 60% 58%)", fontFamily: "Georgia, serif", fontSize: 12, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={verify.isPending}
            style={{
              marginTop: 4,
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
              opacity: verify.isPending ? 0.6 : 1,
            }}
          >
            {verify.isPending ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

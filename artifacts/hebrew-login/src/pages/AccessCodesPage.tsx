import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getValidCampusSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const INPUT: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "hsl(35 18% 10%)",
  border: "1px solid hsl(38 20% 22%)",
  borderRadius: 6,
  color: "hsl(38 65% 72%)",
  fontFamily: "Georgia, serif",
  fontSize: 16,
  letterSpacing: "0.3em",
  outline: "none",
  boxSizing: "border-box" as const,
  textAlign: "center" as const,
};

const LABEL: React.CSSProperties = {
  display: "block",
  color: "hsl(38 30% 42%)",
  fontFamily: "Georgia, serif",
  fontSize: 9,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  marginBottom: 6,
};

function CodeSection({
  title,
  description,
  role,
  campus,
  accentHue = 38,
}: {
  title: string;
  description: string;
  role: string;
  campus: string;
  accentHue?: number;
}) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    if (!campus) return;
    fetch("/api/campus-passwords")
      .then(r => r.json())
      .then(d => {
        const has = (d.passwords ?? []).some(
          (p: { campus: string; role: string }) => p.campus === campus && p.role === role
        );
        setExisting(has);
      })
      .catch(() => {});
  }, [campus, role, saved]);

  async function handleSave() {
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setErr("Code must be exactly 4 digits.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/campus-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campus, role, password: code }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setCode("");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setErr("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const ready = code.length === 4 && !saving;

  return (
    <div
      style={{
        marginBottom: 20,
        padding: "18px 20px",
        borderRadius: 8,
        background: `hsl(${accentHue} 20% 11%)`,
        border: `1px solid hsl(${accentHue} 22% 22%)`,
      }}
    >
      <p style={{ fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: `hsl(${accentHue} 45% 55%)`, marginBottom: 4 }}>
        {title}
      </p>
      <p style={{ color: `hsl(${accentHue} 22% 38%)`, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.03em", marginBottom: 14 }}>
        {description}
        {existing && (
          <span style={{ color: "hsl(130 45% 48%)", marginLeft: 8 }}>✓ Code set for {campus}</span>
        )}
      </p>
      {campus ? (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>{existing ? "Update" : "Set"} Code</label>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); setSaved(false); }}
                placeholder="4-digit code"
                inputMode="numeric"
                maxLength={4}
                style={INPUT}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!ready}
              style={{
                background: ready ? `hsl(${accentHue} 50% 28%)` : `hsl(${accentHue} 20% 16%)`,
                color: ready ? `hsl(${accentHue} 70% 80%)` : `hsl(${accentHue} 20% 35%)`,
                border: `1px solid hsl(${accentHue} 30% 28%)`,
                fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em",
                textTransform: "uppercase", padding: "8px 18px", borderRadius: 4,
                cursor: ready ? "pointer" : "not-allowed", whiteSpace: "nowrap",
              }}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save Code"}
            </button>
          </div>
          {err && <p style={{ color: "hsl(0 55% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginTop: 8 }}>{err}</p>}
          {saved && <p style={{ color: "hsl(130 45% 52%)", fontFamily: "Georgia, serif", fontSize: 12, marginTop: 8 }}>Code updated for {campus}.</p>}
        </>
      ) : (
        <p style={{ color: `hsl(${accentHue} 22% 35%)`, fontFamily: "Georgia, serif", fontSize: 12, fontStyle: "italic" }}>
          Select a campus above to manage codes.
        </p>
      )}
    </div>
  );
}

export default function AccessCodesPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const sessionCampus = getValidCampusSession()?.campus ?? null;
  const [campus, setCampus] = useState<string>(sessionCampus ?? CAMPUSES[0] ?? "");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px 60px",
        background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button
          onClick={() => navigate("/admin")}
          style={{
            marginBottom: 28, color: "hsl(38 30% 42%)", fontFamily: "Georgia, serif",
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            background: "none", border: "none", cursor: "pointer", opacity: 0.7,
          }}
        >
          ← Admin Panel
        </button>

        <h1 style={{ textAlign: "center", color: "hsl(38 60% 65%)", fontFamily: "Georgia, serif", fontSize: 20, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4 }}>
          Access Codes
        </h1>
        <p style={{ textAlign: "center", color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 28 }}>
          Manage staff login codes by campus
        </p>

        {/* Campus selector */}
        {!sessionCampus && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...LABEL, marginBottom: 8 }}>Campus</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => setCampus(c)}
                  style={{
                    padding: "8px 4px", fontFamily: "Georgia, serif", fontSize: 10,
                    letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                    borderRadius: 6,
                    background: campus === c ? "hsl(38 45% 24%)" : "hsl(35 18% 13%)",
                    color: campus === c ? "hsl(38 70% 72%)" : "hsl(38 28% 42%)",
                    border: campus === c ? "1px solid hsl(38 45% 36%)" : "1px solid hsl(38 15% 20%)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {sessionCampus && (
          <div style={{ marginBottom: 20, padding: "10px 16px", background: "hsl(38 25% 14%)", border: "1px solid hsl(38 30% 22%)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "hsl(38 28% 46%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>Campus</span>
            <span style={{ color: "hsl(38 70% 72%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: "bold" }}>{sessionCampus}</span>
          </div>
        )}

        <CodeSection
          title="Lead Access"
          description="Full admin access — altar reports, roster, Dbanc, PXP, and settings."
          role="lead"
          campus={campus}
          accentHue={38}
        />
        <CodeSection
          title="Attendance Code"
          description="Check-in only — no admin tools or team page access."
          role="attendance"
          campus={campus}
          accentHue={200}
        />
        <CodeSection
          title="Altar Worker Code"
          description="Goes directly to the prayer contact form — no team page, no admin tools."
          role="altar"
          campus={campus}
          accentHue={270}
        />
      </div>
    </div>
  );
}

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
  letterSpacing: "0.4em",
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

type CodeEntry = { campus: string; role: string; code: string };

function CodeSection({
  title,
  description,
  badge,
  role,
  campus,
  currentCode,
  accentHue = 38,
}: {
  title: string;
  description: string;
  badge: string;
  role: string;
  campus: string;
  currentCode?: string;
  accentHue?: number;
}) {
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [show, setShow] = useState(false);

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
  const displayCode = show ? (currentCode ?? "——") : (currentCode ? "••••" : "——");

  return (
    <div
      style={{
        marginBottom: 16,
        padding: "16px 18px",
        borderRadius: 10,
        background: `hsl(${accentHue} 20% 10%)`,
        border: `1px solid hsl(${accentHue} 22% 20%)`,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: `hsl(${accentHue} 55% 60%)`, margin: 0 }}>
            {title}
          </p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: `hsl(${accentHue} 25% 38%)`, letterSpacing: "0.06em", margin: "3px 0 0" }}>
            {badge}
          </p>
        </div>
        {/* Current code display */}
        {campus ? (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: `hsl(${accentHue} 25% 38%)`, margin: "0 0 3px" }}>
              Current
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 15, letterSpacing: "0.35em", color: currentCode ? `hsl(${accentHue} 65% 68%)` : `hsl(${accentHue} 20% 32%)` }}>
                {displayCode}
              </span>
              {currentCode && (
                <button
                  onClick={() => setShow(s => !s)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: `hsl(${accentHue} 30% 40%)`, fontSize: 11, padding: "0 2px", fontFamily: "Georgia, serif" }}
                >
                  {show ? "hide" : "show"}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Description */}
      <p style={{ color: `hsl(${accentHue} 20% 36%)`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.03em", margin: "0 0 14px", lineHeight: 1.5 }}>
        {description}
      </p>

      {/* Input + save */}
      {campus ? (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>{currentCode ? "Update" : "Set"} Code</label>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); setSaved(false); }}
                placeholder="• • • •"
                inputMode="numeric"
                maxLength={4}
                style={INPUT}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!ready}
              style={{
                background: ready ? `hsl(${accentHue} 50% 26%)` : `hsl(${accentHue} 18% 14%)`,
                color: ready ? `hsl(${accentHue} 70% 78%)` : `hsl(${accentHue} 18% 34%)`,
                border: `1px solid hsl(${accentHue} 28% 26%)`,
                fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em",
                textTransform: "uppercase", padding: "10px 16px", borderRadius: 6,
                cursor: ready ? "pointer" : "not-allowed", whiteSpace: "nowrap",
              }}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </div>
          {err && <p style={{ color: "hsl(0 55% 55%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 8 }}>{err}</p>}
          {saved && <p style={{ color: "hsl(130 45% 52%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 8 }}>Code saved for {campus}.</p>}
        </>
      ) : (
        <p style={{ color: `hsl(${accentHue} 20% 32%)`, fontFamily: "Georgia, serif", fontSize: 11, fontStyle: "italic" }}>
          Select a campus above.
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
  const [codes, setCodes] = useState<CodeEntry[]>([]);

  useEffect(() => {
    fetch("/api/campus-passwords")
      .then(r => r.json())
      .then(d => setCodes(d.passwords ?? []))
      .catch(() => {});
  }, [campus]);

  function currentCode(role: string) {
    return codes.find(c => c.campus === campus && c.role === role)?.code;
  }

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
      <div style={{ width: "100%", maxWidth: 440 }}>
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
          Staff login codes by campus
        </p>

        {/* Campus selector */}
        {!sessionCampus && CAMPUSES.length > 0 && (
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
          title="Full Access"
          badge="Teams page · All tools"
          description="Brings staff to the Teams page with access to Altar, Follow-Up Calls, and the Admin panel."
          role="lead"
          campus={campus}
          currentCode={currentCode("lead")}
          accentHue={38}
        />

        <CodeSection
          title="Ministry Code"
          badge="Teams page · Altar & Follow-Up Calls only"
          description="Brings staff to the Teams page to do altar intake or follow-up calls. Admin panel is not accessible."
          role="altar"
          campus={campus}
          currentCode={currentCode("altar")}
          accentHue={200}
        />

        <CodeSection
          title="Attendance Code"
          badge="Direct to check-in · No Teams page"
          description="Skips the Teams page and goes straight to service time check-in for that campus."
          role="attendance"
          campus={campus}
          currentCode={currentCode("attendance")}
          accentHue={130}
        />
      </div>
    </div>
  );
}

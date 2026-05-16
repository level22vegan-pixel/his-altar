import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getValidAdminSession } from "@/lib/session";

const GOLD        = "hsl(38 72% 62%)";
const GOLD_BRIGHT = "hsl(38 85% 72%)";
const GOLD_DIM    = "hsl(38 40% 46%)";
const BORDER      = "hsl(38 22% 22%)";
const BG          = "hsl(30 18% 8%)";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const SUNDAY_SLOTS  = ["7am", "8am", "9am", "10am", "11am", "12pm", "1pm"];
const WEDNESDAY_SLOTS = ["6pm", "7pm", "8pm"];

const ADMIN_PASSWORD = "1001";

type ServiceMap = Record<string, { sunday: string[]; wednesday: string[] }>;

function toFlat(map: ServiceMap): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [campus, { sunday, wednesday }] of Object.entries(map)) {
    result[campus] = [
      ...sunday.map(t => `Sunday ${t}`),
      ...wednesday.map(t => `Wednesday ${t}`),
    ];
  }
  return result;
}

function fromFlat(flat: Record<string, string[]>): ServiceMap {
  const result: ServiceMap = {};
  for (const campus of CAMPUSES) {
    const times = flat[campus] ?? [];
    result[campus] = {
      sunday:    times.filter(t => t.startsWith("Sunday")).map(t => t.replace("Sunday ", "")),
      wednesday: times.filter(t => t.startsWith("Wednesday")).map(t => t.replace("Wednesday ", "")),
    };
  }
  return result;
}

const DEFAULT_MAP: ServiceMap = {
  HALLMARK:  { sunday: ["8am", "10am", "12pm"], wednesday: ["7pm"] },
  ARROWHEAD: { sunday: ["10am", "12pm"],        wednesday: ["7pm"] },
  RIVERSIDE: { sunday: ["10am", "12pm"],        wednesday: []      },
  POMONA:    { sunday: ["9am", "11am"],         wednesday: ["7pm"] },
  LA:        { sunday: ["8am", "9am"],          wednesday: ["7pm"] },
  ARIZONA:   { sunday: ["9am", "11am"],         wednesday: ["7pm"] },
};

export default function AdminServiceTimesPage() {
  const [, navigate] = useLocation();
  const [map, setMap]       = useState<ServiceMap>(DEFAULT_MAP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

  const adminSession = getValidAdminSession();

  useEffect(() => {
    fetch("/api/config/service-times")
      .then(r => r.json())
      .then(data => {
        if (data.serviceTimes && Object.keys(data.serviceTimes).length > 0) {
          setMap(fromFlat(data.serviceTimes));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(campus: string, day: "sunday" | "wednesday", slot: string) {
    setMap(prev => {
      const current = prev[campus][day];
      const next = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot].sort((a, b) => {
            const rank = [...SUNDAY_SLOTS, ...WEDNESDAY_SLOTS];
            return rank.indexOf(a) - rank.indexOf(b);
          });
      return { ...prev, [campus]: { ...prev[campus], [day]: next } };
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const flat = toFlat(map);
      const res = await fetch("/api/config/service-times", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: ADMIN_PASSWORD, serviceTimes: flat }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message ?? "Save failed");
        return;
      }
      localStorage.setItem("customServiceTimes", JSON.stringify(flat));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error — try again");
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setMap(DEFAULT_MAP);
    setSaved(false);
  }

  const labelStyle: React.CSSProperties = {
    color: GOLD_DIM,
    fontFamily: "Georgia, serif",
    fontSize: 9,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };

  const chipBase: React.CSSProperties = {
    border: `1px solid ${BORDER}`,
    borderRadius: 5,
    padding: "4px 10px",
    fontFamily: "Georgia, serif",
    fontSize: 11,
    letterSpacing: "0.08em",
    cursor: "pointer",
    transition: "all 0.15s",
    userSelect: "none",
  };

  return (
    <div style={{ minHeight: "100dvh", background: BG, padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 10px", borderBottom: `1px solid ${BORDER}` }}>
        <button
          onClick={() => navigate("/admin")}
          style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", opacity: 0.6 }}
        >
          ← Admin
        </button>
        <h1 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
          Service Times
        </h1>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.06em", marginBottom: 24, opacity: 0.7, textAlign: "center" }}>
          Select which service times each campus holds
        </p>

        {loading ? (
          <div style={{ textAlign: "center", color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 13, marginTop: 40 }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {CAMPUSES.map(campus => (
              <div
                key={campus}
                style={{ background: "hsl(35 20% 11%)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}
              >
                <div style={{ color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
                  {campus}
                </div>

                {/* Sunday */}
                <div style={{ marginBottom: 12 }}>
                  <span style={labelStyle}>Sunday</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SUNDAY_SLOTS.map(slot => {
                      const on = map[campus]?.sunday.includes(slot) ?? false;
                      return (
                        <button
                          key={slot}
                          onClick={() => toggle(campus, "sunday", slot)}
                          style={{
                            ...chipBase,
                            background: on ? "hsl(38 55% 28%)" : "hsl(35 18% 14%)",
                            color:      on ? GOLD_BRIGHT        : GOLD_DIM,
                            borderColor: on ? "hsl(38 40% 36%)" : BORDER,
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wednesday */}
                <div>
                  <span style={labelStyle}>Wednesday</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {WEDNESDAY_SLOTS.map(slot => {
                      const on = map[campus]?.wednesday.includes(slot) ?? false;
                      return (
                        <button
                          key={slot}
                          onClick={() => toggle(campus, "wednesday", slot)}
                          style={{
                            ...chipBase,
                            background: on ? "hsl(200 45% 24%)" : "hsl(35 18% 14%)",
                            color:      on ? "hsl(200 70% 76%)" : GOLD_DIM,
                            borderColor: on ? "hsl(200 40% 32%)" : BORDER,
                          }}
                        >
                          {slot}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => toggle(campus, "wednesday", "none")}
                      style={{
                        ...chipBase,
                        background: (map[campus]?.wednesday.length === 0) ? "hsl(0 25% 18%)" : "hsl(35 18% 14%)",
                        color:      (map[campus]?.wednesday.length === 0) ? "hsl(0 55% 62%)" : GOLD_DIM,
                        borderColor: (map[campus]?.wednesday.length === 0) ? "hsl(0 35% 26%)" : BORDER,
                        display: "none",
                      }}
                    >
                      None
                    </button>
                  </div>
                  {map[campus]?.wednesday.length === 0 && (
                    <div style={{ color: "hsl(38 30% 36%)", fontFamily: "Georgia, serif", fontSize: 10, marginTop: 5, letterSpacing: "0.1em" }}>No Wednesday service</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "hsl(0 30% 14%)", border: "1px solid hsl(0 40% 24%)", borderRadius: 7, color: "hsl(0 60% 68%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.06em" }}>
            {error}
          </div>
        )}

        {/* Actions */}
        {!loading && (
          <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                background: saved ? "hsl(130 40% 22%)" : "hsl(38 50% 28%)",
                color: saved ? "hsl(130 65% 68%)" : GOLD_BRIGHT,
                border: `1px solid ${saved ? "hsl(130 40% 30%)" : "hsl(38 38% 36%)"}`,
                borderRadius: 7,
                padding: "12px 0",
                fontFamily: "Georgia, serif",
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
            </button>
            <button
              onClick={resetToDefaults}
              style={{
                background: "none",
                color: GOLD_DIM,
                border: `1px solid ${BORDER}`,
                borderRadius: 7,
                padding: "12px 16px",
                fontFamily: "Georgia, serif",
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: 0.6,
              }}
            >
              Reset
            </button>
          </div>
        )}

        {adminSession && (
          <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.08em", textAlign: "center", marginTop: 20, opacity: 0.45 }}>
            Changes apply immediately across all calendar views
          </p>
        )}
      </div>
    </div>
  );
}

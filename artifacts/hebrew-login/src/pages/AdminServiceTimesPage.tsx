import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const GOLD        = "hsl(38 72% 62%)";
const GOLD_BRIGHT = "hsl(38 85% 72%)";
const GOLD_DIM    = "hsl(38 40% 46%)";
const BORDER      = "hsl(38 22% 22%)";
const BG          = "hsl(30 18% 8%)";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ADMIN_PASSWORD = "1001";

// campus → day → comma-separated times string (empty = no service that day)
type CampusDays = Record<string, string>;
type CampusMap  = Record<string, CampusDays>;

function toFlat(map: CampusMap): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [campus, days] of Object.entries(map)) {
    const times: string[] = [];
    for (const day of DAYS) {
      const raw = days[day]?.trim() ?? "";
      if (!raw) continue;
      for (const t of raw.split(",")) {
        const cleaned = t.trim();
        if (cleaned) times.push(`${day} ${cleaned}`);
      }
    }
    result[campus] = times;
  }
  return result;
}

function fromFlat(flat: Record<string, string[]>): CampusMap {
  const result: CampusMap = {};
  for (const [campus, times] of Object.entries(flat)) {
    const days: CampusDays = {};
    for (const day of DAYS) {
      const slots = times
        .filter(t => t.startsWith(day + " "))
        .map(t => t.slice(day.length + 1));
      if (slots.length) days[day] = slots.join(", ");
    }
    result[campus] = days;
  }
  return result;
}

const DEFAULT_MAP: CampusMap = {
  HALLMARK: { Sunday: "8am, 10am, 12pm", Wednesday: "7pm" },
};

const inp: React.CSSProperties = {
  flex: 1,
  background: "hsl(35 18% 12%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "7px 10px",
  color: GOLD_BRIGHT,
  fontFamily: "Georgia, serif",
  fontSize: 12,
  letterSpacing: "0.04em",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default function AdminServiceTimesPage() {
  const [, navigate] = useLocation();
  const [map, setMap]       = useState<CampusMap>(DEFAULT_MAP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState("");

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

  function setTime(campus: string, day: string, value: string) {
    setMap(prev => ({
      ...prev,
      [campus]: { ...(prev[campus] ?? {}), [day]: value },
    }));
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

  const campuses = Object.keys(map);

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
        <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.08em", marginBottom: 24, opacity: 0.65, textAlign: "center", lineHeight: 1.6 }}>
          Enter service times for each day — separate multiple times with commas.<br />
          <span style={{ opacity: 0.6 }}>Leave blank to skip that day.</span>
        </p>

        {loading ? (
          <div style={{ textAlign: "center", color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 13, marginTop: 40 }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {campuses.map(campus => (
              <div
                key={campus}
                style={{ background: "hsl(35 20% 11%)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px" }}
              >
                <div style={{ color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
                  {campus}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {DAYS.map(day => {
                    const val = map[campus]?.[day] ?? "";
                    const active = val.trim().length > 0;
                    return (
                      <div key={day} style={{ display: "grid", gridTemplateColumns: "96px 1fr", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontFamily: "Georgia, serif",
                          fontSize: 11,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: active ? GOLD : GOLD_DIM,
                          opacity: active ? 1 : 0.55,
                          transition: "color 0.15s",
                        }}>
                          {day}
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={e => setTime(campus, day, e.target.value)}
                          placeholder={day === "Sunday" ? "e.g. 8am, 10am, 12pm" : day === "Wednesday" ? "e.g. 7pm" : "e.g. 7pm"}
                          style={{
                            ...inp,
                            borderColor: active ? "hsl(38 35% 32%)" : BORDER,
                          }}
                        />
                      </div>
                    );
                  })}
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

        {!loading && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%",
                background: saved ? "hsl(130 40% 22%)" : "hsl(38 50% 28%)",
                color: saved ? "hsl(130 65% 68%)" : GOLD_BRIGHT,
                border: `1px solid ${saved ? "hsl(130 40% 30%)" : "hsl(38 38% 36%)"}`,
                borderRadius: 7,
                padding: "13px 0",
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
          </div>
        )}
      </div>
    </div>
  );
}

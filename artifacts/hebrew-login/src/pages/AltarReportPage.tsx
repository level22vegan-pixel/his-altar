import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useListDailyAltarReports, useUpsertDailyAltarReport, useDeleteDailyAltarReport } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { DailyAltarReport } from "@workspace/api-client-react";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pad2(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

const GOLD = "hsl(38 60% 62%)";
const GOLD_DIM = "hsl(38 28% 42%)";
const GOLD_BRIGHT = "hsl(38 75% 72%)";
const BG = "hsl(35 20% 9%)";
const SURFACE = "hsl(35 20% 13%)";
const BORDER = "hsl(38 18% 20%)";

const INPUT_STYLE: React.CSSProperties = {
  background: "hsl(35 18% 11%)",
  border: "1px solid hsl(38 20% 24%)",
  color: GOLD_BRIGHT,
  fontFamily: "Georgia, serif",
  borderRadius: 5,
  padding: "8px 12px",
  width: "100%",
  fontSize: 14,
  outline: "none",
  textAlign: "center",
};

const LABEL_STYLE: React.CSSProperties = {
  color: GOLD_DIM,
  fontFamily: "Georgia, serif",
  fontSize: 10,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 5,
  textAlign: "center",
};

type DayReports = Record<string, DailyAltarReport[]>; // date → reports

function buildDayMap(reports: DailyAltarReport[]): DayReports {
  const map: DayReports = {};
  for (const r of reports) {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  }
  return map;
}

// ── Day Entry Card ────────────────────────────────────────────────────────────
function DayEntry({
  report,
  onDelete,
}: {
  report: DailyAltarReport;
  onDelete: (id: number) => void;
}) {
  const stats = [
    { label: "Salvations", value: report.salvations, color: "hsl(130 55% 52%)" },
    { label: "Prayers", value: report.prayers, color: "hsl(200 60% 62%)" },
    { label: "Altar Members", value: report.altarMembers, color: GOLD },
  ];
  return (
    <div style={{ background: "hsl(35 18% 16%)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", marginBottom: 8 }}>{report.campus}</div>
        <div style={{ display: "flex", gap: 18 }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: s.color, fontFamily: "Georgia, serif", fontSize: 20, fontWeight: "bold", lineHeight: 1 }}>{s.value}</div>
              <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => onDelete(report.id)} style={{ color: "hsl(0 50% 50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, opacity: 0.4, flexShrink: 0, transition: "opacity 0.2s" }} onMouseOver={e => (e.currentTarget.style.opacity = "1")} onMouseOut={e => (e.currentTarget.style.opacity = "0.4")}>✕</button>
    </div>
  );
}

// ── Add / Edit Form ───────────────────────────────────────────────────────────
function AddEntryForm({
  date,
  existingCampuses,
  onSave,
  onCancel,
}: {
  date: string;
  existingCampuses: string[];
  onSave: (data: { campus: string; salvations: number; prayers: number; altarMembers: number }) => void;
  onCancel: () => void;
}) {
  const available = CAMPUSES.filter(c => !existingCampuses.includes(c));
  const [campus, setCampus] = useState(available[0] ?? "");
  const [salvations, setSalvations] = useState("0");
  const [prayers, setPrayers] = useState("0");
  const [altarMembers, setAltarMembers] = useState("0");
  const [error, setError] = useState("");

  if (available.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0", opacity: 0.4 }}>
        <p style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 12 }}>All campuses have entries for this day</p>
        <button onClick={onCancel} style={{ marginTop: 8, color: GOLD_DIM, background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>Cancel</button>
      </div>
    );
  }

  const handleSave = () => {
    if (!campus) { setError("Select a campus"); return; }
    onSave({ campus, salvations: parseInt(salvations) || 0, prayers: parseInt(prayers) || 0, altarMembers: parseInt(altarMembers) || 0 });
  };

  return (
    <div style={{ background: "hsl(35 18% 15%)", border: `1px solid hsl(38 25% 26%)`, borderRadius: 8, padding: "16px" }}>
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL_STYLE}>Campus</label>
        <select value={campus} onChange={e => setCampus(e.target.value)} style={{ ...INPUT_STYLE, textAlign: "left" }}>
          {available.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={LABEL_STYLE}>Salvations</label>
          <input type="number" min="0" value={salvations} onChange={e => setSalvations(e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Prayers</label>
          <input type="number" min="0" value={prayers} onChange={e => setPrayers(e.target.value)} style={INPUT_STYLE} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Altar Members</label>
          <input type="number" min="0" value={altarMembers} onChange={e => setAltarMembers(e.target.value)} style={INPUT_STYLE} />
        </div>
      </div>
      {error && <p style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 10, textAlign: "center" }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={{ flex: 1, background: "hsl(38 50% 28%)", color: GOLD_BRIGHT, border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", padding: "9px 0", borderRadius: 5, cursor: "pointer" }}>Save Entry</button>
        <button onClick={onCancel} style={{ background: "none", color: GOLD_DIM, border: `1px solid ${BORDER}`, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "9px 16px", borderRadius: 5, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Day Detail Panel ──────────────────────────────────────────────────────────
function DayDetail({
  dateStr,
  reports,
  onClose,
  onSave,
  onDelete,
}: {
  dateStr: string;
  reports: DailyAltarReport[];
  onClose: () => void;
  onSave: (data: { campus: string; salvations: number; prayers: number; altarMembers: number }) => void;
  onDelete: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const date = new Date(dateStr + "T12:00:00");
  const label = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const totals = reports.reduce(
    (a, r) => ({ salvations: a.salvations + r.salvations, prayers: a.prayers + r.prayers, altarMembers: a.altarMembers + r.altarMembers }),
    { salvations: 0, prayers: 0, altarMembers: 0 }
  );

  const existingCampuses = reports.map(r => r.campus);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "hsl(30 18% 5% / 0.75)", backdropFilter: "blur(2px)" }} />

      {/* Panel */}
      <div
        style={{ position: "relative", background: "hsl(35 22% 11%)", borderRadius: "16px 16px 0 0", border: `1px solid hsl(38 22% 22%)`, borderBottom: "none", maxHeight: "82vh", overflowY: "auto", padding: "0 0 40px 0" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "hsl(38 18% 28%)" }} />
        </div>

        <div style={{ padding: "12px 20px 0" }}>
          {/* Date header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 17, letterSpacing: "0.08em", margin: 0 }}>{label}</h2>
              {reports.length > 0 && (
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <span style={{ color: "hsl(130 55% 52%)", fontFamily: "Georgia, serif", fontSize: 12 }}>✝ {totals.salvations} Salvations</span>
                  <span style={{ color: "hsl(200 60% 62%)", fontFamily: "Georgia, serif", fontSize: 12 }}>🙏 {totals.prayers} Prayers</span>
                  <span style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 12 }}>🙌 {totals.altarMembers} Members</span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 18, lineHeight: 1, opacity: 0.6 }}>✕</button>
          </div>

          {/* Existing entries */}
          {reports.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {reports.map(r => (
                <DayEntry key={r.id} report={r} onDelete={onDelete} />
              ))}
            </div>
          )}

          {/* Add entry */}
          {showForm ? (
            <AddEntryForm
              date={dateStr}
              existingCampuses={existingCampuses}
              onSave={(data) => { onSave(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          ) : existingCampuses.length < CAMPUSES.length ? (
            <button
              onClick={() => setShowForm(true)}
              style={{ width: "100%", background: SURFACE, color: GOLD_DIM, border: `1px dashed hsl(38 22% 26%)`, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", padding: "11px 0", borderRadius: 6, cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = "hsl(38 35% 36%)"; }}
              onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; e.currentTarget.style.borderColor = "hsl(38 22% 26%)"; }}
            >
              + Add Campus Entry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AltarReportPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const queryKey = ["daily-altar-reports", viewYear, viewMonth + 1];

  const { data, isLoading } = useListDailyAltarReports(
    { month: viewMonth + 1, year: viewYear },
    { query: { queryKey } }
  );

  const upsert = useUpsertDailyAltarReport();
  const deleteMut = useDeleteDailyAltarReport();

  const reports = data?.reports ?? [];
  const dayMap = buildDayMap(reports);

  const goMonth = useCallback((delta: number) => {
    setSelectedDate(null);
    setViewMonth(prev => {
      const next = prev + delta;
      if (next < 0) { setViewYear(y => y - 1); return 11; }
      if (next > 11) { setViewYear(y => y + 1); return 0; }
      return next;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goMonth(-1);
      if (e.key === "ArrowRight") goMonth(1);
      if (e.key === "Escape") setSelectedDate(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goMonth]);

  // Calendar grid calculation
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const handleSave = (data: { campus: string; salvations: number; prayers: number; altarMembers: number }) => {
    if (!selectedDate) return;
    upsert.mutate(
      { data: { date: selectedDate, ...data } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey }) }
    );
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
        // If no more entries for this date, auto-close panel
        const remaining = (dayMap[selectedDate ?? ""] ?? []).filter(r => r.id !== id);
        if (remaining.length === 0) setSelectedDate(null);
      }
    });
  };

  const selectedReports = selectedDate ? (dayMap[selectedDate] ?? []) : [];

  // Totals for the month
  const monthTotals = reports.reduce(
    (a, r) => ({ salvations: a.salvations + r.salvations, prayers: a.prayers + r.prayers, altarMembers: a.altarMembers + r.altarMembers }),
    { salvations: 0, prayers: 0, altarMembers: 0 }
  );

  return (
    <div style={{ background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 60% at 50% 10%, hsl(38 30% 12% / 0.5) 0%, transparent 70%)" }} />

      <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", maxWidth: 700, width: "100%", margin: "0 auto", padding: "16px 16px 24px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button onClick={() => navigate("/admin")} style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}>← Admin</button>
          <h1 style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>Altar Report</h1>
          <div style={{ width: 60 }} />
        </div>

        {/* Month totals bar */}
        {reports.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 18, padding: "10px 0", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "hsl(130 55% 52%)", fontFamily: "Georgia, serif", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>{monthTotals.salvations}</div>
              <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>Salvations</div>
            </div>
            <div style={{ width: 1, background: BORDER }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "hsl(200 60% 62%)", fontFamily: "Georgia, serif", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>{monthTotals.prayers}</div>
              <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>Prayers</div>
            </div>
            <div style={{ width: 1, background: BORDER }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ color: GOLD, fontFamily: "Georgia, serif", fontSize: 22, fontWeight: "bold", lineHeight: 1 }}>{monthTotals.altarMembers}</div>
              <div style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 3 }}>Altar Members</div>
            </div>
          </div>
        )}

        {/* Month navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
          <button onClick={() => goMonth(-1)} style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 36, height: 36, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = "hsl(38 30% 30%)"; }} onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; e.currentTarget.style.borderColor = BORDER; }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <span style={{ color: GOLD_BRIGHT, fontFamily: "Georgia, serif", fontSize: 18, letterSpacing: "0.1em" }}>{MONTH_NAMES[viewMonth]}</span>
            <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 14, marginLeft: 8 }}>{viewYear}</span>
          </div>
          <button onClick={() => goMonth(1)} style={{ color: GOLD_DIM, background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, width: 36, height: 36, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseOver={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.borderColor = "hsl(38 30% 30%)"; }} onMouseOut={e => { e.currentTarget.style.color = GOLD_DIM; e.currentTarget.style.borderColor = BORDER; }}>›</button>
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DAYS_OF_WEEK.map(d => (
            <div key={d} style={{ textAlign: "center", color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", paddingBottom: 6 }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 60, opacity: 0.4 }}>
            <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 13 }}>Loading...</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {/* Empty cells for first week offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const dayReports = dayMap[dateStr] ?? [];
              const hasData = dayReports.length > 0;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = new Date(viewYear, viewMonth, day).getDay() % 6 === 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: 8,
                    border: isSelected
                      ? "2px solid hsl(38 55% 45%)"
                      : isToday
                        ? "1px solid hsl(38 35% 32%)"
                        : `1px solid ${hasData ? "hsl(38 22% 22%)" : "hsl(38 12% 16%)"}`,
                    background: isSelected
                      ? "hsl(38 40% 18%)"
                      : hasData
                        ? "hsl(35 22% 15%)"
                        : "hsl(35 18% 12%)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    transition: "all 0.15s",
                    padding: 0,
                  }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = "hsl(35 22% 17%)"; e.currentTarget.style.borderColor = "hsl(38 28% 28%)"; }}
                  onMouseOut={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = hasData ? "hsl(35 22% 15%)" : "hsl(35 18% 12%)";
                      e.currentTarget.style.borderColor = isToday ? "hsl(38 35% 32%)" : hasData ? "hsl(38 22% 22%)" : "hsl(38 12% 16%)";
                    }
                  }}
                >
                  <span style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 13,
                    fontWeight: isToday ? "bold" : "normal",
                    color: isSelected ? GOLD_BRIGHT : isToday ? GOLD : isWeekend ? "hsl(38 40% 52%)" : "hsl(38 35% 55%)",
                    lineHeight: 1,
                  }}>
                    {day}
                  </span>

                  {/* Data indicators */}
                  {hasData && (
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                      {dayReports.slice(0, 3).map((_, i) => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? GOLD_BRIGHT : GOLD }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, justifyContent: "center", opacity: 0.4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD }} />
            <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em" }}>Has entries</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: "1px solid hsl(38 35% 32%)", background: "hsl(35 18% 12%)" }} />
            <span style={{ color: GOLD_DIM, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em" }}>Today</span>
          </div>
        </div>
      </div>

      {/* Day Detail Panel */}
      {selectedDate && (
        <DayDetail
          dateStr={selectedDate}
          reports={selectedReports}
          onClose={() => setSelectedDate(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListServiceReports, useUpsertServiceReport, useListCheckIns } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const SERVICES = ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm", "Other"];

const CATEGORIES = [
  { key: "totalEntries" as const, label: "Total Entries", color: "hsl(38 55% 28%)", light: "hsl(38 70% 65%)", icon: "📋" },
  { key: "servants" as const, label: "Servants", color: "hsl(200 40% 22%)", light: "hsl(200 60% 65%)", icon: "🙌" },
  { key: "salvations" as const, label: "Salvations", color: "hsl(130 35% 18%)", light: "hsl(130 55% 60%)", icon: "✝" },
  { key: "prayers" as const, label: "Prayers", color: "hsl(280 28% 20%)", light: "hsl(280 50% 65%)", icon: "🙏" },
  { key: "family" as const, label: "Family", color: "hsl(0 30% 20%)", light: "hsl(0 55% 65%)", icon: "👨‍👩‍👧" },
] as const;

type CatKey = typeof CATEGORIES[number]["key"];

const INPUT = {
  background: "hsl(35 18% 11%)",
  border: "1px solid hsl(38 20% 22%)",
  color: "hsl(38 55% 70%)",
  fontFamily: "Georgia, serif",
  borderRadius: 4, padding: "8px 10px", fontSize: 13, outline: "none",
} as React.CSSProperties;

const LABEL: React.CSSProperties = {
  color: "hsl(38 28% 42%)", fontFamily: "Georgia, serif", fontSize: 10,
  letterSpacing: "0.18em", textTransform: "uppercase", display: "block", marginBottom: 4,
};

export default function ServiceReportPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const queryClient = useQueryClient();

  // Parse initial filter from URL
  const params = new URLSearchParams(window.location.search);
  const initCampus = params.get("campus") ?? "";
  const initService = params.get("service") ?? "";
  const initCategory = (params.get("category") as CatKey) ?? "totalEntries";

  const [campus, setCampus] = useState(initCampus);
  const [service, setService] = useState(initService);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [activeCategory, setActiveCategory] = useState<CatKey>(initCategory);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [values, setValues] = useState({ totalEntries: 0, servants: 0, salvations: 0, prayers: 0, family: 0 });

  const { data: reportsData } = useListServiceReports({}, { query: { queryKey: ["serviceReports"] } });
  const upsert = useUpsertServiceReport();

  // Load check-in count to suggest servant count
  const { data: checkInsData } = useListCheckIns(
    { campus, service, serviceDate },
    {
      query: {
        queryKey: ["checkIns", campus, service, serviceDate],
        enabled: !!(campus && service && serviceDate),
      },
    }
  );
  const checkInCount = checkInsData?.checkIns?.length ?? 0;

  const allReports = reportsData?.reports ?? [];

  // Load existing record when campus/service/date changes
  useEffect(() => {
    if (!campus || !service || !serviceDate) return;
    const existing = allReports.find(
      r => r.campus === campus && r.service === service && r.serviceDate === serviceDate
    );
    if (existing) {
      setValues({
        totalEntries: existing.totalEntries,
        servants: existing.servants,
        salvations: existing.salvations,
        prayers: existing.prayers,
        family: existing.family,
      });
    } else {
      setValues({ totalEntries: 0, servants: checkInCount, salvations: 0, prayers: 0, family: 0 });
    }
  }, [campus, service, serviceDate, allReports.length]);

  // Auto-suggest servant count from check-ins
  useEffect(() => {
    if (checkInCount > 0) {
      setValues(v => ({ ...v, servants: checkInCount }));
    }
  }, [checkInCount]);

  // Aggregate totals across all reports
  const totals = allReports.reduce(
    (acc, r) => ({
      totalEntries: acc.totalEntries + r.totalEntries,
      servants: acc.servants + r.servants,
      salvations: acc.salvations + r.salvations,
      prayers: acc.prayers + r.prayers,
      family: acc.family + r.family,
    }),
    { totalEntries: 0, servants: 0, salvations: 0, prayers: 0, family: 0 }
  );

  const handleSave = () => {
    if (!campus || !service || !serviceDate) return;
    setSaving(true);
    upsert.mutate(
      { data: { campus, service, serviceDate, ...values } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["serviceReports"] });
          setSaving(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onError: () => setSaving(false),
      }
    );
  };

  const canSave = campus && service && serviceDate;

  return (
    <div className="relative min-h-screen w-full" style={{ background: "hsl(35 20% 9%)" }}>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.7) 100%)" }} />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <button onClick={() => navigate("/admin/altar-report")} style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", opacity: 0.5, marginBottom: 28, display: "block" }}>← Altar Report</button>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", fontSize: 16, letterSpacing: "0.3em", textTransform: "uppercase" }}>Service Report</h1>
          <p style={{ color: "hsl(38 28% 42%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", marginTop: 4 }}>Enter counts by location &amp; service</p>
        </div>

        {/* Aggregate stat buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 28 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                background: activeCategory === cat.key ? cat.color : "hsl(35 18% 12%)",
                border: `1px solid ${activeCategory === cat.key ? cat.light + "44" : "hsl(38 15% 20%)"}`,
                borderRadius: 6, padding: "10px 4px", cursor: "pointer", transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
            >
              <span style={{ fontSize: 16 }}>{cat.icon}</span>
              <span style={{ color: activeCategory === cat.key ? cat.light : "hsl(38 50% 55%)", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: "bold", lineHeight: 1 }}>
                {totals[cat.key]}
              </span>
              <span style={{ color: activeCategory === cat.key ? cat.light + "cc" : "hsl(38 22% 38%)", fontFamily: "Georgia, serif", fontSize: 8, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2, textAlign: "center" }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Session selector */}
        <div style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 18% 22%)", borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <p style={{ ...LABEL, marginBottom: 12, fontSize: 11 }}>Select Service Session</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={LABEL}>Campus</label>
              <select value={campus} onChange={e => setCampus(e.target.value)} style={{ ...INPUT, width: "100%" }}>
                <option value="">Select...</option>
                {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Service</label>
              <select value={service} onChange={e => setService(e.target.value)} style={{ ...INPUT, width: "100%" }}>
                <option value="">Select...</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Date</label>
              <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={{ ...INPUT, width: "100%" }} />
            </div>
          </div>
          {checkInCount > 0 && (
            <p style={{ color: "hsl(130 50% 55%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 10, opacity: 0.8 }}>
              ✓ {checkInCount} servant{checkInCount !== 1 ? "s" : ""} checked in for this service
            </p>
          )}
        </div>

        {/* Count inputs */}
        <div style={{ background: "hsl(35 20% 13%)", border: "1px solid hsl(38 18% 22%)", borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <p style={{ ...LABEL, marginBottom: 14, fontSize: 11 }}>Enter Counts</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} onClick={() => setActiveCategory(cat.key)} style={{ cursor: "pointer" }}>
                <label style={{ ...LABEL, color: activeCategory === cat.key ? cat.light : "hsl(38 28% 42%)" }}>
                  {cat.icon} {cat.label}
                  {cat.key === "servants" && checkInCount > 0 && (
                    <span style={{ color: "hsl(130 45% 52%)", marginLeft: 6, fontSize: 9 }}>(auto: {checkInCount})</span>
                  )}
                </label>
                <input
                  type="number"
                  min={0}
                  value={values[cat.key]}
                  onChange={e => setValues(v => ({ ...v, [cat.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  style={{
                    ...INPUT, width: "100%",
                    border: `1px solid ${activeCategory === cat.key ? cat.light + "55" : "hsl(38 20% 22%)"}`,
                    background: activeCategory === cat.key ? cat.color + "44" : "hsl(35 18% 11%)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{ width: "100%", padding: "12px", background: canSave ? "hsl(38 50% 28%)" : "hsl(35 15% 18%)", color: canSave ? "hsl(38 70% 80%)" : "hsl(38 20% 38%)", border: `1px solid ${canSave ? "hsl(38 38% 35%)" : "hsl(38 15% 25%)"}`, fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", borderRadius: 6, cursor: canSave ? "pointer" : "not-allowed", transition: "all 0.2s" }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save Report"}
        </button>

        {/* All reports table */}
        {allReports.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <p style={{ ...LABEL, marginBottom: 12 }}>All Service Reports</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...allReports].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)).map(r => (
                <div key={r.id} style={{ background: "hsl(35 18% 12%)", border: "1px solid hsl(38 14% 20%)", borderRadius: 6, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <span style={{ color: "hsl(38 60% 60%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold" }}>{r.campus}</span>
                      <span style={{ color: "hsl(38 28% 42%)", fontFamily: "Georgia, serif", fontSize: 11, marginLeft: 8 }}>{r.service}</span>
                    </div>
                    <span style={{ color: "hsl(38 22% 38%)", fontFamily: "Georgia, serif", fontSize: 10 }}>{r.serviceDate}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {CATEGORIES.map(cat => (
                      <span key={cat.key} style={{ color: "hsl(38 35% 45%)", fontFamily: "Georgia, serif", fontSize: 10 }}>
                        <span style={{ color: cat.light, fontWeight: "bold" }}>{r[cat.key]}</span> {cat.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

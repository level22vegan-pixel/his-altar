import { useState, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useListWorkers, useListCheckIns, useCreateCheckIn, useDeleteCheckIn, useGetTeamPreset, useSetTeamPreset } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Worker, CheckIn } from "@workspace/api-client-react";
import { jsPDF } from "jspdf";

function exportActivesPDF(campus: string, service: string, date: string, workers: Worker[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const PDF_BG: [number, number, number] = [28, 22, 14];
  const PDF_GOLD: [number, number, number] = [180, 140, 80];
  const PDF_GOLD_DIM: [number, number, number] = [120, 90, 50];
  const PDF_WHITE: [number, number, number] = [220, 205, 175];
  const PDF_ROW_ALT: [number, number, number] = [36, 28, 18];
  const PDF_HEADER_ROW: [number, number, number] = [45, 34, 20];

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  doc.setFillColor(...PDF_BG);
  doc.rect(0, 0, W, pageH, "F");
  doc.setDrawColor(...PDF_GOLD);
  doc.setLineWidth(0.8);
  doc.line(14, 18, W - 14, 18);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...PDF_GOLD);
  doc.text("Active Altar Members", W / 2, 14, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text(`${campus} — ${dateLabel} — ${service}`, W / 2, 24, { align: "center" });
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, 27, W - 14, 27);

  const startX = 14;
  const rowH = 8;
  const colW = [10, 80, 82] as const;
  const cols = ["#", "Name", "Role"];
  let y = 36;

  doc.setFillColor(...PDF_HEADER_ROW);
  doc.rect(startX, y - 5.5, W - 28, rowH, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD);
  let x = startX + 2;
  cols.forEach((col, i) => { doc.text(col.toUpperCase(), x, y); x += colW[i]; });
  y += rowH;

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  workers.forEach((w, ri) => {
    if (y > pageH - 20) {
      doc.addPage();
      doc.setFillColor(...PDF_BG);
      doc.rect(0, 0, W, pageH, "F");
      y = 20;
    }
    if (ri % 2 === 0) {
      doc.setFillColor(...PDF_ROW_ALT);
      doc.rect(startX, y - 5.5, W - 28, rowH, "F");
    }
    doc.setTextColor(...PDF_WHITE);
    x = startX + 2;
    [String(ri + 1), w.name, w.role ?? ""].forEach((cell, i) => {
      doc.text(cell, x, y);
      x += colW[i];
    });
    y += rowH;
  });

  y += 4;
  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.4);
  doc.line(startX, y - 4, W - 14, y - 4);
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_GOLD);
  doc.text(`TOTAL: ${workers.length} active members`, startX + 2, y);

  doc.setDrawColor(...PDF_GOLD_DIM);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, W - 14, pageH - 12);
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GOLD_DIM);
  doc.text("Active Altar Members — Confidential", W / 2, pageH - 7, { align: "center" });

  doc.save(`actives-${campus.toLowerCase()}-${date}-${service.replace(/\s+/g, "-")}.pdf`);
}

// Avatar: colored circle with initials if no photo
function Avatar({ name, photoUrl, size = 72 }: { name: string; photoUrl?: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    ["hsl(38 55% 28%)", "hsl(38 75% 72%)"],
    ["hsl(200 45% 22%)", "hsl(200 65% 72%)"],
    ["hsl(280 30% 22%)", "hsl(280 50% 72%)"],
    ["hsl(130 30% 18%)", "hsl(130 50% 65%)"],
    ["hsl(0 35% 22%)", "hsl(0 55% 72%)"],
    ["hsl(220 40% 20%)", "hsl(220 60% 72%)"],
  ];
  const idx = name.charCodeAt(0) % colors.length;
  const [bg, fg] = colors[idx];

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid hsl(38 30% 30%)" }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif", fontSize: size * 0.33, fontWeight: "bold",
      border: "2px solid hsl(38 30% 30%)",
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function WorkerCard({
  worker, isCheckedIn, checkInId, onCheckIn, onCheckOut, loading,
}: {
  worker: Worker; isCheckedIn: boolean; checkInId?: number;
  onCheckIn: () => void; onCheckOut: () => void; loading: boolean;
}) {
  const isOnHold = worker.onHold;

  return (
    <div
      onClick={isOnHold ? undefined : isCheckedIn ? onCheckOut : onCheckIn}
      style={{
        background: isOnHold ? "hsl(35 16% 11%)" : isCheckedIn ? "hsl(130 30% 15%)" : "hsl(35 20% 13%)",
        border: `1px solid ${isOnHold ? "hsl(0 25% 20%)" : isCheckedIn ? "hsl(130 40% 28%)" : "hsl(38 18% 22%)"}`,
        borderRadius: "8px", padding: "12px 10px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        cursor: isOnHold ? "default" : loading ? "wait" : "pointer",
        transition: "all 0.2s ease",
        opacity: loading ? 0.6 : isOnHold ? 0.6 : 1,
        position: "relative",
        userSelect: "none",
      }}
    >
      {isCheckedIn && !isOnHold && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          background: "hsl(130 45% 28%)", borderRadius: "50%",
          width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "hsl(130 60% 72%)", fontSize: 10, lineHeight: 1 }}>✓</span>
        </div>
      )}

      {/* Avatar with hold overlay */}
      <div style={{ position: "relative" }}>
        <Avatar name={worker.name} photoUrl={worker.photoUrl} size={64} />
        {isOnHold && (
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "hsl(0 60% 14% / 0.68)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid hsl(0 45% 32%)" }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>⏸</span>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ color: isOnHold ? "hsl(38 22% 38%)" : isCheckedIn ? "hsl(130 50% 68%)" : "hsl(38 55% 68%)", fontFamily: "Georgia, serif", fontSize: "12px", fontWeight: "bold", lineHeight: 1.3 }}>
          {worker.name}
        </div>
        {isOnHold ? (
          <div style={{ color: "hsl(0 45% 45%)", fontFamily: "Georgia, serif", fontSize: "9px", marginTop: 2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            On Hold
          </div>
        ) : worker.role ? (
          <div style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: "10px", marginTop: 2 }}>
            {worker.role}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const TABS = ["Roster", "Active", "Alt"];

const CARD_STYLE: React.CSSProperties = {
  borderRadius: "8px", padding: "12px 10px",
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  gap: "8px", cursor: "pointer", transition: "all 0.2s ease",
  position: "relative", userSelect: "none", minHeight: 120,
};

function SetTeamCard({ presetCount, onClick }: { presetCount: number; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...CARD_STYLE,
        background: hover ? "hsl(220 35% 16%)" : "hsl(220 30% 12%)",
        border: `1px dashed ${hover ? "hsl(220 50% 42%)" : "hsl(220 30% 28%)"}`,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "hsl(220 35% 20%)", border: "2px solid hsl(220 40% 32%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        👥
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "hsl(220 60% 68%)", fontFamily: "Georgia, serif", fontSize: 11, fontWeight: "bold", letterSpacing: "0.05em" }}>Set Team</div>
        {presetCount > 0 && (
          <div style={{ color: "hsl(220 40% 48%)", fontFamily: "Georgia, serif", fontSize: 9, marginTop: 2 }}>{presetCount} saved</div>
        )}
      </div>
    </div>
  );
}

function SetActiveCard({ presetCount, onClick, disabled }: { presetCount: number; onClick: () => void; disabled: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => { if (!disabled) setHover(true); }}
      onMouseLeave={() => setHover(false)}
      style={{
        ...CARD_STYLE,
        background: hover ? "hsl(130 35% 16%)" : "hsl(130 28% 12%)",
        border: `1px dashed ${hover ? "hsl(130 50% 36%)" : "hsl(130 30% 24%)"}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "hsl(130 32% 18%)", border: "2px solid hsl(130 40% 28%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        ⚡
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "hsl(130 55% 62%)", fontFamily: "Georgia, serif", fontSize: 11, fontWeight: "bold", letterSpacing: "0.05em" }}>
          Set Active
        </div>
        {presetCount > 0
          ? <div style={{ color: "hsl(130 35% 44%)", fontFamily: "Georgia, serif", fontSize: 9, marginTop: 2 }}>{presetCount} members</div>
          : <div style={{ color: "hsl(130 20% 35%)", fontFamily: "Georgia, serif", fontSize: 9, marginTop: 2 }}>No team set</div>
        }
      </div>
    </div>
  );
}

function SetTeamModal({
  allWorkers, presetIds, onSave, onClose,
}: {
  allWorkers: Worker[];
  presetIds: number[];
  onSave: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(presetIds));

  const toggle = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "hsl(30 18% 5% / 0.96)", display: "flex", flexDirection: "column" }}>
      {/* Modal header */}
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid hsl(38 18% 18%)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase" }}>Set Team</div>
          <div style={{ color: "hsl(38 28% 40%)", fontFamily: "Georgia, serif", fontSize: 10, marginTop: 2 }}>Tap profiles to include in preset · {selected.size} selected</div>
        </div>
        <button onClick={onClose} style={{ color: "hsl(38 25% 40%)", background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, opacity: 0.6 }}>✕</button>
      </div>

      {/* Scrollable grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {allWorkers.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 48, opacity: 0.4 }}>
            <p style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 14 }}>No workers in roster</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {allWorkers.map(w => {
              const isSelected = selected.has(w.id);
              return (
                <div
                  key={w.id}
                  onClick={() => toggle(w.id)}
                  style={{
                    borderRadius: 8, padding: "12px 10px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    cursor: "pointer", transition: "all 0.15s", userSelect: "none",
                    background: isSelected ? "hsl(130 30% 15%)" : "hsl(35 20% 13%)",
                    border: `1px solid ${isSelected ? "hsl(130 45% 30%)" : "hsl(38 18% 22%)"}`,
                    position: "relative",
                  }}
                >
                  {isSelected && (
                    <div style={{ position: "absolute", top: 6, right: 6, background: "hsl(130 45% 28%)", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "hsl(130 60% 72%)", fontSize: 10, lineHeight: 1 }}>✓</span>
                    </div>
                  )}
                  <Avatar name={w.name} photoUrl={w.photoUrl} size={64} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: isSelected ? "hsl(130 50% 68%)" : "hsl(38 55% 68%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold", lineHeight: 1.3 }}>{w.name}</div>
                    {w.role && <div style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 10, marginTop: 2 }}>{w.role}</div>}
                    <div style={{ color: "hsl(38 20% 34%)", fontFamily: "Georgia, serif", fontSize: 9, marginTop: 1, letterSpacing: "0.1em", textTransform: "uppercase" }}>{w.category}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ padding: "12px 16px 20px", borderTop: "1px solid hsl(38 18% 18%)", display: "flex", gap: 10, flexShrink: 0 }}>
        <button
          onClick={() => onSave([...selected])}
          style={{ flex: 1, background: "hsl(38 50% 28%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", padding: "11px 0", borderRadius: 6, cursor: "pointer" }}
        >
          Save Team ({selected.size})
        </button>
        <button
          onClick={() => { setSelected(new Set()); }}
          style={{ background: "none", color: "hsl(38 25% 40%)", border: "1px solid hsl(38 18% 22%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "11px 14px", borderRadius: 6, cursor: "pointer" }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default function CheckInPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const campus = params.get("campus") ?? "";
  const service = params.get("service") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState(0);
  const [loadingWorkerId, setLoadingWorkerId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Team preset stored in the database so all devices stay in sync
  const presetQueryKey = ["teamPreset", campus, service];
  const { data: presetData } = useGetTeamPreset(
    { campus, service },
    { query: { queryKey: presetQueryKey, enabled: !!(campus && service) } }
  );
  const teamPreset: number[] = presetData?.workerIds ?? [];

  const queryClient = useQueryClient();

  const setTeamPresetMutation = useSetTeamPreset();
  const savePreset = (ids: number[]) => {
    setTeamPresetMutation.mutate(
      { data: { campus, service, workerIds: ids } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: presetQueryKey }) }
    );
    setShowTeamModal(false);
  };

  const checkInsKey = ["checkIns", campus, service, today];

  const { data: masterData } = useListWorkers({ category: "master", campus }, { query: { queryKey: ["workers-master", campus] } });
  const { data: altData } = useListWorkers({ category: "alt", campus }, { query: { queryKey: ["workers-alt", campus] } });
  const { data: checkInsData } = useListCheckIns(
    { campus, service, serviceDate: today },
    { query: { queryKey: checkInsKey } }
  );

  const createCheckIn = useCreateCheckIn();
  const deleteCheckIn = useDeleteCheckIn();

  const masterWorkers = masterData?.workers ?? [];
  const altWorkers = altData?.workers ?? [];
  const checkIns = checkInsData?.checkIns ?? [];
  const checkedInIds = new Set(checkIns.map(c => c.workerId));

  const handleCheckIn = useCallback((workerId: number) => {
    setLoadingWorkerId(workerId);
    createCheckIn.mutate(
      { data: { workerId, campus, service, serviceDate: today } },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: checkInsKey });
          setLoadingWorkerId(null);
        },
      }
    );
  }, [campus, service, today, createCheckIn, queryClient, checkInsKey]);

  const handleCheckOut = useCallback((workerId: number) => {
    const ci = checkIns.find(c => c.workerId === workerId);
    if (!ci) return;
    setLoadingWorkerId(workerId);
    deleteCheckIn.mutate(
      { id: ci.id },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: checkInsKey });
          setLoadingWorkerId(null);
        },
      }
    );
  }, [checkIns, deleteCheckIn, queryClient, checkInsKey]);

  // Swipe handling
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50 && activeTab < 2) setActiveTab(t => t + 1);
    if (dx > 50 && activeTab > 0) setActiveTab(t => t - 1);
  };

  const presetActiveIds = useMemo(() => {
    return teamPreset
      .map(id => masterWorkers.find(w => w.id === id))
      .filter((w): w is Worker => !!w && !w.onHold)
      .filter(w => checkedInIds.has(w.id))
      .map(w => w.id);
  }, [teamPreset, masterWorkers, checkedInIds]);

  const isActiveSet = presetActiveIds.length > 0;

  const handleSetActive = useCallback(() => {
    // Check in all preset workers not yet active (never unsets)
    const toCheckIn = teamPreset
      .map(id => masterWorkers.find(w => w.id === id))
      .filter((w): w is Worker => !!w && !w.onHold && !checkedInIds.has(w.id));
    toCheckIn.forEach(w => {
      createCheckIn.mutate(
        { data: { workerId: w.id, campus, service, serviceDate: today } },
        { onSettled: () => queryClient.invalidateQueries({ queryKey: checkInsKey }) }
      );
    });
  }, [teamPreset, masterWorkers, checkedInIds, campus, service, today, createCheckIn, queryClient, checkInsKey]);

  const activeWorkers = [...masterWorkers, ...altWorkers].filter(w => checkedInIds.has(w.id));
  const allRosterWorkers = [...masterWorkers, ...altWorkers];
  const q = search.trim().toLowerCase();
  const filter = (workers: Worker[]) => q ? workers.filter(w => w.name.toLowerCase().includes(q)) : workers;

  function renderGrid(workers: Worker[], showCheckIn: boolean) {
    if (workers.length === 0) {
      return (
        <div style={{ textAlign: "center", paddingTop: 48, opacity: 0.4 }}>
          <p style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 14 }}>
            {showCheckIn ? "No workers in roster" : "No active workers"}
          </p>
          <p style={{ color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 12, marginTop: 4 }}>
            {showCheckIn ? "Add workers in Admin → Roster" : "Check in workers from the Roster tab"}
          </p>
        </div>
      );
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", padding: "4px 0" }}>
        {workers.map(w => (
          <WorkerCard
            key={w.id}
            worker={w}
            isCheckedIn={checkedInIds.has(w.id)}
            checkInId={checkIns.find(c => c.workerId === w.id)?.id}
            onCheckIn={() => handleCheckIn(w.id)}
            onCheckOut={() => handleCheckOut(w.id)}
            loading={loadingWorkerId === w.id}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden" style={{ background: "hsl(35 20% 9%)" }}>
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.7) 100%)" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={() => navigate("/team")}
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer", textTransform: "uppercase", opacity: 0.6 }}
        >
          ← Back
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "hsl(38 60% 62%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase" }}>{campus}</div>
          <div style={{ color: "hsl(38 40% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em" }}>{service}</div>
        </div>
        <div style={{ width: 48, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ background: "hsl(130 35% 22%)", borderRadius: "10px", padding: "2px 8px", fontSize: 11, color: "hsl(130 55% 68%)", fontFamily: "Georgia, serif" }}>
            {checkIns.length} in
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="relative z-10 flex px-4 gap-0 mb-0" style={{ borderBottom: "1px solid hsl(38 18% 20%)" }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, paddingBottom: 10, paddingTop: 8,
              fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em",
              textTransform: "uppercase", background: "none", border: "none", cursor: "pointer",
              color: activeTab === i ? "hsl(38 70% 65%)" : "hsl(38 25% 40%)",
              borderBottom: activeTab === i ? "2px solid hsl(38 65% 50%)" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.2s",
            }}
          >
            {tab}
            {tab === "Active" && checkIns.length > 0 && (
              <span style={{ marginLeft: 6, background: "hsl(130 35% 22%)", color: "hsl(130 55% 68%)", borderRadius: 8, padding: "0 5px", fontSize: 10 }}>
                {checkIns.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative z-10 px-4 py-2" style={{ borderBottom: "1px solid hsl(38 15% 18%)" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "hsl(38 28% 38%)", fontSize: 13, pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            style={{
              width: "100%", paddingLeft: 32, paddingRight: search ? 32 : 10, paddingTop: 7, paddingBottom: 7,
              background: "hsl(35 18% 11%)", border: "1px solid hsl(38 18% 22%)",
              borderRadius: 6, color: "hsl(38 55% 70%)", fontFamily: "Georgia, serif", fontSize: 13,
              outline: "none", boxSizing: "border-box",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(38 25% 42%)", fontSize: 14, lineHeight: 1 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sliding panels */}
      <div
        className="relative z-10 flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: "flex",
            width: "300%",
            height: "100%",
            transform: `translateX(${-activeTab * (100 / 3)}%)`,
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Panel 0: Master Roster */}
          <div style={{ width: "33.333%", height: "100%", overflowY: "auto", padding: "12px 16px" }}>
            <p style={{ color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
              Master Roster — tap to check in
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", padding: "4px 0" }}>
              <SetTeamCard
                presetCount={teamPreset.length}
                onClick={() => setShowTeamModal(true)}
              />
              <SetActiveCard
                presetCount={teamPreset.length}
                onClick={handleSetActive}
                disabled={teamPreset.length === 0}
              />
              {filter(masterWorkers).map(w => (
                <WorkerCard
                  key={w.id}
                  worker={w}
                  isCheckedIn={checkedInIds.has(w.id)}
                  checkInId={checkIns.find(c => c.workerId === w.id)?.id}
                  onCheckIn={() => handleCheckIn(w.id)}
                  onCheckOut={() => handleCheckOut(w.id)}
                  loading={loadingWorkerId === w.id}
                />
              ))}
            </div>
          </div>

          {/* Panel 1: Active */}
          <div style={{ width: "33.333%", height: "100%", overflowY: "auto", padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                Active — tap to check out
              </p>
              {activeWorkers.length > 0 && (
                <button
                  onClick={() => exportActivesPDF(campus, service, today, activeWorkers)}
                  style={{
                    color: "hsl(38 45% 55%)", background: "hsl(38 30% 14%)",
                    border: "1px solid hsl(38 28% 24%)", borderRadius: 5,
                    padding: "4px 10px", cursor: "pointer",
                    fontFamily: "Georgia, serif", fontSize: 10,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = "hsl(38 70% 72%)"; e.currentTarget.style.borderColor = "hsl(38 38% 34%)"; }}
                  onMouseOut={e => { e.currentTarget.style.color = "hsl(38 45% 55%)"; e.currentTarget.style.borderColor = "hsl(38 28% 24%)"; }}
                >
                  ↓ Export
                </button>
              )}
            </div>
            {renderGrid(filter(activeWorkers), false)}
          </div>

          {/* Panel 2: Alt */}
          <div style={{ width: "33.333%", height: "100%", overflowY: "auto", padding: "12px 16px" }}>
            <p style={{ color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
              Alt — tap to check in
            </p>
            {renderGrid(filter(altWorkers), true)}
          </div>
        </div>
      </div>

      {/* Set Team Modal */}
      {showTeamModal && (
        <SetTeamModal
          allWorkers={masterWorkers}
          presetIds={teamPreset}
          onSave={savePreset}
          onClose={() => setShowTeamModal(false)}
        />
      )}
    </div>
  );
}

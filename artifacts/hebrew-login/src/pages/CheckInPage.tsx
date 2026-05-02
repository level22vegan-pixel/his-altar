import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useListWorkers, useListCheckIns, useCreateCheckIn, useDeleteCheckIn } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Worker, CheckIn } from "@workspace/api-client-react";

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

export default function CheckInPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const campus = params.get("campus") ?? "";
  const service = params.get("service") ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState(0);
  const [loadingWorkerId, setLoadingWorkerId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
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

  const activeWorkers = [...masterWorkers, ...altWorkers].filter(w => checkedInIds.has(w.id));
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
          onClick={() => navigate(`/campus/${campus.toLowerCase()}`)}
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
            {renderGrid(filter(masterWorkers), true)}
          </div>

          {/* Panel 1: Active */}
          <div style={{ width: "33.333%", height: "100%", overflowY: "auto", padding: "12px 16px" }}>
            <p style={{ color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
              Active — tap to check out
            </p>
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
    </div>
  );
}

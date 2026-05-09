import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListPxpCallers,
  useResetPxpCallerPassword,
} from "@workspace/api-client-react";
import { getValidCampusSession, getValidAdminSession } from "@/lib/session";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

export default function CallerPasswordsPage() {
  const [, navigate] = useLocation();

  const campusSession = getValidCampusSession();
  const isMasterAdmin = getValidAdminSession();
  const lockedCampus = campusSession?.campus ?? null;

  const [filterCampus, setFilterCampus] = useState(lockedCampus ?? "HALLMARK");
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useListPxpCallers(
    filterCampus ? { campus: filterCampus } : undefined
  );
  const resetPassword = useResetPxpCallerPassword();

  const callers = data?.callers ?? [];

  function toggleReveal(id: number) {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyPassword(id: number, pw: string) {
    navigator.clipboard.writeText(pw).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  function handleReset(id: number, name: string) {
    if (!confirm(`Generate a new password for ${name}? Their current password will stop working.`)) return;
    resetPassword.mutate({ id }, {
      onSuccess: () => {
        setRevealedIds(prev => new Set(prev).add(id));
        refetch();
      },
    });
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(270 70% 55%), hsl(300 60% 55%), hsl(270 70% 55%))" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(270 50% 60% / 0.06) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <button
        onClick={() => navigate("/admin")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← Admin
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 5vw, 2.2rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.22em", textTransform: "uppercase", textShadow: "0 0 30px hsl(270 60% 50% / 0.5)" }}>
            Caller Passwords
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(270 40% 58%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", marginTop: 6, textTransform: "uppercase" }}>
            Manage login passwords by campus
          </p>
          {lockedCampus && (
            <div style={{ display: "inline-block", marginTop: 8, padding: "3px 14px", background: "hsl(270 50% 18%)", border: "1px solid hsl(270 45% 32%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(270 65% 75%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {lockedCampus} · {campusSession?.role === "lead" ? "Lead" : "Deputy Lead"}
              </span>
            </div>
          )}
        </div>

        {/* Campus filter tabs — master admin only */}
        {isMasterAdmin && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCampus(c)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: filterCampus === c ? "1px solid hsl(270 60% 55%)" : "1px solid hsl(270 30% 28%)",
                    background: filterCampus === c ? "hsl(270 55% 22%)" : "hsl(270 40% 10%)",
                    color: filterCampus === c ? "hsl(270 70% 78%)" : "hsl(270 30% 55%)",
                    fontFamily: "Georgia, serif",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reveal all / hide all */}
        {callers.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setRevealedIds(new Set(callers.map(c => c.id)))}
              style={{ flex: 1, padding: "7px 0", borderRadius: 7, background: "hsl(270 35% 14%)", border: "1px solid hsl(270 30% 24%)", color: "hsl(270 55% 68%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Reveal All
            </button>
            <button
              onClick={() => setRevealedIds(new Set())}
              style={{ flex: 1, padding: "7px 0", borderRadius: 7, background: "hsl(270 30% 10%)", border: "1px solid hsl(270 25% 18%)", color: "hsl(270 35% 48%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Hide All
            </button>
          </div>
        )}

        {/* Password list */}
        <div style={{ borderRadius: 10, border: "1px solid hsl(270 30% 20%)", background: "hsl(270 35% 10% / 0.8)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(270 35% 45%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : callers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              No callers registered for {filterCampus} yet
            </div>
          ) : (
            callers.map((c, i) => {
              const isRevealed = revealedIds.has(c.id);
              const isCopied = copiedId === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 18px",
                    borderBottom: i < callers.length - 1 ? "1px solid hsl(270 25% 14%)" : "none",
                    background: i % 2 === 0 ? "transparent" : "hsl(270 30% 8% / 0.5)",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, hsl(${(c.id * 67) % 360} 55% 32%), hsl(${(c.id * 67 + 80) % 360} 45% 20%))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "hsl(0 0% 95%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold",
                  }}>
                    {c.name.trim()[0]?.toUpperCase()}
                  </div>

                  {/* Name */}
                  <div style={{ width: 90, flexShrink: 0 }}>
                    <div style={{ color: "hsl(0 0% 90%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                  </div>

                  {/* Password display */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "hsl(270 30% 8%)", border: "1px solid hsl(270 25% 16%)", borderRadius: 7, padding: "6px 10px" }}>
                    <span style={{
                      flex: 1,
                      fontFamily: "monospace",
                      fontSize: 13,
                      letterSpacing: isRevealed ? "0.22em" : "0.1em",
                      color: isRevealed ? "hsl(270 80% 82%)" : "hsl(270 20% 30%)",
                      userSelect: isRevealed ? "text" : "none",
                    }}>
                      {isRevealed ? c.password : "••••••"}
                    </span>
                    <button
                      onClick={() => toggleReveal(c.id)}
                      style={{ padding: "2px 7px", borderRadius: 4, background: "none", border: "1px solid hsl(270 25% 22%)", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 9, cursor: "pointer", flexShrink: 0, letterSpacing: "0.1em" }}
                    >
                      {isRevealed ? "Hide" : "Show"}
                    </button>
                    {isRevealed && (
                      <button
                        onClick={() => copyPassword(c.id, c.password)}
                        style={{ padding: "2px 7px", borderRadius: 4, background: isCopied ? "hsl(145 40% 14%)" : "none", border: `1px solid ${isCopied ? "hsl(145 40% 26%)" : "hsl(270 25% 22%)"}`, color: isCopied ? "hsl(145 60% 62%)" : "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 9, cursor: "pointer", flexShrink: 0, letterSpacing: "0.1em" }}
                      >
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                    )}
                    <button
                      onClick={() => handleReset(c.id, c.name)}
                      style={{ padding: "2px 7px", borderRadius: 4, background: "none", border: "1px solid hsl(38 25% 22%)", color: "hsl(38 55% 52%)", fontFamily: "Georgia, serif", fontSize: 9, cursor: "pointer", flexShrink: 0, letterSpacing: "0.1em" }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {callers.length} {callers.length === 1 ? "caller" : "callers"} at {filterCampus}
        </p>
      </div>
    </div>
  );
}

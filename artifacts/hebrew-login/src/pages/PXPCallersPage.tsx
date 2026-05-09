import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListPxpCallers,
  useCreatePxpCaller,
  useDeletePxpCaller,
  useResetPxpCallerPassword,
} from "@workspace/api-client-react";
import { getValidCampusSession, getValidAdminSession, getValidCallerSession } from "@/lib/session";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 30% 30%)",
  background: "hsl(270 40% 10%)",
  color: "hsl(0 0% 92%)",
  fontFamily: "Georgia, serif",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};

export default function PXPCallersPage() {
  const [, navigate] = useLocation();

  const campusSession  = getValidCampusSession();
  const callerSession  = getValidCallerSession();
  const isMasterAdmin  = getValidAdminSession();
  const lockedCampus   = campusSession?.campus ?? callerSession?.campus ?? null;

  function handleBack() {
    if (callerSession) {
      navigate("/admin/pxp");
    } else {
      navigate("/admin");
    }
  }

  const [filterCampus, setFilterCampus] = useState(lockedCampus ?? "HALLMARK");
  const [name, setName] = useState("");
  const [campus, setCampus] = useState(lockedCampus ?? "HALLMARK");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useListPxpCallers(
    filterCampus ? { campus: filterCampus } : undefined
  );
  const createCaller = useCreatePxpCaller();
  const deleteCaller = useDeletePxpCaller();
  const resetPassword = useResetPxpCallerPassword();

  const callers = data?.callers ?? [];

  function handleAdd() {
    if (!name.trim() || !campus) return;
    createCaller.mutate(
      { data: { name: name.trim(), campus, phone: phone.trim() } },
      {
        onSuccess: (newCaller) => {
          setName("");
          setPhone("");
          setAdding(false);
          // Auto-reveal the password for the newly created caller
          setRevealedIds(prev => new Set(prev).add(newCaller.id));
          refetch();
        },
      }
    );
  }

  function handleDelete(id: number, callerName: string) {
    if (!confirm(`Remove ${callerName} from callers?`)) return;
    deleteCaller.mutate({ id }, { onSuccess: () => refetch() });
  }

  function handleResetPassword(id: number) {
    if (!confirm("Generate a new password for this caller? Their current password will stop working.")) return;
    resetPassword.mutate({ id }, {
      onSuccess: () => {
        setRevealedIds(prev => new Set(prev).add(id));
        refetch();
      },
    });
  }

  function toggleReveal(id: number) {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function copyPassword(id: number, password: string) {
    navigator.clipboard.writeText(password).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
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
        onClick={handleBack}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        {callerSession ? "← PXP" : "← Admin"}
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 5vw, 2.4rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.22em", textTransform: "uppercase", textShadow: "0 0 30px hsl(270 60% 50% / 0.5)" }}>
            PXP Callers
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(270 40% 58%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", marginTop: 6, textTransform: "uppercase" }}>
            Registered Caller Roster
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
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => { setFilterCampus(c); if (!lockedCampus) setCampus(c); }}
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

        {/* Add caller form */}
        <div style={{ background: "hsl(270 35% 11%)", border: "1px solid hsl(270 30% 22%)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
          <button
            onClick={() => setAdding(v => !v)}
            style={{ width: "100%", padding: "12px 18px", background: "none", border: "none", color: "hsl(270 60% 70%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", textAlign: "left" }}
          >
            {adding ? "▲  Cancel" : "+ Add Caller"}
          </button>
          {adding && (
            <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                style={inputStyle}
                placeholder="Full name *"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Phone (optional)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              {lockedCampus ? (
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                  <span style={{ color: "hsl(270 60% 72%)" }}>{lockedCampus}</span>
                  <span style={{ color: "hsl(270 30% 48%)", fontSize: 10, letterSpacing: "0.1em" }}>CAMPUS LOCKED</span>
                </div>
              ) : (
                <select
                  style={{ ...inputStyle, appearance: "none" as const }}
                  value={campus}
                  onChange={e => setCampus(e.target.value)}
                >
                  {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <p style={{ color: "hsl(270 35% 50%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>
                A password will be auto-generated and shown after saving.
              </p>
              <button
                onClick={handleAdd}
                disabled={!name.trim() || createCaller.isPending}
                style={{
                  padding: "10px 0",
                  borderRadius: 8,
                  background: name.trim() ? "linear-gradient(135deg, hsl(270 65% 38%), hsl(270 55% 26%))" : "hsl(270 25% 15%)",
                  color: name.trim() ? "hsl(0 0% 97%)" : "hsl(270 20% 38%)",
                  border: "none",
                  fontFamily: "Georgia, serif",
                  fontSize: 12,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: name.trim() ? "pointer" : "not-allowed",
                }}
              >
                {createCaller.isPending ? "Saving…" : "Save Caller"}
              </button>
            </div>
          )}
        </div>

        {/* Caller list */}
        <div style={{ borderRadius: 10, border: "1px solid hsl(270 30% 20%)", background: "hsl(270 35% 10% / 0.8)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(270 35% 45%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : callers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              No callers registered{filterCampus ? ` for ${filterCampus}` : ""} yet
            </div>
          ) : (
            callers.map((c, i) => {
              const isRevealed = revealedIds.has(c.id);
              const isCopied = copiedId === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    padding: "14px 18px",
                    borderBottom: i < callers.length - 1 ? "1px solid hsl(270 25% 14%)" : "none",
                    background: i % 2 === 0 ? "transparent" : "hsl(270 30% 8% / 0.5)",
                  }}
                >
                  {/* Top row: avatar + name + delete */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, hsl(${(c.id * 67) % 360} 55% 32%), hsl(${(c.id * 67 + 80) % 360} 45% 20%))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "hsl(0 0% 95%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold",
                    }}>
                      {c.name.trim()[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "hsl(0 0% 94%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>
                        {c.name}
                      </div>
                      <div style={{ color: "hsl(270 35% 52%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 1 }}>
                        {c.campus}{c.phone ? ` · ${c.phone}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      style={{ padding: "5px 10px", borderRadius: 6, background: "hsl(0 50% 18%)", border: "1px solid hsl(0 40% 28%)", color: "hsl(0 60% 65%)", fontFamily: "Georgia, serif", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Password row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "hsl(270 30% 8%)", border: "1px solid hsl(270 25% 18%)", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ color: "hsl(270 35% 48%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", flexShrink: 0 }}>
                      Pass
                    </span>
                    <span style={{
                      flex: 1,
                      fontFamily: "monospace",
                      fontSize: 14,
                      letterSpacing: isRevealed ? "0.25em" : "0.1em",
                      color: isRevealed ? "hsl(270 80% 82%)" : "hsl(270 25% 35%)",
                      userSelect: isRevealed ? "text" : "none",
                    }}>
                      {isRevealed ? c.password : "••••••"}
                    </span>
                    {/* Show/hide */}
                    <button
                      onClick={() => toggleReveal(c.id)}
                      title={isRevealed ? "Hide" : "Show"}
                      style={{ padding: "3px 8px", borderRadius: 5, background: "hsl(270 30% 14%)", border: "1px solid hsl(270 25% 22%)", color: "hsl(270 45% 60%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}
                    >
                      {isRevealed ? "Hide" : "Show"}
                    </button>
                    {/* Copy */}
                    {isRevealed && (
                      <button
                        onClick={() => copyPassword(c.id, c.password)}
                        title="Copy password"
                        style={{ padding: "3px 8px", borderRadius: 5, background: isCopied ? "hsl(145 50% 18%)" : "hsl(270 30% 14%)", border: `1px solid ${isCopied ? "hsl(145 40% 28%)" : "hsl(270 25% 22%)"}`, color: isCopied ? "hsl(145 60% 65%)" : "hsl(270 45% 60%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}
                      >
                        {isCopied ? "Copied!" : "Copy"}
                      </button>
                    )}
                    {/* Reset */}
                    <button
                      onClick={() => handleResetPassword(c.id)}
                      title="Generate new password"
                      style={{ padding: "3px 8px", borderRadius: 5, background: "hsl(35 30% 13%)", border: "1px solid hsl(35 25% 22%)", color: "hsl(38 55% 55%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}
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
          {callers.length} {callers.length === 1 ? "caller" : "callers"}{filterCampus ? ` at ${filterCampus}` : ""}
        </p>
      </div>
    </div>
  );
}

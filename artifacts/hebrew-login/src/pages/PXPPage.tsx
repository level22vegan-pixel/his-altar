import { useState } from "react";
import { useLocation } from "wouter";
import { useListDbancContacts, useCreateActivityLog } from "@workspace/api-client-react";
import { useEffect } from "react";

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

function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

export default function PXPPage() {
  const [, navigate] = useLocation();
  const logAccess = useCreateActivityLog();

  const [callerName, setCallerName] = useState(() => localStorage.getItem("pxp_caller") ?? "");
  const [callerCampus, setCallerCampus] = useState(() => localStorage.getItem("pxp_campus") ?? "");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data } = useListDbancContacts();

  useEffect(() => {
    logAccess.mutate({ data: { tool: "pxp", action: "page_access" } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contacts = (data?.contacts ?? []).filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const selected = contacts.find(c => c.id === selectedId) ?? (data?.contacts ?? []).find(c => c.id === selectedId);

  function handleStartCall() {
    if (!callerName.trim() || !selectedId || !callerCampus) return;
    localStorage.setItem("pxp_caller", callerName.trim());
    localStorage.setItem("pxp_campus", callerCampus);
    navigate(`/admin/pxp/call?contactId=${selectedId}&callerName=${encodeURIComponent(callerName.trim())}&campus=${encodeURIComponent(callerCampus)}`);
  }

  const canStart = !!callerName.trim() && !!selectedId && !!callerCampus;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}
    >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(270 70% 55%), hsl(300 60% 55%), hsl(270 70% 55%))" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(270 50% 60% / 0.06) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      {/* Back */}
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
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 6vw, 3rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.28em", textTransform: "uppercase", textShadow: "0 0 40px hsl(270 60% 50% / 0.6)" }}>
            PXP
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(270 40% 58%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", marginTop: 6, textTransform: "uppercase" }}>
            Prayer Follow-Up System
          </p>
        </div>

        {/* Step 1: Caller info */}
        <div style={{ background: "hsl(270 35% 11%)", border: "1px solid hsl(270 30% 22%)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <p style={{ color: "hsl(270 40% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Step 1 — Caller Info
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              style={inputStyle}
              placeholder="Your name (will appear in script)"
              value={callerName}
              onChange={e => setCallerName(e.target.value)}
            />
            <select
              style={{ ...inputStyle, appearance: "none" as const }}
              value={callerCampus}
              onChange={e => setCallerCampus(e.target.value)}
            >
              <option value="">Your campus…</option>
              {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Step 2: Select contact */}
        <div style={{ background: "hsl(270 35% 11%)", border: "1px solid hsl(270 30% 22%)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p style={{ color: "hsl(270 40% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Step 2 — Select Contact to Call
          </p>

          <input
            style={{ ...inputStyle, marginBottom: 12 }}
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 8, border: "1px solid hsl(270 25% 18%)" }}>
            {contacts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "hsl(270 25% 40%)", fontFamily: "Georgia, serif", fontSize: 12 }}>
                {search ? "No contacts match" : "No contacts in Dbanc yet"}
              </div>
            ) : (
              contacts.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: c.id === selectedId ? "hsl(270 50% 18%)" : i % 2 === 0 ? "transparent" : "hsl(270 30% 9%)",
                    border: "none",
                    borderBottom: i < contacts.length - 1 ? "1px solid hsl(270 25% 14%)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    outline: c.id === selectedId ? "2px solid hsl(270 60% 45%)" : "none",
                    outlineOffset: -2,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: c.id === selectedId ? "hsl(270 60% 35%)" : `hsl(${(c.id * 47) % 360} 50% 30%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "hsl(0 0% 95%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold",
                  }}>
                    {c.firstName[0]}{c.lastName[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: c.id === selectedId ? "hsl(270 80% 85%)" : "hsl(0 0% 90%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>
                      {c.firstName} {c.lastName}
                    </div>
                    <div style={{ color: "hsl(270 30% 50%)", fontFamily: "Georgia, serif", fontSize: 11 }}>
                      {formatPhone(c.phone)}{c.campus ? ` · ${c.campus}` : ""}
                    </div>
                  </div>
                  {c.id === selectedId && (
                    <span style={{ color: "hsl(270 70% 65%)", fontSize: 16 }}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {selected && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "hsl(270 50% 14%)", borderRadius: 6, border: "1px solid hsl(270 40% 25%)" }}>
              <span style={{ color: "hsl(270 60% 70%)", fontFamily: "Georgia, serif", fontSize: 12 }}>
                Selected: <strong>{selected.firstName} {selected.lastName}</strong> · {formatPhone(selected.phone)}
              </span>
            </div>
          )}
        </div>

        {/* Start Call */}
        <button
          onClick={handleStartCall}
          disabled={!canStart}
          style={{
            width: "100%",
            padding: "16px 0",
            borderRadius: 12,
            background: canStart
              ? "linear-gradient(135deg, hsl(270 65% 40%), hsl(270 60% 28%))"
              : "hsl(270 25% 15%)",
            color: canStart ? "hsl(0 0% 97%)" : "hsl(270 20% 40%)",
            fontFamily: "Georgia, serif",
            fontSize: 14,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            border: `1px solid ${canStart ? "hsl(270 55% 45%)" : "hsl(270 20% 22%)"}`,
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 4px 30px hsl(270 60% 25% / 0.5)" : "none",
            transition: "all 0.2s",
          }}
        >
          {canStart ? `Start Call with ${selected?.firstName}` : "Complete steps above to start"}
        </button>

      </div>
    </div>
  );
}

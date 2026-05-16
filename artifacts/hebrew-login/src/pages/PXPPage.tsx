import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListDbancContacts, useListPxpCallers, useCreateActivityLog, useListPxpCallLogs } from "@workspace/api-client-react";
import { getSessionUserName, getValidCampusSession, getValidCallerSession, clearAllSessions } from "@/lib/session";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];

const CAMPUS_SERVICES: Record<string, string[]> = {
  HALLMARK:  ["Sunday 8am", "Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  ARROWHEAD: ["Sunday 10am", "Sunday 12pm", "Wednesday 7pm"],
  RIVERSIDE: ["Sunday 10am", "Sunday 12pm"],
  POMONA:    ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
  LA:        ["Sunday 8am", "Sunday 9am", "Wednesday 7pm"],
  ARIZONA:   ["Sunday 9am", "Sunday 11am", "Wednesday 7pm"],
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 25% 22%)",
  background: "hsl(270 10% 4%)",
  color: "hsl(270 40% 88%)",
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

  const campusSession = getValidCampusSession();
  const callerSession = getValidCallerSession();

  const lockedCampus = callerSession?.campus ?? campusSession?.campus ?? null;
  const lockedCallerName = callerSession?.callerName ?? null;
  const isCallerSession = !!callerSession;

  const [callerCampus, setCallerCampus] = useState(() => lockedCampus ?? localStorage.getItem("pxp_campus") ?? "HALLMARK");
  const [selectedCallerId, setSelectedCallerId] = useState<number | "manual" | null>(null);
  const [manualName, setManualName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [contactFilter, setContactFilter] = useState<"all" | "called">("all");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const activeCampus = lockedCampus ?? callerCampus;

  const { data: callersData } = useListPxpCallers(
    !isCallerSession && activeCampus ? { campus: activeCampus } : undefined
  );
  const { data } = useListDbancContacts(
    lockedCampus ? { campus: lockedCampus } : undefined
  );
  const { data: logsData } = useListPxpCallLogs({});

  const callers = callersData?.callers ?? [];
  const allLogs = logsData?.logs ?? [];
  const calledContactIds = new Set(allLogs.map(l => l.contactId));

  const contactAttempts = new Map<number, typeof allLogs>();
  for (const log of allLogs) {
    if (!contactAttempts.has(log.contactId)) contactAttempts.set(log.contactId, []);
    contactAttempts.get(log.contactId)!.push(log);
  }
  for (const [id, attempts] of contactAttempts) {
    contactAttempts.set(id, [...attempts].sort((a, b) => new Date(a.calledAt).getTime() - new Date(b.calledAt).getTime()));
  }

  function outcomeColor(outcome: string) {
    const o = outcome.toLowerCase();
    if (o.includes("pray") || o.includes("connect") || o.includes("spoke") || o.includes("success") || o.includes("accept") || o.includes("saved") || o.includes("yes"))
      return "hsl(140 55% 38%)";
    if (o.includes("no answer") || o.includes("voicemail") || o.includes("missed") || o.includes("busy") || o.includes("later") || o.includes("callback"))
      return "hsl(38 75% 45%)";
    if (o.includes("ended early") || o.includes("declin") || o.includes("refus") || o.includes("hung") || o.includes("no") || o.includes("not interest"))
      return "hsl(0 60% 42%)";
    return "hsl(270 50% 42%)";
  }

  useEffect(() => {
    logAccess.mutate({ data: { tool: "pxp", action: "page_access", userName: getSessionUserName() } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lockedCampus) setCallerCampus(lockedCampus);
  }, [lockedCampus]);

  useEffect(() => {
    setSelectedCallerId(null);
    setManualName("");
    setServiceFilter("");
  }, [callerCampus]);

  const callerName = isCallerSession
    ? lockedCallerName ?? ""
    : selectedCallerId === "manual"
      ? manualName.trim()
      : callers.find(c => c.id === selectedCallerId)?.name ?? "";

  const allContacts = [...(data?.contacts ?? [])].sort((a, b) => sortOrder === "newest" ? b.id - a.id : a.id - b.id);

  const filteredByTab = contactFilter === "called"
    ? allContacts.filter(c => calledContactIds.has(c.id))
    : allContacts;

  const filteredByService = serviceFilter
    ? filteredByTab.filter(c => c.serviceTime === serviceFilter)
    : filteredByTab;

  const contacts = filteredByService.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const selected = contacts.find(c => c.id === selectedId) ?? allContacts.find(c => c.id === selectedId);

  useEffect(() => {
    if (selected?.serviceTime) setServiceFilter(selected.serviceTime);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStartCall() {
    if (!callerName || !selectedId || !activeCampus) return;
    if (!lockedCampus) localStorage.setItem("pxp_campus", callerCampus);
    const serviceParam = serviceFilter ? `&service=${encodeURIComponent(serviceFilter)}` : "";
    navigate(`/admin/pxp/call?contactId=${selectedId}&callerName=${encodeURIComponent(callerName)}&campus=${encodeURIComponent(activeCampus)}${serviceParam}`);
  }

  function handleSignOut() {
    clearAllSessions();
    navigate("/");
  }

  const canStart = !!callerName && !!selectedId && !!activeCampus;
  const calledCount = allContacts.filter(c => calledContactIds.has(c.id)).length;

  const backBtnStyle = {
    color: "hsl(270 45% 68%)",
    fontFamily: "Georgia, serif",
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    background: "hsl(270 20% 9%)",
    border: "1px solid hsl(270 30% 22%)",
    borderRadius: 6,
    padding: "5px 12px",
    cursor: "pointer",
  };

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: "7px 0",
    borderRadius: 6,
    background: active ? "hsl(270 50% 16%)" : "transparent",
    color: active ? "hsl(270 70% 78%)" : "hsl(270 20% 42%)",
    fontFamily: "Georgia, serif",
    fontSize: 11,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    border: active ? "1px solid hsl(270 50% 32%)" : "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "hsl(270 8% 3%)" }}
    >
      {isCallerSession ? (
        <button onClick={handleSignOut} className="fixed top-5 left-6 z-50" style={backBtnStyle}>
          ← Sign Out
        </button>
      ) : (
        <button onClick={() => navigate("/admin")} className="fixed top-5 left-6 z-50" style={backBtnStyle}>
          ← Admin
        </button>
      )}

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 6vw, 3rem)", color: "hsl(270 55% 88%)", letterSpacing: "0.28em", textTransform: "uppercase", textShadow: "0 0 40px hsl(270 60% 50% / 0.5)" }}>
            PXP
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(270 30% 50%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", marginTop: 6, textTransform: "uppercase" }}>
            Prayer Follow-Up System
          </p>

          {isCallerSession && (
            <div style={{ display: "inline-block", marginTop: 8, padding: "3px 14px", background: "hsl(270 40% 14%)", border: "1px solid hsl(270 40% 26%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(270 65% 75%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {lockedCallerName} · {lockedCampus}
              </span>
            </div>
          )}
          {!isCallerSession && lockedCampus && (
            <div style={{ display: "inline-block", marginTop: 8, padding: "3px 14px", background: "hsl(270 40% 14%)", border: "1px solid hsl(270 40% 26%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(270 65% 75%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {lockedCampus} · {campusSession?.role === "lead" ? "Lead" : "Deputy Lead"}
              </span>
            </div>
          )}
        </div>

        <div style={{ background: "hsl(270 12% 7%)", border: "1px solid hsl(270 25% 18%)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <p style={{ color: "hsl(270 35% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Step 1 — Caller Info
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {isCallerSession ? (
              <>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                  <span style={{ color: "hsl(270 60% 72%)" }}>{lockedCampus}</span>
                  <span style={{ color: "hsl(270 20% 46%)", fontSize: 10, letterSpacing: "0.1em" }}>CAMPUS</span>
                </div>
                <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                  <span style={{ color: "hsl(270 60% 72%)" }}>{lockedCallerName}</span>
                  <span style={{ color: "hsl(270 20% 46%)", fontSize: 10, letterSpacing: "0.1em" }}>YOUR NAME</span>
                </div>
              </>
            ) : (
              <>
                {!lockedCampus && (
                  <select style={{ ...inputStyle, appearance: "none" as const }} value={callerCampus} onChange={e => setCallerCampus(e.target.value)}>
                    {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {lockedCampus && (
                  <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                    <span style={{ color: "hsl(270 60% 72%)" }}>{lockedCampus}</span>
                    <span style={{ color: "hsl(270 20% 46%)", fontSize: 10, letterSpacing: "0.1em" }}>CAMPUS LOCKED</span>
                  </div>
                )}
                {callers.length > 0 ? (
                  <>
                    <select
                      style={{ ...inputStyle, appearance: "none" as const }}
                      value={selectedCallerId === "manual" ? "manual" : (selectedCallerId ?? "")}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === "manual") setSelectedCallerId("manual");
                        else if (v === "") setSelectedCallerId(null);
                        else setSelectedCallerId(parseInt(v));
                      }}
                    >
                      <option value="">Select caller…</option>
                      {callers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="manual">— Enter name manually —</option>
                    </select>
                    {selectedCallerId === "manual" && (
                      <input style={inputStyle} placeholder="Type caller name…" value={manualName} onChange={e => setManualName(e.target.value)} />
                    )}
                  </>
                ) : (
                  <input
                    style={inputStyle}
                    placeholder="Caller name (no callers registered yet)"
                    value={manualName}
                    onChange={e => { setManualName(e.target.value); setSelectedCallerId("manual"); }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ background: "hsl(270 12% 7%)", border: "1px solid hsl(270 25% 18%)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <p style={{ color: "hsl(270 35% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14 }}>
            Step 2 — Select Contact to Call
            {lockedCampus && <span style={{ marginLeft: 8, opacity: 0.6 }}>({lockedCampus})</span>}
          </p>

          <div style={{ display: "flex", background: "hsl(270 12% 5%)", borderRadius: 8, padding: 3, marginBottom: 12, gap: 3 }}>
            {(["all", "called"] as const).map(tab => (
              <button key={tab} onClick={() => setContactFilter(tab)} style={tabStyle(contactFilter === tab)}>
                {tab === "all" ? `All (${allContacts.length})` : `Called (${calledCount})`}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 10 }}>
            <select
              style={{ ...inputStyle, appearance: "none" as const, color: serviceFilter ? "hsl(270 65% 75%)" : "hsl(270 20% 50%)" }}
              value={serviceFilter}
              onChange={e => { setServiceFilter(e.target.value); setSelectedId(null); }}
            >
              <option value="">All service times</option>
              {(CAMPUS_SERVICES[activeCampus] ?? []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", background: "hsl(270 12% 5%)", borderRadius: 8, padding: 3, marginBottom: 10, gap: 3 }}>
            {(["newest", "oldest"] as const).map(opt => (
              <button key={opt} onClick={() => setSortOrder(opt)} style={tabStyle(sortOrder === opt)}>
                {opt === "newest" ? "Newest First" : "Oldest First"}
              </button>
            ))}
          </div>

          <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />

          <div style={{ maxHeight: 280, overflowY: "auto", borderRadius: 8, border: "1px solid hsl(270 20% 12%)" }}>
            {contacts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "hsl(270 20% 38%)", fontFamily: "Georgia, serif", fontSize: 12 }}>
                {search ? "No contacts match" : contactFilter === "called" ? "No contacts have been called yet" : lockedCampus ? `No contacts for ${lockedCampus} yet` : "No contacts in Dbanc yet"}
              </div>
            ) : (
              contacts.map((c, i) => {
                const isSelected = c.id === selectedId;
                const attempts = contactAttempts.get(c.id) ?? [];
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      borderBottom: i < contacts.length - 1 ? "1px solid hsl(270 15% 9%)" : "none",
                      background: isSelected ? "hsl(270 45% 14%)" : i % 2 === 0 ? "transparent" : "hsl(270 10% 5%)",
                      outline: isSelected ? "2px solid hsl(270 60% 42%)" : "none",
                      outlineOffset: -2,
                    }}
                  >
                    <button
                      onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: isSelected ? "hsl(270 50% 22%)" : `hsl(${(c.id * 47) % 360} 35% 20%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "hsl(270 20% 88%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold",
                      }}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ color: isSelected ? "hsl(270 75% 84%)" : "hsl(270 20% 88%)", fontFamily: "Georgia, serif", fontSize: 13, fontWeight: "bold" }}>
                            {c.firstName} {c.lastName}
                          </span>
                          {c.crisisFlag && (
                            <span style={{ background: "hsl(0 60% 16%)", color: "hsl(0 75% 65%)", borderRadius: 4, padding: "1px 6px", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.1em" }}>⚠ Crisis</span>
                          )}
                          {c.doNotContact && (
                            <span style={{ background: "hsl(35 45% 12%)", color: "hsl(35 70% 55%)", borderRadius: 4, padding: "1px 6px", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.1em" }}>✕ DNC</span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                          {[0, 1, 2].map(idx => {
                            const attempt = attempts[idx];
                            const color = attempt ? outcomeColor(attempt.outcome) : undefined;
                            return (
                              <div
                                key={idx}
                                title={attempt ? `Call ${idx + 1}: ${attempt.outcome}` : `Call ${idx + 1}: not attempted`}
                                style={{
                                  flex: 1, minHeight: 28, borderRadius: 6,
                                  background: color ?? "hsl(270 12% 7%)",
                                  border: `2px solid ${color ?? "hsl(270 20% 18%)"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                }}
                              >
                                <span style={{ color: color ? "hsl(0 0% 97%)" : "hsl(270 20% 36%)", fontSize: idx === 0 ? 12 : idx === 1 ? 11 : 10 }}>
                                  {"📞".repeat(idx + 1)}
                                </span>
                                {attempt && (
                                  <span style={{ color: "hsl(0 0% 97%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                    {attempt.outcome.slice(0, 9)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div style={{ color: "hsl(270 20% 48%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 4 }}>
                          {formatPhone(c.phone)}{!lockedCampus && c.campus ? ` · ${c.campus}` : ""}
                        </div>
                      </div>
                      {isSelected && <span style={{ color: "hsl(270 65% 68%)", fontSize: 15 }}>✓</span>}
                    </button>

                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/admin/pxp/contacts/${c.id}`); }}
                      title="View profile"
                      style={{
                        padding: "11px 12px", background: "none", border: "none",
                        borderLeft: "1px solid hsl(270 15% 10%)",
                        color: "hsl(270 25% 45%)", cursor: "pointer",
                        fontFamily: "Georgia, serif", fontSize: 13, flexShrink: 0, transition: "color 0.15s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.color = "hsl(270 65% 70%)"; }}
                      onMouseOut={e => { e.currentTarget.style.color = "hsl(270 25% 45%)"; }}
                    >
                      ›
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          onClick={handleStartCall}
          disabled={!canStart}
          style={{
            width: "100%", padding: "15px 0", borderRadius: 12,
            background: canStart ? "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))" : "hsl(270 12% 8%)",
            color: canStart ? "hsl(270 20% 95%)" : "hsl(270 20% 36%)",
            fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.25em", textTransform: "uppercase",
            border: `1px solid ${canStart ? "hsl(270 55% 46%)" : "hsl(270 20% 14%)"}`,
            cursor: canStart ? "pointer" : "not-allowed", transition: "all 0.2s",
          }}
        >
          📞 Start Call
        </button>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => navigate("/admin/pxp/logs")}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "hsl(270 12% 7%)", color: "hsl(270 35% 58%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", border: "1px solid hsl(270 20% 16%)", cursor: "pointer" }}
          >
            Call History
          </button>
          <button
            onClick={() => navigate("/admin/pxp/script")}
            style={{ flex: 1, padding: "11px 0", borderRadius: 10, background: "hsl(270 12% 7%)", color: "hsl(270 35% 58%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", border: "1px solid hsl(270 20% 16%)", cursor: "pointer" }}
          >
            Edit Script
          </button>
        </div>
      </div>
    </div>
  );
}

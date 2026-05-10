import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetDbancContact,
  useListPxpCallLogs,
  useListPxpCallers,
  useUpdateDbancContact,
} from "@workspace/api-client-react";
import { getValidCallerSession } from "@/lib/session";

function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

const S = {
  label: {
    color: "hsl(270 40% 55%)",
    fontFamily: "Georgia, serif",
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  card: {
    background: "hsl(270 35% 11%)",
    border: "1px solid hsl(270 30% 22%)",
    borderRadius: 12,
    padding: 20,
    marginBottom: 14,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid hsl(270 30% 28%)",
    background: "hsl(270 40% 10%)",
    color: "hsl(0 0% 92%)",
    fontFamily: "Georgia, serif",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  },
};

export default function PXPContactProfilePage() {
  const params = useParams<{ id: string }>();
  const contactId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const callerSession = getValidCallerSession();
  const isCallerSession = !!callerSession;

  const { data: contact, isLoading } = useGetDbancContact(contactId, {
    query: { enabled: !!contactId, queryKey: [`/api/dbanc/contacts/${contactId}`] },
  });
  const { data: logsData } = useListPxpCallLogs(
    contactId ? { contactId } : undefined
  );
  const { data: callersData } = useListPxpCallers(
    contact?.campus ? { campus: contact.campus } : undefined
  );
  const updateContact = useUpdateDbancContact();

  const logs = logsData?.logs ?? [];
  const callers = callersData?.callers ?? [];

  const [crisisFlag, setCrisisFlag] = useState(false);
  const [doNotContact, setDoNotContact] = useState(false);
  const [assignedCallerId, setAssignedCallerId] = useState<number | null>(null);
  const [servicesNotes, setServicesNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const autoAssigned = useRef(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((s: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!contact) return;
    setCrisisFlag(contact.crisisFlag ?? false);
    setDoNotContact(contact.doNotContact ?? false);
    setServicesNotes(contact.servicesNotes ?? "");

    // If a caller is signed in, always assign them to this contact
    if (isCallerSession && callerSession) {
      setAssignedCallerId(callerSession.callerId);
      // Auto-save the assignment if it's not already set to this caller
      if (!autoAssigned.current && contact.assignedCallerId !== callerSession.callerId) {
        autoAssigned.current = true;
        updateContact.mutate({
          id: contactId,
          data: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            phone: contact.phone,
            serviceTime: contact.serviceTime ?? "",
            assignedCallerId: callerSession.callerId,
          },
        });
      } else {
        autoAssigned.current = true;
      }
    } else {
      setAssignedCallerId(contact.assignedCallerId ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  async function handleSave() {
    if (saving || !contactId) return;
    setSaving(true);
    setSaved(false);
    await updateContact.mutateAsync({
      id: contactId,
      data: {
        firstName: contact!.firstName,
        lastName: contact!.lastName,
        phone: contact!.phone,
        serviceTime: contact!.serviceTime ?? "",
        crisisFlag,
        doNotContact,
        assignedCallerId,
        servicesNotes,
      },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleStartCall() {
    // Caller sessions use their own name; admins use the assigned caller's name
    const callerName = isCallerSession
      ? (callerSession?.callerName ?? "")
      : (callers.find(c => c.id === assignedCallerId)?.name ?? "");
    navigate(
      `/admin/pxp/call?contactId=${contactId}&callerName=${encodeURIComponent(callerName)}&campus=${encodeURIComponent(contact?.campus ?? "")}`
    );
  }

  if (isLoading || !contact) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}>
        <span style={{ color: "hsl(270 40% 55%)", fontFamily: "Georgia, serif", fontSize: 14 }}>Loading…</span>
      </div>
    );
  }

  const assignedCaller = callers.find(c => c.id === assignedCallerId);

  const iconBtn = (id: string, icon: React.ReactNode, badge?: number | boolean) => {
    const active = openSections.has(id);
    return (
      <button
        key={id}
        onClick={() => toggleSection(id)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          padding: "14px 6px",
          background: active ? "hsl(270 50% 18%)" : "hsl(270 30% 10%)",
          border: `2px solid ${active ? "hsl(270 60% 45%)" : "hsl(270 25% 20%)"}`,
          borderRadius: 16,
          cursor: "pointer",
          position: "relative",
          transition: "all 0.18s",
        }}
      >
        <div style={{ color: active ? "hsl(270 75% 80%)" : "hsl(270 20% 44%)", transition: "color 0.18s" }}>
          {icon}
        </div>
        {!!badge && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            minWidth: 18, height: 18, borderRadius: 9,
            background: "hsl(270 65% 50%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "hsl(0 0% 97%)", fontSize: 9, fontFamily: "Georgia, serif",
          }}>
            {typeof badge === "number" ? badge : ""}
          </div>
        )}
      </button>
    );
  };

  // SVG icons
  const IconPerson = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
  const IconFlag = (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M5 3h12l-3 5 3 5H5V3z" />
    </svg>
  );
  const IconChat = (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z" />
    </svg>
  );
  const IconClock = (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
    </svg>
  );

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(270 70% 55%), hsl(300 60% 55%), hsl(270 70% 55%))" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(270 50% 60% / 0.05) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <button
        onClick={() => navigate("/admin/pxp")}
        className="absolute top-5 left-6 z-20 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← PXP
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-24">

        {/* Header — always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 58, height: 58, borderRadius: "50%", flexShrink: 0,
            background: `hsl(${(contactId * 47) % 360} 40% 26%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "hsl(0 0% 90%)", fontFamily: "Georgia, serif", fontSize: 20, fontWeight: "bold",
            border: "2px solid hsl(270 30% 28%)",
          }}>
            {contact.firstName[0]}{contact.lastName[0]}
          </div>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.2rem, 4vw, 1.7rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.1em" }}>
              {contact.firstName} {contact.lastName}
            </h1>
            <p style={{ color: "hsl(270 35% 52%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.08em", marginTop: 2 }}>
              {formatPhone(contact.phone)}{contact.campus ? ` · ${contact.campus}` : ""}
            </p>
            {contact.serviceTime && (
              <div style={{ display: "inline-block", marginTop: 5, padding: "3px 10px", background: "hsl(270 45% 16%)", border: "1px solid hsl(270 40% 30%)", borderRadius: 20 }}>
                <span style={{ color: "hsl(270 65% 76%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  🕐 {contact.serviceTime}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Always-visible status chips */}
        {(crisisFlag || doNotContact) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {crisisFlag && (
              <div style={{ padding: "4px 12px", background: "hsl(0 70% 18%)", border: "1px solid hsl(0 60% 35%)", borderRadius: 20 }}>
                <span style={{ color: "hsl(0 80% 70%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>⚠ Crisis</span>
              </div>
            )}
            {doNotContact && (
              <div style={{ padding: "4px 12px", background: "hsl(35 60% 14%)", border: "1px solid hsl(35 55% 30%)", borderRadius: 20 }}>
                <span style={{ color: "hsl(35 80% 65%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>✕ DNC</span>
              </div>
            )}
          </div>
        )}

        {/* Icon navigation dock */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {iconBtn("contact", IconPerson)}
          {iconBtn("flags", IconFlag, crisisFlag || doNotContact)}
          {iconBtn("notes", IconChat)}
          {iconBtn("history", IconClock, logs.length || undefined)}
        </div>

        {/* — Contact Info panel — */}
        {openSections.has("contact") && (
          <div style={{ ...S.card, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Gender", contact.gender || "—"],
                ["Carrier", contact.carrier || "—"],
                ["Campus", contact.campus || "—"],
                ["Service", contact.serviceTime || "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ background: "hsl(270 30% 8%)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ color: "hsl(270 30% 40%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                  <div style={{ color: "hsl(0 0% 88%)", fontFamily: "Georgia, serif", fontSize: 13 }}>{val}</div>
                </div>
              ))}
            </div>
            {contact.notes && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: "hsl(270 30% 8%)", borderRadius: 8 }}>
                <div style={{ color: "hsl(270 30% 40%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Prayer Notes</div>
                <div style={{ color: "hsl(0 0% 82%)", fontFamily: "Georgia, serif", fontSize: 12, lineHeight: 1.6 }}>{contact.notes}</div>
              </div>
            )}
            {(contact.prayedForBy || isCallerSession) && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: "hsl(270 30% 8%)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "hsl(270 60% 72%)", fontFamily: "Georgia, serif", fontSize: 12 }}>
                  {contact.prayedForBy || callerSession?.callerName}
                </span>
                <span style={{ color: "hsl(270 30% 42%)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {contact.prayedForBy ? "Prayed For By" : "Assigned Caller"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* — Flags & Preferences panel — */}
        {openSections.has("flags") && (
          <div style={{ ...S.card, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => setCrisisFlag(f => !f)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, background: crisisFlag ? "hsl(0 55% 14%)" : "hsl(270 30% 8%)", border: `1px solid ${crisisFlag ? "hsl(0 55% 30%)" : "hsl(270 25% 18%)"}`, cursor: "pointer" }}
              >
                <div>
                  <div style={{ color: crisisFlag ? "hsl(0 75% 68%)" : "hsl(0 0% 75%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "left" }}>Crisis Flag</div>
                  <div style={{ color: "hsl(270 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, textAlign: "left", marginTop: 2 }}>Mark contact as in crisis</div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: crisisFlag ? "hsl(0 65% 45%)" : "hsl(270 25% 22%)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 4, left: crisisFlag ? 22 : 4, width: 16, height: 16, borderRadius: "50%", background: "hsl(0 0% 97%)", transition: "left 0.2s" }} />
                </div>
              </button>
              <button
                onClick={() => setDoNotContact(f => !f)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 10, background: doNotContact ? "hsl(35 45% 11%)" : "hsl(270 30% 8%)", border: `1px solid ${doNotContact ? "hsl(35 50% 26%)" : "hsl(270 25% 18%)"}`, cursor: "pointer" }}
              >
                <div>
                  <div style={{ color: doNotContact ? "hsl(35 80% 62%)" : "hsl(0 0% 75%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "left" }}>Do Not Contact</div>
                  <div style={{ color: "hsl(270 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, textAlign: "left", marginTop: 2 }}>Prevent callers from calling this contact</div>
                </div>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: doNotContact ? "hsl(35 60% 40%)" : "hsl(270 25% 22%)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 4, left: doNotContact ? 22 : 4, width: 16, height: 16, borderRadius: "50%", background: "hsl(0 0% 97%)", transition: "left 0.2s" }} />
                </div>
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: "100%", marginTop: 12, padding: "11px 0", borderRadius: 10, background: saved ? "hsl(140 50% 18%)" : "hsl(270 50% 22%)", color: saved ? "hsl(140 70% 65%)" : "hsl(270 70% 80%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", border: `1px solid ${saved ? "hsl(140 50% 32%)" : "hsl(270 45% 36%)"}`, cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Flags"}
            </button>
          </div>
        )}

        {/* — Services & Feedback Notes panel — */}
        {openSections.has("notes") && (
          <div style={{ ...S.card, marginBottom: 14 }}>
            <textarea
              style={{ ...S.input, minHeight: 110, resize: "vertical" }}
              placeholder="Notes on services offered, follow-up feedback, prayer outcomes…"
              value={servicesNotes}
              onChange={e => setServicesNotes(e.target.value)}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: "100%", marginTop: 12, padding: "11px 0", borderRadius: 10, background: saved ? "hsl(140 50% 18%)" : "hsl(270 50% 22%)", color: saved ? "hsl(140 70% 65%)" : "hsl(270 70% 80%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", border: `1px solid ${saved ? "hsl(140 50% 32%)" : "hsl(270 45% 36%)"}`, cursor: saving ? "not-allowed" : "pointer", transition: "all 0.2s" }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Notes"}
            </button>
          </div>
        )}

        {/* — Call History panel — */}
        {openSections.has("history") && (
          <div style={{ ...S.card, marginBottom: 14 }}>
            {logs.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 12 }}>No calls logged yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ background: "hsl(270 30% 8%)", borderRadius: 8, padding: "12px 14px", border: "1px solid hsl(270 25% 15%)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <span style={{ color: "hsl(270 60% 68%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold" }}>{log.callerName}</span>
                      <span style={{ color: "hsl(270 25% 42%)", fontFamily: "Georgia, serif", fontSize: 10 }}>{formatDate(log.calledAt)}</span>
                    </div>
                    {log.outcome && <div style={{ marginBottom: 4 }}><span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, textTransform: "uppercase" }}>Outcome: </span><span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.outcome}</span></div>}
                    {log.servicesOffered && <div style={{ marginBottom: 4 }}><span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, textTransform: "uppercase" }}>Services: </span><span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.servicesOffered}</span></div>}
                    {log.feedback && <div><span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, textTransform: "uppercase" }}>Feedback: </span><span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.feedback}</span></div>}
                    {log.notes && <div><span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, textTransform: "uppercase" }}>Notes: </span><span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.notes}</span></div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Start Call / DNC notice — always visible */}
        <div style={{ marginTop: 8 }}>
          {doNotContact ? (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "hsl(35 35% 10%)", border: "1px solid hsl(35 40% 22%)", textAlign: "center" }}>
              <span style={{ color: "hsl(35 65% 55%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.1em" }}>
                Do Not Contact is active — calls disabled
              </span>
            </div>
          ) : (
            <button
              onClick={handleStartCall}
              style={{ width: "100%", padding: "15px 0", borderRadius: 12, background: "linear-gradient(135deg, hsl(270 65% 38%), hsl(270 58% 26%))", color: "hsl(0 0% 97%)", fontFamily: "Georgia, serif", fontSize: 14, letterSpacing: "0.25em", textTransform: "uppercase", border: "1px solid hsl(270 55% 45%)", cursor: "pointer", boxShadow: "0 4px 24px hsl(270 60% 20% / 0.5)" }}
            >
              📞 Call {contact.firstName}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

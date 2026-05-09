import { useState, useEffect, useRef } from "react";
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

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(270 70% 55%), hsl(300 60% 55%), hsl(270 70% 55%))" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(270 50% 60% / 0.05) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <button
        onClick={() => navigate("/admin/pxp")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← PXP
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-24">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: `hsl(${(contactId * 47) % 360} 50% 28%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "hsl(0 0% 95%)", fontFamily: "Georgia, serif", fontSize: 18, fontWeight: "bold",
          }}>
            {contact.firstName[0]}{contact.lastName[0]}
          </div>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.3rem, 4vw, 1.8rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.12em" }}>
              {contact.firstName} {contact.lastName}
            </h1>
            <p style={{ color: "hsl(270 40% 55%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.1em" }}>
              {formatPhone(contact.phone)}{contact.campus ? ` · ${contact.campus}` : ""}
            </p>
          </div>
        </div>

        {/* Flag badges row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {crisisFlag && (
            <div style={{ padding: "4px 12px", background: "hsl(0 70% 18%)", border: "1px solid hsl(0 60% 35%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(0 80% 70%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                ⚠ Crisis Flag Active
              </span>
            </div>
          )}
          {doNotContact && (
            <div style={{ padding: "4px 12px", background: "hsl(35 60% 14%)", border: "1px solid hsl(35 55% 30%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(35 80% 65%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                ✕ Do Not Contact
              </span>
            </div>
          )}
          {assignedCaller && (
            <div style={{ padding: "4px 12px", background: "hsl(270 40% 14%)", border: "1px solid hsl(270 35% 28%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(270 60% 68%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Caller: {assignedCaller.name}
              </span>
            </div>
          )}
        </div>

        {/* Contact Details */}
        <div style={S.card}>
          <p style={S.label}>Contact Info</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Gender", contact.gender || "—"],
              ["Carrier", contact.carrier || "—"],
              ["Campus", contact.campus || "—"],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "hsl(270 30% 8%)", borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ color: "hsl(270 30% 40%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                <div style={{ color: "hsl(0 0% 88%)", fontFamily: "Georgia, serif", fontSize: 13 }}>{val}</div>
              </div>
            ))}
          </div>
          {contact.notes && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "hsl(270 30% 8%)", borderRadius: 6 }}>
              <div style={{ color: "hsl(270 30% 40%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Notes</div>
              <div style={{ color: "hsl(0 0% 82%)", fontFamily: "Georgia, serif", fontSize: 12, lineHeight: 1.6 }}>{contact.notes}</div>
            </div>
          )}
        </div>

        {/* Flags & Preferences */}
        <div style={S.card}>
          <p style={S.label}>Flags &amp; Preferences</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Crisis Flag */}
            <button
              onClick={() => setCrisisFlag(f => !f)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 8,
                background: crisisFlag ? "hsl(0 55% 14%)" : "hsl(270 30% 8%)",
                border: `1px solid ${crisisFlag ? "hsl(0 55% 30%)" : "hsl(270 25% 18%)"}`,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ color: crisisFlag ? "hsl(0 75% 68%)" : "hsl(0 0% 75%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "left" }}>
                  Crisis Flag
                </div>
                <div style={{ color: "hsl(270 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.08em", textAlign: "left" }}>
                  Mark contact as in crisis — visible to all callers
                </div>
              </div>
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: crisisFlag ? "hsl(0 65% 45%)" : "hsl(270 25% 22%)",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute", top: 3, left: crisisFlag ? 21 : 3,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "hsl(0 0% 97%)", transition: "left 0.2s",
                }} />
              </div>
            </button>

            {/* Do Not Contact */}
            <button
              onClick={() => setDoNotContact(f => !f)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 8,
                background: doNotContact ? "hsl(35 45% 11%)" : "hsl(270 30% 8%)",
                border: `1px solid ${doNotContact ? "hsl(35 50% 26%)" : "hsl(270 25% 18%)"}`,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ color: doNotContact ? "hsl(35 80% 62%)" : "hsl(0 0% 75%)", fontFamily: "Georgia, serif", fontSize: 13, textAlign: "left" }}>
                  Do Not Contact
                </div>
                <div style={{ color: "hsl(270 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.08em", textAlign: "left" }}>
                  Prevent callers from initiating calls to this contact
                </div>
              </div>
              <div style={{
                width: 40, height: 22, borderRadius: 11,
                background: doNotContact ? "hsl(35 60% 40%)" : "hsl(270 25% 22%)",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute", top: 3, left: doNotContact ? 21 : 3,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "hsl(0 0% 97%)", transition: "left 0.2s",
                }} />
              </div>
            </button>
          </div>
        </div>

        {/* Assigned Caller — shown only when a caller is signed in */}
        {isCallerSession && (
          <div style={S.card}>
            <p style={S.label}>Assigned Caller</p>
            <div style={{ ...S.input, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.82 }}>
              <span style={{ color: "hsl(270 60% 72%)" }}>{callerSession?.callerName}</span>
              <span style={{ color: "hsl(270 30% 45%)", fontSize: 10, letterSpacing: "0.12em" }}>ASSIGNED FROM SIGN-IN</span>
            </div>
          </div>
        )}

        {/* Services & Feedback Notes */}
        <div style={S.card}>
          <p style={S.label}>Services Offered &amp; Feedback</p>
          <textarea
            style={{ ...S.input, minHeight: 100, resize: "vertical" }}
            placeholder="Notes on services offered, follow-up feedback, prayer outcomes…"
            value={servicesNotes}
            onChange={e => setServicesNotes(e.target.value)}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 10,
            background: saved ? "hsl(140 50% 18%)" : "linear-gradient(135deg, hsl(270 65% 38%), hsl(270 58% 28%))",
            color: saved ? "hsl(140 70% 65%)" : "hsl(0 0% 97%)",
            fontFamily: "Georgia, serif",
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            border: `1px solid ${saved ? "hsl(140 50% 32%)" : "hsl(270 50% 42%)"}`,
            cursor: saving ? "not-allowed" : "pointer",
            marginBottom: 14,
            transition: "all 0.2s",
          }}
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Profile"}
        </button>

        {/* Start Call Button */}
        {!doNotContact && (
          <button
            onClick={handleStartCall}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              background: "hsl(270 35% 16%)",
              color: "hsl(270 60% 72%)",
              fontFamily: "Georgia, serif",
              fontSize: 13,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              border: "1px solid hsl(270 30% 28%)",
              cursor: "pointer",
              marginBottom: 22,
            }}
          >
            Start Call with {contact.firstName}
          </button>
        )}

        {doNotContact && (
          <div style={{ padding: "10px 16px", borderRadius: 8, background: "hsl(35 35% 10%)", border: "1px solid hsl(35 40% 22%)", marginBottom: 22, textAlign: "center" }}>
            <span style={{ color: "hsl(35 65% 55%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.1em" }}>
              Do Not Contact is active — calls disabled for this contact
            </span>
          </div>
        )}

        {/* Call History */}
        <div style={S.card}>
          <p style={{ ...S.label, marginBottom: 12 }}>Call History ({logs.length})</p>
          {logs.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 12 }}>
              No calls logged yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: "hsl(270 30% 8%)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    border: "1px solid hsl(270 25% 15%)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ color: "hsl(270 60% 68%)", fontFamily: "Georgia, serif", fontSize: 12, fontWeight: "bold" }}>
                      {log.callerName}
                    </span>
                    <span style={{ color: "hsl(270 25% 42%)", fontFamily: "Georgia, serif", fontSize: 10 }}>
                      {formatDate(log.calledAt)}
                    </span>
                  </div>
                  {log.outcome && (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Outcome: </span>
                      <span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.outcome}</span>
                    </div>
                  )}
                  {log.servicesOffered && (
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Services: </span>
                      <span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.servicesOffered}</span>
                    </div>
                  )}
                  {log.feedback && (
                    <div>
                      <span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Feedback: </span>
                      <span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.feedback}</span>
                    </div>
                  )}
                  {log.notes && (
                    <div>
                      <span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>Notes: </span>
                      <span style={{ color: "hsl(0 0% 80%)", fontFamily: "Georgia, serif", fontSize: 12 }}>{log.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

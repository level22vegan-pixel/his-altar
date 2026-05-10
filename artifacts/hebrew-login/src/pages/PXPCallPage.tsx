import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetDbancContact, useGetPxpConfig, useCreatePxpCallLog } from "@workspace/api-client-react";

type ScriptNode = {
  id: string;
  text: string;
  isTerminal?: boolean;
  responses: Array<{
    id: string;
    label: string;
    text: string;
    isTerminal?: boolean;
    responses: ScriptNode["responses"];
  }>;
};

function fillPlaceholders(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function parseParams(search: string) {
  const p = new URLSearchParams(search);
  return {
    contactId: parseInt(p.get("contactId") ?? "0"),
    callerName: p.get("callerName") ?? "",
    campus: p.get("campus") ?? "",
  };
}

export default function PXPCallPage() {
  const [location, navigate] = useLocation();
  const params = parseParams(window.location.search);

  const { data: contactData } = useGetDbancContact(
    params.contactId ?? 0,
    { query: { enabled: !!params.contactId, queryKey: [`/api/dbanc/contacts/${params.contactId}`] } }
  );
  const { data: configData } = useGetPxpConfig();
  const logCall = useCreatePxpCallLog();

  const [nodeHistory, setNodeHistory] = useState<ScriptNode[]>([]);
  const [currentNode, setCurrentNode] = useState<ScriptNode | null>(null);
  const [outcome, setOutcome] = useState("");
  const [callDone, setCallDone] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [servicesOffered, setServicesOffered] = useState("");
  const [feedback, setFeedback] = useState("");

  const contact = contactData;
  const scriptTree = configData?.scriptTree as ScriptNode | undefined;

  const vars = {
    contact_name: contact ? `${contact.firstName}` : "...",
    caller_name: params.callerName || "...",
    campus: params.campus || "...",
  };

  useEffect(() => {
    if (scriptTree && !currentNode) {
      setCurrentNode(scriptTree);
    }
  }, [scriptTree, currentNode]);

  function handleResponse(response: ScriptNode["responses"][0]) {
    if (!currentNode) return;
    setNodeHistory(h => [...h, currentNode]);
    const nextNode: ScriptNode = {
      id: response.id,
      text: response.text,
      isTerminal: response.isTerminal,
      responses: response.responses,
    };
    setCurrentNode(nextNode);
    if (response.isTerminal || response.responses.length === 0) {
      setOutcome(response.label);
      setCallDone(true);
    }
  }

  function handleBack() {
    if (nodeHistory.length === 0) return;
    const prev = nodeHistory[nodeHistory.length - 1];
    setNodeHistory(h => h.slice(0, -1));
    setCurrentNode(prev);
    setCallDone(false);
  }

  async function handleLogAndFinish() {
    if (logging || logged) return;
    setLogging(true);
    await logCall.mutateAsync({
      data: {
        contactId: params.contactId,
        callerName: params.callerName,
        campus: params.campus,
        outcome,
        notes: "",
        servicesOffered,
        feedback,
      },
    });
    setLogged(true);
    setLogging(false);
  }

  if (!currentNode) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}>
        <span style={{ color: "hsl(270 40% 55%)", fontFamily: "Georgia, serif", fontSize: 14 }}>Loading script…</span>
      </div>
    );
  }

  const scriptText = fillPlaceholders(currentNode.text, vars);
  const depth = nodeHistory.length;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, hsl(270 50% 14%) 0%, hsl(260 45% 8%) 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(270 70% 55%), hsl(300 60% 55%), hsl(270 70% 55%))" }} />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, hsl(270 50% 60% / 0.05) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      {/* Back to PXP */}
      <button
        onClick={() => navigate("/admin/pxp")}
        className="absolute top-5 left-6 z-20 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← PXP
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "hsl(0 0% 96%)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              PXP Call
            </h1>
            {contact && (
              <p style={{ color: "hsl(270 45% 60%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
                Calling: {contact.firstName} {contact.lastName} · {params.callerName}
              </p>
            )}
          </div>
          {/* Progress dots */}
          <div style={{ display: "flex", gap: 5 }}>
            {[...Array(Math.max(1, depth + 1))].map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i === depth ? "hsl(270 65% 60%)" : "hsl(270 35% 30%)" }} />
            ))}
          </div>
        </div>

        {/* Script card */}
        <div
          style={{
            background: "hsl(270 35% 12%)",
            border: "1px solid hsl(270 35% 25%)",
            borderRadius: 14,
            padding: "28px 24px",
            marginBottom: 24,
            boxShadow: "0 8px 40px hsl(270 50% 8% / 0.6)",
            position: "relative",
          }}
        >
          {/* Label */}
          <div style={{ position: "absolute", top: -10, left: 20, background: "hsl(270 60% 35%)", color: "hsl(0 0% 97%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 20 }}>
            {callDone ? "Closing" : depth === 0 ? "Opening" : `Step ${depth + 1}`}
          </div>

          <p style={{
            color: "hsl(0 0% 96%)",
            fontFamily: "Georgia, serif",
            fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)",
            lineHeight: 1.7,
            letterSpacing: "0.02em",
          }}>
            {scriptText}
          </p>
        </div>

        {/* Response buttons or completion */}
        {callDone ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "hsl(270 40% 12%)", border: "1px solid hsl(270 35% 22%)", borderRadius: 10, padding: 16, textAlign: "center" }}>
              <p style={{ color: "hsl(270 60% 68%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
                Call Complete
              </p>
              <p style={{ color: "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 11 }}>
                Outcome: {outcome || "Completed"}
              </p>
            </div>

            {!logged && (
              <>
                <textarea
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid hsl(270 30% 28%)", background: "hsl(270 40% 10%)", color: "hsl(0 0% 92%)", fontFamily: "Georgia, serif", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 72 }}
                  placeholder="Services offered (prayer, counseling, food, referral…)"
                  value={servicesOffered}
                  onChange={e => setServicesOffered(e.target.value)}
                />
                <textarea
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid hsl(270 30% 28%)", background: "hsl(270 40% 10%)", color: "hsl(0 0% 92%)", fontFamily: "Georgia, serif", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", minHeight: 72 }}
                  placeholder="Contact's feedback or response…"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              </>
            )}

            {!logged ? (
              <button
                onClick={handleLogAndFinish}
                disabled={logging}
                style={{
                  padding: "13px 0",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, hsl(270 65% 38%), hsl(270 58% 28%))",
                  color: "hsl(0 0% 97%)",
                  fontFamily: "Georgia, serif",
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  border: "1px solid hsl(270 50% 42%)",
                  cursor: logging ? "not-allowed" : "pointer",
                }}
              >
                {logging ? "Logging…" : "Log Call & Return"}
              </button>
            ) : (
              <button
                onClick={() => navigate("/admin/pxp")}
                style={{
                  padding: "13px 0",
                  borderRadius: 10,
                  background: "hsl(270 35% 16%)",
                  color: "hsl(270 60% 70%)",
                  fontFamily: "Georgia, serif",
                  fontSize: 13,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  border: "1px solid hsl(270 30% 28%)",
                  cursor: "pointer",
                }}
              >
                ✓ Logged — Back to PXP
              </button>
            )}

            {!logged && depth > 0 && (
              <button
                onClick={handleBack}
                style={{ padding: "10px 0", borderRadius: 8, background: "none", color: "hsl(270 35% 48%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid hsl(270 25% 22%)", cursor: "pointer" }}
              >
                ← Go Back
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ color: "hsl(270 35% 50%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4, textAlign: "center" }}>
              Their response:
            </p>

            {currentNode.responses.map(r => (
              <button
                key={r.id}
                onClick={() => handleResponse(r)}
                style={{
                  padding: "13px 20px",
                  borderRadius: 10,
                  background: "hsl(270 40% 16%)",
                  color: "hsl(0 0% 92%)",
                  fontFamily: "Georgia, serif",
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  border: "1px solid hsl(270 35% 26%)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "hsl(270 50% 22%)";
                  e.currentTarget.style.borderColor = "hsl(270 50% 38%)";
                  e.currentTarget.style.color = "hsl(270 80% 88%)";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "hsl(270 40% 16%)";
                  e.currentTarget.style.borderColor = "hsl(270 35% 26%)";
                  e.currentTarget.style.color = "hsl(0 0% 92%)";
                }}
              >
                <span>{r.label}</span>
                <span style={{ opacity: 0.4 }}>→</span>
              </button>
            ))}

            {/* Manual end / voicemail handled by script, but provide escape */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {depth > 0 && (
                <button
                  onClick={handleBack}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "none", color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid hsl(270 20% 20%)", cursor: "pointer" }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={() => { setOutcome("Ended early"); setCallDone(true); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "none", color: "hsl(0 40% 45%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", border: "1px solid hsl(0 25% 22%)", cursor: "pointer" }}
              >
                End Call
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

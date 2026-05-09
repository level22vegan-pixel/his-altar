import { useLocation } from "wouter";
import { useListPxpCallLogs, useListDbancContacts } from "@workspace/api-client-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

export default function PXPLogsPage() {
  const [, navigate] = useLocation();
  const { data: logsData, isLoading } = useListPxpCallLogs({});
  const { data: contactsData } = useListDbancContacts();

  const logs = logsData?.logs ?? [];
  const contactsMap = Object.fromEntries(
    (contactsData?.contacts ?? []).map(c => [c.id, c])
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
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
        style={{ color: "hsl(270 50% 75%)", fontFamily: "Georgia, serif", background: "none", border: "none", cursor: "pointer" }}
      >
        ← PXP
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.4rem, 4vw, 2rem)", color: "hsl(0 0% 97%)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Call History
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
        </div>

        <div style={{ borderRadius: 10, border: "1px solid hsl(270 30% 20%)", background: "hsl(270 35% 10% / 0.8)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(270 35% 45%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(270 25% 38%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              No calls logged yet
            </div>
          ) : (
            logs.map((log, i) => {
              const contact = contactsMap[log.contactId];
              return (
                <div
                  key={log.id}
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < logs.length - 1 ? "1px solid hsl(270 25% 14%)" : "none",
                    background: i % 2 === 0 ? "transparent" : "hsl(270 30% 8% / 0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ color: "hsl(0 0% 92%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>
                        {contact ? `${contact.firstName} ${contact.lastName}` : `Contact #${log.contactId}`}
                      </span>
                    </div>
                    <span style={{ color: "hsl(270 30% 45%)", fontFamily: "Georgia, serif", fontSize: 11 }}>
                      {formatDate(log.calledAt)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ background: "hsl(270 45% 18%)", color: "hsl(270 60% 70%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      {log.callerName}
                    </span>
                    <span style={{ background: "hsl(270 30% 14%)", color: "hsl(270 40% 55%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.1em" }}>
                      {log.campus}
                    </span>
                    {log.outcome && (
                      <span style={{ background: "hsl(270 25% 12%)", color: "hsl(270 35% 50%)", borderRadius: 4, padding: "2px 8px", fontFamily: "Georgia, serif", fontSize: 10 }}>
                        {log.outcome}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "hsl(270 25% 35%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {logs.length} {logs.length === 1 ? "call" : "calls"} logged
        </p>
      </div>
    </div>
  );
}

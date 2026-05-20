import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getValidCampusSession, getValidAdminSession, getValidOrgSession, clearAllSessions, getOrgToken } from "@/lib/session";
import HamburgerMenu from "@/components/HamburgerMenu";

type FlaggedLog = {
  id: number;
  contactId: number;
  callerName: string;
  campus: string;
  outcome: string;
  flagNote: string;
  calledAt: string;
};

function MessageCenter() {
  const [logs, setLogs] = useState<FlaggedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dismissedFlags") ?? "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    const token = getOrgToken();
    fetch("/api/pxp/call-logs?flagged=true", {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function dismiss(id: number) {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    localStorage.setItem("dismissedFlags", JSON.stringify([...next]));
  }

  const visible = logs.filter(l => !dismissed.has(l.id));

  if (loading) return null;
  if (visible.length === 0) return (
    <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
      <p className="text-xs uppercase tracking-widest mb-2 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Message Center</p>
      <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 25% 38%)", letterSpacing: "0.04em" }}>No flagged contacts — all clear.</p>
    </div>
  );

  return (
    <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(0 40% 28%)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest opacity-80" style={{ color: "hsl(0 60% 62%)", fontFamily: "Georgia, serif" }}>
          🚩 Message Center · {visible.length} flag{visible.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map(log => (
          <div key={log.id} style={{ background: "hsl(0 30% 10%)", border: "1px solid hsl(0 40% 22%)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 60% 68%)", letterSpacing: "0.06em", marginBottom: 3 }}>
                  Contact #{log.contactId} · {log.campus}
                </p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 30% 48%)", letterSpacing: "0.04em", marginBottom: log.flagNote ? 6 : 0 }}>
                  Caller: {log.callerName} · Outcome: {log.outcome || "—"} · {new Date(log.calledAt).toLocaleDateString()}
                </p>
                {log.flagNote && (
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 60% 68%)", letterSpacing: "0.03em", fontStyle: "italic" }}>
                    "{log.flagNote}"
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(log.id)}
                title="Dismiss"
                style={{ background: "none", border: "none", color: "hsl(38 25% 38%)", cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const subBtn = (borderRight = true): React.CSSProperties => ({
  flex: 1,
  padding: "7px 10px",
  background: "hsl(38 20% 10%)",
  border: "none",
  borderRight: borderRight ? "1px solid hsl(38 15% 16%)" : "none",
  color: "hsl(38 40% 50%)",
  fontFamily: "Georgia, serif",
  fontSize: 10,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "all 0.15s",
});

export default function AdminPage() {
  const [, navigate] = useLocation();

  const session       = useMemo(() => getValidCampusSession(), []);
  const isMasterAdmin = useMemo(() => getValidAdminSession(), []);
  const orgSession    = useMemo(() => getValidOrgSession(), []);

  const isCampusUser = session !== null;
  const isLead       = session?.role === "lead";
  const campusName   = session?.campus ?? null;
  const showProfile  = !!(isMasterAdmin || orgSession);

  const attendanceRoute = campusName
    ? campusName === "HALLMARK"
      ? "/campus/hallmark"
      : `/campus/${campusName.toLowerCase().replace(/\s+/g, "-")}`
    : "/campus/hallmark";

  function handleBack() {
    if (isCampusUser) {
      navigate("/team");
    } else {
      clearAllSessions();
      navigate("/");
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-start py-12 px-4 overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)" }}
      />

      <div className="relative z-10 w-full max-w-xl">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/team")}
            className="text-xs uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
            style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
          >
            ← Back
          </button>
          <HamburgerMenu />
        </div>

        <h1
          className="text-2xl mb-1 tracking-widest uppercase text-center"
          style={{ color: "hsl(38 60% 65%)", fontFamily: "Georgia, serif" }}
        >
          {isLead ? campusName : "Admin Panel"}
        </h1>
        <p
          className="text-xs text-center mb-6 tracking-widest uppercase opacity-60"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
        >
          {isLead ? "Campus Lead" : "Manage settings & tools"}
        </p>

        {/* Message Center */}
        {isMasterAdmin && <MessageCenter />}

        {/* Extensions */}
        <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
          <p className="text-xs uppercase tracking-widest mb-3 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Extensions</p>
          <div className="flex flex-col gap-3">

            {/* Altar & Roster */}
            <div style={{ borderRadius: 8, border: "1px solid hsl(38 28% 22%)", overflow: "hidden" }}>
              <button
                onClick={() => navigate("/admin/altar-report")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "linear-gradient(135deg, hsl(38 45% 18%), hsl(38 38% 13%))", color: "hsl(38 70% 74%)", border: "none", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
              >
                <span>Altar Report</span>
                <span style={{ opacity: 0.45 }}>→</span>
              </button>
              <div style={{ display: "flex", borderTop: "1px solid hsl(38 15% 16%)" }}>
                <button
                  onClick={() => navigate("/admin/roster")}
                  style={subBtn()}
                  onMouseOver={e => { e.currentTarget.style.background = "hsl(38 30% 14%)"; e.currentTarget.style.color = "hsl(38 60% 65%)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "hsl(38 20% 10%)"; e.currentTarget.style.color = "hsl(38 40% 50%)"; }}
                >
                  Roster
                </button>
                {(!isCampusUser || isLead) && (
                  <button
                    onClick={() => navigate("/admin/service-times")}
                    style={subBtn()}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(38 30% 14%)"; e.currentTarget.style.color = "hsl(38 60% 65%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(38 20% 10%)"; e.currentTarget.style.color = "hsl(38 40% 50%)"; }}
                  >
                    Service Times
                  </button>
                )}
              </div>
            </div>

            {/* Dbanc */}
            <div style={{ borderRadius: 8, border: "1px solid hsl(215 35% 24%)", overflow: "hidden" }}>
              <button
                onClick={() => navigate("/admin/dbanc")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "linear-gradient(135deg, hsl(215 48% 18%), hsl(215 42% 13%))", color: "hsl(215 75% 74%)", border: "none", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
              >
                <span>Dbanc</span>
                <span style={{ opacity: 0.45 }}>→</span>
              </button>
              <div style={{ display: "flex", borderTop: "1px solid hsl(215 30% 18%)" }}>
                {(!isCampusUser || isLead) && (
                  <button
                    onClick={() => navigate("/admin/dbanc/fields")}
                    style={{ flex: 1, padding: "7px 10px", background: "hsl(215 35% 11%)", border: "none", borderRight: "1px solid hsl(215 30% 18%)", color: "hsl(215 50% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(215 40% 15%)"; e.currentTarget.style.color = "hsl(215 65% 68%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(215 35% 11%)"; e.currentTarget.style.color = "hsl(215 50% 55%)"; }}
                  >
                    Custom Fields
                  </button>
                )}
              </div>
            </div>

            {/* PXP */}
            <div style={{ borderRadius: 8, border: "1px solid hsl(270 30% 20%)", overflow: "hidden" }}>
              <button
                onClick={() => navigate("/admin/pxp")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "linear-gradient(135deg, hsl(270 55% 22%), hsl(270 50% 14%))", color: "hsl(270 65% 78%)", border: "none", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
              >
                <span>PXP</span>
                <span style={{ opacity: 0.45 }}>→</span>
              </button>
              <div style={{ display: "flex", borderTop: "1px solid hsl(270 20% 14%)" }}>
                {(!isCampusUser || isLead) && (
                  <button
                    onClick={() => navigate("/admin/pxp/script")}
                    style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", borderRight: "1px solid hsl(270 20% 14%)", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                  >
                    Script
                  </button>
                )}
                <button
                  onClick={() => navigate("/admin/pxp/callers")}
                  style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", borderRight: "1px solid hsl(270 20% 14%)", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                  onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                >
                  Follow-Up Team
                </button>
                <button
                  onClick={() => navigate("/admin/pxp/logs")}
                  style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", borderRight: !isCampusUser ? "1px solid hsl(270 20% 14%)" : "none", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                  onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                >
                  History
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

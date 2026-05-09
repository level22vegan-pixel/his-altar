import { useLocation } from "wouter";
import { useListActivityLogs } from "@workspace/api-client-react";

const TOOL_LABELS: Record<string, string> = {
  dbanc: "Dbanc",
  pxp: "PXP",
};

const TOOL_COLORS: Record<string, { accent: string }> = {
  dbanc: { accent: "hsl(220 70% 58%)" },
  pxp:   { accent: "hsl(38 70% 58%)"  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
  );
}

export default function ActivityLogPage({ tool }: { tool: string }) {
  const [, navigate] = useLocation();
  const label = TOOL_LABELS[tool] ?? tool.toUpperCase();
  const colors = TOOL_COLORS[tool] ?? { accent: "hsl(38 70% 58%)" };

  const { data, isLoading } = useListActivityLogs(
    { tool },
    { query: { queryKey: ["activity-logs", tool], refetchInterval: 30000 } }
  );

  const logs = data?.logs ?? [];

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start py-10 px-4 overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)" }}
    >
      <div className="relative z-10 w-full max-w-xl">
        <button
          onClick={() => navigate("/admin")}
          className="mb-8 text-xs uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", background: "none", border: "none", cursor: "pointer" }}
        >
          ← Admin
        </button>

        <h1
          className="text-xl mb-1 tracking-widest uppercase text-center"
          style={{ color: colors.accent, fontFamily: "Georgia, serif" }}
        >
          {label}
        </h1>
        <p
          className="text-xs text-center mb-6 tracking-widest uppercase opacity-60"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
        >
          Activity Log
        </p>

        <div
          className="rounded border"
          style={{ background: "hsl(35 20% 11%)", borderColor: "hsl(38 20% 20%)" }}
        >
          {isLoading ? (
            <div className="p-8 text-center" style={{ color: "hsl(38 30% 38%)", fontFamily: "Georgia, serif", fontSize: 12 }}>
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center" style={{ color: "hsl(38 25% 32%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.1em" }}>
              No activity recorded yet
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  padding: "8px 18px",
                  borderBottom: "1px solid hsl(38 18% 18%)",
                  background: "hsl(35 22% 13%)",
                }}
              >
                {["Action", "User", "When"].map(h => (
                  <span key={h} style={{ color: "hsl(38 30% 38%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                    {h}
                  </span>
                ))}
              </div>

              {logs.map((log, i) => (
                <div
                  key={log.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    alignItems: "center",
                    padding: "11px 18px",
                    borderBottom: i < logs.length - 1 ? "1px solid hsl(38 15% 15%)" : "none",
                    background: i % 2 === 0 ? "transparent" : "hsl(35 18% 9%)",
                    gap: 4,
                  }}
                >
                  {/* Action badge */}
                  <span
                    style={{
                      background: colors.accent + "1a",
                      color: colors.accent,
                      borderRadius: 4,
                      padding: "3px 8px",
                      fontFamily: "Georgia, serif",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      display: "inline-block",
                    }}
                  >
                    {log.action.replace(/_/g, " ")}
                  </span>

                  {/* User name */}
                  <span
                    style={{
                      color: "hsl(38 55% 62%)",
                      fontFamily: "Georgia, serif",
                      fontSize: 11,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {log.userName || "—"}
                  </span>

                  {/* Timestamp */}
                  <span
                    style={{
                      color: "hsl(38 25% 36%)",
                      fontFamily: "Georgia, serif",
                      fontSize: 10,
                      letterSpacing: "0.03em",
                    }}
                  >
                    {formatDate(log.accessedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p
          className="text-center mt-4 text-xs opacity-40"
          style={{ color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}
        >
          {logs.length} {logs.length === 1 ? "entry" : "entries"} · auto-refreshes every 30s
        </p>
      </div>
    </div>
  );
}

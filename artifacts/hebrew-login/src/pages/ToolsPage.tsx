import { useLocation } from "wouter";
import HamburgerMenu from "@/components/HamburgerMenu";

const TOOLS = [
  {
    id: "altar-report",
    label: "Altar Report",
    sublabel: "Log and export altar responses",
    icon: "📋",
    href: "/admin/altar-report",
    gradient: "linear-gradient(150deg, #1a1200 0%, #2e1f00 50%, #1a1200 100%)",
    glow: "rgba(180,130,0,0.25)",
    border: "rgba(180,130,0,0.3)",
    accent: "#c9a84c",
  },
  {
    id: "dbanc",
    label: "Dbanc",
    sublabel: "Prayer contact database",
    icon: "📇",
    href: "/admin/dbanc",
    gradient: "linear-gradient(150deg, #0a1520 0%, #0f2233 50%, #0a1520 100%)",
    glow: "rgba(56,130,200,0.25)",
    border: "rgba(56,130,200,0.3)",
    accent: "#5ba3d0",
  },
  {
    id: "pxp",
    label: "PXP",
    sublabel: "Prayer follow-up call system",
    icon: "📞",
    href: "/admin/pxp",
    gradient: "linear-gradient(150deg, #0f0a20 0%, #1a1035 50%, #0f0a20 100%)",
    glow: "rgba(120,80,220,0.25)",
    border: "rgba(120,80,220,0.3)",
    accent: "#9b72e8",
  },
  {
    id: "attendance",
    label: "Altar Attendance",
    sublabel: "Check-in roster and service report",
    icon: "✅",
    href: "/admin/service-report",
    gradient: "linear-gradient(150deg, #0a1a0a 0%, #102010 50%, #0a1a0a 100%)",
    glow: "rgba(60,160,80,0.25)",
    border: "rgba(60,160,80,0.3)",
    accent: "#5dbf72",
  },
];

export default function ToolsPage() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #06050f 0%, #0d0818 60%, #06050f 100%)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={() => navigate("/team")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.35)", fontFamily: "Georgia, serif",
            fontSize: 11, letterSpacing: "0.1em", padding: "4px 0",
          }}
          onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
          onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
        >
          ← Back
        </button>
        <span style={{
          fontFamily: "Georgia, serif", fontSize: 13,
          color: "rgba(255,255,255,0.45)", letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}>
          Tools &amp; Extensions
        </span>
        <HamburgerMenu />
      </div>

      {/* Tool cards */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "20px 20px 28px",
      }}>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => navigate(tool.href)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              background: tool.gradient,
              border: `1.5px solid ${tool.border}`,
              borderRadius: 18,
              padding: "20px 22px",
              cursor: "pointer",
              boxShadow: `0 0 28px ${tool.glow}, 0 6px 20px rgba(0,0,0,0.5)`,
              transition: "transform 0.15s, box-shadow 0.15s",
              textAlign: "left",
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.015)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 48px ${tool.glow}, 0 10px 28px rgba(0,0,0,0.6)`;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px ${tool.glow}, 0 6px 20px rgba(0,0,0,0.5)`;
            }}
          >
            <span style={{ fontSize: 32, flexShrink: 0 }}>{tool.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "Georgia, serif",
                fontSize: 19,
                fontWeight: 400,
                color: tool.accent,
                letterSpacing: "0.05em",
                marginBottom: 4,
              }}>
                {tool.label}
              </div>
              <div style={{
                fontFamily: "Georgia, serif",
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.04em",
              }}>
                {tool.sublabel}
              </div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 20 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

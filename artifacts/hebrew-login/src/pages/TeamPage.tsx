import { useLocation } from "wouter";
import { getValidOrgSession, clearOrgSession, getValidCampusSession, setCampusSession, getValidAdminSession } from "@/lib/session";

const CAMPUS_ROUTES: Record<string, string> = {
  HALLMARK: "/campus/hallmark",
};

export default function TeamPage() {
  const [, navigate] = useLocation();
  const orgSession = getValidOrgSession();
  const campusSession = getValidCampusSession();
  const adminSession = getValidAdminSession();
  const isAdmin = adminSession !== null;
  const isLead = campusSession?.role === "lead";
  const hasAdminAccess = isAdmin || isLead;

  const BUBBLES = [
    {
      id: "altar",
      label: "Altar",
      sublabel: "Add a new prayer contact",
      icon: "🙏",
      href: "/admin/dbanc/new?returnTo=/team",
      gradient: "linear-gradient(150deg, #92651a 0%, #b8860b 40%, #7a4f10 100%)",
      glow: "rgba(184,134,11,0.35)",
      border: "rgba(184,134,11,0.4)",
    },
    {
      id: "calls",
      label: "Follow-Up Calls",
      sublabel: "Prayer call team sign-in",
      icon: "📞",
      href: "/caller-login",
      gradient: "linear-gradient(150deg, #4c1d95 0%, #7c3aed 50%, #6d28d9 100%)",
      glow: "rgba(124,58,237,0.4)",
      border: "rgba(124,58,237,0.5)",
    },
    {
      id: "admin",
      label: "Admin",
      sublabel: hasAdminAccess ? "Admin panel" : "Admin login required",
      icon: "⚙",
      href: hasAdminAccess ? "/admin" : "/unauthorized",
      gradient: "linear-gradient(150deg, #111827 0%, #1f2937 50%, #111827 100%)",
      glow: "rgba(100,120,160,0.2)",
      border: "rgba(100,120,160,0.3)",
    },
  ];
  const displayName = isAdmin
    ? (adminSession?.orgName ?? "His Altar")
    : (orgSession?.orgName ?? (campusSession ? campusSession.campus : "His Altar"));

  function handleLogout() {
    clearOrgSession();
    if (campusSession) {
      setCampusSession("", "");
      localStorage.removeItem("campusSession");
      navigate("/enter");
    } else {
      navigate("/");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #06050f 0%, #0d0818 60%, #06050f 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div>
          <p style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily: "Georgia, serif",
            fontSize: 15,
            letterSpacing: "0.04em",
            margin: 0,
          }}>
            {displayName}
          </p>
          <p style={{
            color: "rgba(255,255,255,0.3)",
            fontFamily: "Georgia, serif",
            fontSize: 11,
            letterSpacing: "0.08em",
            margin: "2px 0 0",
          }}>
            Select your role to continue
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.25)",
            fontFamily: "Georgia, serif",
            fontSize: 11,
            letterSpacing: "0.08em",
            cursor: "pointer",
            padding: "6px 10px",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)")}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.25)")}
        >
          Sign Out
        </button>
      </div>

      {/* Bubbles */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "18px 20px 24px",
      }}>
        {BUBBLES.map((bubble) => (
          <button
            key={bubble.id}
            onClick={() => navigate(bubble.href)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: bubble.gradient,
              border: `1.5px solid ${bubble.border}`,
              borderRadius: 24,
              cursor: "pointer",
              boxShadow: `0 0 40px ${bubble.glow}, 0 8px 32px rgba(0,0,0,0.5)`,
              transition: "transform 0.15s, box-shadow 0.15s",
              minHeight: 160,
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.015)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 64px ${bubble.glow}, 0 12px 40px rgba(0,0,0,0.6)`;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${bubble.glow}, 0 8px 32px rgba(0,0,0,0.5)`;
            }}
          >
            <span style={{ fontSize: 36 }}>{bubble.icon}</span>
            <span style={{
              color: "#ffffff",
              fontFamily: "Georgia, serif",
              fontSize: 24,
              fontWeight: 400,
              letterSpacing: "0.05em",
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
              {bubble.label}
            </span>
            <span style={{
              color: "rgba(255,255,255,0.6)",
              fontFamily: "Georgia, serif",
              fontSize: 13,
              letterSpacing: "0.06em",
            }}>
              {bubble.sublabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

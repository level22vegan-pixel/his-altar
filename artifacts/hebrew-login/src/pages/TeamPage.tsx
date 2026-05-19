import { useState } from "react";
import { useLocation } from "wouter";
import { getValidCampusSession, getValidAdminSession, getValidOrgSession } from "@/lib/session";
import HamburgerMenu from "@/components/HamburgerMenu";

export default function TeamPage() {
  const [, navigate] = useLocation();
  const campusSession = getValidCampusSession();
  const adminSession = getValidAdminSession();
  const orgSession = getValidOrgSession();

  const isAdminUser = !!(adminSession || orgSession);
  const isMinistryOnly = campusSession?.role === "altar";
  const [showRestricted, setShowRestricted] = useState(false);

  const BUBBLES = [
    {
      id: "altar",
      label: "Altar",
      infoIcons: ["📇", "➕"],
      icon: "🙏",
      href: "/admin/dbanc/new?returnTo=/team",
      gradient: "linear-gradient(150deg, #091828 0%, #0d2240 40%, #091828 100%)",
      glow: "rgba(56,130,200,0.35)",
      border: "rgba(56,130,200,0.4)",
    },
    {
      id: "attendance",
      label: "Altar Attendance",
      infoIcons: ["✅", "📋"],
      icon: "🙋",
      href: "/home",
      gradient: "linear-gradient(150deg, #071a0f 0%, #0d2b18 40%, #071a0f 100%)",
      glow: "rgba(52,168,83,0.35)",
      border: "rgba(52,168,83,0.4)",
    },
    {
      id: "calls",
      label: "Follow-Up Calls",
      infoIcons: ["📱", "💬"],
      icon: "📱",
      href: "/caller-login",
      gradient: "linear-gradient(150deg, #4c1d95 0%, #7c3aed 50%, #6d28d9 100%)",
      glow: "rgba(124,58,237,0.4)",
      border: "rgba(124,58,237,0.5)",
    },
    {
      id: "admin",
      label: "Admin",
      infoIcons: isAdminUser ? ["🔧", "📊"] : ["🔒"],
      icon: "⚙",
      href: "/admin",
      gradient: "linear-gradient(150deg, #111827 0%, #1f2937 50%, #111827 100%)",
      glow: "rgba(100,120,160,0.2)",
      border: "rgba(100,120,160,0.3)",
    },
  ];

  function handleBubbleClick(bubble: typeof BUBBLES[0]) {
    if (bubble.id === "admin" && !isAdminUser) {
      setShowRestricted(true);
      return;
    }
    navigate(bubble.href);
  }

  if (showRestricted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #06050f 0%, #0d0818 60%, #06050f 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: 32, textAlign: "center",
      }}>
        <span style={{ fontSize: 48 }}>🔒</span>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "rgba(255,255,255,0.85)", margin: 0, letterSpacing: "0.05em" }}>
          Access Restricted
        </h2>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>
          This section requires the admin code. Enter it at the login screen to continue.
        </p>
        <button
          onClick={() => setShowRestricted(false)}
          style={{
            marginTop: 8, background: "none", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8, color: "rgba(255,255,255,0.45)", fontFamily: "Georgia, serif",
            fontSize: 12, letterSpacing: "0.1em", padding: "10px 24px", cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #06050f 0%, #0d0818 60%, #06050f 100%)",
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={() => navigate("/")}
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
        <HamburgerMenu />
      </div>

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "16px 20px 22px",
      }}>
        {BUBBLES.filter(b => !(isMinistryOnly && b.id === "admin")).map((bubble) => (
          <button
            key={bubble.id}
            onClick={() => handleBubbleClick(bubble)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: bubble.gradient,
              border: `1.5px solid ${bubble.border}`,
              borderRadius: 22,
              cursor: "pointer",
              boxShadow: `0 0 36px ${bubble.glow}, 0 8px 28px rgba(0,0,0,0.5)`,
              transition: "transform 0.15s, box-shadow 0.15s",
              minHeight: 130,
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.015)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 60px ${bubble.glow}, 0 12px 36px rgba(0,0,0,0.6)`;
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 0 36px ${bubble.glow}, 0 8px 28px rgba(0,0,0,0.5)`;
            }}
          >
            <span style={{ fontSize: 32 }}>{bubble.icon}</span>
            <span style={{
              color: "#ffffff",
              fontFamily: "Georgia, serif",
              fontSize: 22,
              fontWeight: 400,
              letterSpacing: "0.05em",
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
              {bubble.label}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {bubble.infoIcons.map((ic, i) => (
                <span key={i} style={{ fontSize: 16, opacity: 0.7 }}>{ic}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

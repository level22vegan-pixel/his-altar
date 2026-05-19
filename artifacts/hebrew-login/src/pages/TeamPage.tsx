import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  getValidOrgSession,
  getValidCampusSession,
  getValidAdminSession,
  setAdminSession,
  setOrgSession,
  clearOrgSession,
  clearAllSessions,
} from "@/lib/session";

export default function TeamPage() {
  const [, navigate] = useLocation();
  const orgSession = getValidOrgSession();
  const campusSession = getValidCampusSession();
  const adminSession = getValidAdminSession();
  const isAdmin = adminSession !== null;
  const isLead = campusSession?.role === "lead";
  const isMinistryOnly = campusSession?.role === "altar";
  const hasAdminAccess = isAdmin || isLead;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Inline admin login modal
  const [adminModal, setAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = isAdmin
    ? (adminSession?.orgName ?? orgSession?.orgName ?? "His Altar")
    : (orgSession?.orgName ?? (campusSession ? campusSession.campus : "His Altar"));

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
      sublabel: hasAdminAccess ? "Admin panel" : "Login required",
      icon: "⚙",
      href: "/admin",
      gradient: "linear-gradient(150deg, #111827 0%, #1f2937 50%, #111827 100%)",
      glow: "rgba(100,120,160,0.2)",
      border: "rgba(100,120,160,0.3)",
    },
  ];

  function handleBubbleClick(bubble: typeof BUBBLES[0]) {
    if (bubble.id === "admin" && !hasAdminAccess) {
      setAdminModal(true);
      setAdminEmail("");
      setAdminPassword("");
      setAdminError("");
      return;
    }
    navigate(bubble.href);
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      setAdminError("Enter your email and password.");
      return;
    }
    setAdminLoading(true);
    setAdminError("");
    try {
      const res = await fetch("/api/orgs/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.message || "Invalid credentials.");
        return;
      }
      setOrgSession(data.orgId, data.orgName, data.token, data.campuses ?? [], data.serviceTimes ?? {});
      setAdminSession(data.orgName);
      setAdminModal(false);
    } catch {
      setAdminError("Connection error. Try again.");
    } finally {
      setAdminLoading(false);
    }
  }

  function handleSignOut() {
    clearAllSessions();
    navigate("/");
  }

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
        padding: "18px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
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

        {/* Profile hamburger */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{
              background: menuOpen ? "rgba(255,255,255,0.08)" : "none",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              cursor: "pointer",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
            aria-label="Menu"
          >
            <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
            <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
            <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              background: "#0f0e1a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              minWidth: 200,
              zIndex: 100,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}>
              {orgSession && (
                <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 12, color: "rgba(255,255,255,0.75)", letterSpacing: "0.02em" }}>{orgSession.orgName}</p>
                  <p style={{ margin: "2px 0 0", fontFamily: "Georgia, serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>Church Admin</p>
                </div>
              )}

              {[
                { label: "Profile", icon: "👤", action: () => { setMenuOpen(false); navigate("/admin/profile"); } },
                { label: "Billing & Subscription", icon: "💳", action: () => { setMenuOpen(false); navigate("/org/billing"); } },
                { label: "Gift Subscription", icon: "🎁", action: () => { setMenuOpen(false); navigate("/org/billing"); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "11px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.75)",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseOut={e => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  onClick={handleSignOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "11px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Georgia, serif",
                    fontSize: 13,
                    color: "rgba(255,80,80,0.75)",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = "rgba(255,80,80,0.06)")}
                  onMouseOut={e => (e.currentTarget.style.background = "none")}
                >
                  <span style={{ fontSize: 15 }}>⬡</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bubbles */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "18px 20px 24px",
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

      {/* Admin Login Modal */}
      {adminModal && (
        <div
          onClick={() => setAdminModal(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "hsl(35 20% 10%)",
              border: "1px solid hsl(38 20% 22%)",
              borderRadius: 14,
              padding: 28,
              width: "100%",
              maxWidth: 360,
            }}
          >
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "hsl(38 60% 65%)", textAlign: "center", margin: "0 0 4px", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Admin Login
            </h2>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 25% 40%)", textAlign: "center", margin: "0 0 22px", letterSpacing: "0.08em" }}>
              Enter your church admin credentials
            </p>

            <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={adminEmail}
                onChange={e => { setAdminEmail(e.target.value); setAdminError(""); }}
                autoFocus
                style={{
                  padding: "11px 14px", background: "hsl(35 18% 8%)",
                  border: "1px solid hsl(38 20% 22%)", borderRadius: 8,
                  color: "hsl(38 55% 70%)", fontFamily: "Georgia, serif", fontSize: 13,
                  outline: "none", width: "100%", boxSizing: "border-box",
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={adminPassword}
                onChange={e => { setAdminPassword(e.target.value); setAdminError(""); }}
                style={{
                  padding: "11px 14px", background: "hsl(35 18% 8%)",
                  border: "1px solid hsl(38 20% 22%)", borderRadius: 8,
                  color: "hsl(38 55% 70%)", fontFamily: "Georgia, serif", fontSize: 13,
                  outline: "none", width: "100%", boxSizing: "border-box",
                }}
              />

              {adminError && (
                <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 60% 58%)", textAlign: "center", margin: 0 }}>
                  {adminError}
                </p>
              )}

              <button
                type="submit"
                disabled={adminLoading}
                style={{
                  padding: "12px 0", background: "hsl(38 45% 26%)",
                  color: "hsl(38 70% 78%)", border: "1px solid hsl(38 35% 34%)",
                  borderRadius: 8, fontFamily: "Georgia, serif", fontSize: 11,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  cursor: adminLoading ? "not-allowed" : "pointer",
                  opacity: adminLoading ? 0.6 : 1,
                }}
              >
                {adminLoading ? "Verifying…" : "Sign In"}
              </button>

              <button
                type="button"
                onClick={() => setAdminModal(false)}
                style={{
                  padding: "8px 0", background: "none", border: "none",
                  color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif",
                  fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

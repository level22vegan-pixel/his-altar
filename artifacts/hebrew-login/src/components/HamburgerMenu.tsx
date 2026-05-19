import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { clearAllSessions, getValidOrgSession, getValidAdminSession } from "@/lib/session";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const orgSession = getValidOrgSession();
  const adminSession = getValidAdminSession();
  const isAdmin = !!(orgSession || adminSession);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Only render for admin-code or org-admin users — invisible to staff PIN logins
  if (!isAdmin) return null;

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  function signOut() {
    clearAllSessions();
    navigate("/");
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
        style={{
          background: open ? "rgba(255,255,255,0.08)" : "none",
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
      >
        <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
        <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
        <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.55)", borderRadius: 2 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "#0f0e1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          minWidth: 200,
          zIndex: 200,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {orgSession && (
            <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{orgSession.orgName}</p>
              <p style={{ margin: "2px 0 0", fontFamily: "Georgia, serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>Church Admin</p>
            </div>
          )}

          {[
            { label: "Profile", icon: "👤", path: "/admin/profile" },
            { label: "Billing & Subscription", icon: "💳", path: "/org/billing" },
            { label: "Gift Subscription", icon: "🎁", path: "/org/billing" },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => go(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "11px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "Georgia, serif", fontSize: 13,
                color: "rgba(255,255,255,0.75)", textAlign: "left",
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
              onClick={signOut}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "11px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "Georgia, serif", fontSize: 13,
                color: "rgba(255,80,80,0.75)", textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseOver={e => (e.currentTarget.style.background = "rgba(255,80,80,0.06)")}
              onMouseOut={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 15 }}>↩</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

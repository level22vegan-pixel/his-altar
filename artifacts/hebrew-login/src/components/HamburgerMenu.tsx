import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { clearAllSessions, getValidOrgSession, getValidAdminSession, getValidCampusSession } from "@/lib/session";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const orgSession = getValidOrgSession();
  const adminSession = getValidAdminSession();
  const campusSession = getValidCampusSession();
  const isOrgOrAdmin = !!(orgSession || adminSession);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isOrgOrAdmin && !campusSession) return null;

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
          border: "1px solid rgba(255,255,255,0.12)",
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
        <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 2 }} />
        <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 2 }} />
        <span style={{ display: "block", width: 18, height: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 2 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          background: "#0f0e1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          minWidth: 210,
          zIndex: 200,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        }}>
          {/* Church name header — only for org admins */}
          {orgSession && (
            <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
                {orgSession.orgName}
              </p>
              <p style={{ margin: "2px 0 0", fontFamily: "Georgia, serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em" }}>
                Church Admin
              </p>
            </div>
          )}

          {/* Profile — only for org/admin-code users */}
          {isOrgOrAdmin && (
            <MenuButton icon="👤" label="Profile" onClick={() => go("/admin/profile")} />
          )}

          {/* Billing — only for org/admin-code users */}
          {isOrgOrAdmin && (
            <MenuButton
              icon="💳"
              label="Billing & Subscription"
              onClick={() => {
                setOpen(false);
                if (orgSession) {
                  navigate("/org/billing");
                } else {
                  navigate("/org/login");
                }
              }}
            />
          )}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <MenuButton icon="↩" label="Sign Out" danger onClick={signOut} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon, label, onClick, danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const color = danger ? "rgba(255,80,80,0.8)" : "rgba(255,255,255,0.78)";
  const hoverBg = danger ? "rgba(255,80,80,0.06)" : "rgba(255,255,255,0.05)";

  return (
    <button
      onClick={onClick}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        width: "100%", padding: "11px 16px",
        background: hover ? hoverBg : "none",
        border: "none", cursor: "pointer",
        fontFamily: "Georgia, serif", fontSize: 13,
        color, textAlign: "left",
        transition: "background 0.12s",
      }}
    >
      <span style={{ fontSize: 15, width: 18, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";

const BASE = "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const orgRaw = localStorage.getItem("orgSession");
  const token = orgRaw ? JSON.parse(orgRaw)?.token : undefined;
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 20,
        padding: "18px 20px",
        borderRadius: 8,
        background: "hsl(35 20% 13%)",
        border: "1px solid hsl(38 20% 22%)",
      }}
    >
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "hsl(38 30% 42%)",
          marginBottom: 14,
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 14px",
    background: "hsl(35 18% 10%)",
    border: "1px solid hsl(38 20% 22%)",
    borderRadius: 6,
    color: "hsl(38 55% 70%)",
    fontFamily: "Georgia, serif",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    ...extra,
  };
}

function btnStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 0",
    width: "100%",
    background: "hsl(38 45% 26%)",
    color: "hsl(38 70% 78%)",
    border: "1px solid hsl(38 35% 34%)",
    borderRadius: 6,
    fontFamily: "Georgia, serif",
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    ...extra,
  };
}

export default function AdminProfilePage() {
  const [, navigate] = useLocation();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!current || !next || !confirm) { setPwMsg({ text: "All fields are required", ok: false }); return; }
    if (next !== confirm) { setPwMsg({ text: "New passwords do not match", ok: false }); return; }
    if (next.length < 4) { setPwMsg({ text: "Password must be at least 4 characters", ok: false }); return; }
    setPwLoading(true);
    try {
      const res = await apiFetch("/auth/change-admin-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (data.success) {
        setPwMsg({ text: "Password updated successfully", ok: true });
        setCurrent(""); setNext(""); setConfirm("");
      } else {
        setPwMsg({ text: data.message || "Failed to update password", ok: false });
      }
    } catch {
      setPwMsg({ text: "Something went wrong — try again", ok: false });
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px",
        background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button
          onClick={() => navigate("/admin")}
          style={{
            marginBottom: 28,
            color: "hsl(38 30% 42%)",
            fontFamily: "Georgia, serif",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          ← Admin Panel
        </button>

        <h1
          style={{
            textAlign: "center",
            color: "hsl(38 60% 65%)",
            fontFamily: "Georgia, serif",
            fontSize: 20,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Admin Profile
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "hsl(38 25% 40%)",
            fontFamily: "Georgia, serif",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          Account settings
        </p>

        {/* Change Password */}
        <Section title="Change Password">
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="password"
              placeholder="Current password"
              value={current}
              onChange={e => { setCurrent(e.target.value); setPwMsg(null); }}
              style={inputStyle()}
            />
            <input
              type="password"
              placeholder="New password"
              value={next}
              onChange={e => { setNext(e.target.value); setPwMsg(null); }}
              style={inputStyle()}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setPwMsg(null); }}
              style={inputStyle()}
            />
            {pwMsg && (
              <p style={{ fontFamily: "Georgia, serif", fontSize: 11, textAlign: "center", color: pwMsg.ok ? "hsl(120 40% 55%)" : "hsl(0 60% 58%)", margin: 0 }}>
                {pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={pwLoading} style={btnStyle({ opacity: pwLoading ? 0.6 : 1 })}>
              {pwLoading ? "Saving..." : "Update Password"}
            </button>
          </form>
        </Section>

        {/* Billing */}
        <Section title="Billing & Subscription">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>Plan</span>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 65% 70%)", letterSpacing: "0.1em" }}>His Altar Pro</span>
            </div>
            <div style={{ height: 1, background: "hsl(38 15% 20%)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>Status</span>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(120 40% 55%)", letterSpacing: "0.1em" }}>Active</span>
            </div>
            <div style={{ height: 1, background: "hsl(38 15% 20%)" }} />
            <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: "hsl(38 25% 38%)", textAlign: "center", marginTop: 4, letterSpacing: "0.05em" }}>
              Contact support for billing changes or to manage your subscription.
            </p>
          </div>
        </Section>

        {/* Support */}
        <Section title="Support">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)", margin: 0 }}>
              For assistance with your account, reach out to the His Altar support team.
            </p>
            <a
              href="mailto:support@hisaltar.com"
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px 0",
                background: "hsl(35 22% 16%)",
                color: "hsl(38 60% 62%)",
                border: "1px solid hsl(38 25% 26%)",
                borderRadius: 6,
                fontFamily: "Georgia, serif",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              support@hisaltar.com
            </a>
          </div>
        </Section>
      </div>
    </div>
  );
}

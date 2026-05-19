import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { clearAllSessions, getValidOrgSession } from "@/lib/session";

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

const S = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% 20%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
    padding: "0 0 60px",
  } as React.CSSProperties,
  wrap: { width: "100%", maxWidth: 460, margin: "0 auto", padding: "0 16px" } as React.CSSProperties,
  sectionWrap: {
    marginBottom: 6,
    borderRadius: 10,
    background: "hsl(35 20% 11%)",
    border: "1px solid hsl(38 18% 20%)",
    overflow: "hidden",
  } as React.CSSProperties,
  sectionHeader: {
    padding: "10px 16px",
    background: "hsl(35 22% 9%)",
    fontFamily: "Georgia, serif",
    fontSize: 9,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "hsl(38 35% 38%)",
    borderBottom: "1px solid hsl(38 18% 18%)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 16px",
    borderBottom: "1px solid hsl(38 15% 16%)",
    cursor: "pointer",
    transition: "background 0.1s",
  } as React.CSSProperties,
  rowLabel: { fontFamily: "Georgia, serif", fontSize: 13, color: "hsl(38 55% 68%)" },
  rowSub: { fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 30% 42%)", marginTop: 2 },
  rowRight: { fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 30% 38%)", letterSpacing: "0.06em" },
  chevron: { color: "hsl(38 25% 35%)", fontSize: 14 },
  inp: {
    width: "100%",
    padding: "10px 14px",
    background: "hsl(35 18% 8%)",
    border: "1px solid hsl(38 20% 22%)",
    borderRadius: 6,
    color: "hsl(38 55% 70%)",
    fontFamily: "Georgia, serif",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  } as React.CSSProperties,
  btn: (accent = false, danger = false): React.CSSProperties => ({
    padding: "10px 0",
    width: "100%",
    background: danger ? "hsl(0 40% 18%)" : accent ? "hsl(38 45% 26%)" : "hsl(35 22% 16%)",
    color: danger ? "hsl(0 60% 65%)" : accent ? "hsl(38 70% 78%)" : "hsl(38 40% 50%)",
    border: `1px solid ${danger ? "hsl(0 38% 28%)" : accent ? "hsl(38 35% 34%)" : "hsl(38 20% 24%)"}`,
    borderRadius: 6,
    fontFamily: "Georgia, serif",
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
  }),
};

type BillingStatus = {
  trialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  subscription: { id: string; status: string; current_period_end: string; cancel_at_period_end: boolean } | null;
};

function RowItem({ label, sub, right, onClick, last }: { label: string; sub?: string; right?: string; onClick?: () => void; last?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
      style={{
        ...S.row,
        cursor: onClick ? "pointer" : "default",
        background: hover && onClick ? "rgba(255,255,255,0.025)" : "transparent",
        borderBottom: last ? "none" : S.row.borderBottom as string,
      }}
    >
      <div>
        <div style={S.rowLabel}>{label}</div>
        {sub && <div style={S.rowSub}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {right && <span style={S.rowRight}>{right}</span>}
        {onClick && <span style={S.chevron}>›</span>}
      </div>
    </div>
  );
}

function ComingSoonRow({ label, sub, last }: { label: string; sub?: string; last?: boolean }) {
  return (
    <div style={{ ...S.row, cursor: "default", opacity: 0.55, borderBottom: last ? "none" : S.row.borderBottom as string }}>
      <div>
        <div style={S.rowLabel}>{label}</div>
        {sub && <div style={S.rowSub}>{sub}</div>}
      </div>
      <span style={{ fontFamily: "Georgia, serif", fontSize: 9, color: "hsl(38 30% 35%)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Soon</span>
    </div>
  );
}

function BillingSection() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [err, setErr] = useState("");
  const [, navigate] = useLocation();

  useEffect(() => {
    apiFetch("/stripe/billing-status")
      .then(r => r.json()).then(d => setStatus(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true); setErr("");
    try {
      const res = await apiFetch("/stripe/portal", { method: "POST" });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else setErr(d.error ?? "Could not open billing portal.");
    } catch { setErr("Something went wrong."); }
    finally { setPortalLoading(false); }
  }

  const sub = status?.subscription;
  const subColor = sub?.status === "active" || sub?.status === "trialing" ? "hsl(120 40% 55%)"
    : sub?.status === "past_due" ? "hsl(38 70% 58%)" : "hsl(0 55% 55%)";

  return (
    <div style={S.sectionWrap}>
      <div style={S.sectionHeader}>Billing &amp; Subscription</div>
      {loading ? (
        <div style={{ padding: "14px 16px", fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 30% 42%)" }}>Loading…</div>
      ) : (
        <>
          {status?.trialActive && (
            <RowItem label="Free Trial" sub={`${status.trialDaysLeft} day${status.trialDaysLeft !== 1 ? "s" : ""} remaining`} right="Active" />
          )}
          {sub ? (
            <>
              <RowItem label="His Altar Pro" sub={sub.cancel_at_period_end ? "Cancels at period end" : `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`} right={sub.status} />
              <div style={{ padding: "12px 16px", borderTop: "1px solid hsl(38 15% 16%)" }}>
                <button onClick={openPortal} disabled={portalLoading} style={S.btn(true)}>
                  {portalLoading ? "Opening…" : "Manage Subscription"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: "12px 16px" }}>
              <button onClick={() => navigate("/org/billing")} style={S.btn(true)}>
                Subscribe · $9.99 / month
              </button>
            </div>
          )}
          {err && <p style={{ padding: "0 16px 12px", fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(0 55% 58%)", margin: 0 }}>{err}</p>}
        </>
      )}
    </div>
  );
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!current || !next || !confirm) { setMsg({ text: "All fields required", ok: false }); return; }
    if (next !== confirm) { setMsg({ text: "Passwords don't match", ok: false }); return; }
    if (next.length < 4) { setMsg({ text: "At least 4 characters required", ok: false }); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/auth/change-admin-password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = await res.json();
      if (data.success) { setMsg({ text: "Password updated", ok: true }); setCurrent(""); setNext(""); setConfirm(""); }
      else setMsg({ text: data.message || "Failed", ok: false });
    } catch { setMsg({ text: "Something went wrong", ok: false }); }
    finally { setLoading(false); }
  }

  return (
    <div style={S.sectionWrap}>
      <div style={S.sectionHeader}>Change Password</div>
      {!open ? (
        <RowItem label="Change Password" sub="Update your admin password" onClick={() => setOpen(true)} last />
      ) : (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="password" placeholder="Current password" value={current} onChange={e => { setCurrent(e.target.value); setMsg(null); }} style={S.inp} />
          <input type="password" placeholder="New password" value={next} onChange={e => { setNext(e.target.value); setMsg(null); }} style={S.inp} />
          <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => { setConfirm(e.target.value); setMsg(null); }} style={S.inp} />
          {msg && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: msg.ok ? "hsl(120 40% 55%)" : "hsl(0 60% 58%)", textAlign: "center", margin: 0 }}>{msg.text}</p>}
          <button type="button" onClick={handleSave as unknown as React.MouseEventHandler} disabled={loading} style={S.btn(true)}>{loading ? "Saving…" : "Update Password"}</button>
          <button type="button" onClick={() => { setOpen(false); setMsg(null); }} style={S.btn()}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function DeleteAccountSection() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"idle" | "confirm" | "typing">("idle");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  async function handleDelete() {
    if (typed !== "DELETE") { setErr("Type DELETE (all caps) to confirm"); return; }
    setDeleting(true); setErr("");
    try {
      const res = await apiFetch("/orgs", { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Failed"); }
      clearAllSessions();
      navigate("/org/signup");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setDeleting(false); }
  }

  return (
    <div style={{ ...S.sectionWrap, borderColor: "hsl(0 35% 22%)" }}>
      <div style={{ ...S.sectionHeader, color: "hsl(0 45% 45%)" }}>Danger Zone</div>
      {step === "idle" && (
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 30% 42%)", margin: "0 0 12px", lineHeight: 1.6 }}>
            Permanently delete your church account, all contacts, rosters, call logs, and settings. This cannot be undone.
          </p>
          <button onClick={() => setStep("confirm")} style={S.btn(false, true)}>Delete Account</button>
        </div>
      )}
      {step === "confirm" && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 55% 60%)", margin: 0, lineHeight: 1.6 }}>
            This will permanently delete all your data — contacts, rosters, call logs, altar reports, and your account. There is no undo.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("idle")} style={{ ...S.btn(), flex: 1 }}>Cancel</button>
            <button onClick={() => setStep("typing")} style={{ ...S.btn(false, true), flex: 1 }}>Continue</button>
          </div>
        </div>
      )}
      {step === "typing" && (
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 55% 60%)", margin: 0 }}>
            Type <strong style={{ color: "hsl(0 65% 68%)" }}>DELETE</strong> to confirm.
          </p>
          <input value={typed} onChange={e => { setTyped(e.target.value); setErr(""); }} placeholder="DELETE" style={{ ...S.inp, textTransform: "uppercase", letterSpacing: "0.15em" }} />
          {err && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(0 55% 58%)", margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setStep("idle"); setTyped(""); }} style={{ ...S.btn(), flex: 1 }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting || typed !== "DELETE"} style={{ ...S.btn(false, true), flex: 1, opacity: typed !== "DELETE" || deleting ? 0.5 : 1, cursor: typed !== "DELETE" || deleting ? "not-allowed" : "pointer" }}>
              {deleting ? "Deleting…" : "Delete All"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminProfilePage() {
  const [, navigate] = useLocation();
  const orgSession = getValidOrgSession();

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid hsl(38 18% 18%)",
        background: "hsl(35 22% 9%)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate("/team")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(38 35% 42%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", padding: 0 }}
        >
          ← Teams
        </button>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "hsl(38 60% 65%)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          Profile
        </h1>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ ...S.wrap, paddingTop: 20 }}>

        {/* Account Info */}
        <div style={S.sectionWrap}>
          <div style={S.sectionHeader}>Account Info</div>
          {orgSession && (
            <RowItem label="Church Name" right={orgSession.orgName} />
          )}
          <ComingSoonRow label="Church Profile" sub="Name, address, pastor, phone, logo" />
          <ComingSoonRow label="My Profile" sub="Personal name, email, photo, title" last />
        </div>

        {/* Change Password */}
        <ChangePasswordSection />

        {/* Billing */}
        <BillingSection />

        {/* Staff Access */}
        <div style={S.sectionWrap}>
          <div style={S.sectionHeader}>Staff Access</div>
          <ComingSoonRow label="Manage Staff" sub="Add, remove, or change team roles" />
          <ComingSoonRow label="Role Permissions" sub="Control what each role can see" />
          <ComingSoonRow label="Active Sessions" sub="Devices logged in, remote logout" last />
        </div>

        {/* Data & Privacy */}
        <div style={S.sectionWrap}>
          <div style={S.sectionHeader}>Data &amp; Privacy</div>
          <ComingSoonRow label="Export My Data" sub="Download all records as CSV or PDF" />
          <ComingSoonRow label="Data Retention Settings" sub="Auto-delete altar records after set time" />
          <ComingSoonRow label="Audit Log" sub="See who accessed or changed records" />
          <RowItem label="Terms of Service" onClick={() => navigate("/terms")} />
          <RowItem label="Privacy Policy" onClick={() => navigate("/privacy")} last />
        </div>

        {/* Support */}
        <div style={S.sectionWrap}>
          <div style={S.sectionHeader}>Support</div>
          <ComingSoonRow label="Help Center / FAQ" sub="Guides and answers" />
          <RowItem
            label="Contact Support"
            sub="support@hisaltar.com"
            onClick={() => { window.location.href = "mailto:support@hisaltar.com"; }}
          />
          <ComingSoonRow label="Submit Feedback" sub="Feature requests or bug reports" />
          <ComingSoonRow label="What's New" sub="Changelog of recent updates" last />
        </div>

        {/* Gift Subscription */}
        <div style={S.sectionWrap}>
          <div style={S.sectionHeader}>Gift Subscription</div>
          <ComingSoonRow label="Gift a Subscription" sub="Give a church free access for a month" last />
        </div>

        {/* Delete Account */}
        {orgSession && <DeleteAccountSection />}
      </div>
    </div>
  );
}

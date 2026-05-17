import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { clearAllSessions } from "@/lib/session";

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

function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, padding: "18px 20px", borderRadius: 8, background: "hsl(35 20% 13%)", border: `1px solid ${accent ?? "hsl(38 20% 22%)"}` }}>
      <p style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: accent ?? "hsl(38 30% 42%)", marginBottom: 14 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const IS = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: "100%", padding: "10px 14px", background: "hsl(35 18% 10%)",
  border: "1px solid hsl(38 20% 22%)", borderRadius: 6,
  color: "hsl(38 55% 70%)", fontFamily: "Georgia, serif", fontSize: 13,
  outline: "none", boxSizing: "border-box", ...extra,
});

const BS = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: "10px 0", width: "100%", background: "hsl(38 45% 26%)",
  color: "hsl(38 70% 78%)", border: "1px solid hsl(38 35% 34%)", borderRadius: 6,
  fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em",
  textTransform: "uppercase", cursor: "pointer", ...extra,
});

type BillingStatus = {
  trialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  subscription: {
    id: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
};

function BillingSection() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalErr, setPortalErr] = useState("");

  useEffect(() => {
    apiFetch("/stripe/billing-status")
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    setPortalErr("");
    try {
      const res = await apiFetch("/stripe/portal", { method: "POST" });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        setPortalErr(d.error ?? "Could not open billing portal.");
      }
    } catch {
      setPortalErr("Something went wrong. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  const subStatus = status?.subscription?.status;
  const cancelAtEnd = status?.subscription?.cancel_at_period_end;
  const periodEnd = status?.subscription?.current_period_end
    ? new Date(status.subscription.current_period_end).toLocaleDateString()
    : null;

  function statusColor(s?: string) {
    if (s === "active" || s === "trialing") return "hsl(120 40% 55%)";
    if (s === "past_due" || s === "unpaid") return "hsl(38 70% 58%)";
    if (s === "canceled") return "hsl(0 55% 55%)";
    return "hsl(38 45% 55%)";
  }

  return (
    <Section title="Billing & Subscription" accent="hsl(38 40% 30%)">
      {loading ? (
        <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 30% 42%)" }}>Loading…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>Plan</span>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 65% 70%)", letterSpacing: "0.1em" }}>His Altar Pro</span>
          </div>
          <div style={{ height: 1, background: "hsl(38 15% 20%)" }} />

          {status?.trialActive && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>Status</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(120 40% 55%)", letterSpacing: "0.08em" }}>Free Trial</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>Days Remaining</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 65% 72%)" }}>{status.trialDaysLeft} day{status.trialDaysLeft !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ height: 1, background: "hsl(38 15% 20%)" }} />
            </>
          )}

          {subStatus && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>Status</span>
                <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: statusColor(subStatus), letterSpacing: "0.08em", textTransform: "capitalize" }}>
                  {cancelAtEnd ? "Cancels at period end" : subStatus}
                </span>
              </div>
              {periodEnd && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)" }}>{cancelAtEnd ? "Ends" : "Renews"}</span>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 55% 65%)" }}>{periodEnd}</span>
                </div>
              )}
              <div style={{ height: 1, background: "hsl(38 15% 20%)" }} />
            </>
          )}

          {!status?.trialActive && !subStatus && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 35% 45%)", marginBottom: 10 }}>
                No active subscription. Subscribe to keep access after your trial.
              </p>
            </div>
          )}

          {subStatus ? (
            <button onClick={openPortal} disabled={portalLoading} style={BS({ opacity: portalLoading ? 0.6 : 1 })}>
              {portalLoading ? "Opening…" : "Manage Subscription"}
            </button>
          ) : (
            <button onClick={openPortal} disabled={portalLoading} style={BS({ background: "hsl(120 35% 20%)", color: "hsl(120 50% 70%)", border: "1px solid hsl(120 30% 28%)", opacity: portalLoading ? 0.6 : 1 })}>
              {portalLoading ? "Opening…" : "Subscribe · $9.99 / month"}
            </button>
          )}

          {portalErr && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(0 55% 58%)", textAlign: "center" }}>{portalErr}</p>}

          <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: "hsl(38 22% 36%)", textAlign: "center", letterSpacing: "0.04em" }}>
            Change payment method, pause, or cancel — all managed through Stripe's secure portal.
          </p>
        </div>
      )}
    </Section>
  );
}

function DeleteAccountSection() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"idle" | "confirm" | "typing">("idle");
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  async function handleDelete() {
    if (typed !== "DELETE") { setErr('Type DELETE (all caps) to confirm'); return; }
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
    <Section title="Danger Zone" accent="hsl(0 40% 30%)">
      {step === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 30% 42%)", margin: 0 }}>
            Permanently delete your church account, all contacts, rosters, call logs, and settings. This cannot be undone.
          </p>
          <button
            onClick={() => setStep("confirm")}
            style={BS({ background: "hsl(0 40% 18%)", color: "hsl(0 60% 65%)", border: "1px solid hsl(0 38% 28%)" })}
          >
            Delete Account
          </button>
        </div>
      )}
      {step === "confirm" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 55% 60%)", margin: 0, lineHeight: 1.6 }}>
            This will delete all your church data permanently — contacts, rosters, call logs, altar reports, and your account. There is no undo.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep("idle")} style={BS({ background: "hsl(35 20% 16%)", color: "hsl(38 40% 50%)", border: "1px solid hsl(38 20% 24%)" })}>
              Cancel
            </button>
            <button onClick={() => setStep("typing")} style={BS({ background: "hsl(0 45% 20%)", color: "hsl(0 60% 65%)", border: "1px solid hsl(0 38% 28%)" })}>
              I Understand — Continue
            </button>
          </div>
        </div>
      )}
      {step === "typing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 55% 60%)", margin: 0 }}>
            Type <strong style={{ color: "hsl(0 65% 68%)" }}>DELETE</strong> to permanently remove your account.
          </p>
          <input
            value={typed}
            onChange={e => { setTyped(e.target.value); setErr(""); }}
            placeholder="DELETE"
            style={IS({ borderColor: typed === "DELETE" ? "hsl(0 55% 40%)" : "hsl(38 20% 22%)", letterSpacing: "0.15em", textTransform: "uppercase" })}
          />
          {err && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(0 55% 58%)", margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setStep("idle"); setTyped(""); }} style={BS({ background: "hsl(35 20% 16%)", color: "hsl(38 40% 50%)", border: "1px solid hsl(38 20% 24%)" })}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={deleting || typed !== "DELETE"} style={BS({ background: typed === "DELETE" ? "hsl(0 50% 22%)" : "hsl(35 20% 14%)", color: typed === "DELETE" ? "hsl(0 65% 65%)" : "hsl(38 20% 30%)", border: "1px solid hsl(0 35% 26%)", opacity: deleting ? 0.6 : 1, cursor: typed !== "DELETE" || deleting ? "not-allowed" : "pointer" })}>
              {deleting ? "Deleting…" : "Delete Everything"}
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

export default function AdminProfilePage() {
  const [, navigate] = useLocation();

  const orgRaw = localStorage.getItem("orgSession");
  const orgSession = orgRaw ? (() => { try { return JSON.parse(orgRaw); } catch { return null; } })() : null;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [pinConfirm, setPinConfirm] = useState(["", "", "", ""]);
  const [pinMsg, setPinMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pinConfRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handlePinDigit(arr: string[], set: (v: string[]) => void, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, i: number, val: string) {
    const c = val.replace(/\D/g, "").slice(-1);
    const n = [...arr]; n[i] = c; set(n); setPinMsg(null);
    if (c && i < 3) refs.current[i + 1]?.focus();
  }
  function handlePinKey(arr: string[], refs: React.MutableRefObject<(HTMLInputElement | null)[]>, i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !arr[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function handleSavePin() {
    const pin = pinDigits.join(""); const conf = pinConfirm.join("");
    if (pin.length < 4) { setPinMsg({ text: "Enter all 4 digits", ok: false }); return; }
    if (pin !== conf) { setPinMsg({ text: "Codes don't match", ok: false }); return; }
    setPinLoading(true); setPinMsg(null);
    try {
      const res = await apiFetch("/orgs/settings", { method: "PUT", body: JSON.stringify({ pin }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      setPinMsg({ text: "Access code updated", ok: true });
      setPinDigits(["", "", "", ""]); setPinConfirm(["", "", "", ""]);
    } catch (e: unknown) { setPinMsg({ text: e instanceof Error ? e.message : "Something went wrong", ok: false }); }
    finally { setPinLoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null);
    if (!current || !next || !confirm) { setPwMsg({ text: "All fields are required", ok: false }); return; }
    if (next !== confirm) { setPwMsg({ text: "New passwords do not match", ok: false }); return; }
    if (next.length < 4) { setPwMsg({ text: "Password must be at least 4 characters", ok: false }); return; }
    setPwLoading(true);
    try {
      const res = await apiFetch("/auth/change-admin-password", { method: "POST", body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = await res.json();
      if (data.success) { setPwMsg({ text: "Password updated successfully", ok: true }); setCurrent(""); setNext(""); setConfirm(""); }
      else setPwMsg({ text: data.message || "Failed to update password", ok: false });
    } catch { setPwMsg({ text: "Something went wrong — try again", ok: false }); }
    finally { setPwLoading(false); }
  }

  const pinBoxStyle = (filled: boolean): React.CSSProperties => ({
    width: 52, height: 60,
    background: filled ? "hsl(270 40% 14%)" : "hsl(35 18% 10%)",
    border: `1.5px solid ${filled ? "hsl(270 55% 50%)" : "hsl(38 20% 22%)"}`,
    borderRadius: 8, color: "hsl(38 55% 78%)",
    fontFamily: "Georgia, serif", fontSize: 24,
    textAlign: "center", outline: "none", caretColor: "transparent",
    transition: "border-color 0.15s, background 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px 60px", background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={() => navigate("/admin")} style={{ marginBottom: 28, color: "hsl(38 30% 42%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", opacity: 0.7 }}>
          ← Admin Panel
        </button>

        <h1 style={{ textAlign: "center", color: "hsl(38 60% 65%)", fontFamily: "Georgia, serif", fontSize: 20, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4 }}>
          Profile
        </h1>
        <p style={{ textAlign: "center", color: "hsl(38 25% 40%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 28 }}>
          Account & Subscription
        </p>

        {/* Church Info */}
        {orgSession && (
          <Section title="Church Account">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Church Name", value: orgSession.orgName },
                { label: "Email", value: orgSession.email ?? "—" },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 35% 50%)" }}>{label}</span>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 60% 70%)" }}>{value}</span>
                  </div>
                  <div style={{ height: 1, background: "hsl(38 15% 20%)", marginTop: 8 }} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Billing */}
        <BillingSection />

        {/* Change Password */}
        <Section title="Change Password">
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="password" placeholder="Current password" value={current} onChange={e => { setCurrent(e.target.value); setPwMsg(null); }} style={IS()} />
            <input type="password" placeholder="New password" value={next} onChange={e => { setNext(e.target.value); setPwMsg(null); }} style={IS()} />
            <input type="password" placeholder="Confirm new password" value={confirm} onChange={e => { setConfirm(e.target.value); setPwMsg(null); }} style={IS()} />
            {pwMsg && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, textAlign: "center", color: pwMsg.ok ? "hsl(120 40% 55%)" : "hsl(0 60% 58%)", margin: 0 }}>{pwMsg.text}</p>}
            <button type="submit" disabled={pwLoading} style={BS({ opacity: pwLoading ? 0.6 : 1 })}>{pwLoading ? "Saving..." : "Update Password"}</button>
          </form>
        </Section>

        {/* Church Access Code */}
        <Section title="Church Access Code">
          <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 35% 48%)", margin: "0 0 14px", letterSpacing: "0.03em" }}>
            The 4-digit PIN staff use to sign in from the access code screen.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: "hsl(38 30% 42%)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>New code</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {pinDigits.map((d, i) => (
                  <input key={i} ref={el => { pinRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handlePinDigit(pinDigits, setPinDigits, pinRefs, i, e.target.value)}
                    onKeyDown={e => handlePinKey(pinDigits, pinRefs, i, e)}
                    style={pinBoxStyle(!!d)} />
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: "hsl(38 30% 42%)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Confirm code</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {pinConfirm.map((d, i) => (
                  <input key={i} ref={el => { pinConfRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handlePinDigit(pinConfirm, setPinConfirm, pinConfRefs, i, e.target.value)}
                    onKeyDown={e => handlePinKey(pinConfirm, pinConfRefs, i, e)}
                    style={pinBoxStyle(!!d)} />
                ))}
              </div>
            </div>
            {pinMsg && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, textAlign: "center", color: pinMsg.ok ? "hsl(120 40% 55%)" : "hsl(0 60% 58%)", margin: 0 }}>{pinMsg.text}</p>}
            <button onClick={handleSavePin} disabled={pinLoading} style={BS({ opacity: pinLoading ? 0.6 : 1 })}>{pinLoading ? "Saving..." : "Update Access Code"}</button>
          </div>
        </Section>

        {/* Privacy & Data */}
        <Section title="Privacy & Data">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Data storage", value: "Encrypted at rest · US servers" },
              { label: "Access logs", value: "Admin actions logged for 90 days" },
              { label: "Contact data", value: "Never sold or shared with third parties" },
              { label: "Call records", value: "Retained for 12 months, then purged" },
              { label: "Sessions", value: "Expire after 24 hours of inactivity" },
              { label: "Passwords", value: "Hashed, never stored in plain text" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 35% 50%)", letterSpacing: "0.06em", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(38 55% 68%)", letterSpacing: "0.03em", textAlign: "right" }}>{value}</span>
                </div>
                <div style={{ height: 1, background: "hsl(38 15% 20%)", marginTop: 8 }} />
              </div>
            ))}
          </div>
        </Section>

        {/* Support */}
        <Section title="Support">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 45% 58%)", margin: 0 }}>
              For assistance with your account, reach out to the His Altar support team.
            </p>
            <a href="mailto:support@hisaltar.com" style={{ display: "block", textAlign: "center", padding: "10px 0", background: "hsl(35 22% 16%)", color: "hsl(38 60% 62%)", border: "1px solid hsl(38 25% 26%)", borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none" }}>
              support@hisaltar.com
            </a>
          </div>
        </Section>

        {/* Delete Account */}
        {orgSession && <DeleteAccountSection />}
      </div>
    </div>
  );
}

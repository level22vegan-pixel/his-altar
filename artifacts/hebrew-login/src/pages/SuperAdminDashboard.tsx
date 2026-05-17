import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { getSAToken } from "./SuperAdminLoginPage";

interface OrgRow {
  id: number; name: string; email: string; contactName: string | null;
  plan: string; billingStatus: string; billingNotes: string | null;
  suspended: boolean; campuses: string[];
  createdAt: string; lastActiveAt: string | null;
}
interface Msg { id: number; orgId: number; fromAdmin: boolean; message: string; createdAt: string; }
interface Stats { totalOrgs: number; activeOrgs: number; totalContacts: number; totalCalls: number; totalWorkers: number; }
interface Coupon {
  id: number; code: string; description: string | null;
  discountType: string; discountValue: string;
  plan: string | null; maxUses: number | null; usesCount: number;
  expiresAt: string | null; active: boolean; createdAt: string;
}

function saFetch(path: string, opts: RequestInit = {}) {
  const tok = getSAToken();
  return fetch(`/api/superadmin${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(tok ? { "X-SA-Token": tok } : {}), ...(opts.headers ?? {}) },
  });
}

const PLAN_OPTS   = ["free", "starter", "pro", "enterprise"];
const STATUS_OPTS = ["active", "trial", "past_due", "cancelled", "suspended"];
const PLAN_COLORS: Record<string, string> = { free: "#475569", starter: "#1d4ed8", pro: "#7c3aed", enterprise: "#b45309" };
const STATUS_COLORS: Record<string, string> = { active: "#16a34a", trial: "#0891b2", past_due: "#d97706", cancelled: "#dc2626", suspended: "#7f1d1d" };

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + "22", border: `1px solid ${color}55`, color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, textTransform: "capitalize", letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}
function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 0 }}>
      <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>{label}</p>
      <p style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ color: "#475569", fontSize: 12, margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: "#64748b", fontSize: 12 }}>{label}</span>
      <span style={{ color: "#94a3b8", fontSize: 12, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`; if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}
function genCode() {
  const words = ["GRACE","FAITH","ALTAR","GLORY","LIGHT","CROSS","HOPE","RISE","BLESS","PRAY"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${w}${n}`;
}

const BLANK_COUPON = { code: "", description: "", discountType: "percent", discountValue: "", plan: "", maxUses: "", expiresAt: "" };

export default function SuperAdminDashboard() {
  const [, navigate] = useLocation();
  const [pageView, setPageView] = useState<"orgs" | "coupons">("orgs");

  // Org state
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editOrg, setEditOrg] = useState<Partial<OrgRow>>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"billing" | "messages">("billing");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Password reset state
  const [resetPwId, setResetPwId] = useState<number | null>(null);
  const [resetPwVal, setResetPwVal] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [resetPwError, setResetPwError] = useState("");
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [resetPwOk, setResetPwOk] = useState(false);

  // Campus management state
  const [editCampuses, setEditCampuses] = useState<Record<number, string[]>>({});
  const [newCampusInput, setNewCampusInput] = useState<Record<number, string>>({});
  const [campusSaving, setCampusSaving] = useState<number | null>(null);

  // Coupon state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCoupon, setNewCoupon] = useState(BLANK_COUPON);
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [editCouponId, setEditCouponId] = useState<number | null>(null);
  const [confirmDeleteCoupon, setConfirmDeleteCoupon] = useState<number | null>(null);

  const loadOrgs = useCallback(async () => {
    const tok = getSAToken();
    if (!tok) { navigate("/superadmin/login"); return; }
    try {
      const [sRes, oRes] = await Promise.all([saFetch("/stats"), saFetch("/orgs")]);
      if (sRes.status === 401 || oRes.status === 401) { navigate("/superadmin/login"); return; }
      setStats(await sRes.json());
      setOrgs((await oRes.json()).orgs ?? []);
    } finally { setLoading(false); }
  }, [navigate]);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const res = await saFetch("/coupons");
      if (res.status === 401) { navigate("/superadmin/login"); return; }
      setCoupons((await res.json()).coupons ?? []);
    } finally { setCouponsLoading(false); }
  }, [navigate]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);
  useEffect(() => { if (pageView === "coupons") loadCoupons(); }, [pageView, loadCoupons]);

  async function expand(org: OrgRow) {
    if (expanded === org.id) { setExpanded(null); setResetPwId(null); return; }
    setExpanded(org.id);
    setEditOrg({ plan: org.plan, billingStatus: org.billingStatus, billingNotes: org.billingNotes ?? "" });
    setEditCampuses(prev => ({ ...prev, [org.id]: [...(org.campuses ?? [])] }));
    setNewCampusInput(prev => ({ ...prev, [org.id]: "" }));
    setActiveTab("billing");
    setResetPwId(null); setResetPwVal(""); setResetPwConfirm(""); setResetPwError(""); setResetPwOk(false);
    const mRes = await saFetch(`/orgs/${org.id}/messages`);
    setMsgs((await mRes.json()).messages ?? []);
  }

  async function saveCampuses(orgId: number) {
    setCampusSaving(orgId);
    try {
      await saFetch(`/orgs/${orgId}`, { method: "PUT", body: JSON.stringify({ campuses: editCampuses[orgId] ?? [] }) });
      await loadOrgs();
    } finally { setCampusSaving(null); }
  }

  async function saveBilling(orgId: number) {
    setSaving(true);
    try { await saFetch(`/orgs/${orgId}`, { method: "PUT", body: JSON.stringify(editOrg) }); await loadOrgs(); }
    finally { setSaving(false); }
  }

  async function doResetPw(orgId: number) {
    setResetPwError("");
    if (!resetPwVal || resetPwVal.length < 6) { setResetPwError("Minimum 6 characters."); return; }
    if (resetPwVal !== resetPwConfirm) { setResetPwError("Passwords do not match."); return; }
    setResetPwLoading(true);
    try {
      const res = await saFetch(`/orgs/${orgId}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: resetPwVal }) });
      if (!res.ok) { const d = await res.json(); setResetPwError(d.message || "Error"); return; }
      setResetPwOk(true); setResetPwVal(""); setResetPwConfirm("");
      setTimeout(() => { setResetPwOk(false); setResetPwId(null); }, 2500);
    } finally { setResetPwLoading(false); }
  }

  async function toggleSuspend(org: OrgRow) {
    await saFetch(`/orgs/${org.id}`, { method: "PUT", body: JSON.stringify({ suspended: !org.suspended }) });
    await loadOrgs();
  }

  async function deleteOrg(id: number) {
    await saFetch(`/orgs/${id}`, { method: "DELETE" });
    setConfirmDelete(null); setExpanded(null); await loadOrgs();
  }

  async function sendMsg(orgId: number) {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      await saFetch(`/orgs/${orgId}/messages`, { method: "POST", body: JSON.stringify({ message: newMsg.trim() }) });
      setNewMsg("");
      setMsgs((await (await saFetch(`/orgs/${orgId}/messages`)).json()).messages ?? []);
    } finally { setSending(false); }
  }

  async function createCoupon() {
    setCreateError("");
    if (!newCoupon.code.trim()) { setCreateError("Code is required."); return; }
    if (!newCoupon.discountValue || parseFloat(newCoupon.discountValue) <= 0) { setCreateError("Discount value must be greater than 0."); return; }
    setCreateLoading(true);
    try {
      const res = await saFetch("/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: newCoupon.code,
          description: newCoupon.description || undefined,
          discountType: newCoupon.discountType,
          discountValue: parseFloat(newCoupon.discountValue),
          plan: newCoupon.plan || undefined,
          maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : undefined,
          expiresAt: newCoupon.expiresAt || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setCreateError(d.message || "Error"); return; }
      setShowCreate(false); setNewCoupon(BLANK_COUPON); await loadCoupons();
    } finally { setCreateLoading(false); }
  }

  async function toggleCouponActive(c: Coupon) {
    await saFetch(`/coupons/${c.id}`, { method: "PUT", body: JSON.stringify({ active: !c.active }) });
    await loadCoupons();
  }

  async function deleteCoupon(id: number) {
    await saFetch(`/coupons/${id}`, { method: "DELETE" });
    setConfirmDeleteCoupon(null); await loadCoupons();
  }

  async function logout() {
    await saFetch("/logout", { method: "POST" });
    localStorage.removeItem("saSession"); navigate("/enter");
  }

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    (o.contactName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const inp: React.CSSProperties = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, padding: "8px 12px", outline: "none", width: "100%", boxSizing: "border-box" };
  const btn = (color = "#1d4ed8", extra: React.CSSProperties = {}): React.CSSProperties => ({ background: color, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, padding: "7px 14px", cursor: "pointer", ...extra });

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "0 28px", display: "flex", alignItems: "center", height: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #1d4ed8, #1e40af)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Site Control</span>
          <span style={{ color: "#334155", fontSize: 13, marginLeft: 4 }}>/ Platform Admin</span>
        </div>
        {/* Top-level nav */}
        <div style={{ display: "flex", gap: 4, marginRight: 16 }}>
          {(["orgs", "coupons"] as const).map(v => (
            <button key={v} onClick={() => setPageView(v)} style={{
              background: pageView === v ? "#1e293b" : "none",
              border: "1px solid " + (pageView === v ? "#334155" : "transparent"),
              borderRadius: 8, color: pageView === v ? "#f1f5f9" : "#64748b",
              fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer",
              textTransform: "capitalize",
            }}>
              {v === "orgs" ? "Organizations" : "Coupon Codes"}
            </button>
          ))}
        </div>
        <button onClick={logout} style={{ background: "none", border: "1px solid #1e293b", borderRadius: 8, color: "#64748b", fontSize: 12, padding: "6px 14px", cursor: "pointer" }}>
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px" }}>

        {/* Stats (always visible) */}
        {stats && (
          <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            <StatCard label="Total Churches" value={stats.totalOrgs} />
            <StatCard label="Active This Month" value={stats.activeOrgs} sub={`${stats.totalOrgs > 0 ? Math.round(stats.activeOrgs / stats.totalOrgs * 100) : 0}% of total`} />
            <StatCard label="Prayer Contacts" value={stats.totalContacts.toLocaleString()} />
            <StatCard label="Follow-up Calls" value={stats.totalCalls.toLocaleString()} />
            <StatCard label="Roster Workers" value={stats.totalWorkers.toLocaleString()} />
          </div>
        )}

        {/* ── ORGANIZATIONS VIEW ────────────────────────────────── */}
        {pageView === "orgs" && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Organizations</h2>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>{filtered.length} church{filtered.length !== 1 ? "es" : ""}</p>
              </div>
              <div style={{ position: "relative" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search churches…" style={{ ...inp, width: 220, paddingLeft: 34 }} />
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <button onClick={loadOrgs} style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8" }}>↻ Refresh</button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>{search ? "No churches match." : "No organizations yet."}</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 170px 100px 110px 90px 90px 40px", padding: "10px 24px", borderBottom: "1px solid #1e293b" }}>
                  {["Church", "Contact", "Plan", "Billing", "Joined", "Last Active", ""].map(h => (
                    <div key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                  ))}
                </div>

                {filtered.map(org => (
                  <div key={org.id}>
                    <div
                      onClick={() => expand(org)}
                      style={{ display: "grid", gridTemplateColumns: "1fr 170px 100px 110px 90px 90px 40px", padding: "14px 24px", borderBottom: "1px solid #1e293b", cursor: "pointer", transition: "background 0.1s", background: expanded === org.id ? "#0d1626" : "transparent" }}
                      onMouseOver={e => { if (expanded !== org.id) (e.currentTarget as HTMLElement).style.background = "#0d1626"; }}
                      onMouseOut={e => { if (expanded !== org.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: org.suspended ? "#7f1d1d" : org.lastActiveAt && Date.now() - new Date(org.lastActiveAt).getTime() < 7 * 86400000 ? "#16a34a" : "#475569", flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: 14, color: org.suspended ? "#64748b" : "#f1f5f9" }}>{org.name}</span>
                          {org.suspended && <Badge label="suspended" color="#dc2626" />}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2, paddingLeft: 15 }}>{org.email}</div>
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 13, alignSelf: "center" }}>{org.contactName ?? "—"}</div>
                      <div style={{ alignSelf: "center" }}><Badge label={org.plan} color={PLAN_COLORS[org.plan] ?? "#475569"} /></div>
                      <div style={{ alignSelf: "center" }}><Badge label={org.billingStatus.replace("_", " ")} color={STATUS_COLORS[org.billingStatus] ?? "#475569"} /></div>
                      <div style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>{new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</div>
                      <div style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>{timeAgo(org.lastActiveAt)}</div>
                      <div style={{ alignSelf: "center", textAlign: "right", color: "#475569", fontSize: 13 }}>{expanded === org.id ? "▲" : "▼"}</div>
                    </div>

                    {expanded === org.id && (
                      <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e293b", padding: "24px 28px" }}>
                        {/* Inner tabs */}
                        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1e293b" }}>
                          {(["billing", "messages"] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", color: activeTab === tab ? "#3b82f6" : "#64748b", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent", textTransform: "capitalize" }}>{tab}</button>
                          ))}
                        </div>

                        {activeTab === "billing" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                            {/* Left: billing form */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              <div>
                                <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Plan</label>
                                <select value={editOrg.plan ?? org.plan} onChange={e => setEditOrg(p => ({ ...p, plan: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                                  {PLAN_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Billing Status</label>
                                <select value={editOrg.billingStatus ?? org.billingStatus} onChange={e => setEditOrg(p => ({ ...p, billingStatus: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Billing Notes</label>
                                <textarea value={editOrg.billingNotes ?? ""} onChange={e => setEditOrg(p => ({ ...p, billingNotes: e.target.value }))} placeholder="Payment info, Stripe customer ID…" rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
                              </div>
                              <button onClick={() => saveBilling(org.id)} disabled={saving} style={btn()}>{saving ? "Saving…" : "Save Billing Info"}</button>
                            </div>

                            {/* Right: account info + actions + password reset */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                                <p style={{ margin: 0, color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Account Info</p>
                                <InfoRow label="Org ID" value={`#${org.id}`} />
                                <InfoRow label="Email" value={org.email} />
                                <InfoRow label="Contact" value={org.contactName ?? "—"} />
                                {/* Campus management */}
                                <div>
                                  <span style={{ color: "#64748b", fontSize: 12 }}>Campuses</span>
                                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                                    {(editCampuses[org.id] ?? org.campuses ?? []).length === 0 ? (
                                      <span style={{ color: "#334155", fontSize: 12 }}>None</span>
                                    ) : (
                                      (editCampuses[org.id] ?? org.campuses ?? []).map((c, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "5px 10px" }}>
                                          <span style={{ color: "#94a3b8", fontSize: 12 }}>{c}</span>
                                          <button
                                            onClick={() => setEditCampuses(prev => ({
                                              ...prev,
                                              [org.id]: (prev[org.id] ?? org.campuses ?? []).filter((_, i) => i !== idx)
                                            }))}
                                            style={{ background: "none", border: "none", color: "#ef4444", fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
                                            title="Remove campus"
                                          >×</button>
                                        </div>
                                      ))
                                    )}
                                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                                      <input
                                        value={newCampusInput[org.id] ?? ""}
                                        onChange={e => setNewCampusInput(prev => ({ ...prev, [org.id]: e.target.value }))}
                                        onKeyDown={e => {
                                          if (e.key === "Enter") {
                                            const val = (newCampusInput[org.id] ?? "").trim().toUpperCase();
                                            if (!val) return;
                                            setEditCampuses(prev => ({ ...prev, [org.id]: [...(prev[org.id] ?? org.campuses ?? []), val] }));
                                            setNewCampusInput(prev => ({ ...prev, [org.id]: "" }));
                                          }
                                        }}
                                        placeholder="Add campus…"
                                        style={{ ...inp, fontSize: 11, padding: "5px 8px", flex: 1 }}
                                      />
                                      <button
                                        onClick={() => {
                                          const val = (newCampusInput[org.id] ?? "").trim().toUpperCase();
                                          if (!val) return;
                                          setEditCampuses(prev => ({ ...prev, [org.id]: [...(prev[org.id] ?? org.campuses ?? []), val] }));
                                          setNewCampusInput(prev => ({ ...prev, [org.id]: "" }));
                                        }}
                                        style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8", fontSize: 11, padding: "5px 10px" }}
                                      >+</button>
                                    </div>
                                    <button
                                      onClick={() => saveCampuses(org.id)}
                                      disabled={campusSaving === org.id}
                                      style={{ ...btn("#1d4ed8"), fontSize: 11, padding: "5px 0" }}
                                    >
                                      {campusSaving === org.id ? "Saving…" : "Save Campuses"}
                                    </button>
                                  </div>
                                </div>
                                <InfoRow label="Registered" value={new Date(org.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                                <InfoRow label="Last Active" value={org.lastActiveAt ? new Date(org.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"} />
                              </div>

                              {/* Password Reset */}
                              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: resetPwId === org.id ? 12 : 0 }}>
                                  <p style={{ margin: 0, color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Password Reset</p>
                                  <button onClick={() => { setResetPwId(resetPwId === org.id ? null : org.id); setResetPwVal(""); setResetPwConfirm(""); setResetPwError(""); setResetPwOk(false); }}
                                    style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>
                                    {resetPwId === org.id ? "Cancel" : "Reset Password"}
                                  </button>
                                </div>
                                {resetPwId === org.id && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    <input type="password" value={resetPwVal} onChange={e => { setResetPwVal(e.target.value); setResetPwError(""); }} placeholder="New password (min 6 chars)" style={inp} />
                                    <input type="password" value={resetPwConfirm} onChange={e => { setResetPwConfirm(e.target.value); setResetPwError(""); }} placeholder="Confirm new password" style={inp} />
                                    {resetPwError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{resetPwError}</p>}
                                    {resetPwOk && <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>✓ Password updated successfully</p>}
                                    <button onClick={() => doResetPw(org.id)} disabled={resetPwLoading} style={btn("#0891b2")}>
                                      {resetPwLoading ? "Updating…" : "Set New Password"}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => toggleSuspend(org)} style={btn(org.suspended ? "#16a34a" : "#b45309")}>{org.suspended ? "✓ Reactivate" : "⊘ Suspend"}</button>
                                <button onClick={() => setConfirmDelete(org.id)} style={btn("#7f1d1d")}>✕ Delete</button>
                              </div>

                              {confirmDelete === org.id && (
                                <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: 14 }}>
                                  <p style={{ color: "#fca5a5", fontSize: 13, margin: "0 0 12px" }}>Permanently delete <strong>{org.name}</strong>? This cannot be undone.</p>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => deleteOrg(org.id)} style={btn("#dc2626")}>Yes, Delete</button>
                                    <button onClick={() => setConfirmDelete(null)} style={btn("#1e293b")}>Cancel</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {activeTab === "messages" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, minHeight: 160, maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                              {msgs.length === 0 ? (
                                <p style={{ color: "#475569", fontSize: 13, textAlign: "center", margin: "auto" }}>No messages yet.</p>
                              ) : msgs.map(m => (
                                <div key={m.id} style={{ display: "flex", flexDirection: m.fromAdmin ? "row-reverse" : "row", gap: 8 }}>
                                  <div style={{ maxWidth: "75%", background: m.fromAdmin ? "#1d3a6e" : "#1e293b", border: `1px solid ${m.fromAdmin ? "#2563eb44" : "#33415544"}`, borderRadius: 10, padding: "8px 12px" }}>
                                    <p style={{ margin: 0, fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{m.message}</p>
                                    <p style={{ margin: "4px 0 0", fontSize: 10, color: "#475569", textAlign: m.fromAdmin ? "right" : "left" }}>
                                      {m.fromAdmin ? "You" : org.name} · {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(org.id); } }} placeholder="Send a message to this church…" style={{ ...inp, flex: 1 }} />
                              <button onClick={() => sendMsg(org.id)} disabled={sending || !newMsg.trim()} style={btn()}>{sending ? "…" : "Send"}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── COUPONS VIEW ──────────────────────────────────────── */}
        {pageView === "coupons" && (
          <div>
            {/* Create coupon panel */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ padding: "20px 24px", borderBottom: showCreate ? "1px solid #1e293b" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Coupon Codes</h2>
                  <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>Create membership discount codes for churches</p>
                </div>
                <button onClick={() => { setShowCreate(v => !v); setNewCoupon(BLANK_COUPON); setCreateError(""); }}
                  style={btn(showCreate ? "#1e293b" : "#1d4ed8", showCreate ? { border: "1px solid #334155", color: "#94a3b8" } : {})}>
                  {showCreate ? "✕ Cancel" : "+ New Coupon"}
                </button>
              </div>

              {showCreate && (
                <div style={{ padding: "24px 28px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Coupon Code *</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={newCoupon.code} onChange={e => setNewCoupon(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="GRACE50" style={{ ...inp, flex: 1 }} />
                        <button onClick={() => setNewCoupon(p => ({ ...p, code: genCode() }))}
                          title="Generate random code"
                          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 12, padding: "0 10px", cursor: "pointer", flexShrink: 0 }}>
                          ⚡
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Discount Type</label>
                      <select value={newCoupon.discountType} onChange={e => setNewCoupon(p => ({ ...p, discountType: e.target.value, discountValue: "" }))} style={{ ...inp, cursor: "pointer" }}>
                        <option value="percent">Percent Off (%)</option>
                        <option value="flat">Flat Amount ($)</option>
                        <option value="trial_extension">Trial Extension (days)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
                        {newCoupon.discountType === "percent" ? "Value (%)" : newCoupon.discountType === "trial_extension" ? "Days to Extend *" : "Value ($)"}
                      </label>
                      <input type="number" min="0" step={newCoupon.discountType === "trial_extension" ? "1" : "0.01"} value={newCoupon.discountValue} onChange={e => setNewCoupon(p => ({ ...p, discountValue: e.target.value }))} placeholder={newCoupon.discountType === "percent" ? "e.g. 50" : newCoupon.discountType === "trial_extension" ? "e.g. 30" : "e.g. 20.00"} style={inp} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ gridColumn: "1 / 2" }}>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Description</label>
                      <input value={newCoupon.description} onChange={e => setNewCoupon(p => ({ ...p, description: e.target.value }))} placeholder="e.g. First month free" style={inp} />
                    </div>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Applies to Plan</label>
                      <select value={newCoupon.plan} onChange={e => setNewCoupon(p => ({ ...p, plan: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                        <option value="">Any plan</option>
                        {PLAN_OPTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Max Uses</label>
                      <input type="number" min="1" value={newCoupon.maxUses} onChange={e => setNewCoupon(p => ({ ...p, maxUses: e.target.value }))} placeholder="Unlimited" style={inp} />
                    </div>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Expires At</label>
                      <input type="date" value={newCoupon.expiresAt} onChange={e => setNewCoupon(p => ({ ...p, expiresAt: e.target.value }))} style={{ ...inp, colorScheme: "dark" }} />
                    </div>
                  </div>
                  {createError && <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}>{createError}</p>}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={createCoupon} disabled={createLoading} style={btn()}>{createLoading ? "Creating…" : "Create Coupon"}</button>
                    <button onClick={() => { setShowCreate(false); setCreateError(""); }} style={btn("#1e293b", { border: "1px solid #334155", color: "#94a3b8" })}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Coupons table */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
              {couponsLoading ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>Loading…</div>
              ) : coupons.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>No coupons yet. Create your first one above.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px 110px 100px 90px 90px 110px", padding: "10px 24px", borderBottom: "1px solid #1e293b" }}>
                    {["Code", "Description", "Discount", "Plan", "Uses", "Expires", "Status", ""].map(h => (
                      <div key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                    ))}
                  </div>
                  {coupons.map(c => (
                    <div key={c.id}>
                      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 120px 110px 100px 90px 90px 110px", padding: "14px 24px", borderBottom: "1px solid #1e293b", alignItems: "center" }}>
                        <div>
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: c.active ? "#93c5fd" : "#475569", letterSpacing: "0.05em" }}>{c.code}</span>
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{c.description || <span style={{ color: "#334155" }}>—</span>}</div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: c.discountType === "percent" ? "#a78bfa" : c.discountType === "trial_extension" ? "#fbbf24" : "#34d399" }}>
                          {c.discountType === "percent" ? `${parseFloat(c.discountValue).toFixed(0)}% off` : c.discountType === "trial_extension" ? `+${Math.round(parseFloat(c.discountValue))}d trial` : `$${parseFloat(c.discountValue).toFixed(2)} off`}
                        </div>
                        <div>{c.plan ? <Badge label={c.plan} color={PLAN_COLORS[c.plan] ?? "#475569"} /> : <span style={{ color: "#334155", fontSize: 12 }}>Any</span>}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {c.usesCount}{c.maxUses ? `/${c.maxUses}` : ""} <span style={{ color: "#475569" }}>used</span>
                        </div>
                        <div style={{ fontSize: 12, color: c.expiresAt && new Date(c.expiresAt) < new Date() ? "#ef4444" : "#64748b" }}>
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "Never"}
                        </div>
                        <div>
                          <Badge label={c.active ? "active" : "inactive"} color={c.active ? "#16a34a" : "#475569"} />
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => toggleCouponActive(c)}
                            title={c.active ? "Deactivate" : "Activate"}
                            style={{ background: c.active ? "#1e293b" : "#14532d44", border: `1px solid ${c.active ? "#334155" : "#16a34a44"}`, borderRadius: 6, color: c.active ? "#64748b" : "#4ade80", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                            {c.active ? "Pause" : "Activate"}
                          </button>
                          <button onClick={() => setConfirmDeleteCoupon(c.id)}
                            style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#ef4444", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
                            ✕
                          </button>
                        </div>
                      </div>
                      {confirmDeleteCoupon === c.id && (
                        <div style={{ background: "#1c0a0a", borderBottom: "1px solid #7f1d1d", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
                          <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>Delete coupon <strong>{c.code}</strong>?</p>
                          <button onClick={() => deleteCoupon(c.id)} style={btn("#dc2626")}>Yes, Delete</button>
                          <button onClick={() => setConfirmDeleteCoupon(null)} style={btn("#1e293b", { border: "1px solid #334155", color: "#94a3b8" })}>Cancel</button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", color: "#1e293b", fontSize: 12, marginTop: 32 }}>His Altar · Site Control · Platform Administrator</p>
      </div>
    </div>
  );
}

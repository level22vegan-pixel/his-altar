import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { getSAToken } from "./SuperAdminLoginPage";
import { setOrgSession } from "@/lib/session";

interface OrgRow {
  id: number; name: string; email: string; contactName: string | null;
  plan: string; billingStatus: string; billingNotes: string | null;
  suspended: boolean; campuses: string[]; trialEndsAt: string | null;
  dataRetentionMonths: number | null;
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
interface AuditEntry {
  id: number; action: string; orgId: number | null;
  details: string | null; reason: string | null; createdAt: string;
}
interface BannerData { message: string; type: string; expiresAt: string | null; }

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
const BANNER_COLORS: Record<string, string> = { info: "#1d4ed8", warning: "#d97706", maintenance: "#7c3aed", success: "#16a34a" };

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
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</p>;
}
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday";
  if (d < 30) return `${d}d ago`; if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}
function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
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
  const [pageView, setPageView] = useState<"orgs" | "comms" | "coupons" | "security">("orgs");

  // ── Org state ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editOrg, setEditOrg] = useState<Partial<OrgRow>>({});
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"billing" | "trial" | "messages">("billing");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Password reset
  const [resetPwId, setResetPwId] = useState<number | null>(null);
  const [resetPwVal, setResetPwVal] = useState("");
  const [resetPwConfirm, setResetPwConfirm] = useState("");
  const [resetPwError, setResetPwError] = useState("");
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [resetPwOk, setResetPwOk] = useState(false);

  // Campus management
  const [editCampuses, setEditCampuses] = useState<Record<number, string[]>>({});
  const [newCampusInput, setNewCampusInput] = useState<Record<number, string>>({});
  const [campusSaving, setCampusSaving] = useState<number | null>(null);

  // Impersonate
  const [impersonateId, setImpersonateId] = useState<number | null>(null);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateError, setImpersonateError] = useState("");

  // Extend trial
  const [extendTrialId, setExtendTrialId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("");
  const [extendDate, setExtendDate] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendOk, setExtendOk] = useState(false);

  // Merge
  const [mergeId, setMergeId] = useState<number | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [mergeReason, setMergeReason] = useState("");
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [mergeOk, setMergeOk] = useState("");

  // Retention per org
  const [retentionInput, setRetentionInput] = useState<Record<number, string>>({});
  const [retentionSaving, setRetentionSaving] = useState<number | null>(null);
  const [retentionOk, setRetentionOk] = useState<number | null>(null);

  // ── Communications state ─────────────────────────────────────────────────────
  const [broadcastFilter, setBroadcastFilter] = useState("all");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; total: number } | null>(null);
  const [broadcastError, setBroadcastError] = useState("");

  const [banner, setBanner] = useState<BannerData | null>(null);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bannerForm, setBannerForm] = useState({ message: "", type: "info", expiresAt: "" });
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerOk, setBannerOk] = useState(false);

  // ── Coupon state ─────────────────────────────────────────────────────────────
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCoupon, setNewCoupon] = useState(BLANK_COUPON);
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [confirmDeleteCoupon, setConfirmDeleteCoupon] = useState<number | null>(null);

  // ── Security state ───────────────────────────────────────────────────────────
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [sensitiveAccess, setSensitiveAccess] = useState(false);
  const [globalRetention, setGlobalRetention] = useState("");
  const [securityLoaded, setSecurityLoaded] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityOk, setSecurityOk] = useState(false);
  const [sensitiveReason, setSensitiveReason] = useState("");

  // ── Data loaders ─────────────────────────────────────────────────────────────
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

  const loadBanner = useCallback(async () => {
    const res = await saFetch("/banner");
    const d = await res.json();
    setBanner(d.banner);
    if (d.banner) setBannerForm({ message: d.banner.message, type: d.banner.type, expiresAt: d.banner.expiresAt?.split("T")[0] ?? "" });
    setBannerLoaded(true);
  }, []);

  const loadSecurity = useCallback(async () => {
    const [secRes, logRes] = await Promise.all([saFetch("/security"), saFetch("/audit-log")]);
    const sec = await secRes.json();
    setSensitiveAccess(sec.sensitiveAccessEnabled);
    setGlobalRetention(sec.defaultRetentionMonths ? String(sec.defaultRetentionMonths) : "");
    setAuditLog((await logRes.json()).logs ?? []);
    setSecurityLoaded(true);
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);
  useEffect(() => { if (pageView === "coupons") loadCoupons(); }, [pageView, loadCoupons]);
  useEffect(() => { if (pageView === "comms" && !bannerLoaded) loadBanner(); }, [pageView, bannerLoaded, loadBanner]);
  useEffect(() => { if (pageView === "security" && !securityLoaded) { setAuditLoading(true); loadSecurity().finally(() => setAuditLoading(false)); } }, [pageView, securityLoaded, loadSecurity]);

  // ── Org actions ──────────────────────────────────────────────────────────────
  async function expand(org: OrgRow) {
    if (expanded === org.id) { setExpanded(null); return; }
    setExpanded(org.id);
    setEditOrg({ plan: org.plan, billingStatus: org.billingStatus, billingNotes: org.billingNotes ?? "" });
    setEditCampuses(prev => ({ ...prev, [org.id]: [...(org.campuses ?? [])] }));
    setNewCampusInput(prev => ({ ...prev, [org.id]: "" }));
    setRetentionInput(prev => ({ ...prev, [org.id]: org.dataRetentionMonths ? String(org.dataRetentionMonths) : "" }));
    setActiveTab("billing");
    setResetPwId(null); setImpersonateId(null); setExtendTrialId(null); setMergeId(null);
    setImpersonateError(""); setMergeError(""); setMergeOk(""); setExtendOk(false);
    const mRes = await saFetch(`/orgs/${org.id}/messages`);
    setMsgs((await mRes.json()).messages ?? []);
  }

  async function saveBilling(orgId: number) {
    setSaving(true);
    try { await saFetch(`/orgs/${orgId}`, { method: "PUT", body: JSON.stringify(editOrg) }); await loadOrgs(); }
    finally { setSaving(false); }
  }

  async function saveCampuses(orgId: number) {
    setCampusSaving(orgId);
    try {
      await saFetch(`/orgs/${orgId}`, { method: "PUT", body: JSON.stringify({ campuses: editCampuses[orgId] ?? [] }) });
      await loadOrgs();
    } finally { setCampusSaving(null); }
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

  async function doImpersonate(orgId: number, org: OrgRow) {
    setImpersonateError("");
    if (!impersonateReason.trim()) { setImpersonateError("Reason is required."); return; }
    setImpersonateLoading(true);
    try {
      const res = await saFetch(`/orgs/${orgId}/impersonate`, { method: "POST", body: JSON.stringify({ reason: impersonateReason }) });
      if (!res.ok) { const d = await res.json(); setImpersonateError(d.message || "Error"); return; }
      const data = await res.json();
      setOrgSession(data.orgId, data.orgName, data.token);
      navigate("/org/dashboard");
    } finally { setImpersonateLoading(false); }
  }

  async function doExtendTrial(orgId: number) {
    if (!extendDays && !extendDate) return;
    setExtendLoading(true);
    try {
      const body = extendDate ? { endsAt: extendDate } : { days: parseInt(extendDays) };
      const res = await saFetch(`/orgs/${orgId}/trial`, { method: "PUT", body: JSON.stringify(body) });
      if (!res.ok) return;
      setExtendOk(true); setExtendDays(""); setExtendDate("");
      setTimeout(() => { setExtendOk(false); setExtendTrialId(null); }, 2500);
      await loadOrgs();
    } finally { setExtendLoading(false); }
  }

  async function doMerge(sourceId: number) {
    setMergeError(""); setMergeOk("");
    const targetId = parseInt(mergeTargetId);
    if (!targetId || isNaN(targetId)) { setMergeError("Enter a valid target Org ID."); return; }
    if (targetId === sourceId) { setMergeError("Source and target cannot be the same."); return; }
    if (!mergeReason.trim()) { setMergeError("Reason is required."); return; }
    setMergeLoading(true);
    try {
      const res = await saFetch("/merge", { method: "POST", body: JSON.stringify({ sourceId, targetId, reason: mergeReason }) });
      const d = await res.json();
      if (!res.ok) { setMergeError(d.message || "Merge failed."); return; }
      setMergeOk(`Merged "${d.merged.source}" into "${d.merged.target}" successfully.`);
      setMergeId(null); setMergeTargetId(""); setMergeReason("");
      setExpanded(null); await loadOrgs();
    } finally { setMergeLoading(false); }
  }

  async function saveRetention(orgId: number) {
    setRetentionSaving(orgId);
    const val = retentionInput[orgId] ? parseInt(retentionInput[orgId]) : null;
    try {
      await saFetch(`/orgs/${orgId}`, { method: "PUT", body: JSON.stringify({ dataRetentionMonths: val }) });
      setRetentionOk(orgId); setTimeout(() => setRetentionOk(null), 2000);
      await loadOrgs();
    } finally { setRetentionSaving(null); }
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

  // ── Broadcast ────────────────────────────────────────────────────────────────
  async function doBroadcast() {
    setBroadcastError(""); setBroadcastResult(null);
    if (!broadcastSubject.trim() || !broadcastBody.trim()) { setBroadcastError("Subject and body are required."); return; }
    setBroadcastLoading(true);
    try {
      const res = await saFetch("/broadcast", { method: "POST", body: JSON.stringify({ filter: broadcastFilter, subject: broadcastSubject, body: broadcastBody }) });
      const d = await res.json();
      if (!res.ok) { setBroadcastError(d.message || "Error sending broadcast."); return; }
      setBroadcastResult(d);
      setBroadcastSubject(""); setBroadcastBody("");
    } finally { setBroadcastLoading(false); }
  }

  // ── Banner ───────────────────────────────────────────────────────────────────
  async function saveBanner() {
    setBannerLoading(true); setBannerOk(false);
    try {
      await saFetch("/banner", { method: "PUT", body: JSON.stringify(bannerForm) });
      await loadBanner();
      setBannerOk(true); setTimeout(() => setBannerOk(false), 2500);
    } finally { setBannerLoading(false); }
  }

  async function clearBanner() {
    setBannerLoading(true);
    try {
      await saFetch("/banner", { method: "PUT", body: JSON.stringify({ message: "" }) });
      setBanner(null); setBannerForm({ message: "", type: "info", expiresAt: "" });
    } finally { setBannerLoading(false); }
  }

  // ── Security ─────────────────────────────────────────────────────────────────
  async function saveSecurity() {
    if (sensitiveAccess && !sensitiveReason.trim()) { return; }
    setSecuritySaving(true); setSecurityOk(false);
    try {
      await saFetch("/security", { method: "PUT", body: JSON.stringify({
        sensitiveAccessEnabled: sensitiveAccess,
        defaultRetentionMonths: globalRetention ? parseInt(globalRetention) : null,
        reason: sensitiveReason,
      }) });
      setSecurityOk(true); setSensitiveReason("");
      setTimeout(() => setSecurityOk(false), 2500);
      setSecurityLoaded(false);
    } finally { setSecuritySaving(false); }
  }

  // ── Coupons ──────────────────────────────────────────────────────────────────
  async function createCoupon() {
    setCreateError("");
    if (!newCoupon.code.trim()) { setCreateError("Code is required."); return; }
    if (!newCoupon.discountValue || parseFloat(newCoupon.discountValue) <= 0) { setCreateError("Discount value must be > 0."); return; }
    setCreateLoading(true);
    try {
      const res = await saFetch("/coupons", { method: "POST", body: JSON.stringify({
        code: newCoupon.code, description: newCoupon.description || undefined,
        discountType: newCoupon.discountType, discountValue: parseFloat(newCoupon.discountValue),
        plan: newCoupon.plan || undefined, maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : undefined,
        expiresAt: newCoupon.expiresAt || undefined,
      }) });
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
  const card: React.CSSProperties = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 };

  const NAV_ITEMS: { key: typeof pageView; label: string }[] = [
    { key: "orgs", label: "Organizations" },
    { key: "comms", label: "Communications" },
    { key: "coupons", label: "Coupons" },
    { key: "security", label: "Security & Privacy" },
  ];

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
        <div style={{ display: "flex", gap: 4, marginRight: 16 }}>
          {NAV_ITEMS.map(v => (
            <button key={v.key} onClick={() => setPageView(v.key)} style={{
              background: pageView === v.key ? "#1e293b" : "none",
              border: "1px solid " + (pageView === v.key ? "#334155" : "transparent"),
              borderRadius: 8, color: pageView === v.key ? "#f1f5f9" : "#64748b",
              fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer",
            }}>
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={logout} style={{ background: "none", border: "1px solid #1e293b", borderRadius: 8, color: "#64748b", fontSize: 12, padding: "6px 14px", cursor: "pointer" }}>
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 28px" }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
            <StatCard label="Total Churches" value={stats.totalOrgs} />
            <StatCard label="Active This Month" value={stats.activeOrgs} sub={`${stats.totalOrgs > 0 ? Math.round(stats.activeOrgs / stats.totalOrgs * 100) : 0}% of total`} />
            <StatCard label="Prayer Contacts" value={stats.totalContacts.toLocaleString()} />
            <StatCard label="Follow-up Calls" value={stats.totalCalls.toLocaleString()} />
            <StatCard label="Roster Workers" value={stats.totalWorkers.toLocaleString()} />
          </div>
        )}

        {/* ═══════════════════════ ORGANIZATIONS ═══════════════════════════════ */}
        {pageView === "orgs" && (
          <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Organizations</h2>
                <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: 13 }}>{filtered.length} church{filtered.length !== 1 ? "es" : ""}</p>
              </div>
              <div style={{ position: "relative" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search churches…" style={{ ...inp, width: 220, paddingLeft: 34 }} />
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <button onClick={loadOrgs} style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8" }}>↻ Refresh</button>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>{search ? "No churches match." : "No organizations yet."}</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px 110px 80px 80px 90px 40px", padding: "10px 24px", borderBottom: "1px solid #1e293b" }}>
                  {["Church", "Contact", "Plan", "Billing", "Trial Left", "Joined", "Last Active", ""].map(h => (
                    <div key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                  ))}
                </div>

                {filtered.map(org => {
                  const daysLeft = trialDaysLeft(org.trialEndsAt);
                  return (
                    <div key={org.id}>
                      <div
                        onClick={() => expand(org)}
                        style={{ display: "grid", gridTemplateColumns: "1fr 150px 100px 110px 80px 80px 90px 40px", padding: "14px 24px", borderBottom: "1px solid #1e293b", cursor: "pointer", transition: "background 0.1s", background: expanded === org.id ? "#0d1626" : "transparent" }}
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
                        <div style={{ alignSelf: "center" }}>
                          {daysLeft === null ? <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                            : daysLeft <= 0 ? <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>Expired</span>
                            : daysLeft <= 7 ? <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>{daysLeft}d</span>
                            : <span style={{ color: "#64748b", fontSize: 12 }}>{daysLeft}d</span>}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>{new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</div>
                        <div style={{ color: "#64748b", fontSize: 12, alignSelf: "center" }}>{timeAgo(org.lastActiveAt)}</div>
                        <div style={{ alignSelf: "center", textAlign: "right", color: "#475569", fontSize: 13 }}>{expanded === org.id ? "▲" : "▼"}</div>
                      </div>

                      {expanded === org.id && (
                        <div style={{ background: "#0a0f1a", borderBottom: "1px solid #1e293b", padding: "24px 28px" }}>
                          {/* Inner tabs */}
                          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1e293b" }}>
                            {(["billing", "trial", "messages"] as const).map(tab => (
                              <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", cursor: "pointer", color: activeTab === tab ? "#3b82f6" : "#64748b", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent", textTransform: "capitalize" }}>
                                {tab === "trial" ? "Trial & Access" : tab}
                              </button>
                            ))}
                          </div>

                          {/* ── Billing tab ── */}
                          {activeTab === "billing" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
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
                                  <textarea value={editOrg.billingNotes ?? ""} onChange={e => setEditOrg(p => ({ ...p, billingNotes: e.target.value }))} placeholder="Stripe customer ID, payment notes…" rows={3} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
                                </div>
                                <button onClick={() => saveBilling(org.id)} disabled={saving} style={btn()}>{saving ? "Saving…" : "Save Billing Info"}</button>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                                  <SectionLabel>Account Info</SectionLabel>
                                  <InfoRow label="Org ID" value={`#${org.id}`} />
                                  <InfoRow label="Email" value={org.email} />
                                  <InfoRow label="Contact" value={org.contactName ?? "—"} />
                                  <div>
                                    <span style={{ color: "#64748b", fontSize: 12 }}>Campuses</span>
                                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                                      {(editCampuses[org.id] ?? org.campuses ?? []).length === 0 ? (
                                        <span style={{ color: "#334155", fontSize: 12 }}>None</span>
                                      ) : (editCampuses[org.id] ?? org.campuses ?? []).map((c, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "5px 10px" }}>
                                          <span style={{ color: "#94a3b8", fontSize: 12 }}>{c}</span>
                                          <button onClick={() => setEditCampuses(prev => ({ ...prev, [org.id]: (prev[org.id] ?? org.campuses ?? []).filter((_, i) => i !== idx) }))} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 14, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
                                        </div>
                                      ))}
                                      <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                                        <input value={newCampusInput[org.id] ?? ""} onChange={e => setNewCampusInput(prev => ({ ...prev, [org.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") { const val = (newCampusInput[org.id] ?? "").trim().toUpperCase(); if (!val) return; setEditCampuses(prev => ({ ...prev, [org.id]: [...(prev[org.id] ?? org.campuses ?? []), val] })); setNewCampusInput(prev => ({ ...prev, [org.id]: "" })); } }} placeholder="Add campus…" style={{ ...inp, fontSize: 11, padding: "5px 8px", flex: 1 }} />
                                        <button onClick={() => { const val = (newCampusInput[org.id] ?? "").trim().toUpperCase(); if (!val) return; setEditCampuses(prev => ({ ...prev, [org.id]: [...(prev[org.id] ?? org.campuses ?? []), val] })); setNewCampusInput(prev => ({ ...prev, [org.id]: "" })); }} style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8", fontSize: 11, padding: "5px 10px" }}>+</button>
                                      </div>
                                      <button onClick={() => saveCampuses(org.id)} disabled={campusSaving === org.id} style={{ ...btn("#1d4ed8"), fontSize: 11, padding: "5px 0" }}>{campusSaving === org.id ? "Saving…" : "Save Campuses"}</button>
                                    </div>
                                  </div>
                                  <InfoRow label="Registered" value={new Date(org.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                                  <InfoRow label="Last Active" value={org.lastActiveAt ? new Date(org.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"} />
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={() => toggleSuspend(org)} style={btn(org.suspended ? "#16a34a" : "#b45309")}>{org.suspended ? "✓ Reactivate" : "⊘ Suspend"}</button>
                                  <button onClick={() => setConfirmDelete(org.id)} style={btn("#7f1d1d")}>✕ Delete</button>
                                </div>

                                {confirmDelete === org.id && (
                                  <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: 14 }}>
                                    <p style={{ color: "#fca5a5", fontSize: 13, margin: "0 0 12px" }}>Permanently delete <strong>{org.name}</strong>? All data will be removed.</p>
                                    <div style={{ display: "flex", gap: 8 }}>
                                      <button onClick={() => deleteOrg(org.id)} style={btn("#dc2626")}>Yes, Delete Everything</button>
                                      <button onClick={() => setConfirmDelete(null)} style={btn("#1e293b")}>Cancel</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── Trial & Access tab ── */}
                          {activeTab === "trial" && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                              {/* Left: trial + impersonate */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                                {/* Trial status */}
                                <div style={card}>
                                  <SectionLabel>Trial Period</SectionLabel>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                    <div>
                                      {org.trialEndsAt ? (
                                        <>
                                          <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>Ends {new Date(org.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                                          {(() => {
                                            const d = trialDaysLeft(org.trialEndsAt);
                                            return d !== null ? (
                                              <p style={{ margin: "4px 0 0", fontSize: 12, color: d <= 0 ? "#ef4444" : d <= 7 ? "#f59e0b" : "#64748b" }}>
                                                {d <= 0 ? "Trial expired" : `${d} days remaining`}
                                              </p>
                                            ) : null;
                                          })()}
                                        </>
                                      ) : (
                                        <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>No trial date set</p>
                                      )}
                                    </div>
                                    <button onClick={() => { setExtendTrialId(extendTrialId === org.id ? null : org.id); setExtendDays(""); setExtendDate(""); setExtendOk(false); }} style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8", fontSize: 11 }}>
                                      {extendTrialId === org.id ? "Cancel" : "Extend Trial"}
                                    </button>
                                  </div>
                                  {extendTrialId === org.id && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
                                        <div>
                                          <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Add Days</label>
                                          <input type="number" min="1" max="365" value={extendDays} onChange={e => { setExtendDays(e.target.value); setExtendDate(""); }} placeholder="e.g. 30" style={inp} />
                                        </div>
                                        <span style={{ color: "#334155", fontSize: 11, marginTop: 18 }}>or</span>
                                        <div>
                                          <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Set End Date</label>
                                          <input type="date" value={extendDate} onChange={e => { setExtendDate(e.target.value); setExtendDays(""); }} style={{ ...inp, colorScheme: "dark" }} />
                                        </div>
                                      </div>
                                      {extendOk && <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>✓ Trial updated successfully</p>}
                                      <button onClick={() => doExtendTrial(org.id)} disabled={extendLoading || (!extendDays && !extendDate)} style={btn("#0891b2")}>
                                        {extendLoading ? "Saving…" : "Apply Extension"}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Impersonate */}
                                <div style={card}>
                                  <SectionLabel>Impersonate Account</SectionLabel>
                                  <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 12, lineHeight: 1.5 }}>Log in as this church to troubleshoot issues. This action is logged in the audit trail.</p>
                                  {impersonateId !== org.id ? (
                                    <button onClick={() => { setImpersonateId(org.id); setImpersonateReason(""); setImpersonateError(""); }} style={btn("#7c3aed")}>
                                      ⇢ Impersonate {org.name}
                                    </button>
                                  ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      <div>
                                        <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Reason (required) *</label>
                                        <input value={impersonateReason} onChange={e => { setImpersonateReason(e.target.value); setImpersonateError(""); }} placeholder="e.g. Investigating reported login issue" style={inp} />
                                      </div>
                                      {impersonateError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{impersonateError}</p>}
                                      <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => doImpersonate(org.id, org)} disabled={impersonateLoading} style={btn("#7c3aed")}>{impersonateLoading ? "Logging in…" : "Enter as This Church"}</button>
                                        <button onClick={() => setImpersonateId(null)} style={btn("#1e293b", { border: "1px solid #334155", color: "#94a3b8" })}>Cancel</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: password reset + retention + merge */}
                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                                {/* Password reset */}
                                <div style={card}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: resetPwId === org.id ? 12 : 0 }}>
                                    <SectionLabel>Force Password Reset</SectionLabel>
                                    <button onClick={() => { setResetPwId(resetPwId === org.id ? null : org.id); setResetPwVal(""); setResetPwConfirm(""); setResetPwError(""); setResetPwOk(false); }}
                                      style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8", fontSize: 11 }}>
                                      {resetPwId === org.id ? "Cancel" : "Set New Password"}
                                    </button>
                                  </div>
                                  {resetPwId === org.id && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      <input type="password" value={resetPwVal} onChange={e => { setResetPwVal(e.target.value); setResetPwError(""); }} placeholder="New password (min 6 chars)" style={inp} />
                                      <input type="password" value={resetPwConfirm} onChange={e => { setResetPwConfirm(e.target.value); setResetPwError(""); }} placeholder="Confirm new password" style={inp} />
                                      {resetPwError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{resetPwError}</p>}
                                      {resetPwOk && <p style={{ color: "#4ade80", fontSize: 12, margin: 0 }}>✓ Password updated</p>}
                                      <button onClick={() => doResetPw(org.id)} disabled={resetPwLoading} style={btn("#0891b2")}>{resetPwLoading ? "Updating…" : "Set New Password"}</button>
                                    </div>
                                  )}
                                </div>

                                {/* Data retention */}
                                <div style={card}>
                                  <SectionLabel>Data Retention Policy</SectionLabel>
                                  <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 12, lineHeight: 1.5 }}>Auto-delete altar records older than N months. Leave blank for no auto-delete.</p>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <input type="number" min="1" max="120" value={retentionInput[org.id] ?? ""} onChange={e => setRetentionInput(prev => ({ ...prev, [org.id]: e.target.value }))} placeholder="e.g. 24 months" style={{ ...inp, flex: 1 }} />
                                    <button onClick={() => saveRetention(org.id)} disabled={retentionSaving === org.id} style={btn("#0891b2")}>{retentionSaving === org.id ? "…" : "Save"}</button>
                                  </div>
                                  {retentionOk === org.id && <p style={{ color: "#4ade80", fontSize: 12, margin: "8px 0 0" }}>✓ Retention policy updated</p>}
                                </div>

                                {/* Merge */}
                                <div style={card}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mergeId === org.id ? 12 : 0 }}>
                                    <SectionLabel>Merge Duplicate Account</SectionLabel>
                                    <button onClick={() => { setMergeId(mergeId === org.id ? null : org.id); setMergeTargetId(""); setMergeReason(""); setMergeError(""); }} style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8", fontSize: 11 }}>
                                      {mergeId === org.id ? "Cancel" : "Merge Into…"}
                                    </button>
                                  </div>
                                  {mergeId === org.id && (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      <p style={{ margin: 0, color: "#64748b", fontSize: 12 }}>This org <strong style={{ color: "#94a3b8" }}>({org.name})</strong> will be deleted. Its data moves to the target org.</p>
                                      <div>
                                        <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Target Org ID *</label>
                                        <input type="number" value={mergeTargetId} onChange={e => { setMergeTargetId(e.target.value); setMergeError(""); }} placeholder="Enter target org ID" style={inp} />
                                      </div>
                                      <div>
                                        <label style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 4 }}>Reason *</label>
                                        <input value={mergeReason} onChange={e => setMergeReason(e.target.value)} placeholder="e.g. Church created duplicate account" style={inp} />
                                      </div>
                                      {mergeError && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{mergeError}</p>}
                                      <button onClick={() => doMerge(org.id)} disabled={mergeLoading} style={btn("#b45309")}>{mergeLoading ? "Merging…" : `Merge ${org.name} → Org #${mergeTargetId || "?"}`}</button>
                                    </div>
                                  )}
                                  {mergeOk && <p style={{ color: "#4ade80", fontSize: 12, margin: "8px 0 0" }}>✓ {mergeOk}</p>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── Messages tab ── */}
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
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════ COMMUNICATIONS ══════════════════════════════ */}
        {pageView === "comms" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Broadcast Email */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b" }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Broadcast Email</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Send an email to all or a filtered subset of churches</p>
              </div>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Audience</label>
                    <select value={broadcastFilter} onChange={e => setBroadcastFilter(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      <option value="all">All Churches ({orgs.length})</option>
                      <option value="trial">Trial Accounts ({orgs.filter(o => o.billingStatus === "trial").length})</option>
                      <option value="expiring">Trial Expiring in 7 Days ({orgs.filter(o => { const d = trialDaysLeft(o.trialEndsAt); return d !== null && d > 0 && d <= 7; }).length})</option>
                      <option value="active">Active Paying ({orgs.filter(o => o.billingStatus === "active").length})</option>
                      <option value="past_due">Past Due ({orgs.filter(o => o.billingStatus === "past_due").length})</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Subject</label>
                    <input value={broadcastSubject} onChange={e => { setBroadcastSubject(e.target.value); setBroadcastError(""); }} placeholder="e.g. New feature: Service Notes" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Message Body</label>
                  <textarea value={broadcastBody} onChange={e => { setBroadcastBody(e.target.value); setBroadcastError(""); }} placeholder="Write your message here… Use {church_name} to personalize (auto-filled per recipient)." rows={6} style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                </div>
                {broadcastError && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>{broadcastError}</p>}
                {broadcastResult && (
                  <div style={{ background: "#052e16", border: "1px solid #16a34a44", borderRadius: 8, padding: "10px 14px" }}>
                    <p style={{ color: "#4ade80", fontSize: 13, margin: 0 }}>✓ Sent to <strong>{broadcastResult.sent}</strong> of {broadcastResult.total} churches.</p>
                  </div>
                )}
                <div>
                  <button onClick={doBroadcast} disabled={broadcastLoading || !broadcastSubject.trim() || !broadcastBody.trim()} style={btn()}>
                    {broadcastLoading ? "Sending…" : `Send Email Broadcast`}
                  </button>
                </div>
              </div>
            </div>

            {/* In-App Banner */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b" }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>In-App Announcement Banner</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Show a pinned banner at the top of every church dashboard</p>
              </div>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Current banner preview */}
                {banner && (
                  <div>
                    <p style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Currently Live</p>
                    <div style={{ background: (BANNER_COLORS[banner.type] ?? "#1d4ed8") + "18", border: `1px solid ${(BANNER_COLORS[banner.type] ?? "#1d4ed8")}44`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: BANNER_COLORS[banner.type] ?? "#1d4ed8", flexShrink: 0 }} />
                        <p style={{ margin: 0, color: "#e2e8f0", fontSize: 13 }}>{banner.message}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <Badge label={banner.type} color={BANNER_COLORS[banner.type] ?? "#1d4ed8"} />
                        {banner.expiresAt && <span style={{ color: "#475569", fontSize: 11 }}>Expires {new Date(banner.expiresAt).toLocaleDateString()}</span>}
                        <button onClick={clearBanner} disabled={bannerLoading} style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#ef4444", fontSize: 11, padding: "3px 8px", cursor: "pointer" }}>Clear</button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 180px", gap: 16 }}>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Banner Message</label>
                    <input value={bannerForm.message} onChange={e => setBannerForm(p => ({ ...p, message: e.target.value }))} placeholder="e.g. Scheduled maintenance Sunday 2–4 AM EST" style={inp} />
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Type</label>
                    <select value={bannerForm.type} onChange={e => setBannerForm(p => ({ ...p, type: e.target.value }))} style={{ ...inp, cursor: "pointer" }}>
                      <option value="info">Info (blue)</option>
                      <option value="warning">Warning (amber)</option>
                      <option value="maintenance">Maintenance (purple)</option>
                      <option value="success">Success (green)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Expires (optional)</label>
                    <input type="date" value={bannerForm.expiresAt} onChange={e => setBannerForm(p => ({ ...p, expiresAt: e.target.value }))} style={{ ...inp, colorScheme: "dark" }} />
                  </div>
                </div>

                {bannerOk && <p style={{ color: "#4ade80", fontSize: 13, margin: 0 }}>✓ Banner published successfully</p>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={saveBanner} disabled={bannerLoading || !bannerForm.message.trim()} style={btn()}>
                    {bannerLoading ? "Publishing…" : "Publish Banner"}
                  </button>
                  {banner && <button onClick={clearBanner} disabled={bannerLoading} style={btn("#1e293b", { border: "1px solid #334155", color: "#94a3b8" })}>Clear Banner</button>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ COUPONS ═════════════════════════════════════ */}
        {pageView === "coupons" && (
          <div>
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
                        <button onClick={() => setNewCoupon(p => ({ ...p, code: genCode() }))} title="Generate" style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 12, padding: "0 10px", cursor: "pointer", flexShrink: 0 }}>⚡</button>
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
                      <input type="number" min="0" step={newCoupon.discountType === "trial_extension" ? "1" : "0.01"} value={newCoupon.discountValue} onChange={e => setNewCoupon(p => ({ ...p, discountValue: e.target.value }))} style={inp} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Description</label>
                      <input value={newCoupon.description} onChange={e => setNewCoupon(p => ({ ...p, description: e.target.value }))} placeholder="First month free" style={inp} />
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
                  <button onClick={createCoupon} disabled={createLoading} style={btn()}>{createLoading ? "Creating…" : "Create Coupon"}</button>
                </div>
              )}
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
              {couponsLoading ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>Loading…</div>
              ) : coupons.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>No coupons yet.</div>
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
                        <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: c.active ? "#93c5fd" : "#475569", letterSpacing: "0.05em" }}>{c.code}</span>
                        <div style={{ color: "#64748b", fontSize: 12 }}>{c.description || <span style={{ color: "#334155" }}>—</span>}</div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: c.discountType === "percent" ? "#a78bfa" : c.discountType === "trial_extension" ? "#fbbf24" : "#34d399" }}>
                          {c.discountType === "percent" ? `${parseFloat(c.discountValue).toFixed(0)}% off` : c.discountType === "trial_extension" ? `+${Math.round(parseFloat(c.discountValue))}d trial` : `$${parseFloat(c.discountValue).toFixed(2)} off`}
                        </div>
                        <div>{c.plan ? <Badge label={c.plan} color={PLAN_COLORS[c.plan] ?? "#475569"} /> : <span style={{ color: "#334155", fontSize: 12 }}>Any</span>}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.usesCount}{c.maxUses ? `/${c.maxUses}` : ""} <span style={{ color: "#475569" }}>used</span></div>
                        <div style={{ fontSize: 12, color: c.expiresAt && new Date(c.expiresAt) < new Date() ? "#ef4444" : "#64748b" }}>
                          {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "Never"}
                        </div>
                        <div><Badge label={c.active ? "active" : "inactive"} color={c.active ? "#16a34a" : "#475569"} /></div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => toggleCouponActive(c)} style={{ background: c.active ? "#1e293b" : "#14532d44", border: `1px solid ${c.active ? "#334155" : "#16a34a44"}`, borderRadius: 6, color: c.active ? "#64748b" : "#4ade80", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>{c.active ? "Pause" : "Activate"}</button>
                          <button onClick={() => setConfirmDeleteCoupon(c.id)} style={{ background: "none", border: "1px solid #334155", borderRadius: 6, color: "#ef4444", fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>✕</button>
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

        {/* ═══════════════════════ SECURITY & PRIVACY ══════════════════════════ */}
        {pageView === "security" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Privacy Controls */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b" }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Privacy & Data Controls</h2>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Platform-wide privacy settings and HIPAA-adjacent data practices</p>
              </div>
              <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

                {/* Sensitive Data Access Toggle */}
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px", color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>Sensitive Data Access</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                      By default, superadmins <strong style={{ color: "#94a3b8" }}>cannot view individual altar records or prayer notes</strong>. Enabling this allows data review for support purposes only. Every access is logged to the audit trail and treated as a sensitive event.
                    </p>
                    <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 12 }}>
                      Prayer requests often contain health disclosures. Treat all data with HIPAA-adjacent confidentiality standards even if not legally required.
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setSensitiveAccess(v => !v)}
                      style={{
                        width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
                        background: sensitiveAccess ? "#dc2626" : "#1e293b",
                        position: "relative", transition: "background 0.2s", flexShrink: 0,
                      }}
                    >
                      <div style={{
                        position: "absolute", top: 3, left: sensitiveAccess ? 27 : 3,
                        width: 22, height: 22, borderRadius: "50%", background: "#fff",
                        transition: "left 0.2s",
                      }} />
                    </button>
                    <span style={{ fontSize: 11, color: sensitiveAccess ? "#ef4444" : "#475569", fontWeight: 600 }}>
                      {sensitiveAccess ? "ENABLED" : "OFF"}
                    </span>
                  </div>
                </div>

                {sensitiveAccess && (
                  <div style={{ background: "#1c0a0a", border: "1px solid #7f1d1d44", borderRadius: 10, padding: 16 }}>
                    <p style={{ margin: "0 0 10px", color: "#fca5a5", fontSize: 13, fontWeight: 600 }}>⚠ Enabling sensitive access requires a documented reason</p>
                    <input value={sensitiveReason} onChange={e => setSensitiveReason(e.target.value)} placeholder="Why is sensitive data access being enabled?" style={{ ...inp, borderColor: "#7f1d1d" }} />
                  </div>
                )}

                {/* Global Retention Default */}
                <div>
                  <p style={{ margin: "0 0 4px", color: "#f1f5f9", fontSize: 14, fontWeight: 600 }}>Default Data Retention Policy</p>
                  <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
                    Set a platform default for how long altar report records are kept before automatic deletion. Individual churches can override this. Leave blank for no platform-level default.
                  </p>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <input type="number" min="1" max="120" value={globalRetention} onChange={e => setGlobalRetention(e.target.value)} placeholder="e.g. 24" style={{ ...inp, width: 120 }} />
                    <span style={{ color: "#64748b", fontSize: 13 }}>months</span>
                  </div>
                </div>

                {securityOk && <p style={{ color: "#4ade80", fontSize: 13, margin: 0 }}>✓ Security settings saved</p>}
                {sensitiveAccess && !sensitiveReason.trim() && (
                  <p style={{ color: "#f59e0b", fontSize: 12, margin: 0 }}>A reason is required to enable sensitive access.</p>
                )}
                <div>
                  <button onClick={saveSecurity} disabled={securitySaving || (sensitiveAccess && !sensitiveReason.trim())} style={btn()}>
                    {securitySaving ? "Saving…" : "Save Security Settings"}
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Audit Trail</h2>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>All privileged superadmin actions — last 200 entries</p>
                </div>
                <button onClick={() => { setAuditLoading(true); loadSecurity().finally(() => setAuditLoading(false)); }} style={{ ...btn("#1e293b"), border: "1px solid #334155", color: "#94a3b8" }}>↻ Refresh</button>
              </div>
              {auditLoading ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>Loading…</div>
              ) : auditLog.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>No audit entries yet.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "160px 120px 100px 1fr 1fr", padding: "10px 24px", borderBottom: "1px solid #1e293b" }}>
                    {["Timestamp", "Action", "Org", "Details", "Reason"].map(h => (
                      <div key={h} style={{ color: "#475569", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</div>
                    ))}
                  </div>
                  {auditLog.map(entry => {
                    const actionColor: Record<string, string> = { impersonate: "#7c3aed", delete_org: "#dc2626", merge_orgs: "#b45309", security_config: "#0891b2", broadcast_email: "#1d4ed8", extend_trial: "#16a34a" };
                    return (
                      <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "160px 120px 100px 1fr 1fr", padding: "12px 24px", borderBottom: "1px solid #0f172a", alignItems: "start" }}>
                        <div style={{ color: "#64748b", fontSize: 11 }}>{new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                        <div>
                          <span style={{ background: (actionColor[entry.action] ?? "#475569") + "22", border: `1px solid ${(actionColor[entry.action] ?? "#475569")}44`, color: actionColor[entry.action] ?? "#64748b", borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em" }}>
                            {entry.action.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div style={{ color: "#475569", fontSize: 12 }}>{entry.orgId ? `#${entry.orgId}` : "—"}</div>
                        <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.4 }}>{entry.details ?? "—"}</div>
                        <div style={{ color: "#475569", fontSize: 12, fontStyle: entry.reason ? "normal" : "italic" }}>{entry.reason ?? "—"}</div>
                      </div>
                    );
                  })}
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

import { useMemo, useState } from "react";
import { useListCampusPasswords, useSetCampusPassword } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getValidCampusSession, getValidAdminSession, clearAllSessions } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";
const ROLES = [
  { id: "lead", label: "Lead" },
  { id: "deputy_lead", label: "Deputy Lead" },
];


function CampusPasswordsPanel({ campusFilter }: { campusFilter?: string }) {
  const queryClient = useQueryClient();
  const CAMPUSES = getOrgCampuses();
  const { data } = useListCampusPasswords({ query: { queryKey: ["campus-passwords"] } });
  const setPass = useSetCampusPassword();

  const [editing, setEditing] = useState<{ campus: string; role: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const passwords = data?.passwords ?? [];
  const visibleCampuses = campusFilter ? [campusFilter] : CAMPUSES;

  const hasPassword = (campus: string, role: string) =>
    passwords.find(p => p.campus === campus && p.role === role)?.hasPassword ?? false;

  const openEdit = (campus: string, role: string) => {
    const isEditing = editing?.campus === campus && editing?.role === role;
    setEditing(isEditing ? null : { campus, role });
    setNewPassword("");
    setShowPw(false);
    setMsg(null);
  };

  const handleSave = () => {
    if (!editing || !newPassword.trim()) return;
    setPass.mutate(
      { data: { campus: editing.campus, role: editing.role, password: newPassword } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["campus-passwords"] });
          setMsg({ type: "ok", text: `Password set for ${editing.campus} / ${ROLES.find(r => r.id === editing.role)?.label}` });
          setEditing(null); setNewPassword(""); setShowPw(false);
          setTimeout(() => setMsg(null), 3000);
        },
        onError: () => setMsg({ type: "err", text: "Failed to save password" }),
      }
    );
  };

  return (
    <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
      <p className="text-xs uppercase tracking-widest mb-1 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Campus Login Passwords</p>
      <p style={{ color: "hsl(38 22% 38%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.08em", marginBottom: 14 }}>Set a password for each campus role. Use letters, numbers, and symbols.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleCampuses.map(campus => (
          <div key={campus}>
            <div style={{ display: "flex", alignItems: "center", background: "hsl(35 18% 11%)", border: "1px solid hsl(38 15% 18%)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "hsl(38 50% 58%)", flex: 1, fontWeight: "bold" }}>{campus}</div>
              {ROLES.map(role => {
                const isSet = hasPassword(campus, role.id);
                const isEditing = editing?.campus === campus && editing?.role === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => openEdit(campus, role.id)}
                    style={{
                      padding: "8px 12px", fontFamily: "Georgia, serif", fontSize: 10,
                      letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                      borderLeft: "1px solid hsl(38 15% 18%)", transition: "all 0.15s",
                      background: isEditing ? "hsl(38 40% 20%)" : "none",
                      color: isEditing ? "hsl(38 70% 72%)" : isSet ? "hsl(130 55% 52%)" : "hsl(38 22% 38%)",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <span style={{ fontSize: 8 }}>{isSet ? "●" : "○"}</span>
                    {role.label}
                  </button>
                );
              })}
            </div>

            {editing?.campus === campus && (
              <div style={{ border: "1px solid hsl(38 25% 24%)", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "14px", background: "hsl(35 18% 12%)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    New Password — {campus} / {ROLES.find(r => r.id === editing.role)?.label}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      style={{
                        width: "100%", padding: "9px 40px 9px 12px", borderRadius: 5,
                        border: "1px solid hsl(38 20% 22%)", background: "hsl(35 18% 10%)",
                        color: "hsl(38 55% 72%)", fontFamily: "Georgia, serif", fontSize: 13,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "hsl(38 25% 42%)", fontSize: 10, fontFamily: "Georgia, serif" }}
                    >
                      {showPw ? "hide" : "show"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={handleSave} disabled={!newPassword.trim() || setPass.isPending} style={{ flex: 1, background: "hsl(38 50% 28%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 0", borderRadius: 4, cursor: "pointer", opacity: !newPassword.trim() ? 0.4 : 1, whiteSpace: "nowrap" }}>
                    {setPass.isPending ? "Saving..." : "Set Password"}
                  </button>
                  <button onClick={() => { setEditing(null); setNewPassword(""); setShowPw(false); }} style={{ background: "none", color: "hsl(38 25% 40%)", border: "1px solid hsl(38 15% 22%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 12px", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && (
        <p style={{ color: msg.type === "ok" ? "hsl(130 55% 55%)" : "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginTop: 12, letterSpacing: "0.05em" }}>{msg.text}</p>
      )}
    </div>
  );
}


export default function AdminPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const [showPasswords, setShowPasswords] = useState(false);

  const session      = useMemo(() => getValidCampusSession(), []);
  const isMasterAdmin = useMemo(() => getValidAdminSession(), []);

  const isCampusUser = session !== null;
  const isLead       = session?.role === "lead";
  const campusName   = session?.campus ?? null;

  function handleBack() {
    if (isCampusUser) {
      navigate("/home");
    } else {
      clearAllSessions();
      navigate("/");
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-start py-12 px-4 overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{ background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)" }}
      />

      <div className="relative z-10 w-full max-w-xl">
        <button
          onClick={handleBack}
          className="mb-8 text-xs uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
        >
          {isCampusUser ? "← Home" : "← Sign Out"}
        </button>

        <h1
          className="text-2xl mb-1 tracking-widest uppercase text-center"
          style={{ color: "hsl(38 60% 65%)", fontFamily: "Georgia, serif" }}
        >
          {isLead ? campusName : "Admin Panel"}
        </h1>
        <p
          className="text-xs text-center mb-6 tracking-widest uppercase opacity-60"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
        >
          {isLead ? "Campus Lead" : "Manage settings & tools"}
        </p>

        {/* Tools section */}
        <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
          <p className="text-xs uppercase tracking-widest mb-3 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Tools</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/admin/altar-report")}
              className="w-full py-3 px-5 text-sm uppercase tracking-widest rounded text-left flex items-center justify-between transition-all duration-200 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(35 35% 18%), hsl(35 30% 15%))", color: "hsl(38 65% 68%)", border: "1px solid hsl(38 30% 28%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer", boxShadow: "0 2px 10px hsl(38 40% 12% / 0.4)" }}
            >
              <span>Altar Report</span>
              <span style={{ opacity: 0.5 }}>→</span>
            </button>
            <button
              onClick={() => navigate("/admin/roster")}
              className="w-full py-3 px-5 text-sm uppercase tracking-widest rounded text-left flex items-center justify-between transition-all duration-200 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(35 35% 18%), hsl(35 30% 15%))", color: "hsl(38 65% 68%)", border: "1px solid hsl(38 30% 28%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer", boxShadow: "0 2px 10px hsl(38 40% 12% / 0.4)" }}
            >
              <span>Roster Manager</span>
              <span style={{ opacity: 0.5 }}>→</span>
            </button>

            {/* Password Manager — master admin only */}
            {!isLead && (
              <>
                <button
                  onClick={() => setShowPasswords(v => !v)}
                  className="w-full py-3 px-5 text-sm uppercase tracking-widest rounded text-left flex items-center justify-between transition-all duration-200 hover:opacity-90"
                  style={{ background: showPasswords ? "hsl(35 38% 20%)" : "linear-gradient(135deg, hsl(35 35% 18%), hsl(35 30% 15%))", color: "hsl(38 65% 68%)", border: `1px solid ${showPasswords ? "hsl(38 35% 32%)" : "hsl(38 30% 28%)"}`, fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer", boxShadow: "0 2px 10px hsl(38 40% 12% / 0.4)" }}
                >
                  <span>Password Manager</span>
                  <span style={{ opacity: 0.5, transition: "transform 0.2s", display: "inline-block", transform: showPasswords ? "rotate(90deg)" : "none" }}>›</span>
                </button>
                {showPasswords && (
                  <div style={{ marginTop: 2, borderRadius: 6, overflow: "hidden" }}>
                    <CampusPasswordsPanel />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Extensions toolbox */}
        <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
          <p className="text-xs uppercase tracking-widest mb-3 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Extensions</p>
          <div className="flex flex-col gap-3">

            {/* Dbanc */}
            <div style={{ borderRadius: 8, border: "1px solid hsl(215 35% 24%)", overflow: "hidden" }}>
              <button
                onClick={() => navigate("/admin/dbanc")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "linear-gradient(135deg, hsl(215 48% 18%), hsl(215 42% 13%))", color: "hsl(215 75% 74%)", border: "none", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
              >
                <span>Dbanc</span>
                <span style={{ opacity: 0.45 }}>→</span>
              </button>
              <div style={{ display: "flex", borderTop: "1px solid hsl(215 30% 18%)" }}>
                {!isCampusUser && (
                  <button
                    onClick={() => navigate("/admin/dbanc/fields")}
                    style={{ flex: 1, padding: "7px 10px", background: "hsl(215 35% 11%)", border: "none", borderRight: "1px solid hsl(215 30% 18%)", color: "hsl(215 50% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(215 40% 15%)"; e.currentTarget.style.color = "hsl(215 65% 68%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(215 35% 11%)"; e.currentTarget.style.color = "hsl(215 50% 55%)"; }}
                  >
                    Custom Fields
                  </button>
                )}
                {!isCampusUser && (
                  <button
                    onClick={() => navigate("/admin/activity-log/dbanc")}
                    style={{ flex: 1, padding: "7px 10px", background: "hsl(215 35% 11%)", border: "none", color: "hsl(215 50% 55%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(215 40% 15%)"; e.currentTarget.style.color = "hsl(215 65% 68%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(215 35% 11%)"; e.currentTarget.style.color = "hsl(215 50% 55%)"; }}
                  >
                    Log
                  </button>
                )}
              </div>
            </div>

            {/* PXP */}
            <div style={{ borderRadius: 8, border: "1px solid hsl(270 30% 20%)", overflow: "hidden" }}>
              <button
                onClick={() => navigate("/admin/pxp")}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "linear-gradient(135deg, hsl(270 55% 22%), hsl(270 50% 14%))", color: "hsl(270 65% 78%)", border: "none", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
              >
                <span>PXP</span>
                <span style={{ opacity: 0.45 }}>→</span>
              </button>
              <div style={{ display: "flex", borderTop: "1px solid hsl(270 20% 14%)" }}>
                {/* Script editor — master admin only */}
                {!isCampusUser && (
                  <button
                    onClick={() => navigate("/admin/pxp/script")}
                    style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", borderRight: "1px solid hsl(270 20% 14%)", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                  >
                    Script
                  </button>
                )}
                <button
                  onClick={() => navigate("/admin/pxp/callers")}
                  style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", borderRight: "1px solid hsl(270 20% 14%)", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                  onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                >
                  Follow-Up Team
                </button>
                <button
                  onClick={() => navigate("/admin/pxp/logs")}
                  style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", borderRight: !isCampusUser ? "1px solid hsl(270 20% 14%)" : "none", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                  onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                >
                  History
                </button>
                {/* Activity Log — master admin only */}
                {!isCampusUser && (
                  <button
                    onClick={() => navigate("/admin/activity-log/pxp")}
                    style={{ flex: 1, padding: "7px 10px", background: "hsl(270 10% 5%)", border: "none", color: "hsl(270 45% 58%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer" }}
                    onMouseOver={e => { e.currentTarget.style.background = "hsl(270 40% 12%)"; e.currentTarget.style.color = "hsl(270 65% 72%)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "hsl(270 10% 5%)"; e.currentTarget.style.color = "hsl(270 45% 58%)"; }}
                  >
                    Log
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

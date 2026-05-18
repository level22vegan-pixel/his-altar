import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getValidOrgSession, clearOrgSession } from "@/lib/session";
import { isSetupDone, markSetupDone } from "@/pages/OrgSetupPage";

const TOOLS = [
  { id: "dbanc", icon: "📒", title: "Dbanc", desc: "Prayer contact database", href: "/admin/dbanc" },
  { id: "pxp", icon: "📞", title: "PXP", desc: "Prayer follow-up call system", href: "/admin/pxp" },
  { id: "altar", icon: "📖", title: "Altar Reports", desc: "Log and export altar responses", href: "/admin/altar-report" },
  { id: "roster", icon: "📋", title: "Roster Manager", desc: "Add and manage ministry workers", href: "/admin/roster" },
];

const BANNER_BG: Record<string, string> = {
  info: "rgba(29,78,216,0.12)",
  warning: "rgba(217,119,6,0.12)",
  maintenance: "rgba(124,58,237,0.12)",
  success: "rgba(22,163,74,0.12)",
};
const BANNER_BORDER: Record<string, string> = {
  info: "rgba(59,130,246,0.35)",
  warning: "rgba(245,158,11,0.35)",
  maintenance: "rgba(139,92,246,0.35)",
  success: "rgba(34,197,94,0.35)",
};
const BANNER_DOT: Record<string, string> = {
  info: "#3b82f6",
  warning: "#f59e0b",
  maintenance: "#8b5cf6",
  success: "#22c55e",
};

interface Banner { message: string; type: string; expiresAt: string | null; }

export default function OrgDashboardPage() {
  const [, navigate] = useLocation();
  const session = getValidOrgSession();
  const setupDone = isSetupDone();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/config/banner")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.banner) {
          const b = d.banner as Banner;
          if (!b.expiresAt || new Date(b.expiresAt) > new Date()) {
            setBanner(b);
          }
        }
      })
      .catch(() => {});
  }, []);

  function handleLogout() {
    clearOrgSession();
    navigate("/");
  }

  const showBanner = banner && !bannerDismissed;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{session?.orgName ?? "Your Church"}</h1>
          <p className="text-neutral-500 text-xs mt-0.5">Church Admin Dashboard</p>
        </div>
        <button onClick={handleLogout} className="text-neutral-400 hover:text-white text-sm transition">
          Sign Out
        </button>
      </header>

      {/* Platform announcement banner */}
      {showBanner && (
        <div style={{
          background: BANNER_BG[banner.type] ?? BANNER_BG.info,
          borderBottom: `1px solid ${BANNER_BORDER[banner.type] ?? BANNER_BORDER.info}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: BANNER_DOT[banner.type] ?? BANNER_DOT.info, flexShrink: 0 }} />
            <p style={{ margin: 0, color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>{banner.message}</p>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px", flexShrink: 0 }}
            title="Dismiss"
          >×</button>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Setup banner */}
        {!setupDone && (
          <div className="mb-8 flex items-center justify-between gap-4 bg-purple-950/60 border border-purple-700/50 rounded-xl px-5 py-4">
            <div>
              <p className="text-purple-200 text-sm font-semibold">Finish setting up your account</p>
              <p className="text-purple-400/70 text-xs mt-0.5">Add altar members, follow-up callers, and staff access to get started.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => { markSetupDone(); }} className="text-purple-500 hover:text-purple-300 text-xs transition">Dismiss</button>
              <button onClick={() => navigate("/org/setup")} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg px-4 py-2 transition">Continue Setup →</button>
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-6 text-neutral-200">Platform Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <button key={tool.id} onClick={() => navigate(tool.href)} className="flex items-start gap-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-purple-700 rounded-xl p-5 text-left transition group">
              <span className="text-3xl mt-0.5">{tool.icon}</span>
              <div>
                <p className="font-semibold text-white group-hover:text-purple-300 transition">{tool.title}</p>
                <p className="text-neutral-500 text-sm mt-0.5">{tool.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <button onClick={() => navigate("/org/billing")} className="w-full flex items-center justify-between bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-purple-700/50 rounded-xl px-5 py-4 text-left transition group">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <p className="font-semibold text-white group-hover:text-purple-300 transition text-sm">Billing &amp; Subscription</p>
                <p className="text-neutral-500 text-xs mt-0.5">Manage your plan and payment</p>
              </div>
            </div>
            <span className="text-neutral-600 group-hover:text-purple-400 text-sm transition">→</span>
          </button>
        </div>

        <div className="mt-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl text-center">
          <p className="text-neutral-500 text-sm">
            Need help?{" "}
            <a href="mailto:Support@HisAltar.com" className="text-purple-400 hover:text-purple-300 transition">Contact support</a>
          </p>
        </div>
      </main>
    </div>
  );
}

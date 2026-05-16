import { useLocation } from "wouter";
import { getValidOrgSession, clearOrgSession } from "@/lib/session";
import { isSetupDone, markSetupDone } from "@/pages/OrgSetupPage";

const TOOLS = [
  {
    id: "dbanc",
    icon: "📒",
    title: "Dbanc",
    desc: "Prayer contact database",
    href: "/admin/dbanc",
  },
  {
    id: "pxp",
    icon: "📞",
    title: "PXP",
    desc: "Prayer follow-up call system",
    href: "/admin/pxp",
  },
  {
    id: "altar",
    icon: "📖",
    title: "Altar Reports",
    desc: "Log and export altar responses",
    href: "/admin/altar-report",
  },
  {
    id: "roster",
    icon: "📋",
    title: "Roster Manager",
    desc: "Add and manage ministry workers",
    href: "/admin/roster",
  },
];

export default function OrgDashboardPage() {
  const [, navigate] = useLocation();
  const session = getValidOrgSession();
  const setupDone = isSetupDone();

  function handleLogout() {
    clearOrgSession();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{session?.orgName ?? "Your Church"}</h1>
          <p className="text-neutral-500 text-xs mt-0.5">Church Admin Dashboard</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-neutral-400 hover:text-white text-sm transition"
        >
          Sign Out
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Setup banner */}
        {!setupDone && (
          <div className="mb-8 flex items-center justify-between gap-4 bg-purple-950/60 border border-purple-700/50 rounded-xl px-5 py-4">
            <div>
              <p className="text-purple-200 text-sm font-semibold">Finish setting up your account</p>
              <p className="text-purple-400/70 text-xs mt-0.5">Add altar members, follow-up callers, and staff access to get started.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => { markSetupDone(); }}
                className="text-purple-500 hover:text-purple-300 text-xs transition"
              >
                Dismiss
              </button>
              <button
                onClick={() => navigate("/org/setup")}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg px-4 py-2 transition"
              >
                Continue Setup →
              </button>
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold mb-6 text-neutral-200">Platform Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => navigate(tool.href)}
              className="flex items-start gap-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-purple-700 rounded-xl p-5 text-left transition group"
            >
              <span className="text-3xl mt-0.5">{tool.icon}</span>
              <div>
                <p className="font-semibold text-white group-hover:text-purple-300 transition">
                  {tool.title}
                </p>
                <p className="text-neutral-500 text-sm mt-0.5">{tool.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-10 p-4 bg-neutral-900 border border-neutral-800 rounded-xl text-center">
          <p className="text-neutral-500 text-sm">
            Need help?{" "}
            <a
              href="mailto:support@theway.org"
              className="text-purple-400 hover:text-purple-300 transition"
            >
              Contact support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

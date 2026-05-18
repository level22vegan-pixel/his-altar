import { useLocation } from "wouter";

export default function PrivacyPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-12 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <button
          onClick={() => navigate(-1 as never)}
          className="text-neutral-500 hover:text-neutral-300 text-xs uppercase tracking-widest mb-8 flex items-center gap-1 transition mx-auto"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-semibold text-white tracking-wide mb-2">Privacy Policy</h1>
        <p className="text-neutral-500 text-xs uppercase tracking-wider mb-8">His Altar Ministry Management Platform</p>

        <div className="h-px bg-neutral-800 mb-8" />

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-6 text-left">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">Coming Soon</p>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Our Privacy Policy is being finalized and will be published here shortly. If you have questions about how we handle your data in the meantime, please contact us at{" "}
            <a href="mailto:support@hisaltar.com" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
              support@hisaltar.com
            </a>.
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={() => navigate("/org/signup")}
            className="text-purple-400 hover:text-purple-300 text-xs uppercase tracking-widest transition"
          >
            ← Back to Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";

export default function OrgResetPasswordPage() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orgs/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Reset failed. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Invalid reset link.</p>
          <a href="/org/login" className="text-purple-400 hover:text-purple-300 text-sm transition">Back to Sign In</a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-900/40 border border-green-700 mb-6">
            <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Password Updated</h1>
          <p className="text-neutral-400 text-sm mb-8">Your portal password has been changed.</p>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/org/login")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg py-3 transition"
            >
              Sign In to Dashboard
            </button>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-left">
              <p className="text-neutral-300 text-sm font-medium mb-1">Also reset your staff entry code?</p>
              <p className="text-neutral-500 text-xs mb-3 leading-relaxed">
                If you've also forgotten the passcode your staff uses to access the portal, you can reset it from Admin Settings after signing in.
              </p>
              <button
                onClick={() => navigate("/org/login?next=/admin/access-codes")}
                className="text-purple-400 hover:text-purple-300 text-xs font-medium transition"
              >
                Sign in and reset entry code →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Set New Password</h1>
          <p className="text-neutral-400 text-sm mt-1">Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition"
          >
            {loading ? "Saving…" : "Set Password"}
          </button>
        </form>

        <p className="mt-6 text-center">
          <a href="/org/login" className="text-neutral-500 hover:text-neutral-400 text-xs transition">
            Back to Sign In
          </a>
        </p>
      </div>
    </div>
  );
}

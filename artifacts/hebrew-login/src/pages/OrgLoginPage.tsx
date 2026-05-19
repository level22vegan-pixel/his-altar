import { useState } from "react";
import { useLocation } from "wouter";
import { setOrgSession } from "@/lib/session";

export default function OrgLoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orgs/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed. Please check your credentials.");
        return;
      }
      setOrgSession(data.orgId, data.orgName, data.token, data.campuses ?? [], data.serviceTimes ?? {});
      navigate("/team");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await fetch("/api/orgs/forgot-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (res.ok) {
        setForgotMsg({ ok: true, text: "If that email is on file, your passcode is on its way. Check your inbox." });
      } else {
        setForgotMsg({ ok: false, text: "Something went wrong. Please try again." });
      }
    } catch {
      setForgotMsg({ ok: false, text: "Connection error. Please try again." });
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {!showForgot ? (
            <>
              <h1 className="text-2xl font-semibold text-white">Church Portal</h1>
              <p className="text-neutral-400 text-sm mt-1">Sign in to your organization account</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-white">Forgot Passcode?</h1>
              <p className="text-neutral-400 text-sm mt-1">Enter your email and we'll send your admin passcode</p>
            </>
          )}
        </div>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-neutral-300 text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pastor@yourchurch.org"
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-neutral-300 text-sm font-medium mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  autoComplete="current-password"
                />
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotMsg(null); }}
                  className="text-neutral-500 hover:text-neutral-400 text-xs transition"
                >
                  Forgot your passcode?
                </button>
              </div>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-neutral-500 text-sm">
                New to the platform?{" "}
                <a href="/org/signup" className="text-purple-400 hover:text-purple-300 transition">
                  Sign up your church
                </a>
              </p>
              <p className="mt-4">
                <a href="/staff" className="text-neutral-600 hover:text-neutral-500 text-xs transition">
                  Staff login
                </a>
              </p>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-neutral-300 text-sm font-medium mb-1.5">Email address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="pastor@yourchurch.org"
                  className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {forgotMsg && (
                <p className={`text-sm text-center ${forgotMsg.ok ? "text-green-400" : "text-red-400"}`}>
                  {forgotMsg.text}
                </p>
              )}

              <button
                type="submit"
                disabled={forgotLoading || !!forgotMsg?.ok}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition"
              >
                {forgotLoading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>

            <p className="mt-6 text-center">
              <button
                onClick={() => { setShowForgot(false); setForgotMsg(null); }}
                className="text-neutral-500 hover:text-neutral-400 text-xs transition"
              >
                ← Back to Sign In
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

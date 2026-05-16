import { useState } from "react";
import { useLocation } from "wouter";
import { setOrgSession } from "@/lib/session";

export default function OrgLoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      setOrgSession(data.orgId, data.orgName, data.token);
      navigate("/");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✝</div>
          <h1 className="text-2xl font-semibold text-white">Church Portal</h1>
          <p className="text-neutral-400 text-sm mt-1">Sign in to your organization account</p>
        </div>

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

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-neutral-500 text-sm">
            New to the platform?{" "}
            <a href="/org/signup" className="text-purple-400 hover:text-purple-300 transition">
              Sign up your church
            </a>
          </p>
          <p className="mt-4">
            <a href="/" className="text-neutral-600 hover:text-neutral-500 text-xs transition">
              ← Back to staff portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

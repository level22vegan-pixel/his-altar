import { useState } from "react";
import { useLocation } from "wouter";
import { setOrgSession } from "@/lib/session";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function OrgSignupPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { name, email, password, confirmPassword, contactName } = form;

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Church name, email, and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orgs/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          contactName: contactName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Signup failed. Please try again.");
        return;
      }
      setOrgSession(data.orgId, data.orgName, data.token, data.campuses ?? [data.orgName], {});
      localStorage.removeItem("orgSetupDone"); // ensure setup wizard runs for new accounts
      navigate("/org/setup");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition";

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white">Join the Platform</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Create an account for your church
          </p>
        </div>

        {/* Plan offer card */}
        <div className="bg-gradient-to-br from-purple-950/60 to-neutral-900 border border-purple-700/40 rounded-2xl px-5 py-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-1">His Altar Monthly</p>
              <p className="text-2xl font-bold text-white">
                $9.99<span className="text-base font-normal text-neutral-400"> / month</span>
              </p>
              <p className="text-green-400 text-sm font-medium mt-1">30-day free trial — no card required today</p>
            </div>
            <span className="bg-green-900/50 border border-green-700/40 text-green-400 text-xs font-semibold rounded-full px-3 py-1 mt-1 shrink-0">
              Free Trial
            </span>
          </div>
          <ul className="mt-4 space-y-1.5">
            {[
              "Altar Report — log & export responses",
              "Roster & Check-in management",
              "Dbanc — prayer contact database",
              "PXP — prayer follow-up call system",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-neutral-300 text-xs">
                <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <p className="text-neutral-600 text-xs mt-3">Cancel anytime. No commitment.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">
              Church Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Grace Fellowship Church"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">
              Contact Name (optional)
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="Pastor John Smith"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="admin@yourchurch.org"
              className={inputCls}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="At least 8 characters"
                className={inputCls}
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                placeholder="Repeat your password"
                className={inputCls}
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition"
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showConfirm} />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3 text-sm transition"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-neutral-500 text-sm">
          Already have an account?{" "}
          <a href="/" className="text-purple-400 hover:text-purple-300 transition">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

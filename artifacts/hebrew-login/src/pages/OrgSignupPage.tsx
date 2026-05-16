import { useState } from "react";
import { useLocation } from "wouter";
import { setOrgSession } from "@/lib/session";

export default function OrgSignupPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    contactName: "",
  });
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
      setOrgSession(data.orgId, data.orgName, data.token);
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
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✝</div>
          <h1 className="text-2xl font-semibold text-white">Join the Platform</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Create an account for your church
          </p>
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
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="At least 8 characters"
              className={inputCls}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-neutral-300 text-sm font-medium mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Repeat your password"
              className={inputCls}
              autoComplete="new-password"
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

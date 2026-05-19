import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { setOrgSession } from "@/lib/session";
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";

const WEBAUTHN_EMAIL_KEY = "hisaltar_biometric_email";

function saveEmailForBiometric(email: string) {
  try { localStorage.setItem(WEBAUTHN_EMAIL_KEY, email); } catch {}
}
function getSavedEmail(): string {
  try { return localStorage.getItem(WEBAUTHN_EMAIL_KEY) ?? ""; } catch { return ""; }
}

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

  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState("");

  // After successful login — offer to register Face ID
  const [showEnableBiometric, setShowEnableBiometric] = useState(false);
  const [pendingSession, setPendingSession] = useState<{ orgId: number; orgName: string; token: string; campuses: string[]; serviceTimes: Record<string, string[]> } | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMsg, setRegisterMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const webAuthnSupported = browserSupportsWebAuthn();
  const savedEmail = getSavedEmail();

  useEffect(() => {
    if (savedEmail) setEmail(savedEmail);
  }, []);

  function completeLogin(data: { orgId: number; orgName: string; token: string; campuses: string[]; serviceTimes: unknown }) {
    setOrgSession(data.orgId, data.orgName, data.token, data.campuses ?? [], (data.serviceTimes ?? {}) as Record<string, string[]>);
    navigate("/team");
  }

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
      saveEmailForBiometric(email.trim());

      // Check if biometrics supported and no creds yet — offer to enable
      if (webAuthnSupported) {
        const checkRes = await fetch(`/api/webauthn/auth-options?email=${encodeURIComponent(email.trim())}`);
        if (checkRes.status === 404) {
          // No biometrics registered yet — offer to register
          setPendingSession(data);
          setShowEnableBiometric(true);
          return;
        }
      }
      completeLogin(data);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    const loginEmail = email.trim() || savedEmail;
    if (!loginEmail) {
      setBiometricError("Enter your email first, then use Face ID.");
      return;
    }
    setBiometricLoading(true);
    setBiometricError("");
    try {
      const optRes = await fetch(`/api/webauthn/auth-options?email=${encodeURIComponent(loginEmail)}`);
      if (optRes.status === 404) {
        setBiometricError("No Face ID registered for this account. Sign in with your password first.");
        return;
      }
      if (!optRes.ok) {
        setBiometricError("Could not start Face ID. Try your password.");
        return;
      }
      const options = await optRes.json();
      const { orgId, ...authOptions } = options;

      let credential;
      try {
        credential = await startAuthentication({ optionsJSON: authOptions });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setBiometricError("Face ID was cancelled or not recognized.");
        } else {
          setBiometricError("Face ID failed. Try your password.");
        }
        return;
      }

      const verifyRes = await fetch("/api/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, credential }),
      });
      const data = await verifyRes.json();
      if (!verifyRes.ok) {
        setBiometricError(data.error ?? "Face ID verification failed.");
        return;
      }
      completeLogin(data);
    } catch {
      setBiometricError("Something went wrong. Try your password.");
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleEnableBiometric() {
    if (!pendingSession) return;
    setRegisterLoading(true);
    setRegisterMsg(null);
    try {
      const optRes = await fetch("/api/webauthn/register-options", {
        headers: { Authorization: `Bearer ${pendingSession.token}` },
      });
      if (!optRes.ok) throw new Error("Could not start registration");
      const options = await optRes.json();

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setRegisterMsg({ ok: false, text: "Face ID was cancelled." });
          return;
        }
        throw err;
      }

      const verifyRes = await fetch("/api/webauthn/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pendingSession.token}` },
        body: JSON.stringify(credential),
      });
      if (!verifyRes.ok) throw new Error("Registration failed");
      setRegisterMsg({ ok: true, text: "Face ID enabled! Signing you in…" });
      setTimeout(() => completeLogin(pendingSession), 1200);
    } catch (err: any) {
      setRegisterMsg({ ok: false, text: err.message ?? "Something went wrong." });
    } finally {
      setRegisterLoading(false);
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

  // --- Enable Face ID prompt (shown after first successful password login) ---
  if (showEnableBiometric && pendingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div style={{ fontSize: 56, marginBottom: 12 }}>
              {navigator.userAgent.includes("Mac") || navigator.userAgent.includes("iPhone") ? "🔒" : "🔐"}
            </div>
            <h1 className="text-2xl font-semibold text-white">Enable Face ID</h1>
            <p className="text-neutral-400 text-sm mt-2">
              Sign in instantly next time with Face ID or fingerprint — no password needed.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleEnableBiometric}
              disabled={registerLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg py-3.5 text-sm transition flex items-center justify-center gap-2"
            >
              {registerLoading ? "Setting up…" : "Enable Face ID / Fingerprint"}
            </button>

            {registerMsg && (
              <p className={`text-sm text-center ${registerMsg.ok ? "text-green-400" : "text-red-400"}`}>
                {registerMsg.text}
              </p>
            )}

            <button
              onClick={() => completeLogin(pendingSession)}
              className="w-full text-neutral-500 hover:text-neutral-400 text-sm py-2 transition"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
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
                  onChange={(e) => { setEmail(e.target.value); setError(""); setBiometricError(""); }}
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
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
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

            {/* Face ID / Biometric login */}
            {webAuthnSupported && (
              <div className="mt-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-neutral-800" />
                  <span className="text-neutral-600 text-xs">or</span>
                  <div className="flex-1 h-px bg-neutral-800" />
                </div>

                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 disabled:opacity-50 text-white font-medium rounded-lg py-3 text-sm transition flex items-center justify-center gap-2.5"
                >
                  {biometricLoading ? (
                    <span className="text-neutral-400">Verifying…</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 18 }}>🔐</span>
                      <span>Sign in with Face ID</span>
                    </>
                  )}
                </button>

                {biometricError && (
                  <p className="text-red-400 text-xs text-center mt-2">{biometricError}</p>
                )}
              </div>
            )}

            <div className="mt-6 text-center space-y-2">
              <p className="text-neutral-500 text-sm">
                New to the platform?{" "}
                <a href="/org/signup" className="text-purple-400 hover:text-purple-300 transition">
                  Sign up your church
                </a>
              </p>
              <p className="mt-2">
                <a href="/enter" className="text-neutral-600 hover:text-neutral-500 text-xs transition">
                  Campus lead access
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

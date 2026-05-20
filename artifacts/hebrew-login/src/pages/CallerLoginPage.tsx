import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListPxpCallers } from "@workspace/api-client-react";
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { setCallerSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const inputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 25% 22%)",
  background: "hsl(270 10% 4%)",
  color: "hsl(270 40% 88%)",
  fontFamily: "Georgia, serif",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box" as const,
  letterSpacing: "0.05em",
};

export default function CallerLoginPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const webAuthnSupported = browserSupportsWebAuthn();

  const [campus, setCampus] = useState(() => CAMPUSES[0] ?? "HALLMARK");
  const [selectedCallerId, setSelectedCallerId] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState("");

  const [showFaceIdPrompt, setShowFaceIdPrompt] = useState(false);
  const [pendingCallerId, setPendingCallerId] = useState<number | null>(null);
  const [pendingCallerCode, setPendingCallerCode] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState("");

  const { data, isLoading } = useListPxpCallers({ campus });
  const callers = data?.callers ?? [];

  useEffect(() => {
    setSelectedCallerId(null);
    setPassword("");
    setError("");
    setBiometricError("");
  }, [campus]);

  async function handleLogin() {
    if (!selectedCallerId || !password.trim()) return;
    const caller = callers.find(c => c.id === selectedCallerId);
    if (!caller) return;

    if (password.trim().toUpperCase() !== caller.password.toUpperCase()) {
      setError("Incorrect code");
      setShaking(true);
      setPassword("");
      setTimeout(() => { setShaking(false); setError(""); }, 1200);
      return;
    }

    if (webAuthnSupported) {
      try {
        const res = await fetch(`/api/pxp/callers/webauthn/check?callerId=${caller.id}`);
        const { hasFaceId } = await res.json();
        if (!hasFaceId) {
          setPendingCallerId(caller.id);
          setPendingCallerCode(password.trim());
          setShowFaceIdPrompt(true);
          return;
        }
      } catch { }
    }

    setCallerSession(caller.id, caller.name, caller.campus);
    navigate("/admin/pxp");
  }

  async function handleEnrollFaceId() {
    if (!pendingCallerId || !pendingCallerCode) return;
    setEnrollLoading(true);
    setEnrollError("");
    const caller = callers.find(c => c.id === pendingCallerId);

    try {
      const optRes = await fetch("/api/pxp/callers/webauthn/self-enroll-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerId: pendingCallerId, callerCode: pendingCallerCode }),
      });
      if (!optRes.ok) { setEnrollError("Could not start Face ID setup. Tap Skip."); return; }
      const { callerId: _cid, ...options } = await optRes.json();

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setEnrollError("Face ID was cancelled.");
        } else {
          setEnrollError("Face ID setup failed. Tap Skip to continue.");
        }
        return;
      }

      const verRes = await fetch("/api/pxp/callers/webauthn/self-enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callerId: pendingCallerId, callerCode: pendingCallerCode, credential }),
      });
      if (!verRes.ok) { setEnrollError("Enrollment failed. Tap Skip to continue."); return; }

      if (caller) setCallerSession(caller.id, caller.name, caller.campus);
      navigate("/admin/pxp");
    } catch {
      setEnrollError("Something went wrong. Tap Skip to continue.");
    } finally {
      setEnrollLoading(false);
    }
  }

  function handleSkipFaceId() {
    const caller = callers.find(c => c.id === pendingCallerId);
    if (caller) setCallerSession(caller.id, caller.name, caller.campus);
    navigate("/admin/pxp");
  }

  async function handleFaceIdLogin() {
    setBiometricLoading(true);
    setBiometricError("");
    try {
      const optRes = await fetch("/api/pxp/callers/webauthn/auth-options");
      if (!optRes.ok) { setBiometricError("Could not start Face ID. Try again."); return; }
      const { sessionKey, ...options } = await optRes.json();

      let credential;
      try {
        credential = await startAuthentication({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setBiometricError("Face ID was cancelled or not recognized.");
        } else {
          setBiometricError("Face ID failed. Enter your name and code instead.");
        }
        return;
      }

      const verRes = await fetch("/api/pxp/callers/webauthn/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey, credential }),
      });
      const data = await verRes.json();
      if (!verRes.ok) { setBiometricError(data.error ?? "Face ID verification failed."); return; }

      setCallerSession(data.callerId, data.callerName, data.campus);
      navigate("/admin/pxp");
    } catch {
      setBiometricError("Something went wrong. Enter your name and code instead.");
    } finally {
      setBiometricLoading(false);
    }
  }

  const canSubmit = !!selectedCallerId && !!password.trim();

  if (showFaceIdPrompt) {
    const caller = callers.find(c => c.id === pendingCallerId);
    return (
      <div
        className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "hsl(270 8% 3%)" }}
      >
        <div className="relative z-10 w-full max-w-xs px-4 text-center">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "hsl(270 55% 88%)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 6 }}>
            Enable Face ID?
          </h2>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "hsl(270 25% 56%)", lineHeight: 1.6, marginBottom: 24 }}>
            Sign in faster next time as <span style={{ color: "hsl(270 60% 78%)" }}>{caller?.name}</span> — just scan your face instead of entering your code.
          </p>

          {enrollError && (
            <p style={{ color: "hsl(0 55% 58%)", fontFamily: "Georgia, serif", fontSize: 12, marginBottom: 12 }}>{enrollError}</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleEnrollFaceId}
              disabled={enrollLoading}
              style={{
                padding: "13px 0", borderRadius: 8,
                background: enrollLoading ? "hsl(270 12% 8%)" : "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))",
                border: "1px solid hsl(270 55% 46%)",
                color: enrollLoading ? "hsl(270 20% 36%)" : "hsl(270 20% 95%)",
                fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase",
                cursor: enrollLoading ? "not-allowed" : "pointer",
              }}
            >
              {enrollLoading ? "Setting up…" : "Yes, Enable Face ID"}
            </button>
            <button
              onClick={handleSkipFaceId}
              disabled={enrollLoading}
              style={{
                padding: "11px 0", borderRadius: 8,
                background: "transparent",
                border: "1px solid hsl(270 20% 18%)",
                color: "hsl(270 20% 48%)",
                fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
                cursor: enrollLoading ? "not-allowed" : "pointer",
              }}
            >
              Skip for Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "hsl(270 8% 3%)" }}
    >
      <button
        onClick={() => navigate("/team")}
        style={{
          position: "fixed",
          top: 20,
          left: 24,
          color: "hsl(270 45% 68%)",
          fontFamily: "Georgia, serif",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          background: "hsl(270 20% 9%)",
          border: "1px solid hsl(270 30% 22%)",
          borderRadius: 6,
          padding: "5px 12px",
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        ← Back
      </button>

      <div className="relative z-10 w-full max-w-xs px-4">
        <div className="text-center mb-10">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: "hsl(270 55% 88%)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
            Follow-Up Team Sign In
          </h1>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, hsl(270 60% 45%), transparent)", margin: "10px auto 0" }} />
        </div>

        {/* Face ID fast-login */}
        {webAuthnSupported && (
          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleFaceIdLogin}
              disabled={biometricLoading}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 8,
                background: biometricLoading ? "hsl(270 12% 7%)" : "hsl(270 28% 12%)",
                border: "1px solid hsl(270 40% 26%)",
                color: biometricLoading ? "hsl(270 20% 36%)" : "hsl(270 65% 78%)",
                fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase",
                cursor: biometricLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 18 }}>🔐</span>
              {biometricLoading ? "Verifying…" : "Sign in with Face ID"}
            </button>
            {biometricError && (
              <p style={{ color: "hsl(0 55% 58%)", fontFamily: "Georgia, serif", fontSize: 11, margin: "6px 0 0", textAlign: "center" }}>
                {biometricError}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 0" }}>
              <div style={{ flex: 1, height: 1, background: "hsl(270 20% 14%)" }} />
              <span style={{ color: "hsl(270 20% 34%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>or sign in with code</span>
              <div style={{ flex: 1, height: 1, background: "hsl(270 20% 14%)" }} />
            </div>
          </div>
        )}

        <div className={shaking ? "shake" : ""} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select
            style={{ ...inputStyle, appearance: "none" as const }}
            value={campus}
            onChange={e => setCampus(e.target.value)}
          >
            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            style={{ ...inputStyle, appearance: "none" as const, color: selectedCallerId ? "hsl(270 40% 88%)" : "hsl(270 20% 42%)" }}
            value={selectedCallerId ?? ""}
            onChange={e => setSelectedCallerId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={isLoading || callers.length === 0}
          >
            <option value="">
              {isLoading ? "Loading…" : callers.length === 0 ? "No callers registered" : "Select your name…"}
            </option>
            {callers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="password"
            style={{
              ...inputStyle,
              border: error ? "1px solid hsl(0 55% 40%)" : inputStyle.border,
              color: error ? "hsl(0 70% 60%)" : inputStyle.color,
              letterSpacing: "0.2em",
            }}
            placeholder="Code"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
          />

          {error && (
            <div style={{ color: "hsl(0 65% 55%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!canSubmit}
            style={{
              marginTop: 4,
              padding: "13px 0",
              borderRadius: 8,
              background: canSubmit
                ? "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))"
                : "hsl(270 12% 8%)",
              border: `1px solid ${canSubmit ? "hsl(270 55% 46%)" : "hsl(270 15% 14%)"}`,
              color: canSubmit ? "hsl(270 20% 95%)" : "hsl(270 15% 32%)",
              fontFamily: "Georgia, serif",
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

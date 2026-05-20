import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListPxpCallers,
  useCreatePxpCaller,
  useDeletePxpCaller,
  useResetPxpCallerPassword,
} from "@workspace/api-client-react";
import { startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { getValidCampusSession, getValidAdminSession, getValidOrgSession, getOrgToken } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid hsl(270 25% 22%)",
  background: "hsl(270 10% 4%)",
  color: "hsl(270 40% 88%)",
  fontFamily: "Georgia, serif",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box" as const,
};

function apiFetch(path: string, opts?: RequestInit) {
  const token = getOrgToken();
  return fetch(`/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

export default function PXPCallersPage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const webAuthnSupported = browserSupportsWebAuthn();

  const campusSession = getValidCampusSession();
  const isMasterAdmin = getValidAdminSession();
  const orgSession = getValidOrgSession();
  const lockedCampus  = campusSession?.campus ?? null;

  const [filterCampus, setFilterCampus] = useState(() => lockedCampus ?? CAMPUSES[0] ?? "HALLMARK");
  const [name, setName] = useState("");
  const [campus, setCampus] = useState(() => lockedCampus ?? CAMPUSES[0] ?? "HALLMARK");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Face ID state
  const [biometricCallerIds, setBiometricCallerIds] = useState<Set<number>>(new Set());
  const [faceIdLoading, setFaceIdLoading] = useState<number | null>(null);
  const [faceIdMsg, setFaceIdMsg] = useState<{ id: number; ok: boolean; text: string } | null>(null);

  const { data, isLoading, refetch } = useListPxpCallers(
    filterCampus ? { campus: filterCampus } : undefined
  );
  const createCaller  = useCreatePxpCaller();
  const deleteCaller  = useDeletePxpCaller();
  const resetPassword = useResetPxpCallerPassword();

  const callers = data?.callers ?? [];
  const isAdmin = !!(isMasterAdmin || orgSession);

  useEffect(() => {
    fetch("/api/pxp/callers/webauthn/status", {
      headers: getOrgToken() ? { Authorization: `Bearer ${getOrgToken()}` } : {},
    })
      .then(r => r.json())
      .then(d => setBiometricCallerIds(new Set(d.callerIds ?? [])))
      .catch(() => {});
  }, []);

  function handleAdd() {
    if (!name.trim() || !campus) return;
    createCaller.mutate(
      { data: { name: name.trim(), campus, phone: phone.trim() } },
      {
        onSuccess: (newCaller) => {
          setName(""); setPhone(""); setAdding(false);
          setRevealedIds(prev => new Set(prev).add(newCaller.id));
          refetch();
        },
      }
    );
  }

  function handleDelete(id: number, callerName: string) {
    if (!confirm(`Remove ${callerName} from callers?`)) return;
    deleteCaller.mutate({ id }, { onSuccess: () => refetch() });
  }

  function handleResetPassword(id: number) {
    if (!confirm("Generate a new password for this caller? Their current password will stop working.")) return;
    resetPassword.mutate({ id }, {
      onSuccess: () => { setRevealedIds(prev => new Set(prev).add(id)); refetch(); },
    });
  }

  function toggleReveal(id: number) {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function copyPassword(id: number, password: string) {
    navigator.clipboard.writeText(password).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  async function handleSetupFaceId(callerId: number, callerName: string) {
    setFaceIdLoading(callerId);
    setFaceIdMsg(null);
    try {
      const optRes = await apiFetch("/pxp/callers/webauthn/register-options", {
        method: "POST",
        body: JSON.stringify({ callerId }),
      });
      if (!optRes.ok) {
        const d = await optRes.json();
        setFaceIdMsg({ id: callerId, ok: false, text: d.error ?? "Could not start Face ID setup." });
        return;
      }
      const { callerId: _cid, ...options } = await optRes.json();

      let credential;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setFaceIdMsg({ id: callerId, ok: false, text: "Face ID was cancelled." });
        } else {
          setFaceIdMsg({ id: callerId, ok: false, text: "Face ID setup failed. Try again." });
        }
        return;
      }

      const verRes = await apiFetch("/pxp/callers/webauthn/register", {
        method: "POST",
        body: JSON.stringify({ callerId, credential }),
      });
      if (!verRes.ok) {
        setFaceIdMsg({ id: callerId, ok: false, text: "Registration failed. Try again." });
        return;
      }

      setBiometricCallerIds(prev => new Set(prev).add(callerId));
      setFaceIdMsg({ id: callerId, ok: true, text: `Face ID enabled for ${callerName}.` });
      setTimeout(() => setFaceIdMsg(null), 3000);
    } catch {
      setFaceIdMsg({ id: callerId, ok: false, text: "Something went wrong." });
    } finally {
      setFaceIdLoading(null);
    }
  }

  async function handleRemoveFaceId(callerId: number) {
    if (!confirm("Remove Face ID for this caller?")) return;
    try {
      await apiFetch(`/pxp/callers/webauthn/${callerId}`, { method: "DELETE" });
      setBiometricCallerIds(prev => {
        const next = new Set(prev);
        next.delete(callerId);
        return next;
      });
    } catch {
      alert("Failed to remove Face ID. Try again.");
    }
  }

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start overflow-hidden"
      style={{ background: "hsl(270 8% 3%)" }}
    >
      <button
        onClick={() => navigate("/admin")}
        className="fixed top-5 left-6 z-50"
        style={{
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
        }}
      >
        ← Admin
      </button>

      <div className="relative z-10 w-full max-w-xl px-4 pt-14 pb-20">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.6rem, 5vw, 2.4rem)", color: "hsl(270 55% 88%)", letterSpacing: "0.22em", textTransform: "uppercase", textShadow: "0 0 30px hsl(270 60% 50% / 0.4)" }}>
            PXP Callers
          </h1>
          <div style={{ width: 50, height: 2, background: "linear-gradient(90deg, transparent, hsl(270 60% 55%), transparent)", margin: "8px auto 0" }} />
          <p style={{ color: "hsl(270 30% 50%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", marginTop: 6, textTransform: "uppercase" }}>
            Registered Caller Roster
          </p>
          {lockedCampus && !getValidOrgSession() && (
            <div style={{ display: "inline-block", marginTop: 8, padding: "3px 14px", background: "hsl(270 40% 14%)", border: "1px solid hsl(270 40% 26%)", borderRadius: 20 }}>
              <span style={{ color: "hsl(270 65% 75%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {lockedCampus} · {campusSession?.role === "lead" ? "Lead" : "Deputy Lead"}
              </span>
            </div>
          )}
        </div>

        {isMasterAdmin && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
              {CAMPUSES.map(c => (
                <button
                  key={c}
                  onClick={() => { setFilterCampus(c); if (!lockedCampus) setCampus(c); }}
                  style={{
                    flexShrink: 0, padding: "6px 14px", borderRadius: 20,
                    border: filterCampus === c ? "1px solid hsl(270 50% 38%)" : "1px solid hsl(270 20% 16%)",
                    background: filterCampus === c ? "hsl(270 50% 16%)" : "hsl(270 10% 6%)",
                    color: filterCampus === c ? "hsl(270 70% 78%)" : "hsl(270 20% 48%)",
                    fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {isAdmin && (
          <div style={{ background: "hsl(270 12% 7%)", border: "1px solid hsl(270 25% 18%)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
            <button
              onClick={() => setAdding(v => !v)}
              style={{ width: "100%", padding: "12px 18px", background: "none", border: "none", color: "hsl(270 65% 72%)", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", textAlign: "left" }}
            >
              {adding ? "▲  Cancel" : "+ Add Caller"}
            </button>
            {adding && (
              <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                <input style={inputStyle} placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} />
                <input style={inputStyle} placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
                {lockedCampus ? (
                  <div style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.75 }}>
                    <span style={{ color: "hsl(270 60% 72%)" }}>{lockedCampus}</span>
                    <span style={{ color: "hsl(270 20% 44%)", fontSize: 10, letterSpacing: "0.1em" }}>CAMPUS LOCKED</span>
                  </div>
                ) : (
                  <select style={{ ...inputStyle, appearance: "none" as const }} value={campus} onChange={e => setCampus(e.target.value)}>
                    {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <p style={{ color: "hsl(270 20% 44%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.08em", margin: 0 }}>
                  A password will be auto-generated and shown after saving.
                </p>
                <button
                  onClick={handleAdd}
                  disabled={!name.trim() || createCaller.isPending}
                  style={{
                    padding: "10px 0", borderRadius: 8,
                    background: name.trim() ? "linear-gradient(135deg, hsl(270 60% 42%), hsl(270 55% 30%))" : "hsl(270 12% 7%)",
                    color: name.trim() ? "hsl(270 20% 95%)" : "hsl(270 20% 34%)",
                    border: "none", fontFamily: "Georgia, serif", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase",
                    cursor: name.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  {createCaller.isPending ? "Saving…" : "Save Caller"}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ borderRadius: 10, border: "1px solid hsl(270 20% 12%)", background: "hsl(270 12% 5% / 0.8)", overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: "center", color: "hsl(270 20% 42%)", fontFamily: "Georgia, serif", fontSize: 13 }}>Loading…</div>
          ) : callers.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "hsl(270 15% 36%)", fontFamily: "Georgia, serif", fontSize: 13, letterSpacing: "0.1em" }}>
              No callers registered{filterCampus ? ` for ${filterCampus}` : ""} yet
            </div>
          ) : (
            callers.map((c, i) => {
              const isRevealed = revealedIds.has(c.id);
              const isCopied   = copiedId === c.id;
              const hasFaceId  = biometricCallerIds.has(c.id);
              const isSettingUp = faceIdLoading === c.id;
              const msg = faceIdMsg?.id === c.id ? faceIdMsg : null;

              return (
                <div key={c.id} style={{ padding: "14px 18px", borderBottom: i < callers.length - 1 ? "1px solid hsl(270 15% 9%)" : "none", background: i % 2 === 0 ? "transparent" : "hsl(270 10% 5% / 0.5)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, hsl(${(c.id * 67) % 360} 40% 22%), hsl(${(c.id * 67 + 80) % 360} 35% 14%))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "hsl(270 20% 88%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold",
                    }}>
                      {c.name.trim()[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "hsl(270 30% 85%)", fontFamily: "Georgia, serif", fontSize: 14, fontWeight: "bold" }}>{c.name}</span>
                        {hasFaceId && (
                          <span style={{ background: "hsl(145 40% 10%)", border: "1px solid hsl(145 40% 20%)", color: "hsl(145 55% 55%)", borderRadius: 4, padding: "1px 7px", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.12em" }}>
                            Face ID ✓
                          </span>
                        )}
                      </div>
                      <div style={{ color: "hsl(270 20% 48%)", fontFamily: "Georgia, serif", fontSize: 11, marginTop: 1 }}>
                        {c.campus}{c.phone ? ` · ${c.phone}` : ""}
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "hsl(0 45% 12%)", border: "1px solid hsl(0 38% 22%)", color: "hsl(0 60% 58%)", fontFamily: "Georgia, serif", fontSize: 11, cursor: "pointer", flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "hsl(270 10% 4%)", border: "1px solid hsl(270 20% 14%)", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                      <span style={{ color: "hsl(270 20% 44%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", flexShrink: 0 }}>Pass</span>
                      <span style={{
                        flex: 1, fontFamily: "monospace", fontSize: 14,
                        letterSpacing: isRevealed ? "0.25em" : "0.1em",
                        color: isRevealed ? "hsl(270 65% 78%)" : "hsl(270 20% 28%)",
                        userSelect: isRevealed ? "text" : "none",
                      }}>
                        {isRevealed ? c.password : "••••••"}
                      </span>
                      <button onClick={() => toggleReveal(c.id)} style={{ padding: "3px 8px", borderRadius: 5, background: "hsl(270 12% 8%)", border: "1px solid hsl(270 20% 18%)", color: "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
                        {isRevealed ? "Hide" : "Show"}
                      </button>
                      {isRevealed && (
                        <button onClick={() => copyPassword(c.id, c.password)} style={{ padding: "3px 8px", borderRadius: 5, background: isCopied ? "hsl(145 40% 12%)" : "hsl(270 12% 8%)", border: `1px solid ${isCopied ? "hsl(145 40% 22%)" : "hsl(270 20% 18%)"}`, color: isCopied ? "hsl(145 55% 58%)" : "hsl(270 35% 55%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
                          {isCopied ? "Copied!" : "Copy"}
                        </button>
                      )}
                      <button onClick={() => handleResetPassword(c.id)} style={{ padding: "3px 8px", borderRadius: 5, background: "hsl(35 25% 9%)", border: "1px solid hsl(35 24% 17%)", color: "hsl(38 52% 50%)", fontFamily: "Georgia, serif", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>
                        Reset
                      </button>
                    </div>
                  )}

                  {/* Face ID row */}
                  {webAuthnSupported && isAdmin && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {hasFaceId ? (
                        <button
                          onClick={() => handleRemoveFaceId(c.id)}
                          style={{ padding: "5px 12px", borderRadius: 6, background: "hsl(145 25% 8%)", border: "1px solid hsl(145 30% 16%)", color: "hsl(145 40% 42%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
                        >
                          Remove Face ID
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSetupFaceId(c.id, c.name)}
                          disabled={isSettingUp}
                          style={{ padding: "5px 12px", borderRadius: 6, background: isSettingUp ? "hsl(270 12% 7%)" : "hsl(270 35% 14%)", border: "1px solid hsl(270 35% 22%)", color: isSettingUp ? "hsl(270 20% 38%)" : "hsl(270 60% 68%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", cursor: isSettingUp ? "not-allowed" : "pointer" }}
                        >
                          {isSettingUp ? "Scanning…" : "Setup Face ID"}
                        </button>
                      )}
                      {msg && (
                        <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: msg.ok ? "hsl(145 55% 52%)" : "hsl(0 55% 58%)" }}>
                          {msg.text}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 12, color: "hsl(270 15% 34%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
          {callers.length} {callers.length === 1 ? "caller" : "callers"}{filterCampus ? ` at ${filterCampus}` : ""}
        </p>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { clearAllSessions, getValidOrgSession } from "@/lib/session";

const BASE = "/api";

function apiFetch(path: string, opts?: RequestInit) {
  const orgRaw = localStorage.getItem("orgSession");
  const token = orgRaw ? JSON.parse(orgRaw)?.token : undefined;
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
}

const S = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 50% 20%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
    padding: "0 0 60px",
  } as React.CSSProperties,
  wrap: { width: "100%", maxWidth: 460, margin: "0 auto", padding: "0 16px" } as React.CSSProperties,
  card: {
    marginBottom: 10,
    borderRadius: 12,
    background: "hsl(35 20% 11%)",
    border: "1px solid hsl(38 18% 20%)",
    overflow: "hidden",
  } as React.CSSProperties,
  cardHeader: {
    padding: "10px 16px",
    background: "hsl(35 22% 9%)",
    fontFamily: "Georgia, serif",
    fontSize: 9,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "hsl(38 35% 38%)",
    borderBottom: "1px solid hsl(38 18% 18%)",
  },
  fieldRow: {
    padding: "14px 16px",
    borderBottom: "1px solid hsl(38 15% 15%)",
  } as React.CSSProperties,
  label: {
    fontFamily: "Georgia, serif",
    fontSize: 9,
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "hsl(38 28% 38%)",
    marginBottom: 6,
  },
  value: {
    fontFamily: "Georgia, serif",
    fontSize: 14,
    color: "hsl(38 60% 70%)",
    letterSpacing: "0.04em",
  },
  inp: {
    width: "100%",
    padding: "9px 12px",
    background: "hsl(35 18% 8%)",
    border: "1px solid hsl(38 20% 24%)",
    borderRadius: 6,
    color: "hsl(38 60% 72%)",
    fontFamily: "Georgia, serif",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btn: (accent = false, danger = false): React.CSSProperties => ({
    padding: "10px 0",
    width: "100%",
    background: danger ? "hsl(0 40% 18%)" : accent ? "hsl(38 45% 26%)" : "hsl(35 22% 16%)",
    color: danger ? "hsl(0 60% 65%)" : accent ? "hsl(38 70% 78%)" : "hsl(38 40% 50%)",
    border: `1px solid ${danger ? "hsl(0 38% 28%)" : accent ? "hsl(38 35% 34%)" : "hsl(38 20% 24%)"}`,
    borderRadius: 6,
    fontFamily: "Georgia, serif",
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
  }),
};

function DeleteAccountSection() {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  async function handleDelete() {
    if (typed !== "DELETE") { setErr("Type DELETE (all caps) to confirm"); return; }
    setDeleting(true); setErr("");
    try {
      const res = await apiFetch("/orgs", { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Failed"); }
      clearAllSessions();
      navigate("/org/signup");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setDeleting(false); }
  }

  if (!expanded) {
    return (
      <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 8 }}>
        <button
          onClick={() => setExpanded(true)}
          style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 10, color: "hsl(38 15% 28%)", letterSpacing: "0.1em", textDecoration: "underline", opacity: 0.6 }}
        >
          delete account
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 32, padding: "16px", borderRadius: 10, border: "1px solid hsl(0 28% 20%)", background: "hsl(0 20% 9%)" }}>
      <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(0 50% 55%)", margin: "0 0 12px", lineHeight: 1.6 }}>
        This permanently deletes all contacts, rosters, call logs, altar reports, and your account. There is no undo.
      </p>
      <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 25% 38%)", margin: "0 0 10px" }}>
        Type <strong style={{ color: "hsl(0 55% 60%)" }}>DELETE</strong> to confirm.
      </p>
      <input
        value={typed}
        onChange={e => { setTyped(e.target.value); setErr(""); }}
        placeholder="DELETE"
        style={{ ...S.inp, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}
      />
      {err && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: "hsl(0 55% 58%)", margin: "0 0 10px" }}>{err}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { setExpanded(false); setTyped(""); setErr(""); }} style={{ ...S.btn(), flex: 1 }}>Cancel</button>
        <button
          onClick={handleDelete}
          disabled={deleting || typed !== "DELETE"}
          style={{ ...S.btn(false, true), flex: 1, opacity: typed !== "DELETE" || deleting ? 0.45 : 1, cursor: typed !== "DELETE" || deleting ? "not-allowed" : "pointer" }}
        >
          {deleting ? "Deleting…" : "Delete All"}
        </button>
      </div>
    </div>
  );
}

type OrgProfile = { name: string; email: string; contactName: string | null };

function EditableField({
  label, value, onSave, last,
}: { label: string; value: string; onSave: (v: string) => Promise<void>; last?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true); setMsg(null);
    try {
      await onSave(draft.trim());
      setMsg({ text: "Saved", ok: true });
      setEditing(false);
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg({ text: "Failed to save", ok: false });
    } finally { setSaving(false); }
  }

  return (
    <div style={{ ...S.fieldRow, borderBottom: last ? "none" : S.fieldRow.borderBottom as string }}>
      <div style={S.label}>{label}</div>
      {editing ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            autoFocus
            style={{ ...S.inp, flex: 1 }}
          />
          <button onClick={save} disabled={saving} style={{ ...S.btn(true), width: "auto", padding: "9px 16px", whiteSpace: "nowrap" }}>
            {saving ? "…" : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setDraft(value); }} style={{ ...S.btn(), width: "auto", padding: "9px 12px" }}>✕</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={S.value}>{value || <span style={{ color: "hsl(38 20% 32%)", fontStyle: "italic" }}>Not set</span>}</span>
          <button
            onClick={() => { setEditing(true); setDraft(value); setMsg(null); }}
            style={{ background: "none", border: "1px solid hsl(38 20% 22%)", borderRadius: 5, color: "hsl(38 30% 40%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Edit
          </button>
        </div>
      )}
      {msg && <p style={{ fontFamily: "Georgia, serif", fontSize: 11, color: msg.ok ? "hsl(120 40% 52%)" : "hsl(0 55% 58%)", margin: "6px 0 0" }}>{msg.text}</p>}
    </div>
  );
}

export default function AdminProfilePage() {
  const [, navigate] = useLocation();
  const orgSession = getValidOrgSession();
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/orgs/me")
      .then(r => r.json())
      .then(d => setProfile({ name: d.name ?? "", email: d.email ?? "", contactName: d.contactName ?? "" }))
      .catch(() => {
        if (orgSession) setProfile({ name: orgSession.orgName, email: "", contactName: "" });
      })
      .finally(() => setLoading(false));
  }, []);

  async function patchField(field: keyof OrgProfile, value: string) {
    const res = await apiFetch("/orgs/me", { method: "PATCH", body: JSON.stringify({ [field]: value }) });
    if (!res.ok) throw new Error("Failed");
    setProfile(p => p ? { ...p, [field]: value } : p);
  }

  return (
    <div style={S.page}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid hsl(38 18% 18%)",
        background: "hsl(35 22% 9%)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate("/team")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(38 35% 42%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", padding: 0 }}
        >
          ← Teams
        </button>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "hsl(38 60% 65%)", letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
          Profile
        </h1>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ ...S.wrap, paddingTop: 24 }}>
        {loading ? (
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 30% 38%)", textAlign: "center", paddingTop: 40 }}>Loading…</p>
        ) : profile ? (
          <div style={S.card}>
            <div style={S.cardHeader}>Church Account</div>
            <EditableField label="Church Name" value={profile.name} onSave={v => patchField("name", v)} />
            <EditableField label="Email" value={profile.email} onSave={v => patchField("email", v)} />
            <EditableField label="Contact Name" value={profile.contactName ?? ""} onSave={v => patchField("contactName", v)} last />
          </div>
        ) : (
          <p style={{ fontFamily: "Georgia, serif", fontSize: 12, color: "hsl(38 30% 38%)", textAlign: "center", paddingTop: 40 }}>
            Sign in as a church admin to view your profile.
          </p>
        )}

        {orgSession && <DeleteAccountSection />}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { getValidOrgSession } from "@/lib/session";
import { useCreateWorker } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

// ── helpers ────────────────────────────────────────────────────────────────────

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("orgSession");
    return raw ? JSON.parse(raw)?.token ?? null : null;
  } catch { return null; }
}

async function apiFetch(path: string, body: unknown) {
  const token = getToken();
  return fetch(`/api${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

export function markSetupDone() {
  localStorage.setItem("orgSetupDone", "1");
}
export function isSetupDone(): boolean {
  return localStorage.getItem("orgSetupDone") === "1";
}

// ── sub-step components ────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition";
const btnCls =
  "bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition whitespace-nowrap";

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-200">
      <span>{label}</span>
      <button onClick={onRemove} className="text-neutral-500 hover:text-red-400 text-xs leading-none transition">✕</button>
    </div>
  );
}

// Step 1 — Altar Members
function StepAltarMembers({ onNext }: { onNext: () => void }) {
  const qc = useQueryClient();
  const createWorker = useCreateWorker({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["workers"] }) } });
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [campus, setCampus] = useState("");
  const [category, setCategory] = useState<"master" | "alt">("master");
  const [added, setAdded] = useState<{ name: string; role: string; category: string }[]>([]);
  const [err, setErr] = useState("");

  async function handleAdd() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setErr("");
    try {
      await createWorker.mutateAsync({ data: { name: name.trim(), role: role.trim() || "Member", category, campus: campus.trim(), photoUrl: "" } });
      setAdded(a => [...a, { name: name.trim(), role: role.trim() || "Member", category }]);
      setName(""); setRole(""); setCampus("");
    } catch { setErr("Failed to add member — try again"); }
  }

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5">
        Add the people who serve at the altar. You can add more or edit them later in the Roster Manager.
      </p>
      <div className="flex flex-col gap-3 mb-4">
        <input className={inputCls} placeholder="Full name" value={name} onChange={e => { setName(e.target.value); setErr(""); }} />
        <input className={inputCls} placeholder="Campus (e.g. Main, North)" value={campus} onChange={e => setCampus(e.target.value)} />
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Role (e.g. Usher, Greeter)" value={role} onChange={e => setRole(e.target.value)} />
          <select
            value={category}
            onChange={e => setCategory(e.target.value as "master" | "alt")}
            className="bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition"
          >
            <option value="master">Master</option>
            <option value="alt">Alt</option>
          </select>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button onClick={handleAdd} disabled={createWorker.isPending} className={btnCls}>
          {createWorker.isPending ? "Adding…" : "+ Add Member"}
        </button>
      </div>

      {added.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {added.map((m, i) => (
            <Chip key={i} label={`${m.name} · ${m.role}`} onRemove={() => setAdded(a => a.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
        <button onClick={onNext} className="text-neutral-500 hover:text-neutral-300 text-sm transition">
          Skip for now →
        </button>
        <button onClick={onNext} className={btnCls}>
          Next: Follow-up Callers →
        </button>
      </div>
    </div>
  );
}

// Step 2 — Follow-up Callers
function StepCallers({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("");
  const [campus, setCampus] = useState("");
  const [added, setAdded] = useState<{ name: string; campus: string }[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch("/pxp/callers", { name: name.trim(), campus: campus.trim() || "" });
      if (!res.ok) throw new Error();
      setAdded(a => [...a, { name: name.trim(), campus: campus.trim() }]);
      setName(""); setCampus("");
    } catch { setErr("Failed to add caller — try again"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5">
        Add people who will make prayer follow-up calls. They'll show up in the PXP caller list.
      </p>
      <div className="flex flex-col gap-3 mb-4">
        <input className={inputCls} placeholder="Caller name" value={name} onChange={e => { setName(e.target.value); setErr(""); }} />
        <input className={inputCls} placeholder="Campus (optional)" value={campus} onChange={e => setCampus(e.target.value)} />
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button onClick={handleAdd} disabled={loading} className={btnCls}>
          {loading ? "Adding…" : "+ Add Caller"}
        </button>
      </div>

      {added.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {added.map((c, i) => (
            <Chip key={i} label={c.campus ? `${c.name} · ${c.campus}` : c.name} onRemove={() => setAdded(a => a.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
        <button onClick={onNext} className="text-neutral-500 hover:text-neutral-300 text-sm transition">
          Skip for now →
        </button>
        <button onClick={onNext} className={btnCls}>
          Next: Staff Access →
        </button>
      </div>
    </div>
  );
}

// Step 3 — Staff / Administrators
function StepStaff({ onFinish }: { onFinish: () => void }) {
  const [campus, setCampus] = useState("");
  const [role, setRole] = useState("lead");
  const [password, setPassword] = useState("");
  const [added, setAdded] = useState<{ campus: string; role: string }[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!campus.trim() || !password.trim()) { setErr("Campus and password are required"); return; }
    if (password.length < 4) { setErr("Password must be at least 4 characters"); return; }
    setErr("");
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/campus-passwords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ campus: campus.trim(), role, password: password.trim() }),
      });
      if (!res.ok) throw new Error();
      setAdded(a => [...a, { campus: campus.trim(), role }]);
      setCampus(""); setPassword(""); setRole("lead");
    } catch { setErr("Failed to set password — try again"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5">
        Set a login password for each campus so your staff can sign in. You can add more campuses or change passwords later in the Admin Panel.
      </p>
      <div className="flex flex-col gap-3 mb-4">
        <input className={inputCls} placeholder="Campus name (e.g. Main, North)" value={campus} onChange={e => { setCampus(e.target.value); setErr(""); }} />
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition"
        >
          <option value="lead">Campus Lead</option>
          <option value="deputy_lead">Deputy Lead</option>
        </select>
        <input className={inputCls} type="password" placeholder="Staff password" value={password} onChange={e => { setPassword(e.target.value); setErr(""); }} />
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button onClick={handleAdd} disabled={loading} className={btnCls}>
          {loading ? "Saving…" : "+ Set Campus Password"}
        </button>
      </div>

      {added.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {added.map((s, i) => (
            <Chip key={i} label={`${s.campus} · ${s.role === "lead" ? "Lead" : "Deputy"}`} onRemove={() => setAdded(a => a.filter((_, j) => j !== i))} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
        <button onClick={onFinish} className="text-neutral-500 hover:text-neutral-300 text-sm transition">
          Skip for now →
        </button>
        <button onClick={onFinish} className={btnCls}>
          Finish Setup →
        </button>
      </div>
    </div>
  );
}

// ── main wizard ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Altar Members", shortLabel: "Members" },
  { label: "Follow-up Callers", shortLabel: "Callers" },
  { label: "Staff Access", shortLabel: "Staff" },
];

export default function OrgSetupPage() {
  const [, navigate] = useLocation();
  const session = getValidOrgSession();
  const [step, setStep] = useState(0);

  function nextStep() { setStep(s => s + 1); }

  function finish() {
    markSetupDone();
    navigate("/org/dashboard");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">{session?.orgName ?? "Your Church"}</h1>
          <p className="text-neutral-500 text-xs mt-0.5">First-time setup</p>
        </div>
        <button
          onClick={finish}
          className="text-neutral-500 hover:text-neutral-300 text-xs transition"
        >
          Skip all & go to dashboard
        </button>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    i < step
                      ? "bg-purple-600 text-white"
                      : i === step
                      ? "bg-purple-600 text-white ring-4 ring-purple-600/25"
                      : "bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-purple-300" : "text-neutral-600"}`}>
                  {s.shortLabel}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 ${i < step ? "bg-purple-600" : "bg-neutral-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            {step === 0 && "Add Altar Members"}
            {step === 1 && "Add Follow-up Callers"}
            {step === 2 && "Set Staff Access"}
          </h2>
          <p className="text-neutral-600 text-xs mb-6">
            Step {step + 1} of {STEPS.length}
          </p>

          {step === 0 && <StepAltarMembers onNext={nextStep} />}
          {step === 1 && <StepCallers onNext={nextStep} />}
          {step === 2 && <StepStaff onFinish={finish} />}
        </div>

        <p className="text-center text-neutral-700 text-xs mt-6">
          You can change all of this later from your Admin Panel.
        </p>
      </main>
    </div>
  );
}

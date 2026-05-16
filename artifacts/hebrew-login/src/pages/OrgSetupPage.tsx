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
  const orgName = getValidOrgSession()?.orgName ?? "";
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [category, setCategory] = useState<"master" | "alt">("master");
  const [added, setAdded] = useState<{ name: string; role: string; category: string }[]>([]);
  const [err, setErr] = useState("");

  async function handleAdd() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setErr("");
    try {
      await createWorker.mutateAsync({ data: { name: name.trim(), role: role.trim() || "Member", category, campus: orgName, photoUrl: "" } });
      setAdded(a => [...a, { name: name.trim(), role: role.trim() || "Member", category }]);
      setName(""); setRole("");
    } catch { setErr("Failed to add member — try again"); }
  }

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5">
        Add the people who serve at the altar. You can add more or edit them later in the Roster Manager.
      </p>
      <div className="flex flex-col gap-3 mb-4">
        <input className={inputCls} placeholder="Full name" value={name} onChange={e => { setName(e.target.value); setErr(""); }} />
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
  const orgName = getValidOrgSession()?.orgName ?? "";
  const [name, setName] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setErr("");
    setLoading(true);
    try {
      const res = await apiFetch("/pxp/callers", { name: name.trim(), campus: orgName });
      if (!res.ok) throw new Error();
      setAdded(a => [...a, name.trim()]);
      setName("");
    } catch { setErr("Failed to add caller — try again"); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5">
        Add people who will make prayer follow-up calls. They'll show up in the PXP caller list.
      </p>

      {/* Tip for admin-as-caller */}
      <div className="flex items-start gap-3 bg-purple-950/40 border border-purple-800/40 rounded-xl px-4 py-3 mb-5">
        <span className="text-purple-400 text-base mt-0.5 shrink-0">💡</span>
        <p className="text-purple-300/80 text-xs leading-relaxed">
          <span className="font-semibold text-purple-200">Will you be making calls too?</span> Add yourself here — the app logs every call with the caller's name, so you'll want your own entry to appear in the history.
        </p>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        <input className={inputCls} placeholder="Caller name" value={name} onChange={e => { setName(e.target.value); setErr(""); }} />
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <button onClick={handleAdd} disabled={loading} className={btnCls}>
          {loading ? "Adding…" : "+ Add Caller"}
        </button>
      </div>

      {added.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {added.map((c, i) => (
            <Chip key={i} label={c} onRemove={() => setAdded(a => a.filter((_, j) => j !== i))} />
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

// Step 3 — Single Entry Code
function StepStaff({ onFinish }: { onFinish: () => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [confirm, setConfirm] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mainRefs = [0,1,2,3].map(() => ({ current: null as HTMLInputElement | null }));
  const confRefs = [0,1,2,3].map(() => ({ current: null as HTMLInputElement | null }));

  function handleDigit(arr: string[], set: (v: string[]) => void, refs: typeof mainRefs, i: number, val: string) {
    const c = val.replace(/\D/g, "").slice(-1);
    const next = [...arr]; next[i] = c; set(next); setErr("");
    if (c && i < 3) refs[i + 1].current?.focus();
  }
  function handleKey(arr: string[], set: (v: string[]) => void, refs: typeof mainRefs, i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !arr[i] && i > 0) refs[i - 1].current?.focus();
  }

  async function handleSave() {
    const pin = digits.join("");
    const conf = confirm.join("");
    if (pin.length < 4) { setErr("Enter all 4 digits"); return; }
    if (pin !== conf) { setErr("Codes don't match — try again"); return; }
    setSaving(true); setErr("");
    const orgCampus = getValidOrgSession()?.orgName ?? "MAIN";
    try {
      const token = getToken();
      const roles = ["lead", "deputy_lead", "attendance"];
      await Promise.all(roles.map(role =>
        fetch("/api/campus-passwords", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ campus: orgCampus, role, password: pin }),
        })
      ));
      setSaved(true);
    } catch {
      setErr("Failed to save — try again");
    } finally { setSaving(false); }
  }

  const boxCls = "w-14 h-16 rounded-xl border text-center text-2xl font-light outline-none transition-all duration-150 bg-neutral-900 text-white caret-transparent";
  const boxOff = `${boxCls} border-neutral-700`;
  const boxOn  = `${boxCls} border-purple-500 bg-purple-950/30`;

  return (
    <div>
      {!saved ? (
        <>
          <p className="text-neutral-400 text-sm mb-6">
            Create one 4-digit code your whole team uses to sign in. Everyone enters the same code — you can set separate codes for different roles later in the Admin Panel.
          </p>

          <div className="flex flex-col gap-6 mb-4">
            <div>
              <p className="text-neutral-500 text-xs mb-3">Choose your team code</p>
              <div className="flex gap-3 justify-center">
                {digits.map((d, i) => (
                  <input key={i} ref={el => { mainRefs[i].current = el; }} type="text" inputMode="numeric"
                    maxLength={1} value={d}
                    onChange={e => handleDigit(digits, setDigits, mainRefs, i, e.target.value)}
                    onKeyDown={e => handleKey(digits, setDigits, mainRefs, i, e)}
                    className={d ? boxOn : boxOff} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-neutral-500 text-xs mb-3">Confirm your code</p>
              <div className="flex gap-3 justify-center">
                {confirm.map((d, i) => (
                  <input key={i} ref={el => { confRefs[i].current = el; }} type="text" inputMode="numeric"
                    maxLength={1} value={d}
                    onChange={e => handleDigit(confirm, setConfirm, confRefs, i, e.target.value)}
                    onKeyDown={e => handleKey(confirm, setConfirm, confRefs, i, e)}
                    className={d ? boxOn : boxOff} />
                ))}
              </div>
            </div>
          </div>

          {err && <p className="text-red-400 text-xs text-center mb-2">{err}</p>}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
            <button onClick={onFinish} className="text-neutral-500 hover:text-neutral-300 text-sm transition">
              Skip for now →
            </button>
            <button onClick={handleSave} disabled={saving} className={btnCls}>
              {saving ? "Saving…" : "Save Code →"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center text-green-400 text-lg flex-shrink-0">✓</div>
            <div>
              <p className="text-white text-sm font-medium">Team code saved</p>
              <p className="text-neutral-500 text-xs mt-0.5">Your whole team can now sign in with that code.</p>
            </div>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl p-4 mb-5 flex flex-col gap-3">
            <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">For more security — in your Admin Panel you can:</p>
            <div className="flex gap-2.5 items-start">
              <span className="text-neutral-400 text-sm mt-0.5">•</span>
              <p className="text-neutral-300 text-sm"><span className="text-white font-medium">Service Lead code</span> — a separate code that takes staff directly to the attendance check-in screen, no team page access.</p>
            </div>
            <div className="flex gap-2.5 items-start">
              <span className="text-neutral-400 text-sm mt-0.5">•</span>
              <p className="text-neutral-300 text-sm"><span className="text-white font-medium">Prayer Contact code</span> — for volunteers adding contacts at the altar. A good default is your church's street address numbers (e.g. <span className="text-neutral-400 italic">1234</span>).</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-800">
            <button onClick={onFinish} className={btnCls}>
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Step 4 — Service Days & Times
function StepServiceTimes({ onFinish }: { onFinish: () => void }) {
  const orgName = getValidOrgSession()?.orgName ?? "MAIN";
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const combined = [selectedDay, selectedTime].filter(Boolean).join(" ");

  function addTime() {
    if (!combined.trim()) { setErr("Select a day and time"); return; }
    setErr("");
    if (times.includes(combined.trim())) return;
    setTimes(prev => [...prev, combined.trim()]);
    setSelectedDay("");
    setSelectedTime("");
  }

  function removeTime(idx: number) {
    setTimes(prev => prev.filter((_, i) => i !== idx));
  }

  // Build the serviceTimes map using the org name as the single campus key
  function buildServiceTimes() {
    if (times.length === 0) return {};
    return { [orgName]: times };
  }

  async function handleSave() {
    if (times.length === 0) { onFinish(); return; }
    setSaving(true);
    setErr("");
    try {
      const token = getToken();
      const serviceTimes = buildServiceTimes();
      const res = await fetch("/api/orgs/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ serviceTimes }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const raw = localStorage.getItem("orgSession");
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem("orgSession", JSON.stringify({ ...parsed, serviceTimes: data.serviceTimes, campuses: data.campuses ?? parsed.campuses }));
      }
      setSaved(true);
      setTimeout(onFinish, 800);
    } catch {
      setErr("Failed to save — try again");
    } finally {
      setSaving(false);
    }
  }

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const TIMES = ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM"];

  const pillBase = "text-xs rounded-lg px-3 py-1.5 border transition cursor-pointer select-none";
  const pillOff  = `${pillBase} bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500`;
  const pillOn   = `${pillBase} bg-purple-700 border-purple-500 text-white`;

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-5">
        Set the service times for your church. These appear when checking in workers and logging prayer contacts.
      </p>

      <div className="flex flex-col gap-4 mb-4">
        {/* Day picker */}
        <div>
          <label className="text-neutral-500 text-xs mb-2 block">Day</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => { setSelectedDay(prev => prev === d ? "" : d); setErr(""); }}
                className={selectedDay === d ? pillOn : pillOff}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Time picker */}
        <div>
          <label className="text-neutral-500 text-xs mb-2 block">Time</label>
          <div className="flex flex-wrap gap-1.5">
            {TIMES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setSelectedTime(prev => prev === t ? "" : t); setErr(""); }}
                className={selectedTime === t ? pillOn : pillOff}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            className={`${inputCls} mt-2`}
            placeholder="Or type a custom time…"
            value={selectedTime}
            onChange={e => { setSelectedTime(e.target.value); setErr(""); }}
          />
        </div>

        {/* Preview + add */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg px-4 py-2.5 border border-neutral-700 bg-neutral-900/50 text-sm text-neutral-300 min-h-[42px]">
            {combined || <span className="text-neutral-600">Select a day and time above</span>}
          </div>
          <button type="button" onClick={addTime} className={btnCls} style={{ flexShrink: 0 }}>
            + Add
          </button>
        </div>

        {err && <p className="text-red-400 text-xs">{err}</p>}
      </div>

      {/* Added service times */}
      {times.length > 0 && (
        <div className="mb-5 bg-neutral-800/60 border border-neutral-700 rounded-lg px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-neutral-700 rounded px-2.5 py-1 text-xs text-neutral-200">
                <span>{t}</span>
                <button onClick={() => removeTime(i)} className="text-neutral-500 hover:text-red-400 transition text-xs leading-none">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800">
        <button onClick={onFinish} className="text-neutral-500 hover:text-neutral-300 text-sm transition">
          Skip for now →
        </button>
        <button onClick={handleSave} disabled={saving || saved} className={btnCls}>
          {saved ? "Saved ✓" : saving ? "Saving…" : "Finish Setup →"}
        </button>
      </div>
    </div>
  );
}

// Step 5 — Access Code (PIN)
function StepAccessCode({ onFinish }: { onFinish: () => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [confirm, setConfirm] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mainRefs = [0,1,2,3].map(() => ({ current: null as HTMLInputElement | null }));
  const confRefs = [0,1,2,3].map(() => ({ current: null as HTMLInputElement | null }));

  function handleDigit(arr: string[], set: (v: string[]) => void, refs: typeof mainRefs, i: number, val: string) {
    const c = val.replace(/\D/g, "").slice(-1);
    const next = [...arr]; next[i] = c; set(next); setErr("");
    if (c && i < 3) refs[i + 1].current?.focus();
  }
  function handleKey(arr: string[], set: (v: string[]) => void, refs: typeof mainRefs, i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !arr[i] && i > 0) { refs[i - 1].current?.focus(); }
  }

  async function handleSave() {
    const pin = digits.join("");
    const conf = confirm.join("");
    if (pin.length < 4) { setErr("Enter all 4 digits"); return; }
    if (pin !== conf) { setErr("Codes don't match — try again"); return; }
    setSaving(true); setErr("");
    try {
      const token = getToken();
      const res = await fetch("/api/orgs/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed");
      setSaved(true);
      setTimeout(onFinish, 700);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save — try again");
    } finally { setSaving(false); }
  }

  const boxCls = "w-14 h-16 rounded-xl border text-center text-2xl font-light outline-none transition-all duration-150 bg-neutral-900 text-white caret-transparent";
  const boxOff = `${boxCls} border-neutral-700`;
  const boxOn  = `${boxCls} border-purple-500 bg-purple-950/30`;

  return (
    <div>
      <p className="text-neutral-400 text-sm mb-6">
        Create a 4-digit access code for your church. Staff can use this to quickly sign in from the PIN entry screen.
      </p>

      <div className="flex flex-col gap-6">
        <div>
          <p className="text-neutral-500 text-xs mb-3">Choose a 4-digit code</p>
          <div className="flex gap-3 justify-center">
            {digits.map((d, i) => (
              <input key={i} ref={el => { mainRefs[i].current = el; }} type="text" inputMode="numeric"
                maxLength={1} value={d}
                onChange={e => handleDigit(digits, setDigits, mainRefs, i, e.target.value)}
                onKeyDown={e => handleKey(digits, setDigits, mainRefs, i, e)}
                className={d ? boxOn : boxOff} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-neutral-500 text-xs mb-3">Confirm your code</p>
          <div className="flex gap-3 justify-center">
            {confirm.map((d, i) => (
              <input key={i} ref={el => { confRefs[i].current = el; }} type="text" inputMode="numeric"
                maxLength={1} value={d}
                onChange={e => handleDigit(confirm, setConfirm, confRefs, i, e.target.value)}
                onKeyDown={e => handleKey(confirm, setConfirm, confRefs, i, e)}
                className={d ? boxOn : boxOff} />
            ))}
          </div>
        </div>

        {err && <p className="text-red-400 text-xs text-center">{err}</p>}
      </div>

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-800">
        <button onClick={onFinish} className="text-neutral-500 hover:text-neutral-300 text-sm transition">
          Skip for now →
        </button>
        <button onClick={handleSave} disabled={saving || saved} className={btnCls}>
          {saved ? "Saved ✓" : saving ? "Saving…" : "Finish Setup →"}
        </button>
      </div>
    </div>
  );
}

// ── main wizard ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Altar Members", shortLabel: "Members" },
  { label: "Follow-up Callers", shortLabel: "Callers" },
  { label: "Team Entry Code", shortLabel: "Code" },
  { label: "Service Times", shortLabel: "Services" },
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
            {step === 2 && "Team Entry Code"}
            {step === 3 && "Service Days & Times"}
          </h2>
          <p className="text-neutral-600 text-xs mb-6">
            Step {step + 1} of {STEPS.length}
          </p>

          {step === 0 && <StepAltarMembers onNext={nextStep} />}
          {step === 1 && <StepCallers onNext={nextStep} />}
          {step === 2 && <StepStaff onFinish={nextStep} />}
          {step === 3 && <StepServiceTimes onFinish={finish} />}
        </div>

        <p className="text-center text-neutral-700 text-xs mt-6">
          You can change all of this later from your Admin Panel.
        </p>
      </main>
    </div>
  );
}

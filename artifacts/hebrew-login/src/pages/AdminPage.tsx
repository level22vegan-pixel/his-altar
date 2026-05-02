import { useState } from "react";
import { useGetLoginCode, useUpdateLoginCode, useListCampusPasswords, useSetCampusPassword } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const CAMPUSES = ["HALLMARK", "ARROWHEAD", "RIVERSIDE", "POMONA", "LA", "ARIZONA"];
const ROLES = [
  { id: "lead", label: "Lead" },
  { id: "deputy_lead", label: "Deputy Lead" },
];

const INPUT_S: React.CSSProperties = {
  background: "hsl(35 20% 14%)", border: "1px solid hsl(38 20% 25%)",
  color: "hsl(38 55% 70%)", fontFamily: "Georgia, serif",
  borderRadius: 4, padding: "7px 10px", width: "100%", fontSize: 12, outline: "none",
};

function CampusPasswordsPanel() {
  const queryClient = useQueryClient();
  const { data } = useListCampusPasswords({ query: { queryKey: ["campus-passwords"] } });
  const setPass = useSetCampusPassword();

  const [editing, setEditing] = useState<{ campus: string; role: string } | null>(null);
  const [seq, setSeq] = useState<number[]>([]);
  const [adminPw, setAdminPw] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const passwords = data?.passwords ?? [];

  const hasPassword = (campus: string, role: string) =>
    passwords.find(p => p.campus === campus && p.role === role)?.hasPassword ?? false;

  const openEdit = (campus: string, role: string) => {
    const isEditing = editing?.campus === campus && editing?.role === role;
    setEditing(isEditing ? null : { campus, role });
    setSeq([]);
    setAdminPw("");
    setMsg(null);
  };

  const handleSave = () => {
    if (!editing || seq.length === 0 || !adminPw) return;
    setPass.mutate(
      { data: { campus: editing.campus, role: editing.role, sequence: seq, adminPassword: adminPw } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["campus-passwords"] });
          setMsg({ type: "ok", text: `Sequence set for ${editing.campus} / ${ROLES.find(r => r.id === editing.role)?.label}` });
          setEditing(null); setSeq([]); setAdminPw("");
          setTimeout(() => setMsg(null), 3000);
        },
        onError: () => setMsg({ type: "err", text: "Failed — check admin password" }),
      }
    );
  };

  return (
    <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
      <p className="text-xs uppercase tracking-widest mb-1 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Campus Login Sequences</p>
      <p style={{ color: "hsl(38 22% 38%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.08em", marginBottom: 14 }}>Assign a Hebrew letter sequence for each campus role. Members use this sequence on the login screen.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {CAMPUSES.map(campus => (
          <div key={campus}>
            <div style={{ display: "flex", alignItems: "center", background: "hsl(35 18% 11%)", border: "1px solid hsl(38 15% 18%)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "hsl(38 50% 58%)", flex: 1, fontWeight: "bold" }}>{campus}</div>
              {ROLES.map(role => {
                const isSet = hasPassword(campus, role.id);
                const isEditing = editing?.campus === campus && editing?.role === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => openEdit(campus, role.id)}
                    style={{
                      padding: "8px 12px", fontFamily: "Georgia, serif", fontSize: 10,
                      letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                      borderLeft: "1px solid hsl(38 15% 18%)", transition: "all 0.15s",
                      background: isEditing ? "hsl(38 40% 20%)" : "none",
                      color: isEditing ? "hsl(38 70% 72%)" : isSet ? "hsl(130 55% 52%)" : "hsl(38 22% 38%)",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <span style={{ fontSize: 8 }}>{isSet ? "●" : "○"}</span>
                    {role.label}
                  </button>
                );
              })}
            </div>

            {editing?.campus === campus && (
              <div style={{ border: "1px solid hsl(38 25% 24%)", borderTop: "none", borderRadius: "0 0 6px 6px", padding: "14px", background: "hsl(35 18% 12%)", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Sequence display */}
                <div>
                  <label style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Tap letters to set sequence
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 36 }}>
                    {seq.length === 0 ? (
                      <span style={{ color: "hsl(38 20% 32%)", fontFamily: "Georgia, serif", fontSize: 11, fontStyle: "italic" }}>No letters selected</span>
                    ) : (
                      seq.map((n, i) => {
                        const l = HEBREW_ALPHABET.find(h => h.number === n);
                        return (
                          <span key={i} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "hsl(38 45% 22%)", border: "1px solid hsl(38 35% 30%)", borderRadius: 4, color: "hsl(38 70% 75%)", fontSize: 16, fontFamily: "serif" }}>
                            {l?.letter}
                          </span>
                        );
                      })
                    )}
                    {seq.length > 0 && (
                      <button onClick={() => setSeq(s => s.slice(0, -1))} style={{ marginLeft: 4, color: "hsl(38 25% 42%)", background: "none", border: "none", cursor: "pointer", fontSize: 11, fontFamily: "Georgia, serif", letterSpacing: "0.1em" }}>⌫</button>
                    )}
                  </div>
                </div>

                {/* Hebrew grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(11, 1fr)", gap: 4 }}>
                  {HEBREW_ALPHABET.map(item => (
                    <button
                      key={item.number}
                      onClick={() => setSeq(s => [...s, item.number])}
                      style={{
                        aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontFamily: "serif", cursor: "pointer",
                        background: "hsl(35 18% 16%)", border: "1px solid hsl(38 15% 22%)",
                        borderRadius: 4, color: "hsl(38 55% 65%)", transition: "all 0.1s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = "hsl(38 35% 22%)"; e.currentTarget.style.color = "hsl(38 70% 78%)"; }}
                      onMouseOut={e => { e.currentTarget.style.background = "hsl(35 18% 16%)"; e.currentTarget.style.color = "hsl(38 55% 65%)"; }}
                    >
                      {item.letter}
                    </button>
                  ))}
                </div>

                {/* Admin password + save */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ color: "hsl(38 25% 42%)", fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Admin Password</label>
                    <input type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSave()} placeholder="Your admin code..." style={{ background: "hsl(35 20% 14%)", border: "1px solid hsl(38 20% 25%)", color: "hsl(38 55% 70%)", fontFamily: "Georgia, serif", borderRadius: 4, padding: "7px 10px", width: "100%", fontSize: 12, outline: "none" }} />
                  </div>
                  <button onClick={handleSave} disabled={seq.length === 0 || !adminPw || setPass.isPending} style={{ background: "hsl(38 50% 28%)", color: "hsl(38 70% 80%)", border: "1px solid hsl(38 38% 35%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 16px", borderRadius: 4, cursor: "pointer", opacity: seq.length === 0 || !adminPw ? 0.4 : 1, whiteSpace: "nowrap" }}>
                    {setPass.isPending ? "Saving..." : "Set Sequence"}
                  </button>
                  <button onClick={() => { setEditing(null); setSeq([]); setAdminPw(""); }} style={{ background: "none", color: "hsl(38 25% 40%)", border: "1px solid hsl(38 15% 22%)", fontFamily: "Georgia, serif", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 12px", borderRadius: 4, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {msg && (
        <p style={{ color: msg.type === "ok" ? "hsl(130 55% 55%)" : "hsl(0 60% 55%)", fontFamily: "Georgia, serif", fontSize: 12, marginTop: 12, letterSpacing: "0.05em" }}>{msg.text}</p>
      )}
    </div>
  );
}

const HEBREW_ALPHABET = [
  { letter: "א", number: 1, name: "Alef" },
  { letter: "ב", number: 2, name: "Bet" },
  { letter: "ג", number: 3, name: "Gimel" },
  { letter: "ד", number: 4, name: "Dalet" },
  { letter: "ה", number: 5, name: "He" },
  { letter: "ו", number: 6, name: "Vav" },
  { letter: "ז", number: 7, name: "Zayin" },
  { letter: "ח", number: 8, name: "Chet" },
  { letter: "ט", number: 9, name: "Tet" },
  { letter: "י", number: 10, name: "Yod" },
  { letter: "כ", number: 11, name: "Kaf" },
  { letter: "ל", number: 12, name: "Lamed" },
  { letter: "מ", number: 13, name: "Mem" },
  { letter: "נ", number: 14, name: "Nun" },
  { letter: "ס", number: 15, name: "Samekh" },
  { letter: "ע", number: 16, name: "Ayin" },
  { letter: "פ", number: 17, name: "Pe" },
  { letter: "צ", number: 18, name: "Tsadi" },
  { letter: "ק", number: 19, name: "Qof" },
  { letter: "ר", number: 20, name: "Resh" },
  { letter: "ש", number: 21, name: "Shin" },
  { letter: "ת", number: 22, name: "Tav" },
];

export default function AdminPage() {
  const [, navigate] = useLocation();
  const [adminPassword, setAdminPassword] = useState("");
  const [newSequence, setNewSequence] = useState<number[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: config } = useGetLoginCode({ query: { queryKey: ["loginCode"] } });
  const updateMutation = useUpdateLoginCode();

  const letterByNumber = (n: number) => HEBREW_ALPHABET.find((l) => l.number === n);

  const handleLetterClick = (num: number) => {
    setNewSequence((prev) => [...prev, num]);
  };

  const handleSave = () => {
    if (newSequence.length === 0) {
      setMessage({ type: "error", text: "Please select at least one letter" });
      return;
    }
    updateMutation.mutate(
      { data: { code: newSequence, adminPassword } },
      {
        onSuccess: () => {
          setMessage({ type: "success", text: "Login code updated successfully" });
          setNewSequence([]);
          setAdminPassword("");
        },
        onError: () => {
          setMessage({ type: "error", text: "Failed — check admin password" });
        },
      }
    );
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-start py-12 px-4 overflow-hidden"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-xl">
        <button
          onClick={() => navigate("/")}
          className="mb-8 text-xs uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
        >
          &larr; Back to Login
        </button>

        <h1
          className="text-2xl mb-2 tracking-widest uppercase text-center"
          style={{ color: "hsl(38 60% 65%)", fontFamily: "Georgia, serif" }}
        >
          Admin Panel
        </h1>
        <p
          className="text-xs text-center mb-6 tracking-widest uppercase opacity-60"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
        >
          Manage settings &amp; tools
        </p>

        {/* Campus Passwords */}
        <CampusPasswordsPanel />

        {/* Tools section */}
        <div className="mb-8 p-4 rounded border" style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}>
          <p className="text-xs uppercase tracking-widest mb-3 opacity-60" style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}>Tools</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/admin/altar-report")}
              className="w-full py-3 px-5 text-sm uppercase tracking-widest rounded text-left flex items-center justify-between transition-all duration-200 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(35 35% 18%), hsl(35 30% 15%))", color: "hsl(38 65% 68%)", border: "1px solid hsl(38 30% 28%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer", boxShadow: "0 2px 10px hsl(38 40% 12% / 0.4)" }}
            >
              <span>Altar Report</span>
              <span style={{ opacity: 0.5 }}>→</span>
            </button>
            <button
              onClick={() => navigate("/admin/roster")}
              className="w-full py-3 px-5 text-sm uppercase tracking-widest rounded text-left flex items-center justify-between transition-all duration-200 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(35 35% 18%), hsl(35 30% 15%))", color: "hsl(38 65% 68%)", border: "1px solid hsl(38 30% 28%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em", cursor: "pointer", boxShadow: "0 2px 10px hsl(38 40% 12% / 0.4)" }}
            >
              <span>Roster Manager</span>
              <span style={{ opacity: 0.5 }}>→</span>
            </button>
          </div>
        </div>

        {/* Current code */}
        <div
          className="mb-6 p-4 rounded border"
          style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-2 opacity-60"
            style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
          >
            Current Login Sequence
          </p>
          {config ? (
            <div className="flex flex-wrap gap-3" style={{ direction: "rtl" }}>
              {config.code.map((num, idx) => {
                const l = letterByNumber(num);
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <span
                      className="text-3xl"
                      style={{ color: "hsl(38 70% 62%)", fontFamily: "Frank Ruhl Libre, Georgia, serif" }}
                    >
                      {l?.letter}
                    </span>
                    <span className="text-xs opacity-50" style={{ color: "hsl(38 35% 50%)" }}>
                      #{num}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm opacity-50" style={{ color: "hsl(38 35% 50%)" }}>Loading...</p>
          )}
        </div>

        {/* Build new sequence */}
        <div
          className="mb-4 p-4 rounded border"
          style={{ background: "hsl(35 20% 13%)", borderColor: "hsl(38 20% 22%)" }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-3 opacity-60"
            style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
          >
            New Sequence &mdash; click letters in order
          </p>
          <div className="grid grid-cols-6 gap-1 mb-4" style={{ direction: "rtl" }}>
            {HEBREW_ALPHABET.map((item) => (
              <button
                key={item.number}
                onClick={() => handleLetterClick(item.number)}
                title={`${item.name} (#${item.number})`}
                className="text-3xl py-2 rounded transition-all duration-150 hover:scale-105"
                style={{
                  color: "hsl(38 45% 48%)",
                  background: "transparent",
                  border: "none",
                  fontFamily: "Frank Ruhl Libre, Georgia, serif",
                  cursor: "pointer",
                }}
              >
                {item.letter}
              </button>
            ))}
          </div>

          {/* Selected preview */}
          {newSequence.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center mt-2 mb-1" style={{ direction: "rtl" }}>
              <span className="text-xs opacity-50 mr-2" style={{ color: "hsl(38 35% 50%)", direction: "ltr" }}>
                Selected:
              </span>
              {newSequence.map((num, idx) => {
                const l = letterByNumber(num);
                return (
                  <span
                    key={idx}
                    className="text-2xl"
                    style={{ color: "hsl(38 80% 68%)", fontFamily: "Frank Ruhl Libre, Georgia, serif" }}
                  >
                    {l?.letter}
                  </span>
                );
              })}
              <button
                onClick={() => setNewSequence([])}
                className="ml-3 text-xs opacity-50 hover:opacity-80"
                style={{ color: "hsl(38 35% 50%)", direction: "ltr", border: "none", background: "none", cursor: "pointer" }}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Sequence as numbers reference */}
        <div
          className="mb-6 p-4 rounded border"
          style={{ background: "hsl(35 18% 11%)", borderColor: "hsl(38 15% 20%)" }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-2 opacity-50"
            style={{ color: "hsl(38 30% 45%)", fontFamily: "Georgia, serif" }}
          >
            Letter Number Reference
          </p>
          <div className="grid grid-cols-4 gap-1 text-xs" style={{ direction: "ltr" }}>
            {HEBREW_ALPHABET.map((item) => (
              <div key={item.number} className="flex items-center gap-1">
                <span style={{ color: "hsl(38 60% 55%)", fontFamily: "Frank Ruhl Libre, Georgia, serif", fontSize: "1.1rem" }}>
                  {item.letter}
                </span>
                <span style={{ color: "hsl(38 25% 40%)" }}>= #{item.number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin password + save */}
        <div className="flex flex-col gap-3">
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full px-4 py-2 rounded text-sm"
            style={{
              background: "hsl(35 20% 14%)",
              border: "1px solid hsl(38 20% 25%)",
              color: "hsl(38 55% 70%)",
              fontFamily: "Georgia, serif",
              outline: "none",
            }}
          />
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending || newSequence.length === 0}
            className="w-full py-3 text-sm uppercase tracking-widest rounded transition-all duration-200 disabled:opacity-40"
            style={{
              background: "hsl(38 50% 32%)",
              color: "hsl(38 70% 82%)",
              border: "1px solid hsl(38 40% 42%)",
              fontFamily: "Georgia, serif",
              letterSpacing: "0.2em",
            }}
          >
            {updateMutation.isPending ? "Saving..." : "Save New Code"}
          </button>
        </div>

        {message && (
          <p
            className="mt-4 text-sm text-center tracking-wide fade-in"
            style={{
              color: message.type === "success" ? "hsl(38 80% 65%)" : "hsl(0 65% 55%)",
              fontFamily: "Georgia, serif",
            }}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

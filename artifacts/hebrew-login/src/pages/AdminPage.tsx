import { useState } from "react";
import { useGetLoginCode, useUpdateLoginCode } from "@workspace/api-client-react";
import { useLocation } from "wouter";

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
          className="text-xs text-center mb-8 tracking-widest uppercase opacity-60"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif" }}
        >
          Update the login sequence
        </p>

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

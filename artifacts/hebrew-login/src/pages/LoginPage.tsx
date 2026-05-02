import { useState, useCallback, useRef, useEffect } from "react";
import { useVerifyLogin } from "@workspace/api-client-react";
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

const HOLD_DURATION = 3000;

export default function LoginPage() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [shaking, setShaking] = useState(false);
  const [, navigate] = useLocation();

  // Long-press admin state
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [adminError, setAdminError] = useState(false);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);

  const verifyMutation = useVerifyLogin();

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  }, []);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setHolding(true);
    setHoldProgress(0);
    holdStartRef.current = Date.now();

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(elapsed / HOLD_DURATION, 1));
    }, 30);

    holdTimerRef.current = setTimeout(() => {
      clearHoldTimers();
      setHolding(false);
      setHoldProgress(0);
      setShowAdminPrompt(true);
    }, HOLD_DURATION);
  }, [clearHoldTimers]);

  const cancelHold = useCallback(() => {
    clearHoldTimers();
    setHolding(false);
    setHoldProgress(0);
  }, [clearHoldTimers]);

  // Clean up on unmount
  useEffect(() => () => clearHoldTimers(), [clearHoldTimers]);

  const handleLetterClick = useCallback(
    (letterNum: number) => {
      if (status === "success" || verifyMutation.isPending) return;
      if (letterNum === 22) return; // ת handled via long-press only
      const newSeq = [...sequence, letterNum];
      const newSelected = new Set(selectedLetters);
      newSelected.add(letterNum);
      setSequence(newSeq);
      setSelectedLetters(newSelected);
      setStatus("idle");

      // Auto-verify on every press
      verifyMutation.mutate(
        { data: { sequence: newSeq } },
        {
          onSuccess: (data) => {
            if (data.success) {
              setStatus("success");
              setTimeout(() => navigate("/home"), 600);
            } else {
              setStatus("error");
              setShaking(true);
              setTimeout(() => {
                setShaking(false);
                setStatus("idle");
                setSequence([]);
                setSelectedLetters(new Set());
              }, 600);
            }
          },
          onError: () => {
            setStatus("error");
            setShaking(true);
            setTimeout(() => {
              setShaking(false);
              setStatus("idle");
              setSequence([]);
              setSelectedLetters(new Set());
            }, 600);
          },
        }
      );
    },
    [sequence, selectedLetters, status, verifyMutation, navigate]
  );

  const handleAdminSubmit = useCallback(() => {
    if (adminCode === "admin1234") {
      setShowAdminPrompt(false);
      setAdminCode("");
      setAdminError(false);
      navigate("/admin");
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 1500);
    }
  }, [adminCode, navigate]);

  const circumference = 2 * Math.PI * 28;

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
      {/* Rustic background gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, hsl(35 30% 16%) 0%, hsl(35 20% 9%) 60%, hsl(30 18% 7%) 100%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, hsl(30 18% 5% / 0.8) 100%)",
        }}
      />

      {/* Hebrew letters grid */}
      <div className="relative z-10 w-full flex flex-col items-center px-4">
        <div
          className={`w-full max-w-3xl grid grid-cols-4 sm:grid-cols-6 gap-y-2 gap-x-1 px-2 py-6 ${shaking ? "shake" : ""}`}
          style={{ direction: "rtl" }}
        >
          {HEBREW_ALPHABET.map((item) => {
            const isSelected = selectedLetters.has(item.number);
            const isError = status === "error" && isSelected;
            const isSuccess = status === "success" && isSelected;
            const isTav = item.number === 22;

            if (isTav) {
              return (
                <div
                  key={item.number}
                  className="relative flex items-center justify-center"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  onTouchCancel={cancelHold}
                >
                  {/* Circular progress ring */}
                  {holding && (
                    <svg
                      className="absolute"
                      width="64"
                      height="64"
                      style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                    >
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="hsl(38 20% 25%)"
                        strokeWidth="2"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="hsl(38 80% 60%)"
                        strokeWidth="2"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - holdProgress)}
                        strokeLinecap="round"
                        style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.03s linear" }}
                      />
                    </svg>
                  )}
                  <span
                    className="hebrew-letter text-5xl sm:text-6xl leading-none py-3 px-1"
                    style={{
                      color: holding
                        ? "hsl(38 90% 72%)"
                        : "hsl(38 40% 45%)",
                      fontFamily: "'Frank Ruhl Libre', 'David Libre', serif",
                      textShadow: holding ? "0 0 18px hsl(38 80% 68% / 0.6)" : "none",
                      transition: "color 0.2s, text-shadow 0.2s",
                    }}
                    aria-label={item.name}
                  >
                    {item.letter}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={item.number}
                onClick={() => handleLetterClick(item.number)}
                className={`hebrew-letter text-5xl sm:text-6xl leading-none py-3 px-1 rounded bg-transparent border-0 outline-none
                  ${isError ? "error" : ""}
                  ${isSuccess ? "selected" : ""}
                  ${isSelected && status === "idle" ? "selected" : ""}
                `}
                style={{
                  color: isSelected
                    ? isError
                      ? "hsl(0 70% 55%)"
                      : isSuccess
                      ? "hsl(38 90% 72%)"
                      : "hsl(38 85% 68%)"
                    : "hsl(38 40% 45%)",
                  fontFamily: "'Frank Ruhl Libre', 'David Libre', serif",
                }}
                aria-label={item.name}
              >
                {item.letter}
              </button>
            );
          })}
        </div>

      </div>

      {/* Admin code prompt overlay */}
      {showAdminPrompt && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center fade-in"
          style={{ background: "hsl(30 18% 5% / 0.85)" }}
        >
          <div
            className="flex flex-col items-center gap-5 p-8 rounded"
            style={{
              background: "hsl(35 22% 12%)",
              border: "1px solid hsl(38 25% 25%)",
              boxShadow: "0 8px 48px hsl(30 18% 5% / 0.7)",
              minWidth: "280px",
            }}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px" style={{ background: "hsl(38 30% 25%)" }} />
              <span style={{ color: "hsl(38 45% 40%)", fontFamily: "Georgia, serif" }}>✦</span>
              <div className="flex-1 h-px" style={{ background: "hsl(38 30% 25%)" }} />
            </div>
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: "hsl(38 40% 55%)", fontFamily: "Georgia, serif", letterSpacing: "0.25em" }}
            >
              Admin Access
            </p>
            <input
              type="password"
              autoFocus
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminSubmit()}
              placeholder="Enter code"
              className="w-full px-4 py-2 rounded text-sm text-center"
              style={{
                background: "hsl(35 18% 10%)",
                border: `1px solid ${adminError ? "hsl(0 60% 40%)" : "hsl(38 20% 28%)"}`,
                color: "hsl(38 55% 70%)",
                fontFamily: "Georgia, serif",
                outline: "none",
                letterSpacing: "0.2em",
                transition: "border-color 0.2s",
              }}
            />
            {adminError && (
              <p
                className="text-xs tracking-widest fade-in"
                style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif" }}
              >
                Invalid code
              </p>
            )}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setShowAdminPrompt(false); setAdminCode(""); setAdminError(false); }}
                className="flex-1 py-2 text-xs uppercase tracking-widest rounded transition-opacity opacity-50 hover:opacity-80"
                style={{
                  color: "hsl(38 35% 50%)",
                  border: "1px solid hsl(38 15% 25%)",
                  background: "transparent",
                  fontFamily: "Georgia, serif",
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdminSubmit}
                className="flex-1 py-2 text-xs uppercase tracking-widest rounded"
                style={{
                  background: "hsl(38 50% 30%)",
                  color: "hsl(38 70% 80%)",
                  border: "1px solid hsl(38 40% 38%)",
                  fontFamily: "Georgia, serif",
                  letterSpacing: "0.15em",
                  cursor: "pointer",
                }}
              >
                Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

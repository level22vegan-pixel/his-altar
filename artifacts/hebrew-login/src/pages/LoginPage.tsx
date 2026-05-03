import { useState, useCallback, useRef, useEffect } from "react";
import { useVerifyLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { setAdminSession, setCampusSession } from "@/lib/session";

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
    // Don't preventDefault — a quick release should still register as a tap
    e.stopPropagation();
    holdStartRef.current = Date.now();
    setHolding(true);
    setHoldProgress(0);

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      setHoldProgress(Math.min(elapsed / HOLD_DURATION, 1));
    }, 30);

    holdTimerRef.current = setTimeout(() => {
      clearHoldTimers();
      setHolding(false);
      setHoldProgress(0);
      setAdminSession();
      navigate("/admin");
    }, HOLD_DURATION);
  }, [clearHoldTimers, navigate]);

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
              const role = data.role;
              const campus = data.campus;
              if (campus) {
                setCampusSession(campus, role);
              } else {
                setAdminSession();
              }
              const dest = role === "lead" ? "/admin" : "/home";
              setTimeout(() => navigate(dest), 600);
            } else if (!data.partial) {
              // Definitively wrong (not a valid prefix) — shake and reset
              setStatus("error");
              setShaking(true);
              setTimeout(() => {
                setShaking(false);
                setStatus("idle");
                setSequence([]);
                setSelectedLetters(new Set());
              }, 600);
            }
            // If partial === true, user is mid-sequence — do nothing, wait for next tap
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

  // Release handler for Tav: quick tap → normal letter; full hold → already navigated
  const endHold = useCallback(() => {
    const elapsed = Date.now() - holdStartRef.current;
    const didComplete = holdTimerRef.current === null && holdIntervalRef.current === null;
    cancelHold();
    // Only treat as tap if the hold timer hadn't already fired (i.e., didn't complete)
    if (!didComplete && elapsed < HOLD_DURATION) {
      handleLetterClick(22);
    }
  }, [cancelHold, handleLetterClick]);

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
                  onMouseUp={endHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={endHold}
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

    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { useVerifyLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { setAdminSession, setCampusSession } from "@/lib/session";

const ADMIN_HOLD_PASSWORD = "admin4680";

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

  // Long-press state — Tav (admin)
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Password prompt after Tav hold
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [holdPassword, setHoldPassword] = useState("");
  const [holdPasswordError, setHoldPasswordError] = useState(false);

  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef    = useRef<number>(0);

  // Long-press state — Alef (dbanc / follow-up)
  const [alefHolding, setAlefHolding]         = useState(false);
  const [alefHoldProgress, setAlefHoldProgress] = useState(0);
  const alefHoldTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alefHoldIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alefHoldStartRef    = useRef<number>(0);

  const verifyMutation = useVerifyLogin();

  // ── Tav hold (admin password) ─────────────────────────────────────────────
  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  }, []);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    holdStartRef.current = Date.now();
    setHolding(true);
    setHoldProgress(0);
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(Math.min((Date.now() - holdStartRef.current) / HOLD_DURATION, 1));
    }, 30);
    holdTimerRef.current = setTimeout(() => {
      clearHoldTimers();
      setHolding(false);
      setHoldProgress(0);
      setShowPasswordModal(true);
      setHoldPassword("");
      setHoldPasswordError(false);
    }, HOLD_DURATION);
  }, [clearHoldTimers]);

  const cancelHold = useCallback(() => {
    clearHoldTimers();
    setHolding(false);
    setHoldProgress(0);
  }, [clearHoldTimers]);

  // ── Alef hold (tap → Dbanc new; hold → follow-up login) ──────────────────
  const clearAlefHoldTimers = useCallback(() => {
    if (alefHoldTimerRef.current) clearTimeout(alefHoldTimerRef.current);
    if (alefHoldIntervalRef.current) clearInterval(alefHoldIntervalRef.current);
    alefHoldTimerRef.current = null;
    alefHoldIntervalRef.current = null;
  }, []);

  const startAlefHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    alefHoldStartRef.current = Date.now();
    setAlefHolding(true);
    setAlefHoldProgress(0);
    alefHoldIntervalRef.current = setInterval(() => {
      setAlefHoldProgress(Math.min((Date.now() - alefHoldStartRef.current) / HOLD_DURATION, 1));
    }, 30);
    alefHoldTimerRef.current = setTimeout(() => {
      clearAlefHoldTimers();
      setAlefHolding(false);
      setAlefHoldProgress(0);
      navigate("/caller-login");
    }, HOLD_DURATION);
  }, [clearAlefHoldTimers, navigate]);

  const cancelAlefHold = useCallback(() => {
    clearAlefHoldTimers();
    setAlefHolding(false);
    setAlefHoldProgress(0);
  }, [clearAlefHoldTimers]);

  const endAlefHold = useCallback(() => {
    const elapsed = Date.now() - alefHoldStartRef.current;
    const didComplete = alefHoldTimerRef.current === null && alefHoldIntervalRef.current === null;
    cancelAlefHold();
    if (!didComplete && elapsed < HOLD_DURATION) {
      // Must have a valid session to access protected routes
      setAdminSession();
      navigate("/admin/dbanc/new");
    }
  }, [cancelAlefHold, navigate]);

  // Clean up on unmount
  useEffect(() => () => { clearHoldTimers(); clearAlefHoldTimers(); }, [clearHoldTimers, clearAlefHoldTimers]);

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
                setCampusSession(campus, role ?? "lead");
              } else {
                setAdminSession();
              }
              setTimeout(() => navigate("/home"), 600);
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

  const submitHoldPassword = useCallback(() => {
    if (holdPassword === ADMIN_HOLD_PASSWORD) {
      setShowPasswordModal(false);
      setHoldPassword("");
      setHoldPasswordError(false);
      setAdminSession();
      navigate("/home");
    } else {
      setHoldPasswordError(true);
      setHoldPassword("");
      setTimeout(() => setHoldPasswordError(false), 1200);
    }
  }, [holdPassword, navigate]);

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
            const isError   = status === "error"   && isSelected;
            const isSuccess = status === "success" && isSelected;
            const isTav  = item.number === 22;
            const isAlef = item.number === 1;

            // ── Tav — hold for admin password ────────────────────────────────
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
                  {holding && (
                    <svg className="absolute" width="64" height="64" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                      <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(38 20% 25%)" strokeWidth="2" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(38 80% 60%)" strokeWidth="2"
                        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - holdProgress)}
                        strokeLinecap="round"
                        style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.03s linear" }}
                      />
                    </svg>
                  )}
                  <span
                    className="hebrew-letter text-5xl sm:text-6xl leading-none py-3 px-1"
                    style={{
                      color: holding ? "hsl(38 90% 72%)" : "hsl(38 40% 45%)",
                      fontFamily: "'Arial Hebrew', 'Arial Unicode MS', Arial, sans-serif",
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

            // ── Alef — tap → Dbanc new contact; hold → follow-up login ───────
            if (isAlef) {
              return (
                <div
                  key={item.number}
                  className="relative flex items-center justify-center"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onMouseDown={startAlefHold}
                  onMouseUp={endAlefHold}
                  onMouseLeave={cancelAlefHold}
                  onTouchStart={startAlefHold}
                  onTouchEnd={endAlefHold}
                  onTouchCancel={cancelAlefHold}
                >
                  {alefHolding && (
                    <svg className="absolute" width="64" height="64" style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                      <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(270 20% 25%)" strokeWidth="2" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(270 70% 65%)" strokeWidth="2"
                        strokeDasharray={circumference} strokeDashoffset={circumference * (1 - alefHoldProgress)}
                        strokeLinecap="round"
                        style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.03s linear" }}
                      />
                    </svg>
                  )}
                  <span
                    className="hebrew-letter text-5xl sm:text-6xl leading-none py-3 px-1"
                    style={{
                      color: alefHolding ? "hsl(270 75% 78%)" : "hsl(38 40% 45%)",
                      fontFamily: "'Arial Hebrew', 'Arial Unicode MS', Arial, sans-serif",
                      textShadow: alefHolding ? "0 0 18px hsl(270 65% 65% / 0.6)" : "none",
                      transition: "color 0.2s, text-shadow 0.2s",
                    }}
                    aria-label={item.name}
                  >
                    {item.letter}
                  </span>
                </div>
              );
            }

            // ── All other letters ─────────────────────────────────────────────
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
                    ? isError   ? "hsl(0 70% 55%)"
                    : isSuccess ? "hsl(38 90% 72%)"
                                : "hsl(38 85% 68%)"
                    : "hsl(38 40% 45%)",
                  fontFamily: "'Arial Hebrew', 'Arial Unicode MS', Arial, sans-serif",
                }}
                aria-label={item.name}
              >
                {item.letter}
              </button>
            );
          })}
        </div>

      </div>

      {/* Password modal after Tav hold */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "hsl(30 18% 5% / 0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => { setShowPasswordModal(false); setHoldPassword(""); setHoldPasswordError(false); }}
        >
          <div
            style={{
              background: "hsl(35 20% 10%)",
              border: `1px solid ${holdPasswordError ? "hsl(0 50% 35%)" : "hsl(38 30% 24%)"}`,
              borderRadius: 12,
              padding: "32px 28px",
              minWidth: 280,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              boxShadow: "0 8px 40px hsl(30 18% 4% / 0.8)",
              transition: "border-color 0.2s",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "hsl(38 80% 60%)", letterSpacing: "0.08em" }}>ת</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "hsl(38 45% 52%)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Enter Password
            </div>
            <input
              autoFocus
              type="password"
              value={holdPassword}
              onChange={e => setHoldPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitHoldPassword(); if (e.key === "Escape") { setShowPasswordModal(false); setHoldPassword(""); setHoldPasswordError(false); } }}
              style={{
                width: "100%",
                background: "hsl(35 18% 7%)",
                border: `1px solid ${holdPasswordError ? "hsl(0 55% 40%)" : "hsl(38 25% 22%)"}`,
                borderRadius: 6,
                color: holdPasswordError ? "hsl(0 70% 60%)" : "hsl(38 60% 70%)",
                fontFamily: "Georgia, serif",
                fontSize: 16,
                padding: "9px 12px",
                outline: "none",
                textAlign: "center",
                letterSpacing: "0.15em",
                transition: "border-color 0.2s, color 0.2s",
              }}
              placeholder="••••••••"
            />
            {holdPasswordError && (
              <div style={{ color: "hsl(0 65% 55%)", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "0.1em" }}>
                Incorrect password
              </div>
            )}
            <button
              onClick={submitHoldPassword}
              style={{
                width: "100%",
                background: "hsl(38 30% 14%)",
                border: "1px solid hsl(38 35% 26%)",
                borderRadius: 6,
                color: "hsl(38 70% 58%)",
                fontFamily: "Georgia, serif",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "9px 0",
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

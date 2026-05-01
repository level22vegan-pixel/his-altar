import { useState, useCallback, useEffect } from "react";
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

export default function LoginPage() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [shaking, setShaking] = useState(false);
  const [, navigate] = useLocation();

  const verifyMutation = useVerifyLogin();

  const handleLetterClick = useCallback(
    (letterNum: number) => {
      if (status === "success") return;
      const newSeq = [...sequence, letterNum];
      const newSelected = new Set(selectedLetters);
      newSelected.add(letterNum);
      setSequence(newSeq);
      setSelectedLetters(newSelected);
      setStatus("idle");
    },
    [sequence, selectedLetters, status]
  );

  const handleSubmit = useCallback(() => {
    if (sequence.length === 0) return;
    verifyMutation.mutate(
      { sequence },
      {
        onSuccess: (data) => {
          if (data.success) {
            setStatus("success");
            setTimeout(() => navigate("/home"), 900);
          } else {
            setStatus("error");
            setShaking(true);
            setTimeout(() => {
              setShaking(false);
              setStatus("idle");
              setSequence([]);
              setSelectedLetters(new Set());
            }, 700);
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
          }, 700);
        },
      }
    );
  }, [sequence, verifyMutation, navigate]);

  const handleClear = useCallback(() => {
    setSequence([]);
    setSelectedLetters(new Set());
    setStatus("idle");
  }, []);

  const dotCount = Math.max(5, sequence.length + 1);

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

        {/* Progress dots */}
        <div className="flex gap-2 mt-2 mb-4">
          {Array.from({ length: dotCount }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-2 h-2 rounded-full transition-all duration-200"
              style={{
                background:
                  i < sequence.length
                    ? status === "error"
                      ? "hsl(0 70% 55%)"
                      : "hsl(38 80% 60%)"
                    : "hsl(38 20% 30%)",
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-1">
          <button
            onClick={handleClear}
            disabled={sequence.length === 0}
            className="px-5 py-2 text-sm rounded border tracking-widest uppercase transition-all duration-200 disabled:opacity-30"
            style={{
              color: "hsl(38 40% 55%)",
              borderColor: "hsl(38 20% 30%)",
              background: "transparent",
              letterSpacing: "0.15em",
              fontFamily: "Georgia, serif",
            }}
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={sequence.length === 0 || verifyMutation.isPending}
            className="px-8 py-2 text-sm rounded tracking-widest uppercase transition-all duration-200 disabled:opacity-30"
            style={{
              background: "hsl(38 55% 35%)",
              color: "hsl(38 70% 85%)",
              border: "1px solid hsl(38 45% 45%)",
              letterSpacing: "0.15em",
              fontFamily: "Georgia, serif",
              boxShadow: "0 2px 12px hsl(38 55% 25% / 0.4)",
            }}
          >
            {verifyMutation.isPending ? "..." : "Enter"}
          </button>
        </div>

        {status === "error" && (
          <p
            className="mt-4 text-sm tracking-widest fade-in"
            style={{ color: "hsl(0 60% 55%)", fontFamily: "Georgia, serif" }}
          >
            Access denied
          </p>
        )}
        {status === "success" && (
          <p
            className="mt-4 text-sm tracking-widest fade-in"
            style={{ color: "hsl(38 80% 65%)", fontFamily: "Georgia, serif" }}
          >
            Welcome...
          </p>
        )}
      </div>

      {/* Ornamental footer text */}
      <div
        className="absolute bottom-6 left-0 right-0 text-center text-xs tracking-widest uppercase z-10"
        style={{ color: "hsl(38 25% 35%)", fontFamily: "Georgia, serif", letterSpacing: "0.3em" }}
      >
        Select the letters &bull; Press Enter
      </div>
    </div>
  );
}

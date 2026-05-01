import { useLocation } from "wouter";

export default function HomePage() {
  const [, navigate] = useLocation();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, hsl(35 28% 14%) 0%, hsl(35 18% 8%) 70%, hsl(30 16% 6%) 100%)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(30 16% 4% / 0.85) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-6 text-center">
        {/* Decorative line */}
        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
          <span style={{ color: "hsl(38 50% 45%)", fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>
            ✦
          </span>
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
        </div>

        {/* Main button */}
        <button
          onClick={() => alert("Campus selection coming soon")}
          className="campus-btn px-12 py-4 text-base uppercase tracking-widest rounded"
          style={{
            background: "linear-gradient(135deg, hsl(35 40% 22%), hsl(35 35% 18%))",
            color: "hsl(38 70% 72%)",
            border: "1px solid hsl(38 40% 35%)",
            fontFamily: "Georgia, serif",
            letterSpacing: "0.25em",
            boxShadow: "0 4px 24px hsl(38 50% 20% / 0.4), inset 0 1px 0 hsl(38 50% 40% / 0.2)",
          }}
        >
          Select Campus
        </button>

        {/* Decorative line bottom */}
        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
          <span style={{ color: "hsl(38 50% 45%)", fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>
            ✦
          </span>
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
        </div>
      </div>

      {/* Back to login */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase transition-opacity duration-200 opacity-40 hover:opacity-80"
        style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
      >
        &larr; Back
      </button>
    </div>
  );
}

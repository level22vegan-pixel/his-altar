import { useLocation } from "wouter";

const SERVICES = [
  "Sunday 8am",
  "Sunday 9am",
  "Wednesday 7pm",
];

export default function LAPage() {
  const [, navigate] = useLocation();

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, hsl(35 28% 14%) 0%, hsl(35 18% 8%) 70%, hsl(30 16% 6%) 100%)",
        }}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, hsl(30 16% 4% / 0.85) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center w-full max-w-sm">
        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
          <span style={{ color: "hsl(38 50% 45%)", fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>✦</span>
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
        </div>

        <p
          className="text-xs uppercase tracking-widest opacity-60"
          style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.3em" }}
        >
          LA
        </p>

        <div className="flex flex-col gap-3 w-full fade-in">
          {SERVICES.map((service) => (
            <button
              key={service}
              onClick={() => navigate(`/checkin?campus=LA&service=${encodeURIComponent(service)}`)}
              className="campus-btn py-4 px-6 text-sm uppercase rounded w-full"
              style={{
                background: "linear-gradient(135deg, hsl(35 38% 20%), hsl(35 32% 16%))",
                color: "hsl(38 65% 68%)",
                border: "1px solid hsl(38 35% 30%)",
                fontFamily: "Georgia, serif",
                letterSpacing: "0.2em",
                boxShadow: "0 2px 12px hsl(38 40% 15% / 0.4), inset 0 1px 0 hsl(38 45% 35% / 0.15)",
              }}
            >
              {service}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
          <span style={{ color: "hsl(38 50% 45%)", fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>✦</span>
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
        </div>
      </div>

      <button
        onClick={() => navigate("/home")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase transition-opacity duration-200 opacity-40 hover:opacity-80"
        style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
      >
        &larr; Back
      </button>
    </div>
  );
}

import { useLocation } from "wouter";

const CIRCLES = [
  {
    label: "Manual Update",
    bg: "radial-gradient(circle at 35% 35%, hsl(220 80% 45%), hsl(220 70% 28%))",
    border: "hsl(220 60% 55%)",
    shadow: "hsl(220 70% 20% / 0.6)",
    icon: "✦",
  },
  {
    label: "Automatic Update",
    bg: "radial-gradient(circle at 35% 35%, hsl(0 75% 48%), hsl(0 65% 30%))",
    border: "hsl(0 60% 58%)",
    shadow: "hsl(0 65% 18% / 0.6)",
    icon: "⟳",
  },
  {
    label: "User Sign In",
    bg: "radial-gradient(circle at 35% 35%, hsl(0 0% 95%), hsl(0 0% 78%))",
    border: "hsl(0 0% 88%)",
    shadow: "hsl(0 0% 10% / 0.4)",
    textColor: "hsl(220 60% 22%)",
    icon: "★",
  },
];

export default function DbancPage() {
  const [, navigate] = useLocation();

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(160deg, hsl(220 65% 14%) 0%, hsl(220 55% 10%) 40%, hsl(0 60% 14%) 100%)",
      }}
    >
      {/* Stars background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(0 0% 100% / 0.55) 1px, transparent 1px), radial-gradient(circle, hsl(0 0% 100% / 0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px, 40px 40px",
          backgroundPosition: "0 0, 20px 20px",
        }}
      />

      {/* Red stripe accent top */}
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: "hsl(0 72% 45%)" }} />
      {/* White stripe */}
      <div className="absolute top-2 left-0 right-0 h-1" style={{ background: "hsl(0 0% 95%)" }} />
      {/* Red stripe accent bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-2" style={{ background: "hsl(0 72% 45%)" }} />
      <div className="absolute bottom-2 left-0 right-0 h-1" style={{ background: "hsl(0 0% 95%)" }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full">
        {/* Header */}
        <div className="text-center mb-4">
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
              color: "hsl(0 0% 97%)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textShadow: "0 2px 18px hsl(220 80% 30% / 0.7), 0 0 40px hsl(0 70% 40% / 0.3)",
              fontWeight: "bold",
            }}
          >
            Dbanc
          </h1>
          <div
            style={{
              width: 60,
              height: 2,
              background: "linear-gradient(90deg, hsl(0 72% 50%), hsl(0 0% 95%), hsl(220 70% 50%))",
              margin: "10px auto 0",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Three big circles */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full"
          style={{ maxWidth: 900 }}
        >
          {CIRCLES.map((c) => (
            <button
              key={c.label}
              style={{
                width: "clamp(160px, 28vw, 220px)",
                height: "clamp(160px, 28vw, 220px)",
                borderRadius: "50%",
                background: c.bg,
                border: `3px solid ${c.border}`,
                boxShadow: `0 8px 40px ${c.shadow}, inset 0 2px 0 hsl(0 0% 100% / 0.18), 0 0 0 6px hsl(0 0% 100% / 0.06)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 14px 55px ${c.shadow}, inset 0 2px 0 hsl(0 0% 100% / 0.22), 0 0 0 8px hsl(0 0% 100% / 0.1)`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 40px ${c.shadow}, inset 0 2px 0 hsl(0 0% 100% / 0.18), 0 0 0 6px hsl(0 0% 100% / 0.06)`;
              }}
            >
              <span
                style={{
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  color: c.textColor ?? "hsl(0 0% 97%)",
                  lineHeight: 1,
                }}
              >
                {c.icon}
              </span>
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(0.65rem, 1.6vw, 0.85rem)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: c.textColor ?? "hsl(0 0% 97%)",
                  textAlign: "center",
                  fontWeight: "bold",
                  padding: "0 12px",
                  textShadow: c.textColor ? "none" : "0 1px 6px hsl(0 0% 0% / 0.4)",
                }}
              >
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate("/admin")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase transition-opacity duration-200 opacity-50 hover:opacity-90"
        style={{
          color: "hsl(0 0% 90%)",
          fontFamily: "Georgia, serif",
          letterSpacing: "0.2em",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        ← Admin
      </button>
    </div>
  );
}

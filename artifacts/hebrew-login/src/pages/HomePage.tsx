import { useMemo, useState } from "react";
import { useLocation, Link } from "wouter";
import { getValidCampusSession, getValidAdminSession } from "@/lib/session";
import { getOrgCampuses } from "@/lib/useOrgConfig";

function campusHref(campus: string): string {
  const map: Record<string, string> = {
    HALLMARK: "/campus/hallmark",
    ARROWHEAD: "/campus/arrowhead",
    RIVERSIDE: "/campus/riverside",
    POMONA: "/campus/pomona",
    LA: "/campus/la",
    ARIZONA: "/campus/arizona",
  };
  return map[campus] ?? `/campus/${campus.toLowerCase().replace(/\s+/g, "-")}`;
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const CAMPUSES = getOrgCampuses();
  const [showCampuses, setShowCampuses] = useState(false);

  const session = useMemo(() => getValidCampusSession(), []);
  const isAdmin = useMemo(() => getValidAdminSession(), []);

  const scopedCampus = session?.campus ?? null;

  const btnStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, hsl(35 38% 20%), hsl(35 32% 16%))",
    color: "hsl(38 65% 68%)",
    border: "1px solid hsl(38 35% 30%)",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.2em",
    boxShadow: "0 2px 12px hsl(38 40% 15% / 0.4), inset 0 1px 0 hsl(38 45% 35% / 0.15)",
  };

  const disabledBtnStyle: React.CSSProperties = {
    background: "hsl(35 20% 12%)",
    color: "hsl(38 20% 30%)",
    border: "1px solid hsl(38 15% 20%)",
    fontFamily: "Georgia, serif",
    letterSpacing: "0.2em",
    cursor: "not-allowed",
    opacity: 0.4,
  };

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

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center w-full max-w-lg">
        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
          <span style={{ color: "hsl(38 50% 45%)", fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>✦</span>
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
        </div>

        {!showCampuses ? (
          <button
            onClick={() => setShowCampuses(true)}
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
        ) : (
          <div className="flex flex-col items-center gap-3 w-full fade-in">
            <p
              className="text-xs uppercase tracking-widest mb-1 opacity-60"
              style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.3em" }}
            >
              Choose Your Campus
            </p>
            <div className="grid grid-cols-2 gap-3 w-full">
              {CAMPUSES.map((campus) => {
                const isEnabled = !scopedCampus || campus === scopedCampus;
                return isEnabled ? (
                  <Link key={campus} href={campusHref(campus)}>
                    <button className="campus-btn py-4 px-4 text-sm uppercase rounded w-full" style={btnStyle}>
                      {campus}
                    </button>
                  </Link>
                ) : (
                  <button key={campus} className="py-4 px-4 text-sm uppercase rounded w-full" style={disabledBtnStyle} disabled>
                    {campus}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowCampuses(false)}
              className="mt-2 text-xs uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", border: "none", background: "none", cursor: "pointer", letterSpacing: "0.2em" }}
            >
              ← Back
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 w-64">
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
          <span style={{ color: "hsl(38 50% 45%)", fontFamily: "Georgia, serif", fontSize: "1.4rem" }}>✦</span>
          <div className="flex-1 h-px" style={{ background: "hsl(38 35% 30%)" }} />
        </div>
      </div>

      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-6 z-10 text-xs tracking-widest uppercase transition-opacity duration-200 opacity-40 hover:opacity-80"
        style={{ color: "hsl(38 35% 50%)", fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}
      >
        &larr; Login
      </button>

      {(isAdmin || session?.role === "lead") && (
        <button
          onClick={() => navigate("/admin")}
          className="absolute top-5 right-6 z-10 text-xs tracking-widest uppercase transition-opacity duration-200 opacity-50 hover:opacity-90"
          style={{
            color: "hsl(38 60% 62%)",
            fontFamily: "Georgia, serif",
            letterSpacing: "0.2em",
            background: "hsl(35 32% 16%)",
            border: "1px solid hsl(38 32% 28%)",
            borderRadius: 5,
            padding: "5px 14px",
          }}
        >
          Admin →
        </button>
      )}
    </div>
  );
}

import { useLocation } from "wouter";

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a0f 0%, #0f0a1a 60%, #0a0a0f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 500,
        height: 500,
        background: "radial-gradient(ellipse, rgba(120,60,200,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo / Title */}
      <div style={{ textAlign: "center", marginBottom: 64, zIndex: 1 }}>
        <div style={{ fontSize: 42, marginBottom: 12, filter: "drop-shadow(0 0 12px rgba(180,140,255,0.3))" }}>✝</div>
        <h1 style={{
          color: "#ffffff",
          fontFamily: "Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: "0.06em",
          margin: 0,
        }}>
          His Altar
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.35)",
          fontFamily: "Georgia, serif",
          fontSize: 13,
          letterSpacing: "0.1em",
          marginTop: 8,
        }}>
          Church Ministry Platform
        </p>
      </div>

      {/* Enter Site button */}
      <button
        onClick={() => navigate("/enter")}
        style={{
          zIndex: 1,
          padding: "18px 64px",
          background: "linear-gradient(135deg, #7c3aed, #9333ea)",
          border: "none",
          borderRadius: 50,
          color: "#ffffff",
          fontFamily: "Georgia, serif",
          fontSize: 17,
          letterSpacing: "0.12em",
          cursor: "pointer",
          boxShadow: "0 0 32px rgba(124,58,237,0.4), 0 4px 24px rgba(0,0,0,0.4)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 48px rgba(124,58,237,0.6), 0 4px 24px rgba(0,0,0,0.4)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 32px rgba(124,58,237,0.4), 0 4px 24px rgba(0,0,0,0.4)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        }}
      >
        Enter Site
      </button>

      {/* Sign up subtext */}
      <p style={{
        marginTop: 28,
        zIndex: 1,
        color: "rgba(255,255,255,0.3)",
        fontFamily: "Georgia, serif",
        fontSize: 12,
        letterSpacing: "0.08em",
      }}>
        New church?{" "}
        <a
          href="/org/signup"
          style={{ color: "rgba(180,130,255,0.6)", textDecoration: "none" }}
          onMouseOver={(e) => ((e.target as HTMLElement).style.color = "rgba(180,130,255,0.9)")}
          onMouseOut={(e) => ((e.target as HTMLElement).style.color = "rgba(180,130,255,0.6)")}
        >
          Sign up
        </a>
      </p>

      {/* App Store buttons */}
      <div style={{
        position: "absolute",
        bottom: 36,
        display: "flex",
        gap: 14,
        alignItems: "center",
        zIndex: 1,
      }}>
        <a
          href="https://apps.apple.com"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            textDecoration: "none",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)")}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          App Store
        </a>
        <a
          href="https://play.google.com"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            textDecoration: "none",
            color: "rgba(255,255,255,0.7)",
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)")}
          onMouseOut={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.18 23.76c.3.17.64.22.99.14l13.07-7.55-2.98-2.98-11.08 10.39zM.48 1.6C.18 1.94 0 2.43 0 3.06v17.88c0 .63.18 1.12.48 1.46l.08.07 10.01-10.01v-.24L.56 1.53l-.08.07zM22.56 10.37l-2.86-1.65-3.19 3.19 3.19 3.19 2.89-1.67c.82-.48.82-1.58-.03-2.06zM3.18.24l13.07 7.55-2.98 2.98L3.18.24z"/>
          </svg>
          Google Play
        </a>
      </div>

      {/* Staff login link — very subtle */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 1 }}>
        <a
          href="/staff"
          style={{
            color: "rgba(255,255,255,0.12)",
            fontFamily: "Georgia, serif",
            fontSize: 10,
            letterSpacing: "0.1em",
            textDecoration: "none",
          }}
          onMouseOver={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.3)")}
          onMouseOut={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.12)")}
        >
          staff
        </a>
      </div>
    </div>
  );
}

import { useLocation } from "wouter";

export default function UnauthorizedPage() {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at 50% 30%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
        padding: "24px 16px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ fontSize: 48, marginBottom: 24, opacity: 0.4 }}>🔒</div>
        <h1
          style={{
            color: "hsl(38 60% 65%)",
            fontFamily: "Georgia, serif",
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Not Authorized
        </h1>
        <p
          style={{
            color: "hsl(38 25% 45%)",
            fontFamily: "Georgia, serif",
            fontSize: 13,
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          You do not have permission to access this area.
        </p>
        <button
          onClick={() => navigate("/team")}
          style={{
            background: "none",
            border: "1px solid hsl(38 28% 28%)",
            color: "hsl(38 45% 55%)",
            fontFamily: "Georgia, serif",
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            padding: "10px 24px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

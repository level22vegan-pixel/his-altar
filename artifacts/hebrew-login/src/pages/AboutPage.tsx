import { useLocation } from "wouter";

export default function AboutPage() {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px 40px",
        background: "radial-gradient(ellipse at 50% 20%, hsl(35 28% 12%) 0%, hsl(35 18% 7%) 100%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            marginBottom: 36,
            color: "hsl(38 30% 42%)",
            fontFamily: "Georgia, serif",
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          ← Back
        </button>

        {/* Logo mark */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 26,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "hsl(38 60% 65%)",
              margin: 0,
            }}
          >
            His Altar
          </h1>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "hsl(38 28% 40%)",
              marginTop: 6,
            }}
          >
            Ministry Management Platform
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "hsl(38 20% 20%)", marginBottom: 32 }} />

        {/* About content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Section title="Who We Are">
            His Altar is a ministry management platform built for the local church. We help altar
            teams, prayer coordinators, and campus leaders serve their congregation more effectively
            through simple, purpose-built tools.
          </Section>

          <Section title="What We Do">
            From tracking altar responses and managing rosters to coordinating prayer follow-up
            calls, His Altar brings your ministry workflows into one place — so your team can focus
            on the people, not the paperwork.
          </Section>

          <Section title="Built for the Church">
            Every feature in His Altar was designed with local church ministry in mind. Whether
            you run one campus or many, our platform scales with your congregation and keeps your
            data organized and accessible to the right people.
          </Section>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "hsl(38 20% 20%)", margin: "32px 0" }} />

        {/* CTA */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 12,
              color: "hsl(38 30% 44%)",
              letterSpacing: "0.05em",
            }}
          >
            Ready to get started?
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => navigate("/org/signup")}
              style={{
                padding: "11px 28px",
                background: "hsl(38 45% 26%)",
                color: "hsl(38 70% 78%)",
                border: "1px solid hsl(38 35% 34%)",
                borderRadius: 8,
                fontFamily: "Georgia, serif",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Register Your Church
            </button>
            <button
              onClick={() => navigate("/org/login")}
              style={{
                padding: "11px 28px",
                background: "transparent",
                color: "hsl(38 40% 50%)",
                border: "1px solid hsl(38 20% 26%)",
                borderRadius: 8,
                fontFamily: "Georgia, serif",
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Sign In
            </button>
          </div>
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 10,
              color: "hsl(38 20% 34%)",
              letterSpacing: "0.08em",
              marginTop: 8,
            }}
          >
            Questions?{" "}
            <a
              href="mailto:support@hisaltar.com"
              style={{ color: "hsl(38 40% 50%)", textDecoration: "none" }}
            >
              support@hisaltar.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "hsl(38 40% 46%)",
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 13,
          lineHeight: 1.75,
          color: "hsl(38 25% 58%)",
        }}
      >
        {children}
      </p>
    </div>
  );
}

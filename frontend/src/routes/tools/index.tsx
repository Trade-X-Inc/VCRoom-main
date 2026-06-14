import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/tools/")({
  head: () => ({
    meta: [
      { title: "Free Startup Tools — Calculators for Founders & Investors | Hockystick" },
      {
        name: "description",
        content:
          "Free financial tools built for startup founders raising capital. Valuation calculators, burn rate, runway, cap table, SAFE notes — accurate, methodology-backed, free to use.",
      },
    ],
  }),
  component: ToolsIndex,
});

interface Tool {
  title: string;
  route: string;
  tag: string;
  tagStyle: "active" | "soon";
  description: string;
  cta: string;
  active: boolean;
}

const TOOLS: Tool[] = [
  {
    title: "Startup Valuation Calculator",
    route: "/tools/valuation",
    tag: "Most used",
    tagStyle: "active",
    description:
      "Get a realistic valuation range using VC method, revenue multiples, and Berkus. Stage-aware inputs.",
    cta: "Calculate valuation →",
    active: true,
  },
  {
    title: "Burn Rate Calculator",
    route: "/tools/burn-rate",
    tag: "New",
    tagStyle: "active",
    description:
      "Calculate monthly gross and net burn. Know exactly where cash is going.",
    cta: "Calculate burn →",
    active: true,
  },
  {
    title: "Runway Calculator",
    route: "/tools/runway",
    tag: "New",
    tagStyle: "active",
    description:
      "Calculate your cash-out date, model three funding scenarios, and know exactly when to start your next raise.",
    cta: "Calculate runway →",
    active: true,
  },
  {
    title: "COGS Calculator",
    route: "/tools/cogs",
    tag: "New",
    tagStyle: "active",
    description:
      "Calculate gross margin for SaaS, marketplace, hardware, and e-commerce. Compare to industry benchmarks.",
    cta: "Calculate COGS →",
    active: true,
  },
  {
    title: "Cap Table Calculator",
    route: "/tools/cap-table",
    tag: "New",
    tagStyle: "active",
    description:
      "Model equity distribution across founders, employees, and investors across rounds.",
    cta: "Build cap table →",
    active: true,
  },
  {
    title: "SAFE Note Calculator",
    route: "/tools/safe-note",
    tag: "New",
    tagStyle: "active",
    description:
      "Calculate SAFE conversion at next priced round. Valuation cap vs discount scenarios.",
    cta: "Model SAFE →",
    active: true,
  },
  {
    title: "Dilution Calculator",
    route: "/tools/dilution",
    tag: "New",
    tagStyle: "active",
    description:
      "See exactly how much equity each funding round dilutes your ownership.",
    cta: "Calculate dilution →",
    active: true,
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  const cardStyle: React.CSSProperties = {
    background: "#111114",
    border: `1px solid ${tool.active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
    borderRadius: "12px",
    padding: "24px",
    opacity: tool.active ? 1 : 0.4,
    pointerEvents: tool.active ? "auto" : "none",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    transition: "border-color 0.15s",
  };

  const inner = (
    <div style={cardStyle} className={tool.active ? "group hover:border-[#7C3AED]" : ""}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            padding: "2px 8px",
            borderRadius: "4px",
            background: tool.tagStyle === "active" ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.15)",
            color: tool.tagStyle === "active" ? "#10B981" : "#7C3AED",
          }}
        >
          {tool.tag}
        </span>
      </div>

      <h2
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: "17px",
          color: "#ffffff",
          margin: 0,
        }}
      >
        {tool.title}
      </h2>

      <p
        style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.6,
          margin: 0,
          flexGrow: 1,
        }}
      >
        {tool.description}
      </p>

      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#7C3AED",
          marginTop: "4px",
        }}
      >
        {tool.cta}
      </span>
    </div>
  );

  if (!tool.active) return <div key={tool.route}>{inner}</div>;

  return (
    <Link to={tool.route as any} style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  );
}

function ToolsIndex() {
  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh" }}>
      <SiteHeader />

      {/* Hero */}
      <section
        style={{
          padding: "80px 24px 64px",
          maxWidth: "720px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: "#7C3AED",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          Free Tools
        </p>
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(28px, 5vw, 48px)",
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "20px",
          }}
        >
          Tools built for founders who are serious about fundraising
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          Not toys. These tools use the same methods investors use to evaluate your startup.
        </p>
      </section>

      {/* Tools grid */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "0 24px 80px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: "16px",
        }}
      >
        {TOOLS.map((tool) => (
          <ToolCard key={tool.route} tool={tool} />
        ))}
      </section>

      {/* Bottom CTA */}
      <section
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "56px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "24px",
            maxWidth: "480px",
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          These tools don't replace a great investor relationship. Build one on Hockystick.
        </p>
        <Link
          to="/sign-up"
          search={{ role: "founder" } as any}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#7C3AED",
            color: "#ffffff",
            borderRadius: "10px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            transition: "background 0.15s",
          }}
        >
          Create your founder profile
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}

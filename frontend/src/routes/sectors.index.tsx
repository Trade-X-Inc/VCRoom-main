import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /sectors — Group 3 of the lengdon-public-site/ migration (25 Aug 2026).
// New page, hub over the 6 sector pages. Content per public-site-spec.html
// section C.
//
// Technology links directly to /resources/schedule (NOT /sectors/technology
// — that path exists only as a 301 redirect target, per public/_redirects;
// linking straight to the real destination avoids a needless extra hop for
// every visitor who clicks this grid). The other 5 link to their own new
// pages built in this same group.
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";

const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";
const G_RECESSED = "var(--pub-n-09)";

const SHELL = "72rem";
const MEASURE = "34rem";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500,
        letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="pub-title" style={{ fontFamily: UI, color: INK, margin: 0 }}>
      {children}
    </h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
      {children}
    </p>
  );
}

function Pill({ children, variant }: { children: React.ReactNode; variant: "live" | "early" | "planned" }) {
  const colors = {
    live: { bg: "var(--v2-satisfied-wash)", fg: "var(--v2-satisfied)" },
    early: { bg: "var(--v2-accent-wash)", fg: "var(--v2-accent)" },
    planned: { bg: "var(--pub-n-12)", fg: INK_3 },
  }[variant];
  return (
    <span
      style={{
        display: "inline-block", padding: "3px 7px", background: colors.bg, color: colors.fg,
        fontFamily: DATA, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

const SECTORS: Array<{ name: string; to: string; status: "live" | "early" | "planned"; label: string }> = [
  { name: "Technology", to: "/resources/schedule", status: "live", label: "Live" },
  { name: "Manufacturing and trade", to: "/sectors/manufacturing", status: "early", label: "Early access" },
  { name: "Property", to: "/sectors/property", status: "planned", label: "Planned" },
  { name: "Brands and retail", to: "/sectors/brands-retail", status: "planned", label: "Planned" },
  { name: "Healthcare", to: "/sectors/healthcare", status: "planned", label: "Planned" },
  { name: "Energy and resources", to: "/sectors/energy", status: "planned", label: "Planned" },
];

export const Route = createFileRoute("/sectors/")({
  head: () => ({
    meta: [
      { title: "Sector schedules — Lengdon" },
      {
        name: "description",
        content: "Field sets and checklists for technology, manufacturing, property, healthcare and energy. One engine, different fields, three evidence tiers.",
      },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sectors" }],
  }),
  component: SectorsHubPage,
});

function SectorsHubPage() {
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    window.scrollTo(0, 0);
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Sector schedules</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              Every tool assumes technology. Most capital is not technology.
            </h1>
            <Prose>
              A sector schedule is the set of fields and the diligence
              checklist a real deal in that sector needs. Same engine,
              different fields.
            </Prose>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Grid</Eyebrow>
            <Title>Six sectors, one engine</Title>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1px", background: RULE, border: `1px solid ${RULE}` }}>
              {SECTORS.map((s) => (
                <Link
                  key={s.to}
                  to={s.to as any}
                  style={{
                    background: "var(--pub-n-00)", padding: "22px", textDecoration: "none",
                    display: "flex", flexDirection: "column", gap: "10px", color: INK,
                  }}
                >
                  <Pill variant={s.status}>{s.label}</Pill>
                  <span style={{ fontFamily: UI, fontSize: "15px", fontWeight: 600 }}>{s.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: G_RECESSED }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>The evidence ladder</Eyebrow>
            <Title>Three tiers, not one bar to clear</Title>
            <Prose>
              A real business in much of the world has no audited statements
              but has processor history and supplier records. Every field
              accepts three evidence tiers — preferred, alternative, minimum
              — and shows which was met.
            </Prose>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

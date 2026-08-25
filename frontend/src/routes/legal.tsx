import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /legal — Group 1 of the lengdon-public-site/ -> frontend/src/routes
// migration (25 Aug 2026). New page, no real-app equivalent before this.
//
// Hub page only: an index over the five legal documents. /terms and /privacy
// are Tier C (v1, out of scope for this migration per the integration audit)
// and are NOT rebuilt here — this hub links to them as they exist today.
// /dpa, /sub-processors, /acceptable-use are new pages built in this same
// group, shipped in the SPA's shape (H1 + one paragraph + [COUNSEL] marker
// where wording is pending), not the deeper treatment /pricing or
// /how-it-works received — content-final legal shells, not a design pass.
//
// Same primitives shape as pricing.tsx/how-it-works.tsx (Eyebrow, Title,
// Prose, Section, force-light effect) — no shared primitives module exists
// yet in this codebase, so this follows the established per-file convention
// rather than introducing a new pattern mid-migration.
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

function Section({ ground, children }: { ground: string; children: React.ReactNode }) {
  return (
    <section style={{ background: ground }}>
      <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "56px" }}>
        {children}
      </div>
    </section>
  );
}

const DOCS: Array<{ title: string; to: string; body: string }> = [
  { title: "Terms", to: "/terms", body: "Terms of service." },
  { title: "Privacy", to: "/privacy", body: "Privacy notice." },
  { title: "Data processing addendum", to: "/dpa", body: "Data processing addendum." },
  { title: "Sub-processors", to: "/sub-processors", body: "Third parties who process data on our behalf." },
  { title: "Acceptable use", to: "/acceptable-use", body: "Acceptable use policy." },
];

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal — Lengdon" },
      { name: "description", content: "The complete legal surface, dated and versioned: terms, privacy, DPA, sub-processors, acceptable use." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/legal" }],
  }),
  component: LegalPage,
});

function LegalPage() {
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
            <Eyebrow>Legal</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "18ch" }}>
              Every document, dated and versioned.
            </h1>
            <Prose>
              The complete legal surface. Each document below is marked pending
              counsel review where wording is not yet final.
            </Prose>
          </div>
        </section>

        <Section ground={G_PANEL}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Documents</Eyebrow>
            <Title>Five documents</Title>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1px", background: RULE, border: `1px solid ${RULE}` }}>
            {DOCS.map((d) => (
              <Link
                key={d.to}
                to={d.to as any}
                style={{
                  background: "var(--pub-n-00)", padding: "22px", textDecoration: "none",
                  display: "flex", flexDirection: "column", gap: "8px", color: INK,
                }}
              >
                <span style={{ fontFamily: UI, fontSize: "15px", fontWeight: 600 }}>{d.title}</span>
                <span style={{ fontFamily: UI, fontSize: "13px", color: INK_2 }}>{d.body}</span>
              </Link>
            ))}
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}

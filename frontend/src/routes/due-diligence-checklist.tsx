import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { usePublicPageLightTheme } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /due-diligence-checklist — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page.
//
// SCOPE CORRECTION from the SPA original: the SPA's version claimed to
// publish "the real technology seed checklist... in full" as a downloadable
// artifact. Checked before writing this page: no standalone, reusable
// diligence-checklist template exists anywhere in the schema —
// dd_checklist_items is per-deal-room, ad-hoc content (confirmed: no
// dd_checklist_template table, no seed/insert script populating a reusable
// checklist). What DOES exist and IS real is the published disclosure
// schedule at /resources/schedule (technology/seed, v1, live). Rather than
// invent a "checklist download" backed by nothing, this page states the
// real schedule directly and routes there — the actual artifact this page
// can honestly point to.
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";

const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";

const SHELL = "72rem";
const MEASURE = "34rem";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
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

function Action({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      style={{
        display: "inline-flex", alignItems: "center", height: "40px",
        padding: "0 20px", borderRadius: "2px",
        fontFamily: UI, fontSize: "14px", fontWeight: 500,
        background: "var(--v2-accent)", color: "#FFFFFF",
        border: "1px solid var(--v2-accent)", textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export const Route = createFileRoute("/due-diligence-checklist")({
  head: () => ({
    meta: [
      { title: "Due diligence checklist — Lengdon" },
      { name: "description", content: "The real technology seed disclosure schedule, published in full and readable without an account." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/due-diligence-checklist" }],
  }),
  component: DueDiligenceChecklistPage,
});

function DueDiligenceChecklistPage() {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Reference</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              A real diligence schedule, not a generic checklist.
            </h1>
            <Prose>
              Most published "diligence checklists" are generic and
              unverifiable. Ours is the actual technology seed disclosure
              schedule this product uses — every field, its evidence tier,
              and when it releases, published in full.
            </Prose>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>The published schedule</Eyebrow>
            <Title>Read it directly, no account required</Title>
            <Prose>
              The technology seed schedule is queried live from the same
              table the product reads at runtime — not paraphrased, not a
              marketing summary. It is the one real, published schedule
              today; sector schedules beyond technology are early access or
              planned, stated as such on their own pages.
            </Prose>
            <div style={{ marginTop: "8px" }}>
              <Action to="/resources/schedule">Read the schedule</Action>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

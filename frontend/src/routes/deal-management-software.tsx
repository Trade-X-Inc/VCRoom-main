import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CardGrid, usePublicPageLightTheme } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /deal-management-software — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. Second category-entry doorway, same discipline
// as virtual-data-room.tsx — see that file's header comment.
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

export const Route = createFileRoute("/deal-management-software")({
  head: () => ({
    meta: [
      { title: "Deal management software — Lengdon" },
      { name: "description", content: "Manage the deal and keep what happened — a closing pipeline and term negotiation alongside the documents." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/deal-management-software" }],
  }),
  component: DealManagementSoftwarePage,
});

function DealManagementSoftwarePage() {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Deal management software</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              Manage the deal. Keep what happened.
            </h1>
            <Prose>
              Deal management tools track a pipeline. Lengdon runs the
              controlled sequence for one deal — diligence, terms, and
              close — alongside the documents, on one record.
            </Prose>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "56px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <Eyebrow>What runs on the record</Eyebrow>
              <Title>Three real mechanisms, not a status board</Title>
            </div>
            <CardGrid
              items={[
                ["Six-gate close", "Legal counsel, agreement, platform fee, signing, investment payment, and close — each a mutual-confirmation gate."],
                ["Term negotiation", "Propose, accept, and counter, per term, with a real state machine — not a shared document."],
                ["A live reference number", "Every deal room mints its own reference number with a check digit on creation."],
              ]}
            />
          </div>
        </section>

        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Action to="/how-it-works">See the full lifecycle</Action>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

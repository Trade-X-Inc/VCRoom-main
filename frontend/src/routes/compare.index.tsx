import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Instrument, usePublicPageLightTheme } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /compare — Group 4 of the lengdon-public-site/ migration (25 Aug 2026).
// New page, hub over the 5 comparison pages. See ComparePage.tsx's header
// comment for the content discipline and verified-claims list this follows
// — the master table below states only capabilities confirmed live in
// this app, same standard as each individual comparison page.
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

const COMPETITORS = [
  ["Datasite", "/compare/datasite"],
  ["iDeals", "/compare/ideals"],
  ["Firmex", "/compare/firmex"],
  ["DealRoom", "/compare/dealroom"],
  ["DocSend", "/compare/docsend"],
] as const;

export const Route = createFileRoute("/compare/")({
  head: () => ({
    meta: [
      { title: "Compare — Lengdon" },
      { name: "description", content: "An honest comparison against Datasite, iDeals, Firmex, DealRoom and DocSend on closing pipeline, term negotiation, reference numbers and pricing." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/compare" }],
  }),
  component: CompareHubPage,
});

function CompareHubPage() {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
              Comparisons
            </p>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              How we differ from the data rooms.
            </h1>
            <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
              The incumbents store and share documents well. Here is the
              honest breakdown against each one, and the specific page for
              the mechanism that differs.
            </p>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "56px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
                The master table
              </p>
              <h2 className="pub-title" style={{ fontFamily: UI, color: INK, margin: 0 }}>Five dimensions, six columns</h2>
            </div>
            <Instrument
              head={["Dimension", "Lengdon", "Datasite", "iDeals", "Firmex", "DealRoom", "DocSend"]}
              rows={[
                ["Published pricing", "Yes — four tiers", "Quoted", "Quoted", "Quoted", "Quoted", "Per-seat"],
                ["Closing pipeline (mutual-confirmation gates)", "Yes — six gates", "No", "No", "No", "No", "No"],
                ["Term negotiation (propose/accept/counter)", "Yes", "No", "No", "No", "No", "No"],
                ["Live reference numbers with a check digit", "Yes", "No", "No", "No", "No", "No"],
                ["Sector-specific disclosure schedule", "Yes — technology live", "No", "No", "No", "No", "No"],
              ]}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              {COMPETITORS.map(([name, to]) => (
                <Link
                  key={to}
                  to={to as any}
                  style={{
                    display: "block", padding: "16px 18px", border: "1px solid var(--v2-rule)",
                    background: "var(--pub-n-00)", textDecoration: "none", color: INK,
                    fontFamily: UI, fontSize: "14px", fontWeight: 500,
                  }}
                >
                  {name} comparison →
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

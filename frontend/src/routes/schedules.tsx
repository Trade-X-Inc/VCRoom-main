import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { usePublicPageLightTheme } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /schedules — Group 5 of the lengdon-public-site/ migration (25 Aug 2026).
// New page, index over published schedules per public-site-spec.html
// section E. /schedules/technology-seed is a real HTTP 301 redirect to
// /resources/schedule (public/_redirects), same pattern as
// /sectors/technology in Group 3 — not a second, thinner technology page.
// Confirmed pack_v1.schedule holds exactly one row before writing this:
// technology/seed v1 is the only schedule that exists.
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

export const Route = createFileRoute("/schedules")({
  head: () => ({
    meta: [
      { title: "Published schedules — Lengdon" },
      { name: "description", content: "Open sector schedules with fields, evidence tiers and diligence checklists. Technology seed live." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/schedules" }],
  }),
  component: SchedulesPage,
});

function SchedulesPage() {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
              Published schedules
            </p>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              Read the schedule before you sign up.
            </h1>
            <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
              Every sector schedule we ship is published here in full —
              fields, evidence tiers, and the diligence checklist.
            </p>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
              Index
            </p>
            <Link
              to={"/resources/schedule" as any}
              style={{
                display: "block", padding: "22px", border: `1px solid ${RULE}`,
                background: "var(--pub-n-00)", textDecoration: "none", color: INK,
                maxWidth: "28rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ fontFamily: UI, fontSize: "15px", fontWeight: 600 }}>Technology seed</span>
                <span style={{ fontFamily: DATA, fontSize: "10px", color: "var(--v2-accent)", textTransform: "uppercase" }}>v1 · Live</span>
              </div>
              <span style={{ fontFamily: UI, fontSize: "13.5px", color: INK_2 }}>
                Cap table, contracts, revenue quality, IP position, and
                key-person dependence, published in full.
              </span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

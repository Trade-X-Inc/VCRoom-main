import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// GlossaryTerm — shared shape for the 10 /glossary/:term pages built in
// Group 6 of the lengdon-public-site/ migration (25 Aug 2026). Content
// checked against real app state before writing, term by term:
//
// - Term set, disclosure pack, evidence ladder, condition precedent: all
//   describe general private-capital vocabulary, defined accurately as
//   terms of art (per public-site-spec.html section F's own framing —
//   "Ten terms and growing," a glossary of vocabulary, not a feature list).
// - "How Lengdon uses this" notes are added ONLY where confirmed live:
//   term negotiation (verified in Group 4), reference numbers (verified in
//   Groups 4-5), NDA-gated disclosure (verified in Group 4).
// - Single-notice rule and sealed export are defined as the GENERAL
//   concept only, with NO claim that Lengdon has built either — both
//   confirmed unbuilt in Group 4's audit (document_requests has no
//   batching; finalize_deal_close() produces no export artifact). This is
//   the same distinction a dictionary makes between defining a word and
//   claiming to have built the thing it names.
// - Beneficial ownership, LEI, release class: defined as general terms of
//   art with no "how Lengdon uses this" claim at all, since none of the
//   three has any live implementation (confirmed: zero beneficial-
//   ownership/vehicle schema in Group 2's audit; zero LEI field anywhere;
//   release class exists only in the unpromoted pack_v1 schema).
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

export function usePublicPageLightTheme() {
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
}

export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
  /** Only present where the app genuinely implements this concept today. */
  usage?: string;
}

export function GlossaryTermPage({
  entry, related,
}: {
  entry: GlossaryEntry;
  related: GlossaryEntry[];
}) {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
              Glossary
            </p>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              {entry.term}
            </h1>
            <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
              {entry.definition}
            </p>
          </div>
        </section>

        {entry.usage ? (
          <section style={{ background: G_PANEL }}>
            <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
              <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
                How Lengdon uses this
              </p>
              <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
                {entry.usage}
              </p>
            </div>
          </section>
        ) : null}

        <section style={{ background: entry.usage ? G_BASE : G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
              Related terms
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1px", background: RULE, border: `1px solid ${RULE}` }}>
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/glossary/${r.slug}` as any}
                  style={{
                    background: "var(--pub-n-00)", padding: "18px", textDecoration: "none",
                    color: INK, fontFamily: UI, fontSize: "14px", fontWeight: 600,
                  }}
                >
                  {r.term}
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

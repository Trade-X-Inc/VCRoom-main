import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { usePublicPageLightTheme } from "@/components/site/GlossaryTerm";
import { GLOSSARY } from "@/lib/glossary";

// ─────────────────────────────────────────────────────────────────────────────
// /glossary — Group 6 of the lengdon-public-site/ migration (25 Aug 2026).
// New hub page, indexing the 10 entries in src/lib/glossary.ts.
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

export const Route = createFileRoute("/glossary/")({
  head: () => ({
    meta: [
      { title: "Glossary — Lengdon" },
      { name: "description", content: "Accurate definitions of disclosure, diligence and closing terms. Ten terms and growing." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/glossary" }],
  }),
  component: GlossaryIndexPage,
});

function GlossaryIndexPage() {
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
              The terms of art, used correctly.
            </h1>
            <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
              Plain, accurate definitions of the vocabulary a private-capital
              deal runs on.
            </p>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
              Ten terms
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1px", background: RULE, border: `1px solid ${RULE}` }}>
              {GLOSSARY.map((e) => (
                <Link
                  key={e.slug}
                  to={`/glossary/${e.slug}` as any}
                  style={{
                    background: "var(--pub-n-00)", padding: "22px", textDecoration: "none",
                    display: "flex", flexDirection: "column", gap: "8px", color: INK,
                    flex: "1 1 220px", minWidth: "220px",
                  }}
                >
                  <span style={{ fontFamily: UI, fontSize: "15px", fontWeight: 600 }}>{e.term}</span>
                  <span style={{ fontFamily: UI, fontSize: "13px", color: INK_2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {e.definition}
                  </span>
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

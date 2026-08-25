import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// SectorPage — shared shape for the 5 non-technology /sectors/* pages built
// in Group 3 of the lengdon-public-site/ migration (25 Aug 2026). Technology
// is NOT one of these — it is a 301 redirect to /resources/schedule, the
// only real published schedule (CLAUDE.md §20.1 step 2d), not a page of
// its own.
//
// Every page using this component hedges as "EARLY ACCESS" or "PLANNED":
// confirmed directly against pack_v1.schedule (1 row, technology/seed only)
// before writing any copy — no manufacturing, property, brands-retail,
// healthcare, or energy schedule exists in any form. This is a smaller,
// flatter page than SolutionAudiencePage's shape: one fold, one content
// block, no boundary section — matching public-site-spec.html section C's
// own template ("one repeatable template... no invented detail").
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block", padding: "4px 8px", background: "var(--v2-accent-wash)",
        color: "var(--v2-accent)", fontFamily: DATA, fontSize: "10px", textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </span>
  );
}

function Action({ to, search, children }: { to: string; search?: Record<string, unknown>; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      search={search as any}
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

export function SectorPage({
  eyebrow, hedge, title, sub, blockLabel, blockBody, ctaLabel,
}: {
  eyebrow: string;
  /** "EARLY ACCESS" or "PLANNED" — every sector page using this component hedges. */
  hedge: string;
  title: string;
  sub: string;
  blockLabel: string;
  blockBody: string;
  ctaLabel?: string;
}) {
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
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Eyebrow>{eyebrow}</Eyebrow>
              <Pill>{hedge}</Pill>
            </div>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "18ch" }}>
              {title}
            </h1>
            <Prose>{sub}</Prose>
            {ctaLabel ? (
              <div style={{ marginTop: "8px" }}>
                <Action to="/sign-up" search={{ role: "investor" }}>{ctaLabel}</Action>
              </div>
            ) : null}
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>{blockLabel}</Eyebrow>
            <Title>{blockLabel}</Title>
            <Prose>{blockBody}</Prose>
            {/* CTA audit, 25 Aug 2026: the four PLANNED sector pages
                (property, brands-retail, healthcare, energy) previously had
                zero action points at all, since ctaLabel is only set for
                EARLY ACCESS pages. A hard sign-up push would contradict the
                page's own honest "nothing built yet" framing, so this is
                deliberately a lower-commitment action — tell us you need
                it — rather than the sign-up flow used elsewhere. */}
            {!ctaLabel ? (
              <div>
                <Action to="/contact">Tell us you need this schedule</Action>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

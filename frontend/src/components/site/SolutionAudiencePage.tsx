import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// SolutionAudiencePage — shared shape for the eight /solutions/* audience
// pages built in Group 2 of the lengdon-public-site/ migration (25 Aug
// 2026). Each audience page in public-site-spec.html section B follows the
// identical structure: eyebrow (role) / H1 (their benefit) / subhead / two
// content blocks / boundary / CTA — so this is one shared component rather
// than eight near-duplicate files, unlike Group 1, which had no repeated
// shape worth extracting.
//
// hedge: pass "EARLY ACCESS" for the 7 audiences with no built,
// audience-specific mechanic beyond the generic investor deal-room flow
// (confirmed per-audience against real schema/routes before writing any
// copy — see the Group 2 commit message for the evidence). Omit for
// angels, the one audience where the generic flow genuinely IS the
// product being described, not a stand-in for something unbuilt.
//
// boundary is optional — most audience pages state what Lengdon does NOT
// do for that audience (no matching, no fee, no custody), matching the
// "Boundary" block in public-site-spec.html. Omitted only where the spec
// itself has no boundary line for that audience (angels, LPs).
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

function Action({ to, search, children, variant = "primary" }: {
  to: string;
  search?: Record<string, unknown>;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <Link
      to={to as any}
      search={search as any}
      style={{
        display: "inline-flex", alignItems: "center", height: "40px",
        padding: "0 20px", borderRadius: "2px",
        fontFamily: UI, fontSize: "14px", fontWeight: 500,
        background: primary ? "var(--v2-accent)" : "transparent",
        color: primary ? "#FFFFFF" : INK,
        border: primary ? "1px solid var(--v2-accent)" : `1px solid ${RULE}`,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
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

export function SolutionAudiencePage({
  eyebrow, title, sub, hedge, pain, painBody, mechanism, mechanismBody, boundary, boundaryBody, ctaTo, ctaSearch, ctaLabel,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  /** e.g. "EARLY ACCESS" — omit for audiences where the generic flow genuinely is the product. */
  hedge?: string;
  pain: string;
  painBody: string;
  mechanism: string;
  mechanismBody: string;
  boundary?: string;
  boundaryBody?: string;
  ctaTo?: string;
  ctaSearch?: Record<string, unknown>;
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
              {hedge ? <Pill>{hedge}</Pill> : null}
            </div>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "18ch" }}>
              {title}
            </h1>
            <Prose>{sub}</Prose>
            {ctaTo ? (
              <div style={{ marginTop: "8px" }}>
                <Action to={ctaTo} search={ctaSearch}>{ctaLabel ?? "Request access"}</Action>
              </div>
            ) : null}
          </div>
        </section>

        <Section ground={G_RECESSED}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>{pain}</Eyebrow>
            <Title>{pain}</Title>
            <Prose>{painBody}</Prose>
          </div>
        </Section>

        <Section ground={G_PANEL}>
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>{mechanism}</Eyebrow>
            <Title>{mechanism}</Title>
            <Prose>{mechanismBody}</Prose>
          </div>
        </Section>

        {boundary && boundaryBody ? (
          <Section ground={G_BASE}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <Eyebrow>{boundary}</Eyebrow>
              <Title>{boundary}</Title>
              <Prose>{boundaryBody}</Prose>
            </div>
          </Section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

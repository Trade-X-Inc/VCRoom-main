import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /dpa — Group 1 of the lengdon-public-site/ migration (25 Aug 2026). New
// page. Content per public-site-spec.html §G: a shell only, wording pending
// counsel review, marked [COUNSEL] rather than invented. See legal.tsx's
// header comment for the shared shape/primitives note.
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
    <p style={{ fontFamily: DATA, fontSize: "11px", lineHeight: 1.45, fontWeight: 500, letterSpacing: "0.09em", textTransform: "uppercase", color: INK_3, margin: 0 }}>
      {children}
    </p>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: DOC, fontSize: "17px", lineHeight: 1.65, color: INK_2, maxWidth: MEASURE, margin: 0 }}>
      {children}
    </p>
  );
}

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "Data processing addendum — Lengdon" },
      { name: "description", content: "Data processing addendum. Wording pending counsel review." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/dpa" }],
  }),
  component: DpaPage,
});

function DpaPage() {
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
            <Eyebrow>Data processing addendum</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "18ch" }}>
              Data processing addendum.
            </h1>
            <Prose>
              [COUNSEL] Legal wording is pending counsel review. This page is
              not a substitute for the final data processing addendum.
            </Prose>
          </div>
        </section>
        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Status</Eyebrow>
            <p style={{ fontFamily: DATA, fontSize: "13px", color: INK_2, borderTop: `1px solid ${RULE}`, paddingTop: "14px", maxWidth: MEASURE }}>
              This page will carry the reviewed and versioned data processing
              addendum before launch.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

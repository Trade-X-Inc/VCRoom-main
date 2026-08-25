import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /acceptable-use — Group 1 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. Same shape as dpa.tsx — see that file's header
// comment and legal.tsx's for the shared conventions this follows.
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

export const Route = createFileRoute("/acceptable-use")({
  head: () => ({
    meta: [
      { title: "Acceptable use — Lengdon" },
      { name: "description", content: "Acceptable use policy. Wording pending counsel review." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/acceptable-use" }],
  }),
  component: AcceptableUsePage,
});

function AcceptableUsePage() {
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
            <Eyebrow>Acceptable use</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "18ch" }}>
              Acceptable use policy.
            </h1>
            <Prose>
              [COUNSEL] Legal wording is pending counsel review. This page is
              not a substitute for the final acceptable use policy.
            </Prose>
          </div>
        </section>
        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Status</Eyebrow>
            <p style={{ fontFamily: DATA, fontSize: "13px", color: INK_2, borderTop: `1px solid ${RULE}`, paddingTop: "14px", maxWidth: MEASURE }}>
              This page will carry the reviewed and versioned acceptable use
              policy before launch.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

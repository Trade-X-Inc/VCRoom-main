import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /careers — Group 1 of the lengdon-public-site/ migration (25 Aug 2026).
// New page, honest "not hiring yet" stub per public-site-spec.html §G — not
// a pipeline page, no invented roles.
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

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Lengdon" },
      { name: "description", content: "Not hiring yet. How we work." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/careers" }],
  }),
  component: CareersPage,
});

function CareersPage() {
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
            <Eyebrow>Careers</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "16ch" }}>
              Not hiring yet.
            </h1>
            <Prose>
              We will list roles here when there is a specific need. This is
              not a pipeline page.
            </Prose>
          </div>
        </section>
        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>How we work</Eyebrow>
            <Title>Small, deliberate, in the open</Title>
            <Prose>
              We build in short, reviewed steps and record what changed and
              why — the same discipline the product applies to a deal. When a
              specific role opens, it will be posted here with a real scope,
              not a general pipeline invitation.
            </Prose>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

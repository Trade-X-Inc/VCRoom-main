import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /status — Group 1 of the lengdon-public-site/ migration (25 Aug 2026). New
// page, honest stub per public-site-spec.html §G: "an operational page,
// wired to a real monitor later." Static placeholder now — does NOT claim
// real-time status, since none is wired yet.
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";
const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const G_BASE = "var(--pub-n-06)";
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

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — Lengdon" },
      { name: "description", content: "System status." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/status" }],
  }),
  component: StatusPage,
});

function StatusPage() {
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
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 96px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Status</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "18ch" }}>
              All systems operational.
            </h1>
            <Prose>
              This page will carry a live monitor. Stated plainly here until
              it is wired: this is a static placeholder pending a wired
              status monitor. It does not yet reflect real-time system state.
            </Prose>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

// ─────────────────────────────────────────────────────────────────────────────
// /sub-processors — Group 1 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. Unlike dpa.tsx/acceptable-use.tsx, this is real,
// maintained content (a provider table) per public-site-spec.html §G: "This
// one is content, not counsel." Final legal characterisation of each
// relationship is still [COUNSEL]-marked; the table itself is not invented.
// Provider list carried from lengdon-public-site/app.js's subProcessors().
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";
const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";
const RULE = "var(--v2-rule)";
const RULE_LIGHT = "var(--v2-rule-light)";
const PANEL = "var(--pub-n-00)";
const G_BASE = "var(--pub-n-06)";
const G_RECESSED = "var(--pub-n-09)";
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

const PROVIDERS: Array<[string, string, string]> = [
  ["Supabase", "Application database, authentication, file storage", "EU"],
  ["Cloudflare", "Edge hosting, CDN, DNS", "Global"],
  ["OpenAI", "Document extraction and drafting assistance, under contract", "US"],
  ["Resend", "Transactional email delivery", "US"],
  ["HubSpot", "Access-request and marketing contact management", "US/EU"],
];

export const Route = createFileRoute("/sub-processors")({
  head: () => ({
    meta: [
      { title: "Sub-processors — Lengdon" },
      { name: "description", content: "Third parties who process data on our behalf, by provider, purpose, and region." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/sub-processors" }],
  }),
  component: SubProcessorsPage,
});

function SubProcessorsPage() {
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
            <Eyebrow>Sub-processors</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              Third parties who process data on our behalf.
            </h1>
            <Prose>
              A maintained list, by provider, purpose, and region. [COUNSEL]
              Final legal characterisation of each relationship is pending
              counsel review.
            </Prose>
          </div>
        </section>

        <section style={{ background: G_RECESSED }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>Providers</Eyebrow>
            <Title>Maintained, not exhaustive of every tool in use</Title>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: UI, fontSize: "14px", lineHeight: 1.55 }}>
                <thead>
                  <tr>
                    {["Provider", "Purpose", "Region"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        style={{
                          fontSize: "13.5px", fontWeight: 700, letterSpacing: "0",
                          textTransform: "none", color: INK, textAlign: "start",
                          padding: "0 24px 14px", borderBottom: `1.5px solid ${INK}`, whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROVIDERS.map((row, ri) => (
                    <tr key={row[0]} style={{ background: ri % 2 === 1 ? "var(--pub-n-09)" : "transparent" }}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: "18px 24px", color: ci === 0 ? INK : INK_2, fontWeight: ci === 0 ? 600 : 400, verticalAlign: "top" }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

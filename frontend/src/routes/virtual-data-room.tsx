import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CardGrid, usePublicPageLightTheme } from "@/components/site/ComparePage";

// ─────────────────────────────────────────────────────────────────────────────
// /virtual-data-room — Group 4 of the lengdon-public-site/ migration
// (25 Aug 2026). New page. Category-entry doorway, per
// public-site-spec.html section D: rank for the category the buyer
// searches, then reframe to what is actually real about this product.
//
// The "room" section states only real, checkable document infrastructure:
// permissioned access via RLS-gated Supabase storage (real, live) and
// NDA-gated disclosure (nda_signed stage gate, real, live). Does NOT claim
// watermarking or a logged release-on-request mechanism — both confirmed
// unbuilt (see ComparePage.tsx's header comment for the full verification).
// The "beyond the room" section states the real closing pipeline and term
// negotiation, not the SPA's single-notice/sealed-export claims.
// ─────────────────────────────────────────────────────────────────────────────

const UI = "var(--font-v2-ui)";
const DOC = "var(--font-v2-doc)";
const DATA = "var(--font-v2-data)";

const INK = "var(--v2-ink)";
const INK_2 = "var(--v2-ink-secondary)";
const INK_3 = "var(--v2-ink-muted)";

const G_BASE = "var(--pub-n-06)";
const G_PANEL = "var(--pub-n-00)";
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

function Action({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to as any}
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

export const Route = createFileRoute("/virtual-data-room")({
  head: () => ({
    meta: [
      { title: "Virtual data room — Lengdon" },
      { name: "description", content: "A permissioned, NDA-gated data room with a closing pipeline and term negotiation run on top." },
    ],
    links: [{ rel: "canonical", href: "https://lengdon.com/virtual-data-room" }],
  }),
  component: VirtualDataRoomPage,
});

function VirtualDataRoomPage() {
  usePublicPageLightTheme();

  return (
    <div style={{ background: G_BASE, minHeight: "100vh" }}>
      <SiteHeader />
      <main id="main-content">
        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "72px 24px 64px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Eyebrow>Virtual data room</Eyebrow>
            <h1 className="pub-display" style={{ fontFamily: UI, color: INK, margin: 0, maxWidth: "20ch" }}>
              A room is where you start. A closing pipeline is what finishes it.
            </h1>
            <Prose>
              We give you the permissioned, NDA-gated room every deal needs
              — and then run the closing pipeline and term negotiation on
              top of it.
            </Prose>
          </div>
        </section>

        <section style={{ background: G_PANEL }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>
            <Eyebrow>The room</Eyebrow>
            <Title>Permissioned and NDA-gated</Title>
            <Prose>
              Documents live behind row-level access control, scoped to the
              deal room's own members. Counterparty profile and confidential
              detail stay unreadable until the room's NDA is signed — a real
              stage gate the app enforces, not a promise stated in a
              document.
            </Prose>
          </div>
        </section>

        <section style={{ background: G_RECESSED }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "56px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              <Eyebrow>Beyond the room</Eyebrow>
              <Title>The closing pipeline and term negotiation</Title>
            </div>
            <CardGrid
              items={[
                ["Six-gate close", "Legal counsel, agreement, platform fee, signing, investment payment, and close — each a mutual-confirmation gate, not a status flag."],
                ["Term negotiation", "Propose, accept, and counter, per term. A new value resets both parties' acceptance until they agree again."],
                ["A live reference number", "Every deal room mints its own reference number with a check digit on creation."],
              ]}
            />
          </div>
        </section>

        <section style={{ background: G_BASE }}>
          <div style={{ maxWidth: SHELL, margin: "0 auto", padding: "88px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <Action to="/how-it-works">See the full lifecycle</Action>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

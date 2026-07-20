import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUpcomingRoasts } from "@/lib/roast-fn";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { CostComparisonTable } from "@/components/site/CostComparisonTable";
import { CheckCircle2, ArrowRight, Shield, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hockystick — Fundraising infrastructure for GCC & MENA founders" },
      { name: "description", content: "Verified profiles, encrypted deal rooms, AI due diligence. The complete fundraising stack for founders raising from GCC & MENA investors." },
      { name: "keywords", content: "startup fundraising infrastructure, verified investor platform, founder due diligence, VC deal flow management, deal rooms, GCC & MENA fundraising" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Hockystick — Fundraising infrastructure for GCC & MENA founders" },
      { property: "og:description", content: "Verified profiles. Encrypted deal rooms. AI due diligence. The complete stack for GCC & MENA." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hockystick.app" },
      { property: "og:image", content: "https://hockystick.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hockystick — Fundraising infrastructure for GCC & MENA founders" },
      { name: "twitter:description", content: "Private deal rooms. Verified founders. Serious investors. Deals that close." },
    ],
    links: [
      { rel: "canonical", href: "https://hockystick.app" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap" },
    ],
  }),
  component: Landing,
});

/* ─── SHARED TOKENS ─────────────────────────────────────────────────────── */
const PURPLE = "var(--brand)";
const PURPLE_DARK = "#6d28d9";
const SYNE = "Syne, sans-serif";
const DM = "DM Sans, sans-serif";
const W60 = "var(--muted-foreground)";
const W70 = "var(--muted-foreground)";
const W40 = "var(--muted-foreground)";
const W08 = "var(--accent)";

/* ─── ROOT ───────────────────────────────────────────────────────────────── */
// Landing page is always light — dark adaptive sections are no longer used
function useDark(): boolean {
  return false;
}

function Landing() {
  const dark = useDark();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Force light theme on the landing page — don't write to localStorage
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);
  return (
    <div style={{ background: "var(--background)" }}>
      {/* SoftwareApplication structured data — what AI crawlers and search
          engines read when asked what Hockystick is. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Hockystick",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description:
              "AI-native deal flow platform for founders and investors in GCC & MENA. Verified profiles, NDA-gated deal rooms, structured due diligence, and recorded investment decisions.",
            offers: {
              "@type": "Offer",
              price: "49",
              priceCurrency: "USD",
              priceSpecification: {
                "@type": "RecurringChargeSpecification",
                billingDuration: "P1M",
              },
            },
            featureList: [
              "AI-powered founder profile extraction",
              "Evidence-based 5-tier verification system",
              "NDA-gated deal rooms with 6-stage workflow",
              "Confrontational AI due diligence analysis",
              "Investment memo generation",
              "Fundraising readiness scoring",
              "Badge and credential system",
              "Connection request to deal room automation",
            ],
            applicationSubCategory: "Fundraising · Due Diligence · Deal Flow Management",
            provider: {
              "@type": "Organization",
              name: "Hockystick",
              url: "https://hockystick.app",
              location: "DIFC, Dubai, UAE",
            },
          }),
        }}
      />
      <SiteHeader />
      <Hero />
      <SocialProofBar />
      <ProblemSection dark={dark} />
      <HowItWorks dark={dark} />
      <ForFounders dark={dark} />
      <ForInvestors dark={dark} />
      <WhoThisIsFor dark={dark} />
      <TrustSection />
      <UpcomingRoastsRail dark={dark} />
      <EarlyAccessSection dark={dark} />
      <PricingSection dark={dark} />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 1 — HERO
═══════════════════════════════════════════════════════════════════════════ */
function DealRoomCard() {
  const badge = (label: string, color: string, bg: string) => (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ color, background: bg, fontFamily: SYNE }}
    >
      {label}
    </span>
  );

  const docRow = (
    icon: string,
    name: string,
    sub: string,
    badgeLabel: string,
    badgeColor: string,
    badgeBg: string,
  ) => (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: `1px solid ${W08}` }}
    >
      <span className="text-base shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-foreground text-xs font-medium truncate" style={{ fontFamily: SYNE }}>{name}</div>
        <div className="text-[10px] truncate" style={{ color: W40, fontFamily: DM }}>{sub}</div>
      </div>
      {badge(badgeLabel, badgeColor, badgeBg)}
    </div>
  );

  return (
    <div className="relative w-full" style={{ perspective: "800px" }}>
      {/* Shadow card (depth) */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "#111113",
          border: `1px solid ${W08}`,
          transform: "rotate(1.5deg) translateY(8px) scale(0.97)",
          opacity: 0.5,
        }}
      />
      {/* Glow */}
      <div
        className="absolute -inset-8 rounded-3xl pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.22), transparent 70%)",
        }}
      />
      {/* Main card */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "#111113",
          border: `1px solid rgba(124,58,237,0.35)`,
          transform: "rotate(-1deg)",
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: "var(--background)", borderBottom: `1px solid ${W08}` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-md flex items-center justify-center text-foreground text-[10px] font-bold"
              style={{ background: PURPLE, fontFamily: SYNE }}
            >
              ML
            </div>
            <div>
              <div className="text-foreground text-xs font-bold tracking-wide" style={{ fontFamily: SYNE }}>
                MERIDIAN LOGISTICS
              </div>
              <div className="text-[10px]" style={{ color: W40, fontFamily: DM }}>
                Seed · Logistics Tech · GCC
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {badge("Active", "#10B981", "rgba(16,185,129,0.12)")}
          </div>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ background: "rgba(124,58,237,0.06)", borderBottom: `1px solid ${W08}` }}
        >
          {[
            { label: "37 days open" },
            { label: "14 doc views" },
            { label: "Match score 82/100" },
          ].map(({ label }) => (
            <span key={label} className="text-[10px]" style={{ color: W60, fontFamily: DM }}>
              {label}
            </span>
          ))}
        </div>

        {/* Document rows */}
        {docRow("📄", "Pitch Deck", "Opened 3× this week", "↓ Viewed", "#A855F7", "rgba(168,85,247,0.12)")}
        {docRow("📊", "Financial Model", "First opened 2 days ago", "⟳ Reviewing", "#F59E0B", "rgba(245,158,11,0.12)")}
        {docRow("📋", "Cap Table", "Awaiting access request", "🔒 Locked", "var(--faint)", "var(--accent)")}

        {/* Investor row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-foreground text-[9px] font-bold shrink-0"
              style={{ background: "rgba(124,58,237,0.3)", fontFamily: SYNE }}
            >
              SR
            </div>
            <span className="text-xs" style={{ color: W60, fontFamily: DM }}>
              S. Rahman · Crescent Capital
            </span>
          </div>
          <div className="flex items-center gap-1">
            {["Invest", "Hold", "Pass"].map((v, i) => (
              <button
                key={v}
                className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                style={{
                  color: W40,
                  borderColor: W08,
                  background: "transparent",
                  fontFamily: SYNE,
                  opacity: i === 0 ? 0.8 : 0.4,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      data-testid="hero-section"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "88vh", background: "var(--background)" }}
    >
      {/* Purple radial glow — behind content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(124,58,237,0.25), transparent 65%)",
        }}
      />

      <div className="relative max-w-[1100px] mx-auto px-6 pt-24 pb-16 lg:pt-32 lg:pb-20">
        {/* Eyebrow */}
        <div className="flex justify-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#A855F7",
              fontFamily: SYNE,
              letterSpacing: "0.06em",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#A855F7] animate-pulse" />
            Private deal rooms for GCC &amp; MENA
          </div>
        </div>

        {/* H1 */}
        <h1
          className="text-center mb-6 leading-[1.05]"
          style={{
            fontFamily: SYNE,
            fontWeight: 800,
            fontSize: "clamp(38px, 6.5vw, 68px)",
            letterSpacing: "-2px",
            color: "var(--foreground)",
          }}
        >
          The fundraising infrastructure
          <br />
          <span style={{ color: PURPLE }}>GCC & MENA founders needed.</span>
        </h1>

        {/* Subhead */}
        <p
          className="text-center mx-auto mb-10 leading-relaxed"
          style={{
            fontFamily: DM,
            fontWeight: 300,
            fontSize: "clamp(16px, 2.5vw, 22px)",
            color: "var(--muted-foreground)",
            maxWidth: "640px",
          }}
        >
          Verified profiles. Encrypted deal rooms. AI due diligence.
          <br />
          Built for founders raising capital from GCC & MENA investors — wherever they're based.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Link
            to="/sign-up"
            search={{ role: "founder" } as any}
            className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-foreground transition-colors"
            style={{ background: PURPLE, padding: "14px 32px", fontSize: "16px", fontFamily: SYNE }}
            onMouseEnter={(e) => { e.currentTarget.style.background = PURPLE_DARK; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = PURPLE; }}
          >
            Build your deal room <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/sign-up"
            search={{ role: "investor" } as any}
            className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-foreground transition-colors"
            style={{ border: "1px solid var(--border)", padding: "14px 32px", fontSize: "16px", fontFamily: SYNE }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            Review verified deals
          </Link>
        </div>

        {/* Social proof line */}
        <div className="flex justify-center mb-16">
          <p
            className="text-xs"
            style={{ color: W40, fontFamily: DM }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 mr-1.5 align-middle" />
            LIVE &nbsp;·&nbsp; GCC &amp; MENA &nbsp;·&nbsp; NDA-gated deal rooms &nbsp;·&nbsp; Free to start
          </p>
        </div>

        {/* Hero visual */}
        <div className="max-w-lg mx-auto">
          <DealRoomCard />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2 — SOCIAL PROOF BAR
═══════════════════════════════════════════════════════════════════════════ */
function SocialProofBar() {
  return (
    <section className="w-full py-4" style={{ background: "#111113" }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span className="text-xs" style={{ color: W40, fontFamily: DM }}>
            Founders raising across
          </span>
          <span className="text-sm font-medium text-foreground" style={{ fontFamily: DM }}>
            🌍 GCC & MENA & Beyond
          </span>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 3 — PROBLEM
═══════════════════════════════════════════════════════════════════════════ */
function ProblemSection({ dark }: { dark: boolean }) {
  const bg = dark ? "var(--background)" : "#F9FAFB";
  const cardBg = dark ? "#111113" : "#FFFFFF";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const bodyColor = dark ? W60 : "#4B5563";
  const statColor = dark ? "#FFFFFF" : "#111827";

  // Real platform numbers — keep these honest and update as they grow
  const stats = [
    {
      n: "7",
      label: "NDAs executed on-platform, DIAC-arbitrated",
    },
    {
      n: "3",
      label: "encrypted deal rooms live with staged document access",
    },
    {
      n: "1 platform",
      label: "to manage verified profiles, deal rooms, and decisions",
    },
  ];
  return (
    <section className="w-full py-24" style={{ background: bg }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="max-w-xl mb-14">
          <h2
            className="mb-6 leading-tight"
            style={{
              fontFamily: SYNE,
              fontWeight: 700,
              fontSize: "clamp(32px, 5vw, 48px)",
              color: headingColor,
            }}
          >
            The warm intro is the bottleneck.
          </h2>
          <p
            className="leading-relaxed"
            style={{ fontFamily: DM, fontWeight: 300, fontSize: "18px", color: bodyColor }}
          >
            Investors read 200 cold decks a week. They read the ones from founders someone they
            trust introduced. If you&rsquo;re not in the network, you&rsquo;re invisible.
            Hockystick is the network you didn&rsquo;t have to be born into.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {stats.map(({ n, label }) => (
            <div
              key={n}
              className="rounded-lg px-6 py-5"
              style={{
                background: cardBg,
                borderLeft: `3px solid ${PURPLE}`,
                boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="mb-2"
                style={{
                  fontFamily: SYNE,
                  fontWeight: 700,
                  fontSize: "36px",
                  color: statColor,
                }}
              >
                {n}
              </div>
              <p
                className="leading-snug"
                style={{ fontFamily: DM, fontSize: "14px", color: bodyColor }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4 — HOW IT WORKS
═══════════════════════════════════════════════════════════════════════════ */
const HOW_STEPS = [
  {
    n: "01",
    title: "Build your verified profile",
    body: "Upload documents, complete company details, pass our verification checks. Investors see what was confirmed — and what wasn’t. No inflated claims.",
  },
  {
    n: "02",
    title: "Get discovered by matched investors",
    body: "Investors filter by stage, sector, and geography. Your verified profile appears in their feed when you match their thesis. They request access — you approve.",
  },
  {
    n: "03",
    title: "Open a deal room",
    body: "NDA-gated. Encrypted. Three access tiers — public profile, initial data pack, full deal room. You decide what each investor sees.",
  },
  {
    n: "04",
    title: "Get a decision, not a ghost",
    body: "Investors submit Invest, Hold, or Pass in the room. Pass decisions include a reason. No more waiting for a reply that never comes.",
  },
];

function HowItWorks({ dark }: { dark: boolean }) {
  const bg = dark ? "var(--background)" : "#FFFFFF";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const bodyColor = dark ? W60 : "#4B5563";
  const gridDivider = dark ? "var(--accent)" : "#E5E7EB";

  return (
    <section id="how-it-works" className="w-full py-24" style={{ background: bg }}>
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Label + heading */}
        <div className="mb-16">
          <div
            className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: PURPLE, fontFamily: SYNE }}
          >
            HOW IT WORKS
          </div>
          <h2
            style={{
              fontFamily: SYNE,
              fontWeight: 700,
              fontSize: "clamp(32px, 5vw, 48px)",
              color: headingColor,
            }}
          >
            From profile to closed — in one place.
          </h2>
        </div>

        {/* 2×2 grid desktop, stack mobile */}
        <div className="grid md:grid-cols-2 gap-px" style={{ background: gridDivider }}>
          {HOW_STEPS.map((step, i) => (
            <div
              key={step.n}
              className="p-8"
              style={{
                background: dark
                  ? (i % 2 === 0 ? "#111113" : "#0D0D0F")
                  : (i % 2 === 0 ? "#F9FAFB" : "#FFFFFF"),
              }}
            >
              <div
                className="mb-4 text-sm font-bold"
                style={{ color: PURPLE, fontFamily: SYNE }}
              >
                {step.n}
              </div>
              <h3
                className="mb-3"
                style={{ fontFamily: SYNE, fontWeight: 600, fontSize: "20px", color: headingColor }}
              >
                {step.title}
              </h3>
              <p
                className="leading-relaxed"
                style={{ fontFamily: DM, fontWeight: 300, fontSize: "15px", color: bodyColor }}
              >
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5 — FOR FOUNDERS
═══════════════════════════════════════════════════════════════════════════ */
function ReadinessMockup() {
  const gaps = [
    { label: "LinkedIn URL", ok: false, pts: "-8 pts" },
    { label: "Financial model", ok: false, pts: "-15 pts" },
    { label: "Pitch deck", ok: true, pts: "+12 pts" },
  ];
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#111113", border: `1px solid ${W08}` }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: `1px solid ${W08}`, background: "var(--background)" }}
      >
        <div className="text-xs font-semibold text-foreground" style={{ fontFamily: SYNE }}>
          Readiness Score
        </div>
      </div>
      {/* Score */}
      <div className="px-5 pt-5 pb-4">
        <div
          className="mb-1"
          style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "48px", color: "var(--foreground)" }}
        >
          74 <span style={{ fontSize: "20px", color: W40, fontWeight: 400 }}>/ 100</span>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full mb-5" style={{ background: "var(--accent)" }}>
          <div className="h-2 rounded-full" style={{ width: "74%", background: PURPLE }} />
        </div>
        {/* Gap items */}
        <div className="space-y-2">
          {gaps.map(({ label, ok, pts }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] shrink-0"
                  style={{
                    background: ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
                    color: ok ? "#10B981" : "#EF4444",
                  }}
                >
                  {ok ? "✓" : "✗"}
                </span>
                <span className="text-xs" style={{ color: ok ? W70 : W60, fontFamily: DM }}>
                  {label}
                </span>
              </div>
              <span
                className="text-[10px] font-semibold"
                style={{ color: ok ? "#10B981" : "#EF4444", fontFamily: SYNE }}
              >
                {pts}
              </span>
            </div>
          ))}
        </div>
        {/* Action */}
        <div
          className="mt-4 rounded-lg px-3 py-2.5 text-xs leading-snug"
          style={{
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)",
            color: W60,
            fontFamily: DM,
          }}
        >
          <span style={{ color: "#A855F7", fontFamily: SYNE, fontWeight: 600 }}>Top action: </span>
          Upload your financial model before your next investor call.
        </div>
      </div>
    </div>
  );
}

const FOUNDER_FEATS = [
  "Build a secure deal room in minutes",
  "Control exactly what each investor sees — public, NDA, or full access",
  "Get a readiness score before your first investor call",
  "Know which investors match your stage, sector, and raise size",
  "Track every investor: views, time spent, documents opened",
  "Get structured feedback when investors pass — not silence",
];

function ForFounders({ dark }: { dark: boolean }) {
  const bg = dark ? "#111113" : "#F9FAFB";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const featureColor = dark ? W70 : "#374151";
  const captionColor = dark ? W40 : "#6B7280";

  return (
    <section
      id="for-founders"
      className="w-full py-24"
      style={{ background: bg }}
    >
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Content */}
          <div>
            <div
              className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: PURPLE, fontFamily: SYNE }}
            >
              FOR FOUNDERS
            </div>
            <h2
              className="mb-5 leading-tight"
              style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", color: headingColor }}
            >
              Everything an analyst, lawyer, and advisor would prepare.
              <br />
              Built in minutes.
            </h2>
            <ul className="space-y-3 mb-8">
              {FOUNDER_FEATS.map((f) => (
                <li key={f} className="flex gap-3">
                  <ArrowRight
                    className="h-4 w-4 shrink-0 mt-0.5"
                    style={{ color: PURPLE }}
                  />
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: featureColor, fontFamily: DM }}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              className="inline-flex items-center gap-2 rounded-lg font-semibold text-foreground transition-colors"
              style={{ background: PURPLE, padding: "12px 24px", fontSize: "14px", fontFamily: SYNE }}
              onMouseEnter={(e) => { e.currentTarget.style.background = PURPLE_DARK; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = PURPLE; }}
            >
              Start raising <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs" style={{ color: captionColor, fontFamily: DM }}>
              Verified founders, actively raising on Hockystick
            </p>
          </div>

          {/* Mockup */}
          <ReadinessMockup />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6 — FOR INVESTORS
═══════════════════════════════════════════════════════════════════════════ */
function InvestorCardMockup() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#111113", border: `1px solid ${W08}` }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${W08}`, background: "var(--background)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center text-foreground text-[10px] font-bold"
            style={{ background: PURPLE, fontFamily: SYNE }}
          >
            ML
          </div>
          <div>
            <div className="text-foreground text-xs font-bold tracking-wide" style={{ fontFamily: SYNE }}>
              MERIDIAN LOGISTICS
            </div>
            <div className="text-[10px]" style={{ color: W40, fontFamily: DM }}>Seed · Logistics Tech · GCC</div>
          </div>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981", fontFamily: SYNE }}
        >
          Match: 82/100
        </span>
      </div>
      {/* Body rows */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#10B981" }} />
          <span className="text-xs" style={{ color: W70, fontFamily: DM }}>
            Verification: Tier 1 · Company registered · Website live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#10B981" }} />
          <span className="text-xs" style={{ color: W70, fontFamily: DM }}>
            Stage: Seed · Sector: Logistics Tech · Raise: $2M
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", fontFamily: SYNE }}
          >
            IN DILIGENCE
          </span>
          <div className="flex items-center gap-1.5">
            {(["Invest", "Hold", "Pass"] as const).map((v, i) => (
              <button
                key={v}
                className="text-[10px] px-2.5 py-1 rounded border"
                style={{
                  color: i === 0 ? "#10B981" : i === 1 ? "#F59E0B" : "#EF4444",
                  borderColor:
                    i === 0
                      ? "rgba(16,185,129,0.3)"
                      : i === 1
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(239,68,68,0.3)",
                  background: "transparent",
                  fontFamily: SYNE,
                  fontWeight: 600,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const INVESTOR_FEATS = [
  "Set your thesis once — get matched deals every day",
  "See what’s verified before you open a single document",
  "Deal rooms with NDA, document vault, and DD checklist built in",
  "Match score tells you thesis fit before you spend 10 minutes reading",
  "Submit Invest/Hold/Pass in the room — your decisions, tracked",
  "Pipeline kanban from sourcing to signed term sheet",
];

function ForInvestors({ dark }: { dark: boolean }) {
  const bg = dark ? "var(--background)" : "#FFFFFF";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const featureColor = dark ? W70 : "#374151";
  const btnBorder = dark ? "1px solid var(--border)" : "1px solid var(--brand)";
  const btnColor = dark ? "#FFFFFF" : PURPLE;
  const btnHoverBg = dark ? "var(--accent)" : "rgba(124,58,237,0.06)";

  return (
    <section
      id="for-investors"
      className="w-full py-24"
      style={{ background: bg }}
    >
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Mockup — left */}
          <div className="order-2 lg:order-1">
            <InvestorCardMockup />
          </div>

          {/* Content — right */}
          <div className="order-1 lg:order-2">
            <div
              className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: PURPLE, fontFamily: SYNE }}
            >
              FOR INVESTORS
            </div>
            <h2
              className="mb-5 leading-tight"
              style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", color: headingColor }}
            >
              Analyst-grade deal flow.
              <br />
              Without the analyst.
            </h2>
            <ul className="space-y-3 mb-8">
              {INVESTOR_FEATS.map((f) => (
                <li key={f} className="flex gap-3">
                  <ArrowRight
                    className="h-4 w-4 shrink-0 mt-0.5"
                    style={{ color: PURPLE }}
                  />
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: featureColor, fontFamily: DM }}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to="/sign-up"
              search={{ role: "investor" } as any}
              className="inline-flex items-center gap-2 rounded-lg font-semibold transition-colors"
              style={{ border: btnBorder, padding: "12px 24px", fontSize: "14px", fontFamily: SYNE, color: btnColor }}
              onMouseEnter={(e) => { e.currentTarget.style.background = btnHoverBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Join as an investor <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6.5 — WHO THIS IS FOR
═══════════════════════════════════════════════════════════════════════════ */
const AUDIENCE_FOR = [
  "Seed and Series A founders raising capital from GCC & MENA investors",
  "Family offices managing 5–50 active deals",
  "VC analysts sourcing deal flow without a full team",
  "Accelerator cohorts preparing portfolio companies for investment",
];

const AUDIENCE_NOT_FOR = [
  "Pre-idea stage founders with no product",
  "Retail investors looking for crowdfunding opportunities",
  "Companies seeking debt financing or bank loans",
];

function WhoThisIsFor({ dark }: { dark: boolean }) {
  const bg = dark ? "#111113" : "#F9FAFB";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const itemColor = dark ? W70 : "#374151";
  const notColor = dark ? W40 : "#6B7280";
  const cardBg = dark ? "var(--background)" : "#FFFFFF";
  const cardBorder = dark ? "1px solid var(--border)" : "1px solid #E5E7EB";

  return (
    <section className="w-full py-24" style={{ background: bg }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-12">
          <h2
            style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", color: headingColor }}
          >
            Built for serious capital. On both sides.
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl p-8" style={{ background: cardBg, border: cardBorder }}>
            <h3
              className="mb-5 text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: PURPLE, fontFamily: SYNE }}
            >
              This platform is for
            </h3>
            <ul className="space-y-3">
              {AUDIENCE_FOR.map((a) => (
                <li key={a} className="flex gap-3">
                  <ArrowRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: PURPLE }} />
                  <span className="text-sm leading-relaxed" style={{ color: itemColor, fontFamily: DM }}>
                    {a}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl p-8" style={{ background: cardBg, border: cardBorder }}>
            <h3
              className="mb-5 text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: notColor, fontFamily: SYNE }}
            >
              This platform is not for
            </h3>
            <ul className="space-y-3">
              {AUDIENCE_NOT_FOR.map((a) => (
                <li key={a} className="flex gap-3">
                  <span className="text-sm shrink-0 mt-0.5" style={{ color: notColor }}>✕</span>
                  <span className="text-sm leading-relaxed" style={{ color: notColor, fontFamily: DM }}>
                    {a}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 7 — TRUST — always purple
═══════════════════════════════════════════════════════════════════════════ */
function UpcomingRoastsRail({ dark }: { dark: boolean }) {
  const { data } = useQuery({
    queryKey: ["upcoming-roasts"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => getUpcomingRoasts(),
  });
  const roasts = data?.roasts ?? [];
  if (!roasts.length) return null;
  return (
    <section
      className="w-full py-16"
      style={{ background: dark ? "var(--background)" : "#FAFAFA" }}
    >
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-8">
          <div
            className="uppercase mb-2"
            style={{
              fontFamily: SYNE,
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.12em",
              color: "#EF4444",
            }}
          >
            🔥 Live Founder Roasts
          </div>
          <h2
            style={{
              fontFamily: SYNE,
              fontWeight: 700,
              fontSize: "clamp(24px, 3.5vw, 34px)",
              color: dark ? "#FFFFFF" : "#111827",
            }}
          >
            Watch founders answer anything, in public
          </h2>
          <p
            className="mx-auto mt-3 leading-relaxed"
            style={{
              fontFamily: DM,
              fontWeight: 300,
              fontSize: 16,
              color: dark ? "var(--muted-foreground)" : "#6B7280",
              maxWidth: 520,
            }}
          >
            A 60-second pitch, then the audience races to ask. Every question
            gets answered on the record — or the record says so.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-[900px] mx-auto">
          {roasts.map((r) => (
            <a
              key={r.id}
              href={`/roast/${r.id}`}
              className="rounded-xl border p-5 transition-transform hover:-translate-y-0.5"
              style={{
                background: dark ? "var(--card)" : "#FFFFFF",
                borderColor: dark ? "var(--border)" : "#E5E7EB",
              }}
            >
              <div
                className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mb-3"
                style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
              >
                Level {r.level}
              </div>
              <div
                className="mb-1"
                style={{
                  fontFamily: SYNE,
                  fontWeight: 700,
                  fontSize: 16,
                  color: dark ? "#FFFFFF" : "#111827",
                }}
              >
                {r.company_name ?? "A Hockystick founder"}
              </div>
              {r.tagline && (
                <div
                  className="mb-3 line-clamp-2"
                  style={{
                    fontFamily: DM,
                    fontSize: 13,
                    color: dark ? "var(--muted-foreground)" : "#6B7280",
                  }}
                >
                  {r.tagline}
                </div>
              )}
              <div
                style={{
                  fontFamily: DM,
                  fontSize: 13,
                  fontWeight: 500,
                  color: dark ? "var(--muted-foreground)" : "#374151",
                }}
              >
                {new Date(r.scheduled_at).toLocaleString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · join as a challenger →
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="w-full py-20" style={{ background: PURPLE }}>
      <div className="max-w-[1100px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="mb-4"
            style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", color: "var(--foreground)" }}
          >
            The full stack. One subscription.
          </h2>
          <p
            className="mx-auto leading-relaxed"
            style={{ fontFamily: DM, fontWeight: 300, fontSize: "18px", color: "var(--muted-foreground)", maxWidth: "560px" }}
          >
            Most platforms check whether founders exist.
            We check whether they&rsquo;re ready — and whether investors are serious.
          </p>
        </div>

        {/* Comparison table */}
        <div className="max-w-3xl mx-auto">
          <CostComparisonTable variant="dark" />
        </div>

        {/* Bottom line */}
        <p
          className="text-center mt-10 text-base"
          style={{ color: "var(--muted-foreground)", fontFamily: DM, fontWeight: 400 }}
        >
          Competitors verify founders only.&nbsp;&nbsp;Hockystick verifies both.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 7.5 — EARLY ACCESS (social proof)
   No fabricated testimonials — the feedback table is empty as of July 2026.
   When real founder quotes exist, replace this section with them.
═══════════════════════════════════════════════════════════════════════════ */
function EarlyAccessSection({ dark }: { dark: boolean }) {
  const bg = dark ? "var(--background)" : "#FFFFFF";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const bodyColor = dark ? W60 : "#4B5563";

  return (
    <section className="w-full py-20" style={{ background: bg }}>
      <div className="max-w-[700px] mx-auto px-6 text-center">
        <div
          className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: PURPLE, fontFamily: SYNE }}
        >
          EARLY ACCESS
        </div>
        <h2
          className="mb-4"
          style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3.5vw, 32px)", color: headingColor }}
        >
          Join our growing community of founders preparing for institutional fundraising.
        </h2>
        <p
          className="leading-relaxed"
          style={{ fontFamily: DM, fontWeight: 300, fontSize: "16px", color: bodyColor }}
        >
          Hockystick is in beta with founders raising across the GCC. Every profile is
          verified, every deal room is NDA-gated, and every claim on this page is a real
          platform number — not a projection.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 8 — PRICING
═══════════════════════════════════════════════════════════════════════════ */
const FOUNDER_PLAN = [
  "Verified profile + verification badge",
  "Unlimited deal rooms",
  "Investor pipeline tracking",
  "NDA-gated document vault",
  "Readiness score + coaching",
  "Investor simulation (how a VC sees you)",
  "Deal room analytics (views, time spent)",
];

const INVESTOR_PLAN = [
  "Set investment thesis",
  "Browse verified founder directory",
  "Thesis matching (daily updates)",
  "Deal rooms + DD workstation",
  "Decision board (kanban pipeline)",
  "Deal intake (paste any founder data)",
];

function PricingSection({ dark }: { dark: boolean }) {
  const bg = dark ? "#111113" : "#F9FAFB";
  const cardBgPrimary = dark ? "var(--background)" : "#FFFFFF";
  const cardBgSecondary = dark ? "var(--background)" : "#FFFFFF";
  const headingColor = dark ? "#FFFFFF" : "#111827";
  const subColor = dark ? W60 : "#4B5563";
  const labelColor = dark ? W40 : "#6B7280";
  const priceColor = dark ? "#FFFFFF" : "#111827";
  const cardSecondaryBorder = dark ? "1px solid var(--border)" : "1px solid #E5E7EB";
  const investorBtnBorder = dark ? "1px solid var(--border)" : "1px solid var(--brand)";
  const investorBtnColor = dark ? "#FFFFFF" : PURPLE;
  const investorBtnHover = dark ? "var(--accent)" : "rgba(124,58,237,0.06)";

  const tick = (text: string) => (
    <li key={text} className="flex gap-2.5">
      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
      <span className="text-sm" style={{ color: dark ? W70 : "#374151", fontFamily: DM }}>
        {text}
      </span>
    </li>
  );

  return (
    <section className="w-full py-24" style={{ background: bg }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-12">
          <h2
            className="mb-3"
            style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(28px, 4vw, 40px)", color: headingColor }}
          >
            Simple pricing.
            <br />
            No surprises.
          </h2>
          <p style={{ fontFamily: DM, fontWeight: 300, fontSize: "16px", color: subColor }}>
            Start free. Upgrade when you&rsquo;re ready to get serious.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Founder card */}
          <div
            className="rounded-2xl p-8 relative"
            style={{ background: cardBgPrimary, border: `2px solid ${PURPLE}`, boxShadow: dark ? "none" : "0 2px 12px rgba(124,58,237,0.1)" }}
          >
            <div
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold text-foreground"
              style={{ background: PURPLE, fontFamily: SYNE }}
            >
              Most popular
            </div>
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: labelColor, fontFamily: SYNE }}
            >
              Founder Pro
            </div>
            <div
              className="mb-1"
              style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "40px", color: priceColor }}
            >
              $49
              <span style={{ fontSize: "18px", fontWeight: 400, color: labelColor }}> /month</span>
            </div>
            <p className="text-xs mb-6" style={{ color: labelColor, fontFamily: DM }}>
              7-day free trial. No credit card required.
            </p>
            <ul className="space-y-3 mb-8">
              {FOUNDER_PLAN.map(tick)}
            </ul>
            <Link
              to="/sign-up"
              search={{ role: "founder" } as any}
              className="block w-full text-center rounded-lg font-semibold text-foreground transition-colors"
              style={{ background: PURPLE, padding: "12px 0", fontFamily: SYNE }}
              onMouseEnter={(e) => { e.currentTarget.style.background = PURPLE_DARK; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = PURPLE; }}
            >
              Start for free — upgrade anytime
            </Link>
          </div>

          {/* Investor card */}
          <div
            className="rounded-2xl p-8"
            style={{ background: cardBgSecondary, border: cardSecondaryBorder, boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: labelColor, fontFamily: SYNE }}
            >
              Investor Access
            </div>
            <div
              className="mb-1"
              style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "40px", color: priceColor }}
            >
              Free during beta
            </div>
            <p className="text-xs mb-6" style={{ color: labelColor, fontFamily: DM }}>
              Open registration. Build a verified investor profile, set your thesis, and get thesis-matched deal flow. Founders see your fund, thesis, and verification tier before sharing.
            </p>
            <ul className="space-y-3 mb-8">
              {INVESTOR_PLAN.map(tick)}
            </ul>
            <Link
              to="/sign-up"
              search={{ role: "investor" } as any}
              className="block w-full text-center rounded-lg font-semibold transition-colors"
              style={{ border: investorBtnBorder, padding: "12px 0", fontFamily: SYNE, color: investorBtnColor }}
              onMouseEnter={(e) => { e.currentTarget.style.background = investorBtnHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              Create investor account →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 9 — FINAL CTA — always purple
═══════════════════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="w-full py-24 text-center" style={{ background: PURPLE }}>
      <div className="max-w-[1100px] mx-auto px-6">
        <h2
          className="mb-4"
          style={{
            fontFamily: SYNE,
            fontWeight: 700,
            fontSize: "clamp(32px, 5vw, 48px)",
            color: "var(--foreground)",
          }}
        >
          Ready to raise differently?
        </h2>
        <p
          className="mb-10 mx-auto"
          style={{
            fontFamily: DM,
            fontWeight: 300,
            fontSize: "18px",
            color: "var(--muted-foreground)",
            maxWidth: "480px",
          }}
        >
          GCC &amp; MENA focused. Global by design.
          <br />
          The infrastructure serious founders use to raise.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/sign-up"
            search={{ role: "founder" } as any}
            className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors"
            style={{ background: "#FFFFFF", color: PURPLE, padding: "14px 32px", fontSize: "15px", fontFamily: SYNE }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f0ecff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
          >
            Start as a founder <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/sign-up"
            search={{ role: "investor" } as any}
            className="inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-foreground transition-colors"
            style={{ border: "1px solid var(--border)", padding: "14px 32px", fontSize: "15px", fontFamily: SYNE }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            I&rsquo;m an investor
          </Link>
        </div>
      </div>
    </section>
  );
}

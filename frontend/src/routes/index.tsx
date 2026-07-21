import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { VaultScrollSequence } from "@/components/site/VaultScrollSequence";
import {
  ArrowRight, CheckCircle2, ShieldCheck, FileText, Video,
  Scale, FileSignature, Plus, Minus,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hockystick — From first meeting to signed agreement" },
      { name: "description", content: "The fundraising platform where founders and investors meet, run due diligence, negotiate terms, and close — entirely in-platform. Verified profiles, deal rooms, AI-powered interviews, term negotiation, and closing." },
      { name: "keywords", content: "fundraising platform, verified investor platform, due diligence, deal rooms, term negotiation, startup fundraising, investor deal flow" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Hockystick — From first meeting to signed agreement" },
      { property: "og:description", content: "Verified profiles. Deal rooms. AI-powered interviews. Term negotiation to signed agreement — entirely in-platform." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hockystick.app" },
      { property: "og:image", content: "https://hockystick.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hockystick — From first meeting to signed agreement" },
      { name: "twitter:description", content: "The complete fundraising transaction platform. Verified both sides. Close deals in-platform." },
    ],
    links: [
      { rel: "canonical", href: "https://hockystick.app" },
    ],
  }),
  component: Landing,
});

/* ─── TOKENS ─────────────────────────────────────────────────────────────── */
const SYNE = "Syne, sans-serif";
const DM = "DM Sans, sans-serif";
const BRAND = "#7C3AED";
const INK = "#0A0A0B";
const SECONDARY = "#52525B";
const BORDER = "#E4E4E7";

/* ─── ROOT ───────────────────────────────────────────────────────────────── */
function Landing() {
  // Landing is always light except the vault hero + the one purple comparison band.
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
    <div style={{ background: "#FFFFFF" }}>
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
              "A verified fundraising platform where founders and investors meet, run due diligence, hold structured interviews, negotiate terms, and close deals — entirely in-platform.",
            offers: { "@type": "Offer", price: "49", priceCurrency: "USD" },
            provider: { "@type": "Organization", name: "Hockystick", url: "https://hockystick.app" },
          }),
        }}
      />
      <SiteHeader />
      <Hero />
      <ProblemSection />
      <ProductBands />
      <TwoWayTrust />
      <HowItWorks />
      <ForFoundersInvestors />
      <ComparisonBand />
      <PricingPreview />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 2 — HERO (over the vault scroll canvas)
═══════════════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <VaultScrollSequence>
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h1
          className="mx-auto max-w-3xl"
          style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(40px, 7vw, 68px)", lineHeight: 1.05, letterSpacing: "-0.02em", color: "#FFFFFF" }}
        >
          From first meeting to signed agreement. One platform.
        </h1>
        <p
          className="mx-auto mt-6 max-w-2xl"
          style={{ fontFamily: DM, fontWeight: 400, fontSize: "clamp(16px, 2.2vw, 20px)", lineHeight: 1.5, color: "rgba(255,255,255,0.88)" }}
        >
          Verified profiles. Structured due diligence. AI-powered interviews.
          Term negotiation to signed agreement — entirely in-platform.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/sign-up"
            search={{ role: "founder" } as any}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[2px] px-6 text-[15px] font-semibold"
            style={{ background: BRAND, color: "#FFFFFF", fontFamily: SYNE }}
          >
            Create founder account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/sign-up"
            search={{ role: "investor" } as any}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[2px] px-6 text-[15px] font-semibold"
            style={{ background: "transparent", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.5)", fontFamily: SYNE }}
          >
            I&rsquo;m an investor
          </Link>
        </div>
        <p className="mt-6 text-[13px]" style={{ fontFamily: DM, color: "rgba(255,255,255,0.72)" }}>
          Free during beta · No credit card required · DIFC regulated
        </p>
      </div>
    </VaultScrollSequence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 3 — PROBLEM
═══════════════════════════════════════════════════════════════════════════ */
function ProblemSection() {
  return (
    <section className="w-full" style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}` }}>
      <div className="mx-auto max-w-[1000px] px-6 py-24 sm:py-28">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND, fontFamily: DM }}>
          The warm intro is broken
        </p>
        <p style={{ fontFamily: SYNE, fontWeight: 600, fontSize: "clamp(26px, 3.6vw, 40px)", lineHeight: 1.25, color: INK, letterSpacing: "-0.01em" }}>
          Founders spend months chasing introductions. Investors waste hours on
          unverified pitches that go nowhere. Deals stall between scattered emails,
          shared drives, and a dozen open tabs. Both sides lose time they can&rsquo;t
          get back.
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 4 — PRODUCT BANDS (alternating text/screenshot)
═══════════════════════════════════════════════════════════════════════════ */
type Band = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  eyebrow: string;
  title: string;
  bullets: string[];
  /* TODO(screenshots): replace ShotPlaceholder with a real 2x production capture
     from hockystick.app using the test accounts. See report for the list. */
  shotLabel: string;
};

const BANDS: Band[] = [
  {
    icon: ShieldCheck,
    eyebrow: "Verification",
    title: "Verified from day one",
    bullets: [
      "Five-tier verification built from real documents, cross-checked by AI",
      "Both founders and investors are verified — not just one side",
      "Verification tier is visible before either party requests access",
      "Badges reflect exactly what was checked — never asserted, always evidenced",
    ],
    shotLabel: "Verification tiers — /app profile",
  },
  {
    icon: FileText,
    eyebrow: "Deal rooms",
    title: "Deal rooms with teeth",
    bullets: [
      "Private, NDA-gated spaces scoped to one founder and one investor",
      "Document vault with role-based access and full access logging",
      "Structured due-diligence workstation with a shared checklist",
      "AI document analysis — findings source-cited and confidence-scored",
    ],
    shotLabel: "Deal room — Due Diligence workstation",
  },
  {
    icon: Video,
    eyebrow: "Interviews",
    title: "Structured interviews, AI notes",
    bullets: [
      "Five video stages: Introduction, Product Demo, Financials, Terms, Investment Terms",
      "Live transcription of every meeting",
      "AI extracts notes cited back to the transcript — no fabricated claims",
      "Figures attributed to the speaker, never asserted as verified fact",
    ],
    shotLabel: "Interview sequence — meeting notes",
  },
  {
    icon: Scale,
    eyebrow: "Negotiation",
    title: "Negotiate terms, not emails",
    bullets: [
      "Four instrument types: SAFE, Equity, Debt, and Company Sale",
      "Per-term propose, accept, reject, or counter — with a full audit trail",
      "Both parties see every change in real time",
      "Agreed terms lock automatically and carry into the agreement",
    ],
    shotLabel: "Term negotiation — per-term proposals",
  },
  {
    icon: FileSignature,
    eyebrow: "Closing",
    title: "Close the deal. Get the invoice.",
    bullets: [
      "Locked terms generate a summary; counsel can draft the agreement",
      "Both parties sign, payment is confirmed, and the deal closes",
      "The room becomes a permanent, read-only archive",
      "Invoices are generated automatically at close",
    ],
    shotLabel: "Closing pipeline — signed & invoiced",
  },
];

function ShotPlaceholder({ label }: { label: string }) {
  // TODO(screenshots): swap this browser-chrome placeholder for a real 2x capture
  // from the live app (see report for exact routes). Structure mirrors the app UI.
  return (
    <div className="w-full overflow-hidden rounded-[2px]" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2.5" style={{ background: "#FAFAFA", borderBottom: `1px solid ${BORDER}` }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E4E4E7" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E4E4E7" }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E4E4E7" }} />
        <span className="ml-3 text-[11px]" style={{ color: "#71717A", fontFamily: DM }}>hockystick.app</span>
      </div>
      <div className="flex aspect-[16/10] items-center justify-center" style={{ background: "#FFFFFF" }}>
        <span className="px-6 text-center text-[13px]" style={{ color: "#71717A", fontFamily: DM }}>{label}</span>
      </div>
    </div>
  );
}

function ProductBands() {
  return (
    <section className="w-full" style={{ background: "#FFFFFF" }}>
      {BANDS.map((b, i) => {
        const Icon = b.icon;
        const imageFirst = i % 2 === 1;
        return (
          <div key={b.title} style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 py-20 sm:py-24 lg:grid-cols-[45fr_55fr]">
              <div className={imageFirst ? "lg:order-2" : ""}>
                <div className="mb-4 inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" style={{ color: BRAND }} />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND, fontFamily: DM }}>{b.eyebrow}</span>
                </div>
                <h2 style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3vw, 34px)", lineHeight: 1.15, color: INK, letterSpacing: "-0.01em" }}>
                  {b.title}
                </h2>
                <ul className="mt-6 space-y-3">
                  {b.bullets.map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                      <span className="text-[15px]" style={{ color: SECONDARY, fontFamily: DM, lineHeight: 1.5 }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={imageFirst ? "lg:order-1" : ""}>
                <ShotPlaceholder label={b.shotLabel} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 5 — TWO-WAY TRUST
═══════════════════════════════════════════════════════════════════════════ */
function TwoWayTrust() {
  return (
    <section className="w-full" style={{ background: "#FAFAFA", borderBottom: `1px solid ${BORDER}` }}>
      <div className="mx-auto max-w-[1100px] px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(26px, 3.4vw, 38px)", lineHeight: 1.15, color: INK, letterSpacing: "-0.01em" }}>
          Competitors verify founders. We verify both.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: SECONDARY, fontFamily: DM, lineHeight: 1.5 }}>
          Trust runs both ways. Every founder and every investor builds a verification
          tier before a single document changes hands.
        </p>
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {[
            { t: "Founders are verified", d: "Incorporation, financials, customers, and team — checked against real documents, not claims." },
            { t: "Investors are verified", d: "Fund details, thesis, and track record — so founders know who they're talking to before they share." },
          ].map((c) => (
            <div key={c.t} className="p-8 text-left rounded-[2px]" style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}>
              <div className="mb-3 inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" style={{ color: BRAND }} />
                <h3 style={{ fontFamily: SYNE, fontWeight: 600, fontSize: "18px", color: INK }}>{c.t}</h3>
              </div>
              <p className="text-[14px]" style={{ color: SECONDARY, fontFamily: DM, lineHeight: 1.5 }}>{c.d}</p>
            </div>
          ))}
        </div>
        <Link to="/trust" className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: BRAND, fontFamily: DM }}>
          How verification works <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 6 — HOW IT WORKS
═══════════════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { n: "1", t: "Build your verified profile" },
    { n: "2", t: "Connect in a deal room" },
    { n: "3", t: "Negotiate and agree terms" },
    { n: "4", t: "Close with confidence" },
  ];
  return (
    <section className="w-full" style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}` }}>
      <div className="mx-auto max-w-[1200px] px-6 py-24">
        <h2 className="mb-14 text-center" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3vw, 34px)", color: INK, letterSpacing: "-0.01em" }}>
          How it works
        </h2>
        <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: BORDER, border: `1px solid ${BORDER}` }}>
          {steps.map((s) => (
            <div key={s.n} className="flex flex-col gap-4 p-8" style={{ background: "#FFFFFF" }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-[2px] text-[15px] font-bold" style={{ background: BRAND, color: "#FFFFFF", fontFamily: SYNE }}>
                {s.n}
              </div>
              <p style={{ fontFamily: SYNE, fontWeight: 600, fontSize: "17px", color: INK, lineHeight: 1.25 }}>{s.t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 7 — FOR FOUNDERS / FOR INVESTORS
═══════════════════════════════════════════════════════════════════════════ */
function ForFoundersInvestors() {
  return (
    <section className="w-full" style={{ background: "#FFFFFF" }}>
      {/* Founders */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="mx-auto max-w-[1000px] px-6 py-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND, fontFamily: DM }}>For founders</p>
          <h2 style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3vw, 34px)", color: INK, letterSpacing: "-0.01em" }}>
            Raise on your terms, with your work already verified
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {[
              "A verified profile investors trust before the first conversation",
              "Private deal rooms — you decide who sees what, and when",
              "AI document analysis that surfaces gaps before an investor does",
              "Structured interviews and term negotiation, all in one place",
              "Close, sign, and archive the deal without leaving the platform",
              "No fee unless the deal actually closes",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                <span className="text-[15px]" style={{ color: SECONDARY, fontFamily: DM, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
          <Link to="/sign-up" search={{ role: "founder" } as any} className="mt-9 inline-flex h-9 items-center gap-2 rounded-[2px] px-5 text-[14px] font-semibold" style={{ background: BRAND, color: "#FFFFFF", fontFamily: SYNE }}>
            Create your verified profile <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {/* Investors */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="mx-auto max-w-[1000px] px-6 py-24">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND, fontFamily: DM }}>For investors</p>
          <h2 style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3vw, 34px)", color: INK, letterSpacing: "-0.01em" }}>
            Thesis-matched deal flow you can actually trust
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {[
              "Thesis-matched founders surfaced automatically as they join",
              "Verification tier visible before you request access",
              "AI-powered Deal Intake analysis on every opportunity",
              "Structured due diligence with source-cited findings",
              "Term negotiation with a full, auditable history",
              "One workspace from sourcing to signed agreement",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                <span className="text-[15px]" style={{ color: SECONDARY, fontFamily: DM, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
          <Link to="/sign-up" search={{ role: "investor" } as any} className="mt-9 inline-flex h-9 items-center gap-2 rounded-[2px] px-5 text-[14px] font-semibold" style={{ background: BRAND, color: "#FFFFFF", fontFamily: SYNE }}>
            Start sourcing deal flow <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 8 — COMPARISON BAND (the one dark violet #7C3AED band)
═══════════════════════════════════════════════════════════════════════════ */
const COMPARE_ROWS: { feature: string; traditional: string; competitors: string; hockystick: string }[] = [
  { feature: "Verification", traditional: "None — reputation only", competitors: "Founders only", hockystick: "Both sides, evidence-based" },
  { feature: "Structured due diligence", traditional: "Ad-hoc, in email", competitors: "Basic checklist", hockystick: "Workstation + AI analysis" },
  { feature: "AI interviews", traditional: "None", competitors: "None", hockystick: "5 stages, source-cited notes" },
  { feature: "Term negotiation", traditional: "Lawyers + email", competitors: "Document upload", hockystick: "4 instruments, per-term audit" },
  { feature: "Agreement + close", traditional: "Offline, weeks", competitors: "Not supported", hockystick: "Sign, pay, close in-platform" },
  { feature: "Fee transparency", traditional: "Opaque advisory %", competitors: "Subscription only", hockystick: "1.5% at close, capped" },
];

function ComparisonBand() {
  return (
    <section className="w-full" style={{ background: BRAND }}>
      <div className="mx-auto max-w-[1100px] px-6 py-24">
        <h2 className="mb-3 text-center" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(26px, 3.4vw, 38px)", color: "#FFFFFF", letterSpacing: "-0.01em" }}>
          One platform. The whole transaction.
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-[16px]" style={{ color: "rgba(255,255,255,0.88)", fontFamily: DM }}>
          What fundraising takes today, versus what it takes on Hockystick.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                {["", "Traditional", "Competitors", "Hockystick"].map((h, i) => (
                  <th key={h || i} className="px-4 py-3 text-[12px] font-bold uppercase tracking-[0.1em]"
                    style={{ fontFamily: SYNE, color: i === 3 ? "#FFFFFF" : "rgba(255,255,255,0.90)", background: i === 3 ? "rgba(255,255,255,0.10)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
                    {h || "Feature"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((r, ri) => (
                <tr key={r.feature}>
                  <td className="px-4 py-3.5 text-[14px] font-medium" style={{ fontFamily: DM, color: "#FFFFFF", borderBottom: ri < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.14)" : "none" }}>{r.feature}</td>
                  <td className="px-4 py-3.5 text-[14px]" style={{ fontFamily: DM, color: "rgba(255,255,255,0.90)", borderBottom: ri < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.14)" : "none" }}>{r.traditional}</td>
                  <td className="px-4 py-3.5 text-[14px]" style={{ fontFamily: DM, color: "rgba(255,255,255,0.90)", borderBottom: ri < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.14)" : "none" }}>{r.competitors}</td>
                  <td className="px-4 py-3.5 text-[14px] font-medium" style={{ fontFamily: DM, color: "#FFFFFF", background: "rgba(255,255,255,0.10)", borderBottom: ri < COMPARE_ROWS.length - 1 ? "1px solid rgba(255,255,255,0.14)" : "none" }}>{r.hockystick}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 9 — PRICING PREVIEW
═══════════════════════════════════════════════════════════════════════════ */
function PricingPreview() {
  const cards = [
    {
      role: "Founder", price: "Free during beta", after: "$49/month after launch",
      points: ["Verified profile & IP vault", "Unlimited deal rooms", "AI due diligence & interviews", "Term negotiation to close"],
      cta: "Create founder account", search: { role: "founder" },
    },
    {
      role: "Investor", price: "Free during beta", after: "Free at launch",
      points: ["Verified investor profile", "Thesis-matched deal flow", "AI deal intake & briefs", "Full deal-room access"],
      cta: "Create investor account", search: { role: "investor" },
    },
  ];
  return (
    <section className="w-full" style={{ background: "#FAFAFA", borderBottom: `1px solid ${BORDER}` }}>
      <div className="mx-auto max-w-[1000px] px-6 py-24">
        <h2 className="mb-3 text-center" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3vw, 34px)", color: INK, letterSpacing: "-0.01em" }}>
          Simple, honest pricing
        </h2>
        <p className="mb-12 text-center text-[16px]" style={{ color: SECONDARY, fontFamily: DM }}>
          Free during beta. A 1.5% success fee on closed deals — minimum $500, maximum $15,000. No fee if the deal doesn&rsquo;t close.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.role} className="flex flex-col p-8 rounded-[2px]" style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND, fontFamily: DM }}>{c.role}</p>
              <p className="mt-3" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "26px", color: INK }}>{c.price}</p>
              <p className="mt-1 text-[13px]" style={{ color: "#71717A", fontFamily: DM }}>{c.after}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {c.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                    <span className="text-[14px]" style={{ color: SECONDARY, fontFamily: DM }}>{p}</span>
                  </li>
                ))}
              </ul>
              <Link to="/sign-up" search={c.search as any} className="mt-8 inline-flex h-9 items-center justify-center gap-2 rounded-[2px] text-[14px] font-semibold" style={{ background: BRAND, color: "#FFFFFF", fontFamily: SYNE }}>
                {c.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/pricing" className="inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: BRAND, fontFamily: DM }}>
            See full pricing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 10 — FAQ (accordions allowed here per Constitution §9.3)
═══════════════════════════════════════════════════════════════════════════ */
type Faq = { q: string; a: React.ReactNode };

const FAQ_GROUPS: { heading: string; items: Faq[] }[] = [
  {
    heading: "For founders",
    items: [
      { q: "What is Hockystick?", a: <>A verified fundraising platform where founders and investors meet, negotiate, and close deals — entirely in-platform, from first contact to signed agreement. <FaqLink to="/about">Learn more</FaqLink></> },
      { q: "How does founder verification work?", a: <>Five tiers — Identity, Claims, Operational, Capital, and Hockystick Verified — each built by uploading real documents that AI cross-checks. Your verification tier is visible to investors before they request access. <FaqLink to="/trust">See verification details</FaqLink></> },
      { q: "What documents do I need to get started?", a: <>Incorporation documents, bank or revenue statements, customer contracts, and team employment records. Each builds your verification tier — you choose how much to verify. <FaqLink to="/pricing">View pricing & plans</FaqLink></> },
      { q: "How do deal rooms work?", a: <>Private, NDA-gated spaces where you share documents, run due diligence, hold structured interviews, and negotiate terms with a specific investor. All content stays inside the room.</> },
      { q: "What happens during due diligence?", a: <>A structured DD checklist with AI-powered document analysis. Findings are source-cited and confidence-scored — never presented as verified fact without backing. <FaqLink to="/docs">Read the docs</FaqLink></> },
      { q: "How do structured interviews work?", a: <>Five video meeting stages — Introduction, Product Demo, Financial Discussion, Terms Discussion, and Investment Terms — each with AI note extraction. Notes are source-cited to the transcript.</> },
      { q: "How are terms negotiated?", a: <>Per-term propose, accept, reject, or counter — with a full audit trail. Four instrument types: SAFE, Equity, Debt, and Company Sale. Both parties see updates in real time.</> },
      { q: "What does the closing process look like?", a: <>Terms lock, the platform generates a summary, a lawyer (optional) drafts the agreement, both parties sign, payment is confirmed, the deal closes, and the room becomes a permanent archive with auto-generated invoices.</> },
      { q: "How much does Hockystick cost?", a: <>Free during beta. After launch: $49/month for founders, with a 1.5% success fee on closed deals (minimum $500, maximum $15,000). No fee if the deal doesn&rsquo;t close. <FaqLink to="/pricing">See pricing</FaqLink></> },
      { q: "Is my data secure?", a: <>NDA-gated deal rooms, role-based access control, DIFC governing law, and DIAC arbitration. Documents are access-logged and never shared outside the room. <FaqLink to="/privacy">Privacy policy</FaqLink></> },
      { q: "Can I use Hockystick from anywhere?", a: <>Yes. Hockystick is a global platform. Founders and investors from any jurisdiction can use it.</> },
    ],
  },
  {
    heading: "For investors",
    items: [
      { q: "How do I find startups on Hockystick?", a: <>Thesis-matched deal flow, a searchable founder directory, and AI-powered Deal Intake analysis. Set your investment thesis and the platform surfaces matching founders automatically.</> },
      { q: "What investor verification is required?", a: <>The same tier system as founders — fund details, thesis, and track record build your verification tier. Founders see your tier before granting deal-room access.</> },
      { q: "What can I see before requesting access to a founder?", a: <>Their public profile and verification tier. Full details — documents, financials, team — unlock inside the deal room after mutual disclosure.</> },
      { q: "How does thesis matching work?", a: <>You set your stage, sector, geography, and cheque-size preferences. The platform matches founders to your thesis and sends alerts when new matches appear.</> },
      { q: "What AI analysis do I get?", a: <>Deal briefs, DD findings, and meeting note extraction — all source-cited with confidence scores. The AI never asserts claims as verified fact.</> },
    ],
  },
  {
    heading: "General",
    items: [
      { q: "Who built Hockystick?", a: <>Venture Tech LLC, headquartered at DIFC FinTech Hive, Dubai. <FaqLink to="/about">About us</FaqLink></> },
      { q: "What jurisdictions does Hockystick cover?", a: <>Hockystick is a global platform. DIFC governing law applies to platform terms; deals operate under whatever jurisdiction the parties agree to.</> },
      { q: "How is the platform fee calculated?", a: <>1.5% of the closed deal amount, with a minimum of $500 and a maximum of $15,000. The fee is charged at closing, never before. If a deal doesn&rsquo;t close, no fee is charged.</> },
      { q: "What happens after a deal closes?", a: <>The deal room becomes a read-only archive. Both parties retain permanent access to all documents, terms, agreements, signed copies, payment proof, and invoices.</> },
      { q: "Can I involve my lawyer?", a: <>Yes. Either party can invite legal counsel at the closing stage. Lawyers see the term summary and agreement only — they have zero access to earlier due diligence, negotiation history, or fee details.</> },
      { q: "What if a deal doesn't close?", a: <>No fee is charged. Either party can exit at any point. All room content is preserved — nothing is deleted.</> },
    ],
  },
];

function FaqLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to as any} className="font-medium" style={{ color: BRAND }}>
      {children} →
    </Link>
  );
}

function FaqItem({ item }: { item: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium" style={{ color: INK, fontFamily: DM }}>{item.q}</span>
        {open
          ? <Minus className="h-4 w-4 shrink-0" style={{ color: "#71717A" }} />
          : <Plus className="h-4 w-4 shrink-0" style={{ color: "#71717A" }} />}
      </button>
      {open && (
        <p className="pb-4 pr-8 text-[14px]" style={{ color: SECONDARY, fontFamily: DM, lineHeight: 1.6 }}>
          {item.a}
        </p>
      )}
    </div>
  );
}

function FaqSection() {
  return (
    <section className="w-full" style={{ background: "#FFFFFF", borderBottom: `1px solid ${BORDER}` }}>
      <div className="mx-auto max-w-[820px] px-6 py-24">
        <h2 className="mb-12 text-center" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(24px, 3vw, 34px)", color: INK, letterSpacing: "-0.01em" }}>
          Frequently asked questions
        </h2>
        <div className="space-y-10">
          {FAQ_GROUPS.map((g) => (
            <div key={g.heading}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: BRAND, fontFamily: DM }}>{g.heading}</p>
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                {g.items.map((item) => <FaqItem key={item.q} item={item} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 11 — FINAL CTA
═══════════════════════════════════════════════════════════════════════════ */
function FinalCta() {
  return (
    <section className="w-full" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-[900px] px-6 py-28 text-center">
        <h2 style={{ fontFamily: SYNE, fontWeight: 700, fontSize: "clamp(28px, 4vw, 44px)", color: INK, letterSpacing: "-0.02em" }}>
          Start closing deals today.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[17px]" style={{ color: SECONDARY, fontFamily: DM }}>
          Free during beta. No credit card required.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/sign-up" search={{ role: "founder" } as any} className="inline-flex h-11 items-center justify-center gap-2 rounded-[2px] px-6 text-[15px] font-semibold" style={{ background: BRAND, color: "#FFFFFF", fontFamily: SYNE }}>
            Create founder account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/sign-up" search={{ role: "investor" } as any} className="inline-flex h-11 items-center justify-center gap-2 rounded-[2px] px-6 text-[15px] font-semibold" style={{ background: "#FFFFFF", color: INK, border: `1px solid ${BORDER}`, fontFamily: SYNE }}>
            I&rsquo;m an investor
          </Link>
        </div>
      </div>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OnboardingChat } from "@/components/OnboardingChat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Users, FileText, ShieldCheck,
  ListChecks, Brain, Bell, CheckCircle2,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hockeystick — AI-Powered Deal Rooms for Founders & Investors" },
      { name: "description", content: "Hockeystick is the private deal flow platform trusted by founders and VCs. Secure deal rooms, AI due diligence, investor pipeline management, and real-time collaboration." },
      { name: "keywords", content: "deal room software, VC deal flow, startup fundraising platform, investor due diligence, AI investment analysis, deal flow management, startup investor platform" },
      { property: "og:title", content: "Hockeystick — AI-Powered Deal Rooms" },
      { property: "og:description", content: "The private platform for founders raising capital and VCs managing deal flow. Secure, AI-powered, built for closing deals." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hockeystick.app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hockeystick — Where deals get done" },
      { name: "twitter:description", content: "AI-powered deal rooms for founders and investors." },
    ],
    links: [
      { rel: "canonical", href: "https://hockeystick.app" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  component: Landing,
});

// ── Page animations (CSS-only, scoped to this page) ───────────────
const STYLES = `
  .hs { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
  @keyframes hs-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes hs-in { from { opacity: 0; } to { opacity: 1; } }
  .hs-a  { animation: hs-up 0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .hs-a1 { animation-delay: 0.08s; }
  .hs-a2 { animation-delay: 0.18s; }
  .hs-a3 { animation-delay: 0.30s; }
  .hs-a4 { animation-delay: 0.44s; }
  .hs-a5 { animation-delay: 0.58s; }
  .hs-badge { animation: hs-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.7s both; }
  .hs-feat:hover .hs-feat-icon { transform: scale(1.08) rotate(-3deg); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
  .hs-feat-icon { transition: transform 0.2s ease; }
  .hs-step-line { background: linear-gradient(90deg, var(--color-brand), var(--color-violet)); }
`;

function Landing() {
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <Hero />
        <ChatSection />
        <Logos />
        <Problem />
        <HowItWorks />
        <Features />
        <Stats />
        <DualCTA />
        <Resources />
        <SiteFooter />
      </div>
    </>
  );
}

// ── 1. HERO ───────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="absolute inset-0 -z-10 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent_80%)]" />
      <div className="absolute inset-0 -z-10 noise opacity-40" />

      <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 md:pt-28 md:pb-24 text-center">
        <div className="hs-a hs-a1 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/8 px-3 py-1 text-[11px] font-medium text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-glow" />
          Early access — free during beta
          <ArrowRight className="h-3 w-3" />
        </div>

        <h1 className="hs hs-a hs-a2 mt-5 text-[clamp(2.6rem,6vw,4.5rem)] font-bold leading-[1.03] tracking-[-0.04em]">
          Stop chasing.<br />
          <span className="text-gradient-brand">Start closing.</span>
        </h1>

        <p className="hs-a hs-a3 mt-5 text-base md:text-lg text-muted-foreground max-w-[520px] mx-auto leading-relaxed">
          HockeyStick turns fundraising chaos into a structured deal-closing machine — AI-matched deal rooms, live due diligence, and decisions without the spreadsheet graveyard.
        </p>

        <div className="hs-a hs-a4 mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <Button variant="brand" size="lg" className="gap-2 shadow-glow w-full sm:w-auto">
              Start raising <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/sign-up" search={{ role: "investor" } as any}>
            <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
              Explore deals
            </Button>
          </Link>
        </div>

        <div className="hs-a hs-a5 mt-6 flex flex-wrap gap-x-5 gap-y-2 justify-center">
          {["No credit card", "Free during beta", "Bank-grade encryption"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 1b. CHAT SECTION ──────────────────────────────────────────────
function ChatSection() {
  const [starterId, setStarterId] = useState(0);
  const [starterText, setStarterText] = useState<string | null>(null);

  const starters = [
    "I'm a founder raising my seed round →",
    "I'm a VC reviewing 50+ deals →",
    "I just want to see how it works →",
  ];

  function handleStarter(text: string) {
    setStarterText(text);
    setStarterId((n) => n + 1);
  }

  return (
    <section className="bg-gradient-to-br from-gray-950 to-purple-950 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16 items-center">

          {/* Left — 60% */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-purple-400 mb-5">
              AI-Powered Onboarding
            </div>
            <h2 className="hs text-4xl md:text-5xl font-black text-white leading-tight tracking-[-0.03em]">
              Not sure if Hockeystick<br />is right for you?
            </h2>
            <p className="mt-5 text-lg md:text-xl text-gray-300 max-w-lg leading-relaxed">
              Don't read the docs. Just ask. Our AI knows the product inside out — tell it who you are and what you're trying to solve. It'll tell you honestly if we're a fit.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {starters.map((text) => (
                <button
                  key={text}
                  onClick={() => handleStarter(text)}
                  className="text-left rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-400/50 px-5 py-4 text-sm font-medium text-gray-200 hover:text-white transition-all group"
                >
                  <span className="group-hover:text-purple-300 transition-colors">{text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right — 40% */}
          <div className="shadow-2xl rounded-2xl ring-1 ring-white/10">
            <OnboardingChat key={starterId} variant="embedded" triggerMessage={starterText} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2. LOGO CLOUD ─────────────────────────────────────────────────
function Logos() {
  return (
    <section className="border-y border-border/60 bg-gradient-soft py-7">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center text-sm text-muted-foreground">
          Trusted by founders and investors at every stage of the journey.
        </div>
      </div>
    </section>
  );
}

// ── 3. PROBLEM ────────────────────────────────────────────────────
function Problem() {
  const problems = [
    {
      n: "01",
      who: "For founders",
      headline: "You send 200 emails.\n3 reply. None invest.",
      body: "No structure, no tracking, no idea who's actually interested. Your fundraise lives in three spreadsheets, seven email threads, and one Notion doc nobody updates.",
      side: "left",
    },
    {
      n: "02",
      who: "For investors",
      headline: "You review 50 decks.\nNone match your thesis.",
      body: "Unstructured deal flow floods your inbox. There's no way to compare, no signal, no score. Partners can't see deal status at a glance so decisions take weeks instead of days.",
      side: "right",
    },
    {
      n: "03",
      who: "The process",
      headline: "Due diligence lives\nin 12 different tools.",
      body: "Google Drive, Notion, Excel, Docusign, Dropbox, email — split across both sides of the deal. Every handoff is manual. Every update gets lost.",
      side: "left",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="mb-16 max-w-xl">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">The problem</div>
        <h2 className="hs text-3xl md:text-5xl font-bold tracking-[-0.04em] leading-[1.08]">
          Built for both sides<br />of the table.
        </h2>
      </div>

      <div className="space-y-10 md:space-y-16">
        {problems.map(({ n, who, headline, body, side }) => (
          <div
            key={n}
            className={cn(
              "grid md:grid-cols-[1fr_1fr] gap-8 md:gap-16 items-center",
              side === "right" && "md:[&>*:first-child]:order-2",
            )}
          >
            {/* Number + copy */}
            <div className="relative">
              <div className="absolute -left-2 -top-6 hs text-[clamp(4rem,14vw,10rem)] font-bold leading-none text-foreground/[0.04] select-none pointer-events-none">{n}</div>
              <div className="relative">
                <span className="inline-block text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-4 border border-border/60 rounded-full px-3 py-1">{who}</span>
                <h3 className="hs text-2xl md:text-3xl font-bold tracking-[-0.03em] leading-[1.12] whitespace-pre-line mb-4">{headline}</h3>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-md">{body}</p>
              </div>
            </div>

            {/* Visual card */}
            <div className="rounded-2xl border border-border/60 bg-card shadow-card p-6 md:p-8">
              {n === "01" && <FounderPainViz />}
              {n === "02" && <InvestorPainViz />}
              {n === "03" && <ProcessPainViz />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FounderPainViz() {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Outreach tracker</div>
      {[
        { name: "Partner @ Sequoia", status: "No reply", days: "14d ago", bad: true },
        { name: "MD @ a16z",         status: "No reply", days: "9d ago",  bad: true },
        { name: "GP @ Accel",        status: "Opened",   days: "5d ago",  bad: false },
        { name: "Analyst @ Index",   status: "No reply", days: "3d ago",  bad: true },
        { name: "Partner @ YC",      status: "No reply", days: "1d ago",  bad: true },
      ].map(({ name, status, days, bad }) => (
        <div key={name} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <div className="h-6 w-6 rounded-full bg-muted text-[10px] font-bold grid place-items-center text-muted-foreground shrink-0">
            {name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{name}</div>
          </div>
          <span className="text-[10px] text-muted-foreground">{days}</span>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
            bad ? "bg-muted text-muted-foreground" : "bg-warning/10 text-warning",
          )}>{status}</span>
        </div>
      ))}
      <div className="text-center text-[10px] text-muted-foreground/60 pt-2">+ 195 more contacts</div>
    </div>
  );
}

function InvestorPainViz() {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">This week's inbox</div>
      {[
        { name: "HealthAI – Series A",  tag: "Healthcare",  match: "??" },
        { name: "FinStack – Seed",      tag: "Fintech",     match: "??" },
        { name: "EduBase – Pre-seed",   tag: "EdTech",      match: "??" },
        { name: "LogiFlow – Series B",  tag: "Logistics",   match: "??" },
        { name: "CloudDB – Seed",       tag: "Infra",       match: "??" },
      ].map(({ name, tag, match }) => (
        <div key={name} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2">
          <div className="h-6 w-6 rounded-full bg-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{name}</div>
          </div>
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tag}</span>
          <span className="text-[10px] text-muted-foreground/50 font-mono">{match}</span>
        </div>
      ))}
      <div className="text-center text-[10px] text-muted-foreground/60 pt-2">Thesis match: unknown</div>
    </div>
  );
}

function ProcessPainViz() {
  const tools = ["Google Drive", "Notion", "Excel", "DocuSign", "Dropbox", "Gmail", "Slack", "Zoom", "Linear", "Airtable", "Loom", "Calendly"];
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tools in your current process</div>
      <div className="flex flex-wrap gap-2">
        {tools.map((t) => (
          <span key={t} className="text-[10px] border border-border/60 rounded-md px-2 py-1 text-muted-foreground">{t}</span>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive/80">
        12 tools × 2 sides = 24 places something can break
      </div>
    </div>
  );
}

// ── 4. HOW IT WORKS ───────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", t: "Build your profile",   d: "2-minute setup. Stage, sector, thesis, funding targets. AI personalizes your experience from day one.", icon: Users },
    { n: "02", t: "Get AI-matched",        d: "Our engine scores thesis fit in real time. Founders find relevant investors. Investors see deals that match their mandate.", icon: Brain },
    { n: "03", t: "Open a deal room",      d: "NDA-gated, watermarked, audited. Share docs, run Q&A, track exactly what each investor has seen.", icon: ShieldCheck },
    { n: "04", t: "Close the round",       d: "DD Workstation with 6 categories, document review, investor feedback, and a one-click decision workflow.", icon: Zap },
  ];

  return (
    <section className="relative border-y border-border/60">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="absolute inset-0 -z-10 noise opacity-30" />
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-xl">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">How it works</div>
          <h2 className="hs text-3xl md:text-5xl font-bold tracking-[-0.04em] leading-[1.08]">
            From zero to closed<br />in four moves.
          </h2>
        </div>

        {/* Desktop timeline */}
        <div className="hidden md:block relative">
          <div className="absolute top-[2.25rem] left-[calc(12.5%+1.5rem)] right-[calc(12.5%+1.5rem)] h-px hs-step-line opacity-30" />
          <div className="grid grid-cols-4 gap-5">
            {steps.map(({ n, t, d, icon: Icon }, i) => (
              <div key={n} className="relative group">
                <div className="relative z-10 flex flex-col">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow group-hover:scale-105 transition-transform duration-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="font-mono text-[10px] text-brand font-semibold mb-1.5">{n}</div>
                  <div className="hs text-base font-bold tracking-tight mb-2">{t}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile vertical */}
        <div className="md:hidden space-y-8">
          {steps.map(({ n, t, d, icon: Icon }, i) => (
            <div key={n} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                {i < steps.length - 1 && <div className="flex-1 w-px bg-border/60 my-2" />}
              </div>
              <div className="pb-2 pt-1">
                <div className="font-mono text-[10px] text-brand font-semibold mb-1">{n}</div>
                <div className="hs text-base font-bold tracking-tight mb-1.5">{t}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 5. FEATURES ───────────────────────────────────────────────────
function Features() {
  const feats = [
    {
      icon: Brain,
      title: "AI Deal Analysis",
      desc: "Thesis-fit score from 0–100, narrative strengths and risks breakdown, one-click investment memo generation.",
      accent: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      icon: ListChecks,
      title: "DD Workstation",
      desc: "6-category tracker (Financials, Team, Legal, Market, Product, References) with 22 pre-loaded items, status controls, and per-document review.",
      accent: "text-brand",
      bg: "bg-brand/10",
    },
    {
      icon: ShieldCheck,
      title: "Secure Deal Room",
      desc: "NDA-gated access, document watermarking, full audit trail. Know who viewed what and when — no exceptions.",
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Users,
      title: "Investor CRM",
      desc: "Pipeline kanban from first email to term sheet. Notes, follow-ups, status tracking, and meeting logs in one place.",
      accent: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: FileText,
      title: "Document Vault",
      desc: "AI summaries on every uploaded document, per-document accept/reject/revision workflow, category filtering.",
      accent: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      icon: Bell,
      title: "Real-time Updates",
      desc: "Investors get notified when founders upload docs. Founders get notified of investor decisions. Nothing falls through the cracks.",
      accent: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="flex items-end justify-between gap-8 mb-14 flex-wrap">
        <div className="max-w-lg">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">Features</div>
          <h2 className="hs text-3xl md:text-5xl font-bold tracking-[-0.04em] leading-[1.08]">
            Everything you need<br />to close your round.
          </h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-sm">
          Purpose-built for the $300B early-stage market. Not a spreadsheet. Not another inbox. A war room.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
        {feats.map(({ icon: Icon, title, desc, accent, bg }) => (
          <div key={title} className="hs-feat relative bg-card p-7 hover:bg-accent/30 transition-colors group">
            <div className={cn("hs-feat-icon grid h-10 w-10 place-items-center rounded-xl mb-5", bg)}>
              <Icon className={cn("h-5 w-5", accent)} />
            </div>
            <div className="hs text-[15px] font-bold tracking-tight mb-2">{title}</div>
            <div className="text-[13px] text-muted-foreground leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 6. STATS ──────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { n: "$300B", label: "early-stage market we're built for", sub: "Global seed + Series A, annually" },
    { n: "22",    label: "default DD checklist items, zero setup", sub: "Across 6 categories out of the box" },
    { n: "< 2m",  label: "to open a fully structured deal room", sub: "NDA, docs, Q&A, workstation — ready" },
  ];

  return (
    <section className="relative border-y border-border/60 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-mesh opacity-60" />
      <div className="absolute inset-0 -z-10 noise opacity-50" />
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-3 gap-8 md:gap-5 md:divide-x divide-border/60">
          {stats.map(({ n, label, sub }) => (
            <div key={n} className="md:px-8 first:pl-0 last:pr-0">
              <div className="hs text-[clamp(2.5rem,6vw,4rem)] font-bold tracking-[-0.04em] text-gradient-brand leading-none mb-3">{n}</div>
              <div className="text-sm font-semibold leading-snug mb-1">{label}</div>
              <div className="text-xs text-muted-foreground">{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 7. DUAL CTA ───────────────────────────────────────────────────
function DualCTA() {
  return (
    <section id="get-started" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Founders */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-10 md:p-12 group">
          <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          <div className="absolute inset-0 -z-10 noise opacity-40" />
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-4">For founders</div>
          <h3 className="hs text-2xl md:text-3xl font-bold tracking-[-0.04em] leading-[1.1] mb-4">
            Your raise deserves<br />a war room.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
            Stop managing your round in spreadsheets. Get a structured deal room that keeps investors engaged, documents organized, and your round moving.
          </p>
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <Button variant="brand" size="lg" className="gap-2 shadow-glow">
              Start for free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div className="mt-5 flex flex-wrap gap-3">
            {["NDA-gated", "AI summaries", "DD workstation"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand" /> {f}
              </span>
            ))}
          </div>
        </div>

        {/* Investors */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-10 md:p-12 group">
          <div className="absolute inset-0 -z-10 bg-gradient-mesh opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="absolute inset-0 -z-10 noise opacity-40" />
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-4">For investors</div>
          <h3 className="hs text-2xl md:text-3xl font-bold tracking-[-0.04em] leading-[1.1] mb-4">
            Find your next deal,<br />not your next inbox.
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
            AI thesis-match scoring, a live DD workstation, and structured document review — so you can move from deck to decision without the noise.
          </p>
          <Link to="/sign-up" search={{ role: "investor" } as any}>
            <Button variant="outline" size="lg" className="gap-2">
              Explore deal flow <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <div className="mt-5 flex flex-wrap gap-3">
            {["Thesis matching", "DD overview", "One-click memo"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom beta banner */}
      <div className="mt-8 rounded-2xl border border-brand/20 bg-brand/5 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse-glow" />
          <span className="text-sm font-medium">Currently in beta — free for early users</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">No credit card required. Cancel any time.</span>
        </div>
        <Link to="/sign-up" search={{ role: "founder" } as any}>
          <Button variant="brand" size="sm" className="gap-1.5 shrink-0 shadow-glow">
            Join the beta <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

// ── 8. RESOURCES ──────────────────────────────────────────────────
const ACCELERATORS = [
  { name: "Y Combinator", desc: "The world's most prestigious accelerator. $500K for 7%.", href: "https://ycombinator.com/apply", cta: "Apply →" },
  { name: "Techstars", desc: "3-month program, $120K investment, global network.", href: "https://techstars.com/apply", cta: "Apply →" },
  { name: "500 Global", desc: "Early-stage VC with accelerator programs worldwide.", href: "https://500.co", cta: "Apply →" },
  { name: "Antler", desc: "Build your company from day zero with co-founders.", href: "https://antler.co", cta: "Apply →" },
  { name: "Entrepreneur First", desc: "Pre-team, pre-idea — they back individuals.", href: "https://joinef.com", cta: "Apply →" },
  { name: "Seedcamp", desc: "Europe's leading pre-seed and seed fund.", href: "https://seedcamp.com", cta: "Apply →" },
];

const GRANTS = [
  { name: "SBIR / STTR", desc: "US government grants up to $2M for tech startups.", href: "https://sbir.gov", cta: "Learn more →" },
  { name: "Google for Startups", desc: "Cloud credits, mentorship, and global community.", href: "https://startup.google.com", cta: "Learn more →" },
  { name: "AWS Activate", desc: "Up to $100K in AWS credits for startups.", href: "https://aws.amazon.com/activate", cta: "Learn more →" },
  { name: "Microsoft for Startups", desc: "Azure credits, GitHub, and go-to-market support.", href: "https://microsoft.com/startups", cta: "Learn more →" },
  { name: "Innovate UK", desc: "UK government funding for innovative businesses.", href: "https://innovateuk.ukri.org", cta: "Learn more →" },
  { name: "EU Horizon", desc: "European research and innovation funding.", href: "https://ec.europa.eu/info/funding-tenders", cta: "Learn more →" },
];

function ResourceCard({ name, desc, href, cta }: { name: string; desc: string; href: string; cta: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border/60 bg-card p-4 hover:shadow-card hover:border-brand/30 transition-all group"
    >
      <div className="font-semibold text-sm group-hover:text-brand transition-colors">{name}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</div>
      <div className="text-brand text-xs mt-2 group-hover:underline">{cta}</div>
    </a>
  );
}

function Resources() {
  return (
    <section className="border-t border-border/60 bg-gradient-soft">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="mb-12">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">Startup Resources</div>
          <h2 className="hs text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.08] mb-3">
            Everything you need to fund your startup.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Applications, grants, and programs trusted by thousands of founders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/70 mb-4">Top Accelerators</h3>
            <div className="grid gap-3">
              {ACCELERATORS.map((r) => <ResourceCard key={r.name} {...r} />)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/70 mb-4">Grants &amp; Programs</h3>
            <div className="grid gap-3">
              {GRANTS.map((r) => <ResourceCard key={r.name} {...r} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

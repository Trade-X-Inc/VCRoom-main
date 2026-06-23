// Landing page v2 — rebuilt 2026-05-27
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OnboardingChat } from "@/components/OnboardingChat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Users, ShieldCheck, ListChecks, CheckCircle2, Zap, Shield, Sparkles, BarChart2, Globe, Link2, FileText, BadgeCheck, Mail, DollarSign, Wrench } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hockystick — Verified Fundraising for MENA Founders" },
      { name: "description", content: "Replace your pitch deck with a verified founder profile. Connect with investors through structured, staged access. Built for GCC and MENA founders." },
      { name: "keywords", content: "deal room software, VC deal flow, startup fundraising platform, investor due diligence, AI investment analysis, deal flow management, startup investor platform" },
      { property: "og:title", content: "Hockystick — Verified Fundraising for MENA Founders" },
      { property: "og:description", content: "The private platform for founders raising capital and VCs managing deal flow. Secure, AI-powered, built for closing deals." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hockystick.app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hockystick — Where deals get done" },
      { name: "twitter:description", content: "AI-powered deal rooms for founders and investors." },
    ],
    links: [
      { rel: "canonical", href: "https://hockystick.app" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
  }),
  component: Landing,
});

const STYLES = `
  .hs { font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif; }
  @keyframes hs-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
  .hs-a  { animation: hs-up 0.65s cubic-bezier(0.16,1,0.3,1) both; }
  .hs-a1 { animation-delay: 0.08s; }
  .hs-a2 { animation-delay: 0.18s; }
  .hs-a3 { animation-delay: 0.30s; }
  .hs-a4 { animation-delay: 0.44s; }
  .hs-a5 { animation-delay: 0.58s; }
  .hs-step-line { background: linear-gradient(90deg, var(--color-brand), var(--color-violet)); }
`;

function Landing() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <Hero />
        <ChatSection />
        <Pain />
        <SolutionStatement />
        <HowItWorks />
        <ProofNumbers />
        <WhatsInside />
        <ForFoundersInvestors />
        <RegistryTeaser />
        <FinalCTA />
        <SiteFooter />
        <OnboardingChat variant="floating" />
      </div>
    </>
  );
}

// ── 1. HERO ───────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden flex items-center min-h-[calc(100vh-64px)]">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="absolute inset-0 -z-10 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent_80%)]" />
      <div className="absolute inset-0 -z-10 noise opacity-40" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-24 text-center w-full">
        <div className="hs-a hs-a1 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/8 px-3 py-1 text-[11px] font-medium text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-glow" />
          Early access — free during beta
          <ArrowRight className="h-3 w-3" />
        </div>

        <h1 className="hs hs-a hs-a2 mt-6 text-[clamp(2.5rem,7vw,5rem)] font-black leading-[1.0] tracking-[-0.04em]">
          <span className="text-gradient-brand">Verified founders. Serious investors. Deals that close.</span>
        </h1>

        <p className="hs-a hs-a3 mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Hockystick replaces the pitch deck with a verified founder profile — and gives investors a structured path from discovery to deal room. Built for GCC and MENA, open globally.
        </p>

        <div className="hs-a hs-a4 mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <Button variant="brand" size="lg" className="gap-2 shadow-glow w-full sm:w-auto">
              I'm raising capital <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/sign-up" search={{ role: "investor" } as any}>
            <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
              I invest in startups <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <p className="hs-a hs-a5 mt-4 text-sm text-muted-foreground">
          Used by founders across GCC, USA and Europe · Verified deal rooms · Free during beta
        </p>
        <div className="hs-a hs-a5 mt-5 flex items-center justify-center gap-3">
          <a href="https://x.com/hockystickapp" target="_blank" rel="noopener noreferrer" title="@hockystickapp on X"
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-muted-foreground hover:bg-[#7C3AED] hover:text-white transition-all">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.735-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://linkedin.com/company/hockystick" target="_blank" rel="noopener noreferrer" title="Hockystick on LinkedIn"
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-muted-foreground hover:bg-[#7C3AED] hover:text-white transition-all">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

// ── 2. PAIN ───────────────────────────────────────────────────────
function Pain() {
  const cards: { Icon: React.ElementType; stat: string; who: string; body: string }[] = [
    {
      Icon: Mail,
      stat: "200 emails sent",
      who: "The Founder",
      body: "You spend 3 months crafting the perfect pitch. You send it to 200 investors. 12 open it. 3 reply. 1 ghosts you after 4 meetings. You never know why.",
    },
    {
      Icon: DollarSign,
      stat: "50 decks this week",
      who: "The Investor",
      body: "Deals flood your inbox with no structure, no context, no thesis match. Your analyst spends 20 hours on a company you'd pass in 5 minutes if you had the right data.",
    },
    {
      Icon: Wrench,
      stat: "12 tools, 0 clarity",
      who: "The Process",
      body: "Google Drive, Notion, DocuSign, email, Slack — the deal lives across 12 tools and 2 inboxes. Every update is manual. Every handoff breaks.",
    },
  ];

  return (
    <section className="bg-gray-950 text-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-purple-400 mb-5">
          The Reality
        </div>
        <h2 className="hs text-3xl md:text-4xl font-bold text-white mb-14 max-w-xl leading-[1.1]">
          Fundraising is broken on both sides.
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map(({ Icon, stat, who, body }) => (
            <div key={who} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 h-10 w-10 rounded-lg bg-white/8 flex items-center justify-center text-purple-400">
                <Icon size={20} />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-2">
                {who}
              </div>
              <div className="text-xl font-bold text-white mb-3">{stat}</div>
              <p className="text-sm text-gray-400 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-2xl font-semibold text-white mb-6">
            There's no shared space. No trust layer. No single source of truth.
          </p>
          <a href="#how-it-works">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-3 text-sm font-medium text-white transition-colors cursor-pointer">
              See how Hockystick fixes this <ArrowRight className="h-4 w-4" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

// ── 3. SOLUTION STATEMENT ─────────────────────────────────────────
function SolutionStatement() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="hs text-[clamp(2.5rem,6vw,4rem)] font-black leading-tight tracking-[-0.04em]">
          One room.<br />
          Both sides.<br />
          Every deal.
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Hockystick gives founders and investors a private, encrypted space to share documents, run due
          diligence, ask questions, and make decisions — without the friction, the chaos, or the email
          thread from hell.
        </p>
      </div>
    </section>
  );
}

// ── 4. HOW IT WORKS ───────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Build your profile",
      d: "Complete your verified founder profile. Upload your pitch deck — AI extracts key data automatically. Build your Document Intelligence Centre with 16 templates.",
      icon: Users,
    },
    {
      n: "02",
      t: "Open a deal room",
      d: "Invite your investor (or founder). They sign an NDA. Documents are shared, watermarked, and audited automatically.",
      icon: ShieldCheck,
    },
    {
      n: "03",
      t: "Run due diligence",
      d: "AI-reviewed documents, investor simulation, thesis matching, and structured Q&A — all before your first investor meeting.",
      icon: ListChecks,
    },
    {
      n: "04",
      t: "Make the decision",
      d: "Investor records Invest, Hold, or Pass with mandatory reasoning. Term sheet builder included. Founder notified at every step.",
      icon: Zap,
    },
  ];

  return (
    <section id="how-it-works" className="relative border-y border-border/60">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="mb-14 max-w-xl">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">
            How it works
          </div>
          <h2 className="hs text-3xl md:text-5xl font-bold tracking-[-0.04em] leading-[1.08]">
            From first contact to closed deal — structured.
          </h2>
        </div>

        {/* Desktop timeline */}
        <div className="hidden md:block relative">
          <div className="absolute top-[2.25rem] left-[calc(12.5%+1.5rem)] right-[calc(12.5%+1.5rem)] h-px hs-step-line opacity-30" />
          <div className="grid grid-cols-4 gap-5">
            {steps.map(({ n, t, d, icon: Icon }) => (
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

// ── 5. PROOF NUMBERS ─────────────────────────────────────────────
function ProofNumbers() {
  const stats = [
    { n: "< 5 min",      label: "to build a complete investor profile" },
    { n: "16 templates", label: "in the Document Intelligence Centre" },
    { n: "100%",         label: "encrypted & watermarked documents" },
    { n: "3 stages",     label: "of verified access from public to deal room" },
  ];

  return (
    <section className="bg-gradient-to-r from-purple-600 to-indigo-600 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:divide-x divide-white/20">
          {stats.map(({ n, label }) => (
            <div key={n} className="md:px-8 first:pl-0 last:pr-0 text-center md:text-left">
              <div className="hs text-[clamp(2rem,5vw,3rem)] font-bold text-white leading-none mb-2">
                {n}
              </div>
              <div className="text-sm text-white/70 leading-snug">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 5b. WHAT'S INSIDE ────────────────────────────────────────────
function WhatsInside() {
  const features: { Icon: React.ElementType; title: string; desc: string; tag: string }[] = [
    { Icon: Shield,     title: "NDA-Gated Deal Rooms",    desc: "Investors sign before seeing a single document. Every file is watermarked and tracked.", tag: "Live" },
    { Icon: Sparkles,   title: "AI Document Review",      desc: "16 structured document templates reviewed by AI. VC-grade scoring, gap analysis, and investor simulation before you go live.", tag: "Live" },
    { Icon: BarChart2,  title: "Thesis Matching",         desc: "Investors receive daily alerts when a verified founder matches their sector, stage, and geography. No cold outreach needed.", tag: "Live" },
    { Icon: Globe,      title: "Founder Directory",       desc: "Discover and connect with verified founders and investors in your sector.", tag: "Beta" },
    { Icon: BadgeCheck, title: "Investor Verification",   desc: "Both founders and investors are verified. Website, LinkedIn, and public signals checked on submission. Hockystick Checked badge on every profile.", tag: "Live" },
    { Icon: Link2,      title: "CRM Integrations",        desc: "HubSpot CRM sync live. Notion, Slack, and Zapier integrations coming soon.", tag: "Live" },
    { Icon: FileText,   title: "Deal Brief",              desc: "When an investor connects with a founder, AI generates a curated deal brief: key metrics, strengths, red flags, and DD questions — pre-done.", tag: "Live" },
  ];

  return (
    <section className="py-20 bg-white dark:bg-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-[11px] uppercase tracking-widest font-semibold text-[#7C3AED]">EVERYTHING INCLUDED</span>
          <h2 className="text-4xl font-black mt-3 tracking-tight text-gray-900 dark:text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            One platform. Every tool you need.
          </h2>
          <p className="text-gray-500 dark:text-muted-foreground mt-3 max-w-xl mx-auto">
            From first investor contact to closed round — Hockystick covers every step.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-100 dark:border-border/60 bg-white dark:bg-card p-5 shadow-sm hover:shadow-md hover:border-[#7C3AED]/30 transition-all">
              <div className="mb-3 h-9 w-9 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED]">
                <f.Icon size={18} />
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-foreground">{f.title}</h3>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", {
                  "bg-green-100 text-green-700": f.tag === "Live",
                  "bg-purple-100 text-purple-700": f.tag === "Beta",
                  "bg-gray-100 text-gray-500": f.tag === "Coming Q3",
                })}>{f.tag}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 6. FOR FOUNDERS / FOR INVESTORS ──────────────────────────────
function ForFoundersInvestors() {
  const founderFeatures = [
    "NDA-gated investor access",
    "Document Intelligence Centre (16 templates)",
    "Real-time investor activity tracking",
    "Q&A thread per investor",
    "Due diligence workstation",
  ];
  const investorFeatures = [
    "Thesis-match AI scoring (0–100)",
    "Daily thesis match alerts",
    "AI-generated deal brief per founder",
    "Hockystick Verified investor badge",
    "Portfolio management",
  ];

  return (
    <section className="grid md:grid-cols-2">
      {/* Left — dark purple */}
      <div className="bg-gradient-to-br from-purple-950 to-purple-900 p-12 md:p-16 flex flex-col">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-purple-400 mb-5">
          For Founders
        </div>
        <h2 className="hs text-3xl md:text-4xl font-bold text-white leading-[1.1] tracking-[-0.03em] mb-5">
          Your raise deserves a war room.
        </h2>
        <p className="text-purple-200/80 text-base leading-relaxed mb-8 max-w-sm">
          Stop managing 200 investor relationships in a spreadsheet. Get a structured deal room that keeps
          investors engaged, documents organized, and your round moving — without the chaos.
        </p>
        <ul className="space-y-3 mb-10">
          {founderFeatures.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-purple-100">
              <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <span className="inline-flex items-center gap-2 rounded-full bg-white text-purple-900 font-semibold px-6 py-3 text-sm hover:bg-purple-50 transition-colors shadow-lg cursor-pointer">
              Start raising free <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      {/* Right — dark indigo */}
      <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 p-12 md:p-16 flex flex-col">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-indigo-400 mb-5">
          For Investors
        </div>
        <h2 className="hs text-3xl md:text-4xl font-bold text-white leading-[1.1] tracking-[-0.03em] mb-5">
          Find signal. Skip the noise.
        </h2>
        <p className="text-indigo-200/80 text-base leading-relaxed mb-8 max-w-sm">
          AI thesis-match scoring, a live DD workstation, and structured document review — so you can move
          from deck to decision without drowning in unstructured deal flow.
        </p>
        <ul className="space-y-3 mb-10">
          {investorFeatures.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-indigo-100">
              <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <Link to="/sign-up" search={{ role: "investor" } as any}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white font-semibold px-6 py-3 text-sm hover:bg-white/10 transition-colors cursor-pointer">
              Explore deal flow <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── 7. AI CHAT SECTION ────────────────────────────────────────────
function ChatSection() {
  return (
    <section id="talk-to-ai" className="bg-gray-950 py-0">
      {/* Hero banner above chat */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 sm:pb-12">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-[11px] font-semibold text-green-400 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            AI Agent · Online 24/7
          </span>
        </div>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div>
            <h3 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300">
                Ask our AI anything about Hockystick
              </span>
            </h3>
            <p className="mt-5 text-lg text-gray-400 max-w-lg leading-relaxed">
              Our AI knows Hockystick inside out — features, pricing, how it works for your specific situation. Ask anything. Get real answers. No sales calls.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              {["Smart Answers", "Personalized Guidance", "Instant Setup Help"].map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1.5 text-sm text-gray-300">
                  <svg className="h-4 w-4 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="text-gray-400 text-sm space-y-2 lg:text-right">
            <div className="text-2xl font-bold text-white">Free during beta</div>
            <div>No credit card · 2-minute setup · Cancel anytime</div>
          </div>
        </div>
      </div>

      {/* Wide chat widget */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
        <div className="rounded-2xl border border-white/10 bg-gray-900 overflow-hidden shadow-2xl">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-gray-900/80">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Talk to Hockystick AI</div>
              <div className="text-[11px] text-green-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Usually replies instantly
              </div>
            </div>
          </div>

          {/* Quick questions grid */}
          <div className="px-6 py-5 border-b border-white/10">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-3 font-semibold">Quick questions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { Icon: Shield,     text: "How do deal rooms work?" },
                { Icon: Sparkles,   text: "What does AI due diligence check?" },
                { Icon: DollarSign, text: "Is it free to use?" },
                { Icon: CheckCircle2, text: "How does thesis matching work?" },
                { Icon: ShieldCheck,  text: "How secure is my data?" },
                { Icon: Mail,         text: "How do I invite investors?" },
              ].map((q) => (
                <button
                  key={q.text}
                  onClick={() => window.dispatchEvent(new CustomEvent("hs-chat-send", { detail: q.text }))}
                  className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/50 p-3 text-left transition-all"
                >
                  <q.Icon size={14} className="shrink-0 mt-0.5 text-purple-400" />
                  <span className="text-xs text-gray-300 leading-relaxed">{q.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat messages area */}
          <div>
            <div className="text-center py-4 px-6 border-b border-white/10">
              <div className="inline-flex items-center gap-2 bg-[#7C3AED]/15 border border-[#7C3AED]/30 rounded-full px-4 py-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-white">Live AI Chat</span>
              </div>
              <p className="text-white/50 text-xs">
                Select your role and ask our AI anything about Hockystick. It can answer 10 questions.
              </p>
            </div>
            <OnboardingChat variant="embedded" darkMode={true} />
          </div>

          {/* Bottom trust strip */}
          <div className="px-6 py-3 border-t border-white/10 bg-gray-900/50">
            <div className="flex flex-wrap gap-6 justify-center text-[11px] text-gray-500">
              {[
                { Icon: Zap,        label: "Instant answers" },
                { Icon: ListChecks, label: "Personalized for your stage" },
                { Icon: ShieldCheck, label: "Private & secure" },
                { Icon: Globe,      label: "Real platform insights" },
              ].map(({ Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <Icon size={11} className="text-gray-500" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 8. REGISTRY TEASER ───────────────────────────────────────────
function RegistryTeaser() {
  return (
    <section
      className="py-16 px-4 sm:px-6"
      style={{
        background: "#0d0d1a",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <p
          className="text-xs uppercase tracking-[0.2em] mb-4"
          style={{ color: "#7C3AED" }}
        >
          Free tool
        </p>
        <h2
          className="font-bold text-2xl sm:text-3xl mb-3"
          style={{ fontFamily: "Syne, sans-serif", color: "#ffffff" }}
        >
          Check if a company is legally registered
        </h2>
        <p
          className="text-sm leading-relaxed mb-8 max-w-xl mx-auto"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Search OpenCorporates (140+ jurisdictions), UK Companies House, and DIFC entity
          register simultaneously. Free. No account required.
        </p>
        <a
          href="/registry"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            color: "#a78bfa",
          }}
        >
          Search company registries →
        </a>
        <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
          UAE · UK · US · Saudi Arabia · Bahrain · Qatar · 140+ jurisdictions
        </p>
      </div>
    </section>
  );
}

// ── 10. FINAL CTA ─────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="bg-gradient-to-r from-purple-600 to-indigo-600 py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="hs text-4xl md:text-5xl font-black text-white leading-tight tracking-[-0.03em]">
          Your verified profile is one step away.
        </h2>
        <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
          Build your structured founder profile, connect with verified investors, and run due diligence — all in one place.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-purple-900 font-semibold px-8 py-4 text-base hover:bg-purple-50 transition-colors shadow-lg w-full sm:w-auto cursor-pointer">
              Start raising <ArrowRight className="h-5 w-5" />
            </span>
          </Link>
          <Link to="/sign-up" search={{ role: "investor" } as any}>
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 text-white font-semibold px-8 py-4 text-base hover:bg-white/10 transition-colors w-full sm:w-auto cursor-pointer">
              Start investing <ArrowRight className="h-5 w-5" />
            </span>
          </Link>
        </div>

        <p className="mt-6 text-sm text-white/50">
          Free during beta · No credit card · 2-minute setup
        </p>
      </div>
    </section>
  );
}

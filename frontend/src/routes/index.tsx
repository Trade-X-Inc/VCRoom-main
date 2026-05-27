import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { OnboardingChat } from "@/components/OnboardingChat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Users, ShieldCheck, ListChecks, CheckCircle2, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hockystick — AI-Powered Deal Rooms for Founders & Investors" },
      { name: "description", content: "Hockystick is the private deal flow platform trusted by founders and VCs. Secure deal rooms, AI due diligence, investor pipeline management, and real-time collaboration." },
      { name: "keywords", content: "deal room software, VC deal flow, startup fundraising platform, investor due diligence, AI investment analysis, deal flow management, startup investor platform" },
      { property: "og:title", content: "Hockystick — AI-Powered Deal Rooms" },
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
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <Hero />
        <Pain />
        <SolutionStatement />
        <HowItWorks />
        <ProofNumbers />
        <ForFoundersInvestors />
        <ChatSection />
        <Resources />
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

      <div className="mx-auto max-w-5xl px-6 py-24 text-center w-full">
        <div className="hs-a hs-a1 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/8 px-3 py-1 text-[11px] font-medium text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-glow" />
          Early access — free during beta
          <ArrowRight className="h-3 w-3" />
        </div>

        <h1 className="hs hs-a hs-a2 mt-6 text-[clamp(3rem,7vw,5rem)] font-black leading-[1.0] tracking-[-0.04em]">
          The deal room where<br />
          <span className="text-gradient-brand">trust gets built.</span>
        </h1>

        <p className="hs-a hs-a3 mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Founders and investors waste months on back-and-forth emails, scattered documents, and zero
          visibility. Hockystick replaces all of it — one room, every deal, no chaos.
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
          No credit card · Free during beta · Setup in 2 minutes
        </p>
      </div>
    </section>
  );
}

// ── 2. PAIN ───────────────────────────────────────────────────────
function Pain() {
  const cards = [
    {
      icon: "📧",
      stat: "200 emails sent",
      who: "The Founder",
      body: "You spend 3 months crafting the perfect pitch. You send it to 200 investors. 12 open it. 3 reply. 1 ghosts you after 4 meetings. You never know why.",
    },
    {
      icon: "📥",
      stat: "50 decks this week",
      who: "The Investor",
      body: "Deals flood your inbox with no structure, no context, no thesis match. Your analyst spends 20 hours on a company you'd pass in 5 minutes if you had the right data.",
    },
    {
      icon: "🔧",
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
          Raising capital is broken.<br />
          Everyone knows it. Nobody fixed it.
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map(({ icon, stat, who, body }) => (
            <div key={who} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="text-3xl mb-4">{icon}</div>
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
      d: "2 minutes. Add your stage, sector, thesis, and funding targets. AI personalizes everything from day one.",
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
      d: "6-category DD checklist. AI analysis. Document review with accept/revision workflow. Q&A between both parties.",
      icon: ListChecks,
    },
    {
      n: "04",
      t: "Make the decision",
      d: "Investor submits a decision: Invest, Hold, or Pass. Founder gets notified. Term sheet next.",
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
    { n: "< 2 min",      label: "to open a fully structured deal room" },
    { n: "6 categories", label: "of due diligence, pre-loaded" },
    { n: "100%",         label: "encrypted & watermarked documents" },
    { n: "1 room",       label: "replaces 12 tools" },
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

// ── 6. FOR FOUNDERS / FOR INVESTORS ──────────────────────────────
function ForFoundersInvestors() {
  const founderFeatures = [
    "NDA-gated investor access",
    "Document vault with AI summaries",
    "Real-time investor activity tracking",
    "Q&A thread per investor",
    "Due diligence workstation",
  ];
  const investorFeatures = [
    "Thesis-match AI scoring (0–100)",
    "Deal flow pipeline kanban",
    "One-click investment memo",
    "6-category DD tracker",
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
  const [starterId, setStarterId] = useState(0);
  const [starterText, setStarterText] = useState<string | null>(null);

  const starters = [
    "I'm a founder raising my first round →",
    "I'm a VC reviewing 50+ deals a month →",
    "I just want to understand how it works →",
  ];

  function handleStarter(text: string) {
    setStarterText(text);
    setStarterId((n) => n + 1);
  }

  return (
    <section className="bg-gray-950 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left */}
          <div>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-purple-400 mb-5">
              Talk to us
            </div>
            <h2 className="hs text-4xl md:text-5xl font-black text-white leading-tight tracking-[-0.03em]">
              Not sure if<br />
              Hockystick is<br />
              right for you?
            </h2>
            <p className="mt-5 text-lg text-gray-400 max-w-md leading-relaxed">
              Don't read another landing page. Just tell us who you are and what you're trying to solve.
              Our AI will tell you — honestly — if we're the right fit.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {starters.map((text) => (
                <button
                  key={text}
                  onClick={() => handleStarter(text)}
                  className="text-left rounded-full border border-white/20 text-white hover:bg-white hover:text-gray-950 px-5 py-2.5 text-sm font-medium transition-all"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Right — chat widget */}
          <div className="shadow-2xl rounded-2xl ring-1 ring-white/10">
            <OnboardingChat key={starterId} variant="embedded" triggerMessage={starterText} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 8. STARTUP RESOURCES ─────────────────────────────────────────
const ACCELERATORS = [
  { name: "Y Combinator",        desc: "The world's most prestigious accelerator. $500K for 7%.",  href: "https://ycombinator.com/apply",           cta: "Apply →" },
  { name: "Techstars",           desc: "3-month program, $120K investment, global network.",        href: "https://techstars.com/apply",              cta: "Apply →" },
  { name: "500 Global",          desc: "Early-stage VC with accelerator programs worldwide.",       href: "https://500.co",                           cta: "Apply →" },
  { name: "Antler",              desc: "Build your company from day zero with co-founders.",        href: "https://antler.co",                        cta: "Apply →" },
  { name: "Entrepreneur First",  desc: "Pre-team, pre-idea — they back individuals.",               href: "https://joinef.com",                       cta: "Apply →" },
  { name: "Seedcamp",            desc: "Europe's leading pre-seed and seed fund.",                  href: "https://seedcamp.com",                     cta: "Apply →" },
];

const GRANTS = [
  { name: "SBIR / STTR",             desc: "US government grants up to $2M for tech startups.",       href: "https://sbir.gov",                           cta: "Learn more →" },
  { name: "Google for Startups",     desc: "Cloud credits, mentorship, and global community.",         href: "https://startup.google.com",                 cta: "Learn more →" },
  { name: "AWS Activate",            desc: "Up to $100K in AWS credits for startups.",                 href: "https://aws.amazon.com/activate",             cta: "Learn more →" },
  { name: "Microsoft for Startups",  desc: "Azure credits, GitHub, and go-to-market support.",         href: "https://microsoft.com/startups",              cta: "Learn more →" },
  { name: "Innovate UK",             desc: "UK government funding for innovative businesses.",          href: "https://innovateuk.ukri.org",                 cta: "Learn more →" },
  { name: "EU Horizon",              desc: "European research and innovation funding.",                 href: "https://ec.europa.eu/info/funding-tenders",   cta: "Learn more →" },
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
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">
            Startup Resources
          </div>
          <h2 className="hs text-3xl md:text-4xl font-bold tracking-[-0.04em] leading-[1.08] mb-3">
            Everything you need to fund your startup.
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Applications, grants, and programs trusted by thousands of founders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/70 mb-4">
              Top Accelerators
            </h3>
            <div className="grid gap-3">
              {ACCELERATORS.map((r) => <ResourceCard key={r.name} {...r} />)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground/70 mb-4">
              Grants &amp; Programs
            </h3>
            <div className="grid gap-3">
              {GRANTS.map((r) => <ResourceCard key={r.name} {...r} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 9. FINAL CTA ─────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="bg-gradient-to-r from-purple-600 to-indigo-600 py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="hs text-4xl md:text-5xl font-black text-white leading-tight tracking-[-0.03em]">
          The deal room is ready.<br />
          Are you?
        </h2>
        <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
          Join founders and investors already using Hockystick to close deals faster, with less friction.
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

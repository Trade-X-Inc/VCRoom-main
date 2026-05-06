import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AppPreview } from "@/components/site/AppPreview";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Sparkles, Users, FileText, ShieldCheck, ListChecks, Mail, Briefcase,
  CheckCircle2, AlertTriangle, MessageSquare, Layers,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Venture Room — Where Deals Get Decided" },
      { name: "description", content: "AI-powered fundraising CRM and deal room. Manage your entire fundraise — from first investor email to final decision — in one structured platform." },
      { property: "og:title", content: "Venture Room — Where Deals Get Decided" },
      { property: "og:description", content: "The investor-grade platform for founders and VCs. CRM, Deal Room, AI." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <LogoCloud />
      <Problem />
      <Solution />
      <Features />
      <Preview />
      <HowItWorks />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="absolute inset-0 -z-10 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent_70%)]" />
      <div className="mx-auto max-w-7xl px-6 pt-24 pb-20 md:pt-32 md:pb-28 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-brand" />
          New · AI Email Assistant for founders
          <ArrowRight className="h-3 w-3" />
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-[-0.04em] leading-[1.02]">
          Where deals
          <br />
          <span className="text-gradient-brand">get decided.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base md:text-lg text-muted-foreground">
          Manage your entire fundraise — from first investor email to final decision — in one structured platform built for founders and VCs.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/sign-up" search={{ role: "founder" } as any}>
            <Button variant="brand" size="lg" className="gap-2">Start as Founder <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Link to="/sign-up" search={{ role: "investor" } as any}>
            <Button variant="outline" size="lg">For Investors</Button>
          </Link>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">No credit card · 14-day trial · SOC 2 Type II</div>

        <div className="relative mt-16">
          <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 bg-gradient-mesh opacity-50 blur-3xl" />
          <AppPreview />
        </div>
      </div>
    </section>
  );
}

function LogoCloud() {
  const logos = ["Sequoia", "a16z", "Index", "Accel", "Lightspeed", "Bessemer", "Greylock"];
  return (
    <section className="border-y border-border/60 bg-gradient-soft py-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">Trusted by founders raising from</div>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-x-8 gap-y-4 place-items-center">
          {logos.map((l) => (
            <div key={l} className="text-sm font-medium text-muted-foreground/80 tracking-tight">{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs uppercase tracking-wider text-brand font-medium">The problem</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]">Fundraising is broken on both sides.</h2>
      </div>

      <div className="mt-14 grid md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-card">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium">For founders</div>
          <h3 className="mt-4 text-xl font-semibold">You're flying blind.</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {["Messy outreach across spreadsheets and inboxes", "No tracking on who replied, when, or why", "Decks, NDAs, and updates scattered everywhere", "No idea which investor is actually serious"].map((t) => (
              <li key={t} className="flex gap-3"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /><span>{t}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-card">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium">For VCs</div>
          <h3 className="mt-4 text-xl font-semibold">You're drowning in deals.</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            {["Hundreds of decks per month, no structure", "Diligence lives in 6 different tools", "Partners can't see deal status at a glance", "Decisions take weeks instead of days"].map((t) => (
              <li key={t} className="flex gap-3"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /><span>{t}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="relative">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-xs uppercase tracking-wider text-brand font-medium">The solution</div>
            <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]">One platform.<br />The whole fundraise.</h2>
            <p className="mt-5 text-muted-foreground text-base max-w-md">
              Venture Room combines a purpose-built CRM, a structured deal room, and an AI assistant that drafts, tracks, and analyzes every interaction.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              {[{ k: "CRM", v: "Pipeline" }, { k: "Deal Room", v: "Diligence" }, { k: "AI", v: "Assistant" }].map((s) => (
                <div key={s.k} className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="text-[11px] uppercase text-muted-foreground tracking-wider">{s.k}</div>
                  <div className="text-sm font-medium mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-border/60 bg-card shadow-elev p-1">
              <div className="rounded-xl bg-gradient-mesh p-8 min-h-[360px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 noise opacity-60" />
                <div className="relative grid grid-cols-2 gap-3 w-full max-w-sm">
                  {[
                    { i: Users, l: "VC CRM", c: "CRM + pipeline" },
                    { i: Sparkles, l: "AI drafts", c: "12 ready" },
                    { i: Briefcase, l: "Deal rooms", c: "4 active" },
                    { i: ShieldCheck, l: "NDA", c: "Auto" },
                  ].map((b) => (
                    <div key={b.l} className="rounded-xl border border-border/60 bg-card/90 backdrop-blur p-4 shadow-card">
                      <b.i className="h-4 w-4 text-brand" />
                      <div className="mt-3 text-sm font-medium">{b.l}</div>
                      <div className="text-xs text-muted-foreground">{b.c}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { i: Users, t: "VC Lead CRM", d: "Kanban pipeline from first email to term sheet. Notes, follow-ups, intros." },
    { i: Sparkles, t: "AI Email Assistant", d: "Draft cold emails, follow-ups, and updates in your voice — in seconds." },
    { i: Briefcase, t: "Deal Room", d: "Structured rooms with documents, Q&A, checklist, decision board." },
    { i: FileText, t: "Document Vault", d: "Versioned, watermarked, permissioned. Know exactly who viewed what." },
    { i: ShieldCheck, t: "NDA Flow", d: "Auto-filled, click-to-sign NDAs that gate access in one step." },
    { i: ListChecks, t: "Due Diligence", d: "Templated checklists across legal, financial, technical, market." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-brand font-medium">Features</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]">Everything you need.<br />Nothing you don't.</h2>
      </div>
      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
        {feats.map((f) => (
          <div key={f.t} className="bg-card p-7 hover:bg-accent/40 transition-colors group">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground shadow-glow">
              <f.i className="h-5 w-5" />
            </div>
            <div className="mt-5 text-base font-semibold">{f.t}</div>
            <div className="mt-1.5 text-sm text-muted-foreground">{f.d}</div>
            <div className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Learn more <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Preview() {
  return (
    <section className="relative border-y border-border/60">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-brand font-medium">Product preview</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]">A workspace that respects your time.</h2>
        </div>

        <div className="mt-12 grid lg:grid-cols-3 gap-5">
          {[
            { t: "Dashboard", d: "Real-time fundraising progress.", c: <MiniDashboard /> },
            { t: "Pipeline", d: "Drag, drop, decide.", c: <MiniPipeline /> },
            { t: "Deal Room", d: "Where decisions happen.", c: <MiniDealRoom /> },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
              <div className="p-5 border-b border-border/60">
                <div className="text-sm font-semibold">{b.t}</div>
                <div className="text-xs text-muted-foreground">{b.d}</div>
              </div>
              <div className="p-4 bg-gradient-soft min-h-[220px]">{b.c}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniDashboard() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/60 bg-card p-3">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Raised</div>
        <div className="flex items-baseline gap-2"><span className="text-lg font-semibold">$3.2M</span><span className="text-[10px] text-success">+12%</span></div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full w-[40%] bg-gradient-brand" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[["Investors", "47"], ["Meetings", "18"]].map(([l, v]) => (
          <div key={l} className="rounded-md border border-border/60 bg-card p-2.5">
            <div className="text-[10px] text-muted-foreground">{l}</div>
            <div className="text-sm font-semibold">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MiniPipeline() {
  return (
    <div className="grid grid-cols-3 gap-2 h-full">
      {[["Replied", 9, "bg-brand"], ["Meeting", 5, "bg-violet"], ["DR", 4, "bg-success"]].map(([l, n, c]) => (
        <div key={l as string} className="rounded-md border border-border/60 bg-card p-2 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{l as string}</span>
            <span className={`h-1.5 w-1.5 rounded-full ${c as string}`} />
          </div>
          <div className="text-sm font-semibold">{n as number}</div>
          <div className="mt-1 space-y-1 flex-1">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-4 rounded bg-muted/70" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
function MiniDealRoom() {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border/60 bg-card p-2.5 flex items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-brand" />
        <div className="text-xs font-medium flex-1">Your Company — Series A</div>
        <span className="text-[10px] rounded-full bg-success/15 text-success px-1.5 py-0.5">Active</span>
      </div>
      {[["Pitch deck v3", CheckCircle2, "text-success"], ["Cap table", CheckCircle2, "text-success"], ["Financial model", AlertTriangle, "text-warning"], ["Q&A · 12 open", MessageSquare, "text-muted-foreground"]].map(([l, I, c]: any) => (
        <div key={l} className="rounded-md border border-border/60 bg-card p-2.5 flex items-center gap-2 text-xs">
          <I className={`h-3.5 w-3.5 ${c}`} />
          <span className="flex-1">{l}</span>
        </div>
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Add leads", d: "Import a CSV or let AI build your list from your sector and stage." },
    { n: "02", t: "Reach out", d: "AI drafts personalized cold emails. You approve. We track every reply." },
    { n: "03", t: "Open deal room", d: "One-click structured room with NDA, docs, Q&A, and decision board." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-brand font-medium">How it works</div>
        <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.03em]">From zero to closed in three moves.</h2>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {steps.map((s, i) => (
          <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card p-7 shadow-card">
            <div className="text-xs font-mono text-brand">{s.n}</div>
            <div className="mt-3 text-lg font-semibold">{s.t}</div>
            <div className="mt-2 text-sm text-muted-foreground">{s.d}</div>
            {i < steps.length - 1 && (
              <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50 bg-background rounded-full p-0.5" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-primary text-primary-foreground p-12 md:p-20 text-center">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="absolute inset-0 noise opacity-40" />
        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em]">Run your fundraise<br />like a pro.</h2>
          <p className="mt-5 text-base md:text-lg opacity-70 max-w-lg mx-auto">Join the founders and investors making decisions faster, with more clarity.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/sign-up" search={{ role: "founder" } as any}>
              <Button variant="brand" size="lg" className="gap-2">Start free <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/sign-up" search={{ role: "investor" } as any}>
              <Button size="lg" className="bg-background/10 text-primary-foreground hover:bg-background/20 border border-primary-foreground/20">For Investors</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

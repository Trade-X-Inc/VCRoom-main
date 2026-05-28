import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hockystick" },
      { name: "description", content: "Free during beta. No credit card. Early members lock in 50% off forever." },
    ],
  }),
  component: PricingPage,
});

// ── Plan data ─────────────────────────────────────────────────────

const FOUNDER_PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    desc: "Get started with the basics.",
    features: [
      "1 deal room",
      "10 VC leads",
      "5 AI outreach messages/month",
      "Basic Q&A",
    ],
    missing: ["AI document summaries", "AI advisor"],
    cta: "Get started free",
    ctaHref: "/sign-up?role=founder",
    featured: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    desc: "For founders running a serious raise.",
    features: [
      "Unlimited deal rooms",
      "100 VC lead imports",
      "30 AI outreach messages/month",
      "AI document summaries",
      "AI advisor",
      "Priority support",
    ],
    missing: [],
    cta: "Start free trial",
    ctaHref: "/sign-up?role=founder",
    featured: true,
    badge: "Most popular",
  },
  {
    name: "Fund",
    price: "$199",
    period: "/month",
    desc: "Everything, unlimited.",
    features: [
      "Everything in Growth",
      "Unlimited VC leads",
      "Unlimited AI messages",
      "Custom domain",
      "API access",
      "Dedicated support",
    ],
    missing: [],
    cta: "Contact us",
    ctaHref: "mailto:hello@hockystick.app",
    featured: false,
    isExternal: true,
  },
];

const INVESTOR_PLANS = [
  {
    name: "Explorer",
    price: "Free",
    period: "forever",
    desc: "Dip your toes in.",
    features: [
      "2 deal rooms",
      "2 AI analyses/month",
      "2 due diligence reports",
      "Basic pipeline",
    ],
    missing: ["Investment memo generator", "Portfolio tracking"],
    cta: "Get started free",
    ctaHref: "/sign-up?role=investor",
    featured: false,
  },
  {
    name: "Partner",
    price: "$49",
    period: "/month",
    desc: "For active investors managing real deal flow.",
    features: [
      "Unlimited deal rooms",
      "20 AI analyses/month",
      "Unlimited DD reports",
      "Investment memo generator",
      "Portfolio tracking",
    ],
    missing: [],
    cta: "Start free trial",
    ctaHref: "/sign-up?role=investor",
    featured: true,
    badge: "Most popular",
  },
  {
    name: "Fund",
    price: "$199",
    period: "/month",
    desc: "Built for funds and syndicates.",
    features: [
      "Everything in Partner",
      "Unlimited AI analyses",
      "Team collaboration (5 seats)",
      "Custom domain",
      "API access",
    ],
    missing: [],
    cta: "Contact us",
    ctaHref: "mailto:hello@hockystick.app",
    featured: false,
    isExternal: true,
  },
];

const PROMISES = [
  {
    title: "Your data is yours",
    body: "All documents, deal rooms, and contacts can be exported anytime. No lock-in.",
  },
  {
    title: "Founding member pricing",
    body: "Early beta users lock in 50% off paid plans forever. No renegotiating later.",
  },
  {
    title: "30-day notice",
    body: "We'll give you 30 days notice before any feature moves behind a paywall.",
  },
];

const FAQS = [
  {
    q: "What happens to my data when beta ends?",
    a: "Nothing. All your data stays exactly where it is. We give 30 days notice before any plan changes — and founding members get locked-in pricing.",
  },
  {
    q: "Will free features disappear?",
    a: "Core features stay free forever. We'll always have a free tier. Hockystick without a free plan isn't Hockystick.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-in. Cancel with one click — no email needed, no questions asked.",
  },
  {
    q: "Is there a team plan?",
    a: "Coming soon. Enterprise plans with custom pricing are available now — email hello@hockystick.app and we'll set you up.",
  },
];

// ── Sub-components ────────────────────────────────────────────────

function PlanCard({ plan }: { plan: typeof FOUNDER_PLANS[number] }) {
  const isFree = plan.price === "Free";
  return (
    <div className={cn(
      "relative rounded-2xl border p-7 flex flex-col",
      plan.featured
        ? "border-violet-500/60 bg-card shadow-[0_0_40px_-8px_rgba(139,92,246,0.25)]"
        : "border-border/60 bg-card shadow-card",
    )}>
      {plan.featured && "badge" in plan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white px-3 py-1 rounded-full whitespace-nowrap">
          {plan.badge}
        </div>
      )}

      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {plan.name}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
        <span className="text-sm text-muted-foreground">{plan.period}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>

      {"isExternal" in plan && plan.isExternal ? (
        <a
          href={plan.ctaHref}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors mb-7",
            plan.featured
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90"
              : "border border-border/60 hover:bg-accent",
          )}
        >
          {plan.cta} <ArrowRight className="h-4 w-4" />
        </a>
      ) : (
        <Link
          to={plan.ctaHref as any}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors mb-7",
            plan.featured
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:opacity-90"
              : isFree
              ? "border border-border/60 hover:bg-accent"
              : "border border-border/60 hover:bg-accent",
          )}
        >
          {plan.cta} <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      <ul className="space-y-2.5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <Check className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {plan.missing.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/50 line-through">
            <Check className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-5 text-left text-sm font-semibold hover:text-brand transition-colors gap-4"
      >
        {q}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

function PricingPage() {
  const [tab, setTab] = useState<"founders" | "investors">("founders");
  const plans = tab === "founders" ? FOUNDER_PLANS : INVESTOR_PLANS;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Beta banner */}
      <div className="bg-gradient-to-r from-purple-950 to-indigo-950 border-b border-purple-800/40">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center">
          <p className="text-sm text-purple-200">
            🎉 <span className="font-semibold text-white">You're early.</span> Everything is free during beta — no credit card, no limits on core features.{" "}
            <span className="text-purple-300">Early members get locked-in pricing forever.</span>
          </p>
        </div>
      </div>

      {/* Header */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-10 text-center">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-4">Pricing</div>
        <h1 className="text-4xl md:text-6xl font-black tracking-[-0.04em] leading-[1.0]">
          Honest pricing.<br />No surprises.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Start free. Upgrade when your deal flow demands it. Beta users lock in 50% off — forever.
        </p>

        {/* Tab switcher */}
        <div className="mt-8 inline-flex rounded-xl border border-border/60 bg-muted/50 p-1 gap-1">
          {(["founders", "investors"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all",
                tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              For {t === "founders" ? "Founders" : "Investors"}
            </button>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan as any} />
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          All prices in USD. Billed monthly. Annual plans coming soon with additional savings.
        </p>
      </section>

      {/* Beta promise */}
      <section className="border-y border-border/60 bg-gradient-to-br from-purple-950/30 to-indigo-950/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-14">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">Our promise</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em]">
              Join now. Pay nothing.<br />Keep your data forever.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {PROMISES.map(({ title, body }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 grid place-items-center mb-5 shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)]">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-base mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center mb-12">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-brand mb-3">FAQ</div>
          <h2 className="text-3xl font-black tracking-[-0.03em]">Common questions</h2>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card px-6">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} {...faq} />
          ))}
        </div>

        <div className="mt-10 text-center rounded-2xl border border-brand/20 bg-brand/5 p-8">
          <p className="text-sm font-semibold mb-1">Still have questions?</p>
          <p className="text-sm text-muted-foreground mb-4">We're a small team and we actually reply.</p>
          <a
            href="mailto:hello@hockystick.app"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold px-6 py-2.5 text-sm hover:opacity-90 transition-opacity"
          >
            Email us <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

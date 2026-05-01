import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Venture Room" },
      { name: "description", content: "Simple pricing for founders, investors, and funds raising or evaluating deals." },
    ],
  }),
  component: Pricing,
});

const tiers = [
  {
    name: "Founder",
    price: "$0",
    period: "free during raise",
    desc: "For founders actively raising.",
    features: ["Up to 100 VC leads", "AI email assistant", "1 active deal room", "Document vault"],
    cta: "Start free",
  },
  {
    name: "Founder Pro",
    price: "$49",
    period: "/month",
    desc: "For serious raises.",
    features: ["Unlimited leads", "Unlimited deal rooms", "AI advisor", "Custom NDA flow", "Priority support"],
    cta: "Start trial",
    featured: true,
  },
  {
    name: "Fund",
    price: "Custom",
    period: "talk to sales",
    desc: "For VC funds and angel networks.",
    features: ["Investor pipeline", "Team seats", "AI deal analysis", "SSO + SOC 2", "Dedicated CSM"],
    cta: "Contact sales",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs uppercase tracking-wider text-brand font-medium">Pricing</div>
          <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-[-0.03em]">Honest pricing.<br />No surprises.</h1>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when your raise demands it.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-7 ${t.featured ? "border-brand/50 bg-card shadow-elev relative" : "border-border/60 bg-card shadow-card"}`}>
              {t.featured && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider bg-gradient-brand text-brand-foreground px-2.5 py-0.5 rounded-full">Most popular</div>}
              <div className="text-sm font-medium">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{t.desc}</div>
              <Link to="/app" className="block mt-6">
                <Button className="w-full" variant={t.featured ? "brand" : "outline"} size="lg">
                  {t.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <ul className="mt-7 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-brand shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

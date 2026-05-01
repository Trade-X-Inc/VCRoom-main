import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AppPreview } from "@/components/site/AppPreview";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";

interface Props {
  eyebrow: string;
  title: string;
  sub: string;
  Icon: LucideIcon;
  features: [string, string][];
}

export function SolutionPage({ eyebrow, title, sub, Icon, features }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 backdrop-blur px-3 py-1 text-xs">
              <Icon className="h-3.5 w-3.5 text-brand" /> {eyebrow}
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05]">{title}</h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">{sub}</p>
            <div className="mt-7 flex gap-3">
              <Link to="/app"><Button variant="brand" size="lg" className="gap-2">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/pricing"><Button variant="outline" size="lg">View pricing</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <AppPreview />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid md:grid-cols-3 gap-5">
          {features.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border/60 bg-card p-7 shadow-card">
              <Check className="h-5 w-5 text-brand" />
              <div className="mt-4 text-base font-semibold">{t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

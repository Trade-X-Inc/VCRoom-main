import { createFileRoute } from "@tanstack/react-router";
import { Brain, AlertTriangle, TrendingUp, Shield } from "lucide-react";

export const Route = createFileRoute("/app/investor/analysis")({
  component: () => (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow"><Brain className="h-5 w-5" /></div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Analysis</h1>
          <div className="text-sm text-muted-foreground">Atlas Robotics — automated risk and opportunity summary</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-[0.06]" />
        <div className="relative">
          <div className="text-xs uppercase tracking-wider text-brand font-medium">Investment thesis match</div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-5xl font-semibold tracking-tight">87</span>
            <span className="text-sm text-muted-foreground">/ 100 · strong fit for AI infra thesis</span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid md:grid-cols-3 gap-4">
        {[
          { i: TrendingUp, c: "text-success", t: "Strengths", b: ["318% ARR growth YoY", "F500 customer concentration < 30%", "Technical moat in physical AI"] },
          { i: AlertTriangle, c: "text-warning", t: "Risks", b: ["Hardware capex intensity", "Long sales cycle (9–12 mo)", "Competing with NVIDIA's Isaac stack"] },
          { i: Shield, c: "text-brand", t: "Mitigants", b: ["SaaS-led pricing covers BOM", "Enterprise pilots auto-convert at 78%", "Defensible demonstration-learning IP"] },
        ].map((b) => (
          <div key={b.t} className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <b.i className={`h-5 w-5 ${b.c}`} />
            <div className="mt-3 text-sm font-semibold">{b.t}</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {b.b.map((x) => <li key={x} className="flex gap-2"><span className="text-foreground/30">·</span><span>{x}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  ),
});

import { createFileRoute } from "@tanstack/react-router";
import { PieChart, Plus } from "lucide-react";

export const Route = createFileRoute("/app/investor/")({
  component: InvestorPipeline,
});

const stages = ["Sourced", "Screen", "Meeting", "Diligence", "Decision", "Pass"];
const startups = [
  { stage: "Sourced", n: "Atlas Robotics", s: "Series A · Robotics", check: "$5M", score: 87 },
  { stage: "Sourced", n: "Lumen AI", s: "Seed · Dev tools", check: "$2M", score: 76 },
  { stage: "Screen", n: "Helix Bio", s: "Series A · Biotech", check: "$8M", score: 91 },
  { stage: "Screen", n: "Northwind", s: "Seed · Climate", check: "$1.5M", score: 68 },
  { stage: "Meeting", n: "Quanta Labs", s: "Series A · AI", check: "$10M", score: 94 },
  { stage: "Meeting", n: "Forge", s: "Seed · Fintech", check: "$3M", score: 72 },
  { stage: "Diligence", n: "Vertex", s: "Series B · SaaS", check: "$15M", score: 89 },
  { stage: "Decision", n: "Mira Health", s: "Series A · Health", check: "$7M", score: 85 },
  { stage: "Pass", n: "Pulse", s: "Seed · Consumer", check: "—", score: 42 },
];

function InvestorPipeline() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Pipeline</h1>
          <div className="text-sm text-muted-foreground">128 sourced · 12 in active diligence · 4 decisions this week</div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Plus className="h-4 w-4" /> Source deal</button>
      </div>

      <div className="mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-6">
        <div className="flex gap-3 min-w-max">
          {stages.map((s) => {
            const items = startups.filter((x) => x.stage === s);
            return (
              <div key={s} className="w-[300px] flex-shrink-0">
                <div className="px-1 mb-2.5 flex items-center justify-between">
                  <div className="text-sm font-medium">{s} <span className="text-xs text-muted-foreground">{items.length}</span></div>
                </div>
                <div className="space-y-2 rounded-xl bg-muted/30 p-2 min-h-[200px]">
                  {items.map((c) => (
                    <div key={c.n} className="rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold">{c.n}</div>
                          <div className="text-xs text-muted-foreground">{c.s}</div>
                        </div>
                        <div className={`text-[11px] font-mono tabular-nums rounded-md px-1.5 py-0.5 ${c.score >= 85 ? "bg-success/15 text-success" : c.score >= 70 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>
                          {c.score}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Ask</span>
                        <span className="font-medium">{c.check}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/investor/deal-rooms")({
  component: () => (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
      <div className="text-sm text-muted-foreground">12 active · sorted by recency</div>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {[
          { id: "dr_001", n: "Atlas Robotics", s: "Diligence · 78%", risk: "Low" },
          { id: "dr_002", n: "Quanta Labs", s: "Q&A · 52%", risk: "Medium" },
          { id: "dr_003", n: "Vertex", s: "Decision · 92%", risk: "Low" },
          { id: "dr_004", n: "Helix Bio", s: "Onboarding · 18%", risk: "High" },
        ].map((r) => (
          <Link to={"/app/deal-room/$id" as any} params={{ id: r.id } as any} key={r.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold">{r.n[0]}</div>
              <div className="flex-1">
                <div className="font-semibold">{r.n}</div>
                <div className="text-xs text-muted-foreground">{r.s}</div>
              </div>
              <span className={`text-xs rounded-full px-2 py-0.5 ${r.risk === "Low" ? "bg-success/15 text-success" : r.risk === "Medium" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>{r.risk} risk</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  ),
});

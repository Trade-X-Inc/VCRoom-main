import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Kanban, List } from "lucide-react";

export const Route = createFileRoute("/app/investor/pipeline")({
  component: PipelinePage,
});

const stages = [
  { k: "Sourced", color: "bg-muted-foreground" },
  { k: "Reviewing", color: "bg-brand" },
  { k: "Diligence", color: "bg-warning" },
  { k: "Partner Review", color: "bg-violet" },
  { k: "Term Sheet", color: "bg-success" },
  { k: "Closed/Passed", color: "bg-destructive" },
];

function PipelinePage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const deals: any[] = [];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Pipeline</h1>
          <div className="text-sm text-muted-foreground">Your personal deal tracking</div>
        </div>
        <div className="inline-flex rounded-[10px] border border-border/60 p-0.5 bg-card">
          <button onClick={() => setView("kanban")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${view === "kanban" ? "bg-accent text-foreground font-medium" : "text-muted-foreground"}`}><Kanban className="h-3.5 w-3.5" /> Kanban</button>
          <button onClick={() => setView("list")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md ${view === "list" ? "bg-accent text-foreground font-medium" : "text-muted-foreground"}`}><List className="h-3.5 w-3.5" /> List</button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {stages.map((s) => (
              <div key={s.k} className="w-[280px] shrink-0">
                <div className="px-1 mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.color}`} />
                  <div className="text-xs font-semibold">{s.k}</div>
                  <span className="text-xs text-muted-foreground">0 · $0</span>
                </div>
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 min-h-[200px] grid place-items-center text-xs text-muted-foreground">
                  No deals here
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <div className="col-span-4">Company</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-2">Ask</div>
            <div className="col-span-2">Last activity</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="px-5 py-12 text-sm text-muted-foreground text-center">No deals in your pipeline yet.</div>
        </div>
      )}
    </div>
  );
}

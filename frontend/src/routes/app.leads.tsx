import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Upload, Filter, MoreHorizontal, Flame, Mail, Calendar } from "lucide-react";
import { leads, stages, stageColor, type Stage } from "@/lib/mock";

export const Route = createFileRoute("/app/leads")({
  component: Leads,
});

function Leads() {
  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4 max-w-[1600px]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">VC Leads</h1>
          <div className="text-sm text-muted-foreground">47 investors · 18 active conversations</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"><Filter className="h-4 w-4" /> Filter</button>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"><Upload className="h-4 w-4" /> Import CSV</button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Plus className="h-4 w-4" /> Add lead</button>
        </div>
      </div>

      <div className="mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-6">
        <div className="flex gap-3 min-w-max">
          {stages.map((s) => (
            <Column key={s} stage={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Column({ stage }: { stage: Stage }) {
  const items = leads.filter((l) => l.stage === stage);
  return (
    <div className="w-[280px] flex-shrink-0">
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${stageColor[stage]}`} />
          <span className="text-sm font-medium">{stage}</span>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
      </div>
      <div className="space-y-2 rounded-xl bg-muted/30 p-2 min-h-[200px]">
        {items.map((l) => (
          <Card key={l.id} l={l} />
        ))}
        <button className="w-full rounded-md border border-dashed border-border/80 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

function Card({ l }: { l: typeof leads[0] }) {
  return (
    <Link to={"/app/lead/$id" as any} params={{ id: l.id } as any} className="block rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold shrink-0">{l.initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium truncate">{l.name}</div>
            {l.hot && <Flame className="h-3 w-3 text-warning shrink-0" />}
          </div>
          <div className="text-xs text-muted-foreground truncate">{l.firm}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1 flex-wrap">
        <span className="text-[10px] rounded-full bg-accent px-1.5 py-0.5 text-foreground/80">{l.check}</span>
        <span className="text-[10px] rounded-full bg-accent px-1.5 py-0.5 text-foreground/80">{l.thesis}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-muted-foreground hover:text-foreground"><Mail className="h-3.5 w-3.5" /></button>
        <button className="text-muted-foreground hover:text-foreground"><Calendar className="h-3.5 w-3.5" /></button>
        <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
      </div>
    </Link>
  );
}

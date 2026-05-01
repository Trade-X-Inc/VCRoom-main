import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useMemo, useState } from "react";
import { deals as seedDeals, pipelineStages, type Deal, type PipelineStage } from "@/lib/mock";
import { Plus, Flame, Clock, ArrowUpRight, Filter } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/pipeline")({
  component: () => <AppShell><Pipeline /></AppShell>,
});

const stageTint: Record<PipelineStage, string> = {
  "Sourced": "bg-muted-foreground/40",
  "Qualified": "bg-foreground/40",
  "Pitched": "bg-brand",
  "Diligence": "bg-violet",
  "Term Sheet": "bg-warning",
  "Closed": "bg-success",
};

function Pipeline() {
  const { t } = useI18n();
  const [deals, setDeals] = useState<Deal[]>(seedDeals);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);

  const byStage = useMemo(() => {
    const m: Record<PipelineStage, Deal[]> = { Sourced: [], Qualified: [], Pitched: [], Diligence: [], "Term Sheet": [], Closed: [] };
    deals.forEach((d) => m[d.stage].push(d));
    return m;
  }, [deals]);

  const totalValue = (xs: Deal[]) =>
    xs.reduce((sum, d) => {
      const n = parseFloat(d.check.replace(/[^0-9.]/g, "")) || 0;
      return sum + n;
    }, 0);

  const onDrop = (stage: PipelineStage) => {
    if (!dragId) return;
    setDeals((ds) => ds.map((d) => (d.id === dragId ? { ...d, stage } : d)));
    setDragId(null);
    setOverStage(null);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("pipeline.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pipeline.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow">
            <Plus className="h-4 w-4" /> {t("pipeline.newDeal")}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total deals", String(deals.length), "across pipeline"],
          ["Pipeline value", `$${totalValue(deals).toFixed(0)}M`, "uncommitted"],
          ["Hot deals", String(deals.filter(d => d.signal === "hot").length), "need follow-up"],
          ["Closed", `$${totalValue(byStage.Closed).toFixed(0)}M`, "this quarter"],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
            <div className="text-[11px] text-muted-foreground">{s}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="mt-6 grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-3 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const items = byStage[stage];
          const isOver = overStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => onDrop(stage)}
              className={cn(
                "flex flex-col rounded-xl border bg-muted/30 transition-colors min-h-[400px]",
                isOver ? "border-brand bg-brand/5" : "border-border/60"
              )}
            >
              <div className="px-3 py-2.5 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stageTint[stage])} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{stage}</span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">${totalValue(items).toFixed(0)}M</span>
              </div>

              <div className="flex-1 p-2 space-y-2">
                {items.map((d) => (
                  <DealCard key={d.id} deal={d} onDragStart={() => setDragId(d.id)} />
                ))}
                {items.length === 0 && (
                  <div className="py-8 text-center text-[11px] text-muted-foreground">Drop deals here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({ deal, onDragStart }: { deal: Deal; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-card hover:border-brand/40 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[10px] font-semibold shrink-0">{deal.initials}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{deal.firm}</div>
            <div className="text-[11px] text-muted-foreground truncate">{deal.partner}</div>
          </div>
        </div>
        {deal.signal === "hot" && <Flame className="h-3.5 w-3.5 text-warning shrink-0" />}
        {deal.signal === "stale" && <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{deal.thesis}</div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs font-medium tabular-nums">{deal.check}</span>
        <span className="text-[10px] text-muted-foreground">{deal.lastTouch}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-brand" style={{ width: `${deal.probability}%` }} />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">{deal.probability}%</span>
      </div>
      <button className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowUpRight className="h-3 w-3" />
      </button>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ddChecklist as seed, type DDItem, type DDStatus } from "@/lib/mock";
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, Filter } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const statusMeta: Record<DDStatus, { label: string; icon: any; tint: string }> = {
  done: { label: "Done", icon: CheckCircle2, tint: "text-success" },
  in_progress: { label: "In progress", icon: Clock, tint: "text-brand" },
  todo: { label: "To do", icon: Circle, tint: "text-muted-foreground" },
  blocked: { label: "Blocked", icon: AlertTriangle, tint: "text-warning" },
};

const cycle: Record<DDStatus, DDStatus> = { todo: "in_progress", in_progress: "done", done: "todo", blocked: "todo" };

export function DDChecklist() {
  const { t } = useI18n();
  const [items, setItems] = useState<DDItem[]>(seed);
  const [filter, setFilter] = useState<"all" | DDStatus>("all");

  const filtered = useMemo(() => filter === "all" ? items : items.filter((i) => i.status === filter), [items, filter]);
  const byCategory = useMemo(() => {
    const m = new Map<DDItem["category"], DDItem[]>();
    filtered.forEach((i) => { if (!m.has(i.category)) m.set(i.category, []); m.get(i.category)!.push(i); });
    return Array.from(m.entries());
  }, [filtered]);

  const total = items.length;
  const done = items.filter((i) => i.status === "done").length;
  const overall = Math.round((done / total) * 100);

  const cycleStatus = (id: string) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: cycle[x.status] } : x)));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("checklist.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{done} of {total} items {t("checklist.complete").toLowerCase()} · {overall}%</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"><Plus className="h-4 w-4" /> {t("checklist.add")}</button>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-brand transition-all" style={{ width: `${overall}%` }} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "todo", "in_progress", "done", "blocked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              filter === f ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"
            )}
          >
            {f === "all" ? "All" : statusMeta[f].label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {byCategory.map(([cat, list]) => {
          const catDone = list.filter((i) => i.status === "done").length;
          return (
            <div key={cat} className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
                <div className="text-sm font-semibold">{cat}</div>
                <span className="text-xs text-muted-foreground tabular-nums">{catDone}/{list.length}</span>
              </div>
              <div className="divide-y divide-border/60">
                {list.map((i) => {
                  const M = statusMeta[i.status];
                  return (
                    <div key={i.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-accent/30 gap-3">
                      <button onClick={() => cycleStatus(i.id)} className={cn("col-span-1", M.tint)} title={M.label}>
                        <M.icon className="h-5 w-5" />
                      </button>
                      <div className="col-span-6 min-w-0">
                        <div className={cn("text-sm font-medium truncate", i.status === "done" && "text-muted-foreground line-through")}>{i.title}</div>
                        <div className={cn("text-[11px] mt-0.5", M.tint)}>{M.label}</div>
                      </div>
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-accent text-[10px] font-semibold shrink-0">{i.ownerInitials}</div>
                        <div className="text-xs text-muted-foreground truncate">{i.owner}</div>
                      </div>
                      <div className="col-span-2 text-end text-xs text-muted-foreground tabular-nums">{i.due}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

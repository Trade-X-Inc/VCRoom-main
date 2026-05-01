import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/diligence")({
  component: Diligence,
});

function Diligence() {
  const { data: items = [] } = useQuery({
    queryKey: ["due-diligence"],
    queryFn: async () => {
      const { data, error } = await supabase.from("due_diligence_items").select("id, section, status").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const sections = Object.entries(
    items.reduce<Record<string, { label: string; done: boolean }[]>>((acc, item) => {
      const key = item.section || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push({ label: item.section || "Item", done: String(item.status).toLowerCase().includes("done") });
      return acc;
    }, {}),
  ).map(([t, list]) => ({ t, items: list.map((i) => [i.label, i.done] as [string, boolean]) }));
  const total = sections.flatMap((s) => s.items).length;
  const doneCount = sections.flatMap((s) => s.items).filter(([, done]) => done).length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Due Diligence</h1>
      <div className="text-sm text-muted-foreground">Atlas Robotics · Series A · Lead</div>

      <div className="mt-6 rounded-xl border border-border/60 bg-card p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Overall progress</div>
          <div className="text-sm tabular-nums">{progress}%</div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-brand" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {doneCount} done</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-warning" /> {Math.max(0, total - doneCount)} open</span>
          <span className="inline-flex items-center gap-1.5"><Circle className="h-3.5 w-3.5" /> {total} total</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {sections.map((s) => {
          const done = s.items.filter(([_, d]) => d).length;
          return (
            <div key={s.t} className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                <div className="text-sm font-semibold">{s.t}</div>
                <div className="text-xs text-muted-foreground">{done}/{s.items.length}</div>
              </div>
              <div className="divide-y divide-border/60">
                {s.items.map(([label, done]) => (
                  <div key={label as string} className="flex items-center gap-3 px-5 py-3">
                    {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

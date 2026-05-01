import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Pause } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/decisions")({
  component: Decisions,
});

function Decisions() {
  const { data: decisions = [] } = useQuery({
    queryKey: ["decisions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("decisions").select("id, status, notes").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const cols = {
    accept: decisions.filter((d) => String(d.status).toLowerCase() === "accept"),
    hold: decisions.filter((d) => String(d.status).toLowerCase() === "hold"),
    pass: decisions.filter((d) => String(d.status).toLowerCase() === "pass"),
  };
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Decision Board</h1>
      <div className="text-sm text-muted-foreground">Partnership-wide decisions, in one view.</div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {[
          { t: "Accept", c: "success", i: Check, items: cols.accept },
          { t: "Hold", c: "warning", i: Pause, items: cols.hold },
          { t: "Pass", c: "destructive", i: X, items: cols.pass },
        ].map((col: any) => (
          <div key={col.t} className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
            <div className={`px-5 py-3 border-b border-border/60 flex items-center gap-2 bg-${col.c}/5`}>
              <col.i className={`h-4 w-4 text-${col.c}`} />
              <span className="text-sm font-semibold">{col.t}</span>
              <span className="text-xs text-muted-foreground ml-auto">{col.items.length}</span>
            </div>
            <div className="p-3 space-y-2">
              {col.items.map((item: any) => (
                <div key={item.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="text-sm font-medium">Decision {item.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">{item.notes || "No notes"}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

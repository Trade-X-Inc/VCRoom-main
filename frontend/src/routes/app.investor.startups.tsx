import { createFileRoute } from "@tanstack/react-router";
import { Building2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/startups")({
  component: StartupsPage,
});

function StartupsPage() {
  const { data: startups = [] } = useQuery({
    queryKey: ["startups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startups")
        .select("id, company_name, stage, sector, revenue, team_size")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Startups</h1>
      <div className="text-sm text-muted-foreground">Profiles of every company in your pipeline.</div>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {startups.map((c: any) => (
          <div key={c.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold">{(c.company_name || "S")[0]}</div>
              <div className="flex-1">
                <div className="font-semibold">{c.company_name}</div>
                <div className="text-xs text-muted-foreground">{c.sector || "General"} · {c.stage || "Stage unknown"}</div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60">
              <div><div className="text-xs text-muted-foreground">Revenue</div><div className="text-sm font-medium">${Number(c.revenue || 0).toLocaleString()}</div></div>
              <div><div className="text-xs text-muted-foreground">Stage</div><div className="text-sm font-medium">{c.stage || "-"}</div></div>
              <div><div className="text-xs text-muted-foreground">Team</div><div className="text-sm font-medium">{c.team_size || 0}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

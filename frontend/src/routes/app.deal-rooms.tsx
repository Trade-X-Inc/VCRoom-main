import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/app/deal-rooms")({
  component: DealRooms,
});

function DealRooms() {
  const { data: rooms = [] } = useQuery({
    queryKey: ["deal-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("id, status, startups(company_name), organizations(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
          <div className="text-sm text-muted-foreground">{rooms.length} active rooms</div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Briefcase className="h-4 w-4" /> New deal room</button>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {rooms.map((r: any) => (
          <Link to={"/app/deal-room/$id" as any} params={{ id: r.id } as any} key={r.id} className="rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-soft border border-border/60 text-xs font-semibold">{(r.organizations?.name || "VC").split(" ").map((s: string) => s[0]).join("").slice(0,2)}</div>
                <div>
                  <div className="font-semibold">{r.organizations?.name || "Investor org"}</div>
                  <div className="text-xs text-muted-foreground">{r.startups?.company_name || "Startup"}</div>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 ${r.status === "closed" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>{r.status}</span>
              <span className="text-muted-foreground">Deal room</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">ID: {r.id.slice(0, 8)}</span>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{r.status === "new" ? "15%" : "65%"}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-brand" style={{ width: r.status === "new" ? "15%" : "65%" }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

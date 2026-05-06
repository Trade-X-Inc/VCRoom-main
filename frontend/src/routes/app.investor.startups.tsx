import { createFileRoute } from "@tanstack/react-router";
import { Building2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/startups")({
  component: StartupsPage,
});

function StartupsPage() {
  const { user } = useAuth();

  // Join: startups via deal_rooms that this investor is a member of
  const { data: startups = [] } = useQuery({
    queryKey: ["investor-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(
          "deal_room_id, deal_rooms(id, updated_at, status, startups(id, company_name, stage, sector, revenue, team_size))",
        )
        .eq("user_id", user!.id)
        .order("deal_rooms.updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          dealRoomId: r.deal_room_id,
          dealStatus: r.deal_rooms?.status,
          ...(r.deal_rooms?.startups ?? {}),
        }))
        .filter((s: any) => !!s.id);
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Startups</h1>
        <div className="text-sm text-muted-foreground">Companies in your deal flow</div>
      </div>

      {startups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No startups yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            You'll see companies here when founders invite you to their deal room.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {startups.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold">
                  {(c.company_name || "S")[0]}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.sector || "General"} · {c.stage || "Stage unknown"}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60">
                <div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="text-sm font-medium">${Number(c.revenue || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Stage</div>
                  <div className="text-sm font-medium">{c.stage || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Team</div>
                  <div className="text-sm font-medium">{c.team_size || 0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

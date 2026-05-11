import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, ExternalLink, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/investor/startups")({
  component: StartupsPage,
});

function StartupsPage() {
  const { user } = useAuth();

  const { data: startups = [], isLoading, isError } = useQuery({
    queryKey: ["investor-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(id, company_name, stage, sector, funding_target, revenue, team_size, tagline)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          dealRoomId: r.deal_room_id,
          dealStatus: r.deal_rooms?.status,
          updatedAt: r.deal_rooms?.updated_at,
          ...(r.deal_rooms?.startups ?? {}),
        }))
        .filter((s: any) => !!s.id)
        .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-muted/60 animate-pulse" />
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="rounded-2xl border border-border/60 bg-card h-44 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Startups</h1>
        <div className="text-sm text-muted-foreground">
          {startups.length} compan{startups.length !== 1 ? "ies" : "y"} in your deal flow
        </div>
      </div>

      {isError ? (
        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
          Could not load data. Please refresh.
        </div>
      ) : startups.length === 0 ? (
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
            <Link
              key={c.id}
              to="/app/deal-room/$id"
              params={{ id: c.dealRoomId }}
              className="block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
                  {(c.company_name || "S")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate group-hover:text-brand transition-colors">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.sector || "General"} · {c.stage || "Stage unknown"}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {c.tagline && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-1">{c.tagline}</p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60">
                <div>
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="text-sm font-medium">{c.revenue || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ask</div>
                  <div className="text-sm font-medium">{c.funding_target || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Team</div>
                  <div className="text-sm font-medium">{c.team_size || "—"}</div>
                </div>
              </div>
              {c.updatedAt && (
                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

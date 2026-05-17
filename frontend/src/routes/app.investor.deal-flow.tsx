import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, Search, Clock, Plus, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/investor/deal-flow")({
  component: DealFlowPage,
});

function DealFlowPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [addingWatchlist, setAddingWatchlist] = useState<string | null>(null);

  const handleAddToWatchlist = async (dealRoomId: string, company: string) => {
    if (!user?.id) return;
    setAddingWatchlist(dealRoomId);
    try {
      const { error } = await supabase.from("investor_watchlist").insert({
        investor_id: user.id,
        company_name: company,
        source: "deal_flow",
        status: "watching",
      });
      if (error) throw error;
      toast.success(`${company} added to watchlist`);
      queryClient.invalidateQueries({ queryKey: ["investor-watchlist-count", user.id] });
    } catch {
      toast.error("Failed to add to watchlist");
    } finally {
      setAddingWatchlist(null);
    }
  };

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-deal-flow", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(company_name, sector, stage, funding_target, description, tagline)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          id: r.deal_room_id,
          updatedAt: r.deal_rooms?.updated_at,
          status: r.deal_rooms?.status,
          company: r.deal_rooms?.startups?.company_name ?? "Unnamed",
          sector: r.deal_rooms?.startups?.sector,
          stage: r.deal_rooms?.startups?.stage,
          fundingTarget: r.deal_rooms?.startups?.funding_target,
          blurb: r.deal_rooms?.startups?.tagline || r.deal_rooms?.startups?.description,
        }))
        .filter((r) => !!r.id)
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  const filtered = q
    ? rooms.filter((r) =>
        r.company.toLowerCase().includes(q.toLowerCase()) ||
        (r.sector ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : rooms;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Flow</h1>
          <div className="text-sm text-muted-foreground">
            Deal rooms you've been invited to appear here automatically
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company or sector…"
            className="w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card h-44 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
            Could not load data. Please refresh.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No deals yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              {q ? "No deals match your search." : "Deal rooms will appear here when founders invite you to their data room."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <div key={room.id} className="rounded-2xl border border-border/60 bg-card hover:shadow-card transition-shadow group flex flex-col">
                <Link
                  to="/app/deal-room/$id"
                  params={{ id: room.id }}
                  className="flex-1 block p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-sm font-semibold shrink-0">
                      {room.company[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate group-hover:text-brand transition-colors">{room.company}</div>
                      <div className="text-xs text-muted-foreground">
                        {room.sector || "General"} · {room.stage || "Stage TBD"}
                      </div>
                    </div>
                  </div>
                  {room.blurb && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{room.blurb}</p>
                  )}
                </Link>
                <div className="px-5 pb-4 flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-xs font-medium text-brand">
                    {room.fundingTarget || "Target TBD"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {room.updatedAt
                        ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })
                        : "—"}
                    </span>
                    <button
                      onClick={() => handleAddToWatchlist(room.id, room.company)}
                      disabled={addingWatchlist === room.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[10px] hover:bg-accent disabled:opacity-50"
                    >
                      {addingWatchlist === room.id
                        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        : <Plus className="h-2.5 w-2.5" />}
                      Watchlist
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

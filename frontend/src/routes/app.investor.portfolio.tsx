import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PieChart, TrendingUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { EmptyState, PageBreadcrumb } from "@/components/system";

export const Route = createFileRoute("/app/investor/portfolio")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/deal-rooms/portfolio" as any, replace: true });
  },
  component: PortfolioPage,
});

export function PortfolioPage() {
  const { user } = useAuth();

  // Fetch room IDs user is member of
  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids-portfolio", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];

  // Fetch rooms where latest decision is an "invest/accept/term_sheet" status
  const { data: invested = [], isLoading, isError } = useQuery({
    queryKey: ["portfolio-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decisions")
        .select(`
          id, status, created_at, deal_room_id,
          deal_rooms(
            id, updated_at,
            startups(company_name, sector, stage)
          )
        `)
        .in("deal_room_id", roomIds)
        .in("status", ["accept", "invest", "term_sheet"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Dedupe by deal_room_id (keep latest decision per room)
      const seen = new Set<string>();
      return (data ?? [])
        .filter((d: any) => {
          if (seen.has(d.deal_room_id)) return false;
          seen.add(d.deal_room_id);
          return true;
        })
        .map((d: any) => ({
          id: d.deal_room_id,
          decisionId: d.id,
          status: d.status,
          decisionAt: d.created_at,
          updatedAt: d.deal_rooms?.updated_at,
          company: d.deal_rooms?.startups?.company_name ?? "Unnamed",
          sector: d.deal_rooms?.startups?.sector,
          stage: d.deal_rooms?.startups?.stage,
        }));
    },
  });

  // Watchlist companies with status = 'Invested'
  const { data: watchlistInvested = [] } = useQuery({
    queryKey: ["portfolio-watchlist-invested", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("*")
        .eq("investor_id", user!.id)
        .eq("status", "Invested");
      return data ?? [];
    },
  });

  const statusLabel: Record<string, string> = {
    accept: "Invested",
    invest: "Invested",
    term_sheet: "Term Sheet",
  };

  return (
    <div className="p-6 lg:p-8">
      <PageBreadcrumb items={[{ label: "Deal flow", to: "/app/investor/decide" }, { label: "Portfolio" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <div className="text-sm text-muted-foreground">Companies you've committed to invest in</div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          ["Portfolio companies", `${invested.length + watchlistInvested.length}`],
          ["Term sheets signed", `${invested.filter((i) => i.status === "term_sheet").length}`],
          ["Investments closed", `${invested.filter((i) => ["accept", "invest"].includes(i.status)).length + watchlistInvested.length}`],
          ["Avg ticket", "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <EmptyState kind="loading" title="Loading" />
        ) : isError ? (
          <EmptyState
            kind="error"
            title="Something went wrong"
            action={{ label: "Try again", onClick: () => window.location.reload() }}
          />
        ) : invested.length === 0 && watchlistInvested.length === 0 ? (
          <EmptyState kind="empty" title="No portfolio companies" />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invested.map((c) => (
              <Link
                key={c.id}
                to="/app/deal-rooms/$id"
                params={{ id: c.id }}
                className="block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
                    {c.company[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate group-hover:text-brand transition-colors">{c.company}</div>
                    <div className="text-xs text-muted-foreground">{c.sector || "—"} · {c.stage || "—"}</div>
                  </div>
                  <span className="text-[10px] font-medium rounded-full bg-success/10 text-success px-2 py-0.5 shrink-0">
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </div>
                {c.decisionAt && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border/60 pt-3">
                    <Clock className="h-2.5 w-2.5" />
                    Decision {formatDistanceToNow(new Date(c.decisionAt), { addSuffix: true })}
                  </div>
                )}
              </Link>
            ))}
            {watchlistInvested.map((c: any) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0">
                    {(c.company_name ?? "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground">{c.sector || "—"} · {c.stage || "—"}</div>
                  </div>
                  <span className="text-[10px] font-medium rounded-full bg-success/10 text-success px-2 py-0.5 shrink-0">
                    Invested
                  </span>
                </div>
                {c.website && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    {c.website}
                  </div>
                )}
                {c.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
                {c.created_at && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border/60 pt-3">
                    <Clock className="h-2.5 w-2.5" />
                    Added {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

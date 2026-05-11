import { createFileRoute, Link } from "@tanstack/react-router";
import { PieChart, TrendingUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/investor/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
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
          id, status, created_at, deal_room_id, notes,
          deal_rooms(
            id, updated_at,
            startups(company_name, sector, stage, funding_target, revenue, traction)
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
          notes: d.notes,
          decisionAt: d.created_at,
          updatedAt: d.deal_rooms?.updated_at,
          company: d.deal_rooms?.startups?.company_name ?? "Unnamed",
          sector: d.deal_rooms?.startups?.sector,
          stage: d.deal_rooms?.startups?.stage,
          fundingTarget: d.deal_rooms?.startups?.funding_target,
          revenue: d.deal_rooms?.startups?.revenue,
          traction: d.deal_rooms?.startups?.traction,
        }));
    },
  });

  const statusLabel: Record<string, string> = {
    accept: "Invested",
    invest: "Invested",
    term_sheet: "Term Sheet",
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <div className="text-sm text-muted-foreground">Companies you've committed to invest in</div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          ["Portfolio companies", `${invested.length}`],
          ["Term sheets signed", `${invested.filter((i) => i.status === "term_sheet").length}`],
          ["Investments closed", `${invested.filter((i) => ["accept", "invest"].includes(i.status)).length}`],
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl border border-border/60 bg-card h-48 animate-pulse" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
            Could not load data. Please refresh.
          </div>
        ) : invested.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No portfolio companies yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Companies appear here after you mark a deal as Invested in the Decision Board.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invested.map((c) => (
              <Link
                key={c.id}
                to="/app/deal-room/$id"
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
                {(c.revenue || c.traction) && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                    {c.revenue || c.traction}
                  </div>
                )}
                {c.fundingTarget && (
                  <div className="mt-1 text-xs text-brand font-medium">{c.fundingTarget}</div>
                )}
                {c.notes && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
                {c.decisionAt && (
                  <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border/60 pt-3">
                    <Clock className="h-2.5 w-2.5" />
                    Decision {formatDistanceToNow(new Date(c.decisionAt), { addSuffix: true })}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

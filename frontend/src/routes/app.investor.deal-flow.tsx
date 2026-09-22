import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, Search, Clock, Plus, Loader2, ArrowRight, List, LayoutGrid } from "lucide-react";
import { PageGuide } from "@/components/app/PageGuide";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { LcsEmptyState, LcsButton } from "@/components/lcs";

export const Route = createFileRoute("/app/investor/deal-flow")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/discover/deal-flow" as any, replace: true });
  },
  component: DealFlowPage,
});

export function DealFlowPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [addingWatchlist, setAddingWatchlist] = useState<string | null>(null);
  // R14 — table is the default; a VC scans more rooms per screen in a
  // table than a 2-3 col card grid. Cards stay available via the toggle.
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const handleAddToWatchlist = async (dealRoomId: string, company: string) => {
    if (!user?.id) return;
    setAddingWatchlist(dealRoomId);
    try {
      const { error } = await supabase.from("investor_watchlist").insert({
        investor_id: user.id,
        company_name: company,
        source: "deal_flow",
        status: "Watching",
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
            id, updated_at, status, startup_id, investor_company, investor_name,
            startups(company_name, sector, stage, funding_target, description, tagline)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => {
          const dr = r.deal_rooms;
          const companyName =
            dr?.startups?.company_name ||
            dr?.investor_company ||
            (dr?.investor_name ? `Deal with ${dr.investor_name}` : null) ||
            "Unnamed";
          return {
          id: r.deal_room_id,
          updatedAt: dr?.updated_at,
          status: dr?.status,
          startupId: dr?.startup_id ?? null,
          company: companyName,
          sector: dr?.startups?.sector,
          stage: dr?.startups?.stage,
          fundingTarget: dr?.startups?.funding_target,
          blurb: dr?.startups?.tagline || dr?.startups?.description,
        };
        })
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
        <PageGuide pageId="investor-deal-flow" />
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
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => setViewMode("table")}
            title="Table view"
            className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            title="Card view"
            className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <LcsEmptyState
            title="Something went wrong"
            text="Deal flow could not load."
            action={
              <LcsButton variant="secondary" onClick={() => window.location.reload()}>
                Try again
              </LcsButton>
            }
          />
        ) : filtered.length === 0 ? (
          <LcsEmptyState
            title={q ? "No matches" : "No deals"}
            text={q ? "No deals match your search." : "Deals you track appear here."}
          />
        ) : viewMode === "table" ? (
          <div style={{ overflowX: "auto", border: `1px solid var(--lcs-line)` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid var(--lcs-line)` }}>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Company</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Sector</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Stage</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "right", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Target</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "right", fontSize: 11, fontWeight: 500, color: "var(--lcs-ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Updated</th>
                  <th style={{ padding: "0 16px", height: 36 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => (
                  <tr
                    key={room.id}
                    onClick={() => navigate({ to: "/app/deal-rooms/$id", params: { id: room.id } })}
                    role="button"
                    tabIndex={0}
                    aria-label={`${room.company || "Deal room"} — open deal room`}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate({ to: "/app/deal-rooms/$id", params: { id: room.id } }); } }}
                    style={{ height: 44, borderBottom: "1px solid var(--lcs-line)", cursor: "pointer" }}
                    className="hover:bg-accent/30 transition-colors"
                  >
                    <td style={{ padding: "0 16px", fontSize: 13, fontWeight: 600, color: "var(--lcs-ink)" }}>{room.company}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: "var(--lcs-ink-muted)" }}>{room.sector || "—"}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: "var(--lcs-ink-muted)" }}>{room.stage || "—"}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: "var(--lcs-ink)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{room.fundingTarget || "—"}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: "var(--lcs-ink-muted)", textAlign: "right", whiteSpace: "nowrap" }}>
                      {room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true }) : "—"}
                    </td>
                    <td style={{ padding: "0 16px", textAlign: "right" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToWatchlist(room.id, room.company); }}
                        disabled={addingWatchlist === room.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[11px] hover:bg-accent disabled:opacity-50"
                      >
                        {addingWatchlist === room.id
                          ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          : <Plus className="h-2.5 w-2.5" />}
                        Watchlist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <div key={room.id} className="rounded-2xl border border-border/60 bg-card hover:shadow-card transition-shadow group flex flex-col">
                <Link
                  to="/app/deal-rooms/$id"
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
                    <button
                      onClick={(e) => { e.stopPropagation(); void navigate({ to: "/app/deal-rooms/$id", params: { id: room.id } }); }}
                      className="inline-flex items-center gap-1 rounded-md bg-accent text-brand px-2 py-0.5 text-[10px] font-medium hover:bg-accent"
                    >
                      Open <ArrowRight className="h-2.5 w-2.5" />
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

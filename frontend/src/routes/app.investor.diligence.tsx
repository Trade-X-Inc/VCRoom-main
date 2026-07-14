import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getDDSummaryForInvestor } from "@/lib/dd-fn";
import {
  CheckCircle2, ClipboardCheck, Loader2, ArrowRight, Building2, ExternalLink,
} from "lucide-react";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/investor/diligence")({
  // P5: consolidated into the deal-flow steps — old links keep resolving.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/evaluate", hash: "diligence", replace: true });
  },
  component: DiligencePage,
});

export function DiligencePage() {
  const { user } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dd-summary", user?.id],
    enabled: !!user?.id,
    queryFn: () => getDDSummaryForInvestor({ data: { userId: user!.id } }),
  });

  // Watchlist entries in Diligence status that have no deal room
  const { data: watchlistDiligence = [], isLoading: watchlistLoading } = useQuery({
    queryKey: ["watchlist-diligence-no-room", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get all deal room startup_ids so we can exclude them
      const { data: memberships } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(startup_id)")
        .eq("user_id", user!.id);

      const roomStartupIds = new Set(
        (memberships ?? []).flatMap((m: any) =>
          m.deal_rooms ? [m.deal_rooms.startup_id] : []
        )
      );

      // Get investor's watchlist in Diligence status
      const { data: entries } = await supabase
        .from("investor_watchlist")
        .select("id, company_name, website, sector, stage, source, created_at")
        .eq("investor_id", user!.id)
        .eq("status", "Diligence");

      // Only include ones not matched to a real deal room startup
      // (watchlist has no FK to startups, so we can only filter by manual matching — return all for now)
      return (entries ?? []).filter((e: any) => !roomStartupIds.has(e.id));
    },
  });

  const isLoading = summaryLoading || watchlistLoading;
  const dealRooms = summary?.dealRooms ?? [];

  if (isLoading) {
    return <EmptyState kind="loading" title="Loading" />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Due Diligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Checklist progress across all deal rooms you have access to
        </p>
      </div>

      {/* Deal rooms with real DD progress */}
      {dealRooms.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active deal rooms
          </h2>
          {dealRooms.map((room) => {
            const pct = room.total > 0 ? Math.round((room.checked / room.total) * 100) : null;
            return (
              <div
                key={room.id}
                className="rounded-xl border border-border/60 bg-card flex flex-col sm:flex-row sm:items-center gap-4 p-5"
              >
                {/* Company info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    {room.logoUrl
                      ? <img src={room.logoUrl} alt={room.companyName} className="h-8 w-8 rounded object-contain" />
                      : <Building2 className="h-4 w-4" style={{ color: "#A855F7" }} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{room.companyName}</div>
                    {(room.stage || room.sector) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {[room.stage, room.sector].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="flex-1 min-w-0 max-w-xs">
                  {pct !== null ? (
                    <>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">{room.checked}/{room.total} items</span>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? "#10B981" : "var(--gradient-brand)",
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No checklist items</span>
                  )}
                </div>

                {/* Action */}
                <Link
                  to="/app/deal-room/$id"
                  params={{ id: room.id }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-colors"
                  style={{ background: "rgba(124,58,237,0.1)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  Open DD <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState kind="empty" title="No deal rooms" />
      )}

      {/* Watchlist entries in Diligence with no deal room */}
      {watchlistDiligence.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              In diligence — not yet in a deal room
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              These companies are marked Diligence in your watchlist but have not opened a deal room with you yet.
            </p>
          </div>
          {watchlistDiligence.map((entry: any) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border/60 bg-card flex items-center gap-4 p-5"
            >
              <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{entry.company_name}</div>
                {(entry.sector || entry.stage) && (
                  <div className="text-xs text-muted-foreground truncate">
                    {[entry.stage, entry.sector].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <span className="text-xs px-2 py-1 rounded-full shrink-0"
                style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                Awaiting deal room
              </span>
              {entry.website && (
                <a
                  href={entry.website.startsWith("http") ? entry.website : `https://${entry.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {dealRooms.length === 0 && watchlistDiligence.length === 0 && !isLoading && (
        <EmptyState kind="empty" title="Nothing in diligence" />
      )}
    </div>
  );
}

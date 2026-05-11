import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Clock, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/investor/deal-rooms")({
  component: DealRoomsPage,
});

const STATUS_TO_LABEL: Record<string, { label: string; cls: string }> = {
  under_review:   { label: "Reviewing",   cls: "bg-brand/10 text-brand" },
  info_requested: { label: "Diligence",   cls: "bg-warning/10 text-warning" },
  partner_review: { label: "Partner",     cls: "bg-violet/10 text-violet" },
  term_sheet:     { label: "Term Sheet",  cls: "bg-success/10 text-success" },
  rejected:       { label: "Rejected",    cls: "bg-destructive/10 text-destructive" },
  exited:         { label: "Exited",      cls: "bg-muted text-muted-foreground" },
};

function DealRoomsPage() {
  const { user } = useAuth();

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-deal-rooms-list", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, created_at, status,
            startups(company_name, sector, stage, funding_target, tagline)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          id: r.deal_room_id,
          updatedAt: r.deal_rooms?.updated_at,
          createdAt: r.deal_rooms?.created_at,
          status: r.deal_rooms?.status,
          company: r.deal_rooms?.startups?.company_name ?? "Unnamed",
          sector: r.deal_rooms?.startups?.sector,
          stage: r.deal_rooms?.startups?.stage,
          fundingTarget: r.deal_rooms?.startups?.funding_target,
          tagline: r.deal_rooms?.startups?.tagline,
        }))
        .filter((r) => !!r.id)
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
        <div className="text-sm text-muted-foreground">
          {rooms.length} active data room{rooms.length !== 1 ? "s" : ""} you've been invited to
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card h-48 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
            Could not load data. Please refresh.
          </div>
        ) : rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No active deal rooms</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Founders' deal room invitations appear here once you've been accepted.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const statusInfo = STATUS_TO_LABEL[room.status ?? ""] ?? { label: "New", cls: "bg-muted text-muted-foreground" };
              const daysSinceActivity = room.updatedAt
                ? Math.floor((Date.now() - new Date(room.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const isStale = daysSinceActivity !== null && daysSinceActivity > 7;

              return (
                <Link
                  key={room.id}
                  to="/app/deal-room/$id"
                  params={{ id: room.id }}
                  className="block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold text-sm shrink-0">
                        {room.company[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate group-hover:text-brand transition-colors">{room.company}</div>
                        <div className="text-xs text-muted-foreground">{room.sector || "—"} · {room.stage || "Stage TBD"}</div>
                      </div>
                    </div>
                    <span className={cn("shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5", statusInfo.cls)}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {room.tagline && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{room.tagline}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {room.fundingTarget || "Target TBD"}
                      </span>
                    </div>
                    <div className={cn("flex items-center gap-1 text-xs", isStale ? "text-warning" : "text-muted-foreground")}>
                      <Clock className="h-3 w-3" />
                      {room.updatedAt
                        ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })
                        : "—"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Clock, Shield, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState, PageBreadcrumb } from "@/components/system";

export const Route = createFileRoute("/app/investor/deal-rooms")({
  component: DealRoomsPage,
});

const STATUS_TO_LABEL: Record<string, { label: string; cls: string }> = {
  under_review:   { label: "Reviewing",   cls: "bg-accent text-brand" },
  info_requested: { label: "Diligence",   cls: "bg-warning/10 text-warning" },
  partner_review: { label: "Partner",     cls: "bg-violet/10 text-violet" },
  term_sheet:     { label: "Term Sheet",  cls: "bg-success/10 text-success" },
  rejected:       { label: "Rejected",    cls: "bg-destructive/10 text-destructive" },
  exited:         { label: "Exited",      cls: "bg-muted text-muted-foreground" },
};

const STAGE_TO_LABEL: Record<string, { label: string; cls: string }> = {
  information_vault: { label: "Info Vault",  cls: "bg-muted text-muted-foreground" },
  qa:                { label: "Q&A",         cls: "bg-accent text-brand" },
  due_diligence:     { label: "Diligence",   cls: "bg-warning/10 text-warning" },
  term_sheet:        { label: "Term Sheet",  cls: "bg-success/10 text-success" },
  closing:           { label: "Closing",     cls: "bg-success/10 text-success" },
};

export function DealRoomsPage() {
  const { user } = useAuth();

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-deal-rooms-list", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Pull via deal_room_members membership
      const [membersRes, directRes] = await Promise.all([
        supabase
          .from("deal_room_members")
          .select(`deal_room_id, deal_rooms(id, updated_at, created_at, status, workflow_stage, investor_email, startups(company_name, sector, stage, funding_target, tagline))`)
          .eq("user_id", user!.id),
        // Also pull deal rooms where investor_user_id = current user
        supabase
          .from("deal_rooms")
          .select("id, updated_at, created_at, status, workflow_stage, investor_email, startups(company_name, sector, stage, funding_target, tagline)")
          .eq("investor_user_id", user!.id),
      ]);

      const seen = new Set<string>();
      const rows: any[] = [];

      for (const r of membersRes.data ?? []) {
        const dr = r.deal_rooms as any;
        if (!dr?.id || seen.has(dr.id)) continue;
        seen.add(dr.id);
        rows.push({ id: dr.id, updatedAt: dr.updated_at, createdAt: dr.created_at, status: dr.status, workflowStage: dr.workflow_stage, company: dr.startups?.company_name ?? "Unnamed", sector: dr.startups?.sector, stage: dr.startups?.stage, fundingTarget: dr.startups?.funding_target, tagline: dr.startups?.tagline });
      }

      for (const dr of directRes.data ?? []) {
        if (!dr.id || seen.has(dr.id)) continue;
        seen.add(dr.id);
        rows.push({ id: dr.id, updatedAt: dr.updated_at, createdAt: dr.created_at, status: dr.status, workflowStage: (dr as any).workflow_stage, company: (dr as any).startups?.company_name ?? "Unnamed", sector: (dr as any).startups?.sector, stage: (dr as any).startups?.stage, fundingTarget: (dr as any).startups?.funding_target, tagline: (dr as any).startups?.tagline });
      }

      return rows.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageBreadcrumb items={[{ label: "Deal flow", to: "/app/investor/evaluate" }, { label: "Deal rooms" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
        <div className="text-sm text-muted-foreground">
          {rooms.length} active data room{rooms.length !== 1 ? "s" : ""} you've been invited to
        </div>
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
        ) : rooms.length === 0 ? (
          <EmptyState
            kind="empty"
            title="No deal rooms"
            action={{ label: "Browse startups", href: "/app/investor/startups" }}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const stageInfo = STAGE_TO_LABEL[(room as any).workflowStage ?? ""] ?? { label: "Open", cls: "bg-muted text-muted-foreground" };
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
                  data-testid={`deal-room-card-${room.id}`}
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
                    <span className={cn("shrink-0 text-[10px] font-semibold rounded-full px-2.5 py-0.5", stageInfo.cls)}>
                      {stageInfo.label}
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Kanban, List, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/investor/pipeline")({
  component: PipelinePage,
});

const DB_STATUS_TO_STAGE: Record<string, string> = {
  under_review: "Reviewing",
  info_requested: "Diligence",
  partner_review: "Partner",
  term_sheet: "Term Sheet",
  rejected: "Closed",
  exited: "Closed",
  accept: "Term Sheet",
  invest: "Term Sheet",
  pass: "Closed",
  hold: "Reviewing",
};

const STAGES: { k: string; color: string; dot: string }[] = [
  { k: "Sourced",    color: "bg-muted/60",        dot: "bg-muted-foreground" },
  { k: "Reviewing",  color: "bg-brand/5",          dot: "bg-brand" },
  { k: "Diligence",  color: "bg-warning/5",        dot: "bg-warning" },
  { k: "Partner",    color: "bg-violet/5",         dot: "bg-violet" },
  { k: "Term Sheet", color: "bg-success/5",        dot: "bg-success" },
  { k: "Closed",     color: "bg-destructive/5",    dot: "bg-destructive" },
];

function PipelinePage() {
  const { user } = useAuth();
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-pipeline", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(company_name, sector, stage, funding_target)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => ({
          id: r.deal_room_id,
          updatedAt: r.deal_rooms?.updated_at,
          dbStatus: r.deal_rooms?.status,
          company: r.deal_rooms?.startups?.company_name ?? "Unnamed",
          sector: r.deal_rooms?.startups?.sector,
          startupStage: r.deal_rooms?.startups?.stage,
          fundingTarget: r.deal_rooms?.startups?.funding_target,
          pipelineStage: DB_STATUS_TO_STAGE[r.deal_rooms?.status ?? ""] ?? "Sourced",
        }))
        .filter((r) => !!r.id)
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  const byStage = Object.fromEntries(STAGES.map((s) => [s.k, rooms.filter((r) => r.pipelineStage === s.k)]));

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-muted/60 animate-pulse" />
        <div className="mt-6 flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[280px] h-64 rounded-2xl border border-border/60 bg-card animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
          Could not load data. Please refresh.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Pipeline</h1>
          <div className="text-sm text-muted-foreground">
            {rooms.length} deal{rooms.length !== 1 ? "s" : ""} across {STAGES.length} stages
          </div>
        </div>
        <div className="inline-flex rounded-[10px] border border-border/60 p-0.5 bg-card">
          <button
            onClick={() => setView("kanban")}
            className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md", view === "kanban" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            <Kanban className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            onClick={() => setView("list")}
            className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md", view === "list" ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="mt-6 -mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((s) => {
              const cards = byStage[s.k] ?? [];
              return (
                <div key={s.k} className="w-[280px] shrink-0">
                  <div className="px-1 mb-3 flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    <div className="text-xs font-semibold">{s.k}</div>
                    <span className="text-xs text-muted-foreground ml-auto">{cards.length}</span>
                  </div>
                  <div className={cn("rounded-2xl border border-border/60 min-h-[200px] p-2 space-y-2", s.color)}>
                    {cards.length === 0 ? (
                      <div className="grid place-items-center h-[160px] text-xs text-muted-foreground/60">
                        No deals here
                      </div>
                    ) : (
                      cards.map((room) => (
                        <Link
                          key={room.id}
                          to="/app/deal-room/$id"
                          params={{ id: room.id }}
                          className="block rounded-xl border border-border/60 bg-card p-3 hover:shadow-card transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold shrink-0">
                              {room.company[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{room.company}</div>
                              <div className="text-[10px] text-muted-foreground">{room.sector || "—"}</div>
                            </div>
                          </div>
                          {room.fundingTarget && (
                            <div className="mt-2 text-[11px] text-brand font-medium">{room.fundingTarget}</div>
                          )}
                          {room.updatedAt && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })}
                            </div>
                          )}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
            <div className="col-span-4">Company</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-2">Pipeline</div>
            <div className="col-span-2">Ask</div>
            <div className="col-span-2">Last activity</div>
          </div>
          {rooms.length === 0 ? (
            <div className="px-5 py-12 text-sm text-muted-foreground text-center">No deals in your pipeline yet.</div>
          ) : (
            rooms.map((room) => {
              const stageInfo = STAGES.find((s) => s.k === room.pipelineStage);
              return (
                <Link
                  key={room.id}
                  to="/app/deal-room/$id"
                  params={{ id: room.id }}
                  className="grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm"
                >
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[11px] font-semibold shrink-0">
                      {room.company[0]}
                    </div>
                    <div>
                      <div className="font-medium">{room.company}</div>
                      <div className="text-xs text-muted-foreground">{room.sector || "—"}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">{room.startupStage || "—"}</div>
                  <div className="col-span-2">
                    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", stageInfo?.dot)} />
                      {room.pipelineStage}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">{room.fundingTarget || "—"}</div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true }) : "—"}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

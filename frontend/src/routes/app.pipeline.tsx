import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Plus, Flame, Clock, ArrowUpRight, Filter, Users, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/pipeline")({
  component: Pipeline,
});

// ── Types ──────────────────────────────────────────────────────────

type PipelineStage = "Sourced" | "Qualified" | "Pitched" | "Diligence" | "Term Sheet" | "Closed";

const pipelineStages: PipelineStage[] = ["Sourced", "Qualified", "Pitched", "Diligence", "Term Sheet", "Closed"];

interface PipelineDeal {
  id: string;
  firm: string;
  partner: string;
  initials: string;
  check: string;
  stage: PipelineStage;
  probability: number;
  lastTouch: string;
  signal?: "hot" | "stale";
  thesis: string;
}

type RawLead = {
  id: string;
  investor_name: string;
  firm_name: string | null;
  ticket_size: string | null;
  status: string;
  sector: string | null;
  updated_at: string;
  follow_up_date: string | null;
};

// ── Mappings ───────────────────────────────────────────────────────

const STATUS_TO_STAGE: Record<string, PipelineStage> = {
  "New": "Sourced",
  "Shortlisted": "Sourced",
  "Contacted": "Qualified",
  "Replied": "Qualified",
  "Follow Up": "Qualified",
  "Meeting Booked": "Pitched",
  "Interested": "Diligence",
  "Deal Room Created": "Term Sheet",
  "Rejected": "Closed",
};

const STAGE_TO_STATUS: Record<PipelineStage, string | null> = {
  "Sourced": "New",
  "Qualified": "Contacted",
  "Pitched": "Meeting Booked",
  "Diligence": "Interested",
  "Term Sheet": "Deal Room Created",
  "Closed": null,
};

const STAGE_PROBABILITY: Record<PipelineStage, number> = {
  "Sourced": 10,
  "Qualified": 25,
  "Pitched": 40,
  "Diligence": 60,
  "Term Sheet": 80,
  "Closed": 100,
};

const stageTint: Record<PipelineStage, string> = {
  "Sourced": "bg-muted-foreground/40",
  "Qualified": "bg-foreground/40",
  "Pitched": "bg-brand",
  "Diligence": "bg-violet",
  "Term Sheet": "bg-warning",
  "Closed": "bg-success",
};

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function leadToDeal(lead: RawLead): PipelineDeal {
  const stage = STATUS_TO_STAGE[lead.status] ?? "Sourced";
  const name = lead.investor_name ?? "";
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  let signal: "hot" | "stale" | undefined;
  if (lead.follow_up_date) {
    const fup = new Date(lead.follow_up_date + "T12:00:00");
    if (fup <= new Date()) signal = "hot";
  }

  return {
    id: lead.id,
    firm: lead.firm_name ?? "—",
    partner: lead.investor_name,
    initials,
    check: lead.ticket_size ?? "—",
    stage,
    probability: STAGE_PROBABILITY[stage],
    lastTouch: timeAgo(lead.updated_at),
    signal,
    thesis: lead.sector ?? "—",
  };
}

// ── Component ──────────────────────────────────────────────────────

function Pipeline() {
  const { t } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);

  const { data: rawLeads = [], isLoading } = useQuery<RawLead[]>({
    queryKey: ["pipeline-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vc_leads")
        .select("id, investor_name, firm_name, ticket_size, status, sector, updated_at, follow_up_date")
        .eq("founder_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RawLead[];
    },
  });

  const deals = useMemo(() => rawLeads.map(leadToDeal), [rawLeads]);

  const byStage = useMemo(() => {
    const m: Record<PipelineStage, PipelineDeal[]> = {
      Sourced: [], Qualified: [], Pitched: [], Diligence: [], "Term Sheet": [], Closed: [],
    };
    deals.forEach((d) => m[d.stage].push(d));
    return m;
  }, [deals]);

  const totalValue = (xs: PipelineDeal[]) =>
    xs.reduce((sum, d) => {
      const n = parseFloat(d.check.replace(/[^0-9.]/g, "")) || 0;
      return sum + n;
    }, 0);

  const onDrop = async (stage: PipelineStage) => {
    if (!dragId || !user?.id) return;
    const newStatus = STAGE_TO_STATUS[stage];
    setDragId(null);
    setOverStage(null);
    if (!newStatus) return;

    queryClient.setQueryData<RawLead[]>(
      ["pipeline-leads", user.id],
      (old) => (old ?? []).map((l) => l.id === dragId ? { ...l, status: newStatus } : l),
    );

    await supabase
      .from("vc_leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", dragId)
      .eq("founder_id", user.id);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("pipeline.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("pipeline.subtitle")}</p>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-base font-medium">Your pipeline is empty.</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add VC leads to see them appear here. Leads are mapped to pipeline stages based on their status.
          </p>
          <Link
            to="/app/leads"
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add VC leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("pipeline.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("pipeline.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total deals", String(deals.length), "across pipeline"],
          ["Pipeline value", `$${totalValue(deals).toFixed(0)}M`, "uncommitted"],
          ["Hot deals", String(deals.filter((d) => d.signal === "hot").length), "need follow-up"],
          ["Closed", `$${totalValue(byStage.Closed).toFixed(0)}M`, "this quarter"],
        ].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
            <div className="text-[11px] text-muted-foreground">{s}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="mt-6 grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-3 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const items = byStage[stage];
          const isOver = overStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => onDrop(stage)}
              className={cn(
                "flex flex-col rounded-xl border bg-muted/30 transition-colors min-h-[400px]",
                isOver ? "border-brand bg-brand/5" : "border-border/60",
              )}
            >
              <div className="px-3 py-2.5 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", stageTint[stage])} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{stage}</span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  ${totalValue(items).toFixed(0)}M
                </span>
              </div>
              <div className="flex-1 p-2 space-y-2">
                {items.map((d) => (
                  <DealCard key={d.id} deal={d} onDragStart={() => setDragId(d.id)} />
                ))}
                {items.length === 0 && (
                  <div className="py-8 text-center text-[11px] text-muted-foreground">Drop deals here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({ deal, onDragStart }: { deal: PipelineDeal; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-card hover:border-brand/40 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[10px] font-semibold shrink-0">
            {deal.initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{deal.firm}</div>
            <div className="text-[11px] text-muted-foreground truncate">{deal.partner}</div>
          </div>
        </div>
        {deal.signal === "hot" && <Flame className="h-3.5 w-3.5 text-warning shrink-0" />}
        {deal.signal === "stale" && <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{deal.thesis}</div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs font-medium tabular-nums">{deal.check}</span>
        <span className="text-[10px] text-muted-foreground">{deal.lastTouch}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-brand" style={{ width: `${deal.probability}%` }} />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">{deal.probability}%</span>
      </div>
      <button className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        Open <ArrowUpRight className="h-3 w-3" />
      </button>
    </div>
  );
}

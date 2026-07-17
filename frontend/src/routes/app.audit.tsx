import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, UserPlus, ArrowLeftRight, Filter, Download,
  TrendingUp, CheckCircle2, XCircle, FileText, Paperclip,
  Pencil, Users, Loader2, ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAccountContext } from "@/hooks/useAccountContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/audit")({
  // R9: folded into Settings as the Activity tab — old URL redirects there.
  beforeLoad: () => {
    throw redirect({ to: "/app/settings/activity" as any, replace: true });
  },
});

export { AuditPage };

// ── Types ──────────────────────────────────────────────────────────

interface LogRow {
  id: string;
  account_type: "investor" | "founder";
  account_id: string;
  actor_user_id: string;
  actor_name: string;
  action_type: string;
  target_label: string;
  detail: string;
  created_at: string;
}

// ── Action type config ─────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; category: string }> = {
  team_member_added:      { icon: UserPlus,       label: "Team member added",   color: "text-success bg-success/10",            category: "Team" },
  deal_room_assigned:     { icon: ArrowLeftRight,  label: "Deal room assigned",  color: "text-brand bg-accent",                category: "Deal rooms" },
  pipeline_status_changed:{ icon: TrendingUp,      label: "Status changed",      color: "text-warning bg-warning/10",            category: "Pipeline" },
  invite_sent:            { icon: Users,            label: "Invite sent",         color: "text-brand bg-accent",                category: "Connections" },
  connection_approved:    { icon: CheckCircle2,     label: "Connection approved", color: "text-success bg-success/10",            category: "Connections" },
  connection_rejected:    { icon: XCircle,          label: "Connection declined", color: "text-destructive bg-destructive/10",    category: "Connections" },
  document_uploaded:      { icon: FileText,         label: "Document uploaded",   color: "text-brand bg-accent",                category: "Documents" },
  claim_proof_attached:   { icon: Paperclip,        label: "Proof attached",      color: "text-success bg-success/10",            category: "Documents" },
  profile_edited:         { icon: Pencil,           label: "Profile updated",     color: "text-muted-foreground bg-muted",        category: "Profile" },
  decision_recorded:      { icon: CheckCircle2,     label: "Decision recorded",   color: "text-success bg-success/10",            category: "Decisions" },
};

const CATEGORIES = ["All", "Team", "Deal rooms", "Pipeline", "Connections", "Documents", "Profile", "Decisions"] as const;

// ── Page ───────────────────────────────────────────────────────────

function AuditPage() {
  const { user } = useAuth();
  const ctx = useAccountContext();
  const [category, setCategory] = useState<string>("All");
  const [actorFilter, setActorFilter] = useState<string>("All");

  // Prefer investor profile ID, then startup ID, then user ID as account_id
  const accountId = ctx.investorProfileId ?? ctx.startupId ?? user?.id ?? "";

  const { data: logs = [], isLoading } = useQuery<LogRow[]>({
    queryKey: ["activity-log", accountId],
    enabled: !!accountId && !ctx.loading,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
  });

  const actorNames = useMemo(() => {
    const names = Array.from(new Set(logs.map((l) => l.actor_name).filter(Boolean)));
    return ["All", ...names];
  }, [logs]);

  const filtered = useMemo(() => {
    let xs = logs;
    if (category !== "All") {
      xs = xs.filter((l) => ACTION_CONFIG[l.action_type]?.category === category);
    }
    if (actorFilter !== "All") {
      xs = xs.filter((l) => l.actor_name === actorFilter);
    }
    return xs;
  }, [logs, category, actorFilter]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5 text-brand" />
            <h1 className="text-lg font-bold tracking-tight">Activity log</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Actions taken across your workspace — team, pipeline, documents, connections.
          </p>
        </div>
        <button
          onClick={() => {
            if (!filtered.length) return;
            const csv = [
              "Time,Actor,Action,Target,Detail",
              ...filtered.map((l) => [
                new Date(l.created_at).toISOString(),
                l.actor_name,
                ACTION_CONFIG[l.action_type]?.label ?? l.action_type,
                l.target_label,
                l.detail,
              ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
            ].join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            a.download = "activity_log.csv";
            a.click();
          }}
          disabled={!filtered.length}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                category === c
                  ? "bg-foreground text-background font-medium"
                  : "border border-border/60 text-muted-foreground hover:bg-accent",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        {actorNames.length > 2 && (
          <div className="relative ml-auto">
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="appearance-none rounded-md border border-border/60 bg-background pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-brand/50 cursor-pointer"
            >
              {actorNames.map((n) => <option key={n}>{n}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>

      {/* Log list */}
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : filtered.length === 0 ? (
        <EmptyState
          kind={logs.length === 0 ? "empty" : "no-results"}
          title={logs.length === 0 ? "No activity" : "No matches"}
        />
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-card">
          <div className="divide-y divide-border/60">
            {filtered.map((log) => {
              const cfg = ACTION_CONFIG[log.action_type] ?? {
                icon: Activity,
                label: log.action_type,
                color: "text-muted-foreground bg-muted",
                category: "Other",
              };
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-3.5 px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className={cn("grid h-8 w-8 place-items-center rounded-lg shrink-0 mt-0.5", cfg.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-medium">{log.actor_name}</span>
                      <span className="text-sm text-muted-foreground">{log.detail}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {log.target_label && (
                        <span className="text-xs text-muted-foreground/70">{log.target_label}</span>
                      )}
                      {log.target_label && <span className="text-muted-foreground/30 text-xs">·</span>}
                      <span className="text-[11px] text-muted-foreground/50">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground border border-border/60 rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap">
                    {cfg.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground pb-4">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""} · most recent 200 shown
        </p>
      )}
    </div>
  );
}

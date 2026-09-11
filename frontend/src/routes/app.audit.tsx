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
import { formatDistanceToNow } from "date-fns";
import { LcsButton, LcsEmptyState } from "@/components/lcs";

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
// Icon glyph unchanged; color now a single semantic status token per
// entry (--lcs-satisfied for a positive/completed action, --lcs-attention
// for a negative one, --lcs-accent for a neutral system action,
// --lcs-ink-muted for a plain edit) rather than the old per-category
// mixed-hue palette — matching LCS's "exactly four status colours"
// discipline (CLAUDE.md §0 amendment) instead of a decorative per-type
// color scheme.

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; tone: string; category: string }> = {
  team_member_added:      { icon: UserPlus,       label: "Team member added",   tone: "var(--lcs-satisfied)", category: "Team" },
  deal_room_assigned:     { icon: ArrowLeftRight,  label: "Deal room assigned",  tone: "var(--lcs-accent)",    category: "Deal rooms" },
  pipeline_status_changed:{ icon: TrendingUp,      label: "Status changed",      tone: "var(--lcs-attention)", category: "Pipeline" },
  invite_sent:            { icon: Users,            label: "Invite sent",         tone: "var(--lcs-accent)",    category: "Connections" },
  connection_approved:    { icon: CheckCircle2,     label: "Connection approved", tone: "var(--lcs-satisfied)", category: "Connections" },
  connection_rejected:    { icon: XCircle,          label: "Connection declined", tone: "var(--lcs-attention)", category: "Connections" },
  document_uploaded:      { icon: FileText,         label: "Document uploaded",   tone: "var(--lcs-accent)",    category: "Documents" },
  claim_proof_attached:   { icon: Paperclip,        label: "Proof attached",      tone: "var(--lcs-satisfied)", category: "Documents" },
  profile_edited:         { icon: Pencil,           label: "Profile updated",     tone: "var(--lcs-ink-muted)", category: "Profile" },
  decision_recorded:      { icon: CheckCircle2,     label: "Decision recorded",   tone: "var(--lcs-satisfied)", category: "Decisions" },
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="h-5 w-5" style={{ color: "var(--lcs-accent)" }} />
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Activity log</h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            Actions taken across your workspace — team, pipeline, documents, connections.
          </p>
        </div>
        <LcsButton
          variant="secondary"
          disabled={!filtered.length}
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
        >
          <Download className="h-4 w-4" /> Export CSV
        </LcsButton>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                background: category === c ? "var(--lcs-accent)" : "transparent",
                color: category === c ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
                border: category === c ? "1px solid var(--lcs-accent)" : "1px solid var(--lcs-line)",
              }}
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
              className="appearance-none pl-3 pr-8 py-1.5 text-xs cursor-pointer"
              style={{ fontFamily: "var(--font-lcs-ui)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)" }}
            >
              {actorNames.map((n) => <option key={n}>{n}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color: "var(--lcs-ink-muted)" }} />
          </div>
        )}
      </div>

      {/* Log list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <LcsEmptyState
          title={logs.length === 0 ? "No activity" : "No matches"}
          text={logs.length === 0 ? "Actions taken across your workspace will appear here." : "No activity matches the selected filters."}
        />
      ) : (
        <div className="border" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="flex flex-col">
            {filtered.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action_type] ?? {
                icon: Activity,
                label: log.action_type,
                tone: "var(--lcs-ink-muted)",
                category: "Other",
              };
              const Icon = cfg.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3.5 px-5 py-4"
                  style={{ borderTop: i > 0 ? "1px solid var(--lcs-line)" : undefined }}
                >
                  <div className="grid h-8 w-8 place-items-center shrink-0 mt-0.5" style={{ background: "var(--lcs-surface)", color: cfg.tone }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 flex-wrap" style={{ fontFamily: "var(--font-lcs-ui)" }}>
                      <span className="text-sm font-medium" style={{ color: "var(--lcs-ink)" }}>{log.actor_name}</span>
                      <span className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>{log.detail}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5" style={{ fontFamily: "var(--font-lcs-ui)" }}>
                      {log.target_label && (
                        <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{log.target_label}</span>
                      )}
                      {log.target_label && <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>·</span>}
                      <span className="text-[11px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 shrink-0 whitespace-nowrap"
                    style={{ color: "var(--lcs-ink-muted)", border: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-ui)" }}
                  >
                    {cfg.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-center text-xs pb-4" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          {filtered.length} event{filtered.length !== 1 ? "s" : ""} · most recent 200 shown
        </p>
      )}
    </div>
  );
}

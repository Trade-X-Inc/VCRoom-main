import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, RefreshCw, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { ChecklistGap } from "@/lib/profile-checklist-fn";

interface ChecklistRow {
  id: string;
  readiness_score: number | null;
  overall_readiness: string | null;
  summary: string | null;
  gaps: ChecklistGap[] | null;
  strengths: string[] | null;
  generated_at: string;
}

const URGENCY_DOT: Record<string, string> = {
  critical: "#EF4444",
  important: "#F59E0B",
  nice_to_have: "var(--faint)",
};

const READINESS_LABEL: Record<string, string> = {
  not_ready: "Not ready yet",
  early: "Early",
  approaching: "Approaching ready",
  investor_ready: "Investor ready",
};

// Category → the place in the app that fixes it
const FIX_LINKS: Record<string, { to: string; label: string }> = {
  financials: { to: "/app/documents", label: "Upload financial model" },
  documents: { to: "/app/documents", label: "Upload documents" },
  traction: { to: "/app/profile", label: "Add your traction" },
  product: { to: "/app/profile", label: "Update your profile" },
  market: { to: "/app/profile", label: "Update your profile" },
  team: { to: "/app/profile", label: "Add team details" },
  legal: { to: "/app/advisor", label: "Run verification" },
};

function scoreColor(score: number): string {
  if (score > 70) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

export function ProfileChecklist({
  startupId,
  compact = false,
  canRegenerate = true,
}: {
  startupId: string;
  compact?: boolean;
  canRegenerate?: boolean;
}) {
  const qc = useQueryClient();
  const [showStrengths, setShowStrengths] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { data: checklist } = useQuery<ChecklistRow | null>({
    queryKey: ["profile-checklist", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_checklists")
        .select("id, readiness_score, overall_readiness, summary, gaps, strengths, generated_at")
        .eq("startup_id", startupId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as ChecklistRow) ?? null;
    },
  });

  const regenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const { generateFounderChecklist } = await import("@/lib/profile-checklist-fn");
      const result = await generateFounderChecklist({
        data: { userAccessToken: session.access_token, startupId },
      });
      if (result.ok) {
        toast.success("Readiness analysis updated");
        qc.invalidateQueries({ queryKey: ["profile-checklist", startupId] });
      } else {
        toast.error("Analysis failed — try again in a moment.");
      }
    } catch (e) {
      console.error("[checklist] regenerate failed:", e);
      toast.error("Analysis failed — try again in a moment.");
    } finally {
      setRegenerating(false);
    }
  };

  if (!checklist) {
    if (compact) return null;
    return (
      <div className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-brand" />
            <div>
              <div className="text-sm font-semibold">Fundraising readiness</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Save your profile or upload a document and the AI reviews your file like an investor would.
              </div>
            </div>
          </div>
          {canRegenerate && (
            <button
              onClick={regenerate}
              disabled={regenerating}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
            >
              <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
              {regenerating ? "Analysing…" : "Analyse my profile"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const score = checklist.readiness_score ?? 0;
  const gaps = checklist.gaps ?? [];
  const strengths = checklist.strengths ?? [];
  const shownGaps = compact ? gaps.slice(0, 3) : gaps;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold shrink-0"
            style={{ background: `${scoreColor(score)}1f`, color: scoreColor(score), border: `2px solid ${scoreColor(score)}55` }}
          >
            {score}
          </div>
          <div>
            <div className="text-sm font-semibold">
              Fundraising readiness · {score}/100
            </div>
            <div className="text-xs mt-0.5" style={{ color: scoreColor(score) }}>
              {READINESS_LABEL[checklist.overall_readiness ?? ""] ?? checklist.overall_readiness}
            </div>
          </div>
        </div>
      </div>

      {/* Honest summary */}
      {checklist.summary && (
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{checklist.summary}</p>
      )}

      {/* Strengths — collapsed by default */}
      {!compact && strengths.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowStrengths((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            What's working ({strengths.length})
            {showStrengths ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showStrengths && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {strengths.map((st) => (
                <span key={st} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>
                  {st}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Gaps */}
      <div className="mt-4 space-y-2.5">
        {shownGaps.map((gap) => {
          const fix = FIX_LINKS[gap.category] ?? FIX_LINKS.product;
          return (
            <div key={gap.gap_id} className="rounded-lg border border-border/60 bg-background p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: URGENCY_DOT[gap.urgency] ?? URGENCY_DOT.nice_to_have }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm font-medium">{gap.title}</div>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground shrink-0">
                      {gap.category}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{gap.why_it_matters}</div>
                  {!compact && (
                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs text-foreground/80">{gap.how_to_fix}</div>
                      <Link
                        to={fix.to as any}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline shrink-0"
                      >
                        {fix.label} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {gaps.length === 0 && (
          <div className="text-xs text-muted-foreground">No significant gaps found — keep your numbers current.</div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Last updated {formatDistanceToNow(new Date(checklist.generated_at), { addSuffix: true })}</span>
        {canRegenerate && (
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Analysing…" : "Re-analyse"}
          </button>
        )}
      </div>
    </div>
  );
}

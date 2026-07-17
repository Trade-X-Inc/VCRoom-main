import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Prepare › Badges › Apply Badge. Minimal page wrapping the existing
// evaluateAndAwardBadges() engine; no new evaluation logic.
export const Route = createFileRoute("/app/prepare/badges/apply")({
  component: FounderApplyBadgePage,
});

export function FounderApplyBadgePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [evaluating, setEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState<{ awarded: string[]; unchanged: string[] } | null>(null);

  const { data: startup, isLoading } = useQuery({
    queryKey: ["apply-badge-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const runEvaluation = async () => {
    if (!startup?.id || evaluating) return;
    setEvaluating(true);
    try {
      const { evaluateAndAwardBadges } = await import("@/lib/badge-award-engine");
      const result = await evaluateAndAwardBadges({ data: { startup_id: startup.id } });
      qc.invalidateQueries({ queryKey: ["profile-badges", startup.id] });
      qc.invalidateQueries({ queryKey: ["badge-progress", startup.id] });
      setLastResult({ awarded: result.awarded, unchanged: result.unchanged });
      if (result.awarded.length > 0) toast.success(`Newly earned: ${result.awarded.join(", ").replace(/_/g, " ")}`);
      else toast.info("No new badges — check Badge Overview for progress toward each.");
    } catch {
      toast.error("Evaluation failed — try again.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <PageFrame
      breadcrumb={[{ label: "Prepare" }, { label: "Badges" }, { label: "Apply Badge" }]}
      title="Apply Badge"
      description="Re-check your profile against every badge's criteria and award any you now qualify for."
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : !startup?.id ? (
        <EmptyState kind="empty" title="Build your profile first" />
      ) : (
        <div className="rounded-none border border-border/60 bg-card p-6 max-w-lg">
          <button
            onClick={runEvaluation}
            disabled={evaluating}
            className="inline-flex items-center gap-2 rounded-md hs-gradient text-brand-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Check for new badges
          </button>

          {lastResult && (
            <div className="mt-4 text-sm">
              {lastResult.awarded.length > 0 ? (
                <div className="flex items-center gap-2 text-[#10B981]">
                  <CheckCircle2 className="h-4 w-4" />
                  Awarded: {lastResult.awarded.join(", ").replace(/_/g, " ")}
                </div>
              ) : (
                <div className="text-muted-foreground">No new badges awarded this run.</div>
              )}
            </div>
          )}
        </div>
      )}
    </PageFrame>
  );
}

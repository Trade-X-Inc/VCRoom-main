/**
 * BadgesSection — the founder's own badge panel: earned badges, locked badges
 * with the specific criteria to earn them, and a manual evaluation trigger.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { BadgeDisplay, useBadges } from "@/components/app/BadgeDisplay";

export function BadgesSection({ startupId, compact = false }: { startupId: string; compact?: boolean }) {
  const qc = useQueryClient();
  const [evaluating, setEvaluating] = useState(false);
  const { data: earned = [] } = useBadges({ startupId });

  const { data: defs = [] } = useQuery({
    queryKey: ["badge-definitions"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("badge_definitions")
        .select("id, category, label, description, icon, color, requires_payment, payment_amount_usd, auto_awarded, sort_order")
        .order("sort_order");
      return data ?? [];
    },
  });

  const earnedIds = new Set(earned.map((b) => b.badge_type));
  const locked = defs.filter(
    (d: any) => !earnedIds.has(d.id) && d.category !== "investor",
  );

  const runEvaluation = async () => {
    if (evaluating) return;
    setEvaluating(true);
    try {
      const { evaluateAndAwardBadges } = await import("@/lib/badge-award-engine");
      const result = await evaluateAndAwardBadges({ data: { startup_id: startupId } });
      qc.invalidateQueries({ queryKey: ["profile-badges", startupId] });
      if (result.awarded.length > 0) {
        toast.success(`Newly earned: ${result.awarded.join(", ").replace(/_/g, " ")}`);
      } else {
        toast.info("No new badges — see the criteria below for what each one takes.");
      }
    } catch {
      toast.error("Evaluation failed — try again.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-none p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>Your badges</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Earned through specific, verifiable actions — never for using the platform a lot.{" "}
            <Link to={"/app/badges" as any} className="text-brand hover:underline">How to earn more →</Link>
          </div>
        </div>
        <button
          onClick={runEvaluation}
          disabled={evaluating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
        >
          {evaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Run badge evaluation
        </button>
      </div>

      {earned.length > 0 ? (
        <BadgeDisplay badges={earned} size="md" context="profile" />
      ) : (
        <div className="text-xs text-muted-foreground">
          No badges — <Link to={"/app/prepare" as any} hash="verification" className="text-brand hover:underline">run identity check</Link>
        </div>
      )}

      {!compact && locked.length > 0 && (
        <div className="border-t border-border/60 pt-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Locked
          </div>
          <div className="space-y-1.5">
            {locked.map((d: any) => (
              <div key={d.id} className="flex items-start gap-2 text-xs">
                <Lock className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/50" />
                <div className="min-w-0">
                  <span className="text-muted-foreground font-medium">{d.label}</span>
                  <span className="text-muted-foreground/60"> — {d.description}</span>
                  {d.requires_payment && (
                    <span className="text-muted-foreground/60"> (${d.payment_amount_usd} participation fee)</span>
                  )}
                  {!d.auto_awarded && !d.requires_payment && (
                    <span className="text-muted-foreground/60"> (awarded manually)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

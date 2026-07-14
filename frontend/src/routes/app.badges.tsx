import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Award, ChevronDown, Lock, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { BadgeDisplay, useBadges } from "@/components/app/BadgeDisplay";

export const Route = createFileRoute("/app/badges")({
  // P4: consolidated into /app/prepare — old links must keep resolving.
  beforeLoad: () => {
    throw redirect({ to: "/app/prepare", hash: "badges", replace: true });
  },
  component: BadgesPage,
});

// ── Live progress for the measurable badges ───────────────────────────────────

function useBadgeProgress(startupId: string | undefined) {
  return useQuery({
    queryKey: ["badge-progress", startupId],
    enabled: !!startupId,
    staleTime: 60_000,
    queryFn: async () => {
      const [verifRes, claimsRes, docsRes, templatesRes, roomsRes] = await Promise.all([
        supabase.from("founder_verifications")
          .select("tier1_passed,tier1_email_match,tier1_website_match,tier1_registry_match,tier1_infra_match,operational_bank_verified,operational_contract_verified,operational_team_verified")
          .eq("startup_id", startupId!).maybeSingle(),
        supabase.from("startup_claims").select("ai_verdict,claim_category").eq("startup_id", startupId!),
        supabase.from("founder_documents").select("template_id,status").eq("startup_id", startupId!).neq("status", "empty"),
        supabase.from("document_templates").select("id,category"),
        supabase.from("deal_rooms").select("id").eq("startup_id", startupId!),
      ]);
      const v = verifRes.data;
      const claims = claimsRes.data ?? [];
      const verified = claims.filter((c) => c.ai_verdict === "verified");
      const catById = new Map((templatesRes.data ?? []).map((t) => [t.id, t.category]));
      const docCats = new Set((docsRes.data ?? []).map((d) => catById.get(d.template_id)).filter(Boolean));
      const required = ["market", "financials", "team", "product", "legal"];

      return {
        tier1Passed: v?.tier1_passed === true,
        tier1Checks: [v?.tier1_email_match, v?.tier1_website_match, v?.tier1_registry_match, v?.tier1_infra_match].filter(Boolean).length,
        verifiedClaims: verified.length,
        verifiedFinancial: verified.filter((c) => c.claim_category === "financial").length,
        docCategories: required.filter((c) => docCats.has(c)).length,
        opDocs: [v?.operational_bank_verified, v?.operational_contract_verified, v?.operational_team_verified].filter(Boolean).length,
        dealRooms: (roomsRes.data ?? []).length,
      };
    },
  });
}

function ProgressBar({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const done = current >= target;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-56 shrink-0 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? "#10B981" : "var(--gradient-brand)" }} />
      </div>
      <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: done ? "#10B981" : "var(--color-muted-foreground)" }}>
        {current}/{target}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BadgesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [evaluating, setEvaluating] = useState(false);
  const [philosophyOpen, setPhilosophyOpen] = useState(false);

  const { data: startup } = useQuery({
    queryKey: ["badges-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: earned = [] } = useBadges({ startupId: startup?.id });
  const { data: progress } = useBadgeProgress(startup?.id);

  const { data: defs = [] } = useQuery({
    queryKey: ["badge-definitions"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("badge_definitions")
        .select("*")
        .order("sort_order");
      return data ?? [];
    },
  });

  const earnedIds = new Set(earned.map((b) => b.badge_type));
  const founderDefs = defs.filter((d: any) => d.category !== "investor");
  const available = founderDefs.filter((d: any) => !earnedIds.has(d.id) && d.auto_awarded && !d.requires_payment);
  const locked = founderDefs.filter((d: any) => !earnedIds.has(d.id) && (!d.auto_awarded || d.requires_payment));

  const runEvaluation = async () => {
    if (!startup?.id || evaluating) return;
    setEvaluating(true);
    try {
      const { evaluateAndAwardBadges } = await import("@/lib/badge-award-engine");
      const result = await evaluateAndAwardBadges({ data: { startup_id: startup.id } });
      qc.invalidateQueries({ queryKey: ["profile-badges", startup.id] });
      qc.invalidateQueries({ queryKey: ["badge-progress", startup.id] });
      if (result.awarded.length > 0) toast.success(`Newly earned: ${result.awarded.join(", ").replace(/_/g, " ")}`);
      else toast.info("No new badges — progress toward each is shown below.");
    } catch {
      toast.error("Evaluation failed — try again.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Badges</h1>
              <div className="text-xs text-muted-foreground">
                Trust signals earned through specific, verifiable actions.
              </div>
            </div>
          </div>
          <button
            onClick={runEvaluation}
            disabled={evaluating || !startup?.id}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
          >
            {evaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Run evaluation
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl space-y-5">

        {/* Identity gate notice */}
        {progress && !progress.tier1Passed && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <span className="font-medium" style={{ color: "#F59E0B" }}>No badge without confirmed identity.</span>{" "}
            <span className="text-muted-foreground">
              All badges — including readiness — require the Tier 1 identity check first ({progress.tier1Checks}/4 checks passing).{" "}
              <Link to={"/app/advisor" as any} className="text-brand hover:underline">Run the identity check →</Link>
            </span>
          </div>
        )}

        {/* Earned */}
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <div className="text-sm font-semibold mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
            Earned ({earned.length})
          </div>
          {earned.length > 0 ? (
            <BadgeDisplay badges={earned} size="lg" showCategory context="profile" />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing yet — every badge below lists exactly what it takes.</p>
          )}
        </div>

        {/* Progress */}
        {progress && (
          <div className="bg-card border border-border/60 rounded-xl p-5 space-y-2.5">
            <div className="text-sm font-semibold mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Progress</div>
            <ProgressBar label="Identity checks (Identity Confirmed)" current={progress.tier1Checks} target={4} />
            <ProgressBar label="Verified claims (Claims Verified)" current={progress.verifiedClaims} target={3} />
            <ProgressBar label="— of which financial" current={progress.verifiedFinancial} target={1} />
            <ProgressBar label="Document categories (Fully Documented)" current={progress.docCategories} target={5} />
            <ProgressBar label="Operational documents (Operationally Verified)" current={progress.opDocs} target={3} />
          </div>
        )}

        {/* Available */}
        {available.length > 0 && (
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <div className="text-sm font-semibold mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
              Available — earned automatically when the criteria are met
            </div>
            <div className="space-y-2.5">
              {available.map((d: any) => (
                <div key={d.id} className="flex items-start gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/40" />
                  <div>
                    <span className="font-medium text-foreground">{d.label}</span>
                    <span className="text-muted-foreground"> — {d.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked (payment or admin) */}
        {locked.length > 0 && (
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <div className="text-sm font-semibold mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
              Locked — payment or review required
            </div>
            <div className="space-y-2.5">
              {locked.map((d: any) => (
                <div key={d.id} className="flex items-start gap-2.5 text-sm">
                  <Lock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/40" />
                  <div>
                    <span className="font-medium text-foreground">{d.label}</span>
                    <span className="text-muted-foreground"> — {d.description}</span>
                    <span className="text-muted-foreground/60">
                      {d.requires_payment
                        ? ` Requires the $${d.payment_amount_usd} Roast participation fee — the badge itself is earned, never bought.`
                        : " Awarded manually after review."}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Philosophy */}
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <button
            onClick={() => setPhilosophyOpen((o) => !o)}
            className="flex w-full items-center justify-between text-sm font-semibold"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            How badges work
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${philosophyOpen ? "rotate-180" : ""}`} />
          </button>
          {philosophyOpen && (
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                Hockystick badges are earned through specific, verifiable actions. Each badge has a
                single honest definition — the sentence an investor reads when they ask "what does
                this mean?" — and that definition is the whole truth of it.
              </p>
              <p>
                We do not award badges for profile completion, account age, or activity volume. No
                badge means "used the platform a lot." And no badge of any kind is awarded before
                identity is confirmed: a company we could not verify gets no trust signals from us.
              </p>
              <p>
                Badges are never bought. The Roast has a participation fee, but its badge is earned
                by completing the challenge — paying and failing earns nothing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

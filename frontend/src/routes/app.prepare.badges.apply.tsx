import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2, CheckCircle2, Lock, Flame, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";
import { useBadges } from "@/components/app/BadgeDisplay";
import { color, font, radius } from "@/lib/design-tokens";

// R13 — Apply Badge rebuild. app.badges.tsx (Overview) already lists every
// badge with earned/available/locked classification and honest per-type
// copy; this page is the ACTIONABLE complement — every badge gets its own
// row with the correct trigger for its type, not one generic "check
// everything" button.
export const Route = createFileRoute("/app/prepare/badges/apply")({
  component: FounderApplyBadgePage,
});

type BadgeDef = {
  id: string;
  label: string;
  description: string;
  requires_payment: boolean | null;
  payment_amount_usd: number | null;
  auto_awarded: boolean | null;
  sort_order: number | null;
};

function StatusChip({ kind }: { kind: "earned" | "locked" | "manual" | "payment" }) {
  const cfg = {
    earned: { bg: "rgba(16,185,129,0.1)", text: "#059669", label: "Earned" },
    locked: { bg: "rgba(113,113,122,0.1)", text: color.inkTertiary, label: "Locked" },
    manual: { bg: "rgba(113,113,122,0.1)", text: color.inkTertiary, label: "Manually awarded" },
    payment: { bg: "rgba(124,58,237,0.08)", text: "#7C3AED", label: "Requires payment" },
  }[kind];
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        fontWeight: 500,
        color: cfg.text,
        background: cfg.bg,
        borderRadius: radius.control,
        padding: "2px 8px",
      }}
    >
      {cfg.label}
    </span>
  );
}

function BadgeRow({
  def, earned, onCheck, checking,
}: {
  def: BadgeDef;
  earned: boolean;
  onCheck: () => void;
  checking: boolean;
}) {
  const isManualOnly = !def.auto_awarded && !def.requires_payment;
  const isPaymentGated = !!def.requires_payment;
  const isAutoCheckable = !!def.auto_awarded;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 0",
        borderTop: `1px solid ${color.border}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: color.ink }}>{def.label}</span>
          {earned ? (
            <StatusChip kind="earned" />
          ) : isPaymentGated ? (
            <StatusChip kind="payment" />
          ) : isManualOnly ? (
            <StatusChip kind="manual" />
          ) : (
            <StatusChip kind="locked" />
          )}
        </div>
        <div style={{ fontSize: 13, color: color.inkSecondary, marginTop: 4, lineHeight: 1.5, maxWidth: 560 }}>
          {def.description}
        </div>
        {isPaymentGated && !earned && (
          <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4 }}>
            ${def.payment_amount_usd} Roast participation fee — the badge itself is earned, never bought.
          </div>
        )}
        {isManualOnly && !earned && (
          <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4 }}>
            No self-serve action — awarded manually by the Hockystick team after review.
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0 }}>
        {earned ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#059669", fontSize: 12, fontWeight: 500 }}>
            <CheckCircle2 style={{ width: 14, height: 14 }} />
            Earned
          </div>
        ) : def.id === "identity_confirmed" ? (
          <Link
            to={"/app/verification" as any}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
              fontSize: 12, fontWeight: 500, color: "#fff", background: "#7C3AED",
              borderRadius: radius.control, textDecoration: "none",
            }}
          >
            <UserCheck style={{ width: 13, height: 13 }} />
            Run identity check
          </Link>
        ) : def.id === "roast_survivor" ? (
          <Link
            to={"/app/prepare/badges/founder-roast" as any}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
              fontSize: 12, fontWeight: 500, color: "#fff", background: "#7C3AED",
              borderRadius: radius.control, textDecoration: "none",
            }}
          >
            <Flame style={{ width: 13, height: 13 }} />
            Go to Founder Roast
          </Link>
        ) : isManualOnly ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: color.inkTertiary, fontSize: 12 }}>
            <Lock style={{ width: 13, height: 13 }} />
            No action available
          </div>
        ) : isAutoCheckable ? (
          <button
            type="button"
            onClick={onCheck}
            disabled={checking}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
              fontSize: 12, fontWeight: 500, color: color.ink, background: color.white,
              border: `1px solid ${color.border}`, borderRadius: radius.control,
              cursor: checking ? "default" : "pointer", opacity: checking ? 0.6 : 1,
            }}
          >
            {checking ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <RefreshCw style={{ width: 13, height: 13 }} />}
            Check now
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FounderApplyBadgePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [evaluating, setEvaluating] = useState(false);

  const { data: startup, isLoading: loadingStartup } = useQuery({
    queryKey: ["apply-badge-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: defs = [], isLoading: loadingDefs } = useQuery<BadgeDef[]>({
    queryKey: ["badge-definitions"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("badge_definitions")
        .select("id, label, description, requires_payment, payment_amount_usd, auto_awarded, sort_order")
        .neq("category", "investor")
        .order("sort_order");
      return (data ?? []) as BadgeDef[];
    },
  });

  const { data: earned = [] } = useBadges({ startupId: startup?.id });
  const earnedIds = new Set(earned.map((b) => b.badge_type));

  const runEvaluation = async () => {
    if (!startup?.id || evaluating) return;
    setEvaluating(true);
    try {
      const { evaluateAndAwardBadges } = await import("@/lib/badge-award-engine");
      const result = await evaluateAndAwardBadges({ data: { startup_id: startup.id } });
      qc.invalidateQueries({ queryKey: ["profile-badges", startup.id] });
      qc.invalidateQueries({ queryKey: ["badge-progress", startup.id] });
      if (result.awarded.length > 0) toast.success(`Newly earned: ${result.awarded.join(", ").replace(/_/g, " ")}`);
      else toast.info("No new badges — check each row's criteria above.");
    } catch {
      toast.error("Evaluation failed — try again.");
    } finally {
      setEvaluating(false);
    }
  };

  const loading = loadingStartup || loadingDefs;

  return (
    <PageFrame
      breadcrumb={[{ label: "Prepare" }, { label: "Badges" }, { label: "Apply Badge" }]}
      title="Apply Badge"
      description="Every badge, its real earn criteria, and the correct action for your account."
      actions={
        !loading && startup?.id ? (
          <button
            type="button"
            onClick={runEvaluation}
            disabled={evaluating}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px",
              fontSize: 13, fontWeight: 500, color: "#fff", background: "#7C3AED",
              border: "none", borderRadius: radius.control,
              cursor: evaluating ? "default" : "pointer", opacity: evaluating ? 0.6 : 1,
            }}
          >
            {evaluating ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
            Check all
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : !startup?.id ? (
        <EmptyState kind="empty" title="Build your profile first" />
      ) : (
        <div style={{ border: `1px solid ${color.border}`, background: color.white, padding: "0 20px" }}>
          {defs.map((def) => (
            <BadgeRow
              key={def.id}
              def={def}
              earned={earnedIds.has(def.id)}
              checking={evaluating}
              onCheck={runEvaluation}
            />
          ))}
        </div>
      )}
    </PageFrame>
  );
}

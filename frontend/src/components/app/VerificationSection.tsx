import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, ShieldQuestion, Shield, Loader2,
  CheckCircle2, XCircle, Clock, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { VerificationBadge } from "@/components/shared/VerificationBadge";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VerificationSectionProps {
  entityType: "founder" | "investor";
  /** startup_id for founders, investor user_id for investors */
  entityId: string;
  userId: string;
  userEmail: string;
  displayName: string;
  /** profile_slug for founders (links to /verify page), investor user_id for investors */
  verifySlug?: string;
}

interface FounderVerif {
  current_tier: number;
  tier1_passed: boolean;
  tier1_checked_at: string | null;
  tier1_email_match: boolean | null;
  tier1_email_detail: string | null;
  tier1_website_match: boolean | null;
  tier1_website_detail: string | null;
  tier1_registry_match: boolean | null;
  tier1_registry_source: string | null;
  tier1_registry_detail: string | null;
  tier1_infra_match: boolean | null;
  tier1_infra_detail: string | null;
  tier2_passed: boolean;
  tier3_passed: boolean;
  human_reviewed: boolean | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function CheckRow({ label, passed, tooltip }: { label: string; passed: boolean | null; tooltip?: string }) {
  const status = passed === null ? (
    <span className="text-[10px] text-faint font-medium">Not checked</span>
  ) : passed ? (
    <span className="flex items-center gap-1 text-[10px] text-[#10B981] font-medium"><CheckCircle2 className="h-3 w-3 shrink-0" /> Pass</span>
  ) : (
    <span className="flex items-center gap-1 text-[10px] text-[#EF4444] font-medium"><XCircle className="h-3 w-3 shrink-0" /> Fail</span>
  );
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground leading-relaxed min-w-0" title={tooltip}>{label}</span>
      <span className="shrink-0 pt-0.5">{status}</span>
    </div>
  );
}

function TierBlock({
  number,
  title,
  description,
  unlocked,
  active,
  children,
}: {
  number: number;
  title: string;
  description: string;
  unlocked: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  const borderColor = unlocked
    ? "border-[rgba(16,185,129,0.3)]"
    : active
    ? "border-[rgba(124,58,237,0.3)]"
    : "border-border";

  const iconBg = unlocked
    ? "bg-[rgba(16,185,129,0.12)] text-[#10B981]"
    : active
    ? "bg-[rgba(124,58,237,0.12)] text-brand"
    : "bg-accent text-faint";

  return (
    <div className={`rounded-none border ${borderColor} p-5`} style={{ background: "var(--card)" }}>
      <div className="flex items-start gap-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
          style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14 }}>
          {unlocked ? <CheckCircle2 className="h-5 w-5" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>{title}</span>
            {unlocked && (
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
                Passed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function VerificationSection({
  entityType,
  entityId,
  userId,
  userEmail,
  displayName,
  verifySlug,
}: VerificationSectionProps) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [requestingSent, setRequestingSent] = useState(false);

  const table = entityType === "founder" ? "founder_verifications" : "investor_verifications";
  const idCol = entityType === "founder" ? "startup_id" : "investor_id";

  const { data: verif, isLoading } = useQuery({
    queryKey: ["my-verification", entityType, entityId],
    enabled: !!entityId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from(table)
        .select(
          entityType === "founder"
            ? "current_tier,tier1_passed,tier1_checked_at,tier1_email_match,tier1_email_detail,tier1_website_match,tier1_website_detail,tier1_registry_match,tier1_registry_source,tier1_registry_detail,tier1_infra_match,tier1_infra_detail,tier2_passed,tier3_passed,human_reviewed"
            : "current_tier,tier1_passed,overall_score,checked_at,website_resolves,linkedin_valid,email_domain_matches,website_content_summary,tier2_passed,tier3_passed"
        )
        .eq(idCol, entityId)
        .maybeSingle();
      return (data as FounderVerif | null) ?? null;
    },
  });

  const currentTier = verif?.current_tier ?? 0;
  const tier1Passed = verif?.tier1_passed ?? false;
  const tier1CheckedAt = entityType === "founder" ? verif?.tier1_checked_at : (verif as any)?.checked_at;
  const tier2Passed = verif?.tier2_passed ?? false;
  const tier3Passed = verif?.tier3_passed ?? false;

  const founderChecks = entityType === "founder" && verif ? [
    { label: "Email domain matches website", passed: verif.tier1_email_match ?? null, tooltip: verif.tier1_email_detail ?? undefined },
    { label: "Website mentions your company", passed: verif.tier1_website_match ?? null, tooltip: verif.tier1_website_detail ?? undefined },
    { label: "Found in a public company registry", passed: verif.tier1_registry_match ?? null, tooltip: verif.tier1_registry_detail ?? undefined },
    { label: "Real domain infrastructure (mail records + age)", passed: verif.tier1_infra_match ?? null, tooltip: verif.tier1_infra_detail ?? undefined },
  ] : [];

  const handleRunTier1 = async () => {
    if (!entityId || running) return;
    if (entityType === "investor") {
      toast.info("Automated verification runs for investor profiles from the admin panel.");
      return;
    }
    setRunning(true);
    toast.info("Running automated checks — this takes up to 20 seconds…");
    try {
      const { runTier1Check } = await import("@/lib/verification-fn");
      const result = await runTier1Check({ data: { startup_id: entityId, caller_user_id: userId } });
      await qc.invalidateQueries({ queryKey: ["my-verification", entityType, entityId] });
      if (result.tier1_passed) {
        toast.success("Identity confirmed — all four checks passed.");
      } else {
        toast.error("Identity check incomplete — one or more checks did not pass. See details below.");
      }
      // Auto-recompute readiness whenever verification reruns
      if (entityType === "founder") {
        try {
          const { computeReadiness } = await import("@/lib/readiness-fn");
          await computeReadiness({ data: { startup_id: entityId, founder_user_id: userId } });
          qc.invalidateQueries({ queryKey: ["readiness", entityId] });
        } catch { /* non-blocking */ }
      }
    } catch (err: any) {
      toast.error("Verification check failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const handleRequestHumanReview = async () => {
    if (requestingSent) return;
    setRequestingSent(true);
    try {
      const { requestHumanReview } = await import("@/lib/verification-fn");
      const result = await requestHumanReview({
        data: { entity_type: entityType, entity_id: entityId, user_id: userId, user_email: userEmail, display_name: displayName },
      });
      if (result.ok) {
        toast.success("Human review request sent. The Hockystick team will be in touch.");
      } else {
        toast.error("Could not send review request. Please email support@hockystick.app.");
      }
    } catch {
      toast.error("Request failed. Please email support@hockystick.app.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-faint" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current status header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            Verification status
          </h3>
          {verifySlug && currentTier > 0 && (
            <a
              href={`/verify/${verifySlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors flex items-center gap-1 mt-0.5"
            >
              View public verification report <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <VerificationBadge tier={currentTier} size="md" checkedAt={tier1CheckedAt ?? null} />
      </div>

      {/* Tier 1 — Identity Confirmed */}
      <TierBlock
        number={1}
        title="Identity Confirmed"
        description="Four automated checks, all must pass: business email matches your domain, website mentions your company, company found in a public registry, and real domain infrastructure (mail records, domain age)."
        unlocked={tier1Passed}
        active={!tier1Passed}
      >
        {tier1Passed ? (
          <>
            {tier1CheckedAt && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-faint flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Checked {new Date(tier1CheckedAt).toLocaleDateString()}
                </span>
                {verif?.tier1_registry_source && (
                  <span className="text-xs text-faint">· {verif.tier1_registry_source}</span>
                )}
              </div>
            )}
            <div className="rounded-lg overflow-hidden" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-1">
                {founderChecks.map((c) => (
                  <CheckRow key={c.label} label={c.label} passed={c.passed} tooltip={c.tooltip} />
                ))}
              </div>
            </div>
            <button
              onClick={handleRunTier1}
              disabled={running}
              className="mt-3 text-xs text-faint hover:text-muted-foreground transition-colors flex items-center gap-1"
            >
              {running ? <><Loader2 className="h-3 w-3 animate-spin" /> Re-running…</> : "Re-run checks"}
            </button>
          </>
        ) : (
          <>
            {verif && !tier1Passed && founderChecks.length > 0 && (
              <div className="mb-3 rounded-lg overflow-hidden" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
                <div className="px-4 py-1">
                  {founderChecks.map((c) => (
                    <CheckRow key={c.label} label={c.label} passed={c.passed} tooltip={c.tooltip} />
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">All four checks must pass — there is no partial credit.</span>
                </div>
              </div>
            )}
            {!verif && (
              <p className="text-xs text-faint mb-3">
                No checks run yet. Complete your profile (website, business email) then run the identity check.
              </p>
            )}
            <button
              onClick={handleRunTier1}
              disabled={running || entityType === "investor"}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-foreground transition-colors"
              style={{
                background: running ? "rgba(124,58,237,0.3)" : "var(--gradient-brand)",
                cursor: running || entityType === "investor" ? "not-allowed" : "pointer",
                opacity: entityType === "investor" ? 0.4 : 1,
              }}
            >
              {running ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running checks…</> : <><ShieldCheck className="h-3.5 w-3.5" /> Run automated check</>}
            </button>
          </>
        )}
      </TierBlock>

      {/* Tier 2 — Document Verified */}
      <TierBlock
        number={2}
        title="Document Verified"
        description="Upload your business registration or trade license. Our AI cross-checks it against your profile. Unlocks the green 'Document Verified' badge."
        unlocked={tier2Passed}
        active={tier1Passed && !tier2Passed}
      >
        {tier1Passed && !tier2Passed && (
          <div
            className="rounded-lg px-4 py-3 text-xs text-muted-foreground"
            style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            Document upload coming soon. Your tax ID and registration document will be securely stored and AI-verified. Raw numbers are never displayed — only "Registration provided ✓".
          </div>
        )}
        {tier2Passed && (
          <p className="text-xs text-[#10B981]">Document verification passed.</p>
        )}
        {!tier1Passed && (
          <p className="text-xs text-faint">Complete Tier 1 first.</p>
        )}
      </TierBlock>

      {/* Tier 3 — Hockystick Verified (human review) */}
      <TierBlock
        number={3}
        title="Hockystick Verified"
        description="Human review by the Hockystick team. Identity, fund or company registration, and background manually confirmed. Purple badge, highest trust level."
        unlocked={tier3Passed}
        active={tier2Passed && !tier3Passed}
      >
        {tier3Passed ? (
          <p className="text-xs text-[#A855F7]">Human review complete. Hockystick Verified badge active.</p>
        ) : tier2Passed ? (
          <button
            onClick={handleRequestHumanReview}
            disabled={requestingSent}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
            style={{
              background: requestingSent ? "var(--accent)" : "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: requestingSent ? "var(--faint)" : "#A855F7",
              cursor: requestingSent ? "not-allowed" : "pointer",
            }}
          >
            {requestingSent ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Request sent</>
            ) : (
              <><ShieldQuestion className="h-3.5 w-3.5" /> Request human review</>
            )}
          </button>
        ) : (
          <p className="text-xs text-faint">Complete Tier 2 first.</p>
        )}
      </TierBlock>
      <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        <a
          href="/trust"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs transition-colors"
          style={{ color: "rgba(124,58,237,0.7)" }}
        >
          <ExternalLink className="h-3 w-3" />
          See how verification works →
        </a>
      </div>
    </div>
  );
}

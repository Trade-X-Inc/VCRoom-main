import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, CheckCircle2, XCircle,
  Loader2, ChevronRight, Users, Globe, Linkedin, Mail,
  Building2, Briefcase, Clock, Eye, Check, X,
  Zap, TrendingUp, TrendingDown, AlertTriangle, ArrowRight,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AttachProofModal } from "@/components/app/AttachProofModal";
import { PageGuide } from "@/components/app/PageGuide";
import type { StartupClaim, ClaimStatus } from "@/lib/claims-fn";
import type { ReadinessResult, ScoreRun, ScoreRunFactor, ScoreRunGap } from "@/lib/readiness-fn";

// P4: /app is now the 4-step raise Home. The workstation (FounderHome,
// exported below) moved to /app/assistant as the AI Advisor.
export const Route = createFileRoute("/app/")({
  component: RaiseHome,
});

import { RaiseHome } from "@/components/app/RaiseHome";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
}

interface CapRow {
  id: string;
  social_verified: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const CLAIM_STATUS_STYLE: Record<ClaimStatus, { style: React.CSSProperties; label: string }> = {
  unverified: {
    style: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" },
    label: "Unverified",
  },
  pending_review: {
    style: { background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--brand)" },
    label: "Proof attached",
  },
  ai_confirmed: {
    style: { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" },
    label: "Confirmed",
  },
  ai_mismatch: {
    style: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" },
    label: "Mismatch",
  },
};

function CheckRow({
  label,
  passed,
  icon,
  note,
}: {
  label: string;
  passed: boolean | null;
  icon: React.ReactNode;
  note?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground/70 ">{label}</span>
        {note && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed truncate" title={note}>{note}</p>}
      </div>
      <div className="shrink-0">
        {passed === null ? (
          <span className="text-xs text-muted-foreground ">Not checked</span>
        ) : passed ? (
          <span className="flex items-center gap-1 text-xs" style={{ color: "#10B981" }}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Pass
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs" style={{ color: "#EF4444" }}>
            <XCircle className="h-3.5 w-3.5" /> Fail
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification card
// ─────────────────────────────────────────────────────────────────────────────

function VerificationCard({
  startupId,
  userId,
  profileSlug,
}: {
  startupId: string;
  userId: string;
  profileSlug: string | null;
}) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [attachingClaim, setAttachingClaim] = useState<{ type: string; label: string; value: string } | null>(null);

  const { data: verif, isLoading: verifLoading } = useQuery<FounderVerif | null>({
    queryKey: ["home-verif", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_verifications")
        .select("current_tier,tier1_passed,tier1_checked_at,tier1_email_match,tier1_email_detail,tier1_website_match,tier1_website_detail,tier1_registry_match,tier1_registry_source,tier1_registry_detail,tier1_infra_match,tier1_infra_detail,tier2_passed,tier3_passed")
        .eq("startup_id", startupId)
        .maybeSingle();
      return (data as FounderVerif | null) ?? null;
    },
  });

  const { data: claims = [], refetch: refetchClaims } = useQuery<StartupClaim[]>({
    queryKey: ["home-claims", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_claims")
        .select("*")
        .eq("startup_id", startupId)
        .order("claim_type");
      return (data ?? []) as StartupClaim[];
    },
  });

  const { data: capRows = [] } = useQuery<CapRow[]>({
    queryKey: ["home-cap", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_cap_table")
        .select("id, social_verified")
        .eq("startup_id", startupId);
      return (data ?? []) as CapRow[];
    },
  });

  const neverRun = !verif || !verif.tier1_checked_at;
  const tier1Passed = verif?.tier1_passed ?? false;
  const currentTier = verif?.current_tier ?? 0;
  const passedCheckCount = verif
    ? [verif.tier1_email_match, verif.tier1_website_match, verif.tier1_registry_match, verif.tier1_infra_match].filter(Boolean).length
    : 0;

  const confirmedClaims = claims.filter((c) => c.proof_status === "ai_confirmed").length;
  const mismatchedClaims = claims.filter((c) => c.proof_status === "ai_mismatch");
  const unverifiedClaims = claims.filter(
    (c) => c.proof_status === "unverified" || c.proof_status === "ai_mismatch"
  );
  const capVerifiedCount = capRows.filter((r) => r.social_verified).length;

  let subtext: string;
  if (neverRun) {
    subtext = "Not yet verified — run your first check";
  } else if (tier1Passed) {
    subtext = "Identity Confirmed · all 4 checks passed";
  } else {
    subtext = `Identity check found gaps · ${passedCheckCount}/4 checks passed`;
  }

  const headerBadgeStyle: React.CSSProperties = neverRun
    ? { background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", color: "rgba(124,58,237,0.7)" }
    : tier1Passed
    ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }
    : { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" };

  const handleRunTier1 = async () => {
    if (running) return;
    setRunning(true);
    toast.info("Running automated checks — this takes up to 20 seconds…");
    try {
      const { runTier1Check } = await import("@/lib/verification-fn");
      const result = await runTier1Check({ data: { startup_id: startupId, caller_user_id: userId } });
      await qc.invalidateQueries({ queryKey: ["home-verif", startupId] });
      if (result.tier1_passed) {
        toast.success("Identity confirmed — all four checks passed");
      } else {
        toast.error("Identity check incomplete — see which checks failed below.");
      }
      // Auto-recompute readiness after verification reruns
      try {
        const { computeReadiness } = await import("@/lib/readiness-fn");
        await computeReadiness({ data: { startup_id: startupId, founder_user_id: userId } });
        qc.invalidateQueries({ queryKey: ["readiness", startupId] });
      } catch { /* non-blocking */ }
    } catch {
      toast.error("Verification check failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {/* Card header */}
        <div
          className="flex items-start justify-between gap-4 flex-wrap border-b border-border/60"
          style={{ padding: "20px 24px" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: neverRun
                  ? "var(--color-muted)"
                  : tier1Passed
                  ? "rgba(16,185,129,0.12)"
                  : "rgba(245,158,11,0.1)",
              }}
            >
              <ShieldCheck
                className="h-4.5 w-4.5"
                style={{
                  color: neverRun ? "var(--color-muted-foreground)" : tier1Passed ? "#10B981" : "#F59E0B",
                }}
              />
            </div>
            <div>
              <h2
                className="text-sm font-semibold text-foreground"
                style={{ fontFamily: "Syne, sans-serif" }}
              >
                Verification
              </h2>
              <p className="text-xs mt-0.5 text-muted-foreground">{subtext}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-medium"
              style={headerBadgeStyle}
            >
              {neverRun ? "Not verified" : currentTier === 1 ? "✓ Hockystick Checked" : currentTier >= 2 ? "✦ Verified" : "Check ran, not passed"}
            </span>
            {!neverRun && profileSlug && (
              <a
                href={`/verify/${profileSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] flex items-center gap-1 transition-colors text-muted-foreground"
              >
                Public report <ChevronRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Never-run state */}
          {neverRun && (
            <div className="space-y-4">
              <div
                className="rounded-lg text-xs leading-relaxed"
                style={{
                  background: "rgba(124,58,237,0.06)",
                  border: "1px solid rgba(124,58,237,0.15)",
                  padding: "12px 16px",
                  color: "var(--color-muted-foreground)",
                }}
              >
                Automated checks confirm your website resolves, your LinkedIn URL exists, your email domain
                matches your website, and your company appears in a public registry. No login required on
                the investor side — the badge is visible on your public profile.
              </div>
              <button
                data-testid="run-verification-btn"
                onClick={handleRunTier1}
                disabled={running}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-foreground transition-colors"
                style={{
                  background: running ? "rgba(124,58,237,0.4)" : "var(--gradient-brand)",
                  cursor: running ? "not-allowed" : "pointer",
                  opacity: running ? 0.8 : 1,
                }}
              >
                {running
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Running checks…</>
                  : <><ShieldCheck className="h-4 w-4" /> Run verification check</>
                }
              </button>
            </div>
          )}

          {/* Has-run state */}
          {!neverRun && (
            <div>
              {verifLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground ">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <div
                  data-testid="verification-result"
                  className="rounded-lg overflow-hidden mb-4"
                  style={{ background: "var(--color-muted)", border: "var(--color-border)" }}
                >
                  <div style={{ padding: "0 16px" }}>
                    <CheckRow
                      label="Email domain matches website"
                      icon={<Mail className="h-3.5 w-3.5" />}
                      passed={verif?.tier1_email_match ?? null}
                      note={verif?.tier1_email_detail ?? null}
                    />
                    <CheckRow
                      label="Website mentions your company"
                      icon={<Globe className="h-3.5 w-3.5" />}
                      passed={verif?.tier1_website_match ?? null}
                      note={verif?.tier1_website_detail ?? null}
                    />
                    <CheckRow
                      label="Found in a public company registry"
                      icon={<Building2 className="h-3.5 w-3.5" />}
                      passed={verif?.tier1_registry_match ?? null}
                      note={verif?.tier1_registry_detail ?? null}
                    />
                    <CheckRow
                      label="Real domain infrastructure"
                      icon={<Globe className="h-3.5 w-3.5" />}
                      passed={verif?.tier1_infra_match ?? null}
                      note={verif?.tier1_infra_detail ?? null}
                    />
                  </div>
                  <div
                    style={{ padding: "10px 16px", borderTop: "1px solid var(--color-border)" }}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-muted-foreground">
                      {tier1Passed ? "All 4 checks passed — Identity Confirmed" : `${passedCheckCount}/4 passed — all four required`}
                    </span>
                    <button
                      data-testid="run-verification-btn"
                      onClick={handleRunTier1}
                      disabled={running}
                      className="text-xs flex items-center gap-1 transition-colors"
                      style={{ color: "var(--color-muted-foreground)", cursor: running ? "not-allowed" : "pointer" }}
                    >
                      {running ? <><Loader2 className="h-3 w-3 animate-spin" /> Re-running…</> : "Re-run checks"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Claims subsection */}
          <div className="border-t border-border/40 pt-4" style={{ marginTop: neverRun ? 16 : 0 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider" style={{ letterSpacing: "0.1em" }}>
                Claims
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={
                  mismatchedClaims.length > 0
                    ? { background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }
                    : confirmedClaims === claims.length && claims.length > 0
                    ? { background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }
                    : { background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }
                }
              >
                {claims.length === 0
                  ? "No claims yet"
                  : `${confirmedClaims}/${claims.length} with evidence`}
              </span>
            </div>
            {claims.length > 0 && (
              <div className="mb-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                These are self-reported claims. Upload supporting documents to allow AI verification. Verified claims are shown to investors with source evidence.
              </div>
            )}

            {claims.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Save traction data (revenue, growth rate, customer count) on your{" "}
                <Link to="/app/profile" className="underline underline-offset-2 hover:opacity-70" style={{ color: "rgba(124,58,237,0.8)" }}>
                  Company Profile
                </Link>{" "}
                and claims will appear here.
              </p>
            )}

            {claims.length > 0 && (
              <div className="space-y-2">
                {claims.map((claim) => {
                  const cfg = CLAIM_STATUS_STYLE[claim.proof_status as ClaimStatus] ?? CLAIM_STATUS_STYLE.unverified;
                  const needsAction = claim.proof_status === "unverified" || claim.proof_status === "ai_mismatch";
                  return (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                      style={{ background: "var(--accent)", border: "var(--color-border)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground/70 truncate block">{claim.claim_label}</span>
                        <span className="text-xs text-muted-foreground truncate block">{claim.claim_value}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                          style={cfg.style}
                        >
                          {cfg.label}
                        </span>
                        {needsAction && (
                          <button
                            onClick={() =>
                              setAttachingClaim({
                                type: claim.claim_type,
                                label: claim.claim_label,
                                value: claim.claim_value,
                              })
                            }
                            className="text-[11px] underline underline-offset-2 transition-colors"
                            style={{ color: "rgba(124,58,237,0.8)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          >
                            Upload evidence
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cap table subsection */}
          <div className="border-t border-border/40 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wider" style={{ letterSpacing: "0.1em" }}>
                Cap Table
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={
                  capRows.length === 0
                    ? { background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)" }
                    : capVerifiedCount === capRows.length
                    ? { background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }
                    : { background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }
                }
              >
                {capRows.length === 0
                  ? "No entries"
                  : `${capRows.length} shareholder${capRows.length !== 1 ? "s" : ""} · ${capVerifiedCount} verified`}
              </span>
            </div>

            {capRows.length === 0 ? (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-muted-foreground)" }} />
                <span className="text-xs text-muted-foreground">
                  No cap table entries yet.{" "}
                  <Link
                    to="/app/profile"
                    className="underline underline-offset-2 hover:opacity-70"
                    style={{ color: "rgba(124,58,237,0.8)" }}
                  >
                    Add shareholders on Company Profile
                  </Link>
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Visible only to you — not shared with investors by default.
                </span>
                <Link
                  to="/app/profile"
                  className="text-[11px] flex items-center gap-1 transition-colors"
                  style={{ color: "rgba(124,58,237,0.7)" }}
                >
                  Manage <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {attachingClaim && (
        <AttachProofModal
          claim={attachingClaim}
          startupId={startupId}
          onClose={() => setAttachingClaim(null)}
          onDone={async () => {
            refetchClaims();
            setAttachingClaim(null);
            // Recompute readiness when a claim proof status changes
            try {
              const { computeReadiness } = await import("@/lib/readiness-fn");
              await computeReadiness({ data: { startup_id: startupId, founder_user_id: userId } });
              qc.invalidateQueries({ queryKey: ["readiness", startupId] });
            } catch { /* non-blocking */ }
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deal Activity card
// ─────────────────────────────────────────────────────────────────────────────

interface DealRoom {
  id: string;
  status: string;
  created_at: string;
  investor_name: string | null;
  investor_company: string | null;
}

interface AccessRequest {
  id: string;
  investor_id: string;
  created_at: string;
  investor_profiles: { your_name: string | null; fund_name: string | null } | null;
}

interface DocViewSummary {
  deal_room_id: string;
  count: number;
  most_recent: string;
  viewer_name: string | null;
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmDanger,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  confirmDanger?: boolean;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border/60 rounded-none p-7 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-foreground leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground/70 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium rounded-lg text-foreground transition-colors"
            style={{ background: confirmDanger ? "#EF4444" : "var(--gradient-brand)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Readiness card
// ─────────────────────────────────────────────────────────────────────────────

function ReadinessCard({
  startupId,
  userId,
}: {
  startupId: string;
  userId: string;
}) {
  const qc = useQueryClient();

  const { data: readiness, isLoading } = useQuery({
    queryKey: ["readiness", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { computeReadiness } = await import("@/lib/readiness-fn");
      return computeReadiness({ data: { startup_id: startupId, founder_user_id: userId } });
    },
  });

  const score = readiness?.readiness_score ?? 0;
  const passed = readiness?.gate_passed ?? false;
  const blockers = readiness?.gate_blockers ?? [];
  const prev = readiness?.prev_readiness_score ?? null;
  const delta = prev !== null ? score - prev : null;

  const scoreColor = passed ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  const scoreBg = passed
    ? "rgba(16,185,129,0.08)"
    : score >= 50
    ? "rgba(245,158,11,0.06)"
    : "rgba(239,68,68,0.06)";
  const scoreBorder = passed
    ? "1px solid rgba(16,185,129,0.2)"
    : score >= 50
    ? "1px solid rgba(245,158,11,0.2)"
    : "1px solid rgba(239,68,68,0.15)";

  const BLOCKER_ICON: Record<string, React.ReactNode> = {
    verification: <ShieldCheck className="h-3.5 w-3.5" />,
    claims: <CheckCircle2 className="h-3.5 w-3.5" />,
    simulation: <Zap className="h-3.5 w-3.5" />,
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 flex-wrap border-b border-border/60"
        style={{ padding: "20px 24px" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: passed ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.1)" }}
          >
            <Zap className="h-4 w-4" style={{ color: passed ? "#10B981" : "#F59E0B" }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
              Investor Readiness
            </h2>
            <p className="text-xs mt-0.5 text-muted-foreground">
              Composite signal from verification, claims, and simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Delta indicator */}
          {delta !== null && delta !== 0 && (
            <span
              className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={
                delta > 0
                  ? { background: "rgba(16,185,129,0.12)", color: "#10B981" }
                  : { background: "rgba(245,158,11,0.12)", color: "#F59E0B" }
              }
            >
              {delta > 0
                ? <TrendingUp className="h-3 w-3" />
                : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
          {/* Score badge */}
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: scoreBg, border: scoreBorder, color: scoreColor }}
          >
            {isLoading ? "…" : passed ? "✓ Ready" : "Not ready yet"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px" }}>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground ">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Computing readiness…</span>
          </div>
        ) : (
          <>
            {/* Big score */}
            <div className="flex items-end gap-3 mb-5">
              <span
                className="font-bold leading-none"
                style={{ fontSize: 52, color: scoreColor, fontFamily: "Syne, sans-serif" }}
              >
                {score}
              </span>
              <span className="text-lg text-muted-foreground mb-1">/100</span>
              {passed && (
                <span className="mb-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                  Ready for outreach
                </span>
              )}
            </div>

            {/* Score breakdown pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { label: "Verification", value: readiness?.verification_score ?? 0, max: 100, weight: "40%" },
                {
                  label: "Claims",
                  value: readiness && readiness.claims_total_count > 0
                    ? Math.round((readiness.claims_verified_count / readiness.claims_total_count) * 100)
                    : 0,
                  max: 100,
                  weight: "30%",
                },
                {
                  label: "Simulation",
                  value: readiness?.latest_sim_score != null
                    ? Math.round((readiness.latest_sim_score / 10) * 100)
                    : 0,
                  max: 100,
                  weight: "30%",
                  na: readiness?.latest_sim_score == null,
                },
              ].map(({ label, value, weight, na }) => (
                <div
                  key={label}
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
                >
                  <div className="font-medium text-foreground/60 ">{label} <span className="text-muted-foreground ">({weight})</span></div>
                  <div className="font-semibold mt-0.5" style={{ color: na ? "var(--color-muted-foreground)" : value >= 60 ? "#10B981" : value >= 30 ? "#F59E0B" : "#EF4444" }}>
                    {na ? "Not run" : `${value}/100`}
                  </div>
                </div>
              ))}
            </div>

            {/* Passed state */}
            {passed && (
              <div
                className="rounded-lg px-4 py-3.5"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10B981" }} />
                  <span className="text-sm font-semibold" style={{ color: "#10B981" }}>
                    All three signals are strong
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your verification, claims, and simulation are in good shape. Start warm outreach with confidence.
                </p>
              </div>
            )}

            {/* Blockers — only real, true blockers */}
            {!passed && blockers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  What's blocking you
                </p>
                {blockers.map((b, i) => (
                  <a
                    key={i}
                    href={b.action_url}
                    className="flex items-start gap-3 rounded-lg px-4 py-3 transition-colors group"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", textDecoration: "none" }}
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: "#F59E0B" }}>
                      {BLOCKER_ICON[b.type] ?? <AlertTriangle className="h-3.5 w-3.5" />}
                    </span>
                    <span className="text-xs leading-relaxed flex-1 text-foreground/70">
                      {b.message}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#F59E0B" }} />
                  </a>
                ))}
              </div>
            )}

            {!passed && blockers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Score is below 70 — continue improving your profile to unlock outreach readiness.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DealActivityCard({
  startupId,
  profileSlug,
  companyName,
}: {
  startupId: string;
  profileSlug: string | null;
  companyName: string | null;
}) {
  const [confirmAction, setConfirmAction] = useState<{
    requestId: string;
    investorId: string;
    action: "approved" | "declined";
    investorName: string | null;
  } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: dealRooms = [] } = useQuery<DealRoom[]>({
    queryKey: ["home-deal-rooms", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, status, created_at, investor_name, investor_company")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });
      return (data ?? []) as DealRoom[];
    },
  });

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(true);

  const loadRequests = async () => {
    setReqLoading(true);
    const { data: reqs } = await supabase
      .from("discovery_requests")
      .select("id, investor_id, created_at")
      .eq("startup_id", startupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!reqs || reqs.length === 0) { setRequests([]); setReqLoading(false); return; }

    // investor_profiles has no bare peer-read RLS anymore — whitelist-filtered
    // batch RPC only (your_name/fund_name are both in the default whitelist).
    const investorIds = reqs.map((r: any) => r.investor_id);
    const { data: profiles } = await supabase.rpc("get_public_investor_profiles_by_user_ids", { p_user_ids: investorIds });

    const pm = Object.fromEntries(((profiles ?? []) as any[]).map((p) => [p.user_id, p]));
    setRequests(reqs.map((r: any) => ({ ...r, investor_profiles: pm[r.investor_id] ?? null })));
    setReqLoading(false);
  };

  useEffect(() => { loadRequests(); }, [startupId]);

  const { data: docViewsByRoom = [] } = useQuery<DocViewSummary[]>({
    queryKey: ["home-doc-views", startupId],
    enabled: dealRooms.length > 0 && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const roomIds = dealRooms.map((r) => r.id);
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("document_views")
        .select("deal_room_id, created_at, viewer_name")
        .in("deal_room_id", roomIds)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) return [];

      const grouped: Record<string, DocViewSummary> = {};
      for (const row of data as any[]) {
        if (!grouped[row.deal_room_id]) {
          grouped[row.deal_room_id] = {
            deal_room_id: row.deal_room_id,
            count: 0,
            most_recent: row.created_at,
            viewer_name: row.viewer_name,
          };
        }
        grouped[row.deal_room_id].count++;
        if (row.created_at > grouped[row.deal_room_id].most_recent) {
          grouped[row.deal_room_id].most_recent = row.created_at;
          grouped[row.deal_room_id].viewer_name = row.viewer_name;
        }
      }
      return Object.values(grouped);
    },
  });

  const executeAction = async () => {
    if (!confirmAction) return;
    const { requestId, investorId, action, investorName } = confirmAction;
    setConfirmAction(null);
    setActingId(requestId);

    const { error } = await supabase
      .from("discovery_requests")
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === "approved") {
        toast.success(`Access approved. ${investorName ?? "Investor"} can now view your on-request sections.`);
        const name = companyName ?? "The founder";
        supabase.from("notifications").insert({
          user_id: investorId,
          kind: "access_approved",
          title: `${name} approved your access`,
          body: "You can now view their business model, market, traction, and team sections.",
          read: false,
          action_url: profileSlug ? `/p/${profileSlug}` : null,
          meta: { startup_id: startupId },
        }).then(({ error: nErr }) => {
          if (nErr) console.warn("[notification] access_approved failed:", nErr.message);
        });
      } else {
        toast.success("Request declined.");
      }
    } else {
      toast.error("Could not update request.");
    }
    setActingId(null);
  };

  const pendingCount = requests.length;
  const activeRoomCount = dealRooms.filter((r) => r.status === "active").length;
  let subtext: string;
  if (pendingCount > 0) {
    subtext = `${pendingCount} investor${pendingCount > 1 ? "s" : ""} waiting on you`;
  } else if (activeRoomCount > 0) {
    subtext = `${activeRoomCount} active deal room${activeRoomCount > 1 ? "s" : ""}`;
  } else {
    subtext = "No active investor activity yet";
  }

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden mt-4">
        <div
          style={{ padding: "20px 24px", borderBottom: "var(--color-border)" }}
          className="flex items-start gap-3"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: pendingCount > 0 ? "rgba(245,158,11,0.1)" : "rgba(124,58,237,0.1)" }}
          >
            <Briefcase
              className="h-4 w-4"
              style={{ color: pendingCount > 0 ? "#F59E0B" : "#A855F7" }}
            />
          </div>
          <div>
            <h2
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Deal Activity
            </h2>
            <p className="text-xs mt-0.5" style={{ color: pendingCount > 0 ? "#F59E0B" : "var(--color-muted-foreground)" }}>
              {subtext}
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }} className="space-y-4">
          {reqLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground ">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading requests…
            </div>
          )}

          {!reqLoading && requests.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2" style={{ letterSpacing: "0.1em" }}>
                Pending access requests
              </div>
              <div className="space-y-2">
                {requests.map((req) => {
                  const name = req.investor_profiles?.your_name ?? "Unknown investor";
                  const firm = req.investor_profiles?.fund_name;
                  const isActing = actingId === req.id;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 flex-wrap"
                      style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{name}</div>
                        <div className="text-xs mt-0.5 text-muted-foreground">
                          {firm && <span>{firm} · </span>}
                          Requested {daysAgo(req.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground " />
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                setConfirmAction({ requestId: req.id, investorId: req.investor_id, action: "approved", investorName: name })
                              }
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({ requestId: req.id, investorId: req.investor_id, action: "declined", investorName: name })
                              }
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
                            >
                              <X className="h-3 w-3" /> Decline
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dealRooms.length === 0 && requests.length === 0 && !reqLoading ? (
            <p className="text-xs text-muted-foreground">
              No active investor activity yet. Once an investor requests access to your profile, it'll show up here.
            </p>
          ) : (
            dealRooms.length > 0 && (
              <div>
                {requests.length > 0 && (
                  <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2" style={{ letterSpacing: "0.1em" }}>
                    Deal rooms
                  </div>
                )}
                <div className="space-y-2">
                  {dealRooms.map((room) => {
                    const viewSummary = docViewsByRoom.find((v) => v.deal_room_id === room.id);
                    return (
                      <div
                        key={room.id}
                        className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 flex-wrap"
                        style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {room.investor_name ?? "Investor"}
                              {room.investor_company ? ` · ${room.investor_company}` : ""}
                            </span>
                            <span
                              className="text-[11px] px-1.5 py-0.5 rounded-full capitalize shrink-0"
                              style={
                                room.status === "active"
                                  ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }
                                  : { background: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }
                              }
                            >
                              {room.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" /> Opened {daysAgo(room.created_at)}
                            </span>
                            {viewSummary ? (
                              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Eye className="h-3 w-3" />
                                {viewSummary.viewer_name ?? "Investor"} viewed {viewSummary.count} document{viewSummary.count !== 1 ? "s" : ""} {daysAgo(viewSummary.most_recent)}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                                No document views in the last 7 days
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          to="/app/deal-rooms/$id"
                          params={{ id: room.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium shrink-0 transition-colors"
                          style={{ color: "rgba(124,58,237,0.8)" }}
                        >
                          Open deal room <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          message={
            confirmAction.action === "approved"
              ? `Approve access for ${confirmAction.investorName ?? "this investor"}? They will be able to view your on-request profile sections.`
              : `Decline access for ${confirmAction.investorName ?? "this investor"}?`
          }
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
          confirmLabel={confirmAction.action === "approved" ? "Approve access" : "Decline"}
          confirmDanger={confirmAction.action === "declined"}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Audit Card
// ─────────────────────────────────────────────────────────────────────────────

const FACTOR_ORDER = ["team", "market", "traction", "financials", "product", "legal"] as const;
const FACTOR_LABELS: Record<string, string> = {
  team: "Team", market: "Market", traction: "Traction",
  financials: "Financials", product: "Product", legal: "Legal",
};

function ScoreAuditCard({
  startupId,
  userId,
  onScoreRun,
}: {
  startupId: string;
  userId: string;
  onScoreRun?: (run: ScoreRun) => void;
}) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: latestRun } = useQuery<ScoreRun | null>({
    queryKey: ["score-audit", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { fetchLatestScoreRun } = await import("@/lib/readiness-fn");
      return fetchLatestScoreRun(startupId, supabase);
    },
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token ?? "";
      const { runReadinessScore } = await import("@/lib/readiness-fn");
      const result = await runReadinessScore(startupId, userId, jwt);
      qc.setQueryData(["score-audit", startupId], result);
      onScoreRun?.(result);
    } catch (err: any) {
      toast.error(err?.message ?? "Score audit failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-none border border-border/60 bg-card p-5 mt-4" data-testid="score-audit-card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: "rgba(124,58,237,0.12)" }}
          >
            <ScanLine className="h-4 w-4" style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
              Score Audit
            </div>
            {latestRun && (
              <div className="text-xs text-muted-foreground">
                Last run: {new Date(latestRun.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {latestRun && (
            <div className="flex items-center gap-1.5">
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: "Syne, sans-serif", color: "var(--brand)" }}
              >
                {latestRun.score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
              {latestRun.prev_score != null && (
                <span
                  className="text-xs font-semibold ml-1"
                  style={{
                    color: latestRun.score >= latestRun.prev_score ? "#10B981" : "#EF4444",
                  }}
                >
                  {latestRun.score >= latestRun.prev_score ? "↑" : "↓"}
                  {Math.abs(latestRun.score - latestRun.prev_score)} pts
                </span>
              )}
            </div>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            data-testid="run-score-audit-btn"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running…
              </>
            ) : (
              "Run Score Audit"
            )}
          </button>
        </div>
      </div>

      {!latestRun && !running && (
        <div className="text-sm text-muted-foreground">
          Run a score audit to get AI-powered investor readiness analysis.
        </div>
      )}

      {latestRun && (
        <div className="space-y-5">
          {/* Section A — Data gaps */}
          <div data-testid="score-audit-gaps-section">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.1em" }}>
              What the AI couldn't evaluate
            </div>
            <div
              className="rounded-lg px-3 py-2 mb-2 text-xs"
              style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", color: "var(--color-foreground)" }}
            >
              Score confidence: {latestRun.confidence_lo}–{latestRun.confidence_hi} / 100
            </div>
            {latestRun.data_gaps.length === 0 ? (
              <div className="text-sm" style={{ color: "#10B981" }}>All key data points present ✓</div>
            ) : (
              <div className="space-y-2">
                {latestRun.data_gaps.map((gap: ScoreRunGap, i: number) => (
                  <div key={i} className="flex items-start gap-2" data-testid="score-audit-gap-item">
                    <span className="font-semibold text-sm text-foreground capitalize">{gap.field.replace(/_/g, " ")}</span>
                    <span
                      className="text-xs font-semibold rounded px-1.5 py-0.5 shrink-0"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
                    >
                      –{gap.impact_points} pts
                    </span>
                    <span className="text-xs text-muted-foreground">{gap.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B — Factor breakdown */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.1em" }}>
              Score breakdown
            </div>
            <div className="space-y-3">
              {FACTOR_ORDER.map((key) => {
                const factor = (latestRun.factor_breakdown as Record<string, ScoreRunFactor>)[key];
                if (!factor) return null;
                const pct = Math.round((factor.score / factor.max) * 100);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{FACTOR_LABELS[key]}</span>
                      <span className="text-xs text-muted-foreground">
                        {factor.score}/{factor.max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full w-full" style={{ background: "var(--accent)" }}>
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: "var(--gradient-brand)" }}
                      />
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">
                      {factor.reasoning}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C — Top action */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.1em" }}>
              Your highest-impact next action
            </div>
            <div
              className="pl-3 py-2 text-sm text-foreground"
              style={{ borderLeft: "3px solid var(--brand)" }}
            >
              {latestRun.top_action}
            </div>
          </div>

          {/* Section D — Investor preview */}
          {latestRun.sim_preview && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.1em" }}>
                Investor preview
              </div>
              <div className="text-sm italic text-muted-foreground">
                {latestRun.sim_preview}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Investor Simulation Card
// ─────────────────────────────────────────────────────────────────────────────

type SimBlock = {
  label: string;
  content: string;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  icon: string;
  testId: string;
};

function InvestorSimCard({
  startupId,
  userId,
  onSimRun,
}: {
  startupId: string;
  userId: string;
  onSimRun?: (run: import("@/lib/investor-sim-fn").SimRun) => void;
}) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: latestSim } = useQuery<import("@/lib/investor-sim-fn").SimRun | null>({
    queryKey: ["investor-sim", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { fetchLatestSimRun } = await import("@/lib/investor-sim-fn");
      return fetchLatestSimRun(startupId);
    },
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token ?? "";
      const { runInvestorSim } = await import("@/lib/investor-sim-fn");
      const result = await runInvestorSim(startupId, userId, jwt);
      qc.setQueryData(["investor-sim", startupId], result);
      onSimRun?.(result);
    } catch (err: any) {
      toast.error(err?.message ?? "Simulation failed");
    } finally {
      setRunning(false);
    }
  };

  const blocks: SimBlock[] = latestSim
    ? [
        {
          label: "First question they'll ask",
          content: latestSim.first_question,
          bg: "rgba(245,158,11,0.06)",
          border: "rgba(245,158,11,0.18)",
          iconBg: "rgba(245,158,11,0.15)",
          iconColor: "#F59E0B",
          icon: "?",
          testId: "sim-block-first-question",
        },
        {
          label: "Red flag they'll spot",
          content: latestSim.red_flag,
          bg: "rgba(239,68,68,0.06)",
          border: "rgba(239,68,68,0.18)",
          iconBg: "rgba(239,68,68,0.15)",
          iconColor: "#EF4444",
          icon: "⚠",
          testId: "sim-block-red-flag",
        },
        {
          label: "Strongest point in your profile",
          content: latestSim.strongest_point,
          bg: "rgba(16,185,129,0.06)",
          border: "rgba(16,185,129,0.18)",
          iconBg: "rgba(16,185,129,0.15)",
          iconColor: "#10B981",
          icon: "↑",
          testId: "sim-block-strongest",
        },
        {
          label: "Kill risk",
          content: latestSim.kill_risk,
          bg: "rgba(127,29,29,0.18)",
          border: "rgba(239,68,68,0.30)",
          iconBg: "rgba(239,68,68,0.20)",
          iconColor: "#FCA5A5",
          icon: "✕",
          testId: "sim-block-kill-risk",
        },
      ]
    : [];

  return (
    <div className="rounded-none border border-border/60 bg-card p-5 mt-4" data-testid="investor-sim-card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: "rgba(124,58,237,0.12)" }}
          >
            <Users className="h-4 w-4" style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <div
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Investor Simulation
            </div>
            {latestSim && (
              <div className="text-xs text-muted-foreground">
                Last run: {new Date(latestSim.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          data-testid="run-investor-sim-btn"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-brand)" }}
        >
          {running ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running…
            </>
          ) : latestSim ? (
            "Re-run"
          ) : (
            "Run Simulation"
          )}
        </button>
      </div>

      {!latestSim && !running && (
        <div className="text-sm text-muted-foreground">
          Simulate a first-pass investor review — get the opening question, red flag,
          strongest point, and kill risk specific to your profile.
        </div>
      )}

      {latestSim && (
        <div className="space-y-3" data-testid="investor-sim-blocks">
          {blocks.map((b) => (
            <div
              key={b.testId}
              data-testid={b.testId}
              className="rounded-lg px-4 py-3 flex items-start gap-3"
              style={{ background: b.bg, border: `1px solid ${b.border}` }}
            >
              <div
                className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-sm font-bold"
                style={{ background: b.iconBg, color: b.iconColor }}
              >
                {b.icon}
              </div>
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: b.iconColor, letterSpacing: "0.08em" }}
                >
                  {b.label}
                </div>
                <div className="text-sm text-foreground leading-relaxed">{b.content}</div>
              </div>
            </div>
          ))}

          {/* Footer: persona + timestamp */}
          <div className="pt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
            {latestSim.investor_persona_used && (
              <span>{latestSim.investor_persona_used} · </span>
            )}
            {new Date(latestSim.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Coaching Card
// ─────────────────────────────────────────────────────────────────────────────

const EFFORT_STYLES: Record<string, { bg: string; color: string }> = {
  low: { bg: "rgba(16,185,129,0.12)", color: "#10B981" },
  medium: { bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  high: { bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
};

// R9: `view` splits this card into its two Founder Coaching leaves —
// "check" = stage guide + financial/legal readiness, "report" = rejection
// debrief + action plan. Unset renders the full card (workstation behavior).
function CoachingCard({
  startupId,
  userId,
  stage,
  view,
}: {
  startupId: string;
  userId: string;
  stage: string | null;
  view?: "check" | "report";
}) {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: session } = useQuery<import("@/lib/coaching-fn").CoachingSession | null>({
    queryKey: ["coaching-session", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { fetchLatestCoachingSession } = await import("@/lib/coaching-fn");
      return fetchLatestCoachingSession(startupId);
    },
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const jwt = authData?.session?.access_token ?? "";
      const { runFounderCoaching } = await import("@/lib/coaching-fn");
      const result = await runFounderCoaching({
        startupId,
        userId,
        triggerType: "manual",
        jwt,
      });
      qc.setQueryData(["coaching-session", startupId], result);
    } catch (err: any) {
      toast.error(err?.message ?? "Coaching session failed");
    } finally {
      setRunning(false);
    }
  };

  const SECTION: React.CSSProperties = {
    borderLeft: "3px solid var(--brand)",
    paddingLeft: 12,
    marginBottom: 16,
  };

  return (
    <div className="rounded-none border border-border/60 bg-card p-5 mt-4" data-testid="coaching-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: "rgba(124,58,237,0.12)" }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <div
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Founder Coaching
            </div>
            {session && (
              <div className="text-xs text-muted-foreground">
                {session.trigger_type} · {new Date(session.created_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          data-testid="run-coaching-btn"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground disabled:opacity-60"
          style={{ background: "var(--gradient-brand)" }}
        >
          {running ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running…
            </>
          ) : session ? (
            "Refresh"
          ) : (
            "Get Coaching"
          )}
        </button>
      </div>

      {!session && !running && (
        <div className="text-sm text-muted-foreground">
          Get a personalized coaching session — stage-specific guidance, financial
          and legal readiness, and a prioritized action plan.
        </div>
      )}

      {session && (
        <div className="space-y-4" data-testid="coaching-sections">

          {/* Section 1 — Stage guide */}
          {(!view || view === "check") && (
          <div data-testid="coaching-stage-guide">
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#A855F7", letterSpacing: "0.1em" }}
            >
              What investors at {session.stage ?? stage ?? "this stage"} expect
            </div>
            <div style={SECTION}>
              <div className="text-sm text-foreground leading-relaxed">{session.stage_guide}</div>
            </div>
          </div>
          )}

          {/* Section 2 — Financial & Legal */}
          {(!view || view === "check") && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: "var(--color-muted)", border: "var(--color-border)" }}
              data-testid="coaching-financial"
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.08em" }}
              >
                Financial readiness
              </div>
              <div className="text-sm text-foreground leading-relaxed">{session.financial}</div>
            </div>
            <div
              className="rounded-lg px-3 py-3"
              style={{ background: "var(--color-muted)", border: "var(--color-border)" }}
              data-testid="coaching-legal"
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.08em" }}
              >
                Legal readiness
              </div>
              <div className="text-sm text-foreground leading-relaxed">{session.legal}</div>
            </div>
          </div>
          )}

          {/* Section 3 — Rejection debrief (conditional) */}
          {(!view || view === "report") && session.rejection_debrief && (
            <div
              className="rounded-lg px-4 py-3"
              style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
              data-testid="coaching-rejection"
            >
              <div
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#EF4444", letterSpacing: "0.08em" }}
              >
                Why this investor passed
              </div>
              <div className="text-sm text-foreground leading-relaxed">{session.rejection_debrief}</div>
            </div>
          )}

          {/* Section 4 — Action plan */}
          {(!view || view === "report") && (
          <div data-testid="coaching-action-plan">
            <div
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--color-muted-foreground)", letterSpacing: "0.1em" }}
            >
              Action plan
            </div>
            <div className="space-y-2">
              {(session.action_plan ?? []).map((item: import("@/lib/coaching-fn").CoachingActionItem) => {
                const effortStyle = EFFORT_STYLES[item.effort] ?? EFFORT_STYLES.medium;
                return (
                  <div
                    key={item.priority}
                    className="flex items-start gap-3 rounded-lg px-3 py-3"
                    style={{ background: "var(--color-muted)", border: "var(--color-border)" }}
                    data-testid="coaching-action-item"
                  >
                    <div
                      className="shrink-0 grid h-6 w-6 place-items-center rounded-full text-xs font-bold"
                      style={{ background: "rgba(124,58,237,0.2)", color: "#A855F7" }}
                    >
                      {item.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{item.action}</div>
                      <div className="text-xs mt-1 text-muted-foreground">
                        {item.why}
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-xs font-semibold rounded px-2 py-0.5 capitalize"
                      style={{ background: effortStyle.bg, color: effortStyle.color }}
                      data-testid="coaching-effort-badge"
                    >
                      {item.effort}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function FounderHome() {
  const { user } = useAuth();
  const [latestScoreRun, setLatestScoreRun] = useState<ScoreRun | null>(null);
  const [latestSimRun, setLatestSimRun] = useState<import("@/lib/investor-sim-fn").SimRun | null>(null);

  const { data: startup, isLoading } = useQuery({
    queryKey: ["home-startup", user?.id],
    enabled: !!user?.id && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, profile_slug, stage, sector, completeness_score")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Load latest score run on mount for AI panel context
  useEffect(() => {
    if (!startup?.id) return;
    import("@/lib/readiness-fn").then(({ fetchLatestScoreRun }) => {
      fetchLatestScoreRun(startup.id, supabase).then((run) => {
        if (run) setLatestScoreRun(run);
      });
    });
  }, [startup?.id]);

  // Load latest sim run on mount for AI panel context
  useEffect(() => {
    if (!startup?.id) return;
    import("@/lib/investor-sim-fn").then(({ fetchLatestSimRun }) => {
      fetchLatestSimRun(startup.id).then((run) => {
        if (run) setLatestSimRun(run);
      });
    });
  }, [startup?.id]);

  // Fetch latest readiness snapshot for PageGuide live context
  const { data: readinessSnap } = useQuery<ReadinessResult | null>({
    queryKey: ["readiness-snap-home", startup?.id],
    enabled: !!startup?.id && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { computeReadiness } = await import("@/lib/readiness-fn");
      return computeReadiness({ data: { startup_id: startup!.id, founder_user_id: user!.id } });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground " />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="rounded-none border border-dashed border-border/60 bg-card p-8 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium mb-1">No company profile yet</div>
          <div className="text-xs text-muted-foreground mb-4">
            Build your profile to start verification, claim proof, and track investor activity.
          </div>
          <Link
            to="/app/profile-builder"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            Build my profile
          </Link>
        </div>
      </div>
    );
  }

  // Build live data string for PageGuide AI context
  const homeLiveData = readinessSnap
    ? [
        `Company: ${startup.company_name ?? "Not set"} | Stage: ${(startup as any).stage ?? "Not set"} | Sector: ${(startup as any).sector ?? "Not set"}`,
        `Readiness score: ${readinessSnap.readiness_score}/100 | Gate passed: ${readinessSnap.gate_passed}`,
        `Verification score: ${readinessSnap.verification_score}/100`,
        `Claims: ${readinessSnap.claims_verified_count} verified of ${readinessSnap.claims_total_count} total`,
        `Last simulation score: ${readinessSnap.latest_sim_score != null ? `${readinessSnap.latest_sim_score}/10` : "not run"}`,
        readinessSnap.gate_blockers.length > 0
          ? `Blockers:\n${readinessSnap.gate_blockers.map((b) => `  - [${b.type}] ${b.message}`).join("\n")}`
          : "No blockers — gate is passing.",
      ].join("\n")
    : "Readiness data not yet loaded.";

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-lg font-bold tracking-tight text-foreground"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Workstation
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Build your profile. Prepare for investors.
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <PageGuide
            pageId="home"
            liveData={homeLiveData}
            startupContext={{
              companyName: startup.company_name ?? undefined,
              stage: (startup as any).stage ?? undefined,
              sector: (startup as any).sector ?? undefined,
            }}
          />
        </div>
      </div>

      <VerificationCard
        startupId={startup.id}
        userId={user!.id}
        profileSlug={startup.profile_slug}
      />
      <ReadinessCard
        startupId={startup.id}
        userId={user!.id}
      />
      <DealActivityCard
        startupId={startup.id}
        profileSlug={startup.profile_slug ?? null}
        companyName={startup.company_name ?? null}
      />

      <ScoreAuditCard
        startupId={startup.id}
        userId={user!.id}
        onScoreRun={(run) => setLatestScoreRun(run)}
      />

      <InvestorSimCard
        startupId={startup.id}
        userId={user!.id}
        onSimRun={(run) => setLatestSimRun(run)}
      />

      <CoachingCard
        startupId={startup.id}
        userId={user!.id}
        stage={(startup as any).stage ?? null}
      />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// R9 extraction — each Investment Readiness / Founder Coaching leaf renders one
// of the workstation cards above under its own route; card logic untouched.
// ─────────────────────────────────────────────────────────────────────────────

export type FounderReadinessCard =
  | "investor-simulation"
  | "investment-audit"
  | "coaching-check"
  | "coaching-report";

const READINESS_LEAF_COPY: Record<FounderReadinessCard, { title: string; description: string }> = {
  "investor-simulation": {
    title: "Investor Simulation",
    description: "Simulate a first-pass investor review of your profile.",
  },
  "investment-audit": {
    title: "Investment Audit",
    description: "AI-scored investor readiness with factor breakdown and gaps.",
  },
  "coaching-check": {
    title: "Full Profile & Documents Check",
    description: "Stage-specific guidance on your financial and legal readiness.",
  },
  "coaching-report": {
    title: "Full Report & Flags",
    description: "Your prioritized action plan and flagged risks.",
  },
};

export function FounderReadinessLeaf({ card }: { card: FounderReadinessCard }) {
  const { user } = useAuth();

  const { data: startup, isLoading } = useQuery({
    queryKey: ["home-startup", user?.id],
    enabled: !!user?.id && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, profile_slug, stage, sector, completeness_score")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground " />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="rounded-none border border-dashed border-border/60 bg-card p-8 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium mb-1">No company profile yet</div>
          <div className="text-xs text-muted-foreground mb-4">
            Build your profile first — these tools analyze it.
          </div>
          <Link
            to="/app/prepare/profile-builder/quick-setup"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            Build my profile
          </Link>
        </div>
      </div>
    );
  }

  const copy = READINESS_LEAF_COPY[card];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-2">
        <h1
          className="text-lg font-bold tracking-tight text-foreground"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          {copy.title}
        </h1>
        <p className="text-sm mt-1 text-muted-foreground">{copy.description}</p>
      </div>

      {card === "investor-simulation" && (
        <InvestorSimCard startupId={startup.id} userId={user!.id} />
      )}
      {card === "investment-audit" && (
        <ScoreAuditCard startupId={startup.id} userId={user!.id} />
      )}
      {card === "coaching-check" && (
        <CoachingCard startupId={startup.id} userId={user!.id} stage={(startup as any).stage ?? null} view="check" />
      )}
      {card === "coaching-report" && (
        <CoachingCard startupId={startup.id} userId={user!.id} stage={(startup as any).stage ?? null} view="report" />
      )}
    </div>
  );
}

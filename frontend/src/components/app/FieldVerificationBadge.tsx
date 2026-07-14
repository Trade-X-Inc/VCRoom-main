/**
 * FieldVerificationBadge — renders the correct verification badge for any
 * profile field based on its bucket in field_classifications.
 *
 * Classification is fetched once per session from the DB and cached in a
 * module-level Map so individual badge renders are free of network calls.
 *
 * The parent is responsible for passing live verification/claim state.
 * This component is pure display — it does not fetch DB data itself.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle2, AlertTriangle, Clock, XCircle, Lock, Users,
} from "lucide-react";
import type { ClaimStatus } from "@/lib/claims-fn";

// ── Types ──────────────────────────────────────────────────────────────────

export type FieldBucket =
  | "hockystick_verified"
  | "ai_cross_checkable"
  | "cannot_verify"
  | "counterparty_verifies";

export interface FieldClassification {
  field_name: string;
  profile_type: "startup" | "investor";
  bucket: FieldBucket;
}

export interface FieldVerificationBadgeProps {
  /** Which profile type: 'startup' or 'investor' */
  profileType: "startup" | "investor";
  /** Field name exactly as stored in field_classifications */
  fieldName: string;

  // Verification state — provided by parent (avoids per-badge DB fetches)
  /**
   * For 'hockystick_verified' fields:
   * true if the underlying Tier 1 check passed for this entity.
   */
  tier1Passed?: boolean;

  /**
   * For 'ai_cross_checkable' fields:
   * the current proof_status from startup_claims / investor_claims.
   * If undefined (no claim row yet), renders as "Unverified — attach proof".
   */
  claimStatus?: ClaimStatus;

  /** Called when user clicks "Attach proof" — parent opens the modal */
  onAttachProof?: () => void;

  /** compact: no label text, just icon */
  compact?: boolean;
}

// ── Module-level classification cache ─────────────────────────────────────
// Shared across all badge instances; fetched once per session.

type CacheKey = `${string}:${string}`;

let classificationCache: Map<CacheKey, FieldBucket> | null = null;
let cachePromise: Promise<void> | null = null;

async function ensureCache(): Promise<void> {
  if (classificationCache) return;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const { data } = await supabase
      .from("field_classifications")
      .select("field_name, profile_type, bucket");

    classificationCache = new Map();
    for (const row of data ?? []) {
      const key: CacheKey = `${row.profile_type}:${row.field_name}`;
      classificationCache.set(key, row.bucket as FieldBucket);
    }
  })();

  return cachePromise;
}

export function getBucketCached(
  profileType: "startup" | "investor",
  fieldName: string,
): FieldBucket | null {
  if (!classificationCache) return null;
  return classificationCache.get(`${profileType}:${fieldName}`) ?? null;
}

/** Eagerly warm the cache (call once in app root or profile pages). */
export function prewarmClassificationCache() {
  ensureCache().catch(() => null);
}

// ── Badge sub-components ───────────────────────────────────────────────────

function HockystickVerifiedBadge({
  passed,
  compact,
}: {
  passed: boolean | undefined;
  compact: boolean;
}) {
  if (passed) {
    return (
      <span
        title="Hockystick verified — automated checks passed"
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
        style={{
          background: "rgba(16,185,129,0.12)",
          border: "1px solid rgba(16,185,129,0.2)",
          color: "#10B981",
        }}
      >
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {!compact && "Verified ✓"}
      </span>
    );
  }
  // Not yet verified — show neutral "pending" state, not an error
  return (
    <span
      title="Not yet verified by Hockystick"
      className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
      style={{
        background: "var(--accent)",
        border: "1px solid var(--border)",
        color: "var(--faint)",
      }}
    >
      <Clock className="h-3 w-3 shrink-0" />
      {!compact && "Not yet verified"}
    </span>
  );
}

function AiCrossCheckBadge({
  claimStatus,
  onAttachProof,
  compact,
}: {
  claimStatus: ClaimStatus | undefined;
  onAttachProof?: () => void;
  compact: boolean;
}) {
  if (!claimStatus || claimStatus === "unverified") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
        style={{
          background: "rgba(245,158,11,0.12)",
          border: "1px solid rgba(245,158,11,0.25)",
          color: "#F59E0B",
        }}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {!compact && "Unverified"}
        {!compact && onAttachProof && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAttachProof(); }}
            className="ml-1 underline underline-offset-2 hover:opacity-70"
            style={{ color: "inherit", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
          >
            — attach proof
          </button>
        )}
      </span>
    );
  }

  if (claimStatus === "pending_review") {
    return (
      <span
        title="Proof attached — AI check in progress"
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
        style={{
          background: "var(--accent)",
          border: "1px solid var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <Clock className="h-3 w-3 shrink-0" />
        {!compact && "Proof attached"}
      </span>
    );
  }

  if (claimStatus === "ai_confirmed") {
    return (
      <span
        title="AI confirmed — document supports this claim"
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
        style={{
          background: "rgba(16,185,129,0.12)",
          border: "1px solid rgba(16,185,129,0.2)",
          color: "#10B981",
        }}
      >
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        {!compact && "AI confirmed"}
      </span>
    );
  }

  if (claimStatus === "ai_mismatch") {
    return (
      <span
        title="Document does not match this claim"
        className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
        style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "#EF4444",
        }}
      >
        <XCircle className="h-3 w-3 shrink-0" />
        {!compact && "Claim mismatch"}
        {!compact && onAttachProof && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAttachProof(); }}
            className="ml-1 underline underline-offset-2 hover:opacity-70"
            style={{ color: "inherit", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
          >
            Re-attach
          </button>
        )}
      </span>
    );
  }

  return null;
}

function CannotVerifyBadge({
  profileType,
  compact,
}: {
  profileType: "startup" | "investor";
  compact: boolean;
}) {
  const label = profileType === "investor"
    ? "Investor's stated view"
    : "Founder's stated view";
  return (
    <span
      title={`This is a ${profileType === "investor" ? "investor" : "founder"} perspective — not a verifiable fact`}
      className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
      style={{
        background: "var(--accent)",
        border: "1px solid var(--border)",
        color: "var(--faint)",
      }}
    >
      <Lock className="h-3 w-3 shrink-0" />
      {!compact && label}
    </span>
  );
}

function CounterpartyVerifiesBadge({
  profileType,
  compact,
}: {
  profileType: "startup" | "investor";
  compact: boolean;
}) {
  const who = profileType === "startup" ? "investor" : "founder";
  return (
    <span
      title={`Confirm this with the ${who} directly — not independently verifiable here`}
      className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5"
      style={{
        background: "var(--accent)",
        border: "1px solid var(--border)",
        color: "var(--faint)",
      }}
    >
      <Users className="h-3 w-3 shrink-0" />
      {!compact && `Confirm with ${who} directly`}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function FieldVerificationBadge({
  profileType,
  fieldName,
  tier1Passed,
  claimStatus,
  onAttachProof,
  compact = false,
}: FieldVerificationBadgeProps) {
  const [bucket, setBucket] = useState<FieldBucket | null>(
    () => getBucketCached(profileType, fieldName),
  );

  useEffect(() => {
    if (bucket) return; // already resolved from cache
    ensureCache().then(() => {
      setBucket(getBucketCached(profileType, fieldName));
    }).catch(() => null);
  }, [profileType, fieldName, bucket]);

  if (!bucket) return null; // field not in field_classifications — no badge

  switch (bucket) {
    case "hockystick_verified":
      return <HockystickVerifiedBadge passed={tier1Passed} compact={compact} />;

    case "ai_cross_checkable":
      return (
        <AiCrossCheckBadge
          claimStatus={claimStatus}
          onAttachProof={onAttachProof}
          compact={compact}
        />
      );

    case "cannot_verify":
      return <CannotVerifyBadge profileType={profileType} compact={compact} />;

    case "counterparty_verifies":
      return <CounterpartyVerifiesBadge profileType={profileType} compact={compact} />;

    default:
      return null;
  }
}

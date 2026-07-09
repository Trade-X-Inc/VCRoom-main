// Single source of truth for verification tier computation.
// Every surface that shows a tier reads current_tier, and current_tier is
// only ever written by recomputeVerificationTier. Never hardcode tier logic
// anywhere else.

import { createServerFn } from "@tanstack/react-start";

export interface TierBreakdown {
  tier: 0 | 1 | 2 | 3 | 4;
  tier1_passed: boolean;
  verified_claims: number;
  verified_financial_claims: number;
  tier2_met: boolean;
  operational_docs_verified: number;
  tier3_human_reviewed: boolean;
  tier3_met: boolean;
  tier4_signed_off: boolean;
}

async function sbGet(url: string, key: string, path: string): Promise<any> {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) throw new Error(`GET ${path} ${resp.status}`);
  return resp.json();
}

/**
 * Recompute a startup's verification tier from primary evidence and persist
 * current_tier (+ derived tier2_passed) to founder_verifications.
 *
 * Gates (each requires all prior gates):
 *   1 — tier1_passed: all four identity checks passed
 *   2 — >= 3 claims with ai_verdict 'verified', >= 1 of them financial
 *   3 — all 3 operational docs AI-verified AND tier3_passed (human review,
 *       set only by admin tooling)
 *   4 — tier4_passed (named-reviewer sign-off, set only by admin tooling)
 */
export async function recomputeVerificationTier(
  sbUrl: string,
  sbKey: string,
  startupId: string,
): Promise<TierBreakdown> {
  const [verifRows, claimRows] = await Promise.all([
    sbGet(sbUrl, sbKey,
      `founder_verifications?startup_id=eq.${startupId}&select=tier1_passed,operational_bank_verified,operational_contract_verified,operational_team_verified,tier3_passed,tier4_passed,current_tier`
    ).catch(() => []),
    sbGet(sbUrl, sbKey,
      `startup_claims?startup_id=eq.${startupId}&select=ai_verdict,claim_category`
    ).catch(() => []),
  ]);

  const v = verifRows?.[0] ?? null;
  const tier1_passed = v?.tier1_passed === true;

  const verified = (claimRows ?? []).filter((c: any) => c.ai_verdict === "verified");
  const verified_claims = verified.length;
  const verified_financial_claims = verified.filter((c: any) => c.claim_category === "financial").length;
  const tier2_met = tier1_passed && verified_claims >= 3 && verified_financial_claims >= 1;

  const operational_docs_verified =
    (v?.operational_bank_verified ? 1 : 0) +
    (v?.operational_contract_verified ? 1 : 0) +
    (v?.operational_team_verified ? 1 : 0);
  const tier3_human_reviewed = v?.tier3_passed === true;
  const tier3_met = tier2_met && operational_docs_verified >= 3 && tier3_human_reviewed;

  const tier4_signed_off = v?.tier4_passed === true;

  const tier: TierBreakdown["tier"] =
    tier3_met && tier4_signed_off ? 4
    : tier3_met ? 3
    : tier2_met ? 2
    : tier1_passed ? 1
    : 0;

  // Persist — current_tier is written here and nowhere else.
  if (v && (v.current_tier !== tier || (tier2_met !== undefined))) {
    await fetch(`${sbUrl}/rest/v1/founder_verifications?startup_id=eq.${startupId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        current_tier: tier,
        tier2_passed: tier2_met,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => null);
  }

  return {
    tier,
    tier1_passed,
    verified_claims,
    verified_financial_claims,
    tier2_met,
    operational_docs_verified,
    tier3_human_reviewed,
    tier3_met,
    tier4_signed_off,
  };
}

// ── Client-callable wrapper ───────────────────────────────────────────────────

export const calculateVerificationTier = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { startup_id: string })
  .handler(async ({ data }): Promise<TierBreakdown | null> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
    const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!url || !key) return null;
    return recomputeVerificationTier(url, key, data.startup_id);
  });

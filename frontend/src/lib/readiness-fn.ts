import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessBlocker = {
  type: "verification" | "claims" | "simulation";
  message: string;
  action_url: string;
};

export type ReadinessResult = {
  startup_id: string;
  verification_score: number;    // tier1_score (0-100)
  claims_verified_count: number;
  claims_total_count: number;
  latest_sim_score: number | null; // null = never run
  readiness_score: number;       // weighted 0-100
  gate_passed: boolean;
  gate_blockers: ReadinessBlocker[];
  computed_at: string;
  // Previous snapshot for delta
  prev_readiness_score: number | null;
};

type ComputeInput = { startup_id: string; founder_user_id: string };

// Key claim types that block the gate when unverified
const KEY_CLAIM_TYPES = ["revenue", "arr", "customer_count"];

// ─── Server function ──────────────────────────────────────────────────────────

export const computeReadiness = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ComputeInput => d as ComputeInput)
  .handler(async ({ data }): Promise<ReadinessResult> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return emptyResult(data.startup_id, "db_unavailable");
    }

    const base = supabaseUrl;
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    };

    // ── Fetch all three signals in parallel ───────────────────────────────────
    const [verifResp, claimsResp, simResp, prevResp] = await Promise.all([
      // 1. Verification score
      fetch(
        `${base}/rest/v1/founder_verifications?startup_id=eq.${data.startup_id}&select=tier1_score,tier1_passed&limit=1`,
        { headers }
      ).catch(() => null),

      // 2. Claims — all rows
      fetch(
        `${base}/rest/v1/startup_claims?startup_id=eq.${data.startup_id}&select=claim_type,proof_status`,
        { headers }
      ).catch(() => null),

      // 3. Most recent simulation result
      fetch(
        `${base}/rest/v1/advisor_messages?user_id=eq.${data.founder_user_id}&simulation_result=not.is.null&select=simulation_result,created_at&order=created_at.desc&limit=1`,
        { headers }
      ).catch(() => null),

      // 4. Previous readiness snapshot (for delta)
      fetch(
        `${base}/rest/v1/readiness_snapshots?startup_id=eq.${data.startup_id}&select=readiness_score,computed_at&order=computed_at.desc&limit=2`,
        { headers }
      ).catch(() => null),
    ]);

    // ── Parse responses ───────────────────────────────────────────────────────
    const verifRows: any[] = verifResp?.ok ? await verifResp.json().catch(() => []) : [];
    const claimsRows: any[] = claimsResp?.ok ? await claimsResp.json().catch(() => []) : [];
    const simRows: any[] = simResp?.ok ? await simResp.json().catch(() => []) : [];
    const prevRows: any[] = prevResp?.ok ? await prevResp.json().catch(() => []) : [];

    const verif = verifRows[0] ?? null;
    const tier1_score: number = verif?.tier1_score ?? 0;
    const tier1_passed: boolean = verif?.tier1_passed ?? false;

    const claims_total = claimsRows.length;
    const claims_verified = claimsRows.filter(
      (c) => c.proof_status === "ai_confirmed" || c.proof_status === "human_confirmed"
    ).length;
    // Claims with unverified key fields (revenue/arr/customer_count)
    const key_unverified = claimsRows.filter(
      (c) => KEY_CLAIM_TYPES.includes(c.claim_type) && c.proof_status === "unverified"
    );

    const simResult: any = simRows[0]?.simulation_result ?? null;
    const sim_score: number | null = simResult?.score != null ? Number(simResult.score) : null;

    // Previous snapshot (for delta) — skip the most-recent one (we haven't inserted yet)
    // prevRows[0] = most recent existing snapshot (before this run)
    const prev_readiness_score: number | null = prevRows[0]?.readiness_score ?? null;

    // ── Compute weighted readiness score ──────────────────────────────────────
    //
    // Verification: 40% weight (tier1_score is already 0-100)
    // Claims:       30% weight (verified/total * 100; 0 if no claims; no division-by-zero)
    // Simulation:   30% weight (sim_score/10 * 100; 0 if never run)
    //
    const verification_component = (tier1_score / 100) * 40;
    const claims_component = claims_total > 0
      ? (claims_verified / claims_total) * 30
      : 0; // no claims → 0 points, not 30 — no reward for an empty state
    const simulation_component = sim_score != null
      ? (sim_score / 10) * 30
      : 0; // never run → 0

    const readiness_score = Math.round(
      verification_component + claims_component + simulation_component
    );

    // ── Gate pass condition ───────────────────────────────────────────────────
    //
    // Requires ALL of:
    //   - readiness_score >= 70
    //   - tier1_passed = true
    //   - no unverified KEY claims (revenue, ARR, customer_count)
    //
    const gate_passed =
      readiness_score >= 70 &&
      tier1_passed === true &&
      key_unverified.length === 0;

    // ── Build blockers — only for things actually wrong ───────────────────────
    const gate_blockers: ReadinessBlocker[] = [];

    if (!tier1_passed || tier1_score < 60) {
      const needed = Math.max(0, 60 - tier1_score);
      gate_blockers.push({
        type: "verification",
        message: `Verification score is ${tier1_score}/100 — ${needed} more points needed to pass the 60-point threshold`,
        action_url: "/app/home",
      });
    }

    if (claims_total === 0) {
      gate_blockers.push({
        type: "claims",
        message: "No claims added yet — add revenue, customer count, or traction claims and attach proof",
        action_url: "/app/profile",
      });
    } else if (claims_verified < claims_total) {
      const unverifiedTypes = claimsRows
        .filter((c) => c.proof_status === "unverified")
        .map((c) => c.claim_type)
        .join(", ");
      gate_blockers.push({
        type: "claims",
        message: `${claims_total - claims_verified} of ${claims_total} claims unverified (${unverifiedTypes}) — attach proof documents`,
        action_url: "/app/profile",
      });
    }

    if (sim_score === null) {
      gate_blockers.push({
        type: "simulation",
        message: "No investor simulation run yet — go to Documents and run the investor simulation",
        action_url: "/app/documents",
      });
    } else if (sim_score < 6) {
      const simResult2 = simRows[0]?.simulation_result;
      const dealKiller = simResult2?.deal_killer ?? simResult2?.red_flag ?? "key weaknesses";
      const truncated = String(dealKiller).slice(0, 120);
      gate_blockers.push({
        type: "simulation",
        message: `Last investor simulation scored ${sim_score}/10 — address before outreach: ${truncated}`,
        action_url: "/app/documents",
      });
    }

    // ── Insert new readiness snapshot ─────────────────────────────────────────
    const computed_at = new Date().toISOString();
    await fetch(`${base}/rest/v1/readiness_snapshots`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        startup_id: data.startup_id,
        verification_score: tier1_score,
        claims_verified_count: claims_verified,
        claims_total_count: claims_total,
        latest_sim_score: sim_score,
        readiness_score,
        gate_passed,
        gate_blockers,
        computed_at,
      }),
    }).catch(() => null);

    return {
      startup_id: data.startup_id,
      verification_score: tier1_score,
      claims_verified_count: claims_verified,
      claims_total_count: claims_total,
      latest_sim_score: sim_score,
      readiness_score,
      gate_passed,
      gate_blockers,
      computed_at,
      prev_readiness_score,
    };
  });

function emptyResult(startup_id: string, _reason: string): ReadinessResult {
  return {
    startup_id,
    verification_score: 0,
    claims_verified_count: 0,
    claims_total_count: 0,
    latest_sim_score: null,
    readiness_score: 0,
    gate_passed: false,
    gate_blockers: [],
    computed_at: new Date().toISOString(),
    prev_readiness_score: null,
  };
}

// ─── AI Score Audit types + functions ─────────────────────────────────────────

export type ScoreRunFactor = {
  score: number;
  max: number;
  reasoning: string;
};

export type ScoreRunGap = {
  field: string;
  impact_points: number;
  message: string;
};

export type ScoreRun = {
  id: string;
  startup_id: string;
  score: number;
  confidence_lo: number;
  confidence_hi: number;
  factor_breakdown: Record<string, ScoreRunFactor>;
  data_gaps: ScoreRunGap[];
  top_action: string;
  sim_preview: string | null;
  prev_score: number | null;
  created_at: string;
};

const EDGE_URL = "https://ldimninnjlvxozubheib.supabase.co/functions/v1/run-readiness-score";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM3MTA2MTYsImV4cCI6MjAyOTI4NjYxNn0.wLFUJmHMy0_5f5CZxE5P5CflK0v8Mop0iHLrj73uqFY";

// Client-side function — called from browser, not a server fn.
// We keep it here alongside the types so callers import from one place.
export async function runReadinessScore(
  startupId: string,
  userId: string,
  jwt: string,
): Promise<ScoreRun> {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ startup_id: startupId, user_id: userId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as ScoreRun;
}

export async function fetchLatestScoreRun(
  startupId: string,
  supabaseClient: any,
): Promise<ScoreRun | null> {
  const { data } = await supabaseClient
    .from("readiness_score_runs")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

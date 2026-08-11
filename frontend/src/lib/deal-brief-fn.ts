// ─────────────────────────────────────────────────────────────────────────────
// A4 Deal Brief Agent — edge-function wrappers
// investor_id = investor's auth user_id (FK → users.id in deal_briefs)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";

const DEAL_BRIEF_EDGE_URL =
  "https://ldimninnjlvxozubheib.supabase.co/functions/v1/generate-deal-brief";
const DEAL_BRIEF_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM3MTA2MTYsImV4cCI6MjAyOTI4NjYxNn0.wLFUJmHMy0_5f5CZxE5P5CflK0v8Mop0iHLrj73uqFY";

export type AgentDealBrief = {
  id: string;
  investor_id: string;
  startup_id: string;
  match_score: number;
  headline: string | null;
  investment_thesis: string | null;
  key_metrics: Record<string, unknown> | null;
  document_readiness: Record<string, unknown> | null;
  strengths: string[];
  red_flags: string[];
  suggested_questions: string[];
  overall_verdict: string | null;
  verdict_signal: "positive" | "neutral" | "negative";
  generated_at: string;
  viewed_at: string | null;
};

export async function runDealBrief({
  startupId,
  investorId,
  userId,
  jwt,
}: {
  startupId: string;
  investorId: string;
  userId: string;
  jwt: string;
}): Promise<AgentDealBrief> {
  const res = await fetch(DEAL_BRIEF_EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: DEAL_BRIEF_ANON_KEY,
    },
    body: JSON.stringify({ startup_id: startupId, investor_id: investorId, user_id: userId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as AgentDealBrief;
}

export async function fetchDealBrief(
  investorId: string,
  startupId: string,
): Promise<AgentDealBrief | null> {
  const { data } = await supabase
    .from("deal_briefs")
    .select("*")
    .eq("investor_id", investorId)
    .eq("startup_id", startupId)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function markBriefViewed(briefId: string): Promise<void> {
  const { error } = await supabase
    .from("deal_briefs")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", briefId);
  if (error) console.error("[deal-brief] mark viewed failed:", error.message);
}

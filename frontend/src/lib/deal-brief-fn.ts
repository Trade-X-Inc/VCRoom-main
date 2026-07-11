import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

type BriefInput = { dealRoomId: string; userId: string; openAIKey?: string };

export interface DealBriefResult {
  matchScore: number;
  matchLabel: string;
  strengths: string[];
  risks: string[];
  mitigants: string[];
  nextAction: string;
}

export const generateDealBrief = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): BriefInput => data as BriefInput)
  .handler(async ({ data }: { data: BriefInput }): Promise<DealBriefResult> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const serviceKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return {
        matchScore: 72, matchLabel: "Moderate fit",
        strengths: ["Early-stage traction", "Clear market opportunity", "Experienced team"],
        risks: ["Market competition", "Execution risk", "Capital requirements"],
        mitigants: ["Strong domain expertise", "Clear differentiation", "Advisory support"],
        nextAction: "Schedule a discovery call to understand the team and traction better.",
      };
    }
    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1. Verify investor is a member of this deal room
    const { data: member } = await adminClient
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) throw new Error("Unauthorized");

    // 2. Fetch deal room + startup profile
    const { data: room } = await adminClient
      .from("deal_rooms")
      .select("startup_id")
      .eq("id", data.dealRoomId)
      .single();

    const { data: startup } = room?.startup_id
      ? await adminClient
          .from("startups")
          .select("company_name, sector, stage, funding_target, traction, description")
          .eq("id", room.startup_id)
          .maybeSingle()
      : { data: null };

    // 3. Fetch recent activities
    const { data: activities } = await adminClient
      .from("activities")
      .select("action, created_at")
      .eq("deal_room_id", data.dealRoomId)
      .order("created_at", { ascending: false })
      .limit(10);

    // 4. Build prompt
    const activitySummary = (activities ?? []).map((a) => a.action).join(", ");
    const companyName = startup?.company_name ?? "Unknown startup";

    const userPrompt = `Analyze this startup for investment:
Company: ${companyName}
Sector: ${startup?.sector ?? "Unknown"}
Stage: ${startup?.stage ?? "Unknown"}
Funding target: ${startup?.funding_target ?? "Unknown"}
Traction: ${startup?.traction ?? "Unknown"}
Description: ${startup?.description ?? "None provided"}
Recent activity: ${activitySummary || "None"}`;

    // 5. Call OpenAI
    const cfEnv = (globalThis as any).__cf_env || {};
    const apiKey = cfEnv.OPENAI_API_KEY || getEnvVar("OPENAI_API_KEY");
    if (!apiKey) {
      // Graceful fallback when OpenAI is not configured
      return {
        matchScore: 72,
        matchLabel: "Moderate fit",
        strengths: ["Early-stage traction", "Clear market opportunity", "Experienced team"],
        risks: ["Market competition", "Execution risk", "Capital requirements"],
        mitigants: ["Strong domain expertise", "Clear differentiation", "Advisory support"],
        nextAction: "Schedule a discovery call to understand the team and traction better.",
      };
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are an investment analyst. Respond ONLY with valid JSON. No markdown, no code fences, no explanation.
{"matchScore":0-100,"matchLabel":"Strong fit|Moderate fit|Weak fit","strengths":["...","...","..."],"risks":["...","...","..."],"mitigants":["...","...","..."],"nextAction":"..."}`,
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) throw new Error("OpenAI request failed");

    const json = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = json.choices[0]?.message?.content ?? "";

    if (!raw.trim()) {
      console.error("[deal-brief-fn] Empty content from OpenAI");
      throw new Error("AI returned empty response");
    }

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: DealBriefResult;
    try {
      parsed = JSON.parse(cleaned) as DealBriefResult;
    } catch (e) {
      console.error("[deal-brief-fn] JSON parse failed, raw:", cleaned.slice(0, 200));
      throw new Error("AI returned malformed JSON");
    }

    if (typeof parsed.matchScore !== "number" || !Array.isArray(parsed.strengths)) {
      throw new Error("Invalid AI response shape");
    }

    return parsed;
  });

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

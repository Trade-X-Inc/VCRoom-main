import { supabase } from "@/lib/supabase";

export type CoachingActionItem = {
  priority: number;
  action: string;
  why: string;
  effort: "low" | "medium" | "high";
};

export type CoachingSession = {
  id: string;
  startup_id: string;
  trigger_type: "stage_change" | "rejection" | "manual" | "score_drop";
  trigger_data: Record<string, unknown> | null;
  stage: string | null;
  stage_guide: string;
  financial: string;
  legal: string;
  rejection_debrief: string | null;
  action_plan: CoachingActionItem[];
  created_at: string;
};

const EDGE_URL =
  "https://ldimninnjlvxozubheib.supabase.co/functions/v1/run-founder-coaching";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM3MTA2MTYsImV4cCI6MjAyOTI4NjYxNn0.wLFUJmHMy0_5f5CZxE5P5CflK0v8Mop0iHLrj73uqFY";

export async function runFounderCoaching({
  startupId,
  userId,
  triggerType,
  triggerData,
  jwt,
}: {
  startupId: string;
  userId: string;
  triggerType: CoachingSession["trigger_type"];
  triggerData?: Record<string, unknown>;
  jwt: string;
}): Promise<CoachingSession> {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      startup_id: startupId,
      user_id: userId,
      trigger_type: triggerType,
      trigger_data: triggerData ?? null,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as CoachingSession;
}

export async function fetchLatestCoachingSession(
  startupId: string,
): Promise<CoachingSession | null> {
  const { data } = await supabase
    .from("coaching_sessions")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

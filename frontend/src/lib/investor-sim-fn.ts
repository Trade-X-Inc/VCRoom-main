import { supabase } from "@/lib/supabase";

export type SimRun = {
  id: string;
  startup_id: string;
  first_question: string;
  red_flag: string;
  strongest_point: string;
  kill_risk: string;
  investor_persona_used: string | null;
  created_at: string;
};

const EDGE_URL =
  "https://ldimninnjlvxozubheib.supabase.co/functions/v1/run-investor-sim";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM3MTA2MTYsImV4cCI6MjAyOTI4NjYxNn0.wLFUJmHMy0_5f5CZxE5P5CflK0v8Mop0iHLrj73uqFY";

export async function runInvestorSim(
  startupId: string,
  userId: string,
  jwt: string,
): Promise<SimRun> {
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
  return json as SimRun;
}

export async function fetchLatestSimRun(startupId: string): Promise<SimRun | null> {
  const { data } = await supabase
    .from("investor_sim_runs")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

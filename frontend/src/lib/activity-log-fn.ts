import { supabase } from "@/lib/supabase";

export interface ActivityLogEntry {
  account_type: "investor" | "founder";
  account_id: string;
  actor_user_id: string;
  actor_name: string;
  action_type: string;
  target_label: string;
  detail: string;
}

export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    await supabase.from("activity_log").insert({
      account_type: entry.account_type,
      account_id: entry.account_id,
      actor_user_id: entry.actor_user_id,
      actor_name: entry.actor_name,
      action_type: entry.action_type,
      target_label: entry.target_label,
      detail: entry.detail,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Fire-and-forget — never block the main action on a log failure
  }
}

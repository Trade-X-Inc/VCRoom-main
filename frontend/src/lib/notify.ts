import { supabase } from "@/lib/supabase";

/**
 * Insert an in-app notification with the columns the notifications table
 * actually has. Replaces createNotification() in lib/supabase.ts, which
 * inserted a nonexistent deal_room_id column and omitted the NOT NULL
 * `kind` — so every call failed silently.
 *
 * `kind` must be in the notifications_kind_check allowlist.
 */
export async function notifyUser(opts: {
  userId: string;
  kind: string;
  title: string;
  body: string;
  actionUrl?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: opts.userId,
    kind: opts.kind,
    title: opts.title,
    body: opts.body,
    read: false,
    action_url: opts.actionUrl ?? null,
    meta: opts.meta ?? null,
  });
  if (error) console.warn(`[notify] insert failed (kind=${opts.kind}):`, error.message);
}

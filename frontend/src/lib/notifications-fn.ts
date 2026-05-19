import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── getNotifications ─────────────────────────────────────────────────────────
export const getNotifications = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { userId: string; userAccessToken: string } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: notifs, error } = await sb
      .from("notifications")
      .select("id, kind, title, body, read, meta, created_at")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { notifications: [], unreadCount: 0 };
    const notifications = notifs ?? [];
    const unreadCount = notifications.filter((n) => !n.read).length;
    return { notifications, unreadCount };
  });

// ─── markNotificationRead ─────────────────────────────────────────────────────
export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { notificationId: string; userId: string; userAccessToken: string } =>
      data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("id", data.notificationId)
      .eq("user_id", data.userId); // scope to owner
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── markAllNotificationsRead ─────────────────────────────────────────────────
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { userId: string; userAccessToken: string } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("user_id", data.userId)
      .eq("read", false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

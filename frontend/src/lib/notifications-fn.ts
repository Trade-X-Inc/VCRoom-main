import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getSupabase(token: string) {
  const url =
    process.env.VITE_SUPABASE_URL ||
    (globalThis as any).VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (globalThis as any).SUPABASE_URL ||
    "";
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    (globalThis as any).VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    (globalThis as any).SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ─── getNotifications: fetch all notifications for current user ──────────────
export const getNotifications = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { userId: string; userAccessToken: string } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
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

// ─── markNotificationRead: mark one notification as read ─────────────────────
export const markNotificationRead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { notificationId: string; userAccessToken: string } =>
      data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("id", data.notificationId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── markAllRead: mark all notifications as read for a user ─────────────────
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { userId: string; userAccessToken: string } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("user_id", data.userId)
      .eq("read", false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

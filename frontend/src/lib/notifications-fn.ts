import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminClient(url?: string, key?: string) {
  const cfEnv = (globalThis as any).__cf_env || {};
  const resolvedUrl = url || cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const resolvedKey = key || cfEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!resolvedUrl || !resolvedKey)
    throw new Error(`Missing Supabase config URL:${!!resolvedUrl} KEY:${!!resolvedKey}`);
  return createClient(resolvedUrl, resolvedKey, { auth: { persistSession: false } });
}

// ─── getNotifications ─────────────────────────────────────────────────────────
export const getNotifications = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
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
    (data: unknown): {
      notificationId: string; userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("id", data.notificationId)
      .eq("user_id", data.userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── markAllNotificationsRead ─────────────────────────────────────────────────
export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("user_id", data.userId)
      .eq("read", false);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

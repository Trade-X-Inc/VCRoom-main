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

// ─── getDDData ────────────────────────────────────────────────────────────────
export const getDDData = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Verify user is a member
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { categories: [], items: [], error: "Unauthorized" };

    // Seed if first time
    const { data: existing } = await sb
      .from("dd_categories")
      .select("id")
      .eq("deal_room_id", data.dealRoomId)
      .limit(1);

    if (!existing || existing.length === 0) {
      await sb.rpc("seed_dd_for_deal_room", { p_deal_room_id: data.dealRoomId });
    }

    const [{ data: categories }, { data: items }] = await Promise.all([
      sb
        .from("dd_categories")
        .select("id, category, status, investor_notes, updated_at")
        .eq("deal_room_id", data.dealRoomId)
        .order("category"),
      sb
        .from("dd_checklist_items")
        .select("id, category, label, checked")
        .eq("deal_room_id", data.dealRoomId)
        .order("created_at"),
    ]);

    return { categories: categories ?? [], items: items ?? [] };
  });

// ─── updateDDStatus ───────────────────────────────────────────────────────────
export const updateDDStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; category: string; status: string;
      userAccessToken: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_categories")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("deal_room_id", data.dealRoomId)
      .eq("category", data.category);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── updateDDNotes ────────────────────────────────────────────────────────────
export const updateDDNotes = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userId: string; category: string; notes: string;
      userAccessToken: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_categories")
      .update({ investor_notes: data.notes, updated_at: new Date().toISOString() })
      .eq("deal_room_id", data.dealRoomId)
      .eq("category", data.category);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── toggleChecklistItem ──────────────────────────────────────────────────────
export const toggleChecklistItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      itemId: string; userId: string; dealRoomId: string; checked: boolean;
      userAccessToken: string; supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { error } = await sb
      .from("dd_checklist_items")
      .update({ checked: data.checked })
      .eq("id", data.itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

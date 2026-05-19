import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// ─── helpers ─────────────────────────────────────────────────────────────────
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

// ─── types ───────────────────────────────────────────────────────────────────
type TokenInput = { userAccessToken: string };

// ─── getDDData: fetch categories + checklist for a deal room ─────────────────
export const getDDData = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { dealRoomId: string } & TokenInput =>
      data as { dealRoomId: string } & TokenInput,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);

    // Seed categories if none exist yet
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

// ─── updateDDStatus: investor updates category status ────────────────────────
export const updateDDStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string;
      category: string;
      status: string;
      userAccessToken: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
    const { error } = await sb
      .from("dd_categories")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("deal_room_id", data.dealRoomId)
      .eq("category", data.category);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── updateDDNotes: investor saves notes for a category ──────────────────────
export const updateDDNotes = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string;
      category: string;
      notes: string;
      userAccessToken: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
    const { error } = await sb
      .from("dd_categories")
      .update({ investor_notes: data.notes, updated_at: new Date().toISOString() })
      .eq("deal_room_id", data.dealRoomId)
      .eq("category", data.category);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── toggleChecklistItem: check/uncheck a checklist item ─────────────────────
export const toggleChecklistItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      itemId: string;
      checked: boolean;
      userAccessToken: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
    const { error } = await sb
      .from("dd_checklist_items")
      .update({ checked: data.checked })
      .eq("id", data.itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

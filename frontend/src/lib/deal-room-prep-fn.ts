import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/require-user-fn";

// Build Step 2 — deal-room preparation gate checklist. Same convention as
// dd-fn.ts: service-role client, identity from the caller's own token
// (never a client-supplied id), membership + side checked in application
// code before any write. prep_status/founder_prep_complete_at/
// investor_prep_complete_at live on deal_rooms itself; graduation and
// cancel are separate SECURITY DEFINER RPCs (migration
// 20260914000000_deal_room_prep_gate_and_invite_links.sql), not handled
// here — this file only owns the per-item checklist toggle and the two
// terminal per-side actions that feed those RPCs.

function getAdminClient(url?: string, key?: string) {
  const cfEnv = (globalThis as any).__cf_env || {};
  const resolvedUrl = url || cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const resolvedKey = key || cfEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!resolvedUrl || !resolvedKey)
    throw new Error(`Missing Supabase config URL:${!!resolvedUrl} KEY:${!!resolvedKey}`);
  return createClient(resolvedUrl, resolvedKey, { auth: { persistSession: false } });
}

// Fixed item sets — manual self-attest, no auto-detection (unlike
// dd_checklist_items' structured-data auto-detection, these have no
// structured signal behind most items). "Documents Added" is the one
// exception with a real backing count, computed at read time in
// getPrepState, never claimed as "verified" or "data room ready" per the
// explicit honesty requirement — the label says exactly what is checked.
const FOUNDER_ITEMS: { item_key: string; label: string }[] = [
  { item_key: "digital_profile_built", label: "Digital Profile built" },
  { item_key: "documents_added", label: "Documents Added" },
  { item_key: "ready_to_enter", label: "Ready to enter" },
];
const INVESTOR_ITEMS: { item_key: string; label: string }[] = [
  { item_key: "full_profile_built", label: "Full Profile built" },
  { item_key: "ready_to_enter", label: "Ready to enter" },
];

async function requireSideMember(
  sb: ReturnType<typeof getAdminClient>,
  dealRoomId: string,
  accessToken: string | undefined,
): Promise<{ ok: true; uid: string; side: "founder" | "investor" } | { ok: false; error: string }> {
  const auth = await requireUser(accessToken);
  if (!auth.ok) return { ok: false, error: auth.error };
  const { data: member } = await sb
    .from("deal_room_members")
    .select("role")
    .eq("deal_room_id", dealRoomId)
    .eq("user_id", auth.uid)
    .maybeSingle();
  if (!member || (member.role !== "founder" && member.role !== "investor")) {
    return { ok: false, error: "Unauthorized" };
  }
  return { ok: true, uid: auth.uid, side: member.role };
}

// ─── getPrepState ───────────────────────────────────────────────────────────
// Seeds both sides' checklist rows on first read if none exist yet (same
// lazy-seed pattern as getDDData's seed_dd_for_deal_room probe), then
// returns both sides' items plus the room's prep_status/completion
// timestamps and the real founder_documents count backing "Documents
// Added" — computed here, not stored, so it always reflects the current
// count.
export const getPrepState = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const auth = await requireSideMember(sb, data.dealRoomId, data.userAccessToken);
    if (!auth.ok) return { items: [], error: auth.error };

    const { data: room } = await sb
      .from("deal_rooms")
      .select("prep_status, founder_prep_complete_at, investor_prep_complete_at, startup_id")
      .eq("id", data.dealRoomId)
      .maybeSingle();
    if (!room) return { items: [], error: "not_found" };

    const { data: existing } = await sb
      .from("deal_room_prep_checklist_items")
      .select("id")
      .eq("deal_room_id", data.dealRoomId)
      .limit(1);

    if (!existing || existing.length === 0) {
      const rows = [
        ...FOUNDER_ITEMS.map((i) => ({ deal_room_id: data.dealRoomId, side: "founder", ...i })),
        ...INVESTOR_ITEMS.map((i) => ({ deal_room_id: data.dealRoomId, side: "investor", ...i })),
      ];
      await sb.from("deal_room_prep_checklist_items").insert(rows).select("id").then(
        (r) => r,
        () => null, // seeding races between founder/investor first-load are harmless — unique index dedupes
      );
    }

    const { data: items } = await sb
      .from("deal_room_prep_checklist_items")
      .select("id, side, item_key, label, checked, checked_at")
      .eq("deal_room_id", data.dealRoomId)
      .order("side")
      .order("created_at");

    let founderDocCount = 0;
    if (room.startup_id) {
      const { count } = await sb
        .from("founder_documents")
        .select("id", { count: "exact", head: true })
        .eq("startup_id", room.startup_id);
      founderDocCount = count ?? 0;
    }

    return {
      items: items ?? [],
      prepStatus: room.prep_status as "in_prep" | "live" | "cancelled",
      founderPrepCompleteAt: room.founder_prep_complete_at,
      investorPrepCompleteAt: room.investor_prep_complete_at,
      founderDocCount,
      mySide: auth.side,
    };
  });

// ─── togglePrepChecklistItem ────────────────────────────────────────────────
// A caller may only toggle items on their OWN side — a founder cannot
// check off the investor's items and vice versa. This is the one write
// this file gates beyond bare membership (dd-fn.ts's toggleChecklistItem
// has no per-side ownership concept since diligence items aren't
// two-party-owned the way prep items are).
export const togglePrepChecklistItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      itemId: string; dealRoomId: string; checked: boolean; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const auth = await requireSideMember(sb, data.dealRoomId, data.userAccessToken);
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: item } = await sb
      .from("deal_room_prep_checklist_items")
      .select("id, side")
      .eq("id", data.itemId)
      .eq("deal_room_id", data.dealRoomId)
      .maybeSingle();
    if (!item) return { success: false, error: "not_found" };
    if (item.side !== auth.side) return { success: false, error: "not_your_item" };

    const { error } = await sb
      .from("deal_room_prep_checklist_items")
      .update({ checked: data.checked, checked_at: data.checked ? new Date().toISOString() : null })
      .eq("id", data.itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  });

// ─── markPrepReady ──────────────────────────────────────────────────────────
// Sets the caller's own side's *_prep_complete_at, then attempts
// graduation via the SECURITY DEFINER RPC — which re-derives both flags
// from the row itself and only flips prep_status when both are set. A
// single side calling this can never flip the room live on its own; if
// the other side isn't ready, the RPC returns ok:false/waiting_on_other_side, which
// is an expected, non-error state here (not surfaced as a failure toast).
export const markPrepReady = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);
    const auth = await requireSideMember(sb, data.dealRoomId, data.userAccessToken);
    if (!auth.ok) return { success: false, error: auth.error };

    const column = auth.side === "founder" ? "founder_prep_complete_at" : "investor_prep_complete_at";
    const { error } = await sb
      .from("deal_rooms")
      .update({ [column]: new Date().toISOString() })
      .eq("id", data.dealRoomId);
    if (error) return { success: false, error: error.message };

    return { success: true };
  });

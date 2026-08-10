// Deal-room-core — gateway actions for deal_rooms column-scoped reads
// (Stage 1 proving run, CLAUDE.md §20.1). Membership-authorized via the
// pack_api room_get_* functions (migration 20260809050000), which call the
// authz_* primitives (9398d03) plus authz_is_room_lawyer (20260809030000)
// for the two functions the lawyer is narrowed out of.
//
// Authorization is enforced in the pack_api functions, matching the RLS
// this group replaces (traced, not assumed — see step-2 trace, CLAUDE.md
// §20.1): every function requires authz_is_deal_room_member; room_get_media
// and room_get_workflow_state additionally exclude the lawyer (media in
// full; workflow_state only on qa_completed_at/qa_completed_by — deal
// summary and term sheet are NOT narrowed, matching (b)'s documented
// scope); room_get_investor_memo is self-scoped to investor_user_id, not
// membership-scoped — a founder who is a genuine member still gets
// forbidden.
//
// Only room_get_term_sheet is wired here (Stage 1). The other five follow
// in Stage 2 once this pattern is confirmed against a real consumer.

import { defineAction, type JsonValue } from "./gateway";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

type Obj = { [k: string]: JsonValue };

function makeRoomGetAction(name: string, fn: string) {
  return defineAction<{ dealRoomId: string }, Obj>({
    name,
    class: "read",
    validate: (raw) => {
      const r = raw as { dealRoomId?: unknown };
      if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
      return { dealRoomId: r.dealRoomId };
    },
    authorize: async () => true, // authorization enforced in the pack_api function
    handle: async (ctx, input): Promise<Obj> => {
      const { data, error } = await ctx.sb.schema("pack_api").rpc(fn, {
        p_uid: ctx.uid, p_deal_room_id: input.dealRoomId,
      });
      if (error) throw new Error(`${fn}: ${error.message}`);
      const res = data as { ok: boolean; error?: string } & Obj;
      if (!res.ok) throw new Error(res.error ?? `${fn}_failed`);
      return res;
    },
    record: (input) => ({ objectType: "deal_room", objectId: input.dealRoomId, data: { read: name } }),
  });
}

export const roomGetTermSheet = makeRoomGetAction("deal_room.getTermSheet", "room_get_term_sheet");
export const roomGetIdentity = makeRoomGetAction("deal_room.getIdentity", "room_get_identity");
export const roomGetWorkflowState = makeRoomGetAction("deal_room.getWorkflowState", "room_get_workflow_state");
export const roomGetDealTerms = makeRoomGetAction("deal_room.getDealTerms", "room_get_deal_terms");
export const roomGetMedia = makeRoomGetAction("deal_room.getMedia", "room_get_media");

// ── Multi-room list functions (migration 20260810000000) ────────────────
// Different shape from the room_get_* single-room reads above: these take
// startup_id (founder-scoped) or nothing but the caller's own uid
// (investor-scoped, membership-wide) — not dealRoomId. Three separate
// functions, not a shared factory forced onto a mismatched signature, same
// reasoning as building three SQL functions instead of one superset.
// Empty result is {ok:true, rooms:[]} — a genuinely different envelope
// from {ok:false, error:"forbidden"}, not a coincidental empty array; see
// CLAUDE.md §20.1. A caller must never see []-on-success collapsed into a
// thrown error here.

type RoomListOutput = { rooms: JsonValue[] } & Obj;

function makeRoomListByStartupAction(name: string, fn: string) {
  return defineAction<{ startupId: string }, RoomListOutput>({
    name,
    class: "read",
    validate: (raw) => {
      const r = raw as { startupId?: unknown };
      if (!isUuid(r?.startupId)) throw new Error("startupId must be a uuid");
      return { startupId: r.startupId };
    },
    authorize: async () => true, // authorization enforced in the pack_api function
    handle: async (ctx, input): Promise<RoomListOutput> => {
      const { data, error } = await ctx.sb.schema("pack_api").rpc(fn, {
        p_uid: ctx.uid, p_startup_id: input.startupId,
      });
      if (error) throw new Error(`${fn}: ${error.message}`);
      const res = data as { ok: boolean; error?: string; rooms?: JsonValue[] } & Obj;
      if (!res.ok) throw new Error(res.error ?? `${fn}_failed`);
      return res as RoomListOutput;
    },
    record: (input) => ({ objectType: "startup", objectId: input.startupId, data: { list: name } }),
  });
}

export const roomListByStartup = makeRoomListByStartupAction("deal_room.listByStartup", "room_list_by_startup");
export const roomListProgressFounder = makeRoomListByStartupAction("deal_room.listProgressFounder", "room_list_progress_founder");

// Spans every room the caller is a member of — no single room or startup
// to scope the record entry to. Call with scopeId = the caller's own
// user.id (their personal record partition for this kind of cross-room
// read), not a room_id or startup_id — there isn't one.
export const roomListProgressInvestor = defineAction<Record<string, never>, RoomListOutput>({
  name: "deal_room.listProgressInvestor",
  class: "read",
  validate: () => ({}),
  authorize: async () => true, // authorization enforced in the pack_api function (membership + lawyer exclusion)
  handle: async (ctx): Promise<RoomListOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("room_list_progress_investor", {
      p_uid: ctx.uid,
    });
    if (error) throw new Error(`room_list_progress_investor: ${error.message}`);
    const res = data as { ok: boolean; error?: string; rooms?: JsonValue[] } & Obj;
    if (!res.ok) throw new Error(res.error ?? "room_list_progress_investor_failed");
    return res as RoomListOutput;
  },
  record: () => ({ objectType: "deal_room_list", objectId: null, data: { list: "deal_room.listProgressInvestor" } }),
});

// ── Write functions with optimistic concurrency (migration 20260810010000)
// §20.4 error semantics: DealTermsCard.tsx and DDWorkstation.tsx's
// product_images write directly with no conflict detection today — two
// concurrent edits silently overwrite each other (product_images: real
// data loss, not just a conflict; see CLAUDE.md §7.4). Both writes are
// whole-row compare-and-swap on updated_at, not field-level — a caller
// whose expectedUpdatedAt no longer matches the row gets 'conflict',
// distinguishable from 'forbidden' (not the founder) and 'not_found'.
// class: "prepare", not "commit" — neither action is irreversible or
// closes/signs/accepts anything (§8.2 tool classes).

type DealTermsInput = {
  dealRoomId: string; expectedUpdatedAt: string;
  fundingStage: string | null; fundingAsk: string | null; preMoneyValuation: string | null;
  equityOffered: string | null; previousRounds: JsonValue; keyMetrics: JsonValue;
};
type ConflictableOutput = Obj & { conflict?: boolean };

export const roomUpdateDealTerms = defineAction<DealTermsInput, ConflictableOutput>({
  name: "deal_room.updateDealTerms",
  class: "prepare",
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (typeof r?.expectedUpdatedAt !== "string") throw new Error("expectedUpdatedAt required");
    return {
      dealRoomId: r.dealRoomId as string,
      expectedUpdatedAt: r.expectedUpdatedAt as string,
      fundingStage: (r.fundingStage as string) ?? null,
      fundingAsk: (r.fundingAsk as string) ?? null,
      preMoneyValuation: (r.preMoneyValuation as string) ?? null,
      equityOffered: (r.equityOffered as string) ?? null,
      previousRounds: (r.previousRounds as JsonValue) ?? [],
      keyMetrics: (r.keyMetrics as JsonValue) ?? {},
    };
  },
  authorize: async () => true, // authorization enforced in the pack_api function (founder-only)
  handle: async (ctx, input): Promise<ConflictableOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("room_update_deal_terms", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId, p_expected_updated_at: input.expectedUpdatedAt,
      p_funding_stage: input.fundingStage, p_funding_ask: input.fundingAsk,
      p_pre_money_valuation: input.preMoneyValuation, p_equity_offered: input.equityOffered,
      p_previous_rounds: input.previousRounds, p_key_metrics: input.keyMetrics,
    });
    if (error) throw new Error(`room_update_deal_terms: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    // 'conflict' is returned to the caller as data, NOT thrown — the
    // client needs to distinguish it from a real failure (session expiry,
    // forbidden, not_found), which callAction's throw-on-!ok would
    // otherwise collapse into one generic catch block.
    if (!res.ok && res.error === "conflict") return { conflict: true };
    if (!res.ok) throw new Error(res.error ?? "room_update_deal_terms_failed");
    return res;
  },
  record: (input, output) => ({
    objectType: "deal_room", objectId: input.dealRoomId,
    data: { action: "updateDealTerms", conflict: !!output.conflict },
  }),
});

type ProductImageInput = { dealRoomId: string; expectedUpdatedAt: string; imageUrl: string };

export const roomAppendProductImage = defineAction<ProductImageInput, ConflictableOutput>({
  name: "deal_room.appendProductImage",
  class: "prepare",
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (typeof r?.expectedUpdatedAt !== "string") throw new Error("expectedUpdatedAt required");
    if (typeof r?.imageUrl !== "string" || !r.imageUrl.trim()) throw new Error("imageUrl required");
    return { dealRoomId: r.dealRoomId as string, expectedUpdatedAt: r.expectedUpdatedAt as string, imageUrl: r.imageUrl as string };
  },
  authorize: async () => true, // authorization enforced in the pack_api function (founder-only)
  handle: async (ctx, input): Promise<ConflictableOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("room_append_product_image", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId,
      p_expected_updated_at: input.expectedUpdatedAt, p_image_url: input.imageUrl,
    });
    if (error) throw new Error(`room_append_product_image: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok && res.error === "conflict") return { conflict: true };
    if (!res.ok) throw new Error(res.error ?? "room_append_product_image_failed");
    return res;
  },
  record: (input, output) => ({
    objectType: "deal_room", objectId: input.dealRoomId,
    data: { action: "appendProductImage", conflict: !!output.conflict },
  }),
});

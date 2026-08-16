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

import { createServerFn } from "@tanstack/react-start";
import {
  runAction,
  type ActionDef,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";

// EVERY action in this file binds its own TOP-LEVEL createServerFn. That is a
// hard requirement of TanStack Start's server-fn transform, not a style
// choice: the transform is a compile-time AST rewrite that only finds
// statically-analysable top-level createServerFn(...).handler(...) calls. A
// createServerFn produced by a factory is never found, so its handler ships to
// the CLIENT and runs in the browser — which is exactly the bug this file's
// previous shape caused (CLAUDE.md §20.11). The factories below therefore
// build plain `def` OBJECTS; they must never return a server function.
//
// Enforced by eslint (src/lib/actions/** shape) AND by
// scripts/check-action-split.mjs, which fails the build if any handler body
// from this directory reaches dist/client.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);

type Obj = { [k: string]: JsonValue };

// Shared envelope validator — identical for every action; the transform only
// cares about the createServerFn/.handler() call being top-level.
const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

function roomGetDef(
  name: string,
  fn: string,
): ActionDef<{ dealRoomId: string }, Obj> {
  return {
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
        p_uid: ctx.uid,
        p_deal_room_id: input.dealRoomId,
      });
      if (error) throw new Error(`${fn}: ${error.message}`);
      const res = data as { ok: boolean; error?: string } & Obj;
      if (!res.ok) throw new Error(res.error ?? `${fn}_failed`);
      return res;
    },
    record: (input) => ({
      objectType: "deal_room",
      objectId: input.dealRoomId,
      data: { read: name },
    }),
  };
}

const termSheetDef = roomGetDef(
  "deal_room.getTermSheet",
  "room_get_term_sheet",
);
export const roomGetTermSheet = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(termSheetDef, data),
  );

const identityDef = roomGetDef("deal_room.getIdentity", "room_get_identity");
export const roomGetIdentity = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(identityDef, data),
  );

const workflowStateDef = roomGetDef(
  "deal_room.getWorkflowState",
  "room_get_workflow_state",
);
export const roomGetWorkflowState = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(workflowStateDef, data),
  );

const dealTermsDef = roomGetDef(
  "deal_room.getDealTerms",
  "room_get_deal_terms",
);
export const roomGetDealTerms = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(dealTermsDef, data),
  );

const mediaDef = roomGetDef("deal_room.getMedia", "room_get_media");
export const roomGetMedia = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> => runAction(mediaDef, data),
  );

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

function roomListByStartupDef(
  name: string,
  fn: string,
): ActionDef<{ startupId: string }, RoomListOutput> {
  return {
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
        p_uid: ctx.uid,
        p_startup_id: input.startupId,
      });
      if (error) throw new Error(`${fn}: ${error.message}`);
      const res = data as {
        ok: boolean;
        error?: string;
        rooms?: JsonValue[];
      } & Obj;
      if (!res.ok) throw new Error(res.error ?? `${fn}_failed`);
      return res as RoomListOutput;
    },
    record: (input) => ({
      objectType: "startup",
      objectId: input.startupId,
      data: { list: name },
    }),
  };
}

const listByStartupDef = roomListByStartupDef(
  "deal_room.listByStartup",
  "room_list_by_startup",
);
export const roomListByStartup = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(listByStartupDef, data),
  );

const listProgressFounderDef = roomListByStartupDef(
  "deal_room.listProgressFounder",
  "room_list_progress_founder",
);
export const roomListProgressFounder = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(listProgressFounderDef, data),
  );

// Spans every room the caller is a member of — no single room or startup
// to scope the record entry to. Call with scopeId = the caller's own
// user.id (their personal record partition for this kind of cross-room
// read), not a room_id or startup_id — there isn't one.
const listProgressInvestorDef: ActionDef<
  Record<string, never>,
  RoomListOutput
> = {
  name: "deal_room.listProgressInvestor",
  class: "read",
  validate: () => ({}),
  authorize: async () => true, // authorization enforced in the pack_api function (membership + lawyer exclusion)
  handle: async (ctx): Promise<RoomListOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("room_list_progress_investor", {
        p_uid: ctx.uid,
      });
    if (error) throw new Error(`room_list_progress_investor: ${error.message}`);
    const res = data as {
      ok: boolean;
      error?: string;
      rooms?: JsonValue[];
    } & Obj;
    if (!res.ok)
      throw new Error(res.error ?? "room_list_progress_investor_failed");
    return res as RoomListOutput;
  },
  record: () => ({
    objectType: "deal_room_list",
    objectId: null,
    data: { list: "deal_room.listProgressInvestor" },
  }),
};
export const roomListProgressInvestor = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(listProgressInvestorDef, data),
  );

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
  dealRoomId: string;
  expectedUpdatedAt: string;
  fundingStage: string | null;
  fundingAsk: string | null;
  preMoneyValuation: string | null;
  equityOffered: string | null;
  previousRounds: JsonValue;
  keyMetrics: JsonValue;
};
type ConflictableOutput = Obj & { conflict?: boolean };

const updateDealTermsDef: ActionDef<DealTermsInput, ConflictableOutput> = {
  name: "deal_room.updateDealTerms",
  class: "prepare",
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (typeof r?.expectedUpdatedAt !== "string")
      throw new Error("expectedUpdatedAt required");
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
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("room_update_deal_terms", {
        p_uid: ctx.uid,
        p_deal_room_id: input.dealRoomId,
        p_expected_updated_at: input.expectedUpdatedAt,
        p_funding_stage: input.fundingStage,
        p_funding_ask: input.fundingAsk,
        p_pre_money_valuation: input.preMoneyValuation,
        p_equity_offered: input.equityOffered,
        p_previous_rounds: input.previousRounds,
        p_key_metrics: input.keyMetrics,
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
    objectType: "deal_room",
    objectId: input.dealRoomId,
    data: { action: "updateDealTerms", conflict: !!output.conflict },
  }),
};
export const roomUpdateDealTerms = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(updateDealTermsDef, data),
  );

type ProductImageInput = {
  dealRoomId: string;
  expectedUpdatedAt: string;
  imageUrl: string;
};

const appendProductImageDef: ActionDef<ProductImageInput, ConflictableOutput> =
  {
    name: "deal_room.appendProductImage",
    class: "prepare",
    validate: (raw) => {
      const r = raw as Record<string, unknown>;
      if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
      if (typeof r?.expectedUpdatedAt !== "string")
        throw new Error("expectedUpdatedAt required");
      if (typeof r?.imageUrl !== "string" || !r.imageUrl.trim())
        throw new Error("imageUrl required");
      return {
        dealRoomId: r.dealRoomId as string,
        expectedUpdatedAt: r.expectedUpdatedAt as string,
        imageUrl: r.imageUrl as string,
      };
    },
    authorize: async () => true, // authorization enforced in the pack_api function (founder-only)
    handle: async (ctx, input): Promise<ConflictableOutput> => {
      const { data, error } = await ctx.sb
        .schema("pack_api")
        .rpc("room_append_product_image", {
          p_uid: ctx.uid,
          p_deal_room_id: input.dealRoomId,
          p_expected_updated_at: input.expectedUpdatedAt,
          p_image_url: input.imageUrl,
        });
      if (error) throw new Error(`room_append_product_image: ${error.message}`);
      const res = data as { ok: boolean; error?: string } & Obj;
      if (!res.ok && res.error === "conflict") return { conflict: true };
      if (!res.ok)
        throw new Error(res.error ?? "room_append_product_image_failed");
      return res;
    },
    record: (input, output) => ({
      objectType: "deal_room",
      objectId: input.dealRoomId,
      data: { action: "appendProductImage", conflict: !!output.conflict },
    }),
  };
export const roomAppendProductImage = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(appendProductImageDef, data),
  );

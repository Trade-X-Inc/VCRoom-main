// Deal-room closing — gateway action for the worked atomicity-fix example
// (CLAUDE.md's deal-room record-atomicity entry, 24 Sep 2026).
//
// SCOPE, DELIBERATE: confirmDeliverable ONLY. The other closing-stage
// commit events named in the recon (finalize_counsel_waiver, lawyer invite
// creation/acceptance, the other closing-fn.ts gate exports, and
// advance_workflow_stage) are explicitly NOT touched here — same pattern,
// separate pass, once this one is proven live. Do not extend this file
// with more actions as a side effect of anything else.
//
// WHY confirmDeliverable IS SPECIAL, NOT THE GENERIC record() PATH: every
// other action in this codebase gets its record entry appended by
// runAction's own step 6, as a SEPARATE HTTP round-trip strictly after
// handle() returns. That is fine for a read, and tolerable for most writes
// (a failed append is a correctable records incident, not a data-integrity
// hole). It is NOT acceptable for this action: handle() closes the deal
// (finalize_deal_close sets deal_rooms.status='closed', trigger-guarded,
// mutual-confirmation-gated) — a non-atomic append after that commit would
// let "closed" exist with zero audit trail if the append step failed for
// any reason, which is a direct hit on the tamper-evident/certification
// claim the whole record chain exists to back. So this action sets
// recordedByHandler: true and does the append ITSELF, inside the SAME
// database transaction as the close, via finalize_deal_close's own new
// p_actor_id/p_action/p_object_type/p_object_id/p_data parameters (see the
// migration this ships with). def.record() is still the single declared
// TypeScript contract for the payload shape — handle() calls it directly,
// by reference, before building the RPC args, so the payload sent to SQL
// is provably the same value record() would have produced, not a
// hand-rolled duplicate that happens to look similar.

import { createServerFn } from "@tanstack/react-start";
import {
  runAction,
  type ActionDef,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";

// Same top-level-only requirement as every other file in this directory —
// see deal-room-core.ts's header comment for the full §20.11 rationale.
// This file's own export below is a single top-level createServerFn.

const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);

type ConfirmDeliverableInput = { dealRoomId: string };

type ConfirmDeliverableOutput = {
  ok: true;
  closed: boolean;
  // Present only when this call is the one that actually closed the room
  // (entryWritten true) — surfaced for live verification / debugging, not
  // consumed by the current client UI, which only reads `closed`/`error`.
  entryWritten: boolean;
  seq: number | null;
  entryHash: string | null;
};

// Record payload — declared here, once, as the single TypeScript source of
// truth for what this action's audit entry contains (property #2 of the
// atomicity design: the SQL function decides nothing about payload shape,
// it only performs the mechanical write of what it's handed). Referenced
// by BOTH the ActionDef's own `record` field (so the type system still
// requires every ActionDef to declare one, uniformly) and by handle()
// itself, by direct reference — not reimplemented a second time — so the
// payload actually sent into the atomic SQL write is provably the same
// value this function produces, not a hand-rolled duplicate that happens
// to look similar.
function buildConfirmDeliverableRecord(
  input: ConfirmDeliverableInput,
  output: ConfirmDeliverableOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room",
    objectId: input.dealRoomId,
    data: {
      action: "confirm_deliverable",
      closed: output.closed,
    },
  };
}

// Record payload for a PARTIAL confirmation — one principal committing to
// close while the counterparty hasn't yet. Found missing during live
// verification (24 Sep 2026): the terminal close (bothConfirmed path,
// above) was the only branch of this action that ever wrote a record
// entry, so a founder confirming delivery — a real, consequential state
// change to deal_room_close — left zero audit trail unless and until the
// investor also confirmed. A partial confirm is a distinct event from the
// close itself (different actor may not be the one who eventually
// triggers bothConfirmed) and gets its own action name/payload rather than
// silently piggy-backing on confirm_deliverable's own shape.
function buildPartialConfirmRecord(
  input: ConfirmDeliverableInput,
  role: "founder" | "investor",
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room",
    objectId: input.dealRoomId,
    data: {
      action: "confirm_deliverable_partial",
      confirmedBy: role,
    },
  };
}

const confirmDeliverableDef: ActionDef<
  ConfirmDeliverableInput,
  ConfirmDeliverableOutput
> = {
  name: "deal_room.confirmDeliverable",
  class: "commit",
  requiresStepUp: true,
  // Atomicity fix — see this file's header and gateway.ts's own doc comment
  // on the field. handle() does the record append itself, inside
  // finalize_deal_close's own transaction; the gateway's generic step-6
  // append is skipped for this action so exactly one entry is written per
  // confirmation, never a second non-atomic one on top.
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    return { dealRoomId: r.dealRoomId };
  },
  // Mirrors closing-fn.ts's existing authorizePrincipal()/principalRole()
  // logic exactly: founder/investor room members only. A lawyer resolves to
  // no matching row (role filter excludes 'lawyer') and is rejected — same
  // fail-closed shape as every other principal-only check in this codebase.
  authorize: async (ctx, input) => {
    const { data, error } = await ctx.sb
      .from("deal_room_members")
      .select("role")
      .eq("deal_room_id", input.dealRoomId)
      .eq("user_id", ctx.uid)
      .in("role", ["founder", "investor"])
      .maybeSingle();
    if (error) return false;
    return data?.role === "founder" || data?.role === "investor";
  },
  handle: async (ctx, input): Promise<ConfirmDeliverableOutput> => {
    // Re-derive the caller's role (authorize() already proved it exists;
    // handle() needs the actual value to know which deal_room_close column
    // to set — same two-query shape closing-fn.ts's authorizePrincipal()
    // already used, ported verbatim rather than threading role through
    // ActionCtx, which no other action in this codebase needs).
    const { data: memberRow, error: memberErr } = await ctx.sb
      .from("deal_room_members")
      .select("role")
      .eq("deal_room_id", input.dealRoomId)
      .eq("user_id", ctx.uid)
      .in("role", ["founder", "investor"])
      .maybeSingle();
    if (memberErr || !memberRow) throw new Error("not_authorized");
    const role = memberRow.role as "founder" | "investor";

    // Room-already-closed short-circuit — matches closing-fn.ts's existing
    // roomIsClosed() check, kept as an early, cheap read before touching
    // deal_room_close at all. finalize_deal_close's own idempotent no-op
    // (below) is the real guarantee; this is a fast, friendlier failure
    // path for the ordinary case, not a substitute for it.
    const { data: roomRow } = await ctx.sb
      .from("deal_rooms")
      .select("status")
      .eq("id", input.dealRoomId)
      .maybeSingle();
    if (roomRow?.status === "closed") {
      const out: ConfirmDeliverableOutput = {
        ok: true,
        closed: true,
        entryWritten: false,
        seq: null,
        entryHash: null,
      };
      return out;
    }

    // Gate 6 clear — payment must already be founder-confirmed. Verbatim
    // from closing-fn.ts's confirmDeliverable.
    const { data: proofRows, error: proofErr } = await ctx.sb
      .from("deal_room_payment_proof")
      .select("id")
      .eq("deal_room_id", input.dealRoomId)
      .eq("founder_status", "confirmed")
      .limit(1);
    if (proofErr) throw new Error("payment_check_failed");
    if (!proofRows?.length) throw new Error("payment_not_confirmed");

    // Record this principal's own confirmation — upsert on deal_room_id,
    // same on_conflict/merge-duplicates shape as closing-fn.ts.
    const col =
      role === "investor"
        ? {
            investor_confirmed: true,
            investor_confirmed_at: new Date().toISOString(),
          }
        : {
            founder_confirmed: true,
            founder_confirmed_at: new Date().toISOString(),
          };
    const { error: upsertErr } = await ctx.sb
      .from("deal_room_close")
      .upsert(
        { deal_room_id: input.dealRoomId, ...col },
        { onConflict: "deal_room_id" },
      );
    if (upsertErr) throw new Error("confirm_write_failed");

    // Read back — if both sides are now confirmed, this call is the one
    // that finalizes the close.
    const { data: closeRow } = await ctx.sb
      .from("deal_room_close")
      .select("*")
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();

    const bothConfirmed =
      !!closeRow?.investor_confirmed &&
      !!closeRow?.founder_confirmed &&
      !closeRow?.closed_at;

    if (!bothConfirmed) {
      // This principal's own confirmation just committed above — a real
      // state change (deal_room_close.investor_confirmed/founder_confirmed
      // flipped true) that must be recorded even though the room isn't
      // closing yet. Called directly via pack_api.append_record (the
      // PostgREST-exposed, service-role-only wrapper — pack_v1 itself
      // isn't reachable via .schema('pack_v1'), same boundary every other
      // action in this codebase respects) rather than through
      // finalize_deal_close, since this path never touches deal_rooms.status
      // and has no close-guard GUC to satisfy — the same atomicity
      // machinery the terminal close needs would be pure overhead here.
      // This is its own single, non-atomic-with-the-upsert write (the
      // upsert above already committed), which is the ordinary, previously
      // -accepted gateway-append shape (§8.3) — the atomicity guarantee
      // this action exists to provide is specifically for the terminal
      // close (a closed room with no record of closing), not for every
      // intermediate state change on the path to it.
      const partialRec = buildPartialConfirmRecord(input, role);
      const { data: partialResult, error: partialRpcErr } = await ctx.sb
        .schema("pack_api")
        .rpc("append_record", {
          p_org_id: input.dealRoomId,
          p_actor_id: ctx.uid,
          p_actor_type: "human",
          p_action: "deal_room.confirmDeliverable.partial",
          p_object_type: partialRec.objectType,
          p_object_id: partialRec.objectId,
          p_data: partialRec.data ?? {},
        });
      // pack_api.append_record never raises to PostgREST — it catches its
      // own exceptions and returns {ok:false, error} in the JSON body with
      // a normal 200, so a transport-level `error` here and a logical
      // `{ok:false}` in `data` are two DIFFERENT failure shapes and both
      // must be checked; missing the second would silently report
      // entryWritten:true on a write that never actually happened.
      const partial = partialResult as
        | { ok: true; seq: number; entry_hash: string; id: string }
        | { ok: false; error: string }
        | null;
      if (partialRpcErr || !partial?.ok) {
        console.error(
          "[confirmDeliverable] partial-confirm record append failed (confirmation itself already committed):",
          partialRpcErr ?? (partial as { error?: string } | null)?.error,
        );
      }
      const out: ConfirmDeliverableOutput = {
        ok: true,
        closed: false,
        entryWritten: !!partial?.ok,
        seq: partial?.ok ? partial.seq : null,
        entryHash: partial?.ok ? partial.entry_hash : null,
      };
      return out;
    }

    // Invoice generation + closed_at stamp — verbatim from closing-fn.ts's
    // finalizeClose(), unchanged. Invoice failure does not block the close
    // (existing behavior: logged, close proceeds) — same here.
    const { data: feeRow } = await ctx.sb
      .from("deal_room_fees")
      .select("*")
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();
    const { data: summaryRow } = await ctx.sb
      .from("deal_room_summaries")
      .select("content")
      .eq("deal_room_id", input.dealRoomId)
      .eq("status", "active")
      .maybeSingle();
    const parties = (summaryRow?.content as any)?.parties ?? {};
    const now = new Date().toISOString();
    const dealRef = input.dealRoomId.slice(0, 8).toUpperCase();
    const mkInvoice = (billTo: "founder" | "investor", n: number) => ({
      deal_room_id: input.dealRoomId,
      invoice_number: `HS-${dealRef}-${billTo === "founder" ? "F" : "I"}${n}`,
      bill_to_role: billTo,
      content: {
        platform: "Lengdon",
        deal_room_ref: input.dealRoomId,
        deal_ref_short: dealRef,
        parties,
        deal_amount: feeRow?.deal_amount ?? null,
        fee_amount: feeRow?.calculated_fee ?? null,
        fee_payer: feeRow?.fee_payer ?? null,
        currency: "USD",
        payment_status: feeRow?.payment_status ?? null,
        payment_confirmed_at: now,
        generated_at: now,
        note: "Platform success fee for a deal closed through Lengdon.",
      },
    });
    const { error: invoiceErr } = await ctx.sb
      .from("deal_room_invoices")
      .insert([mkInvoice("founder", 1), mkInvoice("investor", 1)]);
    if (invoiceErr) {
      console.error(
        "[confirmDeliverable] invoice generation failed (close still proceeds):",
        invoiceErr,
      );
    }
    const { error: stampErr } = await ctx.sb
      .from("deal_room_close")
      .update({ closed_at: now })
      .eq("deal_room_id", input.dealRoomId);
    if (stampErr) throw new Error("close_stamp_failed");

    // Build the record payload via the SAME function declared on this
    // ActionDef's own `record` field — not a second, hand-rolled object —
    // then hand it into finalize_deal_close so the append happens inside
    // its transaction, atomically with the status='closed' write.
    const preliminaryOutput: ConfirmDeliverableOutput = {
      ok: true,
      closed: true,
      entryWritten: true, // best-effort declared intent; RPC result below is authoritative
      seq: null,
      entryHash: null,
    };
    const rec = buildConfirmDeliverableRecord(input, preliminaryOutput);

    const { data: closeResult, error: closeErr } = await ctx.sb.rpc(
      "finalize_deal_close",
      {
        p_deal_room_id: input.dealRoomId,
        p_actor_id: ctx.uid,
        p_action: confirmDeliverableDef.name,
        p_object_type: rec.objectType,
        p_object_id: rec.objectId,
        p_data: rec.data ?? {},
      },
    );
    if (closeErr) throw new Error(`finalize_deal_close: ${closeErr.message}`);
    const row = Array.isArray(closeResult) ? closeResult[0] : closeResult;

    return {
      ok: true,
      closed: !!row?.closed,
      entryWritten: !!row?.entry_written,
      seq: row?.seq ?? null,
      entryHash: row?.entry_hash ?? null,
    };
  },
  record: buildConfirmDeliverableRecord,
};

export const confirmDeliverable = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(confirmDeliverableDef, data),
  );

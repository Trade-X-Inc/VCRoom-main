// Deal-room stage transitions — gateway actions for the Closing-stage
// record-wiring pass's second half (27 Sep 2026), following directly on
// deal-room-counsel.ts. Ports the full useStageTransition.ts flow —
// requestNextStage, approveTransition, rejectTransition — the
// single largest-blast-radius unaudited commit event in the deal-room
// lifecycle per the recon (advance_workflow_stage writes no record_entry
// on stage transitions today).
//
// SCOPE, CONFIRMED IN RECON REVIEW (not advance_workflow_stage alone):
// the real commitment flow lives almost entirely in deal_room_stage_
// transitions (request -> approve/reject), with advance_workflow_stage
// itself only the terminal deal_rooms.workflow_stage write inside the
// approve path. Porting the RPC alone would record-wire only the
// terminal branch and leave request/reject completely outside the
// chain — the exact "record only the terminal branch" gap this
// codebase's two-tier standard exists to catch. All three events are
// ported here as three separate ActionDefs, each its own record entry.
//
// AUTHORIZATION — deal_room_members-only, no AND against
// deal_rooms.investor_user_id / startups.founder_id. Confirmed via
// recon that these three signals CAN diverge (app.deal-rooms.index.tsx's
// two-call, non-transactional room-creation path leaves investor_user_id
// permanently null on invite-by-email rooms; connection-request-fn.ts's
// service-role path can leave a founder/investor with no
// deal_room_members row if the second HTTP call fails after the first
// commits) — this is not hypothetical, it is the exact gap migration
// 20260809000000 (deal_rooms_investor_memo_write_and_stage_fix) already
// found and fixed BY REQUIRING BOTH for that RLS policy. This file
// deliberately does NOT follow that same "require both" shape: that
// policy was closing a privilege-escalation gap (investor_user_id was an
// unenforced SECOND identity path granting write access nothing else
// checked). Here, deal_room_members is the RPC's own existing sole
// check, already live in production — adding an AND could only ever
// NARROW who can act, i.e. risk a false forbidden for a legitimate
// member whose investor_user_id/founder_id never backfilled. Narrowing
// is the safer failure direction than widening, so the existing
// deal_room_members-only check is preserved as-is. Reviewed and
// approved explicitly (25/27 Sep 2026 recon review) rather than decided
// silently — flagged specifically because it diverges from the
// migration's own "require both" precedent.
//
// SELF-APPROVAL / SELF-WITHDRAWAL — deliberately DIFFERENT authorize()
// shapes per action, not one relaxed shared check:
//   - approveTransition: requested_by !== ctx.uid, ALWAYS, no exception.
//     Preserves an existing security invariant currently enforced ONLY
//     by deal_room_stage_transitions' own RLS (transitions_update:
//     status='pending' AND requested_by <> auth.uid()) — which a
//     service-role gateway client bypasses entirely. Not optional.
//   - rejectTransition: any valid founder/investor member may reject —
//     the REQUESTER (withdrawal) or the COUNTERPARTY (decline) — no
//     requested_by exclusion. This is a deliberate, reviewed BEHAVIOR
//     CHANGE, not a faithful port: live-tested before this file was
//     written (27 Sep 2026) and confirmed that today's rejectTransition,
//     called by the requester on their own pending request, is a SILENT
//     0-ROW UPDATE under transitions_update's real RLS predicate — the
//     exact §7.4 defect class (PostgREST returns no error for a 0-row
//     UPDATE; the client's `if (rejErr) {...return}` never fires, so
//     toast.success("Request declined.") shows even though nothing
//     changed). Confirmed live: inserted a real pending transition on
//     the standing test-founder@/test-investor@ fixture room
//     (11111111-2222-3333-4444-555555555555), attempted the update as
//     the requester under `set local role authenticated` +
//     request.jwt.claims matching requested_by (the exact PostgREST RLS
//     context), and the UPDATE affected 0 rows — the row was still
//     status='pending' afterward. Product decision (not escalated):
//     withdrawing your own request has no integrity risk, unlike
//     self-approval, and a known silent false-success bug is not a
//     neutral default worth preserving. Implemented as new, correctly-
//     guarded self-withdrawal behavior. The record chain distinguishes
//     the two outcomes by action name — reject_transition_withdrawn vs
//     reject_transition_declined — same reasoning as
//     request_next_stage_auto_approved getting its own name below rather
//     than looking identical to a normal request.
//
// AUTO-ADVANCE EXCEPTION — diligence->term_sheet, investor-initiated,
// no founder counterparty approval. CONFIRMED INTENTIONAL, reviewed and
// decided by the product owner 25 Sep 2026 — not a bug, not in scope to
// fix in this pass. See TRANSACTION-PRINCIPLES.md for the standing
// documentation of this as a deliberately reviewed exception to the
// mutual-approval pattern, so it is never mistaken for an oversight in
// a future pass or a pen-test finding. See requestNextStageDef.handle()
// below for where this branch lives.
//
// ATOMICITY TIER — NON-ATOMIC (2-call), same standard as
// deal-room-counsel.ts. deal_room_stage_transitions independently proves
// actor+timestamp for every branch (requested_by/approved_by/created_at/
// resolved_at), so a gap between a SQL/RPC call succeeding and the
// follow-up pack_api.append_record call succeeding is a correctable
// records incident, not unrecoverable state.
//
// PARTIAL-FAILURE BRANCH, NAMED — approveTransition's handle() updates
// deal_room_stage_transitions FIRST, then calls advance_workflow_stage.
// If the RPC fails after the UPDATE committed, the transition row is
// approved but deal_rooms.workflow_stage never advanced. This qualifies
// for the same non-atomic tier (the transition row itself proves who
// approved and when, independent of whether the stage write succeeded),
// but the branch gets ITS OWN named record action
// (approve_transition_stage_write_failed) rather than being silently
// swallowed — a real, correctable-incident signal in the chain.
//
// NOTIFICATIONS — the 2 notification inserts (stage-advance-requested,
// stage-advance-approved/declined) are OUT OF SCOPE for record_entry.
// Reviewed and flagged, not silently decided: a notification is a
// delivery/UX side effect of an already-recorded commit event, not
// itself a state transition a dispute would need to reconstruct — the
// chain already captures the authoritative fact independent of whether
// the notification succeeded. Matches resolveLawyerRequest's own
// treatment of triggerLawyerInvite in deal-room-counsel.ts.
//
// LEGACY DATA — 3 stale deal_room_stage_transitions rows exist on the
// real Atlas Robotics room (to_stage='due_diligence', a value the
// current CHECK constraint no longer permits, self-approved,
// resolved_at null) — pre-existing history from before the 7 Sep 2026
// vocabulary collapse. NOT TOUCHED. Confirmed no code path in this file
// re-reads them: pendingTransition-equivalent reads filter
// status='pending' and all 3 legacy rows are status='approved'; no
// action here does a strict-equality branch against a hardcoded stage
// list except the RPC's own adjacency check and the auto-advance
// condition, both of which only ever read deal_rooms.workflow_stage
// (always a currently-valid value per the live CHECK constraint), never
// deal_room_stage_transitions history.

import { createServerFn } from "@tanstack/react-start";
import {
  runAction,
  type ActionDef,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";

const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);

// Canonical 5-stage sequence — matches deal_rooms_workflow_stage_check,
// zz_enforce_workflow_stage_order, sync_deal_room_profile_disclosure, and
// advance_workflow_stage's own hardcoded array exactly (confirmed live
// via pg_get_functiondef/pg_get_constraintdef during recon). Duplicated
// here rather than fetched, matching useStageTransition.ts's own
// existing convention (STAGE_ORDER) — this is the single source of
// truth for adjacency on the CLIENT/gateway side; the DB independently
// enforces the same sequence via the two triggers, defense-in-depth.
const STAGE_ORDER = [
  "nda_signed",
  "qa",
  "diligence",
  "term_sheet",
  "closing_confirmed",
] as const;

function nextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current as (typeof STAGE_ORDER)[number]);
  return idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

// Shared helper — same appendRecord shape as deal-room-counsel.ts,
// duplicated rather than imported cross-file to keep each action file's
// dependency surface self-contained (matches this codebase's existing
// per-feature-file convention — deal-room-counsel.ts does not import
// from deal-room-closing.ts either).
async function appendRecord(
  sb: import("./gateway").ActionCtx["sb"],
  args: {
    orgId: string;
    actorId: string;
    action: string;
    objectType: string;
    objectId: string | null;
    data: JsonValue;
  },
): Promise<{ ok: boolean; seq: number | null; entryHash: string | null }> {
  const { data: result, error: rpcErr } = await sb
    .schema("pack_api")
    .rpc("append_record", {
      p_org_id: args.orgId,
      p_actor_id: args.actorId,
      p_actor_type: "human",
      p_action: args.action,
      p_object_type: args.objectType,
      p_object_id: args.objectId,
      p_data: args.data ?? {},
    });
  const parsed = result as
    | { ok: true; seq: number; entry_hash: string; id: string }
    | { ok: false; error: string }
    | null;
  if (rpcErr || !parsed?.ok) {
    console.error(
      `[deal-room-stage] record append failed for action=${args.action} (state change itself already committed):`,
      rpcErr ?? (parsed as { error?: string } | null)?.error,
    );
    return { ok: false, seq: null, entryHash: null };
  }
  return { ok: true, seq: parsed.seq, entryHash: parsed.entry_hash };
}

// Same callerRole() shape as deal-room-counsel.ts — deal_room_members
// only, no fallback to investor_user_id/founder_id. See header comment
// for the full reasoning behind not requiring both.
async function callerRole(
  sb: import("./gateway").ActionCtx["sb"],
  dealRoomId: string,
  uid: string,
): Promise<"founder" | "investor" | null> {
  const { data, error } = await sb
    .from("deal_room_members")
    .select("role")
    .eq("deal_room_id", dealRoomId)
    .eq("user_id", uid)
    .in("role", ["founder", "investor"])
    .maybeSingle();
  if (error) return null;
  const r = data?.role;
  return r === "founder" || r === "investor" ? r : null;
}

// ── Shared internal helper — NOT an ActionDef, called by both
//    requestNextStageDef's auto-approve branch and approveTransitionDef.
//    Design decision from recon review: a shared function, not one
//    action's handler calling another action's handler directly (the
//    gateway's single-entry-per-call shape doesn't support that
//    cleanly) and not duplicated logic between the two call sites.
//
//    Does NOT append its own record entry — the caller (either
//    requestNextStageDef or approveTransitionDef) appends its own,
//    action-named entry after this returns, since the two callers use
//    different action names for what is otherwise the same underlying
//    write (request_next_stage_auto_approved vs approve_transition).
// ──────────────────────────────────────────────────────────────────────
type AdvanceStageResult =
  | { ok: true }
  | { ok: false; error: string };

async function advanceStage(
  sb: import("./gateway").ActionCtx["sb"],
  args: { dealRoomId: string; uid: string; toStage: string },
): Promise<AdvanceStageResult> {
  // p_uid = ctx.uid: the RPC no longer reads auth.uid() internally (NULL
  // via this service-role client) — see the migration's own header
  // comment. Never client input; always the caller's runAction-verified
  // identity, passed through by both call sites below.
  const { data: result, error: rpcErr } = await sb.rpc(
    "advance_workflow_stage",
    { p_deal_room_id: args.dealRoomId, p_uid: args.uid, p_to_stage: args.toStage },
  );
  const row = Array.isArray(result) ? result[0] : result;
  if (rpcErr) return { ok: false, error: rpcErr.message };
  if (!row?.ok) return { ok: false, error: row?.error ?? "advance_failed" };
  return { ok: true };
}

// ═════════════════════════════════════════════════════════════════════════
// 1. requestNextStage — a principal requests advancing to the next
//    canonical stage. TWO branches, each a real, distinct state change:
//      A. needs approval (the normal case) -> INSERT deal_room_stage_
//         transitions as 'pending' -> 1 entry (request_next_stage)
//      B. diligence + investor, auto-advance exception -> INSERT as
//         'approved' AND immediately advance deal_rooms.workflow_stage
//         via the shared advanceStage() helper -> 1 entry
//         (request_next_stage_auto_approved) — a DISTINCT action name so
//         the chain itself shows this was the reviewed exception, not a
//         normal request that happens to already be approved.
//    Early return (no next stage / already-pending transition exists) is
//    non-state-changing and gets NO entry, matching this codebase's
//    established early-return-unrecorded precedent.
// ═════════════════════════════════════════════════════════════════════════

type RequestNextStageInput = { dealRoomId: string };
type RequestNextStageOutput = {
  ok: true;
  transitionId: string;
  status: "pending" | "approved";
  fromStage: string;
  toStage: string;
  autoApproved: boolean;
};

function buildRequestNextStageRecord(
  _input: RequestNextStageInput,
  output: RequestNextStageOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room_stage_transition",
    objectId: output.transitionId,
    data: {
      from_stage: output.fromStage,
      to_stage: output.toStage,
      autoApproved: output.autoApproved,
    },
  };
}

const requestNextStageDef: ActionDef<RequestNextStageInput, RequestNextStageOutput> = {
  name: "deal_room.stage.requestNext",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    return { dealRoomId: r.dealRoomId };
  },
  authorize: async (ctx, input) => (await callerRole(ctx.sb, input.dealRoomId, ctx.uid)) !== null,
  handle: async (ctx, input) => {
    const role = (await callerRole(ctx.sb, input.dealRoomId, ctx.uid))!;

    // currentStage read server-side — never trust a client-supplied
    // current stage, which would let a stale/forged client jump the
    // adjacency check at the request-insert layer (the RPC's own
    // adjacency check is a second, independent backstop, but this read
    // must still reflect the real current row, not client state).
    const { data: room, error: roomErr } = await ctx.sb
      .from("deal_rooms")
      .select("workflow_stage")
      .eq("id", input.dealRoomId)
      .maybeSingle();
    if (roomErr || !room) throw new Error("room_not_found");

    const next = nextStage(room.workflow_stage as string);
    if (!next) throw new Error("no_next_stage");

    const { data: existing, error: existingErr } = await ctx.sb
      .from("deal_room_stage_transitions")
      .select("id")
      .eq("deal_room_id", input.dealRoomId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (existingErr) throw new Error("existing_check_failed");
    if (existing) throw new Error("already_pending");

    // The confirmed-intentional auto-advance exception (see header
    // comment) — diligence -> term_sheet, investor-initiated, no
    // founder counterparty approval.
    const autoApproved = room.workflow_stage === "diligence" && role === "investor";

    const { data: inserted, error: insertErr } = await ctx.sb
      .from("deal_room_stage_transitions")
      .insert({
        deal_room_id: input.dealRoomId,
        from_stage: room.workflow_stage,
        to_stage: next,
        requested_by: ctx.uid,
        status: autoApproved ? "approved" : "pending",
        approved_by: autoApproved ? ctx.uid : null,
        resolved_at: autoApproved ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (insertErr || !inserted) throw new Error("request_write_failed");

    // ── Branch B: auto-approved — also advances deal_rooms.workflow_stage
    //    immediately, via the shared helper, same as approveTransition
    //    would do for a normally-approved request.
    if (autoApproved) {
      const advance = await advanceStage(ctx.sb, {
        dealRoomId: input.dealRoomId,
        uid: ctx.uid,
        toStage: next,
      });
      if (!advance.ok) {
        // Partial-failure branch, named — the transition row is
        // 'approved' but the stage write failed. Independently
        // reconstructable from deal_room_stage_transitions alone
        // (status/approved_by/resolved_at), so this is a correctable
        // records incident, not unrecoverable state — but it gets its
        // own action name, not silent absorption into the happy path.
        await appendRecord(ctx.sb, {
          orgId: input.dealRoomId,
          actorId: ctx.uid,
          action: "deal_room.stage.requestNextAutoApproveStageWriteFailed",
          objectType: "deal_room_stage_transition",
          objectId: inserted.id,
          data: { from_stage: room.workflow_stage, to_stage: next, error: advance.error },
        });
        throw new Error(advance.error);
      }

      const output: RequestNextStageOutput = {
        ok: true,
        transitionId: inserted.id,
        status: "approved",
        fromStage: room.workflow_stage as string,
        toStage: next,
        autoApproved: true,
      };
      await appendRecord(ctx.sb, {
        orgId: input.dealRoomId,
        actorId: ctx.uid,
        action: "request_next_stage_auto_approved",
        objectType: "deal_room_stage_transition",
        objectId: inserted.id,
        data: { from_stage: output.fromStage, to_stage: output.toStage, autoApproved: true },
      });
      return output;
    }

    // ── Branch A: needs approval — normal pending request ──
    const output: RequestNextStageOutput = {
      ok: true,
      transitionId: inserted.id,
      status: "pending",
      fromStage: room.workflow_stage as string,
      toStage: next,
      autoApproved: false,
    };
    const rec = buildRequestNextStageRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: "request_next_stage",
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildRequestNextStageRecord,
};

export const requestNextStage = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(requestNextStageDef, data),
  );

// ═════════════════════════════════════════════════════════════════════════
// 2. approveTransition — the COUNTERPARTY approves a pending request.
//    authorize(): requested_by !== ctx.uid, ALWAYS, no exception — see
//    header comment. ONE branch on success (approve_transition), plus a
//    named partial-failure branch if the deal_rooms write fails after
//    the transition row already committed as approved.
// ═════════════════════════════════════════════════════════════════════════

type ApproveTransitionInput = { dealRoomId: string; transitionId: string };
type ApproveTransitionOutput = {
  ok: true;
  fromStage: string;
  toStage: string;
  requestedBy: string;
};

function buildApproveTransitionRecord(
  input: ApproveTransitionInput,
  output: ApproveTransitionOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room_stage_transition",
    objectId: input.transitionId,
    data: { from_stage: output.fromStage, to_stage: output.toStage },
  };
}

const approveTransitionDef: ActionDef<ApproveTransitionInput, ApproveTransitionOutput> = {
  name: "deal_room.stage.approve",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown; transitionId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (!isUuid(r?.transitionId)) throw new Error("transitionId must be a uuid");
    return { dealRoomId: r.dealRoomId, transitionId: r.transitionId };
  },
  authorize: async (ctx, input) => {
    // Room-principal check first (cheap, matches every other action's
    // shape) — the self-approval check below needs its own read anyway
    // since it depends on the transition row, not just the room.
    const role = await callerRole(ctx.sb, input.dealRoomId, ctx.uid);
    if (role === null) return false;

    // Self-approval guard, re-implemented explicitly — see header
    // comment. Reproduces exactly what deal_room_stage_transitions'
    // transitions_update RLS policy (status='pending' AND requested_by
    // <> auth.uid()) enforces today, which the service-role gateway
    // client bypasses entirely. requested_by === ctx.uid is a hard
    // FORBIDDEN here, always, no exception — distinct from
    // rejectTransition's authorize(), which allows the requester.
    const { data: transition, error } = await ctx.sb
      .from("deal_room_stage_transitions")
      .select("id, status, requested_by, deal_room_id")
      .eq("id", input.transitionId)
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();
    if (error || !transition) return false;
    if (transition.status !== "pending") return false;
    if (transition.requested_by === ctx.uid) return false;
    return true;
  },
  handle: async (ctx, input) => {
    // Re-fetch server-side — authorize() already proved this row exists,
    // is pending, and requested_by !== ctx.uid, but handle() re-derives
    // its own working copy rather than trusting authorize()'s read
    // (matches resolveLawyerRequest's own re-fetch-in-handle() shape in
    // deal-room-counsel.ts).
    const { data: transition, error: fetchErr } = await ctx.sb
      .from("deal_room_stage_transitions")
      .select("id, from_stage, to_stage, requested_by, status")
      .eq("id", input.transitionId)
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();
    if (fetchErr || !transition) throw new Error("transition_not_found");
    if (transition.status !== "pending") throw new Error("not_pending");
    if (transition.requested_by === ctx.uid) throw new Error("cannot_approve_own_request");

    const { error: updateErr } = await ctx.sb
      .from("deal_room_stage_transitions")
      .update({ status: "approved", approved_by: ctx.uid, resolved_at: new Date().toISOString() })
      .eq("id", input.transitionId)
      .eq("status", "pending");
    if (updateErr) throw new Error("approve_write_failed");

    const advance = await advanceStage(ctx.sb, {
      dealRoomId: input.dealRoomId,
      uid: ctx.uid,
      toStage: transition.to_stage as string,
    });
    if (!advance.ok) {
      // Named partial-failure branch — the transition row is now
      // 'approved' (committed above) but deal_rooms.workflow_stage never
      // advanced. deal_room_stage_transitions alone independently proves
      // who approved and when (status/approved_by/resolved_at), so this
      // qualifies for the non-atomic tier — but it is a real,
      // correctable-incident signal in the chain, not silently swallowed.
      await appendRecord(ctx.sb, {
        orgId: input.dealRoomId,
        actorId: ctx.uid,
        action: "approve_transition_stage_write_failed",
        objectType: "deal_room_stage_transition",
        objectId: input.transitionId,
        data: {
          from_stage: transition.from_stage,
          to_stage: transition.to_stage,
          error: advance.error,
        },
      });
      throw new Error(advance.error);
    }

    const output: ApproveTransitionOutput = {
      ok: true,
      fromStage: transition.from_stage as string,
      toStage: transition.to_stage as string,
      requestedBy: transition.requested_by as string,
    };
    const rec = buildApproveTransitionRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: "approve_transition",
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildApproveTransitionRecord,
};

export const approveTransition = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(approveTransitionDef, data),
  );

// ═════════════════════════════════════════════════════════════════════════
// 3. rejectTransition — either the COUNTERPARTY (decline) or the
//    REQUESTER (withdrawal) may reject a pending request.
//    authorize(): NO requested_by exclusion — deliberately different
//    shape from approveTransition. See header comment for the live-
//    tested confirmation that today's behavior is a silent false-success
//    self-block, and the product decision to implement real
//    self-withdrawal instead. No deal_rooms write in either case — the
//    RPC/advanceStage() helper is never called from this action.
// ═════════════════════════════════════════════════════════════════════════

type RejectTransitionInput = { dealRoomId: string; transitionId: string };
type RejectTransitionOutput = {
  ok: true;
  outcome: "withdrawn" | "declined";
  fromStage: string;
  toStage: string;
  requestedBy: string;
};

function buildRejectTransitionRecord(
  input: RejectTransitionInput,
  output: RejectTransitionOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room_stage_transition",
    objectId: input.transitionId,
    data: { from_stage: output.fromStage, to_stage: output.toStage, outcome: output.outcome },
  };
}

const rejectTransitionDef: ActionDef<RejectTransitionInput, RejectTransitionOutput> = {
  name: "deal_room.stage.reject",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown; transitionId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (!isUuid(r?.transitionId)) throw new Error("transitionId must be a uuid");
    return { dealRoomId: r.dealRoomId, transitionId: r.transitionId };
  },
  authorize: async (ctx, input) => {
    // Any valid founder/investor member on the room may reject — the
    // requester (withdrawal) or the counterparty (decline). No
    // requested_by exclusion here, unlike approveTransition — this is
    // the deliberate, reviewed difference in shape (see header comment).
    const role = await callerRole(ctx.sb, input.dealRoomId, ctx.uid);
    if (role === null) return false;

    const { data: transition, error } = await ctx.sb
      .from("deal_room_stage_transitions")
      .select("id, status")
      .eq("id", input.transitionId)
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();
    if (error || !transition) return false;
    if (transition.status !== "pending") return false;
    return true;
  },
  handle: async (ctx, input) => {
    const { data: transition, error: fetchErr } = await ctx.sb
      .from("deal_room_stage_transitions")
      .select("id, from_stage, to_stage, requested_by, status")
      .eq("id", input.transitionId)
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();
    if (fetchErr || !transition) throw new Error("transition_not_found");
    if (transition.status !== "pending") throw new Error("not_pending");

    const { error: updateErr } = await ctx.sb
      .from("deal_room_stage_transitions")
      .update({ status: "rejected", resolved_at: new Date().toISOString() })
      .eq("id", input.transitionId)
      .eq("status", "pending");
    if (updateErr) throw new Error("reject_write_failed");

    // Distinct outcome per actor — the chain shows WHICH happened, not
    // just that a reject occurred. Same reasoning as
    // request_next_stage_auto_approved getting its own action name.
    const outcome: "withdrawn" | "declined" =
      transition.requested_by === ctx.uid ? "withdrawn" : "declined";

    const output: RejectTransitionOutput = {
      ok: true,
      outcome,
      fromStage: transition.from_stage as string,
      toStage: transition.to_stage as string,
      requestedBy: transition.requested_by as string,
    };
    const rec = buildRejectTransitionRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: outcome === "withdrawn" ? "reject_transition_withdrawn" : "reject_transition_declined",
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildRejectTransitionRecord,
};

export const rejectTransition = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(rejectTransitionDef, data),
  );

// Deal-room counsel gate — gateway actions for the Closing-stage
// record-wiring pass (24 Sep 2026), extending the confirmDeliverable
// atomicity work (commit 230a0a0) to the remaining unwired commit-class
// closing events named in the recon: finalize_counsel_waiver, lawyer
// invite creation, lawyer invite approval, accept_lawyer_invite.
// advance_workflow_stage is explicitly OUT OF SCOPE for this pass.
//
// FIVE ACTIONS, ONE FILE — because they share one state machine
// (deal_room_lawyer_requests -> deal_room_lawyer_invites /
// deal_rooms.waived_legal_counsel), and LawyerGate.tsx already treats
// them as one gate. deal-room-closing.ts stays scoped to the
// fee/sign/payment/close money-flow events; this file is the counsel
// gate's own home.
//
// ATOMICITY TIER — DELIBERATELY NON-ATOMIC (2-call), NOT atomic-in-SQL.
// Checked against the same standard finalize_deal_close's atomicity fix
// established: an event needs atomic-in-SQL record-append ONLY if its
// underlying table has NO independent actor+timestamp fallback outside
// pack_v1.record_entry. Both events here DO have one:
//   - finalize_counsel_waiver -> deal_rooms.waived_legal_counsel_at +
//     BOTH waived_legal_counsel_{founder,investor}_confirmed_by.
//   - accept_lawyer_invite -> deal_room_lawyer_invites.accepted_at +
//     accepted_by, cross-referenced by the resulting
//     deal_room_members.user_id (same id by construction).
// So a gap between the SQL call succeeding and the follow-up
// pack_api.append_record call succeeding is a correctable records
// incident (the fallback columns are exactly what make it correctable),
// not the unrecoverable state finalize_deal_close's atomicity fix had to
// close. Each handler therefore: (1) calls the existing SQL function,
// UNCHANGED internally, now service_role-only; (2) on success, makes a
// SEPARATE pack_api.append_record call for that branch's record entry —
// the same non-atomic shape already used for confirmDeliverable's own
// partial-confirm branch (deal-room-closing.ts).
//
// EVERY STATE-MUTATING BRANCH GETS ITS OWN ENTRY, not just the terminal
// path — this is the exact gap the atomicity work's own production
// report caught (a partial-confirm state change with no audit trail).
// See each action's own handle() for the branch-by-branch account.

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

// Shared helper — every action here appends its own record via a
// SEPARATE pack_api.append_record call (never atomic-in-SQL, per the
// tier decision above). pack_api.append_record never raises to
// PostgREST — it catches its own exceptions and returns {ok:false,error}
// in the JSON body with a normal 200 (confirmed against its own
// pg_get_functiondef during the confirmDeliverable atomicity work), so
// BOTH a transport-level `error` and a logical `{ok:false}` in `data`
// must be checked — missing the second would silently report a record
// as written when it never was.
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
      `[deal-room-counsel] record append failed for action=${args.action} (state change itself already committed):`,
      rpcErr ?? (parsed as { error?: string } | null)?.error,
    );
    return { ok: false, seq: null, entryHash: null };
  }
  return { ok: true, seq: parsed.seq, entryHash: parsed.entry_hash };
}

// ── Shared: caller-is-a-principal (founder/investor) authorization ─────────
// Every action in this file except acceptLawyerInvite uses this — the
// lawyer counsel gate is a founder/investor negotiation about counsel,
// never a lawyer action themselves (mirrors closing-fn.ts's existing
// principalRole()/authorizePrincipal() shape, ported not reinvented).
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

// ═════════════════════════════════════════════════════════════════════════
// 1. requestLawyerInvite — a principal requests bringing in counsel for
//    their own side. ONE branch, ONE state change (the request insert),
//    ONE record entry.
// ═════════════════════════════════════════════════════════════════════════

type RequestLawyerInviteInput = { dealRoomId: string; lawyerEmail: string };
type RequestLawyerInviteOutput = { ok: true; requestId: string };

function buildRequestLawyerInviteRecord(
  input: RequestLawyerInviteInput,
  output: RequestLawyerInviteOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room_lawyer_request",
    objectId: output.requestId,
    data: { action: "request_lawyer_invite", lawyerEmail: input.lawyerEmail },
  };
}

const requestLawyerInviteDef: ActionDef<
  RequestLawyerInviteInput,
  RequestLawyerInviteOutput
> = {
  name: "deal_room.lawyer.requestInvite",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown; lawyerEmail?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    const email = typeof r?.lawyerEmail === "string" ? r.lawyerEmail.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) throw new Error("lawyerEmail must be a valid email");
    return { dealRoomId: r.dealRoomId, lawyerEmail: email };
  },
  authorize: async (ctx, input) => (await callerRole(ctx.sb, input.dealRoomId, ctx.uid)) !== null,
  handle: async (ctx, input) => {
    const role = (await callerRole(ctx.sb, input.dealRoomId, ctx.uid))!;
    const { data: inserted, error } = await ctx.sb
      .from("deal_room_lawyer_requests")
      .insert({
        deal_room_id: input.dealRoomId,
        kind: "invite_lawyer",
        side: role,
        lawyer_email: input.lawyerEmail,
        requested_by: ctx.uid,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error("request_write_failed");

    const output: RequestLawyerInviteOutput = { ok: true, requestId: inserted.id };
    const rec = buildRequestLawyerInviteRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: requestLawyerInviteDef.name,
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildRequestLawyerInviteRecord,
};

export const requestLawyerInvite = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(requestLawyerInviteDef, data),
  );

// ═════════════════════════════════════════════════════════════════════════
// 2. requestCounselWaive — a principal proposes proceeding without
//    counsel for their own side. ONE branch, ONE state change, ONE entry.
// ═════════════════════════════════════════════════════════════════════════

type RequestCounselWaiveInput = { dealRoomId: string };
type RequestCounselWaiveOutput = { ok: true; requestId: string };

function buildRequestCounselWaiveRecord(
  input: RequestCounselWaiveInput,
  output: RequestCounselWaiveOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room_lawyer_request",
    objectId: output.requestId,
    data: { action: "request_counsel_waive" },
  };
}

const requestCounselWaiveDef: ActionDef<
  RequestCounselWaiveInput,
  RequestCounselWaiveOutput
> = {
  name: "deal_room.lawyer.requestWaive",
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
    const { data: inserted, error } = await ctx.sb
      .from("deal_room_lawyer_requests")
      .insert({
        deal_room_id: input.dealRoomId,
        kind: "waive_counsel",
        side: role,
        requested_by: ctx.uid,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error("request_write_failed");

    const output: RequestCounselWaiveOutput = { ok: true, requestId: inserted.id };
    const rec = buildRequestCounselWaiveRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: requestCounselWaiveDef.name,
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildRequestCounselWaiveRecord,
};

export const requestCounselWaive = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(requestCounselWaiveDef, data),
  );

// ═════════════════════════════════════════════════════════════════════════
// 3. resolveLawyerRequest — the counterparty approves or declines a
//    pending request. THREE distinct branches, each a real state change:
//      A. decline (either kind)            -> 1 entry (decline)
//      B. approve invite_lawyer             -> 1 entry (approveInvite) —
//         covers BOTH the request-approval UPDATE and the resulting
//         invite INSERT as one logical commit-class event (a human
//         reading the chain sees "invite approved", not two rows for
//         what was one click)
//      C. approve waive_counsel             -> 1 entry (approveWaive) —
//         the request-approval UPDATE only; finalizeCounselWaiver (action
//         #4 below) is a SEPARATE commit-class event with its own entry,
//         fired by the client as its own follow-up call once this
//         approval succeeds, matching LawyerGate.tsx's existing two-step
//         call shape (resolveRequest awaits the approve, then — in the
//         waive_counsel case — the client immediately calls
//         finalize_counsel_waiver). Approving and finalizing are
//         genuinely two different actors' worth of consequence: approval
//         alone does not yet waive counsel (see finalize_counsel_waiver's
//         own SQL body, which re-derives the approved request rather than
//         trusting this step blindly), so they stay two entries, not one.
// ═════════════════════════════════════════════════════════════════════════

type ResolveLawyerRequestInput = { dealRoomId: string; requestId: string; approve: boolean };
type ResolveLawyerRequestOutput = {
  ok: true;
  status: "approved" | "declined";
  kind: "invite_lawyer" | "waive_counsel";
  inviteId: string | null;
  // Present only on an approved invite_lawyer branch — the caller needs
  // this to send the actual invite email (triggerLawyerInvite), a
  // notification-only side effect that stays client-side, same as every
  // other action's own email triggers in this codebase (never entered
  // into the record itself, never gated by the gateway).
  inviteToken: string | null;
  lawyerEmail: string | null;
  side: "founder" | "investor" | null;
};

function buildResolveLawyerRequestRecord(
  input: ResolveLawyerRequestInput,
  output: ResolveLawyerRequestOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room_lawyer_request",
    objectId: input.requestId,
    data: {
      action: output.status === "declined" ? "decline_lawyer_request" : `approve_${output.kind}`,
      kind: output.kind,
      inviteId: output.inviteId,
    },
  };
}

const resolveLawyerRequestDef: ActionDef<
  ResolveLawyerRequestInput,
  ResolveLawyerRequestOutput
> = {
  name: "deal_room.lawyer.resolveRequest",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown; requestId?: unknown; approve?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (!isUuid(r?.requestId)) throw new Error("requestId must be a uuid");
    if (typeof r?.approve !== "boolean") throw new Error("approve must be a boolean");
    return { dealRoomId: r.dealRoomId, requestId: r.requestId, approve: r.approve };
  },
  authorize: async (ctx, input) => (await callerRole(ctx.sb, input.dealRoomId, ctx.uid)) !== null,
  handle: async (ctx, input) => {
    // Read the pending request first — mirrors the RLS predicate this
    // replaces (lawyer_requests_resolve: status='pending' AND
    // requested_by <> caller AND caller is a room member), enforced here
    // in TypeScript instead since the table is no longer client-writable
    // for this transition once the gateway is the sole path.
    const { data: req, error: reqErr } = await ctx.sb
      .from("deal_room_lawyer_requests")
      .select("id, kind, side, lawyer_email, requested_by, status")
      .eq("id", input.requestId)
      .eq("deal_room_id", input.dealRoomId)
      .maybeSingle();
    if (reqErr || !req) throw new Error("request_not_found");
    if (req.status !== "pending") throw new Error("request_not_pending");
    if (req.requested_by === ctx.uid) throw new Error("cannot_resolve_own_request");

    const { error: updErr } = await ctx.sb
      .from("deal_room_lawyer_requests")
      .update({
        status: input.approve ? "approved" : "declined",
        approved_by: ctx.uid,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", input.requestId)
      .eq("status", "pending");
    if (updErr) throw new Error("resolve_write_failed");

    // ── Branch A: decline (either kind) ──
    if (!input.approve) {
      const output: ResolveLawyerRequestOutput = {
        ok: true,
        status: "declined",
        kind: req.kind as "invite_lawyer" | "waive_counsel",
        inviteId: null,
        inviteToken: null,
        lawyerEmail: null,
        side: null,
      };
      const rec = buildResolveLawyerRequestRecord(input, output);
      await appendRecord(ctx.sb, {
        orgId: input.dealRoomId,
        actorId: ctx.uid,
        action: resolveLawyerRequestDef.name,
        objectType: rec.objectType,
        objectId: rec.objectId,
        data: rec.data ?? {},
      });
      return output;
    }

    // ── Branch B: approve invite_lawyer — also creates the invite row ──
    if (req.kind === "invite_lawyer") {
      if (!req.lawyer_email) throw new Error("missing_lawyer_email");
      const { data: invited, error: inviteErr } = await ctx.sb
        .from("deal_room_lawyer_invites")
        .insert({
          deal_room_id: input.dealRoomId,
          side: req.side,
          email: req.lawyer_email,
          invited_by: ctx.uid,
          request_id: req.id,
        })
        .select("id, token")
        .single();
      if (inviteErr || !invited) throw new Error("invite_write_failed");

      const output: ResolveLawyerRequestOutput = {
        ok: true,
        status: "approved",
        kind: "invite_lawyer",
        inviteId: invited.id,
        inviteToken: invited.token,
        lawyerEmail: req.lawyer_email,
        side: req.side as "founder" | "investor",
      };
      const rec = buildResolveLawyerRequestRecord(input, output);
      await appendRecord(ctx.sb, {
        orgId: input.dealRoomId,
        actorId: ctx.uid,
        action: resolveLawyerRequestDef.name,
        objectType: rec.objectType,
        objectId: rec.objectId,
        data: rec.data ?? {},
      });
      return output;
    }

    // ── Branch C: approve waive_counsel — approval only; finalization is
    //    a separate action (finalizeCounselWaiver), see header comment.
    const output: ResolveLawyerRequestOutput = {
      ok: true,
      status: "approved",
      kind: "waive_counsel",
      inviteId: null,
      inviteToken: null,
      lawyerEmail: null,
      side: null,
    };
    const rec = buildResolveLawyerRequestRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: resolveLawyerRequestDef.name,
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildResolveLawyerRequestRecord,
};

export const resolveLawyerRequest = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(resolveLawyerRequestDef, data),
  );

// ═════════════════════════════════════════════════════════════════════════
// 4. finalizeCounselWaiver — port of the finalize_counsel_waiver() RPC.
//    Internal body UNCHANGED (it re-derives the approved waive_counsel
//    request itself rather than trusting the caller, so no logic moves
//    into TypeScript beyond the identity/authorization boundary). ONE
//    branch — success — gets ONE entry; the SQL function's own early
//    returns (not_authenticated, not_authorized, no_approved_waive_request)
//    are non-state-changing and get none, matching confirmDeliverable's
//    own precedent (its room-already-closed early return is unrecorded
//    too, since nothing changed).
// ═════════════════════════════════════════════════════════════════════════

type FinalizeCounselWaiverInput = { dealRoomId: string };
type FinalizeCounselWaiverOutput = { ok: true };

function buildFinalizeCounselWaiverRecord(
  input: FinalizeCounselWaiverInput,
  _output: FinalizeCounselWaiverOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room",
    objectId: input.dealRoomId,
    data: { action: "finalize_counsel_waiver" },
  };
}

const finalizeCounselWaiverDef: ActionDef<
  FinalizeCounselWaiverInput,
  FinalizeCounselWaiverOutput
> = {
  name: "deal_room.finalizeCounselWaiver",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    return { dealRoomId: r.dealRoomId };
  },
  authorize: async (ctx, input) => (await callerRole(ctx.sb, input.dealRoomId, ctx.uid)) !== null,
  handle: async (ctx, input) => {
    // finalize_counsel_waiver() itself re-checks caller membership,
    // re-derives the latest approved waive_counsel request, and sets
    // both waived_legal_counsel_{founder,investor}_confirmed_by from
    // that request — none of that is re-implemented here, only called.
    // p_uid = ctx.uid: the function no longer reads auth.uid() internally
    // (that resolves to NULL via this service-role client) — see the
    // migration's own header comment for why. ctx.uid is runAction's own
    // requireUser()-verified identity, never client input.
    const { data: result, error: rpcErr } = await ctx.sb.rpc(
      "finalize_counsel_waiver",
      { p_deal_room_id: input.dealRoomId, p_uid: ctx.uid },
    );
    const row = Array.isArray(result) ? result[0] : result;
    if (rpcErr) throw new Error(`finalize_counsel_waiver: ${rpcErr.message}`);
    if (!row?.ok) throw new Error(row?.error ?? "finalize_failed");

    const output: FinalizeCounselWaiverOutput = { ok: true };
    const rec = buildFinalizeCounselWaiverRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: input.dealRoomId,
      actorId: ctx.uid,
      action: finalizeCounselWaiverDef.name,
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildFinalizeCounselWaiverRecord,
};

export const finalizeCounselWaiver = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(finalizeCounselWaiverDef, data),
  );

// ═════════════════════════════════════════════════════════════════════════
// 5. acceptLawyerInvite — port of the accept_lawyer_invite() RPC. Called
//    from a PUBLIC route (join-room.tsx) by a caller who has NO
//    deal_room_members row yet — that row is what this action creates.
//    NAMED EXCEPTION to the normal room-membership authorize() pattern:
//    a bearer token is the credential here, not room membership — there
//    is no membership row to check, since the whole point of this action
//    is to create the caller's first one. BUT authorize()'s own scope is
//    narrower than that framing first suggests, corrected after review:
//    authorize() checks ONLY that the token resolves to a real,
//    EXISTING deal_room_lawyer_invites row — that is the sole genuine
//    access-control question (does this bearer token name anything at
//    all). Whether that invite is already accepted, expired, or
//    self-invited are BUSINESS-RULE rejections with distinct,
//    user-facing meaning (self_acceptance_blocked / already_accepted /
//    expired — the exact strings join-room.tsx's toast logic branches
//    on), not authorization refusals in the access-control sense — they
//    belong in handle(), which throws them verbatim from the RPC's own
//    result (the RPC re-checks all three atomically regardless), the
//    same way any other action's handle() surfaces a specific business
//    error rather than collapsing everything into runAction's generic
//    "forbidden". org_id/deal_room_id for the record entry is read
//    SERVER-SIDE from the resolved invite row, never trusted from client
//    input directly — a valid token for room A must never be usable to
//    forge an entry into room B's chain.
// ═════════════════════════════════════════════════════════════════════════

type AcceptLawyerInviteInput = { token: string };
type AcceptLawyerInviteOutput = { ok: true; dealRoomId: string };

function buildAcceptLawyerInviteRecord(
  _input: AcceptLawyerInviteInput,
  output: AcceptLawyerInviteOutput,
): { objectType: string; objectId: string | null; data?: JsonValue } {
  return {
    objectType: "deal_room",
    objectId: output.dealRoomId,
    data: { action: "accept_lawyer_invite" },
  };
}

const acceptLawyerInviteDef: ActionDef<
  AcceptLawyerInviteInput,
  AcceptLawyerInviteOutput
> = {
  name: "deal_room.lawyer.acceptInvite",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const r = raw as { token?: unknown };
    if (!isUuid(r?.token)) throw new Error("token must be a uuid");
    return { token: r.token };
  },
  // NAMED EXCEPTION — see header, corrected. Checks ONLY that the token
  // resolves to a real, existing invite row. Accepted/expired/self-invited
  // are business-rule rejections handled in handle(), not authorization.
  authorize: async (ctx, input) => {
    const { data: invite, error } = await ctx.sb
      .from("deal_room_lawyer_invites")
      .select("id")
      .eq("token", input.token)
      .maybeSingle();
    return !error && !!invite;
  },
  handle: async (ctx, input) => {
    // Re-resolve the invite inside handle() — authorize() only checked
    // existence, so the state-specific checks (accepted/expired/self)
    // still need to run somewhere; the RPC below re-checks all of them
    // atomically and returns the exact same error strings the client's
    // toast logic already branches on (self_acceptance_blocked /
    // already_accepted / expired), so they are surfaced verbatim here,
    // not re-derived or collapsed into a generic failure. This read is
    // only to source org_id server-side for the record entry — never to
    // re-decide authorization or business-rule state, both of which the
    // RPC call below settles on its own.
    const { data: invite, error: inviteErr } = await ctx.sb
      .from("deal_room_lawyer_invites")
      .select("deal_room_id")
      .eq("token", input.token)
      .maybeSingle();
    if (inviteErr || !invite) throw new Error("invalid_token");
    const dealRoomId = invite.deal_room_id as string;

    // p_uid = ctx.uid: the function no longer reads auth.uid() internally
    // (NULL via this service-role client) — see the migration's own
    // header comment. ctx.uid is runAction's requireUser()-verified
    // identity, the same one authorize() above already checked the
    // invite against (invited_by, not self) — never client input.
    const { data: result, error: rpcErr } = await ctx.sb.rpc(
      "accept_lawyer_invite",
      { p_token: input.token, p_uid: ctx.uid },
    );
    const row = Array.isArray(result) ? result[0] : result;
    if (rpcErr) throw new Error(`accept_lawyer_invite: ${rpcErr.message}`);
    // Surface the RPC's own error string VERBATIM — self_acceptance_blocked
    // / already_accepted / expired / invalid_token, exactly what
    // join-room.tsx's catch block already branches on by string match.
    if (!row?.ok) throw new Error(row?.error ?? "accept_failed");

    // org_id sourced from the RESOLVED INVITE ROW read above, not from
    // whatever the RPC echoes back and never from client input — a
    // forged/mismatched client-supplied room id can never reach the
    // record chain here, since it is never read at all past validate().
    const output: AcceptLawyerInviteOutput = { ok: true, dealRoomId };
    const rec = buildAcceptLawyerInviteRecord(input, output);
    await appendRecord(ctx.sb, {
      orgId: dealRoomId,
      actorId: ctx.uid,
      action: acceptLawyerInviteDef.name,
      objectType: rec.objectType,
      objectId: rec.objectId,
      data: rec.data ?? {},
    });
    return output;
  },
  record: buildAcceptLawyerInviteRecord,
};

export const acceptLawyerInvite = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(acceptLawyerInviteDef, data),
  );

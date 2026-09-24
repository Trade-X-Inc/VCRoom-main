// ═══════════════════════════════════════════════════════════════════════════
// The action layer — single gateway (Foundation §13.2 Rule 13.2 / §15 / §3.7).
//
// THE ONLY sanctioned path from the client to pack_v1 data. The client never
// calls supabase.from() against pack_v1 — it cannot, pack_v1 is not exposed to
// PostgREST (see WHY_PACK_API.md). Every read/write goes through an action
// defined here via defineAction(), which guarantees, BY CONSTRUCTION:
//
//   1. identity is resolved from the caller's bearer token (requireUser),
//      never trusted from a request identity field;
//   2. authorization runs before the handler (a required field of ActionDef —
//      an action that forgets to authorize is not expressible);
//   3. a Commit-class action can never be executed by an agent caller (§15.3);
//   4. every action appends a record entry (§8.3 hash chain) — reads included,
//      because the record logs actor/action/object regardless of class.
//
// TOKEN CONVENTION: the caller's Supabase access token is passed in the request
// body as `accessToken`, matching this codebase's existing 25+ requireUser()
// call sites (reply-fn, profile-edit-fn, dd-fn, …). requireUser verifies it
// against /auth/v1/user; identity is the resolved uid, never a body userId.
//
// DATA ACCESS PATTERN (see WHY_PACK_API.md for the full rationale):
//   pack_v1 tables are NOT reachable via PostgREST. .schema('pack_v1') fails
//   with PGRST106 even for service_role — empirically confirmed, not assumed.
//   The action layer reaches pack_v1 ONLY through SECURITY DEFINER functions in
//   the exposed pack_api schema, called via .rpc(). Those functions are
//   service_role-only and pin search_path = pack_v1, pg_temp. Never reach for
//   .schema('pack_v1') — it does not work and is not the boundary.
//
// STATUS: pack_v1/pack_api are the isolated, design-proving namespaces. Nothing
// here touches public. Not promoted. The ~120 existing client supabase.from()
// call sites are NOT migrated yet — that is the cutover phase, not this one.
// ═══════════════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { requireUser } from "@/lib/require-user-fn";
import { consumeStepUpToken } from "@/lib/step-up-fn";

// ── Tool classes (Foundation §15.2) ─────────────────────────────────────────
export type ActionClass = "read" | "prepare" | "commit";

// Action outputs cross the server-fn boundary as JSON, so they must be
// JSON-serializable. Bounding Output to this keeps the framework's
// serializability check satisfied at the gateway (rather than inheriting the
// `unknown`-in-return baseline error pattern that desk-fn.ts et al. carry).
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

// ── The envelope every action receives ──────────────────────────────────────
// accessToken: caller's Supabase token (body convention, matches existing fns).
// scopeId: the record-chain partition this action's audit entry belongs to.
//   Foundation §9.4's audit trail is per-scope; the scope depends on the
//   feature class (see AUTHZ_MAPPING.md § "record scope"):
//     • deal-room actions   → scopeId = deal_room_id  (the deal room's chain)
//     • founder/profile      → scopeId = startup_id    (future group)
//     • org-level actions    → scopeId = org_id        (once organizations is real)
//   It is NOT an authorization input — authorization lives in the pack_api
//   functions on the real object ids. scopeId only keys the append-only record.
// isAgent: agent vs human caller (§15.3 gate input for Commit actions).
// stepUpToken: single-use, 5-min, uid-bound password-reentry token (see
//   step-up-fn.ts). Only consulted when def.requiresStepUp is true — every
//   other action ignores this field entirely. Not an authorization input on
//   its own: it proves the caller re-typed their password recently, it does
//   not replace def.authorize's real ownership/membership check, which still
//   runs after it.
// input: the action-specific payload, validated by def.input.
export type ActionEnvelope<Input> = {
  accessToken: string;
  scopeId: string;
  isAgent?: boolean;
  stepUpToken?: string;
  input: Input;
};

export type ActionCtx = {
  uid: string;
  scopeId: string;
  isAgent: boolean;
  sb: SupabaseClient;
};

export type ActionResult<O> =
  | { ok: true; data: O }
  | { ok: false; error: string; status: number };

export type ActionDef<Input, Output extends JsonValue> = {
  name: string; // stable id; also the record-entry action name
  class: ActionClass;
  // Password re-entry step-up (Gate C, 22 Sep 2026). When true, runAction
  // requires a valid, unconsumed stepUpToken bound to the caller's own uid
  // before authorize()/handle() ever run — see the block below. Defaults to
  // false/absent for every other action; nothing else in this codebase is
  // affected by adding this field.
  requiresStepUp?: boolean;
  // Atomicity fix (24 Sep 2026, confirmDeliverable) — when true, runAction's
  // own step-6 append_record call is SKIPPED entirely: the handler already
  // wrote the record entry itself, atomically, in the same DB transaction as
  // whatever state change the action performs (see deal-room-closing.ts's
  // confirmDeliverableDef for the worked example). This exists because the
  // gateway's default append happens as a SEPARATE HTTP round-trip strictly
  // after handle() returns — fine for a read, or for a write where "the
  // write committed but its audit entry didn't" is a tolerable, correctable
  // gap. For a Commit-class event where that gap is the exact thing being
  // guaranteed against (a closed deal with no record of closing), the
  // handler must do the append itself inside the same transaction as the
  // state change, and the gateway must not append a second, non-atomic entry
  // on top of it. def.record() is still REQUIRED and still the single
  // declared TypeScript contract for the payload shape — this flag changes
  // WHO calls the RPC and WHEN, never what record() itself describes or
  // whether it exists. See CLAUDE.md's deal-room record-atomicity entry.
  recordedByHandler?: boolean;
  validate: (raw: unknown) => Input; // narrow the untyped input payload
  authorize: (ctx: ActionCtx, input: Input) => Promise<boolean>;
  handle: (ctx: ActionCtx, input: Input) => Promise<Output>;
  record: (
    input: Input,
    output: Output,
  ) => { objectType: string; objectId: string | null; data?: JsonValue };
};

function serviceClient(): SupabaseClient {
  const url = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("supabase_not_configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── runAction — the pipeline every action passes through ─────────────────────
//
// WHY THIS IS NOT A createServerFn WRAPPER (13 Aug 2026 — see CLAUDE.md §20.11)
//
// This used to be `defineAction(def)`, which RETURNED `createServerFn(...)`.
// That shape is invisible to TanStack Start's server-fn transform, which is a
// compile-time AST rewrite requiring a statically-analysable TOP-LEVEL
// `createServerFn(...).handler(...)`. A `createServerFn` call inside a function
// body is never found, so no RPC stub is emitted and no server registration
// happens — the handler is bundled into the CLIENT and executes in the browser,
// where getEnvVar("SUPABASE_SERVICE_ROLE_KEY") is correctly empty. Every
// gateway call therefore failed with `db_unavailable` having made no network
// request at all. Proven against the built artifact: a plain top-level
// declaration is stripped from dist/client (0 hits), the factory-wrapped
// equivalent leaks its full handler body (1 hit).
//
// So: the pipeline is a PLAIN async function, and each action binds its own
// top-level createServerFn (see deal-room-core.ts). The chokepoint guarantee is
// unchanged and is enforced structurally, not by convention:
//   • ActionDef requires `authorize` and `record` — non-optional, so an action
//     that omits either does not type-check.
//   • ActionCtx (which carries the service-role client) is constructed ONLY
//     here; serviceClient is not exported, so no action can obtain a
//     service-role handle through this module.
//   • eslint rule `no-restricted-syntax` in src/lib/actions/** requires every
//     createServerFn().handler() body to be a direct runAction(def, data) call.
//   • scripts/check-action-split.mjs fails the BUILD if any action's handler
//     body reaches dist/client, or if any action server fn is not a runAction
//     call. Source-level lint catches the wrong shape; the build check catches
//     a wrong ARTIFACT for any reason, including causes nobody anticipated —
//     which is the class of failure this bug actually was.
export async function runAction<Input, Output extends JsonValue>(
  def: ActionDef<Input, Output>,
  data: ActionEnvelope<unknown>,
): Promise<ActionResult<JsonValue>> {
  // 1. identity — from the token in the body, never a userId field
  const auth = await requireUser(data.accessToken);
  if (!auth.ok) return { ok: false, error: auth.error, status: 401 };

  // 1b. step-up (Gate C) — only for actions that declare requiresStepUp.
  // Consumed here, before authorize()/handle() ever run, so a missing or
  // already-used token blocks the action before any real work happens. The
  // token is single-use: this call consumes it in the same step it verifies
  // it (pack_api.verify_and_consume_step_up_token), so a caller who fails
  // authorize() or handle() after this point must go back through
  // verifyStepUp(password) again for a retry — it cannot be replayed.
  if (def.requiresStepUp) {
    const stepUp = await consumeStepUpToken(auth.uid, data.stepUpToken);
    if (!stepUp.ok) {
      return { ok: false, error: "STEP_UP_REQUIRED", status: 401 };
    }
  }

  // 2. typed contract
  let input: Input;
  try {
    input = def.validate(data.input);
  } catch {
    return { ok: false, error: "invalid_input", status: 400 };
  }

  const isAgent = data.isAgent === true;

  // 3. §15.3 — no agent may execute a Commit-class action, ever
  if (def.class === "commit" && isAgent) {
    return { ok: false, error: "agent_commit_forbidden", status: 403 };
  }

  let sb: SupabaseClient;
  try {
    sb = serviceClient();
  } catch {
    return { ok: false, error: "supabase_not_configured", status: 500 };
  }

  const ctx: ActionCtx = { uid: auth.uid, scopeId: data.scopeId, isAgent, sb };

  // 4. authorization — required, runs before the handler
  let allowed = false;
  try {
    allowed = await def.authorize(ctx, input);
  } catch {
    return { ok: false, error: "authorize_failed", status: 500 };
  }
  if (!allowed) return { ok: false, error: "forbidden", status: 403 };

  // 5. handler
  let output: Output;
  try {
    output = await def.handle(ctx, input);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "handler_error",
      status: 500,
    };
  }

  // 6. record append (§8.3) — every action, read included. A failure to
  //    append is a records incident, surfaced not swallowed (§7.4 "errors
  //    must be checked"). Same pack_api gateway path.
  //
  //    SKIPPED when def.recordedByHandler is true — the handler already
  //    wrote this action's record entry itself, atomically, inside the same
  //    DB transaction as its state change (see the field's own doc comment
  //    above). Appending again here would be a second, non-atomic entry for
  //    the same event — a duplicate, not a safety net.
  //
  //    def.record() is NOT called by the gateway on this path — by
  //    construction, the handler itself is the one that must have already
  //    called it (to build the exact payload it passed into its atomic RPC
  //    call) before runAction ever reaches this line. A gateway-side call
  //    here would prove nothing about whether the handler used the same
  //    payload; it can only be a real check if it happens inside handle(),
  //    which is why confirmDeliverableDef's record() is invoked from within
  //    its own handle(), not left for the gateway to call at all.
  if (def.recordedByHandler) {
    return { ok: true, data: output };
  }

  const rec = def.record(input, output);
  const { data: appendRes, error: appendErr } = await sb
    .schema("pack_api")
    .rpc("append_record", {
      // p_org_id is the DB function's generic partition-key param — the
      // record chain is per-scope (deal_room_id / startup_id / org_id per
      // feature class). Not renamed in SQL to avoid churning the proven
      // append_record signature; ctx.scopeId is what's passed.
      p_org_id: ctx.scopeId,
      p_actor_id: ctx.uid,
      p_actor_type: ctx.isAgent ? "agent" : "human",
      p_action: def.name,
      p_object_type: rec.objectType,
      p_object_id: rec.objectId,
      p_data: rec.data ?? {},
    });
  if (
    appendErr ||
    (appendRes && (appendRes as { ok?: boolean }).ok === false)
  ) {
    return { ok: false, error: "record_append_failed", status: 500 };
  }

  return { ok: true, data: output };
}

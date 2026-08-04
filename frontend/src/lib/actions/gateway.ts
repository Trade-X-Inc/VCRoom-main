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

import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { requireUser } from "@/lib/require-user-fn";

// ── Tool classes (Foundation §15.2) ─────────────────────────────────────────
export type ActionClass = "read" | "prepare" | "commit";

// Action outputs cross the server-fn boundary as JSON, so they must be
// JSON-serializable. Bounding Output to this keeps the framework's
// serializability check satisfied at the gateway (rather than inheriting the
// `unknown`-in-return baseline error pattern that desk-fn.ts et al. carry).
export type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [k: string]: JsonValue };

// ── The envelope every action receives ──────────────────────────────────────
// accessToken: caller's Supabase token (body convention, matches existing fns).
// orgId: the org context the caller asserts; pack_api functions verify the
//        target object actually belongs to it.
// isAgent: agent vs human caller (§15.3 gate input for Commit actions).
// input: the action-specific payload, validated by def.input.
export type ActionEnvelope<Input> = {
  accessToken: string;
  orgId: string;
  isAgent?: boolean;
  input: Input;
};

export type ActionCtx = {
  uid: string;
  orgId: string;
  isAgent: boolean;
  sb: SupabaseClient;
};

export type ActionResult<O> =
  | { ok: true; data: O }
  | { ok: false; error: string; status: number };

export type ActionDef<Input, Output extends JsonValue> = {
  name: string; // stable id; also the record-entry action name
  class: ActionClass;
  validate: (raw: unknown) => Input; // narrow the untyped input payload
  authorize: (ctx: ActionCtx, input: Input) => Promise<boolean>;
  handle: (ctx: ActionCtx, input: Input) => Promise<Output>;
  record: (input: Input, output: Output) => { objectType: string; objectId: string | null; data?: JsonValue };
};

function serviceClient(): SupabaseClient {
  const url = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("supabase_not_configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── defineAction — the wrapper every action passes through ───────────────────
export function defineAction<Input, Output extends JsonValue>(def: ActionDef<Input, Output>) {
  return createServerFn({ method: "POST" })
    .inputValidator((raw: unknown): ActionEnvelope<unknown> => raw as ActionEnvelope<unknown>)
    // Return type declared as ActionResult<JsonValue> (concrete) so the
    // framework's serializability validator can discharge it — an open generic
    // `Output` cannot be proven serializable to ValidateSerializable and trips
    // the same check desk-fn.ts hits. def.handle is still fully typed as
    // Output; only the wire-boundary type is widened to the JsonValue bound.
    .handler(async ({ data }): Promise<ActionResult<JsonValue>> => {
      // 1. identity — from the token in the body, never a userId field
      const auth = await requireUser(data.accessToken);
      if (!auth.ok) return { ok: false, error: auth.error, status: 401 };

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

      const ctx: ActionCtx = { uid: auth.uid, orgId: data.orgId, isAgent, sb };

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
        return { ok: false, error: e instanceof Error ? e.message : "handler_error", status: 500 };
      }

      // 6. record append (§8.3) — every action, read included. A failure to
      //    append is a records incident, surfaced not swallowed (§7.4 "errors
      //    must be checked"). Same pack_api gateway path.
      const rec = def.record(input, output);
      const { data: appendRes, error: appendErr } = await sb
        .schema("pack_api")
        .rpc("append_record", {
          p_org_id: ctx.orgId,
          p_actor_id: ctx.uid,
          p_actor_type: ctx.isAgent ? "agent" : "human",
          p_action: def.name,
          p_object_type: rec.objectType,
          p_object_id: rec.objectId,
          p_data: rec.data ?? {},
        });
      if (appendErr || (appendRes && (appendRes as { ok?: boolean }).ok === false)) {
        return { ok: false, error: "record_append_failed", status: 500 };
      }

      return { ok: true, data: output };
    });
}

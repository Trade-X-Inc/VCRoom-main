// Pack Prepare P1 — gateway actions for SEVEN pack_api functions backing (the seventh, pack_schedule_get, is packScheduleGet below)
// the Prepare slice: schedule_get, pack_create, pack_field_set,
// pack_missing_fields, pack_fields_get, and pack_field_confirm. New file,
// deliberately NOT added to pack.ts (per instruction) — pack.ts holds the
// original pack.get Read action from the first design-proving pass; this
// file is the Prepare P1 slice's own surface, kept separable.
//
// LIVE STATUS, stated precisely rather than assumed: all six functions
// are confirmed LIVE in production. schedule_get, pack_create,
// pack_field_set, pack_field_confirm, and pack_missing_fields were
// verified via their own dry runs, each run against the real database —
// see supabase/drafts/DRAFT_prepare_p1*. pack_fields_get
// (supabase/drafts/DRAFT_pack_fields_get.sql) is now APPLIED to
// production (2026-10-17) — its deployed function body's MD5 is
// d67c1a568b7f5391133999bea165770a, verified against the draft file.
//
// pack_api.pack_field_value_matches_type is an internal helper, not a
// gateway function — it is never called from this file and must never be
// exposed as an action.
//
// ── PART 1 FINDING — recordedByHandler on all six, see below ──────────────
// gateway.ts's runAction step 6 appends a pack_api.append_record entry for
// EVERY action whose def.recordedByHandler is not true — this is
// unconditional on def.class. Confirmed by reading runAction directly (no
// `if (def.class !== "read")` guard anywhere in that block) and by its own
// header comment: "every action appends a record entry (§8.3 hash chain) —
// reads included, because the record logs actor/action/object regardless of
// class." Confirmed against the two existing read-class precedents too:
// pack.ts's packGetDef and deal-room-core.ts's roomGetDef-produced
// definitions are both class "read" and neither sets recordedByHandler —
// so both currently DO write a record entry on every successful call.
//
// Per instruction, this is a hard requirement for this slice: the six
// actions below must write ZERO record entries from the app layer.
// scheduleGet/packMissingFields/packFieldsGet are reads with nothing new to
// attest to; packCreate/packFieldSet are Prepare-class drafts that must not
// enter the record chain per the draft SQL's own design (CLAUDE.md "A4"
// finding — no record entry anywhere in this codebase carries a raw value,
// and drafts are deliberately kept out of the chain entirely);
// packFieldConfirm already appends its OWN record entry inside
// pack_api.pack_field_confirm itself, atomically, inside the same SQL
// transaction as the warranty write — a second, non-atomic gateway-side
// append on top of that would be a duplicate entry for the same event, not
// a safety net (same reasoning as deal-room-closing.ts's confirmDeliverable
// and deal-room-counsel.ts's five actions, both of which already use this
// exact flag for this exact reason). So: recordedByHandler: true on ALL SIX
// actions in this file, each with a minimal, still-required record() (never
// actually invoked by runAction on this path, but still the single declared
// TypeScript contract for what WOULD be written, per gateway.ts's own
// convention).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  runAction,
  type ActionDef,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";
import { MAX_VALUE_BYTES, valueByteLength } from "@/lib/pack/field-shapes";

// EVERY action in this file binds its own TOP-LEVEL createServerFn — see
// gateway.ts / deal-room-core.ts's header comment for the full §20.11
// rationale (TanStack Start's server-fn transform only finds a
// statically-analysable top-level createServerFn(...).handler(...); a
// factory-returned one ships the whole handler, service-role key
// included, to the client bundle). Enforced by eslint's no-restricted-
// syntax rule and scripts/check-action-split.mjs — neither touched here.
const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

// ── Typed error codes the UI can switch on ──────────────────────────────────
// Every {ok:false,error} string the seven (six exposed + the internal
// helper's error strings, which surface through pack_field_set/confirm)
// pack_api functions can return, named explicitly so a client never has to
// switch on a raw, unmapped string. "forbidden"/"not_authenticated" are
// the two gateway.ts itself can also produce (401/403 paths) — included
// here so the UI has one switch, not two.
export const PACK_ERROR_CODES = [
  "not_authenticated",
  "forbidden",
  "not_found",
  "schedule_not_found",
  "unknown_field",
  "value_mismatch",
  "value_required",
  "value_too_large",
  "expected_string",
  "expected_number",
  "expected_money_object_with_amount_and_3letter_currency",
  "money_amount_negative",
  "expected_date_string",
  "expected_iso_date_string",
  "expected_object_or_array",
  "enum_not_supported",
  "unknown_value_type",
  // Shape rules for the incorporation, team, cap table and market size fields
  // (pack_api.pack_structured_value_valid; see lib/pack/field-shapes.ts).
  "invalid_shape",
  "missing_required",
  "unknown_key",
  "blank",
  "too_long",
  "bad_enum",
  "bad_country",
  "bad_date",
  "future_date",
  "bad_percent",
  "bad_shares",
  "bad_url",
  "no_founder",
  "too_few_items",
  "too_many_items",
] as const;
export type PackErrorCode = (typeof PACK_ERROR_CODES)[number];

export function isPackErrorCode(v: unknown): v is PackErrorCode {
  return (
    typeof v === "string" && (PACK_ERROR_CODES as readonly string[]).includes(v)
  );
}

// ── zod schemas ──────────────────────────────────────────────────────────────
const uuidSchema = z.string().uuid();
// Field key convention observed in the live schedule_field rows (e.g.
// "tech.seed.problem_statement") — lowercase, digits, dot, underscore only.
const fieldKeySchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9._]+$/, "field key must match ^[a-z0-9._]+$");
const shortStringSchema = z.string().min(1).max(50);
// Any JSON value is accepted structurally — the SQL layer's own
// pack_field_value_matches_type is the real shape/type validator (per
// value_type). This schema only bounds total payload size BEFORE it ever
// reaches SQL, per instruction, independent of and in addition to the
// SQL-side c_max_value_bytes=8192 cap on the value's own text length. This
// guard uses the same limit, measured the same way (UTF-8 bytes of the
// jsonb-style text, see lib/pack/field-shapes.ts), so an oversize value is
// stopped before the network call.
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);
const boundedJsonValueSchema = jsonValueSchema.refine(
  (v) => {
    try {
      return valueByteLength(v) <= MAX_VALUE_BYTES;
    } catch {
      return false;
    }
  },
  { message: `value exceeds the ${MAX_VALUE_BYTES}-byte limit` },
);

function validationError(err: z.ZodError): Error {
  // Clean, non-leaking message — never a raw Postgres error, and never the
  // full zod issue tree (which can echo back the caller's own malformed
  // input verbatim). One short, human-readable summary.
  const first = err.issues[0];
  return new Error(
    `invalid_input: ${first?.path.join(".") || "value"} — ${first?.message ?? "validation failed"}`,
  );
}

// Unwraps the {ok, error, ...} jsonb envelope every pack_api function
// returns, mapping a known error code through as-is and anything
// unrecognised to a generic failure — never surfaces a raw Postgres
// error string to the caller.
function unwrapPackResult<T extends { ok: boolean; error?: string }>(
  fnName: string,
  data: unknown,
  error: { message: string } | null,
): T {
  if (error) throw new Error(`${fnName}_rpc_failed`);
  const res = data as T;
  if (!res.ok) {
    const code = res.error;
    throw new Error(isPackErrorCode(code) ? code : `${fnName}_failed`);
  }
  return res;
}

// ── 1. scheduleGet — Read ────────────────────────────────────────────────────
const ScheduleGetInputSchema = z.object({
  sector: shortStringSchema,
  stage: shortStringSchema,
});
type ScheduleGetInput = z.infer<typeof ScheduleGetInputSchema>;
type ScheduleGetOutput = { [k: string]: JsonValue };

const scheduleGetDef: ActionDef<ScheduleGetInput, ScheduleGetOutput> = {
  name: "pack.scheduleGet",
  class: "read",
  recordedByHandler: true, // see this file's header — no record for reads
  validate: (raw) => {
    const parsed = ScheduleGetInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.schedule_get self-authorizes
  // (it requires p_uid to be a real authenticated caller — see runAction's
  // own step 1 requireUser call, which already rejects an unauthenticated
  // caller before authorize() is ever reached). schedule_get has no
  // per-row ownership check of its own since a published schedule isn't
  // founder-private.
  authorize: async () => true,
  handle: async (ctx, input): Promise<ScheduleGetOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("schedule_get", {
        p_uid: ctx.uid,
        p_sector: input.sector,
        p_stage: input.stage,
      });
    return unwrapPackResult<ScheduleGetOutput & { ok: true; error?: string }>(
      "schedule_get",
      data,
      error,
    );
  },
  record: () => ({
    objectType: "pack_schedule",
    objectId: null,
    data: { note: "recordedByHandler=true — never actually appended" },
  }),
};
export const scheduleGet = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(scheduleGetDef, data),
  );

// ── 2. packCreate — Prepare ──────────────────────────────────────────────────
const PackCreateInputSchema = z.object({
  startupId: uuidSchema,
  scheduleId: uuidSchema,
});
type PackCreateInput = z.infer<typeof PackCreateInputSchema>;
type PackCreateOutput = { [k: string]: JsonValue };

const packCreateDef: ActionDef<PackCreateInput, PackCreateOutput> = {
  name: "pack.create",
  class: "prepare",
  recordedByHandler: true, // see this file's header — draft creation writes no record
  validate: (raw) => {
    const parsed = PackCreateInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.pack_create self-authorizes via
  // authz_is_startup_founder(p_uid, p_startup_id) — a non-founder caller
  // gets {ok:false,error:'forbidden'} from the SQL function itself, not
  // from this action's own logic.
  authorize: async () => true,
  handle: async (ctx, input): Promise<PackCreateOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("pack_create", {
      p_uid: ctx.uid,
      p_startup_id: input.startupId,
      p_schedule_id: input.scheduleId,
    });
    return unwrapPackResult<PackCreateOutput & { ok: true; error?: string }>(
      "pack_create",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "startup",
    objectId: input.startupId,
    data: { note: "recordedByHandler=true — never actually appended" },
  }),
};
export const packCreate = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(packCreateDef, data),
  );

// ── 3. packFieldSet — Prepare (draft save only) ──────────────────────────────
const PackFieldSetInputSchema = z.object({
  packId: uuidSchema,
  fieldKey: fieldKeySchema,
  value: boundedJsonValueSchema,
});
type PackFieldSetInput = z.infer<typeof PackFieldSetInputSchema>;
type PackFieldSetOutput = { [k: string]: JsonValue };

const packFieldSetDef: ActionDef<PackFieldSetInput, PackFieldSetOutput> = {
  name: "pack.fieldSet",
  class: "prepare",
  recordedByHandler: true, // see this file's header — draft save writes no record
  validate: (raw) => {
    const parsed = PackFieldSetInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.pack_field_set self-authorizes
  // via authz_is_startup_founder against the pack's own subject_ref — a
  // non-owner caller gets {ok:false,error:'forbidden'} from the SQL
  // function, never from this action's own logic. Note: pack_field_set
  // itself may still append a 'pack_field_warranty_voided' record entry
  // INSIDE the SQL function (on a changed value that was previously
  // confirmed) — that write is the SQL function's own, already-atomic
  // concern and is unrelated to and unaffected by this action's
  // recordedByHandler flag, which governs only the APP-LAYER gateway
  // append in runAction.
  authorize: async () => true,
  handle: async (ctx, input): Promise<PackFieldSetOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("pack_field_set", {
        p_uid: ctx.uid,
        p_pack_id: input.packId,
        p_field_key: input.fieldKey,
        p_value_json: input.value,
      });
    return unwrapPackResult<PackFieldSetOutput & { ok: true; error?: string }>(
      "pack_field_set",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "pack_field",
    objectId: `${input.packId}:${input.fieldKey}`,
    data: { note: "recordedByHandler=true — never actually appended" },
  }),
};
export const packFieldSet = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(packFieldSetDef, data),
  );

// ── 4. packMissingFields — Read ──────────────────────────────────────────────
const PackMissingFieldsInputSchema = z.object({
  packId: uuidSchema,
});
type PackMissingFieldsInput = z.infer<typeof PackMissingFieldsInputSchema>;
type PackMissingFieldsOutput = { [k: string]: JsonValue };

const packMissingFieldsDef: ActionDef<
  PackMissingFieldsInput,
  PackMissingFieldsOutput
> = {
  name: "pack.missingFields",
  class: "read",
  recordedByHandler: true, // see this file's header — no record for reads
  validate: (raw) => {
    const parsed = PackMissingFieldsInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.pack_missing_fields self-
  // authorizes via authz_is_startup_founder against the pack's own
  // subject_ref — a non-owner caller gets {ok:false,error:'forbidden'}
  // from the SQL function itself.
  authorize: async () => true,
  handle: async (ctx, input): Promise<PackMissingFieldsOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("pack_missing_fields", {
        p_uid: ctx.uid,
        p_pack_id: input.packId,
      });
    return unwrapPackResult<
      PackMissingFieldsOutput & { ok: true; error?: string }
    >("pack_missing_fields", data, error);
  },
  record: (input) => ({
    objectType: "pack",
    objectId: input.packId,
    data: { note: "recordedByHandler=true — never actually appended" },
  }),
};
export const packMissingFields = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(packMissingFieldsDef, data),
  );

// ── 5. packFieldsGet — Read — the founder-checked replacement for pack_get
// pack_api.pack_get (pack.ts's packGetDef) authorizes ONLY on a caller-
// supplied p_org_id matching pack.org_id — it never checks p_uid against
// the pack's real owner at all (confirmed by reading packGetDef.authorize
// itself: it unconditionally returns true, deferring entirely to the SQL
// function, whose own check is `v_pack.org_id <> p_org_id`, a spoofable-
// parameter match, not a derived-identity check — the exact §7.1 shape
// CLAUDE.md already warns against). pack_get/packGet must NOT be used by
// the pack screens — this action is the real replacement for the one
// thing they need from it: reading a pack's own fields, authorized
// against the caller's ACTUAL founder relationship via
// pack_api.pack_fields_get (supabase/drafts/DRAFT_pack_fields_get.sql,
// now APPLIED to production, 2026-10-17 — deployed body MD5
// d67c1a568b7f5391133999bea165770a, verified against the draft file).
const PackFieldsGetInputSchema = z.object({
  packId: uuidSchema,
});
type PackFieldsGetInput = z.infer<typeof PackFieldsGetInputSchema>;
type PackFieldsGetOutput = { [k: string]: JsonValue };

const packFieldsGetDef: ActionDef<PackFieldsGetInput, PackFieldsGetOutput> = {
  name: "pack.fieldsGet",
  class: "read",
  recordedByHandler: true, // see this file's header — no record for reads
  validate: (raw) => {
    const parsed = PackFieldsGetInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.pack_fields_get self-authorizes
  // via authz_is_startup_founder against the pack's own subject_ref — a
  // non-owner caller gets {ok:false,error:'forbidden'} from the SQL
  // function itself, never from this action's own logic. Unlike pack_get,
  // this function takes NO p_org_id parameter at all — there is nothing
  // for a caller to spoof.
  authorize: async () => true,
  handle: async (ctx, input): Promise<PackFieldsGetOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("pack_fields_get", {
        p_uid: ctx.uid,
        p_pack_id: input.packId,
      });
    return unwrapPackResult<PackFieldsGetOutput & { ok: true; error?: string }>(
      "pack_fields_get",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "pack",
    objectId: input.packId,
    data: { note: "recordedByHandler=true — never actually appended" },
  }),
};
export const packFieldsGet = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(packFieldsGetDef, data),
  );

// ── 5b. packScheduleGet — Read — the schedule a pack is PINNED to ───────────
// scheduleGet (above) always returns the latest PUBLISHED schedule for a
// sector/stage; a pack is pinned to one schedule row (pack.schedule_id), so
// the pack screens must load that row instead. pack_api.pack_schedule_get
// (APPLIED to production by hand 2026-10-18 after an 11/11 dry run, body md5
// 4ef2cda8a80cd4cf9465f4f43edca339; migration
// 20261018100000_pack_api_pack_schedule_get.sql) returns {ok, schedule,
// fields} in the same shape as schedule_get and self-authorizes exactly like
// pack_fields_get: the caller (p_uid, from the session) must be the founder
// of the pack's startup. There is no org id or user id in the input.
// Errors: not_authenticated, not_found, forbidden. Read-only: no record entry.
const PackScheduleGetInputSchema = z.object({
  packId: uuidSchema,
});
type PackScheduleGetInput = z.infer<typeof PackScheduleGetInputSchema>;
type PackScheduleGetOutput = { [k: string]: JsonValue };

const packScheduleGetDef: ActionDef<
  PackScheduleGetInput,
  PackScheduleGetOutput
> = {
  name: "pack.scheduleGet",
  class: "read",
  recordedByHandler: true, // see this file's header — no record for reads
  validate: (raw) => {
    const parsed = PackScheduleGetInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.pack_schedule_get self-authorizes
  // via authz_is_startup_founder against the pack's own subject_ref, same as
  // pack_fields_get; a non-owner gets {ok:false,error:'forbidden'} from SQL.
  authorize: async () => true,
  handle: async (ctx, input): Promise<PackScheduleGetOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("pack_schedule_get", {
        p_uid: ctx.uid,
        p_pack_id: input.packId,
      });
    return unwrapPackResult<
      PackScheduleGetOutput & { ok: true; error?: string }
    >("pack_schedule_get", data, error);
  },
  record: (input) => ({
    objectType: "pack",
    objectId: input.packId,
    data: { note: "recordedByHandler=true — never actually appended" },
  }),
};
export const packScheduleGet = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(packScheduleGetDef, data),
  );

// ── 6. packFieldConfirm — COMMIT ─────────────────────────────────────────────
// p_expected_value must be EXACTLY the value last saved/returned by
// packFieldSet (or by a prior packFieldConfirm) — pack_api.pack_field_confirm
// compares it against the currently stored value_json and returns
// 'value_mismatch' on any difference, including a value that merely LOOKS
// equivalent but isn't byte-identical as JSON (e.g. key order differences
// inside an object do not matter to jsonb equality, but a client sending a
// value it never actually had confirmed from the server is exactly the
// case this comparison exists to reject). The UI is responsible for
// passing back the server's own last-known value, never a value it
// constructed independently.
const PackFieldConfirmInputSchema = z.object({
  packId: uuidSchema,
  fieldKey: fieldKeySchema,
  expectedValue: boundedJsonValueSchema,
});
type PackFieldConfirmInput = z.infer<typeof PackFieldConfirmInputSchema>;
type PackFieldConfirmOutput = { [k: string]: JsonValue };

const packFieldConfirmDef: ActionDef<
  PackFieldConfirmInput,
  PackFieldConfirmOutput
> = {
  name: "pack.fieldConfirm",
  class: "commit",
  // requiresStepUp: false — per instruction, not set (defaults to
  // false/absent, same as every action in this codebase that doesn't
  // explicitly opt into Gate C password re-entry; confirmDeliverable is
  // the one exception in this codebase, not the default).
  //
  // recordedByHandler: true — pack_api.pack_field_confirm already calls
  // pack_v1.append_record itself, ATOMICALLY, inside the SAME SQL
  // transaction as the warranted_by/warranted_at write (see the draft's
  // own design note). A second, non-atomic gateway-side append here would
  // be a duplicate entry for the same confirmation event, not a safety
  // net — same reasoning, same flag, as deal-room-closing.ts's
  // confirmDeliverable and every action in deal-room-counsel.ts.
  recordedByHandler: true,
  validate: (raw) => {
    const parsed = PackFieldConfirmInputSchema.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable here ONLY because pack_api.pack_field_confirm self-
  // authorizes via authz_is_startup_founder against the pack's own
  // subject_ref — a non-owner caller gets {ok:false,error:'forbidden'}
  // from the SQL function itself, never from this action's own logic.
  // The gateway's own step 3 (no agent may execute a Commit-class
  // action) is the separate, structural guard this class value activates
  // — unrelated to and not satisfied by this authorize() returning true.
  authorize: async () => true,
  handle: async (ctx, input): Promise<PackFieldConfirmOutput> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("pack_field_confirm", {
        p_uid: ctx.uid,
        p_pack_id: input.packId,
        p_field_key: input.fieldKey,
        p_expected_value: input.expectedValue,
      });
    return unwrapPackResult<
      PackFieldConfirmOutput & { ok: true; error?: string }
    >("pack_field_confirm", data, error);
  },
  record: (input) => ({
    objectType: "pack_field",
    objectId: `${input.packId}:${input.fieldKey}`,
    data: { note: "recordedByHandler=true — already appended inside SQL" },
  }),
};
export const packFieldConfirm = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(packFieldConfirmDef, data),
  );

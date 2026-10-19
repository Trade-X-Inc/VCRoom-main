// Founder-side Brief link actions (slice S1). Four actions over the four pack_api.brief_link_* functions
// (supabase/migrations/20261019090000_pack_v1_brief_link.sql). Same shape as pack-prepare.ts: each binds its own
// TOP-LEVEL createServerFn (see gateway.ts, CLAUDE.md §20.11) whose handler is a direct runAction call.
//
// CLASSES. create, revoke and set-expiry are Commit-class: they hand out, withdraw or change access to the
// founder's pack, so the gateway refuses an agent caller (§15.3). list is Read.
//
// IDENTITY. The caller is the session user only: runAction resolves it from the bearer token and passes it as
// p_uid. No input field names a user. scopeId (the startup id the pack screens already pass) only keys the record
// chain; it is not an authorization input. Authorization is the RPC's own check (pack owner = startup founder).
//
// RECORD. recordedByHandler is true on all four: the three state-changing functions append their own record
// entry inside the same database transaction as the change (and list writes none), so the gateway must not
// append a second one. record() below is therefore never called; it describes the object and carries no data.
//
// THE TOKEN. brief_link_create returns the link token once, in its result. It is never in the input, never in the
// record, and nothing in the gateway or here logs a result or an error body (errors are codes only). The caller
// holds it in memory for the one screen that shows it.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  runAction,
  type ActionDef,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";
import { isPackErrorCode } from "./pack-prepare";
import { checkLabel, isValidExpiryDays } from "@/lib/pack/brief-link";

const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

const uuidSchema = z.string().uuid();
// 1 to 80 characters after trimming, counted the way the server counts (see lib/pack/brief-link.ts).
const labelSchema = z
  .string()
  .max(400)
  .refine((v) => checkLabel(v).ok, "label must be 1 to 80 characters");
const daysSchema = z
  .number()
  .refine(isValidExpiryDays, "days must be a whole number from 1 to 90");

function validationError(err: z.ZodError): Error {
  const first = err.issues[0];
  return new Error(
    `invalid_input: ${first?.path.join(".") || "value"} — ${first?.message ?? "validation failed"}`,
  );
}

// Unwraps the {ok, error, ...} envelope the RPCs return. A known code passes through as the error message; an
// unknown one becomes a generic failure. Never a raw database error, never the result body.
function unwrap<T extends { ok: boolean; error?: string }>(
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

type Out = { [k: string]: JsonValue };
const NOTE =
  "recordedByHandler=true — appended inside SQL (or nothing to record for a read)";

// ── 1. briefLinkCreate — Commit ─────────────────────────────────────────────
const CreateInput = z.object({
  packId: uuidSchema,
  label: labelSchema,
  expiresInDays: daysSchema.optional(),
});
type CreateInputT = z.infer<typeof CreateInput>;

const briefLinkCreateDef: ActionDef<CreateInputT, Out> = {
  name: "briefLink.create",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const parsed = CreateInput.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  // Acceptable only because pack_api.brief_link_create authorizes by itself (pack owner, answered as not_found
  // for anyone else); the Commit class is the gateway's separate human-only guard.
  authorize: async () => true,
  handle: async (ctx, input): Promise<Out> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("brief_link_create", {
        p_uid: ctx.uid,
        p_pack_id: input.packId,
        p_label: input.label,
        p_expires_in_days: input.expiresInDays ?? null,
      });
    return unwrap<Out & { ok: true; error?: string }>(
      "brief_link_create",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "pack",
    objectId: input.packId,
    data: { note: NOTE },
  }),
};
export const briefLinkCreate = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(briefLinkCreateDef, data),
  );

// ── 2. briefLinkList — Read ─────────────────────────────────────────────────
const ListInput = z.object({ packId: uuidSchema });
type ListInputT = z.infer<typeof ListInput>;

const briefLinkListDef: ActionDef<ListInputT, Out> = {
  name: "briefLink.list",
  class: "read",
  recordedByHandler: true,
  validate: (raw) => {
    const parsed = ListInput.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  authorize: async () => true, // brief_link_list self-authorizes the same way
  handle: async (ctx, input): Promise<Out> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("brief_link_list", { p_uid: ctx.uid, p_pack_id: input.packId });
    return unwrap<Out & { ok: true; error?: string }>(
      "brief_link_list",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "pack",
    objectId: input.packId,
    data: { note: NOTE },
  }),
};
export const briefLinkList = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(briefLinkListDef, data),
  );

// ── 3. briefLinkRevoke — Commit ─────────────────────────────────────────────
const RevokeInput = z.object({ linkId: uuidSchema });
type RevokeInputT = z.infer<typeof RevokeInput>;

const briefLinkRevokeDef: ActionDef<RevokeInputT, Out> = {
  name: "briefLink.revoke",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const parsed = RevokeInput.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  authorize: async () => true, // brief_link_revoke self-authorizes the same way
  handle: async (ctx, input): Promise<Out> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("brief_link_revoke", { p_uid: ctx.uid, p_link_id: input.linkId });
    return unwrap<Out & { ok: true; error?: string }>(
      "brief_link_revoke",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "brief_link",
    objectId: input.linkId,
    data: { note: NOTE },
  }),
};
export const briefLinkRevoke = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(briefLinkRevokeDef, data),
  );

// ── 4. briefLinkSetExpiry — Commit ──────────────────────────────────────────
const SetExpiryInput = z.object({
  linkId: uuidSchema,
  expiresInDays: daysSchema,
});
type SetExpiryInputT = z.infer<typeof SetExpiryInput>;

const briefLinkSetExpiryDef: ActionDef<SetExpiryInputT, Out> = {
  name: "briefLink.setExpiry",
  class: "commit",
  recordedByHandler: true,
  validate: (raw) => {
    const parsed = SetExpiryInput.safeParse(raw);
    if (!parsed.success) throw validationError(parsed.error);
    return parsed.data;
  },
  authorize: async () => true, // brief_link_set_expiry self-authorizes the same way
  handle: async (ctx, input): Promise<Out> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("brief_link_set_expiry", {
        p_uid: ctx.uid,
        p_link_id: input.linkId,
        p_expires_in_days: input.expiresInDays,
      });
    return unwrap<Out & { ok: true; error?: string }>(
      "brief_link_set_expiry",
      data,
      error,
    );
  },
  record: (input) => ({
    objectType: "brief_link",
    objectId: input.linkId,
    data: { note: NOTE },
  }),
};
export const briefLinkSetExpiry = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(briefLinkSetExpiryDef, data),
  );

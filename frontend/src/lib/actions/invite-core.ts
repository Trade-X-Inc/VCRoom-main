// Invitation gateway actions — the definitions (job J3a). Plain module: NO createServerFn here (the server functions are
// bound at module top level in invite.ts, see gateway.ts and CLAUDE.md §20.11). Everything the tests need to drive the
// real pipeline (runAction) lives here, behind makeInviteDefs(deps), so the tests inject a mailer and the RPC layer
// without a network.
//
// DATABASE. invite_api.create_invite / resend_invite / revoke_invite / mark_sent / list_invites (migration
// 20261020100000_invite_v1.sql, CLAUDE.md §20.28), called with the service-role client exactly like pack_api:
// ctx.sb.schema("invite_api").rpc(...). invite_api must be in the project's "Exposed schemas" (owner step in the J3a
// report); until it is, every call fails with a PostgREST schema error and the action returns a generic failure.
//
// IDENTITY. p_uid is ctx.uid, which runAction resolved from the caller's bearer token. No input field names a user,
// and every schema is strict, so a body carrying userId/uid/p_uid is refused as invalid_input, never read.
//
// POLICY E. The recipient of the email is the address on the invitation row the RPC just created or re-issued (it comes
// back in the RPC result); the client's only input is the address it typed for NEW invitations, validated and
// lowercased here and again by the database. A resend takes only an invitation id.
//
// THE TOKEN. create_invite / resend_invite return the raw token once. It stays inside handle(): it goes into the email
// link (URL fragment) and nowhere else. It is not returned, not logged, not put in an error and not in the record.
// Errors leave this module as short codes only, never as a database message or a result body.
//
// STEP-UP. Inviting an ADMIN-level role (team / fund_team, role "admin") needs the password re-entry step-up. The
// action's requiresStepUp is a predicate over the raw input that uses the same schema as validate().
import { z } from "zod";
import type { ActionDef, ActionCtx, JsonValue } from "./gateway";

// ── vocabulary ──────────────────────────────────────────────────────────────
export const INVITE_KINDS = [
  "room_member",
  "room_counsel",
  "team",
  "fund_team",
] as const;
export type InviteKind = (typeof INVITE_KINDS)[number];

export const ROLES_BY_KIND: Record<InviteKind, readonly string[]> = {
  room_member: ["founder", "investor"],
  room_counsel: ["founder", "investor"],
  team: ["admin", "manager", "analyst", "viewer"],
  fund_team: ["admin", "associate", "analyst", "external"],
};

// Codes the invite_api functions return. Anything else becomes "<function>_failed".
export const INVITE_ERROR_CODES = [
  "not_authenticated",
  "not_authorized",
  "invalid_input",
  "invalid_role",
  "invalid_expiry",
  "invalid_email",
  "invalid_state",
  "duplicate_pending",
  "already_member",
  "role_already_filled",
  "role_exceeds_caller",
  "not_ready",
  "daily_cap_sender",
  "daily_cap_scope",
  "too_soon",
  "too_many_sends",
  "lifetime_exceeded",
] as const;
export function isInviteErrorCode(v: unknown): v is string {
  return (
    typeof v === "string" &&
    (INVITE_ERROR_CODES as readonly string[]).includes(v)
  );
}

// Same shape the database enforces (invite_email_shape): one @, a dot after it, no whitespace or control characters.
const EMAIL_SHAPE = /^[^@\s\p{Cc}]+@[^@\s\p{Cc}]+\.[^@\s\p{Cc}]+$/u;
const uuid = z.string().uuid();
const emailField = z
  .string()
  .max(254)
  .transform((v) => v.trim().toLowerCase())
  .refine(
    (v) => v.length >= 5 && v.length <= 254 && EMAIL_SHAPE.test(v),
    "invalid email",
  );
const expiryField = z.number().int().min(1).max(30);

// ── create ──────────────────────────────────────────────────────────────────
export const CreateInviteInput = z
  .object({
    kind: z.enum(INVITE_KINDS),
    email: emailField.optional(),
    role: z.string().max(20).optional(),
    roomId: uuid.optional(),
    startupId: uuid.optional(),
    investorId: uuid.optional(),
    requestId: uuid.optional(),
    expiresInDays: expiryField.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const bad = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    const has = {
      room: v.roomId !== undefined,
      startup: v.startupId !== undefined,
      investor: v.investorId !== undefined,
      request: v.requestId !== undefined,
    };
    // exactly the scope this kind uses
    if (v.kind === "room_member" || v.kind === "room_counsel") {
      if (!has.room) bad("roomId", "required");
      if (has.startup || has.investor)
        bad("scope", "wrong scope for this kind");
    } else if (v.kind === "team") {
      if (!has.startup) bad("startupId", "required");
      if (has.room || has.investor) bad("scope", "wrong scope for this kind");
    } else {
      if (!has.investor) bad("investorId", "required");
      if (has.room || has.startup) bad("scope", "wrong scope for this kind");
    }
    if (v.kind === "room_counsel") {
      // the address and the side come from the approved counsel request, never from the caller
      if (!has.request) bad("requestId", "required");
      if (v.email !== undefined)
        bad("email", "not accepted for counsel invitations");
    } else {
      if (has.request) bad("requestId", "only for counsel invitations");
      if (v.email === undefined) bad("email", "required");
      if (v.role === undefined) bad("role", "required");
    }
    if (v.role !== undefined && !ROLES_BY_KIND[v.kind].includes(v.role))
      bad("role", "not a role for this kind");
  });
export type CreateInviteInputT = z.infer<typeof CreateInviteInput>;

/** Admin-level role on a team or fund-team invitation: the only create that needs the password step-up. */
export function isAdminLevel(v: CreateInviteInputT): boolean {
  return (v.kind === "team" || v.kind === "fund_team") && v.role === "admin";
}
/** Predicate for ActionDef.requiresStepUp: parses the raw input with the action's own schema. */
export function createNeedsStepUp(raw: unknown): boolean {
  const p = CreateInviteInput.safeParse(raw);
  return p.success && isAdminLevel(p.data);
}

// ── resend / revoke / list ──────────────────────────────────────────────────
export const InviteIdInput = z.object({ inviteId: uuid }).strict();
export type InviteIdInputT = z.infer<typeof InviteIdInput>;

export const ListInvitesInput = z
  .object({
    kind: z.enum(INVITE_KINDS),
    roomId: uuid.optional(),
    startupId: uuid.optional(),
    investorId: uuid.optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const n = [v.roomId, v.startupId, v.investorId].filter(
      (x) => x !== undefined,
    ).length;
    const ok =
      n === 1 &&
      (((v.kind === "room_member" || v.kind === "room_counsel") &&
        v.roomId !== undefined) ||
        (v.kind === "team" && v.startupId !== undefined) ||
        (v.kind === "fund_team" && v.investorId !== undefined));
    if (!ok)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scope"],
        message: "exactly the scope this kind uses",
      });
  });
export type ListInvitesInputT = z.infer<typeof ListInvitesInput>;

function validationError(err: z.ZodError): Error {
  const first = err.issues[0];
  return new Error(
    `invalid_input: ${first?.path.join(".") || "value"} — ${first?.message ?? "validation failed"}`,
  );
}

// ── safe output helpers ─────────────────────────────────────────────────────
/** "jane.doe@example.com" → "j***@example.com". The full address is never returned to the browser. */
export function maskEmail(value: unknown): string {
  const s = typeof value === "string" ? value : "";
  const at = s.lastIndexOf("@");
  if (at < 1 || at === s.length - 1) return "***";
  return `${s[0]}***${s.slice(at)}`;
}

type Out = { [k: string]: JsonValue };
type Rpc = { [k: string]: unknown };

function unwrap(fnName: string, data: unknown, error: unknown): Rpc {
  if (error) throw new Error(`${fnName}_rpc_failed`);
  const res = (data ?? {}) as Rpc;
  if (res.ok !== true) {
    const code = res.error;
    throw new Error(isInviteErrorCode(code) ? code : `${fnName}_failed`);
  }
  return res;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── dependencies (injected) ─────────────────────────────────────────────────
export type InviteDeps = {
  /** Sends the invitation email. Returns true only when the provider accepted it. Must never throw or log the token. */
  sendEmail: (d: {
    to: string;
    inviterName: string;
    orgName: string;
    kind: string;
    role: string;
    token: string;
    expiresAt?: string;
  }) => Promise<boolean>;
};

const SEND_FAILED_MESSAGE =
  "The invitation was created, but the email could not be sent. You can resend it.";

async function inviterNameOf(ctx: ActionCtx): Promise<string> {
  try {
    const { data } = await ctx.sb
      .from("users")
      .select("full_name")
      .eq("id", ctx.uid)
      .maybeSingle();
    const n = str((data as { full_name?: unknown } | null)?.full_name).trim();
    return n || "A colleague";
  } catch {
    return "A colleague";
  }
}

// After create / resend succeeded: send the email, record the outcome with mark_sent, return ONLY safe fields.
async function deliver(
  ctx: ActionCtx,
  deps: InviteDeps,
  res: Rpc,
  action: "created" | "resent",
): Promise<Out> {
  const token = str(res.token);
  const inviteId = str(res.invite_id);
  let sent = false;
  if (token && inviteId && str(res.email)) {
    try {
      sent = await deps.sendEmail({
        to: str(res.email),
        inviterName: await inviterNameOf(ctx),
        orgName: str(res.org_name),
        kind: str(res.kind),
        role: str(res.role),
        token,
        expiresAt: str(res.expires_at) || undefined,
      });
    } catch {
      sent = false;
    }
  }
  // The send outcome is an audit event only; failing to record it must not fail the request.
  try {
    await ctx.sb.schema("invite_api").rpc("mark_sent", {
      p_uid: ctx.uid,
      p_invite_id: inviteId,
      p_ok: sent,
    });
  } catch {
    /* audit-only */
  }
  const out: Out = {
    inviteId,
    kind: str(res.kind),
    role: str(res.role),
    status: "pending",
    email: maskEmail(res.email),
    orgName: str(res.org_name),
    expiresAt: str(res.expires_at),
    emailSent: sent,
    action,
  };
  if (!sent) out.message = SEND_FAILED_MESSAGE;
  return out;
}

// ── the definitions ─────────────────────────────────────────────────────────
// One builder per action, so each server function reaches only what its own action does (the H3 guard follows these
// calls: revoke and list must not look like email senders).
export function makeCreateDef(
  deps: InviteDeps,
): ActionDef<CreateInviteInputT, Out> {
  const create: ActionDef<CreateInviteInputT, Out> = {
    name: "invite.create",
    class: "commit",
    requiresStepUp: createNeedsStepUp,
    validate: (raw) => {
      const p = CreateInviteInput.safeParse(raw);
      if (!p.success) throw validationError(p.error);
      return p.data;
    },
    // invite_api.create_invite authorizes by itself (scope authority and role rank; not-allowed and does-not-exist
    // are one answer, not_authorized). The Commit class is the gateway's separate human-only guard.
    authorize: async () => true,
    handle: async (ctx, input): Promise<Out> => {
      const { data, error } = await ctx.sb
        .schema("invite_api")
        .rpc("create_invite", {
          p_uid: ctx.uid,
          p_kind: input.kind,
          p_email: input.email ?? null,
          p_role: input.role ?? null,
          p_scope_room: input.roomId ?? null,
          p_scope_startup: input.startupId ?? null,
          p_scope_investor: input.investorId ?? null,
          p_request_id: input.requestId ?? null,
          p_expires_in_days: input.expiresInDays ?? null,
        });
      return deliver(
        ctx,
        deps,
        unwrap("create_invite", data, error),
        "created",
      );
    },
    // The record carries the kind and role only: no address, no token, no scope id beyond the chain partition.
    record: (input, output) => ({
      objectType: "invite",
      objectId: str(output.inviteId) || null,
      data: { kind: input.kind, role: input.role ?? null },
    }),
  };

  return create;
}

export function makeResendDef(
  deps: InviteDeps,
): ActionDef<InviteIdInputT, Out> {
  const resend: ActionDef<InviteIdInputT, Out> = {
    name: "invite.resend",
    class: "commit",
    validate: (raw) => {
      const p = InviteIdInput.safeParse(raw);
      if (!p.success) throw validationError(p.error);
      return p.data;
    },
    authorize: async () => true, // invite_api.resend_invite self-authorizes (can_manage)
    handle: async (ctx, input): Promise<Out> => {
      const { data, error } = await ctx.sb
        .schema("invite_api")
        .rpc("resend_invite", { p_uid: ctx.uid, p_invite_id: input.inviteId });
      return deliver(ctx, deps, unwrap("resend_invite", data, error), "resent");
    },
    record: (input) => ({
      objectType: "invite",
      objectId: input.inviteId,
      data: { action: "resent" },
    }),
  };

  return resend;
}

export function makeRevokeDef(): ActionDef<InviteIdInputT, Out> {
  const revoke: ActionDef<InviteIdInputT, Out> = {
    name: "invite.revoke",
    class: "commit",
    validate: (raw) => {
      const p = InviteIdInput.safeParse(raw);
      if (!p.success) throw validationError(p.error);
      return p.data;
    },
    authorize: async () => true, // invite_api.revoke_invite self-authorizes (can_manage)
    handle: async (ctx, input): Promise<Out> => {
      const { data, error } = await ctx.sb
        .schema("invite_api")
        .rpc("revoke_invite", { p_uid: ctx.uid, p_invite_id: input.inviteId });
      const res = unwrap("revoke_invite", data, error);
      return {
        inviteId: input.inviteId,
        status: "revoked",
        alreadyRevoked: res.already_revoked === true,
      };
    },
    record: (input) => ({
      objectType: "invite",
      objectId: input.inviteId,
      data: { action: "revoked" },
    }),
  };

  return revoke;
}

export function makeListDef(): ActionDef<ListInvitesInputT, Out> {
  const list: ActionDef<ListInvitesInputT, Out> = {
    name: "invite.list",
    class: "read",
    validate: (raw) => {
      const p = ListInvitesInput.safeParse(raw);
      if (!p.success) throw validationError(p.error);
      return p.data;
    },
    authorize: async () => true, // invite_api.list_invites returns only what the caller may manage
    handle: async (ctx, input): Promise<Out> => {
      const { data, error } = await ctx.sb
        .schema("invite_api")
        .rpc("list_invites", {
          p_uid: ctx.uid,
          p_kind: input.kind,
          p_scope_room: input.roomId ?? null,
          p_scope_startup: input.startupId ?? null,
          p_scope_investor: input.investorId ?? null,
        });
      const res = unwrap("list_invites", data, error);
      const rows = Array.isArray(res.invites) ? (res.invites as Rpc[]) : [];
      // An explicit allow-list of fields: no token, no hash, no creator id, and the address is masked.
      const invites: Out[] = rows.map((r) => ({
        id: str(r.id),
        kind: str(r.kind),
        role: str(r.role),
        status: str(r.status),
        email: maskEmail(r.email),
        expiresAt: str(r.expires_at),
        createdAt: str(r.created_at),
        lastSentAt: str(r.last_sent_at) || null,
        sendCount: typeof r.send_count === "number" ? r.send_count : 0,
        acceptedAt: str(r.accepted_at) || null,
      }));
      return { invites };
    },
    record: (input) => ({
      objectType: "invite_list",
      objectId: null,
      data: { kind: input.kind },
    }),
  };

  return list;
}

/** All four, for tests that drive them together. */
export function makeInviteDefs(deps: InviteDeps) {
  return {
    create: makeCreateDef(deps),
    resend: makeResendDef(deps),
    revoke: makeRevokeDef(),
    list: makeListDef(),
  };
}

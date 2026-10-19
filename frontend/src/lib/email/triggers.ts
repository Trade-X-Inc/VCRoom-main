import { createServerFn } from "@tanstack/react-start";
import { requireUserIdentity } from "@/lib/require-user-fn";
import { readProviderEnv } from "./server-env";
import {
  welcomeEmailHandler,
  ndaSignedEmailHandler,
  documentUploadedEmailHandler,
  startupTeamInviteHandler,
  lawyerInviteHandler,
  dealRoomInviteHandler,
} from "./handlers";

// The five server functions that can send email (CLAUDE.md §20.23). Each one resolves the caller from their own
// access token first and answers { ok:false, error:"not_authenticated" } before anything else happens. None takes a
// recipient in its request: the address is the session's own (A), a member of a room the caller belongs to (B), or
// the address on an invite record the caller created (E). The policy checks live in handlers.ts and policy.ts.
//
// Removed on 19 Oct 2026 (policy D, zero callers anywhere in the codebase, each took a free-form recipient from the
// request): triggerDealRoomInvite, triggerNdaSigned, triggerDecision, triggerDocumentUploaded,
// triggerMeetingScheduled, triggerFeedbackRequest, triggerDecisionEmail, triggerMeetingEmail.

type WithToken<T> = { accessToken?: string } & T;

function splitToken(data: unknown): { accessToken: string | undefined; rest: unknown } {
  if (!data || typeof data !== "object" || Array.isArray(data)) return { accessToken: undefined, rest: null };
  const { accessToken, ...rest } = data as Record<string, unknown>;
  return { accessToken: typeof accessToken === "string" ? accessToken : undefined, rest };
}

// A: welcome email, to the signed-in user's own address.
export const triggerWelcomeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as WithToken<Record<string, never>>)
  .handler(async ({ data }) => {
    const { accessToken, rest } = splitToken(data);
    const auth = await requireUserIdentity(accessToken);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    return welcomeEmailHandler({ env: readProviderEnv() }, auth.identity, rest);
  });

// B: the investor who signed tells the room's founder(s).
export const triggerNdaSignedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as WithToken<{ dealRoomId: string }>)
  .handler(async ({ data }) => {
    const { accessToken, rest } = splitToken(data);
    const auth = await requireUserIdentity(accessToken);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    return ndaSignedEmailHandler({ env: readProviderEnv() }, auth.identity, rest);
  });

// B: a member uploads a document; the room's investors are told.
export const triggerDocumentUploadedEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as WithToken<{ dealRoomId: string; documentName: string }>)
  .handler(async ({ data }) => {
    const { accessToken, rest } = splitToken(data);
    const auth = await requireUserIdentity(accessToken);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    return documentUploadedEmailHandler({ env: readProviderEnv() }, auth.identity, rest);
  });

// E: team invite. The request carries only the invite token, which the creator got back when the record was made.
export const triggerStartupTeamInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as WithToken<{ token: string }>)
  .handler(async ({ data }) => {
    const { accessToken, rest } = splitToken(data);
    const auth = await requireUserIdentity(accessToken);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    return startupTeamInviteHandler({ env: readProviderEnv() }, auth.identity, rest);
  });

// E: legal counsel invite, same shape.
export const triggerLawyerInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as WithToken<{ token: string }>)
  .handler(async ({ data }) => {
    const { accessToken, rest } = splitToken(data);
    const auth = await requireUserIdentity(accessToken);
    if (!auth.ok) return { ok: false as const, error: auth.error };
    return lawyerInviteHandler({ env: readProviderEnv() }, auth.identity, rest);
  });

// E: deal-room invite. Creates the invite record with the caller's own token, so row-level security decides.
export const sendDealRoomInvite = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as WithToken<Record<string, unknown>>)
  .handler(async ({ data }) => {
    const { accessToken, rest } = splitToken(data);
    const auth = await requireUserIdentity(accessToken);
    if (!auth.ok || !accessToken) return { ok: false as const, error: auth.ok ? "not_authenticated" : auth.error };
    return dealRoomInviteHandler({ env: readProviderEnv() }, auth.identity, accessToken, rest);
  });

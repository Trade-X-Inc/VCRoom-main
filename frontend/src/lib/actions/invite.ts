// Invitation gateway actions (job J3a): invite.create, invite.resend, invite.revoke, invite.list. Server side only.
// The definitions live in invite-core.ts (a plain module, so tests can drive the real pipeline); this file only binds
// each one to its own TOP-LEVEL createServerFn whose handler is a direct runAction call (gateway.ts, CLAUDE.md §20.11).
//
// create and resend send the invitation email from the SERVER (policy E, CLAUDE.md §20.23): the recipient is the address
// on the invitation row the database just created or re-issued, and the link carries the token in the URL fragment.
// See invite-core.ts for the token, identity and step-up rules.
import { createServerFn } from "@tanstack/react-start";
import {
  runAction,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";
import {
  makeCreateDef,
  makeResendDef,
  makeRevokeDef,
  makeListDef,
} from "./invite-core";
import { sendInvitationEmail } from "@/lib/email/invite-send";
import { readProviderEnv } from "@/lib/email/server-env";

const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

const inviteDeps = {
  sendEmail: (d: Parameters<typeof sendInvitationEmail>[1]) =>
    sendInvitationEmail(readProviderEnv(), d),
};
const inviteCreateDef = makeCreateDef(inviteDeps);
const inviteResendDef = makeResendDef(inviteDeps);
const inviteRevokeDef = makeRevokeDef();
const inviteListDef = makeListDef();

export const inviteCreate = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(({ data }): Promise<ActionResult<JsonValue>> =>
    runAction(inviteCreateDef, data),
  );

export const inviteResend = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(({ data }): Promise<ActionResult<JsonValue>> =>
    runAction(inviteResendDef, data),
  );

export const inviteRevoke = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(({ data }): Promise<ActionResult<JsonValue>> =>
    runAction(inviteRevokeDef, data),
  );

export const inviteList = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(({ data }): Promise<ActionResult<JsonValue>> =>
    runAction(inviteListDef, data),
  );

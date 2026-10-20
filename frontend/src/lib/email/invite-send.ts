// Sends the invitation email for invite_v1 (policy E). Plain server module: not a server function, imported only by the
// gateway action's dependency wiring (src/lib/actions/invite.ts).
//
// The recipient and every field come from the invitation row the RPC just created or re-issued, never from the client.
// The raw token is used for exactly one thing: the link inside the message body (in the URL fragment). It is never
// logged, never stored, never returned, and never part of an error message: this module catches everything and answers
// only true or false.
import { sendEmailWith } from "./resend";
import { invitationEmail } from "./templates";
import type { ProviderEnv } from "./server-env";

export type InvitationDelivery = {
  to: string;
  inviterName: string;
  orgName: string;
  kind: string;
  role: string;
  token: string;
  expiresAt?: string;
};

export async function sendInvitationEmail(
  env: ProviderEnv,
  d: InvitationDelivery,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const { subject, html, text } = invitationEmail({
      inviterName: d.inviterName,
      orgName: d.orgName,
      kind: d.kind,
      role: d.role,
      token: d.token,
      expiresAt: d.expiresAt,
      appUrl: env.appUrl,
    });
    const res = await sendEmailWith(
      { baseUrl: env.resendBase, apiKey: env.resendKey },
      {
        to: d.to,
        subject,
        html,
        text,
        tags: [{ name: "type", value: "invitation" }],
      },
      fetchImpl,
    );
    return !!res?.id;
  } catch {
    return false;
  }
}

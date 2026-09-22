import { createServerFn } from "@tanstack/react-start";
import { getEnvVar } from "@/lib/env";

// Server-side password re-entry step-up primitive.
//
// PURPOSE: confirm the CURRENT caller still knows their own password before
// letting a Commit-class / negotiation-defining action proceed, without
// disturbing their existing session. This is NOT new MFA infrastructure —
// it composes two primitives Supabase already provides (the password grant
// GoTrue's own sign-in uses, and requireUser's identity resolution), neither
// of which alone does this: reauthenticate() is scoped to updateUser()
// email/password changes and sends a nonce via email/phone, never checks a
// password; verifyOtp() overwrites the caller's session on success. See the
// recon report this file was built from.
//
// IDENTITY, never trusted from the client: the email checked against the
// submitted password is resolved from the caller's OWN access token via the
// same /auth/v1/user pattern requireUser() uses — never a client-supplied
// email. Passing a token for one account with a password for a different
// account cannot succeed, because the email came from the token, not the
// caller's input.
//
// The grant response's session/tokens are read only far enough to confirm
// success (an access_token is present) and are then DISCARDED — never
// persisted, never returned to any caller of this module. Verifying a
// password must never mint a live, usable session as a side effect.
//
// SERVICE-ROLE KEY, not anon, as the grant's `apikey` — found live, not
// assumed. The anon-key password grant requires a real hCaptcha token
// (confirmed: a direct anon-key grant call returns
// `{"code":400,"error_code":"captcha_failed",...}` with no captcha_token
// attached). That's correct for a PUBLIC sign-in form — this isn't one. This
// call re-verifies a credential the user already re-typed into our own
// authenticated UI, server-to-server, with no browser and no captcha widget
// available to satisfy that check. Using the service-role key is the
// established pattern this exact session already relied on repeatedly (the
// committed captcha-bypass helper in tests/auth-and-portfolio.spec.ts) and
// is safe here: it never widens what this function checks — it still fails
// on any wrong password for the resolved account, verified in the
// adversarial test this file's own history records.
//
// GATE A APPROVED 22 Sep 2026 — verifyPassword() below, as built, with the
// service-role-key correction and the 5/5 adversarial identity/credential
// matrix documented above. See CLAUDE.md-style report given at approval
// time. Not wired to anything real until this comment; verifyStepUp() below
// is the first real caller, built at Gate B.

export type VerifyPasswordResult =
  | { ok: true; uid: string }
  | { ok: false; error: "not_authenticated" | "invalid_password" | "rate_limited" | "db_unavailable" };

function getSupabaseConfig(): { url: string; serviceKey: string } {
  return {
    url: getEnvVar("SUPABASE_URL"),
    serviceKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

/**
 * Resolves the caller's own uid + email from their access token.
 * Mirrors requireUser()'s /auth/v1/user pattern exactly — deliberately not
 * imported from there, since require-user-fn.ts's contract returns uid only
 * and changing it to also return email is a second file's public shape,
 * out of scope for this addition. Kept as a private, identical duplicate
 * rather than risk drifting requireUser()'s existing 25+ call sites.
 */
async function resolveCallerIdentity(
  accessToken: string,
  url: string,
  serviceKey: string,
): Promise<{ uid: string; email: string } | null> {
  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { id?: string; email?: string };
    if (!json.id || !json.email) return null;
    return { uid: json.id, email: json.email };
  } catch {
    return null;
  }
}

/**
 * Verifies that `password` is the CURRENT password for the caller identified
 * by `accessToken` — without creating, saving, or returning a new session.
 *
 * Re-runs the password grant (the same endpoint GoTrue's own sign-in uses)
 * against the caller's own resolved email. A wrong password returns
 * { ok: false, error: "invalid_password" }. Never throws on a bad
 * credential — only on missing config, which fails closed.
 */
export async function verifyPassword(
  accessToken: string | undefined | null,
  password: string | undefined | null,
): Promise<VerifyPasswordResult> {
  if (!accessToken) return { ok: false, error: "not_authenticated" };
  if (!password) return { ok: false, error: "invalid_password" };

  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return { ok: false, error: "db_unavailable" };

  const identity = await resolveCallerIdentity(accessToken, url, serviceKey);
  if (!identity) return { ok: false, error: "not_authenticated" };

  try {
    const resp = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: identity.email, password }),
    });

    if (resp.status === 429) return { ok: false, error: "rate_limited" };

    // Read the body far enough to confirm success, then let it fall out of
    // scope — no session/token from this response is ever kept or returned.
    const json = (await resp.json().catch(() => ({}))) as { access_token?: string };

    if (!resp.ok || !json.access_token) {
      return { ok: false, error: "invalid_password" };
    }

    return { ok: true, uid: identity.uid };
  } catch {
    return { ok: false, error: "db_unavailable" };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Gate B — verifyStepUp(password): the client-facing endpoint.
//
// On a correct password, mints a single-purpose, 5-minute, single-use
// step-up token bound to the caller's own uid via
// pack_api.mint_step_up_token() (migration 20260922000000_step_up_tokens,
// approved storage-tradeoff recon: server-side record over a signed token,
// since this codebase has no JWT signing library/secret anywhere, and a
// signed token can't be revoked early or enforced single-use without a
// server-side record anyway — see the recon report given before this file
// was built).
//
// PLAIN TOP-LEVEL createServerFn, never a factory-returned one — CLAUDE.md
// §20.11 records an eleven-day production outage caused by exactly the
// opposite shape (defineAction returning createServerFn from inside a
// function body), which TanStack's server-fn transform cannot see, so the
// entire handler — including the service-role key — silently bundled into
// the CLIENT. This function is declared at module top level for that
// reason, not merely for style.
//
// The raw token is returned to the caller ONCE, here. Nothing else in this
// module or its callers persists it — the DB holds only its sha256 hash
// (see the migration). A caller loses the token, they re-run verifyStepUp.

export type VerifyStepUpResult =
  | { ok: true; token: string; expiresInSeconds: number }
  | { ok: false; error: "not_authenticated" | "invalid_password" | "rate_limited" | "db_unavailable" };

export const verifyStepUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { accessToken?: string; password?: string })
  .handler(async ({ data }): Promise<VerifyStepUpResult> => {
    const verified = await verifyPassword(data?.accessToken, data?.password);
    if (!verified.ok) return verified;

    const { url, serviceKey } = getSupabaseConfig();
    if (!url || !serviceKey) return { ok: false, error: "db_unavailable" };

    let rpc: Response;
    try {
      rpc = await fetch(`${url}/rest/v1/rpc/mint_step_up_token`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          "Content-Profile": "pack_api",
        },
        body: JSON.stringify({ p_uid: verified.uid }),
      });
    } catch {
      return { ok: false, error: "db_unavailable" };
    }
    if (!rpc.ok) return { ok: false, error: "db_unavailable" };

    const minted = (await rpc.json().catch(() => ({}))) as {
      ok?: boolean;
      token?: string;
      expires_in_seconds?: number;
    };

    if (!minted?.ok || !minted.token) return { ok: false, error: "db_unavailable" };

    return { ok: true, token: minted.token, expiresInSeconds: minted.expires_in_seconds ?? 300 };
  });

// ─────────────────────────────────────────────────────────────────────────
// consumeStepUpToken(uid, token) — used by the six gated actions (Step 3),
// never by the client directly. Verifies + atomically consumes a step-up
// token via pack_api.verify_and_consume_step_up_token(). A gate calls this
// with the identity it has ALREADY derived from the caller's own access
// token (never from a client-supplied uid) and the token the client
// attached to the resubmitted action — so a token minted for one user can
// never authorize a different user's gated action, even if presented.

export type ConsumeStepUpResult =
  | { ok: true }
  | { ok: false; error: "invalid_token" | "already_used" | "expired" | "invalid_request" | "db_unavailable" };

export async function consumeStepUpToken(uid: string, token: string | undefined | null): Promise<ConsumeStepUpResult> {
  if (!token) return { ok: false, error: "invalid_request" };

  const { url, serviceKey } = getSupabaseConfig();
  if (!url || !serviceKey) return { ok: false, error: "db_unavailable" };

  let rpc: Response;
  try {
    rpc = await fetch(`${url}/rest/v1/rpc/verify_and_consume_step_up_token`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        "Content-Profile": "pack_api",
      },
      body: JSON.stringify({ p_uid: uid, p_token: token }),
    });
  } catch {
    return { ok: false, error: "db_unavailable" };
  }
  if (!rpc.ok) return { ok: false, error: "db_unavailable" };

  const verdict = (await rpc.json().catch(() => ({}))) as { ok?: boolean; error?: string };

  if (verdict?.ok) return { ok: true };

  const err = verdict?.error;
  if (err === "invalid_token" || err === "already_used" || err === "expired" || err === "invalid_request") {
    return { ok: false, error: err };
  }
  return { ok: false, error: "db_unavailable" };
}

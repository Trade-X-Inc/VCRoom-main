import { getEnvVar } from "@/lib/env";

// Shared identity gate for every service-role server function.
//
// A service-role Supabase call bypasses RLS entirely, so a server fn that
// trusts a client-supplied userId/founder_user_id/investorId as "who is
// calling" has no real authorization boundary at all — any caller can pass
// any id. This mirrors dd-fn.ts's runConfrontationalAnalysis, the one
// function in this codebase that already derives identity correctly: resolve
// the real uid from the caller's own access token via Supabase's /auth/v1/user
// endpoint, and never trust an id passed as a plain data field.
//
// See CLAUDE.md §51.

export type RequireUserResult =
  | { ok: true; uid: string }
  | { ok: false; error: "not_authenticated" | "db_unavailable" };

function getSupabaseConfig(): { url: string; key: string } {
  const url = getEnvVar("SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  return { url, key };
}

/**
 * Resolves the real, authenticated uid from a caller-supplied access token.
 * Returns { ok: false } on any missing token, invalid token, or infra error —
 * callers must fail closed (never fall back to a client-supplied id param).
 */
export async function requireUser(accessToken: string | undefined | null): Promise<RequireUserResult> {
  if (!accessToken) return { ok: false, error: "not_authenticated" };
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return { ok: false, error: "db_unavailable" };

  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return { ok: false, error: "not_authenticated" };
    const json = (await resp.json()) as { id?: string };
    if (!json.id) return { ok: false, error: "not_authenticated" };
    return { ok: true, uid: json.id };
  } catch {
    return { ok: false, error: "not_authenticated" };
  }
}

// ── Verified session identity including the account email ─────────────────────────────────────────
// For outbound-email and CRM server functions (CLAUDE.md §20.23). The email comes from Supabase Auth's own answer
// for the caller's token, never from the request. `email_confirmed_at` is returned so a caller can insist on a
// confirmed address.
export type SessionIdentity = {
  uid: string;
  email: string;
  emailConfirmed: boolean;
  fullName: string;
};

export type RequireIdentityResult =
  | { ok: true; identity: SessionIdentity }
  | { ok: false; error: "not_authenticated" | "db_unavailable" };

export async function resolveIdentity(
  cfg: { url: string; key: string },
  accessToken: string | undefined | null,
  fetchImpl: typeof fetch = fetch,
): Promise<RequireIdentityResult> {
  if (!accessToken || typeof accessToken !== "string" || accessToken.length > 4096) {
    return { ok: false, error: "not_authenticated" };
  }
  if (!cfg.url || !cfg.key) return { ok: false, error: "db_unavailable" };
  try {
    const resp = await fetchImpl(`${cfg.url}/auth/v1/user`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return { ok: false, error: "not_authenticated" };
    const json = (await resp.json()) as {
      id?: string;
      email?: string;
      email_confirmed_at?: string | null;
      user_metadata?: { full_name?: string; name?: string };
    };
    // No id (the anon key has no sub) or no email: not a usable signed-in user.
    if (!json.id || !json.email) return { ok: false, error: "not_authenticated" };
    return {
      ok: true,
      identity: {
        uid: json.id,
        email: json.email,
        emailConfirmed: !!json.email_confirmed_at,
        fullName: json.user_metadata?.full_name ?? json.user_metadata?.name ?? "",
      },
    };
  } catch {
    return { ok: false, error: "not_authenticated" };
  }
}

export async function requireUserIdentity(
  accessToken: string | undefined | null,
): Promise<RequireIdentityResult> {
  const { url, key } = getSupabaseConfig();
  return resolveIdentity({ url, key }, accessToken);
}

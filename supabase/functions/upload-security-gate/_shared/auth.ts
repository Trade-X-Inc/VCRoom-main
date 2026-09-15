// Shared identity derivation for Supabase Edge Functions.
//
// CLAUDE.md §19d.1 — BLOCKING REQUIREMENT: every new Supabase Edge Function
// must derive caller identity through resolveUid() (or an equivalent that
// independently verifies the caller's own bearer token), not through a
// caller-supplied user_id/founder_id/investor_id/startup_id parameter, and
// not through verify_jwt: true alone. The public anon key is a valid
// platform-signed JWT and passes verify_jwt: true — it does not carry a
// `sub` claim, and only a claims check (this function) excludes it.
//
// Origin: extracted 11 Aug 2026 from ai-router's resolveUid(), the function's
// original and only implementation until this extraction (see CLAUDE.md §17,
// §19d). No behavior change from that implementation — same check, same
// anon-key rejection, same return shape (string | null).

/**
 * Resolve the calling user's id from their own bearer token.
 *
 * Verifies the token against Supabase Auth's /auth/v1/user endpoint rather
 * than trusting anything in the request body. Returns null — never throws —
 * on a missing token, a garbage token, or the anon key (which GoTrue rejects
 * with `bad_jwt: missing sub claim` before this function ever sees an id).
 *
 * @param req The incoming request; identity is read from its Authorization header.
 * @param supabaseUrl Project URL (e.g. Deno.env.get("SUPABASE_URL")).
 * @param supabaseServiceRoleKey Service-role key, used as the `apikey` header
 *   for the /auth/v1/user call — NOT as the caller's credential. The caller's
 *   own token goes in Authorization; passing it as `apikey` instead returns
 *   "Invalid API key" and would reject every real user.
 */
export async function resolveUid(
  req: Request,
  supabaseUrl: string,
  supabaseServiceRoleKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseServiceRoleKey, Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const json = await resp.json() as { id?: string };
    return json.id ?? null;
  } catch (_) {
    return null;
  }
}

// Shared admin-route authentication helper.
//
// Added 11 Oct 2026. All 5 admin/diagnostic routes (api.admin.tsx,
// api.internal.data.tsx, api.internal.email-test.tsx, api.emailtest.tsx,
// api.hubspot-sync.tsx) previously accepted ADMIN_SECRET_KEY as a `?key=`
// query-string parameter, compared with a plain `!==`. Two problems with
// that shape: (1) a value in the URL is logged by browser history, server
// access logs, and any proxy/CDN request log by default — a far wider
// blast radius than a header for a value that gates real production data
// reads (feedback, waitlist, email_events) and a real Resend send /
// HubSpot sync; (2) `!==` short-circuits on the first differing byte, which
// is a real (if narrow) timing side-channel for a secret comparison.
//
// Fixed: the key is now read ONLY from an `x-admin-key` request header
// (query-string transport removed entirely — see each route's own comment
// for why removing it is safe: zero programmatic callers exist anywhere in
// this repo, confirmed by grep before this change; see CLAUDE.md's
// admin-route hardening entry), and compared with a constant-time
// comparison. Fails closed on any error, missing env var, or missing
// header — same as every route's existing behavior.
//
// Practical consequence, stated plainly: a route gated this way can no
// longer be opened by pasting a URL into a browser address bar (a plain
// navigation cannot attach a custom header). It now requires a tool that
// can set request headers (curl, an API client, a browser extension) —
// this is a deliberate narrowing of who/what can reach these routes, not
// an oversight.
//
// Review correction, 11 Oct 2026 — the unauthorized response bodies
// originally echoed the mechanism name back to the caller
// (`hint: "pass the x-admin-key request header"`), the same problem in
// the opposite direction as the `?key=YOUR_ADMIN_KEY` hint it replaced.
// An unauthorized caller should learn nothing about how a route is
// gated beyond the fact that it is — the rationale stays in code
// comments only, never in a response body. Each route now returns a
// generic `{ error: "unauthorized" }` (keeping its own existing shape,
// e.g. `authorized: false` where one already existed).

/**
 * Reads the x-admin-key header from the current request, server-side only.
 * Mirrors src/router.tsx's own getRequestHeader usage (the one other place
 * in this codebase reading a header via @tanstack/react-start/server) —
 * same dynamic-import + try/catch shape, verified working against the real
 * built artifact for the CSP nonce. Returns null on any failure, never
 * throws — a header read failing must fail closed, not crash the route.
 */
async function getAdminKeyHeader(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    return getRequestHeader("x-admin-key") || null;
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison. Avoids node:crypto's timingSafeEqual
 * (requires equal-length Buffers and throws otherwise, which would itself
 * leak length via a thrown-vs-not branch) in favor of the Web Crypto API's
 * crypto.subtle.digest, which is available in every Workers runtime
 * without nodejs_compat. Hashing both inputs to a fixed-length digest
 * before comparing means the comparison itself always operates on two
 * 32-byte buffers regardless of the original strings' lengths, so there is
 * no early-exit length or byte-position signal to leak. XORs every byte
 * before checking rather than using Array.every/some, which can
 * short-circuit.
 */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const bufA = new Uint8Array(digestA);
  const bufB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

/**
 * Verifies the current request carries the correct x-admin-key header.
 * Fails closed (returns false) if the expected key is unset/empty, if no
 * header is present, or if the header value is wrong. Never throws.
 */
export async function verifyAdminKey(
  expectedKey: string | undefined | null,
): Promise<boolean> {
  if (!expectedKey) return false;
  const provided = await getAdminKeyHeader();
  if (!provided) return false;
  return constantTimeEqual(provided, expectedKey);
}

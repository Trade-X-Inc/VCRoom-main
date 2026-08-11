// Stubbed 11 Aug 2026 — CLAUDE.md §7.1 (no identity derivation) and the
// systemic edge-function auth gap logged in §19d.
//
// Exposure, confirmed live not inferred: verify_jwt: false, zero identity
// derivation, caller-supplied body startup_id / investor_id. An
// unauthenticated POST with an empty body returned
// 400 "startup_id and investor_id are required" — proving an anonymous caller
// reached the function body. With valid ids it would look up a founder's real
// email via auth.admin.getUserById and send them outbound Resend mail
// attributed to an arbitrary investor.
//
// What it did: emailed a founder that a named investor requested profile
// access, including a "Hockystick Verified" badge rendered from
// investor_profiles.verification_tier — itself a §15/§25 verification claim
// whose writer (verify-investor) was stubbed earlier the same day.
//
// No caller was found anywhere in the frontend at the time of stubbing. Per
// the §7.1 lesson: no caller found is NOT the same as inaccessible, and that
// is precisely why this was stubbed rather than left open.
//
// True removal from the function list still requires
// `supabase functions delete notify-access-request` via CLI/dashboard.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

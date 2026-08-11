// Stubbed 11 Aug 2026 — CLAUDE.md §7.1 (no identity derivation) and the
// systemic edge-function auth gap logged in §19d.
//
// HIGHEST-SEVERITY item in the 11 Aug live-function inventory: it was the only
// function that was BOTH unauthenticated (verify_jwt: false, zero identity
// derivation, no shared secret) AND actively cron-scheduled
// (profile-gate-nudge-daily, jobid 6, 0 9 * * *, active). Anyone with the URL
// could trigger a batch outbound email send to founders at will, repeatedly —
// the cron schedule was irrelevant to that exposure.
//
// What it did: two onboarding nudges to founders via Resend — a 48h
// "setup is incomplete" mail and a 7d "Investors can't evaluate your deal yet"
// mail — reading onboarding_progress / startups / founder_documents and
// writing nudge flags back to onboarding_progress.steps.
//
// Its own header comment argued no confirm-first gate applied because this is
// "scheduled infrastructure, not an AI-agent-callable tool." That reasoning is
// true of the cron path and irrelevant to the open HTTP endpoint, which is the
// actual exposure — recorded here because that argument is exactly what kept
// the endpoint unexamined.
//
// The cron was unscheduled the same day (verified absent from cron.job). Its
// run log showed 56/56 failures on "schema net does not exist" (the pg_net
// cause, same as every other cron in this project), so the SCHEDULED path had
// never delivered a single mail — but the open endpoint was always reachable
// and unaffected by that failure.
//
// True removal from the function list still requires
// `supabase functions delete profile-gate-nudge-cron` via CLI/dashboard.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

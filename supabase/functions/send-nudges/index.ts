// Stubbed 11 Aug 2026 — CLAUDE.md §7.1 (no identity derivation) and the
// systemic edge-function auth gap logged in §19d.
//
// Exposure, confirmed live not inferred: verify_jwt: false, zero identity
// derivation, optional caller-supplied body deal_room_id. An unauthenticated
// POST returned 200 {"nudges_sent":0,"rooms_checked":0,"rooms":[]} — proving
// an anonymous caller reached the body and executed a real deal_rooms query.
// It returned zero only because the probe used a deal_room_id matching
// nothing; with no body at all it scans EVERY active deal room and emails
// every investor with a stale one.
//
// What it did: found deal rooms idle 3+ days, generated an LLM nudge per room
// (gpt-4o-mini, given the startup name, investor email, days stale and
// workflow stage), inserted a notification for the founder, sent outbound
// Resend mail to the investor, and stamped deal_rooms.last_nudge_sent_at.
//
// Its cron was already unscheduled during the §19 pass (found broken by the
// same pg_net cause), but the function was left deployed and open — the exact
// trigger-vs-function distinction recorded in §7.1. Stubbing closes the
// endpoint, which unscheduling never did.
//
// True removal from the function list still requires
// `supabase functions delete send-nudges` via CLI/dashboard.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

// Stubbed 11 Aug 2026 — TWO defects: CLAUDE.md §7.1 (no identity derivation,
// systemic gap logged in §19d) AND Foundation Document §3.8 (invented signal).
//
// Exposure: verify_jwt: false, zero identity derivation, no parameters — an
// unauthenticated POST with an empty body ran the full batch: it read approved
// discovery_requests older than 3 days, resolved founders' real email
// addresses via auth.admin.getUserById, sent outbound Resend mail to each, and
// wrote nudge_sent_at / nudge_count back.
//
// INVENTED SIGNAL, and the reason this stub is also a §3.8 fix: every one of
// those emails asserted, as fact, in a highlighted callout —
//   "Investors who are invited to a deal room within a week of approval are
//    3x more likely to submit a decision."
// The source line immediately above it in the original read:
//   "Placeholder statistic: update with real platform data once sufficient
//    sample size is reached"
// i.e. it was known to be fabricated when written and shipped anyway. This is
// the same pattern as §19b's "Profiles above 80% get 3x more investor views on
// average" in send-onboarding-emails — a fabricated multiplier, in outbound
// email, to a real user. Second confirmed instance; see the §7 entry.
//
// Stubbing removes it from ever being sent again: this body has no send path.
//
// Its cron was already unscheduled during the §19 pass, but the function was
// left deployed and open — the trigger-vs-function distinction in §7.1.
//
// True removal from the function list still requires
// `supabase functions delete daily-nudge-cron` via CLI/dashboard.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

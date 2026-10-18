// Stubbed — retired as a §15/§25 fabrication + fail-open exposure. The
// live v3 implementation (saved to supabase/rollback/send-onboarding-
// emails.v3.index.ts before this stub replaced it) was `verify_jwt: false`
// with no in-code identity derivation, iterated every auth.users row via
// the service-role key, and sent real outbound email containing three
// invented claims already logged in CLAUDE.md §7.4/§19b — "Profiles above
// 80% get 3x more investor views on average" (fabricated statistic),
// "Hockystick's thesis matching system found N investors..." and "All
// profiles are verified by Hockystick" (both Foundation §15/§25
// matching/verification violations). The function's own cron
// (send-onboarding-emails-daily, jobid 4) had every one of 62 logged runs
// fail on the unresolved pg_net issue — confirmed from cron.job_run_details,
// not assumed — so no email from this path was ever actually delivered,
// but the endpoint itself remained live and reachable. This inert 410
// replaces the prior implementation; true removal from the Supabase
// function list requires `supabase functions delete send-onboarding-emails`
// via CLI/dashboard, not available from this session's tools.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

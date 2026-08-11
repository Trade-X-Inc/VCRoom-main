// Stubbed 11 Aug 2026 — retired as a DEAD-WRITE EXPOSURE, explicitly NOT as a
// Foundation Document §15/§25 violation. See CLAUDE.md §19c (Audit, step 2).
//
// WHY IT WAS RETIRED — exposure, not content:
// Deployed with verify_jwt: false and NO identity derivation of any kind (no
// auth.getUser, no requireUser, no Authorization check). startup_id and
// user_id were taken straight from the request body; user_id was used only to
// key the rate limiter, so a caller could burn another user's quota or evade
// their own. Proven live, not inferred from config: an unauthenticated POST
// with no token returned 404 "Startup not found" — meaning the caller reached
// the function body, passed the rate-limit gate, and executed a real database
// query. With a valid startup_id an anonymous caller would have spent the
// project's OpenAI key and inserted a coaching_sessions row for an arbitrary
// startup. Same class as the §17 ai-router incident.
//
// WHAT IT WAS — and why this is not a §15/§25 retirement:
// Output was entirely prose advice — stage_guide, financial, legal,
// rejection_debrief, and an action_plan list. It produced NO score, no
// match/fit label, no verdict signal, and wrote no score column;
// action_plan's priority 1/2/3 is list ordering, not a computed assessment.
// It consumed scores as prompt context (readiness_score_runs.score,
// investor_sim_runs.red_flag/kill_risk — both tables frozen since their
// writers were stubbed, verified live still returning 410) but generated
// none. This reads as §10 drafting/advice, arguably in bounds.
//
// It was also dead product: coaching_sessions is write-only in production —
// 4 rows, newest 9 Jul 2026, and fetchLatestCoachingSession has zero callers.
// Every invocation spent an OpenAI call to write a row no interface displays.
//
// IF COACHING RETURNS AS A REAL FEATURE, IT GETS REBUILT WITH AUTH DESIGNED
// IN — do not reactivate this implementation. Its two live triggers were
// app.settings.tsx (founder stage change) and app.investor.decisions.tsx (an
// investor passing a deal, firing coaching for the founder with the pass
// reason forwarded); both were fire-and-forget with .catch(() => {}), so
// neither surfaces this stub's failure to a user.
//
// True removal from the function list still requires
// `supabase functions delete run-founder-coaching` via CLI/dashboard.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

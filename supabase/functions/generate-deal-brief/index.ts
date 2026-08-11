// Stubbed 11 Aug 2026 — Foundation Document §15/§25 (scoring, ranking,
// recommendation, assessment) and CLAUDE.md §7.1 (spoofable identity).
//
// Why this could not wait behind the step-0 audit it is otherwise queued for:
// it was deployed with verify_jwt: false, performed NO identity derivation,
// and took investor_id / user_id / startup_id directly from the request body
// — the same shape as the §17 ai-router incident. Any unauthenticated caller
// could mint or overwrite a deal brief for an arbitrary investor/startup pair
// on the project's OpenAI key, and read back real startup financials
// (revenue, burn_rate, runway_months, traction) in the response.
//
// What it did: prompted gpt-4o for "match_score" (0-100, explicit rubric
// "80+ = strong thesis match, 50-79 = partial, below 50 = weak") plus
// verdict_signal / overall_verdict / red_flags, and upserted all of it to
// public.deal_briefs. It also read two scoring tables into its prompt
// (readiness_score_runs.score, investor_sim_runs.red_flag/kill_risk).
//
// KNOWN LIVE BREAKAGE, deliberate and accepted: two real UI call sites invoke
// this via runDealBrief() in frontend/src/lib/deal-brief-fn.ts —
// app.deal-rooms.$id.overview.tsx and app.investor.deal-flow.tsx. Both already
// catch failures into a toast ("Failed to generate brief. Please try again."),
// so neither crashes and neither renders a fabricated score; the retry is
// simply futile until those surfaces are removed by the queued audit.
// Existing deal_briefs rows remain readable via fetchDealBrief (direct table
// read, unaffected by this stub).
//
// Unlike verify-investor/match-investors this had live callers, so this stub
// is a holding action, not a closure: the feature is not retired until those
// two call sites and the deal_briefs surface are dealt with. See §19c.
//
// True removal from the function list still requires
// `supabase functions delete generate-deal-brief` via CLI/dashboard.
Deno.serve(() => new Response(JSON.stringify({ error: "Gone" }), {
  status: 410,
  headers: { "Content-Type": "application/json" },
}));

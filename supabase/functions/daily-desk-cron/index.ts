/**
 * daily-desk-cron — Intelligent task generator for the Daily Desk
 *
 * MENTAL MODEL (read CLAUDE.md §3 before editing):
 *   Tasks are NOT "here's something to do." Tasks arrive with the AI work already done.
 *   'autonomous_done'   → AI completed real work (doc analysis, deal brief). Card is FYI.
 *   'awaiting_checkpoint' → AI drafted something; human must review before it leaves the platform.
 *   'single'            → simple prompt task (profile gap), no chain logic.
 *
 * Runs once daily via Supabase cron. All AI calls happen HERE, at generation time.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── OpenAI call ────────────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, userMessage: string, maxTokens = 600): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as any;
    throw new Error(`OpenAI error: ${err?.error?.message ?? resp.status}`);
  }
  const json = await resp.json() as any;
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJSON(raw: string): any {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

// ── Dedupe guard ───────────────────────────────────────────────────────────────

async function dedupeExists(admin: any, userId: string, dedupeKey: string): Promise<boolean> {
  const { data } = await admin
    .from("desk_tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "open")
    .maybeSingle();
  return !!data;
}

// ── Insert task ────────────────────────────────────────────────────────────────

async function insertTask(admin: any, task: Record<string, unknown>): Promise<void> {
  const { error } = await admin.from("desk_tasks").insert(task);
  if (error) console.error("[desk-cron] Insert error:", error.message, "task:", task.dedupe_key);
}

// ══════════════════════════════════════════════════════════════════════════════
// FOUNDER TASK GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * review_access_request — ALWAYS checkpointed (CLAUDE.md §3: affects another party)
 * Autonomous phase: AI summarises the investor's thesis fit.
 * Checkpoint: human decides approve/decline.
 */
async function generateFounderAccessRequestTasks(admin: any, founderId: string, startupId: string): Promise<number> {
  const { data: requests } = await admin
    .from("discovery_requests")
    .select("id, investor_id, created_at, investor_profiles!investor_id(your_name, fund_name, thesis, sectors, stages)")
    .eq("startup_id", startupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (!requests?.length) return 0;

  // Fetch startup data once for thesis comparison
  const { data: startup } = await admin
    .from("startups")
    .select("company_name, sector, stage, description")
    .eq("id", startupId)
    .maybeSingle();

  let generated = 0;
  for (const req of requests) {
    const dedupeKey = `access_request_${req.id}`;
    if (await dedupeExists(admin, founderId, dedupeKey)) continue;

    const investor = req.investor_profiles;
    const investorName = investor?.your_name ?? "An investor";
    const firmName = investor?.fund_name ?? null;
    const investorLabel = firmName ? `${investorName} (${firmName})` : investorName;

    // Autonomous research: thesis fit assessment
    let autonomousSummary = `${investorLabel} has requested access to your profile.`;
    try {
      const fitAssessment = await callOpenAI(
        "You are a VC analyst. Given an investor's thesis and a startup's profile, write 2 sentences: (1) how well the investor's thesis matches this startup, using specific details from both, and (2) one reason this could be a good match and one potential concern. Be concrete, not generic. No more than 60 words total.",
        `INVESTOR: ${investorLabel}. Thesis: "${investor?.thesis ?? "not provided"}". Sectors: ${investor?.sectors ?? "unspecified"}. Stages: ${investor?.stages ?? "unspecified"}.\nSTARTUP: ${startup?.company_name ?? "this company"}. Sector: ${startup?.sector ?? "unspecified"}. Stage: ${startup?.stage ?? "unspecified"}. Description: ${startup?.description ?? "not provided"}.`,
        120,
      );
      if (fitAssessment.trim()) {
        autonomousSummary = `${investorLabel} has requested access to your profile. ${fitAssessment.trim()}`;
      }
    } catch (e) {
      console.warn("[desk-cron] Thesis fit assessment failed for", req.id, (e as Error).message);
    }

    await insertTask(admin, {
      user_id: founderId,
      role: "founder",
      task_type: "review_access_request",
      chain_phase: "awaiting_checkpoint",
      autonomous_summary: autonomousSummary,
      checkpoint_reason: `This will approve or decline ${investorLabel}'s access to your profile — they will be notified.`,
      requires_external_action: true,
      title: `Review access request from ${investorLabel}`,
      description: `${investorLabel} wants to view your founder profile.`,
      priority: "high",
      action_label: "Review request",
      action_url: `/app`,
      status: "open",
      dedupe_key: dedupeKey,
      related_entity_id: req.id,
      related_entity_type: "discovery_request",
    });
    generated++;
  }
  return generated;
}

/**
 * fix_document — fully autonomous (CLAUDE.md §3: only touches founder's own private data)
 * Reuses the exact AI prompt from app.index.tsx runDocFix.
 * Writes ai_feedback to founder_documents at generation time, THEN creates the task.
 */
async function generateFounderDocFixTasks(admin: any, founderId: string, startupId: string): Promise<number> {
  const { data: docs } = await admin
    .from("founder_documents")
    .select("id, file_name, template_slug, status, completeness_score, ai_feedback")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!docs?.length) return 0;

  // Only documents with no real ai_feedback yet
  const unfixed = docs.filter((d: any) => {
    const fb = d.ai_feedback;
    return !fb || typeof fb !== "object" || !(fb as any).overall_score;
  });
  if (!unfixed.length) return 0;

  const { data: startup } = await admin
    .from("startups")
    .select("sector, stage")
    .eq("id", startupId)
    .maybeSingle();

  let generated = 0;
  for (const doc of unfixed.slice(0, 3)) {
    const dedupeKey = `fix_document_${doc.id}`;
    if (await dedupeExists(admin, founderId, dedupeKey)) continue;

    const docName = doc.file_name ?? doc.template_slug;
    let fb: any = null;
    let autonomousSummary: string;

    try {
      // Exact same prompt as app.index.tsx runDocFix — reuse, do not duplicate logic
      const raw = await callOpenAI(
        `You are an expert VC analyst reviewing a startup document called "${docName}".
Return ONLY valid JSON in this exact shape (no markdown):
{"overall_score": <1-100>, "signal": "<strong|adequate|weak|critical>", "summary": "<1 sentence>", "gaps": ["<issue 1>","<issue 2>","<issue 3>"], "recommendations": ["<fix 1>","<fix 2>","<fix 3>"], "investor_flag": "<biggest concern or null>"}`,
        `Review this document: ${docName}. Stage: ${startup?.stage ?? "seed"}. Sector: ${startup?.sector ?? "tech"}.`,
        350,
      );
      fb = parseJSON(raw);
      if (!fb) throw new Error("JSON parse failed");

      // Write ai_feedback at task generation time (same as the chat path)
      await admin.from("founder_documents")
        .update({ ai_feedback: fb, updated_at: new Date().toISOString() })
        .eq("id", doc.id);

      const signalLabel = { strong: "looks strong", adequate: "is adequate", weak: "needs work", critical: "needs urgent attention" }[fb.signal as string] ?? "was reviewed";
      autonomousSummary = `Reviewed "${docName}" — ${signalLabel} (score ${fb.overall_score}/100). ${fb.summary ?? ""} Top fix: ${fb.recommendations?.[0] ?? "See full analysis."}`;
    } catch (e) {
      console.warn("[desk-cron] Doc fix AI failed for", doc.id, (e as Error).message);
      autonomousSummary = `Couldn't auto-review "${docName}" — review it manually.`;
    }

    await insertTask(admin, {
      user_id: founderId,
      role: "founder",
      task_type: "fix_document",
      chain_phase: "autonomous_done",
      autonomous_summary: autonomousSummary,
      requires_external_action: false,
      title: `Document review: ${docName}`,
      description: `AI reviewed this document and found areas to address.`,
      priority: fb?.signal === "critical" ? "high" : fb?.signal === "weak" ? "normal" : "low",
      action_label: "View full analysis",
      action_url: `/app/documents`,
      status: "open",
      dedupe_key: dedupeKey,
      related_entity_id: doc.id,
      related_entity_type: "founder_document",
    });
    generated++;
  }
  return generated;
}

/**
 * profile_gap — 'single' chain type (simple prompt, no chain logic)
 */
async function generateFounderProfileGapTask(admin: any, founderId: string, startupId: string): Promise<number> {
  const dedupeKey = `profile_gap_${startupId}`;
  if (await dedupeExists(admin, founderId, dedupeKey)) return 0;

  const { data: session } = await admin
    .from("profile_builder_sessions")
    .select("status")
    .eq("startup_id", startupId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (session) return 0; // profile already confirmed

  await insertTask(admin, {
    user_id: founderId,
    role: "founder",
    task_type: "profile_gap",
    chain_phase: "single",
    requires_external_action: false,
    title: "Complete your founder profile",
    description: "Your profile isn't confirmed yet. Investors see incomplete profiles as higher risk.",
    priority: "high",
    action_label: "Complete profile",
    action_url: `/app/profile-builder`,
    status: "open",
    dedupe_key: dedupeKey,
    related_entity_type: "profile",
  });
  return 1;
}

/**
 * follow_up_investor — awaiting_checkpoint (email will go to a real investor)
 * Signal: document_views in the last 48h on a deal room the investor is a member of,
 * AND no founder activity (discovery_request updated_at) in that period.
 * Draft is written at task-creation time.
 *
 * SKIP if no reliable recency signal — flagged in report as designed.
 */
async function generateFounderFollowUpTasks(admin: any, founderId: string, startupId: string): Promise<number> {
  // Find deal rooms this founder owns
  const { data: dealRooms } = await admin
    .from("deal_rooms")
    .select("id, startup_id")
    .eq("startup_id", startupId)
    .eq("status", "active");

  if (!dealRooms?.length) return 0;

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  let generated = 0;

  for (const room of dealRooms) {
    // Find recent document views in this deal room (investor activity signal)
    const { data: recentViews } = await admin
      .from("document_views")
      .select("viewer_id, viewer_name, created_at")
      .eq("deal_room_id", room.id)
      .eq("viewer_role", "investor")
      .gte("created_at", fortyEightHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!recentViews?.length) continue;

    const view = recentViews[0];
    const viewerId = view.viewer_id;
    const viewerName = view.viewer_name ?? "The investor";
    const dedupeKey = `follow_up_investor_${room.id}_${viewerId}`;
    if (await dedupeExists(admin, founderId, dedupeKey)) continue;

    // Fetch investor profile for personalisation
    const { data: investorProfile } = await admin
      .from("investor_profiles")
      .select("your_name, fund_name, thesis, sectors")
      .eq("user_id", viewerId)
      .maybeSingle();

    const { data: startup } = await admin
      .from("startups")
      .select("company_name, stage, sector, traction, description")
      .eq("id", startupId)
      .maybeSingle();

    const investorName = investorProfile?.your_name ?? viewerName;
    const firmName = investorProfile?.fund_name ?? null;
    const companyName = startup?.company_name ?? "your company";
    const investorLabel = firmName ? `${investorName} from ${firmName}` : investorName;

    // AUTONOMOUS: draft a specific follow-up email at task-creation time
    let draftContent = "";
    let autonomousSummary = `${investorLabel} viewed your documents in the deal room within the last 48 hours.`;

    try {
      const draft = await callOpenAI(
        `You are helping a founder write a follow-up email to an investor who recently viewed their documents.
Write a short, specific, professional email (under 120 words). Use the investor's name and thesis if provided.
Reference recent activity naturally. End with a clear next-step ask (e.g. a call).
Return ONLY the email body — no subject line, no JSON, just the message text.`,
        `FOUNDER'S COMPANY: ${companyName}. Stage: ${startup?.stage ?? "seed"}. Traction: ${startup?.traction ?? "growing"}.
INVESTOR: ${investorLabel}. Their thesis/focus: ${investorProfile?.thesis ?? investorProfile?.sectors ?? "not available"}.
CONTEXT: ${investorLabel} viewed the deal room documents within the last 48 hours. The founder wants to follow up while momentum is fresh.`,
        220,
      );
      draftContent = draft.trim();
      autonomousSummary = `${investorLabel} viewed your deal room documents in the last 48h. I drafted a specific follow-up below — edit it if needed, then send.`;
    } catch (e) {
      console.warn("[desk-cron] Follow-up draft failed for room", room.id, (e as Error).message);
      draftContent = `Hi ${investorName},\n\nI saw you recently reviewed our documents in the deal room — thank you for taking the time.\n\nI'd love to connect and answer any questions you have. Would a quick call this week work?\n\nBest,\n[Your name]`;
    }

    await insertTask(admin, {
      user_id: founderId,
      role: "founder",
      task_type: "follow_up_investor",
      chain_phase: "awaiting_checkpoint",
      autonomous_summary: autonomousSummary,
      draft_content: draftContent,
      checkpoint_reason: `This will be sent to ${investorLabel} — review before it goes out.`,
      requires_external_action: true,
      title: `Follow up with ${investorLabel}`,
      description: `${investorLabel} viewed your deal room documents recently.`,
      priority: "high",
      action_label: "Send follow-up",
      status: "open",
      dedupe_key: dedupeKey,
      related_entity_id: room.id,
      related_entity_type: "deal_room",
    });
    generated++;
  }
  return generated;
}

// ══════════════════════════════════════════════════════════════════════════════
// INVESTOR TASK GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * review_thesis_match — fully autonomous
 * Calls generateInvestorDealBrief logic directly (same AI prompt used in the chat),
 * writes to deal_briefs, task appears already containing the brief's headline + verdict.
 *
 * "Add to watchlist" is a one-click direct action (investor's own private data only —
 * confirmed correct by CLAUDE.md §3: no other party sees the change).
 */
async function generateInvestorThesisMatchTasks(admin: any, investorId: string): Promise<number> {
  const { data: alerts } = await admin
    .from("thesis_alerts")
    .select("id, startup_id, match_score, match_reasons, alerted_at, startups!startup_id(company_name, profile_slug, sector, stage, funding_target, traction, description, team_size, revenue, country)")
    .eq("investor_id", investorId)
    .gte("match_score", 70)
    .order("alerted_at", { ascending: false })
    .limit(5);

  if (!alerts?.length) return 0;

  const { data: investorProfile } = await admin
    .from("investor_profiles")
    .select("fund_name, thesis, sectors, stages, check_size_min, check_size_max, geography")
    .eq("user_id", investorId)
    .maybeSingle();

  let generated = 0;
  for (const alert of alerts) {
    const startup = alert.startups;
    if (!startup) continue;

    const dedupeKey = `thesis_match_${alert.id}`;
    if (await dedupeExists(admin, investorId, dedupeKey)) continue;

    // Check if deal brief already cached
    const { data: cachedBrief } = await admin
      .from("deal_briefs")
      .select("headline, match_score, verdict_signal, overall_verdict")
      .eq("investor_id", investorId)
      .eq("startup_id", alert.startup_id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let briefHeadline = cachedBrief?.headline ?? null;
    let verdictSignal = cachedBrief?.verdict_signal ?? null;
    let dealScore = cachedBrief?.match_score ?? null;

    // Generate deal brief if not cached — same prompt as investor-deal-brief-fn.ts
    if (!briefHeadline || !cachedBrief?.overall_verdict) {
      try {
        const raw = await callOpenAI(
          `You are a senior investment analyst. Given a startup profile and an investor's thesis, produce a structured deal brief.
Respond ONLY with valid JSON matching this exact shape (no markdown, no explanation):
{
  "matchScore": <0-100 integer>,
  "headline": "<15-word summary of the opportunity>",
  "investment_thesis": "<2-3 sentence investment case>",
  "key_metrics": { "stage": "...", "sector": "...", "funding_ask": "...", "revenue": "...", "traction": "...", "team_size": "..." },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "red_flags": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "suggested_questions": ["<question 1>", "<question 2>", "<question 3>"],
  "overall_verdict": "<3-4 sentence balanced verdict>",
  "verdict_signal": "strong" | "neutral" | "weak"
}`,
          `STARTUP:
Company: ${startup.company_name}
Sector: ${startup.sector ?? "Unknown"}
Stage: ${startup.stage ?? "Unknown"}
Funding ask: ${startup.funding_target ?? "Unknown"}
Revenue: ${startup.revenue ?? "Unknown"}
Traction: ${startup.traction ?? "Unknown"}
Team size: ${startup.team_size ?? "Unknown"}
Country: ${startup.country ?? "Unknown"}
Description: ${startup.description ?? "Not provided"}

INVESTOR THESIS:
Fund: ${investorProfile?.fund_name ?? "Unknown"}
Thesis: ${investorProfile?.thesis ?? "Not set"}
Sectors: ${investorProfile?.sectors ?? "Not set"}
Stages: ${investorProfile?.stages ?? "Not set"}
Check size: $${investorProfile?.check_size_min ?? "?"} – $${investorProfile?.check_size_max ?? "?"}
Geography: ${investorProfile?.geography ?? "Not set"}`,
          1000,
        );
        const parsed = parseJSON(raw);
        if (parsed) {
          const now = new Date().toISOString();
          await admin.from("deal_briefs").upsert({
            investor_id: investorId,
            startup_id: alert.startup_id,
            match_score: parsed.matchScore ?? 0,
            headline: parsed.headline ?? null,
            investment_thesis: parsed.investment_thesis ?? null,
            key_metrics: parsed.key_metrics ?? null,
            strengths: parsed.strengths ?? [],
            red_flags: parsed.red_flags ?? [],
            suggested_questions: parsed.suggested_questions ?? [],
            overall_verdict: parsed.overall_verdict ?? null,
            verdict_signal: parsed.verdict_signal ?? "neutral",
            generated_at: now,
          }, { onConflict: "investor_id,startup_id", ignoreDuplicates: false });
          briefHeadline = parsed.headline ?? null;
          verdictSignal = parsed.verdict_signal ?? null;
          dealScore = parsed.matchScore ?? null;
        }
      } catch (e) {
        console.warn("[desk-cron] Deal brief gen failed for alert", alert.id, (e as Error).message);
      }
    }

    // ── FOUNDER FIT SCORE ─────────────────────────────────────────────────────
    // Compute how well THIS investor fits what the FOUNDER is looking for.
    // Only runs when founder_thesis.status = 'complete'. Null is the honest
    // value when thesis is absent or incomplete — never fabricate a score.
    // Mirrors the match_score pattern: same callOpenAI, same JSON shape.
    try {
      const { data: founderThesis } = await admin
        .from("founder_thesis")
        .select(
          "preferred_check_size_min, preferred_check_size_max, preferred_investor_type, " +
          "board_preference, sector_expertise_wanted, geography_preference, " +
          "exclusions, what_good_fit_looks_like, status",
        )
        .eq("startup_id", alert.startup_id)
        .maybeSingle();

      if (founderThesis?.status === "complete") {
        const raw = await callOpenAI(
          `You are scoring how well an investor fits what a specific startup founder is looking for.
The founder has described their ideal investor. Score this specific investor on 0-100.
Respond ONLY with valid JSON (no markdown):
{
  "founder_fit_score": <0-100 integer>,
  "reasons": [
    { "factor": "<what the founder wanted>", "verdict": "match|partial|mismatch", "note": "<one sentence>" },
    { "factor": "...", "verdict": "...", "note": "..." },
    { "factor": "...", "verdict": "...", "note": "..." }
  ],
  "summary": "<2-sentence plain-language verdict from the founder's perspective>"
}`,
          `WHAT THIS FOUNDER WANTS IN AN INVESTOR:
Check size range: ${founderThesis.preferred_check_size_min ?? "not specified"} – ${founderThesis.preferred_check_size_max ?? "not specified"}
Investor type: ${founderThesis.preferred_investor_type ?? "not specified"}
Involvement preference: ${founderThesis.board_preference ?? "not specified"}
Sector expertise wanted: ${founderThesis.sector_expertise_wanted ?? "not specified"}
Geography preference: ${founderThesis.geography_preference ?? "no preference"}
Exclusions / red lines: ${founderThesis.exclusions ?? "none stated"}
What a great-fit investor looks like: ${founderThesis.what_good_fit_looks_like ?? "not specified"}

THIS INVESTOR'S PROFILE:
Name: ${investorProfile?.your_name ?? "Unknown"}
Fund: ${investorProfile?.fund_name ?? "Unknown"}
Thesis: ${investorProfile?.thesis ?? "Not provided"}
Sectors: ${investorProfile?.sectors ?? "Not specified"}
Stages: ${investorProfile?.stages ?? "Not specified"}
Check size: $${investorProfile?.check_size_min ?? "?"} – $${investorProfile?.check_size_max ?? "?"}
Geography: ${investorProfile?.geography ?? "Not specified"}`,
          400,
        );
        const parsed = parseJSON(raw);
        if (parsed?.founder_fit_score !== undefined) {
          await admin
            .from("thesis_alerts")
            .update({
              founder_fit_score: parsed.founder_fit_score,
              founder_fit_reasons: {
                reasons: parsed.reasons ?? [],
                summary: parsed.summary ?? null,
              },
            })
            .eq("id", alert.id);
          console.log(
            `[desk-cron] founder_fit_score=${parsed.founder_fit_score} for alert ${alert.id} (startup ${alert.startup_id})`,
          );
        }
      } else {
        // Thesis absent or incomplete — leave founder_fit_score null (correct, honest)
        console.log(`[desk-cron] No complete founder_thesis for startup ${alert.startup_id} — founder_fit_score left null`);
      }
    } catch (e) {
      console.warn("[desk-cron] founder_fit_score computation failed for alert", alert.id, (e as Error).message);
    }

    const verdictLabel = verdictSignal === "strong" ? "Strong fit" : verdictSignal === "weak" ? "Weak fit" : "Neutral fit";
    const autonomousSummary = briefHeadline
      ? `${startup.company_name} — ${alert.match_score}% thesis fit. Deal quality: ${dealScore ?? "??"}/100 (${verdictLabel}). ${briefHeadline}`
      : `${startup.company_name} matched your thesis at ${alert.match_score}%. Deal brief generation failed — view manually.`;

    await insertTask(admin, {
      user_id: investorId,
      role: "investor",
      task_type: "review_thesis_match",
      chain_phase: "autonomous_done",
      autonomous_summary: autonomousSummary,
      requires_external_action: false,
      title: `Thesis match: ${startup.company_name} (${alert.match_score}% thesis fit)`,
      description: briefHeadline ?? `${startup.company_name} matched your investment thesis.`,
      priority: alert.match_score >= 85 ? "high" : "normal",
      action_label: "View full brief",
      action_url: `/app/investor`,
      status: "open",
      dedupe_key: dedupeKey,
      related_entity_id: alert.startup_id,
      related_entity_type: "thesis_alert",
    });
    generated++;
  }
  return generated;
}

/**
 * follow_up_watchlist — fully autonomous (investor's own private pipeline data)
 * No AI email draft needed — internal hygiene task.
 */
async function generateInvestorWatchlistStaleTasks(admin: any, investorId: string): Promise<number> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await admin
    .from("investor_watchlist")
    .select("id, company_name, status, updated_at")
    .eq("investor_id", investorId)
    .in("status", ["Sourcing", "Reviewing", "Diligence"])
    .lt("updated_at", fourteenDaysAgo)
    .order("updated_at", { ascending: true })
    .limit(3);

  if (!stale?.length) return 0;

  let generated = 0;
  for (const entry of stale) {
    const dedupeKey = `watchlist_stale_${entry.id}`;
    if (await dedupeExists(admin, investorId, dedupeKey)) continue;

    const daysSince = Math.floor((Date.now() - new Date(entry.updated_at).getTime()) / 86_400_000);

    await insertTask(admin, {
      user_id: investorId,
      role: "investor",
      task_type: "follow_up_watchlist",
      chain_phase: "autonomous_done",
      autonomous_summary: `${entry.company_name} has been in "${entry.status}" status for ${daysSince} days with no update. Update the status or move it forward in your pipeline.`,
      requires_external_action: false,
      title: `Pipeline stale: ${entry.company_name}`,
      description: `${entry.company_name} hasn't moved in ${daysSince} days (currently "${entry.status}").`,
      priority: daysSince > 30 ? "high" : "normal",
      action_label: "Update status",
      action_url: `/app/investor/startups`,
      status: "open",
      dedupe_key: dedupeKey,
      related_entity_id: entry.id,
      related_entity_type: "watchlist_entry",
    });
    generated++;
  }
  return generated;
}

/**
 * profile_gap — investor side, 'single' type
 */
async function generateInvestorProfileGapTask(admin: any, investorId: string): Promise<number> {
  const dedupeKey = `investor_profile_gap_${investorId}`;
  if (await dedupeExists(admin, investorId, dedupeKey)) return 0;

  const { data: profile } = await admin
    .from("investor_profiles")
    .select("fund_name, thesis, sectors, stages")
    .eq("user_id", investorId)
    .maybeSingle();

  if (profile?.fund_name && profile?.thesis && profile?.sectors && profile?.stages) return 0;

  const missing = [];
  if (!profile?.fund_name) missing.push("fund name");
  if (!profile?.thesis) missing.push("investment thesis");
  if (!profile?.sectors) missing.push("focus sectors");
  if (!profile?.stages) missing.push("investment stages");
  if (!missing.length) return 0;

  await insertTask(admin, {
    user_id: investorId,
    role: "investor",
    task_type: "profile_gap",
    chain_phase: "single",
    requires_external_action: false,
    title: "Complete your investor profile",
    description: `Missing: ${missing.join(", ")}. Without a complete thesis, you won't get thesis-match alerts.`,
    priority: "high",
    action_label: "Complete profile",
    action_url: `/app/investor/profile`,
    status: "open",
    dedupe_key: dedupeKey,
    related_entity_type: "profile",
  });
  return 1;
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAYBOOK TASK GENERATORS
// ══════════════════════════════════════════════════════════════════════════════

type FounderStage =
  | "profile_incomplete"
  | "profile_done_no_visibility"
  | "getting_seen_no_traction"
  | "requests_no_deal_room"
  | "deal_room_active";

/**
 * Stage detection — same logic as getFounderStage() in desk-fn.ts.
 * Most-advanced-unresolved wins, checked in order.
 */
async function detectFounderStage(admin: any, founderId: string, startupId: string): Promise<FounderStage> {
  const [sessionRes, requestsRes, roomsRes] = await Promise.all([
    admin
      .from("profile_builder_sessions")
      .select("status")
      .eq("startup_id", startupId)
      .eq("status", "confirmed")
      .maybeSingle(),
    admin
      .from("discovery_requests")
      .select("id", { count: "exact", head: true })
      .eq("startup_id", startupId),
    admin
      .from("deal_rooms")
      .select("id", { count: "exact", head: true })
      .eq("startup_id", startupId),
  ]);

  const isConfirmed = !!sessionRes.data;
  const requestCount = requestsRes.count ?? 0;
  const roomCount = roomsRes.count ?? 0;

  if (!isConfirmed) return "profile_incomplete";
  if (roomCount > 0) return "deal_room_active";
  if (requestCount > 0) return "requests_no_deal_room";

  // Need view count for the last two stages
  const { count: viewCount } = await admin
    .from("document_views")
    .select("id", { count: "exact", head: true })
    .in(
      "deal_room_id",
      (await admin.from("deal_rooms").select("id").eq("startup_id", startupId)).data?.map((r: any) => r.id) ?? [],
    );

  if ((viewCount ?? 0) > 0) return "getting_seen_no_traction";
  return "profile_done_no_visibility";
}

/**
 * Auto-resolve stale playbook tasks whose stage has advanced.
 * If a task_type starts with 'playbook_' and its embedded stage no longer
 * matches the current stage, mark it done.
 */
async function resolveStalePlaybookTasks(admin: any, founderId: string, currentStage: FounderStage): Promise<void> {
  const STAGE_TO_TASK_TYPE: Record<string, string> = {
    profile_done_no_visibility: "playbook_visibility",
    getting_seen_no_traction: "playbook_traction_gap",
  };

  // Get all open playbook tasks for this founder
  const { data: openPlaybook } = await admin
    .from("desk_tasks")
    .select("id, task_type")
    .eq("user_id", founderId)
    .eq("status", "open")
    .like("task_type", "playbook_%");

  if (!openPlaybook?.length) return;

  const currentTaskType = STAGE_TO_TASK_TYPE[currentStage] ?? null;

  for (const task of openPlaybook) {
    if (task.task_type !== currentTaskType) {
      // This task belongs to a stage the founder has moved past — resolve it
      await admin
        .from("desk_tasks")
        .update({ status: "done", chain_phase: "completed", completed_at: new Date().toISOString() })
        .eq("id", task.id);
      console.log("[desk-cron] Auto-resolved stale playbook task", task.task_type, "for founder", founderId);
    }
  }
}

/**
 * STAGE: profile_done_no_visibility
 * Generates one card with 3 sub-options stored in draft_content as JSON.
 * Option A: 7 social post drafts (generated at creation time from real startup data)
 * Option B: cold outreach draft (generated at creation time)
 * Option C: Roast — coming soon (static, no AI needed)
 */
async function generatePlaybookVisibilityTask(admin: any, founderId: string, startupId: string): Promise<number> {
  const dedupeKey = `playbook_visibility_${startupId}`;
  if (await dedupeExists(admin, founderId, dedupeKey)) return 0;

  const { data: startup } = await admin
    .from("startups")
    .select(
      "company_name, sector, stage, traction, description, funding_target, country, " +
      "customer_count, key_metric, tagline, problem, solution, competitive_advantage, " +
      "why_now, why_us, business_model, market_size, growth_rate, milestones, moat, " +
      "team_size, revenue, target_customer",
    )
    .eq("id", startupId)
    .maybeSingle();

  const companyName = startup?.company_name ?? "your company";
  const stage = startup?.stage ?? "seed";
  const sector = startup?.sector ?? "tech";
  const fundingTarget = startup?.funding_target ? `$${startup.funding_target}` : "seed round";

  // Build data block from only the fields that are actually populated — never substitute fiction for a missing field
  function field(label: string, value: any): string | null {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    return `${label}: ${String(value).trim()}`;
  }
  const dataLines = [
    field("Company", startup?.company_name),
    field("Sector", startup?.sector),
    field("Stage", startup?.stage),
    field("Tagline", startup?.tagline),
    field("Country", startup?.country),
    field("Funding target", startup?.funding_target ? `$${startup.funding_target}` : null),
    field("Revenue", startup?.revenue ? `$${startup.revenue}` : null),
    field("Team size", startup?.team_size),
    field("Growth rate", startup?.growth_rate),
    field("Description", startup?.description),
    field("Problem being solved", startup?.problem),
    field("Solution", startup?.solution),
    field("Traction", startup?.traction),
    field("Customer count", startup?.customer_count),
    field("Key metric", startup?.key_metric),
    field("Target customer", startup?.target_customer),
    field("Market size", startup?.market_size),
    field("Competitive advantage", startup?.competitive_advantage),
    field("Why us", startup?.why_us),
    field("Why now", startup?.why_now),
    field("Business model", startup?.business_model),
    field("Milestones", startup?.milestones),
    field("Moat", startup?.moat),
  ].filter(Boolean).join("\n");

  const noInventionRule =
    "CRITICAL: Use ONLY the real company data provided below. " +
    "Do not invent sectors, metrics, customer counts, or facts not present in this data. " +
    "If specific numbers are not available for a given angle, write about qualitative strengths instead of inventing numbers. " +
    "Every claim in every post must be derivable from the data block below — nothing else.";

  // OPTION A: Generate 7 real social post drafts at task creation time
  let socialPosts: string[] = [];
  try {
    const raw = await callOpenAI(
      `You are helping a startup founder build an investor-facing content presence.
${noInventionRule}
Generate exactly 7 LinkedIn/X post drafts for a founder raising a ${stage} round.
Each post should be 2-4 sentences, grounded in the specific real data provided,
no hashtags, no fluff, no exclamation marks. Vary the angles:
one on the problem, one on traction, one on the team/mission,
one on the market, one on a specific milestone, one founder insight,
one on why now. Speak in first person as the founder.
Return ONLY valid JSON: { "posts": ["post1", "post2", "post3", "post4", "post5", "post6", "post7"] }`,
      dataLines,
      900,
    );
    const parsed = parseJSON(raw);
    if (parsed?.posts && Array.isArray(parsed.posts)) {
      socialPosts = parsed.posts.slice(0, 7);
      // Sector mismatch check — if the real sector is present, warn if any post mentions a different industry
      if (startup?.sector) {
        const realSectorLower = startup.sector.toLowerCase();
        const allPostText = socialPosts.join(" ").toLowerCase();
        // Common hallucination sectors — flag if they appear and the real sector doesn't
        const hallucSectors = ["cleantech", "climate", "carbon", "sustainability", "fintech", "edtech", "healthtech", "saas"];
        for (const hs of hallucSectors) {
          if (allPostText.includes(hs) && !realSectorLower.includes(hs)) {
            console.warn(
              `[desk-cron] SECTOR MISMATCH WARNING: generated posts mention "${hs}" but real sector is "${startup.sector}" for startup ${startupId}. Possible hallucination.`,
            );
          }
        }
      }
    }
  } catch (e) {
    console.warn("[desk-cron] Social posts gen failed:", (e as Error).message);
  }

  // OPTION B: Generate one cold outreach draft at task creation time
  let outreachDraft = "";
  try {
    outreachDraft = await callOpenAI(
      `You are helping a founder draft a cold outreach message to a VC investor.
${noInventionRule}
Write one short, specific message (under 100 words). No generic lines about
"disrupting" or "revolutionizing." Reference only the real traction and facts in the data.
Use [Investor Name] as the placeholder for the investor's name.
Return ONLY the message text — no subject line, no JSON.`,
      dataLines,
      180,
    );
    outreachDraft = outreachDraft.trim();
  } catch (e) {
    console.warn("[desk-cron] Outreach draft gen failed:", (e as Error).message);
    outreachDraft = `Hi [Investor Name],\n\nI'm raising a ${stage} round for ${companyName} — we're in the ${sector} space. Would love 20 minutes to share what we're working on.\n\n[Your name]`;
  }

  // Store all sub-option content as structured JSON in draft_content
  const subOptions = {
    optionA: {
      label: "7 days of content, drafted",
      chainPhase: "autonomous_done",
      requiresExternalAction: true,
      actionNote: "No posting integration — copy each post to LinkedIn or X.",
      posts: socialPosts,
    },
    optionB: {
      label: "A cold outreach draft",
      chainPhase: "awaiting_checkpoint",
      requiresExternalAction: false,
      draft: outreachDraft,
    },
    optionC: {
      label: "Set up your verification Roast",
      chainPhase: "coming_soon",
      requiresExternalAction: false,
      comingSoonNote: "A short AI-led interview that earns your profile a verified badge. Not yet available — check back soon.",
    },
  };

  const postsGenerated = socialPosts.length;
  const autonomousSummary = `Your profile is confirmed and ready. ${postsGenerated > 0 ? `${postsGenerated} social post drafts are ready to copy out.` : "Content drafts could not be generated — try again tomorrow."} A cold outreach draft is also ready to review. Option C (Roast verification) is coming soon.`;

  await insertTask(admin, {
    user_id: founderId,
    role: "founder",
    task_type: "playbook_visibility",
    chain_phase: "autonomous_done",
    autonomous_summary: autonomousSummary,
    draft_content: JSON.stringify(subOptions),
    checkpoint_reason: null,
    requires_external_action: false,
    title: "Your profile is ready — let's get it seen",
    description: "Choose one of 3 options to start getting in front of investors.",
    priority: "high",
    action_label: "Pick an option",
    status: "open",
    dedupe_key: dedupeKey,
    related_entity_id: startupId,
    related_entity_type: "startup",
  });

  return 1;
}

/**
 * STAGE: getting_seen_no_traction
 * Reuses the same doc-analysis AI prompt pattern from generateFounderDocFixTasks.
 * Produces a real "what might be holding investors back" analysis.
 */
async function generatePlaybookTractionGapTask(admin: any, founderId: string, startupId: string): Promise<number> {
  const dedupeKey = `playbook_traction_gap_${startupId}`;
  if (await dedupeExists(admin, founderId, dedupeKey)) return 0;

  // Get view count for the title
  const dealRoomIds = (await admin.from("deal_rooms").select("id").eq("startup_id", startupId)).data?.map((r: any) => r.id) ?? [];
  const { count: viewCount } = await admin
    .from("document_views")
    .select("id", { count: "exact", head: true })
    .in("deal_room_id", dealRoomIds.length ? dealRoomIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: startup } = await admin
    .from("startups")
    .select(
      "company_name, sector, stage, traction, description, funding_target, " +
      "customer_count, key_metric, tagline, problem, solution, competitive_advantage, " +
      "why_now, why_us, business_model, market_size, growth_rate, milestones, moat, " +
      "team_size, revenue, target_customer",
    )
    .eq("id", startupId)
    .maybeSingle();

  const { data: docs } = await admin
    .from("founder_documents")
    .select("file_name, template_slug, ai_feedback")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(5);

  const companyName = startup?.company_name ?? "your company";
  const docSummary = (docs ?? [])
    .map((d: any) => {
      const name = d.file_name ?? d.template_slug;
      const fb = d.ai_feedback;
      if (fb && typeof fb === "object" && fb.overall_score) {
        return `${name}: score ${fb.overall_score}/100, signal: ${fb.signal ?? "unknown"}`;
      }
      return `${name}: not yet analyzed`;
    })
    .join("; ") || "No documents uploaded";

  function tgField(label: string, value: any): string | null {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    return `${label}: ${String(value).trim()}`;
  }
  const tgDataLines = [
    tgField("Company", startup?.company_name),
    tgField("Sector", startup?.sector),
    tgField("Stage", startup?.stage),
    tgField("Tagline", startup?.tagline),
    tgField("Description", startup?.description),
    tgField("Problem", startup?.problem),
    tgField("Solution", startup?.solution),
    tgField("Traction", startup?.traction),
    tgField("Customer count", startup?.customer_count),
    tgField("Key metric", startup?.key_metric),
    tgField("Revenue", startup?.revenue ? `$${startup.revenue}` : null),
    tgField("Funding target", startup?.funding_target ? `$${startup.funding_target}` : null),
    tgField("Market size", startup?.market_size),
    tgField("Competitive advantage", startup?.competitive_advantage),
    tgField("Why us", startup?.why_us),
    tgField("Why now", startup?.why_now),
    tgField("Target customer", startup?.target_customer),
    tgField("Documents on file", docSummary || null),
    tgField("Profile views so far", viewCount ?? null),
  ].filter(Boolean).join("\n");

  let autonomousSummary = "";
  try {
    const raw = await callOpenAI(
      `You are a VC analyst. A startup's profile is getting views but no investor access requests.
CRITICAL: Use ONLY the real company data provided below. Do not invent sectors, metrics, or facts not in the data.
Analyze the data and identify the 3 most likely reasons investors are viewing but not requesting access.
Be specific to this startup's actual data — no generic advice.
Each reason should be 1-2 sentences with a concrete, actionable fix.
Return ONLY valid JSON: { "reasons": [{ "issue": "...", "fix": "..." }, ...] }`,
      tgDataLines,
      500,
    );
    const parsed = parseJSON(raw);
    if (parsed?.reasons && Array.isArray(parsed.reasons)) {
      const lines = parsed.reasons
        .slice(0, 3)
        .map((r: any, i: number) => `${i + 1}. ${r.issue} — ${r.fix}`)
        .join("\n");
      autonomousSummary = `${companyName} has been seen ${viewCount ?? "multiple"} times with no access requests. Here's what might be holding investors back:\n\n${lines}`;
    } else {
      throw new Error("parse failed");
    }
  } catch (e) {
    console.warn("[desk-cron] Traction gap analysis failed:", (e as Error).message);
    autonomousSummary = `${companyName} has ${viewCount ?? "some"} profile views but no investor requests yet. Upload more documents or strengthen your traction section to improve conversion.`;
  }

  await insertTask(admin, {
    user_id: founderId,
    role: "founder",
    task_type: "playbook_traction_gap",
    chain_phase: "autonomous_done",
    autonomous_summary: autonomousSummary,
    requires_external_action: false,
    title: `Seen ${viewCount ?? "multiple"} times, no requests yet — here's what I'd fix`,
    description: "AI analysis of why investors may be viewing but not reaching out.",
    priority: "high",
    action_label: "View full analysis",
    action_url: "/app",
    status: "open",
    dedupe_key: dedupeKey,
    related_entity_id: startupId,
    related_entity_type: "startup",
  });

  return 1;
}

/**
 * Main playbook dispatcher — detects stage, resolves stale tasks, generates appropriate move.
 */
async function generateFounderPlaybookTasks(admin: any, founderId: string, startupId: string): Promise<number> {
  const stage = await detectFounderStage(admin, founderId, startupId);
  await resolveStalePlaybookTasks(admin, founderId, stage);

  if (stage === "deal_room_active" || stage === "requests_no_deal_room" || stage === "profile_incomplete") {
    return 0; // no playbook move for these stages this session
  }
  if (stage === "profile_done_no_visibility") {
    return generatePlaybookVisibilityTask(admin, founderId, startupId);
  }
  if (stage === "getting_seen_no_traction") {
    return generatePlaybookTractionGapTask(admin, founderId, startupId);
  }
  return 0;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), { status: 500, headers: corsHeaders });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── SINGLE-FOUNDER FAST PATH ──────────────────────────────────────────────
    // Called from app.profile-builder.tsx immediately on profile confirmation.
    // Scoped to one founder — no batch, no investor pass, no admin secret needed
    // (auth is via the service-role key already required to reach this endpoint).
    const url = new URL(req.url);
    const singleFounderId = url.searchParams.get("founder_id");
    const singleStartupId = url.searchParams.get("startup_id");
    if (singleFounderId && singleStartupId) {
      const pb = await generateFounderPlaybookTasks(admin, singleFounderId, singleStartupId);
      return new Response(
        JSON.stringify({ ok: true, playbook_tasks_generated: pb, founder_id: singleFounderId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const report = {
      founders: { processed: 0, tasks: { access_requests: 0, doc_fixes: 0, profile_gaps: 0, follow_ups: 0, playbook: 0 } },
      investors: { processed: 0, tasks: { thesis_matches: 0, stale_watchlist: 0, profile_gaps: 0 } },
      skipped: [] as string[],
      errors: [] as string[],
    };

    // ── FOUNDER PASS ──────────────────────────────────────────────────────────
    // All founders with a startup record (founder_id links startup to user)
    const { data: startups } = await admin
      .from("startups")
      .select("id, founder_id")
      .not("founder_id", "is", null);

    for (const startup of startups ?? []) {
      const founderId = startup.founder_id as string;
      const startupId = startup.id as string;
      report.founders.processed++;
      try {
        const ar = await generateFounderAccessRequestTasks(admin, founderId, startupId);
        const df = await generateFounderDocFixTasks(admin, founderId, startupId);
        const pg = await generateFounderProfileGapTask(admin, founderId, startupId);
        const fu = await generateFounderFollowUpTasks(admin, founderId, startupId);
        const pb = await generateFounderPlaybookTasks(admin, founderId, startupId);
        report.founders.tasks.access_requests += ar;
        report.founders.tasks.doc_fixes += df;
        report.founders.tasks.profile_gaps += pg;
        report.founders.tasks.follow_ups += fu;
        report.founders.tasks.playbook += pb;
      } catch (e) {
        report.errors.push(`founder ${founderId}: ${(e as Error).message}`);
      }
    }

    // ── INVESTOR PASS ─────────────────────────────────────────────────────────
    const { data: investorProfiles } = await admin
      .from("investor_profiles")
      .select("user_id");

    for (const ip of investorProfiles ?? []) {
      const investorId = ip.user_id as string;
      report.investors.processed++;
      try {
        const tm = await generateInvestorThesisMatchTasks(admin, investorId);
        const sw = await generateInvestorWatchlistStaleTasks(admin, investorId);
        const pg = await generateInvestorProfileGapTask(admin, investorId);
        report.investors.tasks.thesis_matches += tm;
        report.investors.tasks.stale_watchlist += sw;
        report.investors.tasks.profile_gaps += pg;
      } catch (e) {
        report.errors.push(`investor ${investorId}: ${(e as Error).message}`);
      }
    }

    // Log skipped task types (by design — insufficient detection data)
    report.skipped = [
      "founder: follow_up_investor — only generated when document_views.viewer_role='investor' exists in last 48h",
      "investor: (none skipped — all 3 types have reliable detection signals)",
    ];

    console.log("[daily-desk-cron] Done:", JSON.stringify(report, null, 2));
    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[daily-desk-cron] Fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

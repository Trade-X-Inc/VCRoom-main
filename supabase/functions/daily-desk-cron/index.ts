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

// Batch-pass task generators (founder access-request, doc-fix, profile-gap,
// follow-up; investor watchlist-stale, profile-gap) REMOVED from the repo copy
// 11 Aug 2026 when the batch pass was retired — they were reachable only from
// that pass and are absent from the deployed function. Retained in git history
// (commit cca34a9 and earlier) if the rebuild needs them.

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
 * Generates one card with 2 sub-options stored in draft_content as JSON.
 * Option A: 7 social post drafts (generated at creation time from real startup data)
 * Option B: cold outreach draft (generated at creation time)
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
  };

  const postsGenerated = socialPosts.length;
  const autonomousSummary = `Your profile is confirmed and ready. ${postsGenerated > 0 ? `${postsGenerated} social post drafts are ready to copy out.` : "Content drafts could not be generated — try again tomorrow."} A cold outreach draft is also ready to review.`;

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
    description: "Choose one of 2 options to start getting in front of investors.",
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
 * Uses the same doc-analysis AI prompt pattern the retired batch-pass doc-fix
 * generator used (removed 11 Aug 2026; see the note above).
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

    // Batch pass retired 11 Aug 2026 — see the file header.
    // The parameterless branch ran an UNBOUNDED pass over every founder and
    // investor, spending OpenAI credit per user and writing desk_tasks rows for
    // all of them — reachable by ANY authenticated caller, including anyone
    // holding the public anon key. Found by triggering it accidentally during
    // the 11 Aug OpenAI-key audit (9 real rows created across 5 accounts, since
    // deleted by id and re-verified). §19c Audit B had recorded this path as
    // having "no trigger of any kind," which was true of AUTOMATIC invocation
    // and said nothing about reachability — a manual POST is a trigger.
    // No admin-secret gate was added, deliberately: an unused manual capability
    // on a function being narrowed is a liability nobody asked for.
    return new Response(
      JSON.stringify({ error: "Gone", detail: "Batch pass retired. Use ?founder_id=&startup_id= for the single-founder path." }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[daily-desk-cron] Fatal:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// Badge award engine — single responsibility: evaluate whether a startup or
// investor qualifies for each auto-awarded badge, and award the missing ones.
//
// Rules:
//  - IDEMPOTENT: safe to call repeatedly (unique indexes + insert-if-missing).
//  - Never revokes automatically. Earned stays earned unless an admin acts.
//  - Never throws: all failures are swallowed and returned as empty arrays.
//  - FOUNDER PRECONDITION: no badge of any category is awarded to a startup
//    whose Tier 1 identity check has not passed. A company whose identity we
//    could not confirm gets no trust signals of any kind.
//  - Evaluation runs on specific write events (see call sites), never on
//    page load.
// ─────────────────────────────────────────────────────────────────────────────

export interface BadgeEvalResult {
  awarded: string[];
  revoked: string[]; // always [] today — revocation is manual, by design
  unchanged: string[];
}

const EMPTY: BadgeEvalResult = { awarded: [], revoked: [], unchanged: [] };

function admin() {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    url: cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "",
    key: cfEnv.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

async function sbGet(url: string, key: string, path: string): Promise<any[]> {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) return [];
  return resp.json().catch(() => []);
}

async function sbInsert(url: string, key: string, table: string, row: unknown): Promise<boolean> {
  const resp = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  return resp.ok; // 409 (already exists) returns false — treated as unchanged
}

const INVEST_DECISIONS = new Set(["invest", "invested", "accept", "accepted", "term_sheet"]);
const PASS_DECISIONS = new Set(["pass", "passed", "decline", "declined", "reject", "rejected"]);

function decisionKind(d: any): string {
  return String(d?.decision_type ?? d?.status ?? "").toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Founder evaluation
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateFounder(url: string, key: string, startupId: string): Promise<Map<string, Record<string, unknown>>> {
  const qualifies = new Map<string, Record<string, unknown>>();

  const verifRows = await sbGet(url, key,
    `founder_verifications?startup_id=eq.${startupId}&select=tier1_passed,tier1_checked_at,tier2_passed,tier3_passed,tier4_passed,operational_bank_verified,operational_contract_verified,operational_team_verified,tier1_registry_source`);
  const v = verifRows[0];

  // Hard gate: no identity, no badges — of any kind.
  if (!v || v.tier1_passed !== true) return qualifies;

  qualifies.set("identity_confirmed", {
    tier1_checked_at: v.tier1_checked_at,
    registry_source: v.tier1_registry_source ?? null,
  });

  // ── Trust: claims ─────────────────────────────────────────────────────────
  const claims = await sbGet(url, key,
    `startup_claims?startup_id=eq.${startupId}&ai_verdict=eq.verified&select=claim_type,claim_category,ai_checked_at`);
  const financial = claims.filter((c) => c.claim_category === "financial");
  if (claims.length >= 3 && financial.length >= 1) {
    qualifies.set("claims_verified", { verified_claims: claims.length, financial_claims: financial.length });
  }
  const revenueClaim = claims.find((c) => c.claim_type === "revenue" || c.claim_type?.startsWith("revenue"));
  if (revenueClaim) {
    qualifies.set("revenue_verified", { claim_type: revenueClaim.claim_type, checked_at: revenueClaim.ai_checked_at });
  }

  // ── Trust: operational tiers ─────────────────────────────────────────────
  if (v.operational_team_verified === true) {
    qualifies.set("team_verified", { source: "operational_team slot, AI-confirmed" });
  }
  if (v.tier3_passed === true &&
      v.operational_bank_verified === true &&
      v.operational_contract_verified === true &&
      v.operational_team_verified === true) {
    qualifies.set("operationally_verified", { human_reviewed: true });
  }
  if (v.tier4_passed === true) {
    qualifies.set("hockystick_verified", { tier4: true });
  }

  // ── Readiness: deal rooms + NDA + documents ─────────────────────────────
  const rooms = await sbGet(url, key,
    `deal_rooms?startup_id=eq.${startupId}&select=id,status,workflow_stage,created_at`);
  const roomIds = rooms.map((r) => r.id);

  const [docs, templates] = await Promise.all([
    sbGet(url, key, `founder_documents?startup_id=eq.${startupId}&status=neq.empty&select=template_id,status`),
    sbGet(url, key, `document_templates?select=id,category`),
  ]);
  const catById = new Map(templates.map((t) => [t.id, t.category]));
  const docCategories = new Set(docs.map((d) => catById.get(d.template_id)).filter(Boolean));

  if (roomIds.length > 0) {
    const inList = `(${roomIds.join(",")})`;
    const [ndas, qa, ddGoals, decisions] = await Promise.all([
      sbGet(url, key, `nda_acceptances?deal_room_id=in.${inList}&select=deal_room_id,role`),
      sbGet(url, key, `deal_room_qa?deal_room_id=in.${inList}&select=id,parent_id,is_question,sender_role,created_at`),
      sbGet(url, key, `deal_room_dd_goals?deal_room_id=in.${inList}&select=deal_room_id,status`),
      sbGet(url, key, `decisions?deal_room_id=in.${inList}&select=deal_room_id,status,decision_type,created_at`),
    ]);

    // deal_ready: a room where BOTH parties signed the NDA + pitch materials exist
    const rolesByRoom = new Map<string, Set<string>>();
    for (const n of ndas) {
      if (!rolesByRoom.has(n.deal_room_id)) rolesByRoom.set(n.deal_room_id, new Set());
      rolesByRoom.get(n.deal_room_id)!.add(String(n.role ?? "").toLowerCase());
    }
    const dualNdaRoom = [...rolesByRoom.entries()].find(([, roles]) => roles.size >= 2);
    if (dualNdaRoom && docs.length >= 1) {
      qualifies.set("deal_ready", { deal_room_id: dualNdaRoom[0], documents: docs.length });
    }

    // fast_responder: >= 3 founder answers within 24h of the parent question
    const questionAt = new Map(qa.filter((m) => m.is_question).map((m) => [m.id, m.created_at]));
    const fastAnswers = qa.filter((m) => {
      if (m.is_question || !m.parent_id) return false;
      if (String(m.sender_role ?? "").toLowerCase() === "investor") return false;
      const asked = questionAt.get(m.parent_id);
      if (!asked) return false;
      return new Date(m.created_at).getTime() - new Date(asked).getTime() <= 24 * 3600 * 1000;
    });
    if (fastAnswers.length >= 3) {
      qualifies.set("fast_responder", { fast_answers: fastAnswers.length });
    }

    // dd_complete: at least one room where all goals exist and are complete
    const goalsByRoom = new Map<string, { total: number; done: number }>();
    for (const g of ddGoals) {
      const e = goalsByRoom.get(g.deal_room_id) ?? { total: 0, done: 0 };
      e.total += 1;
      if (String(g.status ?? "").toLowerCase() === "complete" || String(g.status ?? "").toLowerCase() === "completed") e.done += 1;
      goalsByRoom.set(g.deal_room_id, e);
    }
    const ddRoom = [...goalsByRoom.entries()].find(([, e]) => e.total > 0 && e.done === e.total);
    if (ddRoom) qualifies.set("dd_complete", { deal_room_id: ddRoom[0], goals: ddRoom[1].total });

    // first_close: a room reached the Closing stage
    const closingRoom = rooms.find((r) => ["closing", "closed"].includes(String(r.workflow_stage ?? "").toLowerCase()));
    if (closingRoom) qualifies.set("first_close", { deal_room_id: closingRoom.id, workflow_stage: closingRoom.workflow_stage });

    // round_closed: a concluded room WITH an invest decision (a Pass-closed room is not a closed round)
    const investDecision = decisions.find((d) => INVEST_DECISIONS.has(decisionKind(d)));
    if (investDecision) {
      const room = rooms.find((r) => r.id === investDecision.deal_room_id);
      if (room && ["closed", "closing"].includes(String(room.workflow_stage ?? "").toLowerCase())) {
        qualifies.set("round_closed", { deal_room_id: investDecision.deal_room_id });
      }
    }
  }

  // fully_documented: all 5 template categories have a non-empty document
  const required = ["market", "financials", "team", "product", "legal"];
  if (required.every((c) => docCategories.has(c))) {
    qualifies.set("fully_documented", { categories: [...docCategories] });
  }

  // early_builder: among the first 100 identity-verified founders
  const first100 = await sbGet(url, key,
    `founder_verifications?tier1_passed=eq.true&select=startup_id&order=tier1_checked_at.asc.nullslast&limit=100`);
  if (first100.some((r) => r.startup_id === startupId)) {
    qualifies.set("early_builder", { position: first100.findIndex((r) => r.startup_id === startupId) + 1 });
  }

  return qualifies;
}

// ─────────────────────────────────────────────────────────────────────────────
// Investor evaluation
// ─────────────────────────────────────────────────────────────────────────────

async function evaluateInvestor(url: string, key: string, userId: string): Promise<Map<string, Record<string, unknown>>> {
  const qualifies = new Map<string, Record<string, unknown>>();

  const rooms = await sbGet(url, key,
    `deal_rooms?investor_user_id=eq.${userId}&select=id,status,workflow_stage,created_at`);
  const roomIds = rooms.map((r) => r.id);
  const decisions = roomIds.length
    ? await sbGet(url, key, `decisions?deal_room_id=in.(${roomIds.join(",")})&decided_by=eq.${userId}&select=deal_room_id,status,decision_type,pass_reason_category,pass_reason_detail,created_at`)
    : [];

  // active_investor: >= 5 rooms opened in the past 6 months
  const sixMonthsAgo = Date.now() - 182 * 24 * 3600 * 1000;
  const recentRooms = rooms.filter((r) => new Date(r.created_at).getTime() > sixMonthsAgo);
  if (recentRooms.length >= 5) qualifies.set("active_investor", { rooms_6mo: recentRooms.length });

  // thesis_clarity: thesis set + >= 10 companies on the watchlist
  const [profiles, watchlist] = await Promise.all([
    sbGet(url, key, `investor_profiles?user_id=eq.${userId}&select=thesis_statement,thesis`),
    sbGet(url, key, `investor_watchlist?investor_id=eq.${userId}&select=id`),
  ]);
  const thesisSet = !!(profiles[0]?.thesis_statement || profiles[0]?.thesis);
  if (thesisSet && watchlist.length >= 10) {
    qualifies.set("thesis_clarity", { watchlist_count: watchlist.length });
  }

  // fast_decision: decision within 14 days of room opening, on >= 3 rooms
  const roomCreated = new Map(rooms.map((r) => [r.id, r.created_at]));
  const fast = decisions.filter((d) => {
    const opened = roomCreated.get(d.deal_room_id);
    return opened && new Date(d.created_at).getTime() - new Date(opened).getTime() <= 14 * 24 * 3600 * 1000;
  });
  const fastRooms = new Set(fast.map((d) => d.deal_room_id));
  if (fastRooms.size >= 3) qualifies.set("fast_decision", { fast_rooms: fastRooms.size });

  // deal_closed: an invest decision on a concluded room
  const invest = decisions.find((d) => INVEST_DECISIONS.has(decisionKind(d)));
  if (invest) {
    const room = rooms.find((r) => r.id === invest.deal_room_id);
    if (room && ["closed", "closing"].includes(String(room.workflow_stage ?? "").toLowerCase())) {
      qualifies.set("deal_closed", { deal_room_id: invest.deal_room_id });
    }
  }

  // no_ghosting: every concluded room has a decision — minimum 3 concluded
  const concluded = rooms.filter((r) =>
    String(r.status ?? "").toLowerCase() === "closed" ||
    String(r.workflow_stage ?? "").toLowerCase() === "closed");
  const decidedRooms = new Set(decisions.map((d) => d.deal_room_id));
  if (concluded.length >= 3 && concluded.every((r) => decidedRooms.has(r.id))) {
    qualifies.set("no_ghosting", { concluded_rooms: concluded.length });
  }

  // reason_giver: >= 3 passes, every one with a written reason
  const passes = decisions.filter((d) => PASS_DECISIONS.has(decisionKind(d)));
  if (passes.length >= 3 && passes.every((d) => (d.pass_reason_detail ?? "").trim().length > 0 || (d.pass_reason_category ?? "").trim().length > 0)) {
    qualifies.set("reason_giver", { passes_with_reasons: passes.length });
  }

  return qualifies;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: evaluate + award (plain function, callable from other server fns)
// ─────────────────────────────────────────────────────────────────────────────

export async function evaluateAndAwardBadgesCore(opts: {
  startupId?: string;
  investorProfileId?: string;
  investorUserId?: string;
}): Promise<BadgeEvalResult> {
  try {
    const { url, key } = admin();
    if (!url || !key) return EMPTY;

    const defs = await sbGet(url, key,
      `badge_definitions?auto_awarded=eq.true&select=id,category,label`);
    const defById = new Map(defs.map((d) => [d.id, d]));

    const awarded: string[] = [];
    const unchanged: string[] = [];

    const award = async (
      qualifies: Map<string, Record<string, unknown>>,
      existing: Set<string>,
      target: { startup_id?: string; investor_profile_id?: string },
    ) => {
      for (const [badgeId, evidence] of qualifies) {
        const def = defById.get(badgeId);
        if (!def) continue; // not auto-awarded or unknown — engine never awards those
        if (existing.has(badgeId)) {
          unchanged.push(badgeId);
          continue;
        }
        const ok = await sbInsert(url, key, "profile_badges", {
          ...target,
          badge_type: badgeId,
          badge_label: def.label,
          badge_source: "hockystick",
          verified_by_hockystick: def.category === "trust",
          verification_evidence: { criteria_met: evidence, evaluated_at: new Date().toISOString() },
          issued_at: new Date().toISOString(),
        });
        if (ok) awarded.push(badgeId);
        else unchanged.push(badgeId); // unique-index conflict = already there
      }
    };

    if (opts.startupId) {
      const [qualifies, existingRows] = await Promise.all([
        evaluateFounder(url, key, opts.startupId),
        sbGet(url, key, `profile_badges?startup_id=eq.${opts.startupId}&select=badge_type`),
      ]);
      await award(qualifies, new Set(existingRows.map((r) => r.badge_type)), { startup_id: opts.startupId });
    }

    if (opts.investorProfileId && opts.investorUserId) {
      const [qualifies, existingRows] = await Promise.all([
        evaluateInvestor(url, key, opts.investorUserId),
        sbGet(url, key, `profile_badges?investor_profile_id=eq.${opts.investorProfileId}&select=badge_type`),
      ]);
      await award(qualifies, new Set(existingRows.map((r) => r.badge_type)), { investor_profile_id: opts.investorProfileId });
    }

    return { awarded, revoked: [], unchanged };
  } catch (err) {
    console.error("[badge-engine] evaluation failed:", err);
    return EMPTY;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-callable wrapper
// ─────────────────────────────────────────────────────────────────────────────

export const evaluateAndAwardBadges = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { startup_id?: string; investor_profile_id?: string; investor_user_id?: string })
  .handler(async ({ data }): Promise<BadgeEvalResult> =>
    evaluateAndAwardBadgesCore({
      startupId: data.startup_id,
      investorProfileId: data.investor_profile_id,
      investorUserId: data.investor_user_id,
    }));

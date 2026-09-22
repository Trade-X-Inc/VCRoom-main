import { createServerFn } from "@tanstack/react-start";
import { INSTRUMENT_TEMPLATES, type InstrumentType } from "@/lib/term-templates";
import { consumeStepUpToken } from "@/lib/step-up-fn";

// R15A — Term negotiation server functions.
//
// All state changes go through these SECURITY-DEFINER-equivalent service-role
// fns so the mutual-acceptance rule cannot be bypassed from the client:
//   - the caller's identity is ALWAYS resolved from their JWT (verifyUser),
//     never a passed-in id;
//   - the caller must be a founder/investor member of THIS room
//     (verifyPrincipalMember — fails closed, never open);
//   - accepted_by_founder / accepted_by_investor are written ONLY here, keyed
//     to the caller's own role, so one side can never set the other's
//     acceptance (the step-7 unilateral-accept bypass);
//   - a term finalizes (status='locked', both flags true) only when BOTH sides
//     have explicitly accepted the SAME current_value.
//
// Mirrors the interview-fn.ts pattern (getEnv/sbFetch/verifyUser/
// verifyPrincipalMember) exactly — same __cf_env service-role approach.

function getEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    url:
      cfEnv.SUPABASE_URL ||
      cfEnv.VITE_SUPABASE_URL ||
      (import.meta.env as any).VITE_SUPABASE_URL ||
      "",
    key: cfEnv.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

async function sbFetch(url: string, key: string, path: string, method = "GET", body?: unknown, prefer?: string) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: prefer ?? (method === "POST" ? "return=representation" : "return=minimal"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Resolve the calling user's id from their JWT — never trust a passed-in id. */
async function verifyUser(url: string, key: string, accessToken: string): Promise<string | null> {
  if (!accessToken) return null;
  const resp = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const user = (await resp.json()) as { id?: string };
  return user?.id ?? null;
}

/** Founder/investor member of THIS room. Fails CLOSED. Excludes lawyer/External. */
async function verifyPrincipalMember(
  url: string, key: string, dealRoomId: string, userId: string,
): Promise<"founder" | "investor" | null> {
  const rows: any[] = await sbFetch(
    url, key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&user_id=eq.${userId}&role=in.(founder,investor)&select=role`,
    "GET",
  ).catch((e) => { console.error("[term-neg] verifyPrincipalMember failed (failing closed):", e); return []; });
  const role = rows?.[0]?.role;
  return role === "founder" || role === "investor" ? role : null;
}

const otherRole = (r: "founder" | "investor") => (r === "founder" ? "investor" : "founder");

type Ctx = { url: string; key: string; role: "founder" | "investor"; uid: string };

/** Shared auth preamble: env + JWT→uid + principal role. Returns null on any failure. */
async function authorize(dealRoomId: string, accessToken: string): Promise<Ctx | null> {
  const { url, key } = getEnv();
  if (!url || !key) { console.error("[term-neg] missing env"); return null; }
  const uid = await verifyUser(url, key, accessToken);
  if (!uid) return null;
  const role = await verifyPrincipalMember(url, key, dealRoomId, uid);
  if (!role) return null;
  return { url, key, role, uid };
}

/**
 * Password re-entry step-up (Gate C, 22 Sep 2026), shared by
 * acceptTerm/proposeTerm/rejectTerm. Called AFTER authorize() succeeds, so
 * a non-member never reaches this check — step-up proves "the person who
 * already passed membership re-typed their password," not identity itself.
 * Consumes the token in the same call that verifies it (single-use); a
 * caller who fails a later step in the handler must obtain a fresh token.
 */
async function requireStepUp(ctx: Ctx, stepUpToken: string | undefined): Promise<boolean> {
  const result = await consumeStepUpToken(ctx.uid, stepUpToken);
  return result.ok;
}

async function getConfig(ctx: Ctx, dealRoomId: string) {
  const rows: any[] = await sbFetch(ctx.url, ctx.key,
    `deal_room_term_config?deal_room_id=eq.${dealRoomId}&select=*`, "GET");
  return rows?.[0] ?? null;
}

/** Recompute whether every term is finalized; if so, lock the set. Idempotent. */
async function maybeLockSet(ctx: Ctx, dealRoomId: string) {
  const cfg = await getConfig(ctx, dealRoomId);
  if (!cfg || cfg.locked_at) return; // already locked or no config
  const terms: any[] = await sbFetch(ctx.url, ctx.key,
    `deal_room_terms?deal_room_id=eq.${dealRoomId}&select=status`, "GET");
  if (!terms || terms.length === 0) return;
  const allLocked = terms.every((t) => t.status === "locked");
  if (allLocked) {
    await sbFetch(ctx.url, ctx.key,
      `deal_room_term_config?deal_room_id=eq.${dealRoomId}`, "PATCH",
      { locked_at: new Date().toISOString(), locked_by: ctx.uid });
    // R15B: the term set just locked -> auto-generate the summary. Same
    // service-role context. Failure here must not undo the lock (the lock is the
    // source of truth; the summary can be re-generated), so it's logged, not thrown.
    try {
      const { buildSummaryForRoom } = await import("@/lib/summary-fn");
      const r = await buildSummaryForRoom(dealRoomId, { url: ctx.url, key: ctx.key });
      if (!r.ok) console.error("[term-neg] summary generation after lock failed:", r.error);
    } catch (e) {
      console.error("[term-neg] summary generation threw after lock (lock stands):", e);
    }
  }
}

// Seed a room with an instrument's template terms + lock the instrument in
// config. Shared by first-selection and (post-mutual-approval) reset.
async function seedInstrument(ctx: Ctx, dealRoomId: string, instrumentType: InstrumentType) {
  const tmpl = INSTRUMENT_TEMPLATES[instrumentType];
  await sbFetch(ctx.url, ctx.key, `deal_room_term_config?on_conflict=deal_room_id`, "POST",
    { deal_room_id: dealRoomId, instrument_type: instrumentType, instrument_locked: true },
    "return=minimal,resolution=merge-duplicates");
  const seed = tmpl.terms.map((t) => ({
    deal_room_id: dealRoomId,
    instrument_type: instrumentType,
    term_key: t.term_key,
    term_label: t.label,
    value_type: t.value_type,
    is_custom: false,
    status: "unset",
  }));
  await sbFetch(ctx.url, ctx.key, `deal_room_terms`, "POST", seed, "return=minimal");
  return seed.length;
}

// ── selectInstrument — FIRST selection only ──────────────────────────────────
// Seeds the template terms and locks the instrument. Once terms exist, the
// instrument can ONLY be changed through the mutual-reset request flow below
// (requestInstrumentReset -> resolveInstrumentReset) — this fn NEVER wipes
// terms, so no single party can reset by re-calling it. A re-select of the same
// (or any) type after terms exist is a no-op.
type SelectInstrumentInput = {
  dealRoomId: string;
  accessToken: string;
  instrumentType: InstrumentType;
};

export const selectInstrument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SelectInstrumentInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    const tmpl = INSTRUMENT_TEMPLATES[data.instrumentType];
    if (!tmpl) return { ok: false, error: "invalid_instrument" };

    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const existingTerms: any[] = await sbFetch(ctx.url, ctx.key,
      `deal_room_terms?deal_room_id=eq.${data.dealRoomId}&select=id`, "GET");
    // Terms already exist -> instrument change must go through the mutual-reset
    // request flow. selectInstrument itself is inert here (never deletes).
    if ((existingTerms?.length ?? 0) > 0) {
      return { ok: false, error: "instrument_locked_use_reset_request" };
    }

    const seeded = await seedInstrument(ctx, data.dealRoomId, data.instrumentType);
    return { ok: true, seeded };
  });

// ── requestInstrumentReset — party A opens a mutual-reset request ─────────────
// Wiping all negotiated terms requires BOTH parties. This creates a pending
// request naming the target instrument; the COUNTERPARTY must approve it via
// resolveInstrumentReset. A single party can never reset alone — same mechanic
// as R14B's finalize_counsel_waiver (§38.3). Supersedes any prior pending
// request from the same room.
type RequestResetInput = {
  dealRoomId: string;
  accessToken: string;
  targetInstrument: InstrumentType;
};

export const requestInstrumentReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RequestResetInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (!INSTRUMENT_TEMPLATES[data.targetInstrument]) return { ok: false, error: "invalid_instrument" };
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    // Clear any stale pending request first, then open a fresh one.
    await sbFetch(ctx.url, ctx.key,
      `deal_room_term_reset_requests?deal_room_id=eq.${data.dealRoomId}&status=eq.pending`, "PATCH",
      { status: "rejected", resolved_at: new Date().toISOString() });
    await sbFetch(ctx.url, ctx.key, `deal_room_term_reset_requests`, "POST", {
      deal_room_id: data.dealRoomId,
      requested_by: ctx.uid,
      requested_role: ctx.role,
      target_instrument: data.targetInstrument,
      status: "pending",
    }, "return=minimal");
    return { ok: true };
  });

// ── resolveInstrumentReset — party B approves/rejects the reset ───────────────
// APPROVAL is the only path that wipes terms, and it enforces resolver != the
// requester (proving both sides agreed). A requester approving their OWN request
// is rejected (self_approval) — the core anti-bypass check. On approval: delete
// all terms + proposals, re-seed the target instrument, consume the request.
type ResolveResetInput = {
  dealRoomId: string;
  accessToken: string;
  requestId: string;
  approve: boolean;
};

export const resolveInstrumentReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ResolveResetInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const rows: any[] = await sbFetch(ctx.url, ctx.key,
      `deal_room_term_reset_requests?id=eq.${data.requestId}&deal_room_id=eq.${data.dealRoomId}&status=eq.pending&select=*`, "GET");
    const req = rows?.[0];
    if (!req) return { ok: false, error: "request_not_found" };

    // THE anti-bypass check: the resolver must NOT be the requester. This is
    // what makes the reset genuinely mutual — one party can't approve their own
    // request. (Both are principals; only the identity differs.)
    if (req.requested_by === ctx.uid) return { ok: false, error: "self_approval" };

    if (!data.approve) {
      await sbFetch(ctx.url, ctx.key, `deal_room_term_reset_requests?id=eq.${data.requestId}`, "PATCH",
        { status: "rejected", resolved_by: ctx.uid, resolved_role: ctx.role, resolved_at: new Date().toISOString() });
      return { ok: true, approved: false };
    }

    // Approved by the counterparty -> perform the reset.
    await sbFetch(ctx.url, ctx.key, `deal_room_term_proposals?deal_room_id=eq.${data.dealRoomId}`, "DELETE");
    await sbFetch(ctx.url, ctx.key, `deal_room_terms?deal_room_id=eq.${data.dealRoomId}`, "DELETE");
    const seeded = await seedInstrument(ctx, data.dealRoomId, req.target_instrument as InstrumentType);
    await sbFetch(ctx.url, ctx.key, `deal_room_term_reset_requests?id=eq.${data.requestId}`, "PATCH",
      { status: "consumed", resolved_by: ctx.uid, resolved_role: ctx.role, resolved_at: new Date().toISOString() });
    return { ok: true, approved: true, seeded };
  });

// ── addCustomTerm — either party adds a term beyond the template ─────────────
type AddCustomTermInput = {
  dealRoomId: string;
  accessToken: string;
  termKey: string;
  termLabel: string;
  valueType: string;
};

export const addCustomTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AddCustomTermInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (!cfg?.instrument_type) return { ok: false, error: "no_instrument_selected" };
    if (cfg.locked_at) return { ok: false, error: "term_set_locked" };

    const valid = ["currency", "percentage", "boolean", "text", "date", "number"];
    const vt = valid.includes(data.valueType) ? data.valueType : "text";
    try {
      await sbFetch(ctx.url, ctx.key, `deal_room_terms`, "POST", {
        deal_room_id: data.dealRoomId,
        instrument_type: cfg.instrument_type,
        term_key: data.termKey,
        term_label: data.termLabel,
        value_type: vt,
        is_custom: true,
        status: "unset",
      }, "return=minimal");
      return { ok: true };
    } catch (e: any) {
      // unique(deal_room_id, term_key) collision
      if (String(e?.message).includes("23505")) return { ok: false, error: "term_exists" };
      return { ok: false, error: "insert_failed" };
    }
  });

// ── proposeTerm — set/counter a value for a term ─────────────────────────────
// Used both for a fresh proposal (unset/rejected term) and a counter-proposal
// (on a term the other side proposed). Resets both acceptance flags — a new
// value means the prior mutual state no longer holds. Records an audit row.
//
// RACE FIX (22 Sep 2026): the read (GET) and write (PATCH) used to be two
// independent HTTP round-trips with no lock and no compare-and-swap, so a
// concurrent write from the other party could land between them — reproduced
// live: an accept computed against one state landed on top of a DIFFERENT
// state a concurrent counter-propose had just written, locking a term at a
// value neither party actually agreed to. Now one atomic SECURITY DEFINER
// call (propose_term_atomic): FOR UPDATE locks the row, then a staleness
// check compares expectedStatus (what the UI showed when the user clicked)
// against the row's real current status under the lock. A mismatch returns
// TERM_CHANGED instead of silently applying the user's stale intent to state
// they never saw — the client must refresh and let the user re-decide.
type ProposeInput = {
  dealRoomId: string;
  accessToken: string;
  termId: string;
  value: string;
  isCounter?: boolean;
  suggestedAlternative?: string;
  stepUpToken?: string;
  /** The term's status as last fetched by the client — checked server-side
   *  under the row lock; a mismatch means the term moved and returns
   *  TERM_CHANGED rather than proceeding. Optional only for backward
   *  compatibility with a caller that hasn't been updated yet; omitting it
   *  disables the staleness check for that call. */
  expectedStatus?: string;
};

export const proposeTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ProposeInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (!(await requireStepUp(ctx, data.stepUpToken))) {
      return { ok: false, error: "STEP_UP_REQUIRED" };
    }
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const result = await sbFetch(ctx.url, ctx.key, `rpc/propose_term_atomic`, "POST", {
      p_term_id: data.termId,
      p_deal_room_id: data.dealRoomId,
      p_uid: ctx.uid,
      p_role: ctx.role,
      p_value: data.value,
      p_is_counter: !!data.isCounter,
      p_suggested_alternative: data.suggestedAlternative ?? null,
      p_expected_status: data.expectedStatus ?? null,
    }, "return=representation");

    return result as { ok: boolean; error?: string; current_status?: string; current_value?: string };
  });

// ── acceptTerm — the caller accepts the current proposed value ───────────────
// Sets ONLY the caller's own acceptance flag. If, after that, BOTH flags are
// true against the same current_value, the term finalizes (status='locked').
// Then re-check whether the whole set can auto-lock.
//
// RACE FIX (22 Sep 2026): this is the exact function the reproduction broke —
// accept_term_atomic() now does the read (FOR UPDATE), the accepted-value
// staleness check, and the write as one atomic call. expectedValue is the
// current_value the UI showed when the user clicked Accept; a mismatch under
// the lock means the term changed (e.g. a concurrent counter-propose) and
// returns TERM_CHANGED rather than locking the term at a value the caller
// never saw. The post-lock side effect (locking deal_room_term_config +
// generating the summary) stays in TypeScript, unchanged, gated on the
// term_locked flag the RPC returns — the RPC itself has no business calling
// buildSummaryForRoom.
type AcceptInput = {
  dealRoomId: string;
  accessToken: string;
  termId: string;
  stepUpToken?: string;
  /** The current_value the client last fetched for this term — checked
   *  server-side under the row lock; a mismatch returns TERM_CHANGED
   *  instead of accepting a value the user never saw. Optional only for
   *  backward compatibility with a caller that hasn't been updated yet. */
  expectedValue?: string;
};

export const acceptTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AcceptInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (!(await requireStepUp(ctx, data.stepUpToken))) {
      return { ok: false, error: "STEP_UP_REQUIRED" };
    }
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const result = (await sbFetch(ctx.url, ctx.key, `rpc/accept_term_atomic`, "POST", {
      p_term_id: data.termId,
      p_deal_room_id: data.dealRoomId,
      p_uid: ctx.uid,
      p_role: ctx.role,
      p_expected_value: data.expectedValue ?? null,
    }, "return=representation")) as {
      ok: boolean; error?: string; already_locked?: boolean; term_locked?: boolean;
      current_status?: string; current_value?: string;
    };

    if (!result.ok) {
      return { ok: false, error: result.error, current_status: result.current_status, current_value: result.current_value };
    }
    if (result.already_locked) return { ok: true, alreadyLocked: true };
    if (result.term_locked) await maybeLockSet(ctx, data.dealRoomId);
    return { ok: true, termLocked: !!result.term_locked };
  });

// ── rejectTerm — reject the current value with a suggested alternative ───────
// RACE FIX (22 Sep 2026): same shape as proposeTerm/acceptTerm — one atomic
// SECURITY DEFINER call (reject_term_atomic), FOR UPDATE + a staleness check
// on expectedStatus (what the UI showed when the user clicked Reject).
type RejectInput = {
  dealRoomId: string; accessToken: string; termId: string; suggestedAlternative?: string;
  stepUpToken?: string;
  /** The term's status as last fetched by the client — checked server-side
   *  under the row lock; a mismatch returns TERM_CHANGED. Optional only for
   *  backward compatibility with a caller that hasn't been updated yet. */
  expectedStatus?: string;
};

export const rejectTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RejectInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (!(await requireStepUp(ctx, data.stepUpToken))) {
      return { ok: false, error: "STEP_UP_REQUIRED" };
    }
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const result = await sbFetch(ctx.url, ctx.key, `rpc/reject_term_atomic`, "POST", {
      p_term_id: data.termId,
      p_deal_room_id: data.dealRoomId,
      p_uid: ctx.uid,
      p_role: ctx.role,
      p_suggested_alternative: data.suggestedAlternative ?? null,
      p_expected_status: data.expectedStatus ?? null,
    }, "return=representation");

    return result as { ok: boolean; error?: string; current_status?: string; current_value?: string };
  });

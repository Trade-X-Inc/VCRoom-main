import { createServerFn } from "@tanstack/react-start";
import { INSTRUMENT_TEMPLATES, type InstrumentType } from "@/lib/term-templates";

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
  }
}

// ── selectInstrument — choose or reset the instrument type ───────────────────
// First selection seeds the template terms and locks the instrument. Changing
// it later is the mutual-reset escape hatch: it wipes ALL terms and re-seeds,
// and REQUIRES confirmReset=true (the UI shows a mutual-confirm dialog). Both
// parties can trigger; there is no unilateral silent change.
type SelectInstrumentInput = {
  dealRoomId: string;
  accessToken: string;
  instrumentType: InstrumentType;
  confirmReset?: boolean;
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
    const hasTerms = (existingTerms?.length ?? 0) > 0;

    // Instrument is locked once terms exist. Changing it now = a reset, which
    // orphans every existing term — require explicit mutual confirmation.
    if (cfg?.instrument_locked && cfg.instrument_type !== data.instrumentType) {
      if (!data.confirmReset) return { ok: false, error: "reset_confirmation_required" };
      // Mutual-reset: delete all terms + proposals for this room, then re-seed.
      await sbFetch(ctx.url, ctx.key, `deal_room_term_proposals?deal_room_id=eq.${data.dealRoomId}`, "DELETE");
      await sbFetch(ctx.url, ctx.key, `deal_room_terms?deal_room_id=eq.${data.dealRoomId}`, "DELETE");
    } else if (cfg?.instrument_type === data.instrumentType && hasTerms) {
      return { ok: true, unchanged: true }; // no-op re-select of the same type
    }

    // Upsert config with the chosen instrument + lock it.
    await sbFetch(ctx.url, ctx.key, `deal_room_term_config?on_conflict=deal_room_id`, "POST",
      { deal_room_id: data.dealRoomId, instrument_type: data.instrumentType, instrument_locked: true },
      "return=minimal,resolution=merge-duplicates");

    // Seed the template terms (status 'unset' — nobody has proposed a value yet).
    const seed = tmpl.terms.map((t) => ({
      deal_room_id: data.dealRoomId,
      instrument_type: data.instrumentType,
      term_key: t.term_key,
      term_label: t.label,
      value_type: t.value_type,
      is_custom: false,
      status: "unset",
    }));
    await sbFetch(ctx.url, ctx.key, `deal_room_terms`, "POST", seed, "return=minimal");
    return { ok: true, seeded: seed.length };
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
type ProposeInput = {
  dealRoomId: string;
  accessToken: string;
  termId: string;
  value: string;
  isCounter?: boolean;
  suggestedAlternative?: string;
};

export const proposeTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ProposeInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const rows: any[] = await sbFetch(ctx.url, ctx.key,
      `deal_room_terms?id=eq.${data.termId}&deal_room_id=eq.${data.dealRoomId}&select=*`, "GET");
    const term = rows?.[0];
    if (!term) return { ok: false, error: "term_not_found" };
    if (term.status === "locked") return { ok: false, error: "term_locked" };

    // New value → both sides must re-accept. Awaiting the OTHER side to respond.
    await sbFetch(ctx.url, ctx.key, `deal_room_terms?id=eq.${data.termId}`, "PATCH", {
      current_value: data.value,
      status: data.isCounter ? "counter" : "proposed",
      accepted_by_founder: false,
      accepted_by_investor: false,
      awaiting_role: otherRole(ctx.role),
    });
    await sbFetch(ctx.url, ctx.key, `deal_room_term_proposals`, "POST", {
      term_id: data.termId,
      deal_room_id: data.dealRoomId,
      action: data.isCounter ? "counter" : "propose",
      proposed_value: data.value,
      suggested_alternative: data.suggestedAlternative ?? null,
      actor_user_id: ctx.uid,
      actor_role: ctx.role,
    }, "return=minimal");
    return { ok: true };
  });

// ── acceptTerm — the caller accepts the current proposed value ───────────────
// Sets ONLY the caller's own acceptance flag. If, after that, BOTH flags are
// true against the same current_value, the term finalizes (status='locked').
// Then re-check whether the whole set can auto-lock.
type AcceptInput = { dealRoomId: string; accessToken: string; termId: string };

export const acceptTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AcceptInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const rows: any[] = await sbFetch(ctx.url, ctx.key,
      `deal_room_terms?id=eq.${data.termId}&deal_room_id=eq.${data.dealRoomId}&select=*`, "GET");
    const term = rows?.[0];
    if (!term) return { ok: false, error: "term_not_found" };
    if (term.status === "locked") return { ok: true, alreadyLocked: true };
    // Can only accept a value that has actually been proposed.
    if (!term.current_value || !["proposed", "counter", "accepted"].includes(term.status)) {
      return { ok: false, error: "nothing_to_accept" };
    }

    // Set ONLY this caller's flag — never the counterparty's.
    const mine = ctx.role === "founder" ? "accepted_by_founder" : "accepted_by_investor";
    const bothAfter =
      (ctx.role === "founder" ? true : term.accepted_by_founder) &&
      (ctx.role === "investor" ? true : term.accepted_by_investor);

    const patch: Record<string, unknown> = { [mine]: true };
    if (bothAfter) {
      patch.status = "locked";
      patch.awaiting_role = null;
    } else {
      // Caller accepted, but the other side hasn't yet — mark accepted, awaiting them.
      patch.status = "accepted";
      patch.awaiting_role = otherRole(ctx.role);
    }
    await sbFetch(ctx.url, ctx.key, `deal_room_terms?id=eq.${data.termId}`, "PATCH", patch);
    await sbFetch(ctx.url, ctx.key, `deal_room_term_proposals`, "POST", {
      term_id: data.termId, deal_room_id: data.dealRoomId, action: "accept",
      actor_user_id: ctx.uid, actor_role: ctx.role,
    }, "return=minimal");

    if (bothAfter) await maybeLockSet(ctx, data.dealRoomId);
    return { ok: true, termLocked: bothAfter };
  });

// ── rejectTerm — reject the current value with a suggested alternative ───────
type RejectInput = {
  dealRoomId: string; accessToken: string; termId: string; suggestedAlternative?: string;
};

export const rejectTerm = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RejectInput)
  .handler(async ({ data }) => {
    const ctx = await authorize(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    const cfg = await getConfig(ctx, data.dealRoomId);
    if (cfg?.locked_at) return { ok: false, error: "term_set_locked" };

    const rows: any[] = await sbFetch(ctx.url, ctx.key,
      `deal_room_terms?id=eq.${data.termId}&deal_room_id=eq.${data.dealRoomId}&select=status`, "GET");
    const term = rows?.[0];
    if (!term) return { ok: false, error: "term_not_found" };
    if (term.status === "locked") return { ok: false, error: "term_locked" };

    await sbFetch(ctx.url, ctx.key, `deal_room_terms?id=eq.${data.termId}`, "PATCH", {
      status: "rejected",
      accepted_by_founder: false,
      accepted_by_investor: false,
      awaiting_role: otherRole(ctx.role), // the other side should re-propose
    });
    await sbFetch(ctx.url, ctx.key, `deal_room_term_proposals`, "POST", {
      term_id: data.termId, deal_room_id: data.dealRoomId, action: "reject",
      suggested_alternative: data.suggestedAlternative ?? null,
      actor_user_id: ctx.uid, actor_role: ctx.role,
    }, "return=minimal");
    return { ok: true };
  });

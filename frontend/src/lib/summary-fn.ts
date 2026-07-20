import { createServerFn } from "@tanstack/react-start";
import { INSTRUMENT_TEMPLATES, type InstrumentType } from "@/lib/term-templates";

// R15B — Summary generation (service-role).
//
// generateSummary reads the locked term set + config + room metadata and writes
// a STRUCTURED-JSON summary (not a PDF/HTML blob — the UI and a future PDF export
// render from it). It:
//   - orders terms by the TEMPLATE's canonical order, not created_at (audit
//     finding: bulk-locked terms share a timestamp, so created_at is not a
//     stable order);
//   - archives any existing 'active' summary before writing the new one;
//   - is idempotent-ish: safe to call again after a re-lock (produces a fresh
//     active summary, archives the prior).
// It is called from R15A's auto-lock path (server-side) and can be manually
// re-triggered after a re-open + re-lock.

const DISCLAIMER =
  "This is a summary of agreed terms for use by legal counsel in preparing a " +
  "formal agreement. It is not a legal instrument.";

function getEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    url: cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "",
    key: cfEnv.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}
async function sb(url: string, key: string, path: string, method = "GET", body?: unknown, prefer?: string) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`,
      Prefer: prefer ?? (method === "POST" ? "return=representation" : "return=minimal") },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

// The structured summary shape written to deal_room_summaries.content.
export type SummaryContent = {
  instrument_type: InstrumentType;
  instrument_label: string;
  terms: Array<{ term_key: string; term_label: string; value_type: string; value: string; is_custom: boolean }>;
  parties: { founder: { name: string; entity: string | null }; investor: { name: string } };
  deal_room_ref: string;
  generated_at: string;
  disclaimer: string;
};

/**
 * Build + persist the active summary for a room whose terms are locked.
 * Returns { ok, error? }. Service-role only — never trusts a client to write.
 * `env` may be passed by an in-process caller (R15A auto-lock) to avoid re-reading.
 */
export async function buildSummaryForRoom(dealRoomId: string, env?: { url: string; key: string }) {
  const { url, key } = env ?? getEnv();
  if (!url || !key) { console.error("[summary] missing env"); return { ok: false, error: "no_env" }; }

  // Record a failure on the config so the UI can show an honest error+retry
  // instead of a permanent "generating…". Cleared on success. Best-effort:
  // if even this write fails we still return the error to the caller.
  const markError = async (reason: string) => {
    await sb(url, key, `deal_room_term_config?deal_room_id=eq.${dealRoomId}`, "PATCH",
      { summary_error: reason, summary_error_at: new Date().toISOString() }).catch(() => {});
  };

  try {
  // Config must be locked.
  const cfg = (await sb(url, key, `deal_room_term_config?deal_room_id=eq.${dealRoomId}&select=*`))?.[0];
  if (!cfg || !cfg.locked_at) return { ok: false, error: "not_locked" };
  const instrument = cfg.instrument_type as InstrumentType;
  const tmpl = INSTRUMENT_TEMPLATES[instrument];

  // Locked terms.
  const lockedTerms: any[] = await sb(url, key,
    `deal_room_terms?deal_room_id=eq.${dealRoomId}&status=eq.locked&select=term_key,term_label,value_type,current_value,is_custom`);
  if (!lockedTerms || lockedTerms.length === 0) { await markError("no_locked_terms"); return { ok: false, error: "no_locked_terms" }; }

  // Canonical order: template order first, then any custom terms (stable by key).
  const order = new Map<string, number>();
  (tmpl?.terms ?? []).forEach((t, i) => order.set(t.term_key, i));
  const ordered = [...lockedTerms].sort((a, b) => {
    const ai = order.has(a.term_key) ? order.get(a.term_key)! : 1000;
    const bi = order.has(b.term_key) ? order.get(b.term_key)! : 1000;
    if (ai !== bi) return ai - bi;
    return String(a.term_key).localeCompare(String(b.term_key));
  });

  // Parties + deal-room ref.
  const members: any[] = await sb(url, key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&role=in.(founder,investor)&select=role,user_id`);
  const founderId = members.find((m) => m.role === "founder")?.user_id;
  const investorId = members.find((m) => m.role === "investor")?.user_id;
  const nameOf = async (uid?: string) => {
    if (!uid) return "—";
    // public.users exposes id + full_name (no email column); fall back to a
    // generic label rather than leaking anything if full_name is unset.
    const u = (await sb(url, key, `users?id=eq.${uid}&select=full_name`, "GET").catch(() => null))?.[0];
    return u?.full_name || "—";
  };
  const room = (await sb(url, key, `deal_rooms?id=eq.${dealRoomId}&select=id,startup_id,startups(company_name)`))?.[0];
  const founderEntity = room?.startups?.company_name ?? null;

  const content: SummaryContent = {
    instrument_type: instrument,
    instrument_label: tmpl?.label ?? instrument,
    terms: ordered.map((t) => ({
      term_key: t.term_key, term_label: t.term_label, value_type: t.value_type,
      value: t.current_value ?? "", is_custom: !!t.is_custom,
    })),
    parties: {
      founder: { name: await nameOf(founderId), entity: founderEntity },
      investor: { name: await nameOf(investorId) },
    },
    deal_room_ref: dealRoomId,
    generated_at: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };

  // Archive prior active summary (never delete).
  await sb(url, key, `deal_room_summaries?deal_room_id=eq.${dealRoomId}&status=eq.active`, "PATCH",
    { status: "archived", archived_at: new Date().toISOString(), archived_reason: "superseded by new summary" });

  // Write the new active summary.
  await sb(url, key, `deal_room_summaries`, "POST", {
    deal_room_id: dealRoomId, status: "active", instrument_type: instrument,
    content, disclaimer: DISCLAIMER, terms_locked_at: cfg.locked_at,
  }, "return=minimal");

  // Success -> clear any prior error marker.
  await sb(url, key, `deal_room_term_config?deal_room_id=eq.${dealRoomId}`, "PATCH",
    { summary_error: null, summary_error_at: null }).catch(() => {});
  return { ok: true };
  } catch (e: any) {
    // Any unexpected failure (network, provider, parse) -> mark it so the UI
    // shows an honest error+retry, then surface it to the caller.
    console.error("[summary] generation threw:", e);
    await markError(String(e?.message ?? "generation_failed").slice(0, 300));
    return { ok: false, error: "generation_failed" };
  }
}

// Manual re-trigger endpoint (e.g. after a re-open + re-lock, or an admin repair).
// Authorization: caller must be a principal of the room (founder/investor). Reads
// the JWT, never trusts a passed id. Lawyers cannot trigger generation.
type RegenInput = { dealRoomId: string; accessToken: string };
export const regenerateSummary = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RegenInput)
  .handler(async ({ data }) => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "no_env" };
    // JWT -> uid
    const ur = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${data.accessToken}` } });
    if (!ur.ok) return { ok: false, error: "not_authenticated" };
    const uid = ((await ur.json()) as { id?: string }).id;
    if (!uid) return { ok: false, error: "not_authenticated" };
    // principal check
    const rows: any[] = await sb(url, key,
      `deal_room_members?deal_room_id=eq.${data.dealRoomId}&user_id=eq.${uid}&role=in.(founder,investor)&select=role`)
      .catch(() => []);
    if (!rows?.[0]) return { ok: false, error: "not_authorized" };
    return buildSummaryForRoom(data.dealRoomId, { url, key });
  });

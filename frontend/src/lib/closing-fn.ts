import { createServerFn } from "@tanstack/react-start";
import { calculateFee } from "@/lib/fee-schedule";

// R15C — Closing pipeline server fns (Gates 4-7). All service-role, so they
// enforce every rule themselves (RLS is bypassed by the service key):
//  - caller identity from JWT (verifyUser), must be a PRINCIPAL of the room
//    (founder/investor — NEVER a lawyer; roomRole returns null for a lawyer here);
//  - fee amount/payer/status, close confirmations, invoice generation are written
//    ONLY here — no client write path exists (RLS read-only on those columns);
//  - every mutating fn refuses if the room is already CLOSED (belt-and-suspenders
//    with the dr_is_open RLS gate and the close-guard trigger).

function getEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    url: cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "",
    key: cfEnv.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}
async function sb(url: string, key: string, path: string, method = "GET", body?: unknown, prefer?: string) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method, headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}`,
      Prefer: prefer ?? (method === "POST" ? "return=representation" : "return=minimal") },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}
async function rpc(url: string, key: string, fn: string, args: Record<string, unknown>) {
  const resp = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(args),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`rpc ${fn} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}
async function verifyUser(url: string, key: string, token: string): Promise<string | null> {
  if (!token) return null;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}
/** PRINCIPAL role of the caller (founder/investor) — a lawyer resolves to null. Fails CLOSED. */
async function principalRole(url: string, key: string, roomId: string, uid: string): Promise<"founder" | "investor" | null> {
  const rows: any[] = await sb(url, key,
    `deal_room_members?deal_room_id=eq.${roomId}&user_id=eq.${uid}&role=in.(founder,investor)&select=role`)
    .catch((e) => { console.error("[closing] principalRole failed (closed):", e); return []; });
  const r = rows?.[0]?.role;
  return r === "founder" || r === "investor" ? r : null;
}
const otherRole = (r: "founder" | "investor") => (r === "founder" ? "investor" : "founder");

/** Any room member (founder/investor/lawyer) — for agreement-download authz. */
async function anyRoomRole(url: string, key: string, roomId: string, uid: string): Promise<"founder" | "investor" | "lawyer" | null> {
  const rows: any[] = await sb(url, key,
    `deal_room_members?deal_room_id=eq.${roomId}&user_id=eq.${uid}&role=in.(founder,investor,lawyer)&select=role`)
    .catch(() => []);
  const r = rows?.[0]?.role;
  return r === "founder" || r === "investor" || r === "lawyer" ? r : null;
}

// ── downloadAgreement — the ONLY path to an agreements/ file (client storage RLS
// no longer grants it). Any room member may download an in-REVIEW version (R15B
// review). The FINALIZED (accepted) version is fee-gated: only served once the
// platform fee is confirmed (Gate 4). Returns a short-lived signed URL.
type DownloadInput = { dealRoomId: string; accessToken: string; agreementId: string };
export const downloadAgreement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as DownloadInput)
  .handler(async ({ data }) => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "no_env" };
    const uid = await verifyUser(url, key, data.accessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };
    const role = await anyRoomRole(url, key, data.dealRoomId, uid);
    if (!role) return { ok: false, error: "not_authorized" };

    const agr = (await sb(url, key,
      `deal_room_agreements?id=eq.${data.agreementId}&deal_room_id=eq.${data.dealRoomId}&select=status,storage_path`))?.[0];
    if (!agr) return { ok: false, error: "agreement_not_found" };

    // Finalized version -> fee gate. In-review versions -> members download freely.
    if (agr.status === "accepted") {
      const fee = (await sb(url, key, `deal_room_fees?deal_room_id=eq.${data.dealRoomId}&select=payment_status`))?.[0];
      const feeOk = fee && ["beta_bypass", "paid", "waived"].includes(fee.payment_status);
      if (!feeOk) return { ok: false, error: "fee_not_confirmed" };
    }

    // Service-role signed URL for the agreements/ path (client RLS excludes it).
    const signed = await fetch(`${url}/storage/v1/object/sign/documents/${agr.storage_path}`, {
      method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 120 }),
    });
    if (!signed.ok) return { ok: false, error: "sign_failed" };
    const j = await signed.json();
    return { ok: true, url: `${url}/storage/v1${j.signedURL}` };
  });

type Ctx = { url: string; key: string; uid: string; role: "founder" | "investor" };
async function authorizePrincipal(roomId: string, token: string): Promise<Ctx | null> {
  const { url, key } = getEnv();
  if (!url || !key) return null;
  const uid = await verifyUser(url, key, token);
  if (!uid) return null;
  const role = await principalRole(url, key, roomId, uid);
  if (!role) return null;
  return { url, key, uid, role };
}
async function roomIsClosed(ctx: Ctx, roomId: string): Promise<boolean> {
  const r = (await sb(ctx.url, ctx.key, `deal_rooms?id=eq.${roomId}&select=status`))?.[0];
  return r?.status === "closed";
}

// ── GATE 4a: setFee — founder confirms deal amount + who-pays; fee is computed ──
// server-side from the fee schedule (client-supplied fee is ignored). Only the
// founder sets this (founder decides who pays). Upserts one fee row per room.
type SetFeeInput = {
  dealRoomId: string; accessToken: string;
  dealAmount: number; instrumentType?: string; instrumentDetails?: any; feePayer: "founder" | "investor";
};
export const setFee = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SetFeeInput)
  .handler(async ({ data }) => {
    const ctx = await authorizePrincipal(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (ctx.role !== "founder") return { ok: false, error: "founder_only" }; // founder decides who pays
    if (await roomIsClosed(ctx, data.dealRoomId)) return { ok: false, error: "room_closed" };
    // Gate 4 requires a finalized agreement (R15B terminal state).
    const finalized = (await sb(ctx.url, ctx.key,
      `deal_room_agreements?deal_room_id=eq.${data.dealRoomId}&status=eq.accepted&select=id&limit=1`))?.[0];
    if (!finalized) return { ok: false, error: "no_finalized_agreement" };

    const amount = Number(data.dealAmount);
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "invalid_amount" };
    const fee = calculateFee(amount); // server-computed; client value never trusted

    // If already confirmed/paid, don't allow silent change of amount/payer.
    const existing = (await sb(ctx.url, ctx.key, `deal_room_fees?deal_room_id=eq.${data.dealRoomId}&select=payment_status`))?.[0];
    if (existing && (existing.payment_status === "beta_bypass" || existing.payment_status === "paid")) {
      return { ok: false, error: "fee_already_confirmed" };
    }
    await sb(ctx.url, ctx.key, `deal_room_fees?on_conflict=deal_room_id`, "POST", {
      deal_room_id: data.dealRoomId, deal_amount: amount,
      instrument_type: data.instrumentType ?? null, instrument_details: data.instrumentDetails ?? null,
      calculated_fee: fee, fee_payer: data.feePayer, payment_status: "pending",
    }, "return=minimal,resolution=merge-duplicates");
    return { ok: true, fee };
  });

// ── GATE 4b: confirmFeePayment — the DESIGNATED PAYER confirms (beta placeholder) ─
// TODO(stripe): this marks 'beta_bypass' with NO real charge. When Stripe is live,
// replace this body with a real PaymentIntent confirmation that sets 'paid'. The
// entire surrounding flow (who-pays, download gate, gates 5-7) stays unchanged.
type ConfirmFeeInput = { dealRoomId: string; accessToken: string };
export const confirmFeePayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ConfirmFeeInput)
  .handler(async ({ data }) => {
    const ctx = await authorizePrincipal(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (await roomIsClosed(ctx, data.dealRoomId)) return { ok: false, error: "room_closed" };
    const fee = (await sb(ctx.url, ctx.key, `deal_room_fees?deal_room_id=eq.${data.dealRoomId}&select=*`))?.[0];
    if (!fee) return { ok: false, error: "no_fee" };
    // Only the designated payer may confirm.
    if (ctx.role !== fee.fee_payer) return { ok: false, error: "not_the_payer" };
    if (fee.payment_status === "beta_bypass" || fee.payment_status === "paid") return { ok: true, already: true };
    await sb(ctx.url, ctx.key, `deal_room_fees?deal_room_id=eq.${data.dealRoomId}`, "PATCH",
      { payment_status: "beta_bypass", confirmed_by: ctx.uid }); // TODO(stripe): 'paid' via real charge
    return { ok: true };
  });

// ── GATE 5: recordSignedAgreement — a party records their signed-copy upload ────
type SignedInput = { dealRoomId: string; accessToken: string; storagePath: string; fileName: string };
export const recordSignedAgreement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SignedInput)
  .handler(async ({ data }) => {
    const ctx = await authorizePrincipal(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (await roomIsClosed(ctx, data.dealRoomId)) return { ok: false, error: "room_closed" };
    // Fee must be confirmed before signing (download gate).
    const fee = (await sb(ctx.url, ctx.key, `deal_room_fees?deal_room_id=eq.${data.dealRoomId}&select=payment_status`))?.[0];
    if (!fee || !["beta_bypass", "paid", "waived"].includes(fee.payment_status)) return { ok: false, error: "fee_not_confirmed" };

    const col = ctx.role === "founder"
      ? { founder_storage_path: data.storagePath, founder_file_name: data.fileName, founder_uploaded_at: new Date().toISOString() }
      : { investor_storage_path: data.storagePath, investor_file_name: data.fileName, investor_uploaded_at: new Date().toISOString() };
    await sb(ctx.url, ctx.key, `deal_room_signed_agreements?on_conflict=deal_room_id`, "POST",
      { deal_room_id: data.dealRoomId, ...col }, "return=minimal,resolution=merge-duplicates");
    return { ok: true };
  });

// ── GATE 6a: uploadPaymentProof — investor records a proof version ─────────────
type ProofInput = { dealRoomId: string; accessToken: string; storagePath: string; fileName: string };
export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ProofInput)
  .handler(async ({ data }) => {
    const ctx = await authorizePrincipal(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (ctx.role !== "investor") return { ok: false, error: "investor_only" }; // investor pays the deal
    if (await roomIsClosed(ctx, data.dealRoomId)) return { ok: false, error: "room_closed" };
    // both signed copies must exist first
    const signed = (await sb(ctx.url, ctx.key, `deal_room_signed_agreements?deal_room_id=eq.${data.dealRoomId}&select=*`))?.[0];
    if (!signed?.founder_storage_path || !signed?.investor_storage_path) return { ok: false, error: "not_both_signed" };

    const existing: any[] = await sb(ctx.url, ctx.key,
      `deal_room_payment_proof?deal_room_id=eq.${data.dealRoomId}&select=version&order=version.desc`);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;
    await sb(ctx.url, ctx.key, `deal_room_payment_proof`, "POST", {
      deal_room_id: data.dealRoomId, version: nextVersion, storage_path: data.storagePath,
      file_name: data.fileName, uploaded_by: ctx.uid, founder_status: "pending",
    }, "return=minimal");
    return { ok: true, version: nextVersion };
  });

// ── GATE 6b: reviewPaymentProof — founder confirms receipt OR flags discrepancy ─
type ReviewProofInput = { dealRoomId: string; accessToken: string; proofId: string; confirm: boolean; comment?: string };
export const reviewPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ReviewProofInput)
  .handler(async ({ data }) => {
    const ctx = await authorizePrincipal(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (ctx.role !== "founder") return { ok: false, error: "founder_only" };
    if (await roomIsClosed(ctx, data.dealRoomId)) return { ok: false, error: "room_closed" };
    const proof = (await sb(ctx.url, ctx.key, `deal_room_payment_proof?id=eq.${data.proofId}&deal_room_id=eq.${data.dealRoomId}&select=*`))?.[0];
    if (!proof) return { ok: false, error: "proof_not_found" };
    if (!data.confirm && !data.comment?.trim()) return { ok: false, error: "comment_required" };
    await sb(ctx.url, ctx.key, `deal_room_payment_proof?id=eq.${data.proofId}`, "PATCH",
      { founder_status: data.confirm ? "confirmed" : "discrepancy", discrepancy_comment: data.confirm ? null : data.comment!.trim() });
    return { ok: true };
  });

// ── GATE 7a: confirmDeliverable — each principal confirms their side of close ───
type ConfirmCloseInput = { dealRoomId: string; accessToken: string };
export const confirmDeliverable = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ConfirmCloseInput)
  .handler(async ({ data }) => {
    const ctx = await authorizePrincipal(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (await roomIsClosed(ctx, data.dealRoomId)) return { ok: false, error: "room_closed" };
    // Payment must be confirmed by the founder first (Gate 6 clear).
    const proof: any[] = await sb(ctx.url, ctx.key,
      `deal_room_payment_proof?deal_room_id=eq.${data.dealRoomId}&founder_status=eq.confirmed&select=id&limit=1`);
    if (!proof?.length) return { ok: false, error: "payment_not_confirmed" };

    const col = ctx.role === "investor"
      ? { investor_confirmed: true, investor_confirmed_at: new Date().toISOString() }
      : { founder_confirmed: true, founder_confirmed_at: new Date().toISOString() };
    await sb(ctx.url, ctx.key, `deal_room_close?on_conflict=deal_room_id`, "POST",
      { deal_room_id: data.dealRoomId, ...col }, "return=minimal,resolution=merge-duplicates");
    // Read back; if both now confirmed, finalize the close (invoices + status).
    const row = (await sb(ctx.url, ctx.key, `deal_room_close?deal_room_id=eq.${data.dealRoomId}&select=*`))?.[0];
    if (row?.investor_confirmed && row?.founder_confirmed && !row?.closed_at) {
      await finalizeClose(ctx, data.dealRoomId);
      return { ok: true, closed: true };
    }
    return { ok: true, closed: false };
  });

// Internal: both sides confirmed -> generate invoices, stamp closed_at, and close
// the room via the guarded RPC (sets the GUC so the close-guard trigger allows it).
async function finalizeClose(ctx: Ctx, roomId: string) {
  const fee = (await sb(ctx.url, ctx.key, `deal_room_fees?deal_room_id=eq.${roomId}&select=*`))?.[0];
  const summary = (await sb(ctx.url, ctx.key, `deal_room_summaries?deal_room_id=eq.${roomId}&status=eq.active&select=content`))?.[0];
  const parties = summary?.content?.parties ?? {};
  const now = new Date().toISOString();
  const dealRef = roomId.slice(0, 8).toUpperCase();
  const mkInvoice = (billTo: "founder" | "investor", n: number) => ({
    deal_room_id: roomId,
    invoice_number: `HS-${dealRef}-${billTo === "founder" ? "F" : "I"}${n}`,
    bill_to_role: billTo,
    content: {
      platform: "Hockystick",
      deal_room_ref: roomId, deal_ref_short: dealRef,
      parties, deal_amount: fee?.deal_amount ?? null, fee_amount: fee?.calculated_fee ?? null,
      fee_payer: fee?.fee_payer ?? null, currency: "USD",
      payment_status: fee?.payment_status ?? null,
      payment_confirmed_at: now, // beta: recorded at close (TODO(stripe): real charge ts)
      generated_at: now,
      note: "Platform success fee for a deal closed through Hockystick.",
    },
  });
  // one invoice per party
  await sb(ctx.url, ctx.key, `deal_room_invoices`, "POST", [mkInvoice("founder", 1), mkInvoice("investor", 1)], "return=minimal").catch((e) => {
    console.error("[closing] invoice generation failed (close still proceeds):", e);
  });
  // stamp close row
  await sb(ctx.url, ctx.key, `deal_room_close?deal_room_id=eq.${roomId}`, "PATCH", { closed_at: now });
  // close the room via the guarded RPC (sets app.deal_close_ctx so the trigger allows it)
  await rpc(ctx.url, ctx.key, "finalize_deal_close", { p_deal_room_id: roomId });
}

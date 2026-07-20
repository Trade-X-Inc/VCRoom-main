import { createServerFn } from "@tanstack/react-start";
import { buildSummaryForRoom } from "@/lib/summary-fn";

// R15B — Re-open + agreement review server fns (service-role).
//
// All state transitions (acceptance, status, unlock, archive) go through these
// so no client raw-REST write can forge them — same discipline as R15A step 7.
// Clients may INSERT an agreement version + a comment (guarded), and SELECT;
// they may NOT UPDATE/DELETE (append-only + fn-owned status).

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
async function verifyUser(url: string, key: string, token: string): Promise<string | null> {
  if (!token) return null;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}
/** Room role of the caller (founder/investor/lawyer) — fails CLOSED. */
async function roomRole(url: string, key: string, roomId: string, uid: string): Promise<"founder" | "investor" | "lawyer" | null> {
  const rows: any[] = await sb(url, key,
    `deal_room_members?deal_room_id=eq.${roomId}&user_id=eq.${uid}&role=in.(founder,investor,lawyer)&select=role`)
    .catch((e) => { console.error("[agreement] roomRole failed (closed):", e); return []; });
  const r = rows?.[0]?.role;
  return r === "founder" || r === "investor" || r === "lawyer" ? r : null;
}
const otherPrincipal = (r: "founder" | "investor") => (r === "founder" ? "investor" : "founder");

type Ctx = { url: string; key: string; uid: string; role: "founder" | "investor" | "lawyer" };
async function authorizeMember(roomId: string, token: string): Promise<Ctx | null> {
  const { url, key } = getEnv();
  if (!url || !key) return null;
  const uid = await verifyUser(url, key, token);
  if (!uid) return null;
  const role = await roomRole(url, key, roomId, uid);
  if (!role) return null;
  return { url, key, uid, role };
}

// Who is the designated uploader: lawyer if an accepted lawyer is a room member,
// else the investor. (Founder is always the reviewer, never the uploader.)
async function designatedUploader(ctx: Ctx, roomId: string): Promise<"lawyer" | "investor"> {
  const law: any[] = await sb(ctx.url, ctx.key,
    `deal_room_members?deal_room_id=eq.${roomId}&role=eq.lawyer&select=user_id&limit=1`);
  return (law?.length ?? 0) > 0 ? "lawyer" : "investor";
}

// ── uploadAgreement — record a new agreement version ─────────────────────────
// The physical file is already in the documents bucket (client-side storage
// upload). This records the version row. Only the designated uploader may
// upload; the founder (reviewer) cannot. Marks any prior pending/changes_requested
// version as 'superseded'.
type UploadInput = {
  dealRoomId: string; accessToken: string;
  storagePath: string; fileName: string; fileSize?: number;
};
export const uploadAgreement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as UploadInput)
  .handler(async ({ data }) => {
    const ctx = await authorizeMember(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };

    // A summary must exist (Gate 2 done) before an agreement can be uploaded.
    const summary = (await sb(ctx.url, ctx.key,
      `deal_room_summaries?deal_room_id=eq.${data.dealRoomId}&status=eq.active&select=id`))?.[0];
    if (!summary) return { ok: false, error: "no_active_summary" };

    // Enforce the uploader rule: only the designated uploader may upload.
    const uploader = await designatedUploader(ctx, data.dealRoomId);
    if (ctx.role !== uploader) return { ok: false, error: "not_uploader" };

    // Don't allow a new version once one is finalized (accepted by both).
    const finalized = (await sb(ctx.url, ctx.key,
      `deal_room_agreements?deal_room_id=eq.${data.dealRoomId}&status=eq.accepted&select=id&limit=1`))?.[0];
    if (finalized) return { ok: false, error: "already_finalized" };

    // Next version number; supersede prior open versions.
    const existing: any[] = await sb(ctx.url, ctx.key,
      `deal_room_agreements?deal_room_id=eq.${data.dealRoomId}&select=version,status&order=version.desc`);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;
    await sb(ctx.url, ctx.key,
      `deal_room_agreements?deal_room_id=eq.${data.dealRoomId}&status=in.(pending,changes_requested)`, "PATCH",
      { status: "superseded" });

    // Service-role insert (bypasses the client guard trigger, sets real values).
    await sb(ctx.url, ctx.key, `deal_room_agreements`, "POST", {
      deal_room_id: data.dealRoomId, version: nextVersion,
      storage_path: data.storagePath, file_name: data.fileName, file_size: data.fileSize ?? null,
      uploaded_by: ctx.uid, uploader_role: ctx.role, status: "pending",
    }, "return=minimal");
    return { ok: true, version: nextVersion };
  });

// ── requestAgreementChanges — reviewer asks for changes (comment required) ───
type ChangesInput = { dealRoomId: string; accessToken: string; agreementId: string; comment: string };
export const requestAgreementChanges = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ChangesInput)
  .handler(async ({ data }) => {
    const ctx = await authorizeMember(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (!data.comment?.trim()) return { ok: false, error: "comment_required" };

    const agr = (await sb(ctx.url, ctx.key,
      `deal_room_agreements?id=eq.${data.agreementId}&deal_room_id=eq.${data.dealRoomId}&select=*`))?.[0];
    if (!agr) return { ok: false, error: "agreement_not_found" };
    if (agr.status === "accepted") return { ok: false, error: "already_finalized" };
    // The uploader can't request changes on their own upload.
    if (agr.uploaded_by === ctx.uid) return { ok: false, error: "uploader_cannot_review" };

    await sb(ctx.url, ctx.key, `deal_room_agreement_comments`, "POST", {
      agreement_id: data.agreementId, deal_room_id: data.dealRoomId,
      author_user_id: ctx.uid, author_role: ctx.role, comment: data.comment.trim(),
    }, "return=minimal");
    await sb(ctx.url, ctx.key, `deal_room_agreements?id=eq.${data.agreementId}`, "PATCH",
      { status: "changes_requested", accepted_by_founder: false, accepted_by_investor: false });
    return { ok: true };
  });

// ── acceptAgreement — a principal accepts THIS version ───────────────────────
// Sets only the caller's own flag. Finalizes (status 'accepted') only when BOTH
// the founder AND the investor have accepted the same version. The lawyer does
// NOT accept — acceptance is a party decision (founder + investor). A lawyer who
// is the uploader has confirmed by uploading; the two parties decide.
type AcceptInput = { dealRoomId: string; accessToken: string; agreementId: string };
export const acceptAgreement = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AcceptInput)
  .handler(async ({ data }) => {
    const ctx = await authorizeMember(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    if (ctx.role === "lawyer") return { ok: false, error: "lawyer_cannot_accept" };

    const agr = (await sb(ctx.url, ctx.key,
      `deal_room_agreements?id=eq.${data.agreementId}&deal_room_id=eq.${data.dealRoomId}&select=*`))?.[0];
    if (!agr) return { ok: false, error: "agreement_not_found" };
    if (agr.status === "superseded") return { ok: false, error: "version_superseded" };
    if (agr.status === "accepted") return { ok: true, alreadyFinalized: true };

    const mine = ctx.role === "founder" ? "accepted_by_founder" : "accepted_by_investor";
    const bothAfter =
      (ctx.role === "founder" ? true : agr.accepted_by_founder) &&
      (ctx.role === "investor" ? true : agr.accepted_by_investor);

    const patch: Record<string, unknown> = { [mine]: true };
    if (bothAfter) patch.status = "accepted";
    await sb(ctx.url, ctx.key, `deal_room_agreements?id=eq.${data.agreementId}`, "PATCH", patch);
    return { ok: true, finalized: bothAfter };
  });

// ── requestReopen — party or lawyer requests re-opening the locked terms ─────
type ReopenReqInput = { dealRoomId: string; accessToken: string; reason?: string };
export const requestReopen = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ReopenReqInput)
  .handler(async ({ data }) => {
    const ctx = await authorizeMember(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    // Terms must currently be locked to re-open.
    const cfg = (await sb(ctx.url, ctx.key,
      `deal_room_term_config?deal_room_id=eq.${data.dealRoomId}&select=locked_at`))?.[0];
    if (!cfg?.locked_at) return { ok: false, error: "not_locked" };

    await sb(ctx.url, ctx.key,
      `deal_room_term_reopen_requests?deal_room_id=eq.${data.dealRoomId}&status=eq.pending`, "PATCH",
      { status: "rejected", resolved_at: new Date().toISOString() });
    await sb(ctx.url, ctx.key, `deal_room_term_reopen_requests`, "POST", {
      deal_room_id: data.dealRoomId, requested_by: ctx.uid, requested_role: ctx.role,
      reason: data.reason ?? null, status: "pending",
    }, "return=minimal");
    return { ok: true };
  });

// ── resolveReopen — a PRINCIPAL counterparty approves/rejects ────────────────
// Approval unlocks terms (clears locked_at), archives the active summary with a
// reason, and cancels any in-progress agreement review (open versions ->
// superseded). Enforces resolver is a principal AND != requester (mutual).
type ResolveReopenInput = { dealRoomId: string; accessToken: string; requestId: string; approve: boolean };
export const resolveReopen = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ResolveReopenInput)
  .handler(async ({ data }) => {
    const ctx = await authorizeMember(data.dealRoomId, data.accessToken);
    if (!ctx) return { ok: false, error: "not_authorized" };
    // Only a principal (founder/investor) may resolve — not a lawyer.
    if (ctx.role === "lawyer") return { ok: false, error: "lawyer_cannot_resolve" };

    const req = (await sb(ctx.url, ctx.key,
      `deal_room_term_reopen_requests?id=eq.${data.requestId}&deal_room_id=eq.${data.dealRoomId}&status=eq.pending&select=*`))?.[0];
    if (!req) return { ok: false, error: "request_not_found" };
    // Mutual: resolver must not be the requester.
    if (req.requested_by === ctx.uid) return { ok: false, error: "self_approval" };

    if (!data.approve) {
      await sb(ctx.url, ctx.key, `deal_room_term_reopen_requests?id=eq.${data.requestId}`, "PATCH",
        { status: "rejected", resolved_by: ctx.uid, resolved_role: ctx.role, resolved_at: new Date().toISOString() });
      return { ok: true, approved: false };
    }

    // Approved -> perform the re-open.
    // 1) unlock terms
    await sb(ctx.url, ctx.key, `deal_room_term_config?deal_room_id=eq.${data.dealRoomId}`, "PATCH",
      { locked_at: null, locked_by: null });
    // reset each locked term back to negotiable ('accepted' one-side state cleared)
    await sb(ctx.url, ctx.key, `deal_room_terms?deal_room_id=eq.${data.dealRoomId}&status=eq.locked`, "PATCH",
      { status: "accepted", accepted_by_founder: false, accepted_by_investor: false, awaiting_role: null });
    // 2) archive the active summary
    await sb(ctx.url, ctx.key, `deal_room_summaries?deal_room_id=eq.${data.dealRoomId}&status=eq.active`, "PATCH",
      { status: "archived", archived_at: new Date().toISOString(), archived_reason: "terms re-opened for renegotiation" });
    // 3) cancel in-progress agreement review (open versions -> superseded; accepted stays as history)
    await sb(ctx.url, ctx.key,
      `deal_room_agreements?deal_room_id=eq.${data.dealRoomId}&status=in.(pending,changes_requested)`, "PATCH",
      { status: "superseded" });
    // 4) consume the request
    await sb(ctx.url, ctx.key, `deal_room_term_reopen_requests?id=eq.${data.requestId}`, "PATCH",
      { status: "consumed", resolved_by: ctx.uid, resolved_role: ctx.role, resolved_at: new Date().toISOString() });
    return { ok: true, approved: true };
  });

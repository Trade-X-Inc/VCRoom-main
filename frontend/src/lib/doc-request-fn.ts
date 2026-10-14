import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/require-user-fn";

function getAdminClient(url?: string, key?: string) {
  const cfEnv = (globalThis as any).__cf_env || {};
  const resolvedUrl = url || cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const resolvedKey = key || cfEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!resolvedUrl || !resolvedKey)
    throw new Error(`Missing Supabase config URL:${!!resolvedUrl} KEY:${!!resolvedKey}`);
  return createClient(resolvedUrl, resolvedKey, { auth: { persistSession: false } });
}

// Added 11 Oct 2026, same follow-up hardening pass as deal-room-fn.ts /
// deal-room-workflow-fn.ts. UNLIKE those two files, this one builds every
// query through the Supabase JS client's `.eq()` chain (confirmed by grep:
// zero raw-string path interpolation anywhere in this file) — so it is NOT
// vulnerable to the PostgREST query-string injection class that motivated
// those files' checks; the JS client parameterizes filter values regardless
// of content. This validation is purely defensive: a malformed id reaching
// `.eq()` here just produces a confusing zero-row "not_found"/"Unauthorized"
// result today. A format check up front gives a clearer invalid_id error
// instead of a misleading one, and keeps this file's id handling consistent
// with the other two in this same pass.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// ─── getDocRequests ───────────────────────────────────────────────────────────
export const getDocRequests = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    if (!isValidUuid(data.dealRoomId)) {
      return { requests: [], error: "invalid_id" };
    }

    // Identity from the token — the userAccessToken field previously existed
    // but was never checked; the membership check ran against a raw userId
    // param instead, letting any room member impersonate any other member.
    // See CLAUDE.md §51.
    const auth = await requireUser(data.userAccessToken);
    if (!auth.ok) return { requests: [], error: auth.error };

    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", auth.uid)
      .maybeSingle();
    if (!member) return { requests: [], error: "Unauthorized" };

    const { data: requests, error } = await sb
      .from("document_requests")
      .select("id, title, description, status, created_at, updated_at, requested_by, for_user_id, document_id")
      .eq("deal_room_id", data.dealRoomId)
      .order("created_at", { ascending: false });
    if (error) return { requests: [], error: error.message };
    return { requests: requests ?? [] };
  });

// ─── createDocRequest ─────────────────────────────────────────────────────────
export const createDocRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string; forUserId: string;
      title: string; description?: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    if (!isValidUuid(data.dealRoomId) || !isValidUuid(data.forUserId)) {
      return { success: false, error: "invalid_id" };
    }

    // Identity from the token — never trust a client-supplied requestedBy.
    // See CLAUDE.md §51.
    const auth = await requireUser(data.userAccessToken);
    if (!auth.ok) return { success: false, error: auth.error };

    // Verify requester is a member
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", auth.uid)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { data: req, error } = await sb
      .from("document_requests")
      .insert({
        deal_room_id: data.dealRoomId,
        requested_by: auth.uid,
        for_user_id: data.forUserId,
        title: data.title,
        description: data.description ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !req) return { success: false, error: error?.message ?? "Insert failed" };

    // Notify founder
    try {
      const { error: n1 } = await sb.from("notifications").insert({
        user_id: data.forUserId,
        kind: "document_request",
        title: "Document requested",
        body: `An investor requested a document.`,
        action_url: `/app/deal-rooms/${data.dealRoomId}`,
        meta: { deal_room_id: data.dealRoomId, request_id: req.id },
      });
      if (n1) console.error("[doc-request] founder notification failed:", n1.message);
    } catch { /* non-blocking */ }

    return { success: true, requestId: req.id };
  });

// ─── fulfillDocRequest ────────────────────────────────────────────────────────
export const fulfillDocRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      requestId: string; documentId?: string; requestedBy: string;
      title: string; dealRoomId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    if (
      !isValidUuid(data.dealRoomId) ||
      !isValidUuid(data.requestId) ||
      (data.documentId !== undefined &&
        data.documentId !== null &&
        !isValidUuid(data.documentId))
    ) {
      return { success: false, error: "invalid_id" };
    }

    // Identity from the token — never trust a client-supplied userId.
    // See CLAUDE.md §51.
    const auth = await requireUser(data.userAccessToken);
    if (!auth.ok) return { success: false, error: auth.error };

    // Verify fulfiller is a member
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", auth.uid)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    // Fix, 11 Oct 2026 — three gaps, all in this one function: (1) the
    // UPDATE below was `id=eq.requestId` only, with no deal_room_id
    // filter, despite only dealRoomId being validated above; a member
    // of any room could fulfill/mutate any document_requests.id
    // system-wide. (2) data.documentId was written straight into
    // document_id with no check it belongs to this room. (3)
    // data.requestedBy was trusted outright as the notification
    // recipient — a caller could redirect the "document uploaded"
    // notification to an arbitrary user_id. Fetch the real request row
    // scoped to THIS room first; derive requestedBy from it, never the
    // client value; and if a documentId is supplied, confirm that
    // document's own deal_room_id matches before accepting it.
    const { data: request } = await sb
      .from("document_requests")
      .select("id, requested_by")
      .eq("id", data.requestId)
      .eq("deal_room_id", data.dealRoomId)
      .maybeSingle();
    if (!request) return { success: false, error: "not_found" };

    let verifiedDocumentId: string | null = null;
    if (data.documentId) {
      const { data: doc } = await sb
        .from("documents")
        .select("id")
        .eq("id", data.documentId)
        .eq("deal_room_id", data.dealRoomId)
        .maybeSingle();
      if (!doc) return { success: false, error: "document_not_in_room" };
      verifiedDocumentId = doc.id;
    }

    const { data: updated, error } = await sb
      .from("document_requests")
      .update({
        status: verifiedDocumentId ? "fulfilled" : "uploaded",
        document_id: verifiedDocumentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId)
      .eq("deal_room_id", data.dealRoomId)
      .select("id");

    if (error) return { success: false, error: error.message };
    if (!updated || updated.length !== 1) return { success: false, error: "not_found" };

    // Notify investor — requestedBy derived from the request row itself,
    // never the client-supplied field.
    try {
      const { error: n2 } = await sb.from("notifications").insert({
        user_id: request.requested_by,
        kind: "document_request",
        title: "Document uploaded",
        body: `The founder uploaded a document.`,
        action_url: `/app/deal-rooms/${data.dealRoomId}`,
        meta: { deal_room_id: data.dealRoomId, request_id: data.requestId },
      });
      if (n2) console.error("[doc-request] investor notification failed:", n2.message);
    } catch { /* non-blocking */ }

    return { success: true };
  });

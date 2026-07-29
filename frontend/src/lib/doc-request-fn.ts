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

    const { error } = await sb
      .from("document_requests")
      .update({
        status: data.documentId ? "fulfilled" : "uploaded",
        document_id: data.documentId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.requestId);

    if (error) return { success: false, error: error.message };

    // Notify investor
    try {
      const { error: n2 } = await sb.from("notifications").insert({
        user_id: data.requestedBy,
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

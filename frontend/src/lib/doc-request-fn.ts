import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

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
      dealRoomId: string; userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Verify membership
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
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
      dealRoomId: string; requestedBy: string; forUserId: string;
      title: string; description?: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Verify requester is a member
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.requestedBy)
      .maybeSingle();
    if (!member) return { success: false, error: "Unauthorized" };

    const { data: req, error } = await sb
      .from("document_requests")
      .insert({
        deal_room_id: data.dealRoomId,
        requested_by: data.requestedBy,
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
      await sb.from("notifications").insert({
        user_id: data.forUserId,
        kind: "document_request",
        title: "Document requested",
        body: `An investor requested: "${data.title}"`,
        meta: { deal_room_id: data.dealRoomId, request_id: req.id },
      });
    } catch { /* non-blocking */ }

    return { success: true, requestId: req.id };
  });

// ─── fulfillDocRequest ────────────────────────────────────────────────────────
export const fulfillDocRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      requestId: string; documentId?: string; requestedBy: string;
      title: string; dealRoomId: string; userId: string; userAccessToken: string;
      supabaseUrl?: string; supabaseKey?: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getAdminClient(data.supabaseUrl, data.supabaseKey);

    // Verify fulfiller is a member
    const { data: member } = await sb
      .from("deal_room_members")
      .select("user_id")
      .eq("deal_room_id", data.dealRoomId)
      .eq("user_id", data.userId)
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
      await sb.from("notifications").insert({
        user_id: data.requestedBy,
        kind: "document_request",
        title: "Document uploaded",
        body: `The founder uploaded: "${data.title}"`,
        meta: { deal_room_id: data.dealRoomId, request_id: data.requestId },
      });
    } catch { /* non-blocking */ }

    return { success: true };
  });

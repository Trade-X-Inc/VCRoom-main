import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getSupabase(token: string) {
  const url =
    process.env.VITE_SUPABASE_URL ||
    (globalThis as any).VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    (globalThis as any).SUPABASE_URL ||
    "";
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    (globalThis as any).VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    (globalThis as any).SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ─── getDocRequests: fetch all requests for a deal room ──────────────────────
export const getDocRequests = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): { dealRoomId: string; userAccessToken: string } =>
      data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);
    const { data: requests, error } = await sb
      .from("document_requests")
      .select(
        "id, title, description, status, created_at, updated_at, requested_by, for_user_id, document_id",
      )
      .eq("deal_room_id", data.dealRoomId)
      .order("created_at", { ascending: false });
    if (error) return { requests: [], error: error.message };
    return { requests: requests ?? [] };
  });

// ─── createDocRequest: investor requests a document from founder ─────────────
export const createDocRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      dealRoomId: string;
      requestedBy: string;   // investor user id
      forUserId: string;     // founder user id
      title: string;
      description?: string;
      userAccessToken: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);

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
    } catch {
      // non-blocking
    }

    return { success: true, requestId: req.id };
  });

// ─── fulfillDocRequest: founder marks request as uploaded/fulfilled ───────────
export const fulfillDocRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown): {
      requestId: string;
      documentId?: string;
      requestedBy: string;  // investor user id — to notify them
      title: string;
      dealRoomId: string;
      userAccessToken: string;
    } => data as any,
  )
  .handler(async ({ data }) => {
    const sb = getSupabase(data.userAccessToken);

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
    } catch {
      // non-blocking
    }

    return { success: true };
  });

// Deal-room documents + document_requests — gateway actions (Step A client
// migration). Membership-authorized, via the pack_api doc_* data functions
// (migration 20260805010000) which call the authz_* primitives (9398d03).
// founder_documents (founder vault) is a SEPARATE feature, NOT here — deferred
// to the profile/founder group. See AUTHZ_MAPPING.md.
//
// Authorization is enforced in the pack_api functions, matching current RLS
// EXACTLY (traced, not assumed):
//   documents  read  = member OR uploader   (documents_room_read ∪ documents_own)
//   documents  write = UPLOADER only         (documents_own — a member who is not
//                      the uploader is forbidden; do not "upgrade" to membership)
//   document_requests = member               (doc_requests_access)
//   document_views insert = any authed caller

import { defineAction, type JsonValue } from "./gateway";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
const optUuid = (v: unknown): string | null => (v == null ? null : isUuid(v) ? v : "invalid");
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

type Obj = { [k: string]: JsonValue };

// ── documents.list (read: member OR uploader) ───────────────────────────────
export const docList = defineAction<{ dealRoomId: string }, Obj>({
  name: "documents.list",
  class: "read",
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    return { dealRoomId: r.dealRoomId };
  },
  authorize: async () => true, // membership enforced in pack_api.doc_list
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_list", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId,
    });
    if (error) throw new Error(`doc_list: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_list_failed");
    return res;
  },
  record: (input) => ({ objectType: "deal_room", objectId: input.dealRoomId, data: { list: "documents" } }),
});

// ── documents.insert (write: member + room open; uploader forced = caller) ──
export const docInsert = defineAction<
  { dealRoomId: string; storagePath: string; fileName: string; category: string | null; uploadedByRole: string | null },
  Obj
>({
  name: "documents.insert",
  class: "prepare",
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (!asStr(r?.storagePath)) throw new Error("storagePath required");
    if (!asStr(r?.fileName)) throw new Error("fileName required");
    return {
      dealRoomId: r.dealRoomId as string,
      storagePath: r.storagePath as string,
      fileName: r.fileName as string,
      category: r.category == null ? null : asStr(r.category),
      uploadedByRole: r.uploadedByRole == null ? null : asStr(r.uploadedByRole),
    };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_insert", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId, p_storage_path: input.storagePath,
      p_file_name: input.fileName, p_category: input.category, p_uploaded_by_role: input.uploadedByRole,
    });
    if (error) throw new Error(`doc_insert: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_insert_failed");
    return res;
  },
  record: (input, output) => ({ objectType: "document", objectId: (output.id as string) ?? null, data: { dealRoomId: input.dealRoomId } }),
});

// ── documents.update (write: UPLOADER only) ─────────────────────────────────
// patch is a constrained set: visibility, ai_summary, summary_edited, deal_room_id.
export const docUpdate = defineAction<{ documentId: string; patch: Obj }, Obj>({
  name: "documents.update",
  class: "prepare",
  validate: (raw) => {
    const r = raw as { documentId?: unknown; patch?: unknown };
    if (!isUuid(r?.documentId)) throw new Error("documentId must be a uuid");
    const p = (r.patch ?? {}) as Record<string, unknown>;
    const patch: Obj = {};
    if ("visibility" in p) patch.visibility = asStr(p.visibility);
    if ("ai_summary" in p) patch.ai_summary = asStr(p.ai_summary);
    if ("summary_edited" in p) patch.summary_edited = p.summary_edited === true;
    if ("deal_room_id" in p) {
      const d = optUuid(p.deal_room_id);
      patch.deal_room_id = d === "invalid" ? null : d; // null = detach
    }
    return { documentId: r.documentId, patch };
  },
  authorize: async () => true, // uploader-only enforced in pack_api.doc_update
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_update", {
      p_uid: ctx.uid, p_document_id: input.documentId, p_patch: input.patch,
    });
    if (error) throw new Error(`doc_update: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_update_failed");
    return res;
  },
  record: (input) => ({ objectType: "document", objectId: input.documentId, data: { updated: true } }),
});

// ── document_views.insert (any authed caller) ───────────────────────────────
export const docViewInsert = defineAction<
  { dealRoomId: string | null; documentId: string | null; founderDocumentId: string | null; durationSeconds: number },
  Obj
>({
  name: "documents.viewInsert",
  class: "read", // a view record; not a consequential act
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    const dr = optUuid(r?.dealRoomId), doc = optUuid(r?.documentId), fd = optUuid(r?.founderDocumentId);
    if (dr === "invalid" || doc === "invalid" || fd === "invalid") throw new Error("invalid uuid");
    return {
      dealRoomId: dr, documentId: doc, founderDocumentId: fd,
      durationSeconds: typeof r?.durationSeconds === "number" ? r.durationSeconds : 0,
    };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_view_insert", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId, p_document_id: input.documentId,
      p_founder_document_id: input.founderDocumentId, p_duration_seconds: input.durationSeconds,
    });
    if (error) throw new Error(`doc_view_insert: ${error.message}`);
    return (data as Obj) ?? { ok: true };
  },
  record: (input) => ({ objectType: "document", objectId: input.documentId, data: { viewed: true } }),
});

// ── document_requests: list / insert / setStatus / delete (member) ──────────
export const docRequestList = defineAction<{ dealRoomId: string }, Obj>({
  name: "documentRequests.list",
  class: "read",
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    return { dealRoomId: r.dealRoomId };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_request_list", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId,
    });
    if (error) throw new Error(`doc_request_list: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_list_failed");
    return res;
  },
  record: (input) => ({ objectType: "deal_room", objectId: input.dealRoomId, data: { list: "document_requests" } }),
});

export const docRequestInsert = defineAction<
  { dealRoomId: string; title: string; description: string | null },
  Obj
>({
  name: "documentRequests.insert",
  class: "prepare",
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (!asStr(r?.title)) throw new Error("title required");
    return { dealRoomId: r.dealRoomId as string, title: r.title as string, description: r.description == null ? null : asStr(r.description) };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_request_insert", {
      p_uid: ctx.uid, p_deal_room_id: input.dealRoomId, p_title: input.title, p_description: input.description,
    });
    if (error) throw new Error(`doc_request_insert: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_insert_failed");
    return res;
  },
  record: (input, output) => ({ objectType: "document_request", objectId: (output.id as string) ?? null, data: { dealRoomId: input.dealRoomId } }),
});

export const docRequestSetStatus = defineAction<{ requestId: string; status: "pending" | "fulfilled" }, Obj>({
  name: "documentRequests.setStatus",
  class: "commit", // fulfilling/closing a request is a consequential state change
  validate: (raw) => {
    const r = raw as { requestId?: unknown; status?: unknown };
    if (!isUuid(r?.requestId)) throw new Error("requestId must be a uuid");
    if (r?.status !== "pending" && r?.status !== "fulfilled") throw new Error("bad status");
    return { requestId: r.requestId, status: r.status };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_request_set_status", {
      p_uid: ctx.uid, p_request_id: input.requestId, p_status: input.status,
    });
    if (error) throw new Error(`doc_request_set_status: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_set_status_failed");
    return res;
  },
  record: (input) => ({ objectType: "document_request", objectId: input.requestId, data: { status: input.status } }),
});

export const docRequestDelete = defineAction<{ requestId: string }, Obj>({
  name: "documentRequests.delete",
  class: "commit",
  validate: (raw) => {
    const r = raw as { requestId?: unknown };
    if (!isUuid(r?.requestId)) throw new Error("requestId must be a uuid");
    return { requestId: r.requestId };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_request_delete", {
      p_uid: ctx.uid, p_request_id: input.requestId,
    });
    if (error) throw new Error(`doc_request_delete: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_delete_failed");
    return res;
  },
  record: (input) => ({ objectType: "document_request", objectId: input.requestId, data: { deleted: true } }),
});

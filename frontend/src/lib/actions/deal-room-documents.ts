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

import { createServerFn } from "@tanstack/react-start";
import {
  runAction,
  type ActionDef,
  type ActionEnvelope,
  type ActionResult,
  type JsonValue,
} from "./gateway";

// Every action binds its own TOP-LEVEL createServerFn — required by
// TanStack Start's server-fn transform. See gateway.ts / CLAUDE.md §20.11.
const envelope = (raw: unknown): ActionEnvelope<unknown> =>
  raw as ActionEnvelope<unknown>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);
const optUuid = (v: unknown): string | null =>
  v == null ? null : isUuid(v) ? v : "invalid";
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

type Obj = { [k: string]: JsonValue };

// ── documents reads — three named shapes, each independently authorized ──────
// doc_list_room     member of room; all docs; uploader{full_name}
// doc_list_library  UPLOADER-scoped; own docs NOT in this room; no join
// doc_list_investor member of room; uploaded_by_role='investor'; uploader{full_name,avatar_url}
// (Each maps to the same-named pack_api function; see AUTHZ_MAPPING.md.)
// Builds the def OBJECT only — never a server function (see the header note).
function listActionDef(
  name: string,
  fn: string,
): ActionDef<{ dealRoomId: string }, Obj> {
  return {
    name,
    class: "read",
    validate: (raw) => {
      const r = raw as { dealRoomId?: unknown };
      if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
      return { dealRoomId: r.dealRoomId };
    },
    authorize: async () => true, // authorization enforced in the pack_api function
    handle: async (ctx, input): Promise<Obj> => {
      const { data, error } = await ctx.sb.schema("pack_api").rpc(fn, {
        p_uid: ctx.uid,
        p_deal_room_id: input.dealRoomId,
      });
      if (error) throw new Error(`${fn}: ${error.message}`);
      const res = data as { ok: boolean; error?: string } & Obj;
      if (!res.ok) throw new Error(res.error ?? `${fn}_failed`);
      return res;
    },
    record: (input) => ({
      objectType: "deal_room",
      objectId: input.dealRoomId,
      data: { list: name },
    }),
  };
}

const docListRoomDef = listActionDef("documents.listRoom", "doc_list_room");
export const docListRoom = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docListRoomDef, data),
  );

const docListLibraryDef = listActionDef(
  "documents.listLibrary",
  "doc_list_library",
);
export const docListLibrary = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docListLibraryDef, data),
  );

const docListInvestorDef = listActionDef(
  "documents.listInvestor",
  "doc_list_investor",
);
export const docListInvestor = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docListInvestorDef, data),
  );

// ── documents.insert (write: member + room open; uploader forced = caller) ──
const docInsertDef: ActionDef<
  {
    dealRoomId: string;
    storagePath: string;
    fileName: string;
    category: string | null;
    uploadedByRole: string | null;
    fileSize: number | null;
  },
  Obj
> = {
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
      fileSize: typeof r.fileSize === "number" ? r.fileSize : null,
    };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("doc_insert", {
      p_uid: ctx.uid,
      p_deal_room_id: input.dealRoomId,
      p_storage_path: input.storagePath,
      p_file_name: input.fileName,
      p_category: input.category,
      p_uploaded_by_role: input.uploadedByRole,
      p_file_size: input.fileSize,
    });
    if (error) throw new Error(`doc_insert: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_insert_failed");
    return res;
  },
  record: (input, output) => ({
    objectType: "document",
    objectId: (output.id as string) ?? null,
    data: { dealRoomId: input.dealRoomId },
  }),
};
export const docInsert = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docInsertDef, data),
  );

// ── documents.update (write: UPLOADER only) ─────────────────────────────────
// patch is a constrained set: visibility, ai_summary, summary_edited, deal_room_id.
const docUpdateDef: ActionDef<{ documentId: string; patch: Obj }, Obj> = {
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
      p_uid: ctx.uid,
      p_document_id: input.documentId,
      p_patch: input.patch,
    });
    if (error) throw new Error(`doc_update: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_update_failed");
    return res;
  },
  record: (input) => ({
    objectType: "document",
    objectId: input.documentId,
    data: { updated: true },
  }),
};
export const docUpdate = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docUpdateDef, data),
  );

// ── document_views.insert (any authed caller) ───────────────────────────────
const docViewInsertDef: ActionDef<
  {
    dealRoomId: string | null;
    documentId: string | null;
    founderDocumentId: string | null;
    durationSeconds: number;
    startupId: string | null;
    viewerRole: string | null;
    viewerName: string | null;
  },
  Obj
> = {
  name: "documents.viewInsert",
  class: "read", // a view record; not a consequential act
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    const dr = optUuid(r?.dealRoomId),
      doc = optUuid(r?.documentId),
      fd = optUuid(r?.founderDocumentId),
      su = optUuid(r?.startupId);
    if (
      dr === "invalid" ||
      doc === "invalid" ||
      fd === "invalid" ||
      su === "invalid"
    )
      throw new Error("invalid uuid");
    return {
      dealRoomId: dr,
      documentId: doc,
      founderDocumentId: fd,
      durationSeconds:
        typeof r?.durationSeconds === "number" ? r.durationSeconds : 0,
      startupId: su,
      viewerRole: r?.viewerRole == null ? null : asStr(r.viewerRole),
      viewerName: r?.viewerName == null ? null : asStr(r.viewerName),
    };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("doc_view_insert", {
        p_uid: ctx.uid,
        p_deal_room_id: input.dealRoomId,
        p_document_id: input.documentId,
        p_founder_document_id: input.founderDocumentId,
        p_duration_seconds: input.durationSeconds,
        p_startup_id: input.startupId,
        p_viewer_role: input.viewerRole,
        p_viewer_name: input.viewerName,
      });
    if (error) throw new Error(`doc_view_insert: ${error.message}`);
    return (data as Obj) ?? { ok: true };
  },
  record: (input) => ({
    objectType: "document",
    objectId: input.documentId,
    data: { viewed: true },
  }),
};
export const docViewInsert = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docViewInsertDef, data),
  );

// ── document_requests: list / insert / setStatus / delete (member) ──────────
const docRequestListDef: ActionDef<{ dealRoomId: string }, Obj> = {
  name: "documentRequests.list",
  class: "read",
  validate: (raw) => {
    const r = raw as { dealRoomId?: unknown };
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    return { dealRoomId: r.dealRoomId };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("doc_request_list", {
        p_uid: ctx.uid,
        p_deal_room_id: input.dealRoomId,
      });
    if (error) throw new Error(`doc_request_list: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_list_failed");
    return res;
  },
  record: (input) => ({
    objectType: "deal_room",
    objectId: input.dealRoomId,
    data: { list: "document_requests" },
  }),
};
export const docRequestList = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docRequestListDef, data),
  );

const docRequestInsertDef: ActionDef<
  {
    dealRoomId: string;
    title: string;
    description: string | null;
    priority: string | null;
    forUserId: string | null;
  },
  Obj
> = {
  name: "documentRequests.insert",
  class: "prepare",
  validate: (raw) => {
    const r = raw as Record<string, unknown>;
    if (!isUuid(r?.dealRoomId)) throw new Error("dealRoomId must be a uuid");
    if (!asStr(r?.title)) throw new Error("title required");
    const fu = optUuid(r?.forUserId);
    if (fu === "invalid") throw new Error("forUserId must be a uuid");
    return {
      dealRoomId: r.dealRoomId as string,
      title: r.title as string,
      description: r.description == null ? null : asStr(r.description),
      priority: r.priority == null ? null : asStr(r.priority),
      forUserId: fu,
    };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("doc_request_insert", {
        p_uid: ctx.uid,
        p_deal_room_id: input.dealRoomId,
        p_title: input.title,
        p_description: input.description,
        p_priority: input.priority,
        p_for_user_id: input.forUserId,
      });
    if (error) throw new Error(`doc_request_insert: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_insert_failed");
    return res;
  },
  record: (input, output) => ({
    objectType: "document_request",
    objectId: (output.id as string) ?? null,
    data: { dealRoomId: input.dealRoomId },
  }),
};
export const docRequestInsert = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docRequestInsertDef, data),
  );

// ── document_requests.respondLink — founder shares a link (member) ───────────
// Sets response_link + status→fulfilled. Membership-authorized (same as list).
// class: prepare — providing a link is content authoring, not a state-commit like
// closing a request (that is setStatus). Human still initiates it in the UI.
const docRequestRespondLinkDef: ActionDef<
  { requestId: string; link: string },
  Obj
> = {
  name: "documentRequests.respondLink",
  class: "prepare",
  validate: (raw) => {
    const r = raw as { requestId?: unknown; link?: unknown };
    if (!isUuid(r?.requestId)) throw new Error("requestId must be a uuid");
    if (!asStr(r?.link).trim()) throw new Error("link required");
    return { requestId: r.requestId, link: (r.link as string).trim() };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("doc_request_respond_link", {
        p_uid: ctx.uid,
        p_request_id: input.requestId,
        p_link: input.link,
      });
    if (error) throw new Error(`doc_request_respond_link: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok)
      throw new Error(res.error ?? "doc_request_respond_link_failed");
    return res;
  },
  record: (input) => ({
    objectType: "document_request",
    objectId: input.requestId,
    data: { respondedWithLink: true },
  }),
};
export const docRequestRespondLink = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docRequestRespondLinkDef, data),
  );

const docRequestSetStatusDef: ActionDef<
  { requestId: string; status: "pending" | "fulfilled" },
  Obj
> = {
  name: "documentRequests.setStatus",
  class: "commit", // fulfilling/closing a request is a consequential state change
  validate: (raw) => {
    const r = raw as { requestId?: unknown; status?: unknown };
    if (!isUuid(r?.requestId)) throw new Error("requestId must be a uuid");
    if (r?.status !== "pending" && r?.status !== "fulfilled")
      throw new Error("bad status");
    return { requestId: r.requestId, status: r.status };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("doc_request_set_status", {
        p_uid: ctx.uid,
        p_request_id: input.requestId,
        p_status: input.status,
      });
    if (error) throw new Error(`doc_request_set_status: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_set_status_failed");
    return res;
  },
  record: (input) => ({
    objectType: "document_request",
    objectId: input.requestId,
    data: { status: input.status },
  }),
};
export const docRequestSetStatus = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docRequestSetStatusDef, data),
  );

const docRequestDeleteDef: ActionDef<{ requestId: string }, Obj> = {
  name: "documentRequests.delete",
  class: "commit",
  validate: (raw) => {
    const r = raw as { requestId?: unknown };
    if (!isUuid(r?.requestId)) throw new Error("requestId must be a uuid");
    return { requestId: r.requestId };
  },
  authorize: async () => true,
  handle: async (ctx, input): Promise<Obj> => {
    const { data, error } = await ctx.sb
      .schema("pack_api")
      .rpc("doc_request_delete", {
        p_uid: ctx.uid,
        p_request_id: input.requestId,
      });
    if (error) throw new Error(`doc_request_delete: ${error.message}`);
    const res = data as { ok: boolean; error?: string } & Obj;
    if (!res.ok) throw new Error(res.error ?? "doc_request_delete_failed");
    return res;
  },
  record: (input) => ({
    objectType: "document_request",
    objectId: input.requestId,
    data: { deleted: true },
  }),
};
export const docRequestDelete = createServerFn({ method: "POST" })
  .inputValidator(envelope)
  .handler(
    ({ data }): Promise<ActionResult<JsonValue>> =>
      runAction(docRequestDeleteDef, data),
  );

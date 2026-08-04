// Render streamer — the server-side endpoint that makes view_only genuinely
// §8-compliant for IMAGE and SPREADSHEET: file bytes are fetched server-side
// (service key) and only a RENDERED ARTIFACT is returned to the browser. The
// original file is never handed to the client as a downloadable URL.
//
//   image       → server fetches the bytes, returns a base64 data URI. The
//                 client shows it in <img>. No storage URL crosses the wire; the
//                 data URI is a one-shot response, not a persistent link.
//   spreadsheet → server fetches + parses with SheetJS, returns ONLY the parsed
//                 rows (JSON). The client renders a read-only table. The .xlsx
//                 file itself never reaches the browser.
//   pdf         → NOT handled here. view_only PDF is deferred (falls to
//                 release_on_request in document_request_access). Client PDF.js
//                 needs the bytes to rasterize, and server-side rasterization is
//                 unverified Workers infra — a separate, scoped decision.
//
// This action re-runs document_request_access through the gateway to
// re-authorize and re-confirm the doc is genuinely a view_only render target —
// it never trusts a storage_path handed in by the client. The client passes only
// the documentId; the server re-derives everything.

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { getEnvVar } from "@/lib/env";
import { defineAction, type JsonValue } from "./gateway";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RENDER_BYTES = 15 * 1024 * 1024; // guard: don't render huge files inline

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function serviceStorage() {
  return createClient(
    getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL"),
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  ).storage;
}

type RenderInput = { documentId: string; recipientId: string };
type RenderOutput = { [k: string]: JsonValue };

export const documentRender = defineAction<RenderInput, RenderOutput>({
  name: "documents.render",
  class: "read",

  validate: (raw): RenderInput => {
    const r = raw as { documentId?: unknown; recipientId?: unknown };
    if (!isUuid(r?.documentId)) throw new Error("documentId must be a uuid");
    if (!isUuid(r?.recipientId)) throw new Error("recipientId must be a uuid");
    return { documentId: r.documentId, recipientId: r.recipientId };
  },

  authorize: async () => true, // org-ownership enforced in the RPC below

  handle: async (ctx, input): Promise<RenderOutput> => {
    // Re-authorize + reclassify via the same gateway RPC. We do NOT trust a
    // client-supplied storage_path — the server re-derives it here.
    const { data, error } = await ctx.sb.schema("pack_api").rpc("document_request_access", {
      p_uid: ctx.uid,
      p_org_id: ctx.orgId,
      p_document_id: input.documentId,
      p_recipient: input.recipientId,
      p_governing_nda: null,
    });
    if (error) throw new Error(`request_access_rpc: ${error.message}`);
    const res = data as {
      ok: boolean; error?: string; mode?: string; render_kind?: string; storage_path?: string;
    };
    if (!res.ok) throw new Error(res.error ?? "request_access_failed");
    if (res.mode !== "render" || typeof res.storage_path !== "string") {
      // not a view_only render target (e.g. pdf → pending, or release classes)
      return { ok: false, error: "not_a_render_target", mode: res.mode ?? null };
    }

    // server-side fetch of the raw bytes (service key). These bytes never leave
    // the server as a downloadable URL — only the rendered artifact returns.
    const dl = await serviceStorage().from("documents").download(res.storage_path);
    if (dl.error || !dl.data) throw new Error(`download_failed: ${dl.error?.message ?? "no data"}`);
    const buf = await dl.data.arrayBuffer();
    if (buf.byteLength > MAX_RENDER_BYTES) {
      return { ok: false, error: "too_large_to_render", bytes: buf.byteLength };
    }

    if (res.render_kind === "image") {
      // return a base64 data URI — client shows <img src=dataUri>. No storage URL.
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const ext = res.storage_path.split(".").pop()?.toLowerCase() ?? "png";
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
        : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/png";
      return { ok: true, render_kind: "image", data_uri: `data:${mime};base64,${b64}` };
    }

    if (res.render_kind === "spreadsheet") {
      // parse server-side; return ONLY the rows. The .xlsx never reaches client.
      const wb = XLSX.read(buf, { type: "array" });
      const sheets: JsonValue = {};
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false });
        // rows is unknown[][]; coerce cells to JSON-safe scalars
        (sheets as Record<string, JsonValue>)[name] = (rows as unknown[][]).map((row) =>
          row.map((cell): JsonValue =>
            cell == null ? null
              : typeof cell === "number" || typeof cell === "boolean" ? cell
              : String(cell),
          ),
        );
      }
      return { ok: true, render_kind: "spreadsheet", sheets };
    }

    return { ok: false, error: "unknown_render_kind", render_kind: res.render_kind ?? null };
  },

  record: (input, output) => ({
    objectType: "document",
    objectId: input.documentId,
    data: { rendered: (output.render_kind as JsonValue) ?? null },
  }),
});

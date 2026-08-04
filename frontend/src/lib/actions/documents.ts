// Document actions — release-class-governed access (Foundation §8), via the
// gateway + pack_api. See gateway.ts and WHY_PACK_API.md.
//
// The RELEASE-CLASS DECISION and the §8.1 Release-row writing happen in the
// pack_api SECURITY DEFINER functions (document_request_access /
// document_grant_release). Signed-URL minting happens HERE (TS) because it
// needs the Supabase Storage API, not SQL — but ONLY after the RPC has
// authorized and returned a `mint` directive. The client never mints a URL;
// this is the sole mint path (replacing the ~10 client-side createSignedUrl
// sites at cutover).
//
// What 7b delivers, stated honestly:
//   • open_release      → Release row (granted) written by RPC, THEN mint here.
//   • release_on_request→ Release row (pending) written by RPC; mint only after
//                         a separate grant action flips it granted.
//   • view_only image / spreadsheet → RPC returns a 'render' directive. The
//     server-side render endpoint that streams ONLY rendered artifacts (so file
//     bytes never reach the browser) is the remaining piece — the directive and
//     Release-model are built; the render streamer is the next wiring step.
//   • view_only PDF     → deferred: RPC returns 'pending' (view_only_pdf_deferred),
//     i.e. it falls to release_on_request. No leaky path, no unverified infra.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { defineAction, type JsonValue } from "./gateway";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINT_TTL_SECONDS = 60; // short; a granted download link, not a standing URL

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
function optUuid(v: unknown): string | null {
  return v == null ? null : isUuid(v) ? v : "invalid";
}

// mint a signed URL for storage_path — the ONLY place this happens, and only
// after an RPC returned mode='mint'. TTL is short by design.
async function mintSignedUrl(sb: SupabaseClient, bucket: string, path: string): Promise<string> {
  // storage lives in the default (public REST) surface, not pack_api — a normal
  // service-role storage call, unrelated to the pack_v1 schema isolation.
  const storage = createClient(
    getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL"),
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  ).storage;
  const { data, error } = await storage.from(bucket).createSignedUrl(path, MINT_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new Error(`mint_failed: ${error?.message ?? "no url"}`);
  return data.signedUrl;
}

// ── documents.requestAccess (Read/Prepare per class) ─────────────────────────
type RequestAccessInput = {
  documentId: string;
  recipientId: string;
  governingNda: string | null;
};
type RequestAccessOutput = { [k: string]: JsonValue };

export const documentRequestAccess = defineAction<RequestAccessInput, RequestAccessOutput>({
  name: "documents.requestAccess",
  // Prepare-class: it may create a pending Release (a draft awaiting a human
  // grant) or, for open_release, produce an immediate signed URL. It never
  // performs an irreversible Commit-class act on its own.
  class: "prepare",

  validate: (raw): RequestAccessInput => {
    const r = raw as { documentId?: unknown; recipientId?: unknown; governingNda?: unknown };
    if (!isUuid(r?.documentId)) throw new Error("documentId must be a uuid");
    if (!isUuid(r?.recipientId)) throw new Error("recipientId must be a uuid");
    const nda = optUuid(r?.governingNda);
    if (nda === "invalid") throw new Error("governingNda must be a uuid or null");
    return { documentId: r.documentId, recipientId: r.recipientId, governingNda: nda };
  },

  authorize: async () => {
    // org-ownership authorization is enforced inside document_request_access
    // (returns 'forbidden' otherwise). TODO(cutover): uid ∈ org membership.
    return true;
  },

  handle: async (ctx, input): Promise<RequestAccessOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("document_request_access", {
      p_uid: ctx.uid,
      p_org_id: ctx.orgId,
      p_document_id: input.documentId,
      p_recipient: input.recipientId,
      p_governing_nda: input.governingNda,
    });
    if (error) throw new Error(`document_request_access_rpc: ${error.message}`);
    const res = data as { ok: boolean; error?: string; mode?: string; storage_path?: string } & RequestAccessOutput;
    if (!res.ok) throw new Error(res.error ?? "request_access_failed");

    // open_release → the RPC already wrote the granted Release row; mint now.
    if (res.mode === "mint" && typeof res.storage_path === "string") {
      const url = await mintSignedUrl(ctx.sb, "documents", res.storage_path);
      return { ...res, signed_url: url, ttl_seconds: MINT_TTL_SECONDS };
    }
    // render / pending → return the directive as-is (no URL). The client's
    // renderer (view_only) or the pending-approval UI (release_on_request)
    // takes it from here.
    return res;
  },

  record: (input, output) => ({
    objectType: "document",
    objectId: input.documentId,
    // record the mode so the audit trail distinguishes a mint from a pending req
    data: { mode: (output.mode as JsonValue) ?? null },
  }),
});

// ── documents.grantRelease (Commit) ──────────────────────────────────────────
// An approver flips a pending Release → granted, then a URL may be minted. This
// IS a Commit-class act (§15.2 "release a document"): an agent may NEVER do it
// (§15.3) — enforced by the gateway because class = 'commit'.
type GrantReleaseInput = { releaseId: string };
type GrantReleaseOutput = { [k: string]: JsonValue };

export const documentGrantRelease = defineAction<GrantReleaseInput, GrantReleaseOutput>({
  name: "documents.grantRelease",
  class: "commit",

  validate: (raw): GrantReleaseInput => {
    const r = raw as { releaseId?: unknown };
    if (!isUuid(r?.releaseId)) throw new Error("releaseId must be a uuid");
    return { releaseId: r.releaseId };
  },

  authorize: async () => true, // org-ownership enforced in document_grant_release

  handle: async (ctx, input): Promise<GrantReleaseOutput> => {
    const { data, error } = await ctx.sb.schema("pack_api").rpc("document_grant_release", {
      p_approver: ctx.uid,
      p_org_id: ctx.orgId,
      p_release_id: input.releaseId,
    });
    if (error) throw new Error(`document_grant_release_rpc: ${error.message}`);
    const res = data as { ok: boolean; error?: string; mode?: string; storage_path?: string } & GrantReleaseOutput;
    if (!res.ok) throw new Error(res.error ?? "grant_release_failed");

    if (res.mode === "mint" && typeof res.storage_path === "string") {
      const url = await mintSignedUrl(ctx.sb, "documents", res.storage_path);
      return { ...res, signed_url: url, ttl_seconds: MINT_TTL_SECONDS };
    }
    return res;
  },

  record: (input) => ({
    objectType: "release",
    objectId: input.releaseId,
    data: { granted: true },
  }),
});

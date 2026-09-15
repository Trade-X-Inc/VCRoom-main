// Upload-security gate — runs the 3-check pipeline against a just-uploaded
// document before its row is usable. Called after storage.upload()
// succeeds and the document row is inserted (scan_status defaults to
// 'pending' at insert time — see migration 20260916000000).
//
// PIPELINE ORDER (cheapest first — CLAUDE.md's own "reject before the
// expensive step" discipline, applied here explicitly):
//   1. Bucket size + claimed-MIME allowlist — already enforced by Supabase
//      Storage itself at upload time, before this function is ever
//      reached. A pass here is PROVISIONAL, not a completed check — the
//      object exists but the ROW stays 'pending' until steps 2-3 clear.
//   2. Magic-byte type verification (real, built here) — catches a file
//      whose real header bytes don't match its claimed extension/MIME
//      (the renamed-file trick: a real .xlsx renamed .csv keeps its
//      PK\x03\x04 zip header and is rejected here even though it passed
//      the bucket's claimed-MIME check).
//   3. Malware scan via scanner.ts's swappable interface (STUB for beta —
//      see scanner.ts's header for the full pre-launch item).
//
// Every check is server-side only, per ARCHITECTURE.md §10: "No check
// performed only in the browser is a control." Any client-side
// pre-validation elsewhere in the app is UX-only and is not a security
// boundary — this function is.
//
// §19d.1 (BLOCKING): identity is derived via resolveUid() from the
// caller's own bearer token, never from a caller-supplied uid. The caller
// also supplies a documentId + table — both are re-verified as actually
// belonging to that caller before any processing happens; a document id
// alone is never trusted as proof of ownership (CLAUDE.md §7.1: "a row
// exists matching these IDs" is not an authorization check).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fileTypeFromBuffer } from 'https://esm.sh/file-type@19'
import { resolveUid } from './_shared/auth.ts'
import { scanFile } from './scanner.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Must match storage.buckets.allowed_mime_types for the 'documents' bucket
// exactly — re-verified live against the real bucket row before writing
// this function, not assumed from memory or an earlier report.
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/html': 'html',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
}
const ALLOWED_EXTS = new Set(Object.values(ALLOWED_MIME_TO_EXT))

// docx/pptx are both ZIP-based OOXML; file-type detects the outer ZIP
// container reliably but distinguishing docx from pptx from a bare zip
// requires file-type's own OOXML-aware detection, which returns these
// specific extensions when it succeeds. If it can only tell "this is a
// zip" without resolving further, that's treated as a mismatch, not
// silently accepted — an unresolvable zip is not the same as a confirmed
// docx/pptx.
type TableName = 'founder_documents' | 'documents'
const ALLOWED_TABLES: TableName[] = ['founder_documents', 'documents']

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const uid = await resolveUid(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    if (!uid) return jsonResponse({ error: 'Invalid token' }, 401)

    const body = await req.json().catch(() => null) as
      | { documentId?: unknown; table?: unknown }
      | null
    const documentId = body?.documentId
    const table = body?.table
    if (typeof documentId !== 'string' || !documentId) {
      return jsonResponse({ error: 'documentId required' }, 400)
    }
    if (typeof table !== 'string' || !ALLOWED_TABLES.includes(table as TableName)) {
      return jsonResponse({ error: 'table must be founder_documents or documents' }, 400)
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Ownership check — the caller's uid must actually own this document,
    // never trusted from the documentId alone (CLAUDE.md §7.1). The two
    // tables have different ownership shapes, checked separately:
    //   founder_documents: startup_id -> startups.founder_id = caller
    //   documents:          uploader_id = caller directly
    let filePath: string | null = null
    let claimedMime: string | null = null

    if (table === 'founder_documents') {
      const { data: doc, error: docErr } = await sb
        .from('founder_documents')
        .select('id, startup_id, file_path, scan_status')
        .eq('id', documentId)
        .maybeSingle()
      if (docErr || !doc) return jsonResponse({ error: 'not_found' }, 404)

      const { data: startup, error: startupErr } = await sb
        .from('startups')
        .select('founder_id')
        .eq('id', doc.startup_id)
        .maybeSingle()
      if (startupErr || !startup || startup.founder_id !== uid) {
        return jsonResponse({ error: 'forbidden' }, 403)
      }
      if (doc.scan_status !== 'pending') {
        return jsonResponse({ ok: true, already: doc.scan_status }, 200)
      }
      filePath = doc.file_path
    } else {
      const { data: doc, error: docErr } = await sb
        .from('documents')
        .select('id, uploader_id, storage_path, scan_status')
        .eq('id', documentId)
        .maybeSingle()
      if (docErr || !doc) return jsonResponse({ error: 'not_found' }, 404)
      if (doc.uploader_id !== uid) return jsonResponse({ error: 'forbidden' }, 403)
      if (doc.scan_status !== 'pending') {
        return jsonResponse({ ok: true, already: doc.scan_status }, 200)
      }
      filePath = doc.storage_path
    }

    if (!filePath) return jsonResponse({ error: 'no_file_path' }, 500)

    // ── Fetch the object's real MIME as stored by Supabase Storage (the
    // claimed type, from bucket metadata) and the bytes themselves, for
    // Check 2's real-vs-claimed comparison and Check 3's scan input.
    const { data: fileBlob, error: dlErr } = await sb.storage
      .from('documents')
      .download(filePath)
    if (dlErr || !fileBlob) {
      await quarantine(sb, table, documentId, uid, filePath, 'type_mismatch', 'Could not read the uploaded file.')
      return jsonResponse({ ok: true, verdict: 'quarantined', reason: 'download_failed' }, 200)
    }
    const buf = new Uint8Array(await fileBlob.arrayBuffer())
    claimedMime = fileBlob.type || null

    // ── CHECK 2 — magic-byte type verification (real).
    const detected = await fileTypeFromBuffer(buf)
    const detectedExt = detected?.ext ?? null

    let typeOk: boolean
    let claimedExtFromMime = claimedMime ? ALLOWED_MIME_TO_EXT[claimedMime] ?? null : null

    if (claimedExtFromMime === 'csv') {
      // CSV is headerless plain text — file-type has nothing positive to
      // match against. The check here is negative: confirm the bytes are
      // NOT a recognizable binary format (the renamed-.xlsx-as-.csv case
      // and its siblings) rather than a positive CSV signature match.
      typeOk = detected === undefined
    } else {
      typeOk =
        detectedExt !== null &&
        ALLOWED_EXTS.has(detectedExt) &&
        detectedExt === claimedExtFromMime
    }

    if (!typeOk) {
      const claimedLabel = claimedExtFromMime ? claimedExtFromMime.toUpperCase() : 'this'
      await quarantine(
        sb,
        table,
        documentId,
        uid,
        filePath,
        'type_mismatch',
        `This file isn't a valid ${claimedLabel}.`,
      )
      return jsonResponse({ ok: true, verdict: 'quarantined', reason: 'type_mismatch' }, 200)
    }

    // ── CHECK 3 — malware scan via the swappable interface. STUB for beta
    // (see scanner.ts) — real implementation drops in at launch with no
    // change to anything below this line.
    const scan = await scanFile(buf)
    if (scan.verdict !== 'clean') {
      await quarantine(
        sb,
        table,
        documentId,
        uid,
        filePath,
        'malware',
        'This file failed our security scan and was removed.',
      )
      return jsonResponse({ ok: true, verdict: 'quarantined', reason: 'malware' }, 200)
    }

    // ── All checks passed — mark the row usable.
    const { error: updateErr } = await sb
      .from(table)
      .update({ scan_status: 'clean' })
      .eq('id', documentId)
    if (updateErr) return jsonResponse({ error: 'update_failed' }, 500)

    return jsonResponse({ ok: true, verdict: 'clean' }, 200)
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'unknown_error' }, 500)
  }
})

// Quarantine + notify + auto-remove, atomically in intent (both writes
// issued together; Postgres/Storage don't share a transaction across two
// different services here, so this is "best-effort atomic" — the same
// standard used elsewhere in this codebase for cross-system writes, e.g.
// storage upload + DB row insert). Terminal: scan_status is set to
// 'quarantined' and is not expected to transition back.
async function quarantine(
  sb: ReturnType<typeof createClient>,
  table: TableName,
  documentId: string,
  uploaderUid: string,
  filePath: string,
  reason: 'type_mismatch' | 'malware',
  message: string,
) {
  await sb.from(table).update({ scan_status: 'quarantined' }).eq('id', documentId)

  await sb.from('notifications').insert({
    user_id: uploaderUid,
    kind: 'document_quarantined',
    title: 'A document was removed',
    body: message,
    meta: { document_id: documentId, table, reason },
  })

  // Auto-remove: delete the storage object itself, not just the row state.
  // A quarantined file has no retention value the way a scored document
  // row does elsewhere in this codebase (CLAUDE.md's retired-scoring-data
  // precedent) — there is nothing worth keeping about a rejected upload.
  await sb.storage.from('documents').remove([filePath])
}

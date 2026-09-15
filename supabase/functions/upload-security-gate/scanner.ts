// Malware-scan interface — SWAPPABLE. The pipeline calls scanFile() and
// gates on its verdict; it does not know or care what's behind the call.
//
// ============================================================================
// ⚠️  STUB IMPLEMENTATION IN USE — NOT A REAL MALWARE SCANNER.  ⚠️
// ============================================================================
//
// scanFile() below always returns { verdict: "clean" } — a no-op pass. This
// is deliberate, scoped, and documented, not an oversight:
//
//   - Signup is disabled during beta (see the signup-toggle work this
//     mirrors) — no real confidential documents are at risk yet, since
//     nobody outside the existing test fixtures can create an account.
//   - A real scanner (ClamAV) needs a paid always-on host — it cannot run
//     inside a Supabase Edge Function or a Cloudflare Worker (both are
//     short-lived/stateless; ClamAV needs a persistent daemon + signature
//     database). That doesn't fit the free-during-beta rule.
//   - Pangea (a hosted scan-API alternative) has signups closed as of this
//     build — not currently obtainable regardless of budget.
//
// The rest of the gate is real: scan_status still exists on both document
// tables, still gates document usability, quarantine + notify + auto-remove
// are all real plumbing that fires correctly the moment a real verdict
// says "not clean." Only the verdict SOURCE is stubbed. Swapping in a real
// scanner is implementing this one function's body — nothing else in the
// pipeline changes.
//
// ============================================================================
// OPEN PRE-LAUNCH ITEM — do not ship real user signups with this stub live.
// ============================================================================
// Before real confidential documents can flow through this gate:
//   1. Wire a real scanner here (ClamAV on a small dedicated host, or
//      Pangea/equivalent once available) — see the upload-security-gate
//      recon report for the hosting-cost comparison and recommendation.
//   2. If a hosted API is used: confirm its data-retention and no-sharing
//      terms before a single real document is sent to it. Most free tiers
//      share submitted files with partner networks — wrong fit for a
//      confidential deal-document platform. This is the same class of gate
//      as the signup-toggle flip: a real, tracked pre-launch blocker, not
//      an implementation detail to forget.
// ============================================================================

export type ScanVerdict = "clean" | "malicious" | "suspicious" | "error";

export interface ScanResult {
  verdict: ScanVerdict;
  // Anything the real scanner wants to attach for debugging/ops purposes
  // (signature name, scan engine version, etc.) — NEVER shown to a user,
  // NEVER stored as a document-facing field, NEVER treated as a quality
  // signal or score. See the §15/§25 note below.
  detail?: string;
}

/**
 * Scan a file's bytes and return a clean/not-clean verdict.
 *
 * CONTRACT for any real implementation dropped in here:
 *   - Only the verdict enum matters to the caller. If the underlying
 *     scanner returns a numeric score, a confidence percentage, or any
 *     other graded output, that value is consumed ONLY to decide which
 *     of the four ScanVerdict buckets applies — it is discarded after
 *     that, never returned, never displayed, never written to a document
 *     row, and never enters the append-only record (§8.3). A malware
 *     score is not a quality signal about the document or its author;
 *     treating it as one is the exact §15/§25 shape this codebase has
 *     repeatedly had to remove elsewhere (readiness scores, AI document
 *     scores, thesis-fit scores). Do not reintroduce it here.
 *   - Must not throw on a scanner-side failure — return
 *     { verdict: "error" } instead, and let the caller decide how to
 *     treat an inconclusive scan (this stub never returns "error"; a
 *     real implementation will).
 *   - Runs server-side only, inside this edge function. Never call this
 *     from the browser.
 */
export async function scanFile(bytes: Uint8Array): Promise<ScanResult> {
  // STUB — see the file header. bytes is intentionally unused; a real
  // implementation reads it and sends it to a scan backend.
  void bytes;
  return { verdict: "clean" };
}

import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// R14B step 2 — Daily.co private interview rooms + per-participant meeting
// tokens. Same Daily account, API key, and __cf_env pattern as roast-fn.ts —
// this is the one video integration (CLAUDE.md: extend, don't duplicate).
//
// Differences from the roast setup, on purpose:
// - privacy: "private" — a deal-room interview must not be joinable by URL.
//   The roast's public rooms are a game mechanic, not a precedent here.
// - Access is by meeting token only (/v1/meeting-tokens), minted server-side
//   in these fns, never client-side. Tokens are single-room-scoped (room_name
//   claim), expiring, and minted per participant per meeting.
// - Recording: enable_recording: "cloud" on room creation (step 5). Daily
//   auto-starts cloud recording the moment the first participant joins —
//   no separate start-recording call needed, no owner-initiated toggle.
//   This was a deliberate product decision (auto-record, not manual):
//   an interview room where a party forgets to click "start recording"
//   would silently produce zero transcript/extraction for a real
//   Investment Terms discussion, which the platform's honesty rules
//   (§26.2) don't tolerate. Both parties see Daily's built-in recording
//   indicator in the call UI from the moment recording begins — this is
//   Daily's own on-by-default behavior for enable_recording rooms, not
//   something we suppress or hide, satisfying the all-party-awareness
//   requirement without an extra affirmative click.
//
// Authorization: the caller must hold a deal_room_members row for the room
// with role founder or investor. External/lawyer team accounts (routed via
// deal_room_team_assignments, no members row) get not_authorized — their
// access, if any, is step 4's Investment Terms gate decision.
// ─────────────────────────────────────────────────────────────────────────────

const INTERVIEW_STAGE_SLUGS = [
  "introduction",
  "product_demo",
  "financial_discussion",
  "terms_discussion",
  "investment_terms",
] as const;
export type InterviewStageSlug = (typeof INTERVIEW_STAGE_SLUGS)[number];

export const INTERVIEW_STAGE_LABELS: Record<InterviewStageSlug, string> = {
  introduction: "Introduction",
  product_demo: "Product Demo",
  financial_discussion: "Financial Discussion",
  terms_discussion: "Terms Discussion",
  investment_terms: "Investment Terms",
};

function getEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    url:
      cfEnv.SUPABASE_URL ||
      cfEnv.VITE_SUPABASE_URL ||
      (import.meta.env as any).VITE_SUPABASE_URL ||
      "",
    key: cfEnv.SUPABASE_SERVICE_ROLE_KEY || "",
    dailyKey: cfEnv.DAILY_API_KEY || "",
  };
}

async function sbFetch(url: string, key: string, path: string, method = "GET", body?: unknown, prefer?: string) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: prefer ?? (method === "POST" ? "return=representation" : "return=minimal"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

/** Resolve the calling user's id from their JWT — never trust a passed-in id. */
async function verifyUser(url: string, key: string, accessToken: string): Promise<string | null> {
  if (!accessToken) return null;
  const resp = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const user = (await resp.json()) as { id?: string };
  return user?.id ?? null;
}

/**
 * The step-2 authorization rule: a principal-party member (founder/investor)
 * of THIS room, per deal_room_members. Externals hold no members row (they
 * route through deal_room_team_assignments) and are rejected here even if
 * some future flow gave them one with another role.
 */
async function verifyPrincipalMember(
  url: string,
  key: string,
  dealRoomId: string,
  userId: string,
): Promise<"founder" | "investor" | null> {
  const rows: any[] = await sbFetch(
    url,
    key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&user_id=eq.${userId}&role=in.(founder,investor)&select=role`,
    "GET",
  ).catch(() => []);
  const role = rows?.[0]?.role;
  return role === "founder" || role === "investor" ? role : null;
}

/**
 * Step 4: a lawyer is a deal_room_members row with role='lawyer' in
 * exactly this room (never a broader team/External construct — see
 * 20260723000000's design note). Used only by mintInterviewToken, and
 * only for the investment_terms stage — a lawyer never creates rooms.
 */
async function verifyLawyerMember(
  url: string,
  key: string,
  dealRoomId: string,
  userId: string,
): Promise<boolean> {
  const rows: any[] = await sbFetch(
    url,
    key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&user_id=eq.${userId}&role=eq.lawyer&select=role`,
    "GET",
  ).catch(() => []);
  return (rows?.length ?? 0) > 0;
}

async function fetchMeeting(url: string, key: string, dealRoomId: string, meetingNumber: number) {
  const rows: any[] = await sbFetch(
    url,
    key,
    `deal_room_meetings?deal_room_id=eq.${dealRoomId}&meeting_number=eq.${meetingNumber}&select=id,stage_slug,scheduled_at,completed_at,daily_room_name,daily_room_url`,
    "GET",
  ).catch(() => []);
  return rows?.[0] ?? null;
}

// Rooms live 3 hours past their scheduled start (roast convention); an
// unscheduled ad-hoc creation gets 3 hours from now.
export const ROOM_WINDOW_SECONDS = 3 * 3600;
// Tokens are short-lived: 2 hours from mint, never longer.
const TOKEN_WINDOW_SECONDS = 2 * 3600;

/**
 * Reschedule support (plain helper, not a server fn — called from
 * upsertDealRoomMeeting's service-role handler). A rescheduled meeting
 * whose Daily room already exists gets the room's exp PATCHed to the new
 * start + 3h, so the idempotent create in createInterviewRoom never hands
 * back a room that expired before the meeting begins. PATCH over
 * delete+recreate keeps daily_room_url stable anywhere it's been shared.
 */
export async function syncDailyRoomExpiry(dailyKey: string, roomName: string, startEpochSeconds: number): Promise<boolean> {
  const resp = await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${dailyKey}` },
    body: JSON.stringify({ properties: { exp: startEpochSeconds + ROOM_WINDOW_SECONDS } }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("[interview] Daily room exp sync failed:", resp.status, errText);
    return false;
  }
  return true;
}

/** Best-effort Daily room deletion — 404s (already gone/expired) are fine. */
export async function deleteDailyRoom(dailyKey: string, roomName: string): Promise<void> {
  await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${dailyKey}` },
  }).catch(() => {});
}

/**
 * Shared private-notes upsert (deal_room_meeting_private_notes) — the one
 * write path for investor-private meeting notes, used by the meeting
 * server fns in deal-room-fn.ts / deal-room-workflow-fn.ts after the §33
 * column split (20260722000000).
 */
export async function upsertMeetingPrivateNote(url: string, key: string, meetingId: string, notes: string | null): Promise<void> {
  const resp = await fetch(`${url}/rest/v1/deal_room_meeting_private_notes?on_conflict=meeting_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ meeting_id: meetingId, notes, updated_at: new Date().toISOString() }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`private-note upsert failed (${resp.status}): ${text.slice(0, 200)}`);
  }
}

type CreateRoomInput = { userAccessToken: string; dealRoomId: string; meetingNumber: number; forceNew?: boolean };

export const createInterviewRoom = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as CreateRoomInput)
  .handler(async ({ data }): Promise<{ ok: boolean; roomName?: string; roomUrl?: string; error?: string }> => {
    const { url, key, dailyKey } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!dailyKey) return { ok: false, error: "daily_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };

    const role = await verifyPrincipalMember(url, key, data.dealRoomId, uid);
    if (!role) return { ok: false, error: "not_authorized" };

    const meeting = await fetchMeeting(url, key, data.dealRoomId, data.meetingNumber);
    if (!meeting) return { ok: false, error: "meeting_not_found" };

    // Idempotent: one Daily room per meeting stage. forceNew is the
    // join-side regenerate path (expired/missing room): tear the old room
    // down and mint a fresh one.
    if (meeting.daily_room_name && meeting.daily_room_url && !data.forceNew) {
      return { ok: true, roomName: meeting.daily_room_name, roomUrl: meeting.daily_room_url };
    }
    if (meeting.daily_room_name && data.forceNew) {
      await deleteDailyRoom(dailyKey, meeting.daily_room_name);
    }

    // A room always lives at least ROOM_WINDOW from creation — a meeting
    // whose scheduled start is already past (running late, or a
    // regenerate mid-meeting) must not mint an already-expired room.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const scheduledEpoch = meeting.scheduled_at
      ? Math.floor(new Date(meeting.scheduled_at).getTime() / 1000)
      : nowEpoch;
    const startEpoch = Math.max(scheduledEpoch, nowEpoch);
    // Opaque name — no deal-room id leaked into the URL.
    const roomName = `interview-m${data.meetingNumber}-${crypto.randomUUID().slice(0, 12)}`;

    const roomResp = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${dailyKey}` },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          exp: startEpoch + ROOM_WINDOW_SECONDS,
          eject_at_room_exp: true,
          enable_chat: true,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          // Auto-record from first join — see the step-5 comment above.
          // roast-fn.ts's public event rooms are untouched (no
          // enable_recording there; this property is only ever set here).
          enable_recording: "cloud",
        },
      }),
    });
    if (!roomResp.ok) {
      const errText = await roomResp.text().catch(() => "");
      console.error("[interview] Daily room create failed:", roomResp.status, errText);
      return { ok: false, error: "daily_room_create_failed" };
    }
    const room = (await roomResp.json()) as { name: string; url: string };

    await sbFetch(url, key, `deal_room_meetings?id=eq.${meeting.id}`, "PATCH", {
      daily_room_name: room.name,
      daily_room_url: room.url,
    });

    return { ok: true, roomName: room.name, roomUrl: room.url };
  });

type MintTokenInput = { userAccessToken: string; dealRoomId: string; meetingNumber: number };

export const mintInterviewToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as MintTokenInput)
  .handler(async ({ data }): Promise<{ ok: boolean; token?: string; roomUrl?: string; error?: string }> => {
    const { url, key, dailyKey } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!dailyKey) return { ok: false, error: "daily_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };

    const meeting = await fetchMeeting(url, key, data.dealRoomId, data.meetingNumber);
    if (!meeting) return { ok: false, error: "meeting_not_found" };

    // Step 4: a lawyer only ever authorizes for the investment_terms
    // meeting — checked before falling back to the principal-member rule,
    // since a lawyer holds no founder/investor role and would otherwise
    // just fail verifyPrincipalMember with no stage distinction at all.
    let role: "founder" | "investor" | "lawyer" | null = await verifyPrincipalMember(url, key, data.dealRoomId, uid);
    if (!role) {
      if (meeting.stage_slug === "investment_terms" && await verifyLawyerMember(url, key, data.dealRoomId, uid)) {
        role = "lawyer";
      } else {
        return { ok: false, error: "not_authorized" };
      }
    }

    if (!meeting.daily_room_name || !meeting.daily_room_url) {
      return { ok: false, error: "room_not_created" };
    }

    const users: any[] = await sbFetch(
      url,
      key,
      `users?id=eq.${uid}&select=full_name,email`,
      "GET",
    ).catch(() => []);
    const roleLabel = role === "founder" ? "Founder" : role === "investor" ? "Investor" : "Legal Counsel";
    const userName = users?.[0]?.full_name || users?.[0]?.email || roleLabel;

    const tokenResp = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${dailyKey}` },
      body: JSON.stringify({
        properties: {
          room_name: meeting.daily_room_name, // single-room scope
          exp: Math.floor(Date.now() / 1000) + TOKEN_WINDOW_SECONDS,
          eject_at_token_exp: true,
          user_name: userName,
          is_owner: false,
        },
      }),
    });
    if (!tokenResp.ok) {
      const errText = await tokenResp.text().catch(() => "");
      console.error("[interview] Daily token mint failed:", tokenResp.status, errText);
      return { ok: false, error: "daily_token_mint_failed" };
    }
    const minted = (await tokenResp.json()) as { token: string };

    return { ok: true, token: minted.token, roomUrl: meeting.daily_room_url };
  });

// ─────────────────────────────────────────────────────────────────────────────
// R14B step 5 — post-call ingestion: recording -> transcript -> AI extraction.
//
// Cloudflare Workers have a request time budget; Daily's recording
// finalization and batch-processor transcription both take real wall-clock
// minutes after a call ends, so this cannot be one long-blocking call. It is
// a single "check and advance" pass, safe to call repeatedly (idempotent at
// every stage — never re-submits a job that's already running or done):
//   1. No daily_recording_id yet -> poll Daily's recordings list for this
//      room, store the id once found (recording may still be processing).
//   2. Have daily_recording_id but no transcript job started
//      (transcript_status still 'pending') -> submit a batch-processor
//      transcription job, flip to 'processing'.
//   3. transcript_status 'processing' -> poll the job; on finish, fetch the
//      transcript text, store it, flip to 'complete' (or 'failed' + honest
//      error, never silently defaulted -- §26.2).
//   4. transcript ready + extraction_status 'pending' -> run AI extraction,
//      store extracted_notes, flip extraction_status to 'complete' or
//      'failed' + error.
// No client write path exists for any of these fields (see
// deal_room_meeting_records' RLS -- SELECT-only for room members); this fn
// is the only writer, using the service-role key throughout.
// ─────────────────────────────────────────────────────────────────────────────

type IngestInput = { userAccessToken: string; dealRoomId: string; meetingNumber: number };
type IngestResult = {
  ok: boolean;
  stage?: "recording_pending" | "transcript_submitted" | "transcript_processing" | "transcript_complete" | "extraction_complete";
  error?: string;
};

async function fetchOrCreateRecord(url: string, key: string, meetingId: string, dealRoomId: string) {
  const rows: any[] = await sbFetch(
    url, key,
    `deal_room_meeting_records?meeting_id=eq.${meetingId}&select=*`,
    "GET",
  ).catch(() => []);
  if (rows?.length) return rows[0];
  const created: any[] = await sbFetch(url, key, "deal_room_meeting_records", "POST", {
    meeting_id: meetingId,
    deal_room_id: dealRoomId,
  });
  return created?.[0] ?? null;
}

async function patchRecord(url: string, key: string, id: string, patch: Record<string, unknown>) {
  await sbFetch(url, key, `deal_room_meeting_records?id=eq.${id}`, "PATCH", {
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

export const ingestMeetingRecording = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as IngestInput)
  .handler(async ({ data }): Promise<IngestResult> => {
    const { url, key, dailyKey } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!dailyKey) return { ok: false, error: "daily_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };
    const role = await verifyPrincipalMember(url, key, data.dealRoomId, uid);
    if (!role) return { ok: false, error: "not_authorized" };

    const meeting = await fetchMeeting(url, key, data.dealRoomId, data.meetingNumber);
    if (!meeting) return { ok: false, error: "meeting_not_found" };
    if (!meeting.daily_room_name) return { ok: false, error: "no_recording_room" };

    const record = await fetchOrCreateRecord(url, key, meeting.id, data.dealRoomId);
    if (!record) return { ok: false, error: "record_unavailable" };

    // Stage 1 — find the recording.
    if (!record.daily_recording_id) {
      const listResp = await fetch(
        `https://api.daily.co/v1/recordings?room_name=${encodeURIComponent(meeting.daily_room_name)}&limit=10`,
        { headers: { Authorization: `Bearer ${dailyKey}` } },
      );
      if (!listResp.ok) {
        const errText = await listResp.text().catch(() => "");
        console.error("[interview-ingest] recordings list failed:", listResp.status, errText);
        return { ok: false, error: "daily_recordings_list_failed" };
      }
      const listed = (await listResp.json()) as { data?: Array<{ id: string; status: string }> };
      const finished = listed.data?.find((r) => r.status === "finished");
      if (!finished) {
        // Still recording, or recording not yet finalized on Daily's side.
        return { ok: true, stage: "recording_pending" };
      }
      await patchRecord(url, key, record.id, { daily_recording_id: finished.id });
      record.daily_recording_id = finished.id;
    }

    // Stage 2 — submit transcription job if not started.
    if (record.transcript_status === "pending") {
      const submitResp = await fetch("https://api.daily.co/v1/batch-processor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${dailyKey}` },
        body: JSON.stringify({
          preset: "transcript",
          inParams: { sourceType: "recordingId", recordingId: record.daily_recording_id },
        }),
      });
      if (!submitResp.ok) {
        const errText = await submitResp.text().catch(() => "");
        console.error("[interview-ingest] batch-processor submit failed:", submitResp.status, errText);
        await patchRecord(url, key, record.id, {
          transcript_status: "failed",
          transcript_error: `Daily batch-processor submit failed (${submitResp.status}): ${errText.slice(0, 300)}`,
        });
        return { ok: false, error: "transcript_submit_failed" };
      }
      const submitted = (await submitResp.json()) as { id: string };
      await patchRecord(url, key, record.id, {
        transcript_status: "processing",
        transcript_error: null,
        // Reuse daily_recording_id's sibling text field to stash the job id
        // between calls -- see the read-back below, which looks in
        // extracted_notes._job only as an internal bookkeeping field, never
        // surfaced as if it were real extracted content (§26.2).
        extracted_notes: { _transcriptJobId: submitted.id },
      });
      return { ok: true, stage: "transcript_submitted" };
    }

    // Stage 3 — poll the transcription job.
    if (record.transcript_status === "processing") {
      const jobId = record.extracted_notes?._transcriptJobId;
      if (!jobId) {
        await patchRecord(url, key, record.id, {
          transcript_status: "failed",
          transcript_error: "Transcription was marked processing but no job id was recorded — inconsistent state, needs manual retry.",
        });
        return { ok: false, error: "missing_job_id" };
      }
      const jobResp = await fetch(`https://api.daily.co/v1/batch-processor/${jobId}`, {
        headers: { Authorization: `Bearer ${dailyKey}` },
      });
      if (!jobResp.ok) {
        const errText = await jobResp.text().catch(() => "");
        console.error("[interview-ingest] batch-processor status failed:", jobResp.status, errText);
        return { ok: false, error: "job_status_failed" };
      }
      const job = (await jobResp.json()) as {
        status: string;
        error?: string;
        output?: { transcription?: Array<{ format?: string; s3Config?: { bucket: string; key: string; region: string }; url?: string }> };
      };

      if (job.status === "error") {
        await patchRecord(url, key, record.id, {
          transcript_status: "failed",
          transcript_error: job.error ? String(job.error).slice(0, 500) : "Daily reported the transcription job failed, no further detail given.",
          extracted_notes: null,
        });
        return { ok: false, error: "transcript_job_error" };
      }
      if (job.status !== "finished") {
        return { ok: true, stage: "transcript_processing" };
      }

      // Finished — fetch the transcript text. Daily's default (no custom
      // s3Config) hosts output on its own storage; prefer a direct url if
      // present, otherwise attempt the s3 path. If neither shape matches
      // what we can fetch, fail honestly rather than store a blank
      // transcript as if it were real content.
      const out = job.output?.transcription?.[0];
      let transcriptText: string | null = null;
      let fetchError: string | null = null;
      if (out?.url) {
        const txtResp = await fetch(out.url).catch(() => null);
        if (txtResp?.ok) transcriptText = await txtResp.text();
        else fetchError = `Could not download transcript from Daily's provided URL (status ${txtResp?.status ?? "no response"}).`;
      } else if (out) {
        fetchError = `Daily returned an output shape this integration doesn't know how to fetch yet: ${JSON.stringify(out).slice(0, 300)}`;
      } else {
        fetchError = "Transcription job finished but Daily returned no output.transcription entry.";
      }

      if (!transcriptText) {
        await patchRecord(url, key, record.id, {
          transcript_status: "failed",
          transcript_error: fetchError,
          extracted_notes: null,
        });
        return { ok: false, error: "transcript_fetch_failed" };
      }

      await patchRecord(url, key, record.id, {
        transcript_status: "complete",
        transcript_error: null,
        transcript_text: transcriptText,
        extracted_notes: null, // clear the internal job-id bookkeeping now that it's served its purpose
      });
      record.transcript_status = "complete";
      record.transcript_text = transcriptText;
    }

    // Stage 4 — AI extraction, once transcript is in hand.
    if (record.transcript_status === "complete" && record.extraction_status === "pending") {
      const extracted = await extractMeetingNotes(record.transcript_text as string);
      if (extracted.ok) {
        await patchRecord(url, key, record.id, {
          extraction_status: "complete",
          extraction_error: null,
          extracted_notes: extracted.notes,
        });
        return { ok: true, stage: "extraction_complete" };
      }
      await patchRecord(url, key, record.id, {
        extraction_status: "failed",
        extraction_error: extracted.error,
      });
      return { ok: false, error: "extraction_failed" };
    }

    return { ok: true, stage: "transcript_complete" };
  });

// ── AI extraction ───────────────────────────────────────────────────────────
// Trust-critical: deal-meeting transcripts are sensitive financial content.
// Uses the same OpenAI path every other extraction/generation fn in this
// codebase uses (OPENAI_API_KEY, gpt-4o-mini) -- no OpenRouter, no
// alternate/cheaper model provider is wired into this codebase anywhere,
// and none is introduced here.
//
// Every extracted claim must cite where in the transcript it came from and
// carry a confidence marker; figures are quoted as stated-by-speaker, never
// asserted as verified fact (standing AI rule, generalized from §26.2).

export type MeetingExtraction = {
  summary: string;
  topics: Array<{ topic: string; detail: string; source_quote: string; confidence: "high" | "medium" | "low" }>;
  stated_figures: Array<{ figure: string; stated_by: string; source_quote: string; confidence: "high" | "medium" | "low" }>;
  open_items: Array<{ item: string; source_quote: string; confidence: "high" | "medium" | "low" }>;
};

async function extractMeetingNotes(transcriptText: string): Promise<{ ok: true; notes: MeetingExtraction } | { ok: false; error: string }> {
  const cfEnv = (globalThis as any).__cf_env || {};
  const apiKey = cfEnv.OPENAI_API_KEY || "";
  if (!apiKey) return { ok: false, error: "OpenAI is not configured (no OPENAI_API_KEY) — transcript stored, extraction not attempted." };
  if (!transcriptText || !transcriptText.trim()) {
    return { ok: false, error: "Transcript text was empty — nothing to extract from." };
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You extract structured notes from a deal-room interview meeting transcript for a VC platform. This is sensitive financial content — never assert a fact the transcript doesn't support, never round or embellish a figure, never invent a speaker's name if the transcript doesn't identify one (use "Unidentified speaker").

Every item you output MUST include:
- source_quote: a short verbatim excerpt from the transcript supporting the claim
- confidence: "high" (explicitly and unambiguously stated), "medium" (stated but with hedging/ambiguity), or "low" (inferred, not directly stated)

Figures (revenue, valuation, runway, headcount, any number) must be attributed to whoever said them ("stated_by") and quoted as spoken — never presented as independently verified.

If the transcript is too short, garbled, or off-topic to extract meaningfully, return empty arrays rather than inventing content — an honest partial result beats a padded one.

Respond ONLY with valid JSON matching this exact shape, no markdown, no code fences:
{"summary":"...","topics":[{"topic":"...","detail":"...","source_quote":"...","confidence":"high|medium|low"}],"stated_figures":[{"figure":"...","stated_by":"...","source_quote":"...","confidence":"high|medium|low"}],"open_items":[{"item":"...","source_quote":"...","confidence":"high|medium|low"}]}`,
        },
        { role: "user", content: `Transcript:\n\n${transcriptText.slice(0, 24000)}` },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    return { ok: false, error: `OpenAI request failed (${resp.status}): ${errText.slice(0, 300)}` };
  }

  const json = (await resp.json()) as { choices?: Array<{ message: { content: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  if (!raw.trim()) return { ok: false, error: "OpenAI returned an empty response." };

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as MeetingExtraction;
    return { ok: true, notes: parsed };
  } catch {
    return { ok: false, error: `AI response was not valid JSON — raw content stored for review: ${cleaned.slice(0, 500)}` };
  }
}

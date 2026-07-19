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
// - Transcription, not recording (step 5, revised): the deliverable is AI
//   meeting notes, not a video/audio recording. No cloud recording is
//   enabled on these rooms — Daily's cloud-recording + batch-processor
//   post-call transcription path was tried and found to structurally
//   require a real AWS S3 bucket with an IAM role (assume_role_arn),
//   which Cloudflare R2 cannot satisfy (R2 has no IAM role assumption,
//   confirmed live against Daily's domain-config validation). Switched to
//   Daily's REALTIME transcription (Deepgram) instead: no recording, no
//   bucket, no batch job — transcript text streams to the client during
//   the call via transcription-message events and is persisted through
//   completeMeeting's ingestion path when the meeting ends. See
//   app.deal-rooms.$id.meetings.tsx's InterviewCall for the capture side.
//   Both parties still see an explicit transcription indicator (Daily's
//   built-in transcription-active UI) — the all-party-awareness
//   requirement applies identically to transcription as it would to
//   recording. The R2 bucket created for the abandoned recording path
//   stays provisioned but unused, reserved for a possible future paid
//   recording add-on (see CLAUDE.md).
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
    r2AccountId: cfEnv.R2_ACCOUNT_ID || "",
    r2AccessKeyId: cfEnv.R2_ACCESS_KEY_ID || "",
    r2SecretAccessKey: cfEnv.R2_SECRET_ACCESS_KEY || "",
    r2BucketName: cfEnv.R2_BUCKET_NAME || "",
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
  // A backend failure here fails CLOSED (returns [] → null → not_authorized),
  // which is the safe direction for an authz check — but log it so a real
  // outage isn't fully silent (§6A2). Never fail open.
  const rows: any[] = await sbFetch(
    url,
    key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&user_id=eq.${userId}&role=in.(founder,investor)&select=role`,
    "GET",
  ).catch((e) => { console.error("[interview] verifyPrincipalMember fetch failed (failing closed):", e); return []; });
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
  ).catch((e) => { console.error("[interview] verifyLawyerMember fetch failed (failing closed):", e); return []; });
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
          // No enable_recording — realtime transcription only, see the
          // step-5 comment above. roast-fn.ts's public event rooms are
          // untouched either way (recording was never enabled there).
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
          // §6C2 resolution: auto-start transcription via the token flag,
          // and DELIBERATELY grant NO canAdmin. Consequence: transcription
          // starts automatically when a participant joins (no client
          // startTranscription() call, no admin), and because NO participant
          // holds canAdmin, NO ONE can manually stopTranscription() mid-call
          // — it stops only at natural meeting end. This removes the
          // manual-stop / mid-call-censorship capability entirely rather
          // than merely logging it (product decision, step 6). Set on every
          // role's token so the first joiner triggers it gap-free; Daily
          // runs a single room transcription instance.
          auto_start_transcription: true,
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
// R14B step 5 (revised) — realtime transcription -> AI extraction.
//
// No cloud recording, no batch-processor, no bucket. Deepgram-powered live
// transcription runs during the call (started client-side, see
// app.deal-rooms.$id.meetings.tsx's InterviewCall), streaming
// transcription-message events to whichever client has the listener
// attached. Each client accumulates {participantId, text, timestamp}
// entries locally and calls saveMeetingTranscript once, when leaving the
// call, with the full accumulated text. Concurrent saves from both parties
// are fine — the later save simply wins (last-write, not merged); a
// meeting's transcript is a single text blob, not a per-party split.
//
// Two-fn split, same idempotent "check and advance" shape as before, now
// much smaller:
//   1. saveMeetingTranscript — service-role write, the only way transcript
//      text reaches deal_room_meeting_records (no client write policy on
//      that table — confirmed unchanged from step 1). Honest on an empty
//      transcript: stores transcript_status='complete' with empty text
//      rather than pretending nothing happened, since a genuinely silent
//      call (e.g. this session's own headless-browser test) is a real,
//      valid outcome, not a failure.
//   2. runMeetingExtraction — separate step, callable once a transcript
//      exists, retriable on failure (§26.2 one-click retry). Kept as its
//      own fn rather than folded into save, since the client saving the
//      transcript and the client wanting extraction re-run are not
//      necessarily the same event.
// ─────────────────────────────────────────────────────────────────────────────

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

type SaveTranscriptInput = {
  userAccessToken: string;
  dealRoomId: string;
  meetingNumber: number;
  transcriptText: string;
};

export const saveMeetingTranscript = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SaveTranscriptInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };
    // A lawyer may also save a transcript for the investment_terms meeting
    // they were actually on the call for — mirrors mintInterviewToken's
    // stage-scoped authorization.
    const meeting = await fetchMeeting(url, key, data.dealRoomId, data.meetingNumber);
    if (!meeting) return { ok: false, error: "meeting_not_found" };
    let role: "founder" | "investor" | "lawyer" | null = await verifyPrincipalMember(url, key, data.dealRoomId, uid);
    if (!role) {
      if (meeting.stage_slug === "investment_terms" && await verifyLawyerMember(url, key, data.dealRoomId, uid)) {
        role = "lawyer";
      } else {
        return { ok: false, error: "not_authorized" };
      }
    }

    const record = await fetchOrCreateRecord(url, key, meeting.id, data.dealRoomId);
    if (!record) return { ok: false, error: "record_unavailable" };

    await patchRecord(url, key, record.id, {
      // "ready", not "complete" -- the actual DB check constraint (found
      // live, after this code shipped with the wrong value and silently
      // failed every save) only allows pending/processing/ready/failed.
      transcript_status: "ready",
      transcript_error: null,
      transcript_text: data.transcriptText,
    });
    return { ok: true };
  });

type ExtractInput = { userAccessToken: string; dealRoomId: string; meetingNumber: number };
type ExtractResult = { ok: boolean; stage?: "no_transcript" | "extraction_complete"; error?: string };

export const runMeetingExtraction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ExtractInput)
  .handler(async ({ data }): Promise<ExtractResult> => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };
    const role = await verifyPrincipalMember(url, key, data.dealRoomId, uid);
    if (!role) return { ok: false, error: "not_authorized" };

    const meeting = await fetchMeeting(url, key, data.dealRoomId, data.meetingNumber);
    if (!meeting) return { ok: false, error: "meeting_not_found" };

    const record = await fetchOrCreateRecord(url, key, meeting.id, data.dealRoomId);
    if (!record) return { ok: false, error: "record_unavailable" };

    if (record.transcript_status !== "ready" || !record.transcript_text) {
      return { ok: true, stage: "no_transcript" };
    }
    if (record.extraction_status === "ready") {
      return { ok: true, stage: "extraction_complete" };
    }

    const extracted = await extractMeetingNotes(record.transcript_text as string);
    if (extracted.ok) {
      await patchRecord(url, key, record.id, {
        extraction_status: "ready",
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

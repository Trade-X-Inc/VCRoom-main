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
// - No recording properties in this step — recording/transcription is wired
//   in step 5; keep the seam clean.
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
const ROOM_WINDOW_SECONDS = 3 * 3600;
// Tokens are short-lived: 2 hours from mint, never longer.
const TOKEN_WINDOW_SECONDS = 2 * 3600;

type CreateRoomInput = { userAccessToken: string; dealRoomId: string; meetingNumber: number };

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

    // Idempotent: one Daily room per meeting stage.
    if (meeting.daily_room_name && meeting.daily_room_url) {
      return { ok: true, roomName: meeting.daily_room_name, roomUrl: meeting.daily_room_url };
    }

    const startEpoch = meeting.scheduled_at
      ? Math.floor(new Date(meeting.scheduled_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
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

    const role = await verifyPrincipalMember(url, key, data.dealRoomId, uid);
    if (!role) return { ok: false, error: "not_authorized" };

    const meeting = await fetchMeeting(url, key, data.dealRoomId, data.meetingNumber);
    if (!meeting) return { ok: false, error: "meeting_not_found" };
    if (!meeting.daily_room_name || !meeting.daily_room_url) {
      return { ok: false, error: "room_not_created" };
    }

    const users: any[] = await sbFetch(
      url,
      key,
      `users?id=eq.${uid}&select=full_name,email`,
      "GET",
    ).catch(() => []);
    const userName = users?.[0]?.full_name || users?.[0]?.email || (role === "founder" ? "Founder" : "Investor");

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

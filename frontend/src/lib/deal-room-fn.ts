import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/require-user-fn";

// Build Step 1 (7 Sep 2026): canonical 5-stage sequence, replacing the
// nda_signed/initial_review/diligence/term_sheet/closed vocabulary. The
// value set collapses two prior overlapping vocabularies and renames the
// terminal value away from "closed" — that literal string is reserved for
// deal_rooms.status='closed' (the real, trigger-guarded close event via
// finalize_deal_close()), a DIFFERENT event that was previously colliding
// with this column's own "closed" value in review/grep. See CLAUDE.md's
// deal-room lifecycle vocabulary entries.
export type DealStage =
  | "nda_signed"
  | "qa"
  | "diligence"
  | "term_sheet"
  | "closing_confirmed";

export const DEAL_STAGES: DealStage[] = [
  "nda_signed",
  "qa",
  "diligence",
  "term_sheet",
  "closing_confirmed",
];

export const STAGE_LABELS: Record<DealStage, string> = {
  nda_signed: "NDA & Profiles",
  qa: "Q&A",
  diligence: "Diligence",
  term_sheet: "Term Sheet",
  closing_confirmed: "Closing",
};

export const BLOCKED_CATEGORIES = [
  "source_code",
  "technical_ip",
  "customer_pii",
  "personal_salary_data",
] as const;

export const BLOCKED_CATEGORY_LABELS: Record<string, string> = {
  source_code: "source code",
  technical_ip: "core technical IP",
  customer_pii: "customer personal data",
  personal_salary_data: "personal salary data",
};

function getAdmin() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url =
    cfEnv.SUPABASE_URL ||
    cfEnv.VITE_SUPABASE_URL ||
    (import.meta.env as any).VITE_SUPABASE_URL ||
    "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

// Added 11 Oct 2026 (follow-up hardening after the 5 authz fixes in
// this session). Every function below builds its PostgREST request
// path via raw template-literal interpolation into sbFetch's `path`
// argument — NOT the Supabase JS client's parameterized `.eq()` (that
// shape lives in doc-request-fn.ts instead, which is not affected by
// this class of issue at all: the JS client encodes filter values
// safely regardless of content). A client-supplied id containing `&`,
// `=`, or a PostgREST operator syntax, interpolated into
// `...?id=eq.${data.someId}&...`, can inject an ADDITIONAL filter
// clause into the request — e.g. a deal_room_id of
// "X&visibility=eq.public" turns one filter into two. This is not
// classic SQL injection (PostgREST parameterizes the real SQL itself,
// downstream of this string), but it is a real PostgREST query-string
// injection surface on every path built this way. A strict UUID check
// before interpolation closes it: every one of this file's UUID-typed
// client-supplied ids (deal_room_id, request_id, granted_to) is now
// rejected outright if it isn't a well-formed UUID, before any fetch.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Adjacent finding, same injection class, flagged separately from the
// UUID task since it's a different value type: meeting_number is also
// interpolated raw into a URL (`meeting_number=eq.${data.meeting_number}`)
// in skipMeeting/completeMeeting/updateMeetingNotes, with no bound
// check at all before this fix. Range matches STAGE_SLUG_BY_NUMBER's
// own 5-element bound (the array this value indexes into elsewhere in
// this file).
function isValidMeetingNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;
}

async function sbFetch(
  url: string,
  key: string,
  path: string,
  method: string,
  body?: unknown,
  // Optional Prefer-header override, added 11 Oct 2026 for
  // respondToDocumentRequest's row-count check. Defaults to undefined
  // so every existing call site (20 others in this file) keeps its
  // exact current behavior (return=minimal on PATCH) unchanged — this
  // is purely additive, not a change to the shared default.
  preferOverride?: string,
) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: preferOverride ?? (method === "POST" ? "return=representation" : "return=minimal"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function logActivity(
  url: string,
  key: string,
  dealRoomId: string,
  actorUserId: string,
  action: string,
  metadata?: Record<string, unknown>,
) {
  await sbFetch(url, key, "activities", "POST", {
    deal_room_id: dealRoomId,
    actor_id: actorUserId,
    action,
    metadata: metadata ?? {},
  }).catch(() => null);
}

// Verifies the caller (derived from their own access token, never a client-
// supplied id) is a real member of the room before any write proceeds.
// See CLAUDE.md §51 — service-role calls bypass RLS entirely, so this check
// is the only authorization boundary these functions have.
async function requireRoomMember(
  url: string,
  key: string,
  dealRoomId: string,
  accessToken: string | undefined,
): Promise<{ ok: true; uid: string } | { ok: false; error: string }> {
  // Helper-level guard, added per review 11 Oct 2026 — every call site
  // already validates dealRoomId before calling this helper (see each
  // handler above), but grantSectionAccess didn't, until that was found
  // and fixed separately. Defense in depth: this helper interpolates
  // dealRoomId raw into a PostgREST path two lines below, so it checks
  // for itself rather than trusting every current and future caller to
  // remember to validate first.
  if (!isValidUuid(dealRoomId)) {
    return { ok: false, error: "invalid_deal_room_id" };
  }
  const auth = await requireUser(accessToken);
  if (!auth.ok) return { ok: false, error: auth.error };
  const rows: any[] = await sbFetch(
    url,
    key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&user_id=eq.${auth.uid}&select=user_id`,
    "GET",
  ).catch(() => []);
  if (!rows?.length) return { ok: false, error: "not_authorized" };
  return { ok: true, uid: auth.uid };
}

// Same identity derivation as requireRoomMember, but only a room PRINCIPAL
// (founder/investor) passes — a lawyer resolves to null and fails closed.
// Mirrors closing-fn.ts's principalRole() pattern exactly (phase0 step 2):
// lawyers are legitimate deal_room_members rows, so requireRoomMember alone
// authorizes them for actions that must stay founder/investor-only (stage
// advance, term sheet send/respond, pass, section access grant/revoke).
async function principalRoomMember(
  url: string,
  key: string,
  dealRoomId: string,
  accessToken: string | undefined,
): Promise<{ ok: true; uid: string } | { ok: false; error: string }> {
  // Helper-level guard, same reasoning as requireRoomMember above.
  if (!isValidUuid(dealRoomId)) {
    return { ok: false, error: "invalid_deal_room_id" };
  }
  const auth = await requireUser(accessToken);
  if (!auth.ok) return { ok: false, error: auth.error };
  const rows: any[] = await sbFetch(
    url,
    key,
    `deal_room_members?deal_room_id=eq.${dealRoomId}&user_id=eq.${auth.uid}&role=in.(founder,investor)&select=role`,
    "GET",
  ).catch(() => []);
  const role = rows?.[0]?.role;
  if (role !== "founder" && role !== "investor") return { ok: false, error: "not_authorized" };
  return { ok: true, uid: auth.uid };
}

// ── skipMeeting ───────────────────────────────────────────────────────────────

type SkipMeetingInput = {
  deal_room_id: string;
  meeting_number: number;
  accessToken: string;
  // R14B: skip-with-reason — stored in notes_shared (both parties see why a
  // stage was skipped) and echoed into the activity log.
  reason?: string;
};

// R14B: keep INSERTed rows valid against the NOT NULL stage_slug column.
const STAGE_SLUG_BY_NUMBER = [
  "introduction",
  "product_demo",
  "financial_discussion",
  "terms_discussion",
  "investment_terms",
] as const;

export const skipMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SkipMeetingInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!isValidUuid(data.deal_room_id)) {
      return { ok: false, error: "invalid_deal_room_id" };
    }
    if (!isValidMeetingNumber(data.meeting_number)) {
      return { ok: false, error: "invalid_meeting_number" };
    }
    const auth = await requireRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const now = new Date().toISOString();
    const reason = (data.reason ?? "").trim().slice(0, 300);

    const existing: any[] = await sbFetch(
      url,
      key,
      `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&meeting_number=eq.${data.meeting_number}&select=id`,
      "GET",
    ).catch(() => []);

    const patch: Record<string, unknown> = { meeting_type: "skipped", completed_at: now };
    if (reason) patch.notes_shared = `Skipped: ${reason}`;

    let id: string;
    if (existing?.length) {
      id = existing[0].id;
      await sbFetch(url, key, `deal_room_meetings?id=eq.${id}`, "PATCH", patch);
    } else {
      const rows = await sbFetch(url, key, "deal_room_meetings", "POST", {
        deal_room_id: data.deal_room_id,
        meeting_number: data.meeting_number,
        stage_slug: STAGE_SLUG_BY_NUMBER[data.meeting_number - 1] ?? "introduction",
        ...patch,
      });
      id = rows?.[0]?.id;
    }

    await logActivity(
      url,
      key,
      data.deal_room_id,
      auth.uid,
      `Skipped meeting ${data.meeting_number}`,
      { meeting_number: data.meeting_number, reason: reason || null },
    );

    return { ok: true, id };
  });

// ── completeMeeting ──────────────────────────────────────────────────────────

type CompleteMeetingInput = {
  deal_room_id: string;
  meeting_number: number;
  accessToken: string;
  meeting_type?: string;
  scheduled_at?: string | null;
  // R14B: routed to deal_room_meeting_private_notes — never a column write.
  notes_investor?: string | null;
  notes_shared?: string | null;
};

export const completeMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as CompleteMeetingInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!isValidUuid(data.deal_room_id)) {
      return { ok: false, error: "invalid_deal_room_id" };
    }
    if (!isValidMeetingNumber(data.meeting_number)) {
      return { ok: false, error: "invalid_meeting_number" };
    }
    const auth = await requireRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const now = new Date().toISOString();

    const existing: any[] = await sbFetch(
      url,
      key,
      `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&meeting_number=eq.${data.meeting_number}&select=id`,
      "GET",
    ).catch(() => []);

    const payload: Record<string, unknown> = { completed_at: now };
    if (data.meeting_type !== undefined) payload.meeting_type = data.meeting_type;
    if (data.scheduled_at !== undefined) payload.scheduled_at = data.scheduled_at;
    if (data.notes_shared !== undefined) payload.notes_shared = data.notes_shared;

    let id: string;
    if (existing?.length) {
      id = existing[0].id;
      await sbFetch(url, key, `deal_room_meetings?id=eq.${id}`, "PATCH", payload);
    } else {
      const rows = await sbFetch(url, key, "deal_room_meetings", "POST", {
        deal_room_id: data.deal_room_id,
        meeting_number: data.meeting_number,
        stage_slug: STAGE_SLUG_BY_NUMBER[data.meeting_number - 1] ?? "introduction",
        ...payload,
      });
      id = rows?.[0]?.id;
    }

    if (data.notes_investor !== undefined && id) {
      const { upsertMeetingPrivateNote } = await import("@/lib/interview-fn");
      await upsertMeetingPrivateNote(url, key, id, data.notes_investor ?? null);
    }

    const rooms: any[] = await sbFetch(
      url,
      key,
      `deal_rooms?id=eq.${data.deal_room_id}&select=meetings_completed`,
      "GET",
    ).catch(() => []);
    const current = rooms?.[0]?.meetings_completed ?? 0;
    await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", {
      meetings_completed: current + 1,
      updated_at: now,
    });

    await logActivity(
      url,
      key,
      data.deal_room_id,
      auth.uid,
      `Marked meeting ${data.meeting_number} as done`,
      { meeting_number: data.meeting_number },
    );

    return { ok: true, id };
  });

// ── updateMeetingNotes ──────────────────────────────────────────────────────

type UpdateMeetingNotesInput = {
  deal_room_id: string;
  meeting_number: number;
  accessToken: string;
  // R14B: routed to deal_room_meeting_private_notes — never a column write.
  notes_investor?: string | null;
  notes_shared?: string | null;
  meeting_type?: string;
  scheduled_at?: string | null;
};

export const updateMeetingNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as UpdateMeetingNotesInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!isValidUuid(data.deal_room_id)) {
      return { ok: false, error: "invalid_deal_room_id" };
    }
    if (!isValidMeetingNumber(data.meeting_number)) {
      return { ok: false, error: "invalid_meeting_number" };
    }
    const auth = await requireRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };

    const existing: any[] = await sbFetch(
      url,
      key,
      `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&meeting_number=eq.${data.meeting_number}&select=id`,
      "GET",
    ).catch(() => []);

    const payload: Record<string, unknown> = {};
    if (data.notes_shared !== undefined) payload.notes_shared = data.notes_shared;
    if (data.meeting_type !== undefined) payload.meeting_type = data.meeting_type;
    if (data.scheduled_at !== undefined) payload.scheduled_at = data.scheduled_at;

    let id: string;
    if (existing?.length) {
      id = existing[0].id;
      if (Object.keys(payload).length > 0) {
        await sbFetch(url, key, `deal_room_meetings?id=eq.${id}`, "PATCH", payload);
      }
    } else {
      const rows = await sbFetch(url, key, "deal_room_meetings", "POST", {
        deal_room_id: data.deal_room_id,
        meeting_number: data.meeting_number,
        stage_slug: STAGE_SLUG_BY_NUMBER[data.meeting_number - 1] ?? "introduction",
        ...payload,
      });
      id = rows?.[0]?.id;
    }

    if (data.notes_investor !== undefined && id) {
      const { upsertMeetingPrivateNote } = await import("@/lib/interview-fn");
      await upsertMeetingPrivateNote(url, key, id, data.notes_investor ?? null);
    }
    return { ok: true, id };
  });

// ── createDocumentRequest ──────────────────────────────────────────────────

type CreateDocRequestInput = {
  deal_room_id: string;
  accessToken: string;
  requested_from: string;
  document_name: string;
  document_description: string;
  category: string;
};

export const createDocumentRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as CreateDocRequestInput)
  .handler(
    async ({ data }): Promise<{ ok: boolean; blocked: boolean; blocked_reason?: string; id?: string; error?: string }> => {
      const { url, key } = getAdmin();
      if (!url || !key) return { ok: false, blocked: false, error: "db_unavailable" };
      if (!isValidUuid(data.deal_room_id)) {
        return { ok: false, blocked: false, error: "invalid_deal_room_id" };
      }
      const auth = await requireRoomMember(url, key, data.deal_room_id, data.accessToken);
      if (!auth.ok) return { ok: false, blocked: false, error: auth.error };

      const isBlocked = (BLOCKED_CATEGORIES as readonly string[]).includes(data.category);

      if (isBlocked) {
        const label = BLOCKED_CATEGORY_LABELS[data.category] ?? data.category;
        const blockedReason = `Lengdon does not facilitate sharing ${label}. This protects both parties.`;
        await sbFetch(url, key, "deal_room_document_requests", "POST", {
          deal_room_id: data.deal_room_id,
          requested_by: auth.uid,
          requested_from: data.requested_from,
          document_name: data.document_name,
          document_description: data.document_description,
          category: data.category,
          status: "blocked",
          is_blocked: true,
          blocked_reason: blockedReason,
        }).catch(() => null);
        return { ok: false, blocked: true, blocked_reason: blockedReason };
      }

      const rows = await sbFetch(url, key, "deal_room_document_requests", "POST", {
        deal_room_id: data.deal_room_id,
        requested_by: auth.uid,
        requested_from: data.requested_from,
        document_name: data.document_name,
        document_description: data.document_description,
        category: data.category,
        status: "pending",
        is_blocked: false,
      });
      await logActivity(url, key, data.deal_room_id, auth.uid, "Requested a document", {
        document_name: data.document_name,
        category: data.category,
      });
      return { ok: true, blocked: false, id: rows?.[0]?.id };
    },
  );

// ── respondToDocumentRequest ────────────────────────────────────────────────

type RespondDocRequestInput = {
  request_id: string;
  deal_room_id: string;
  accessToken: string;
  response: "provided" | "declined" | "partial";
  document_path?: string | null;
  decline_reason?: string | null;
  partial_explanation?: string | null;
};

export const respondToDocumentRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RespondDocRequestInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!isValidUuid(data.deal_room_id) || !isValidUuid(data.request_id)) {
      return { ok: false, error: "invalid_id" };
    }
    const auth = await requireRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = {
      status: data.response,
      responded_at: now,
    };
    if (data.response === "provided" || data.response === "partial") {
      if (data.document_path !== undefined) {
        patch.document_path = data.document_path;
        patch.document_uploaded_at = now;
      }
    }
    if (data.response === "declined" && data.decline_reason !== undefined) {
      patch.decline_reason = data.decline_reason;
    }
    if (data.response === "partial" && data.partial_explanation !== undefined) {
      patch.partial_explanation = data.partial_explanation;
    }

    // Fix, 11 Oct 2026, REVISED same day per review — this PATCH was
    // `id=eq.${data.request_id}` only, with no deal_room_id filter,
    // despite the membership check above only validating deal_room_id:
    // a member of room A could pass a request_id belonging to room B
    // and mutate it. The first version of this fix added a pre-check
    // GET to confirm ownership before patching, then fired the PATCH
    // with sbFetch's default return=minimal — which verifies ownership
    // at read time but never confirms the PATCH itself actually
    // affected a row, and leaves a (small, but real) TOCTOU window
    // between the two requests. Fixed properly: the PATCH itself now
    // requests return=representation via sbFetch's new preferOverride
    // param, and its own response is checked for exactly one affected
    // row — the single request that both scopes AND verifies the
    // write, with no separate pre-check and no gap between a read and
    // a write.
    const patched: any[] = await sbFetch(
      url, key,
      `deal_room_document_requests?id=eq.${data.request_id}&deal_room_id=eq.${data.deal_room_id}`,
      "PATCH", patch, "return=representation",
    ).catch(() => []);
    if (!patched || patched.length !== 1) return { ok: false, error: "not_found" };
    await logActivity(
      url,
      key,
      data.deal_room_id,
      auth.uid,
      `Responded to a document request: ${data.response}`,
      { request_id: data.request_id, response: data.response },
    );
    return { ok: true };
  });

// ── grantSectionAccess ──────────────────────────────────────────────────────

type GrantAccessInput = {
  deal_room_id: string;
  accessToken: string;
  granted_to: string;
  section: string;
};

export const grantSectionAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GrantAccessInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    // Found during the Fix 5 exhaustive interpolation sweep — this
    // function was the one call site in this file reaching
    // principalRoomMember() (and therefore its own raw deal_room_id
    // interpolation, see that function's definition above) with zero
    // prior validation. granted_to/section are written into the POST
    // body, not path-interpolated, so they're not vulnerable to the
    // same query-string-injection class — but deal_room_id is, via
    // principalRoomMember, so it's validated the same as every sibling
    // function in this file.
    if (!isValidUuid(data.deal_room_id) || !isValidUuid(data.granted_to)) {
      return { ok: false, error: "invalid_id" };
    }
    if (
      typeof data.section !== "string" ||
      !/^[a-zA-Z0-9_]{1,64}$/.test(data.section)
    ) {
      return { ok: false, error: "invalid_section" };
    }
    const auth = await principalRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const now = new Date().toISOString();
    const rows = await sbFetch(url, key, "deal_room_access_grants", "POST", {
      deal_room_id: data.deal_room_id,
      granted_by: auth.uid,
      granted_to: data.granted_to,
      section: data.section,
      granted_at: now,
    });
    await logActivity(url, key, data.deal_room_id, auth.uid, "Granted section access", {
      granted_to: data.granted_to,
      section: data.section,
    });
    return { ok: true, id: rows?.[0]?.id };
  });

// ── revokeSectionAccess ─────────────────────────────────────────────────────

type RevokeAccessInput = {
  deal_room_id: string;
  accessToken: string;
  granted_to: string;
  section: string;
};

export const revokeSectionAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RevokeAccessInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    if (!isValidUuid(data.deal_room_id) || !isValidUuid(data.granted_to)) {
      return { ok: false, error: "invalid_id" };
    }
    // section is not a UUID but is ALSO interpolated raw into the URL
    // below (same injection class) — this function has zero real
    // callers today (confirmed by grep, flagged separately), so no
    // real section value set exists to validate against; this is a
    // conservative slug-shape check (alphanumeric/underscore only, no
    // DB CHECK constraint exists for this column either) rather than
    // a specific enum, pending that enum being decided.
    if (
      typeof data.section !== "string" ||
      !/^[a-zA-Z0-9_]{1,64}$/.test(data.section)
    ) {
      return { ok: false, error: "invalid_section" };
    }
    const auth = await principalRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const now = new Date().toISOString();
    await sbFetch(
      url,
      key,
      `deal_room_access_grants?deal_room_id=eq.${data.deal_room_id}&granted_to=eq.${data.granted_to}&section=eq.${data.section}&revoked_at=is.null`,
      "PATCH",
      { revoked_at: now },
    );
    await logActivity(url, key, data.deal_room_id, auth.uid, "Revoked section access", {
      granted_to: data.granted_to,
      section: data.section,
    });
    return { ok: true };
  });

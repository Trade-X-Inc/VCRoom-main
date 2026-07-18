import { createServerFn } from "@tanstack/react-start";

export type DealStage =
  | "nda_signed"
  | "initial_review"
  | "diligence"
  | "term_sheet"
  | "closed";

export const DEAL_STAGES: DealStage[] = [
  "nda_signed",
  "initial_review",
  "diligence",
  "term_sheet",
  "closed",
];

export const STAGE_LABELS: Record<DealStage, string> = {
  nda_signed: "NDA & Profiles",
  initial_review: "Stage 1 Review",
  diligence: "Diligence",
  term_sheet: "Term Sheet",
  closed: "Closed",
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

async function sbFetch(
  url: string,
  key: string,
  path: string,
  method: string,
  body?: unknown,
) {
  const resp = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
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

// ── advanceDealStage ──────────────────────────────────────────────────────────

type AdvanceStageInput = {
  deal_room_id: string;
  to_stage: DealStage;
  actor_user_id: string;
};

export const advanceDealStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AdvanceStageInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();
    await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", {
      workflow_stage: data.to_stage,
      stage_entered_at: now,
      updated_at: now,
    });
    await logActivity(
      url,
      key,
      data.deal_room_id,
      data.actor_user_id,
      `Advanced deal to ${STAGE_LABELS[data.to_stage] ?? data.to_stage}`,
      { to_stage: data.to_stage },
    );
    return { ok: true };
  });

// ── skipMeeting ───────────────────────────────────────────────────────────────

type SkipMeetingInput = {
  deal_room_id: string;
  meeting_number: number;
  actor_user_id: string;
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
      data.actor_user_id,
      `Skipped meeting ${data.meeting_number}`,
      { meeting_number: data.meeting_number, reason: reason || null },
    );

    return { ok: true, id };
  });

// ── completeMeeting ──────────────────────────────────────────────────────────

type CompleteMeetingInput = {
  deal_room_id: string;
  meeting_number: number;
  actor_user_id: string;
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
      data.actor_user_id,
      `Marked meeting ${data.meeting_number} as done`,
      { meeting_number: data.meeting_number },
    );

    return { ok: true, id };
  });

// ── updateMeetingNotes ──────────────────────────────────────────────────────

type UpdateMeetingNotesInput = {
  deal_room_id: string;
  meeting_number: number;
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

// ── sendTermSheet ─────────────────────────────────────────────────────────────

type SendTermSheetInput = {
  deal_room_id: string;
  actor_user_id: string;
  valuation?: number | null;
  investment_amount?: number | null;
  equity_pct?: number | null;
  instrument_type?: string | null;
  pro_rata?: boolean;
  board_seat?: boolean;
  doc_path?: string | null;
};

export const sendTermSheet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SendTermSheetInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = {
      term_sheet_status: "sent",
      term_sheet_sent_at: now,
      workflow_stage: "term_sheet",
      stage_entered_at: now,
      stage2_unlocked: true,
      stage2_unlocked_at: now,
      updated_at: now,
    };
    if (data.valuation !== undefined) patch.term_sheet_valuation = data.valuation;
    if (data.investment_amount !== undefined) patch.term_sheet_investment_amount = data.investment_amount;
    if (data.equity_pct !== undefined) patch.term_sheet_equity_pct = data.equity_pct;
    if (data.instrument_type !== undefined) patch.term_sheet_type = data.instrument_type;
    if (data.pro_rata !== undefined) patch.term_sheet_pro_rata = data.pro_rata;
    if (data.board_seat !== undefined) patch.term_sheet_board_seat = data.board_seat;
    if (data.doc_path !== undefined) patch.term_sheet_doc_path = data.doc_path;

    await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", patch);
    await logActivity(url, key, data.deal_room_id, data.actor_user_id, "Sent a term sheet", {
      amount: data.investment_amount,
      valuation: data.valuation,
    });
    return { ok: true };
  });

// ── respondToTermSheet (founder) ────────────────────────────────────────────

type RespondTermSheetInput = {
  deal_room_id: string;
  actor_user_id: string;
  response: "accepted" | "countered" | "rejected";
};

export const respondToTermSheet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RespondTermSheetInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();

    const patch: Record<string, unknown> = {
      term_sheet_status: data.response,
      updated_at: now,
    };
    if (data.response === "accepted") {
      patch.term_sheet_accepted_at = now;
      patch.workflow_stage = "closed";
      patch.stage_entered_at = now;
      patch.closed_at_workflow = now;
    }
    await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", patch);
    await logActivity(
      url,
      key,
      data.deal_room_id,
      data.actor_user_id,
      data.response === "accepted"
        ? "Accepted the term sheet"
        : data.response === "countered"
          ? "Requested changes to the term sheet"
          : "Declined the term sheet",
      { response: data.response },
    );
    return { ok: true };
  });

// ── createDocumentRequest ──────────────────────────────────────────────────

type CreateDocRequestInput = {
  deal_room_id: string;
  requested_by: string;
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

      const isBlocked = (BLOCKED_CATEGORIES as readonly string[]).includes(data.category);

      if (isBlocked) {
        const label = BLOCKED_CATEGORY_LABELS[data.category] ?? data.category;
        const blockedReason = `Hockystick does not facilitate sharing ${label}. This protects both parties.`;
        await sbFetch(url, key, "deal_room_document_requests", "POST", {
          deal_room_id: data.deal_room_id,
          requested_by: data.requested_by,
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
        requested_by: data.requested_by,
        requested_from: data.requested_from,
        document_name: data.document_name,
        document_description: data.document_description,
        category: data.category,
        status: "pending",
        is_blocked: false,
      });
      await logActivity(url, key, data.deal_room_id, data.requested_by, "Requested a document", {
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
  actor_user_id: string;
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

    await sbFetch(url, key, `deal_room_document_requests?id=eq.${data.request_id}`, "PATCH", patch);
    await logActivity(
      url,
      key,
      data.deal_room_id,
      data.actor_user_id,
      `Responded to a document request: ${data.response}`,
      { request_id: data.request_id, response: data.response },
    );
    return { ok: true };
  });

// ── passDeal ──────────────────────────────────────────────────────────────────

type PassDealInput = {
  deal_room_id: string;
  actor_user_id: string;
  reason_category: string;
  context?: string;
  reconsider_if?: string;
};

export const passDeal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as PassDealInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();

    await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", {
      workflow_stage: "closed",
      closed_at_workflow: now,
      stage_entered_at: now,
      updated_at: now,
    });
    await logActivity(url, key, data.deal_room_id, data.actor_user_id, "Investor passed on deal", {
      reason_category: data.reason_category,
      context: data.context ?? null,
      reconsider_if: data.reconsider_if ?? null,
    });
    return { ok: true };
  });

// ── grantSectionAccess ──────────────────────────────────────────────────────

type GrantAccessInput = {
  deal_room_id: string;
  granted_by: string;
  granted_to: string;
  section: string;
};

export const grantSectionAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GrantAccessInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();
    const rows = await sbFetch(url, key, "deal_room_access_grants", "POST", {
      deal_room_id: data.deal_room_id,
      granted_by: data.granted_by,
      granted_to: data.granted_to,
      section: data.section,
      granted_at: now,
    });
    await logActivity(url, key, data.deal_room_id, data.granted_by, "Granted section access", {
      granted_to: data.granted_to,
      section: data.section,
    });
    return { ok: true, id: rows?.[0]?.id };
  });

// ── revokeSectionAccess ─────────────────────────────────────────────────────

type RevokeAccessInput = {
  deal_room_id: string;
  granted_by: string;
  granted_to: string;
  section: string;
};

export const revokeSectionAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as RevokeAccessInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();
    await sbFetch(
      url,
      key,
      `deal_room_access_grants?deal_room_id=eq.${data.deal_room_id}&granted_to=eq.${data.granted_to}&section=eq.${data.section}&revoked_at=is.null`,
      "PATCH",
      { revoked_at: now },
    );
    await logActivity(url, key, data.deal_room_id, data.granted_by, "Revoked section access", {
      granted_to: data.granted_to,
      section: data.section,
    });
    return { ok: true };
  });

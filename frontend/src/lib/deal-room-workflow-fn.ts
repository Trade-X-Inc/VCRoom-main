import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/require-user-fn";

export type TermSheetStatus = "sent" | "countered" | "rejected" | "accepted" | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAdmin() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

async function sbFetch(url: string, key: string, path: string, method: string, body?: unknown) {
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
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
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

// ── Server fn: create or update a meeting ─────────────────────────────────────

// R14B: the 5-stage interview sequence, in meeting_number order.
export const INTERVIEW_STAGE_SEQUENCE = [
  "introduction",
  "product_demo",
  "financial_discussion",
  "terms_discussion",
  "investment_terms",
] as const;

type UpsertMeetingInput = {
  deal_room_id: string;
  meeting_number: 1 | 2 | 3 | 4 | 5;
  scheduled_at?: string | null;
  completed_at?: string | null;
  meeting_type?: string; // 'video' | 'in_person' (or 'skipped' via skipMeeting)
  // R14B: routed to deal_room_meeting_private_notes — never a column write.
  notes_investor?: string | null;
  notes_shared?: string | null;
  action_items?: string[];
  accessToken: string;
};

export const upsertDealRoomMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as UpsertMeetingInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const auth = await requireRoomMember(url, key, data.deal_room_id, data.accessToken);
    if (!auth.ok) return { ok: false, error: auth.error };
    const now = new Date().toISOString();

    const existing: any[] = await sbFetch(url, key,
      `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&meeting_number=eq.${data.meeting_number}&select=id,daily_room_name,scheduled_at`,
      "GET"
    ).catch(() => []);

    const payload: Record<string, unknown> = {};
    if (data.scheduled_at !== undefined) payload.scheduled_at = data.scheduled_at;
    if (data.completed_at !== undefined) payload.completed_at = data.completed_at;
    if (data.meeting_type !== undefined) payload.meeting_type = data.meeting_type;
    if (data.notes_shared !== undefined) payload.notes_shared = data.notes_shared;
    if (data.action_items !== undefined) payload.action_items = data.action_items;

    let id: string;
    if (existing?.length) {
      id = existing[0].id;
      await sbFetch(url, key,
        `deal_room_meetings?id=eq.${id}`,
        "PATCH",
        payload
      );

      // Reschedule of a meeting that already has a Daily room: PATCH the
      // room's exp to the new start + 3h so the idempotent room create
      // never hands back a room that expires before the meeting starts.
      if (data.scheduled_at && existing[0].daily_room_name && data.scheduled_at !== existing[0].scheduled_at) {
        const cfEnv = (globalThis as any).__cf_env || {};
        const dailyKey = cfEnv.DAILY_API_KEY || "";
        if (dailyKey) {
          const { syncDailyRoomExpiry } = await import("@/lib/interview-fn");
          await syncDailyRoomExpiry(
            dailyKey,
            existing[0].daily_room_name,
            Math.max(Math.floor(new Date(data.scheduled_at).getTime() / 1000), Math.floor(Date.now() / 1000)),
          ).catch(() => false);
        }
      }
    } else {
      const rows = await sbFetch(url, key, "deal_room_meetings", "POST", {
        deal_room_id: data.deal_room_id,
        meeting_number: data.meeting_number,
        stage_slug: INTERVIEW_STAGE_SEQUENCE[data.meeting_number - 1],
        ...payload,
      });
      id = rows?.[0]?.id;
    }

    if (data.notes_investor !== undefined && id) {
      const { upsertMeetingPrivateNote } = await import("@/lib/interview-fn");
      await upsertMeetingPrivateNote(url, key, id, data.notes_investor ?? null);
    }

    // If completing: increment meetings_completed on deal room
    if (data.completed_at) {
      const rooms: any[] = await sbFetch(url, key,
        `deal_rooms?id=eq.${data.deal_room_id}&select=meetings_completed`,
        "GET"
      ).catch(() => []);
      const current = rooms?.[0]?.meetings_completed ?? 0;
      await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", {
        meetings_completed: current + 1,
        updated_at: now,
      });
    }

    return { ok: true, id };
  });

// ── Server fn: get full workflow state ────────────────────────────────────────

type GetWorkflowInput = { deal_room_id: string };

export type WorkflowState = {
  workflow_stage: string | null;
  stage_entered_at: string | null;
  meetings_completed: number;
  meetings_max: number;
  stage2_unlocked: boolean;
  stage2_unlocked_at: string | null;
  term_sheet_status: TermSheetStatus;
  term_sheet_sent_at: string | null;
  term_sheet_accepted_at: string | null;
  term_sheet_valuation: number | null;
  term_sheet_investment_amount: number | null;
  term_sheet_equity_pct: number | null;
  term_sheet_type: string | null;
  term_sheet_pro_rata: boolean | null;
  term_sheet_board_seat: boolean | null;
  term_sheet_doc_path: string | null;
  stage1_complete: boolean | null;
  closed_at_workflow: string | null;
  meetings: Array<{
    id: string;
    meeting_number: number;
    stage_slug: string;
    meeting_type: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    notes_shared: string | null;
    action_items: string[];
    daily_room_name: string | null;
    daily_room_url: string | null;
  }>;
};

export const getDealRoomWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GetWorkflowInput)
  .handler(async ({ data }): Promise<{ data: WorkflowState | null }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { data: null };

    const [rooms, meetings] = await Promise.all([
      sbFetch(url, key,
        `deal_rooms?id=eq.${data.deal_room_id}&select=workflow_stage,stage_entered_at,meetings_completed,meetings_max,stage2_unlocked,stage2_unlocked_at,term_sheet_status,term_sheet_sent_at,term_sheet_accepted_at,term_sheet_valuation,term_sheet_investment_amount,term_sheet_equity_pct,term_sheet_type,term_sheet_pro_rata,term_sheet_board_seat,term_sheet_doc_path,stage1_complete,closed_at_workflow`,
        "GET"
      ).catch(() => []),
      // R14B: notes_investor removed from the select — the column is gone
      // (moved to deal_room_meeting_private_notes); with it in the list this
      // query 400'd and the .catch silently emptied every meetings calendar.
      sbFetch(url, key,
        `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&select=id,meeting_number,stage_slug,meeting_type,scheduled_at,completed_at,notes_shared,action_items,daily_room_name,daily_room_url&order=meeting_number.asc`,
        "GET"
      ).catch(() => []),
    ]);

    if (!rooms?.length) return { data: null };
    const r = rooms[0];
    return {
      data: {
        workflow_stage: r.workflow_stage ?? "nda_signed",
        stage_entered_at: r.stage_entered_at,
        meetings_completed: r.meetings_completed ?? 0,
        meetings_max: r.meetings_max ?? 3,
        stage2_unlocked: r.stage2_unlocked ?? false,
        stage2_unlocked_at: r.stage2_unlocked_at,
        term_sheet_status: r.term_sheet_status,
        term_sheet_sent_at: r.term_sheet_sent_at,
        term_sheet_accepted_at: r.term_sheet_accepted_at,
        term_sheet_valuation: r.term_sheet_valuation,
        term_sheet_investment_amount: r.term_sheet_investment_amount,
        term_sheet_equity_pct: r.term_sheet_equity_pct,
        term_sheet_type: r.term_sheet_type,
        term_sheet_pro_rata: r.term_sheet_pro_rata,
        term_sheet_board_seat: r.term_sheet_board_seat,
        term_sheet_doc_path: r.term_sheet_doc_path,
        stage1_complete: r.stage1_complete,
        closed_at_workflow: r.closed_at_workflow,
        meetings: meetings ?? [],
      },
    };
  });

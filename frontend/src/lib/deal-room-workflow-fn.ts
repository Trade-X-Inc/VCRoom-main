import { createServerFn } from "@tanstack/react-start";

export type WorkflowStage =
  | "nda_signed"
  | "stage1_review"
  | "meetings"
  | "stage2_diligence"
  | "term_sheet"
  | "closed";

export type TermSheetStatus = "sent" | "countered" | "rejected" | "accepted" | null;

export const WORKFLOW_STAGES: WorkflowStage[] = [
  "nda_signed",
  "stage1_review",
  "meetings",
  "stage2_diligence",
  "term_sheet",
  "closed",
];

export const STAGE_LABELS: Record<WorkflowStage, string> = {
  nda_signed: "NDA Signed",
  stage1_review: "Stage 1 Review",
  meetings: "Meetings",
  stage2_diligence: "Full Diligence",
  term_sheet: "Term Sheet",
  closed: "Closed",
};

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

// ── Server fn: advance workflow stage ────────────────────────────────────────

type AdvanceStageInput = {
  deal_room_id: string;
  to_stage: WorkflowStage;
  actor_user_id: string;
};

export const advanceWorkflowStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as AdvanceStageInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      workflow_stage: data.to_stage,
      stage_entered_at: now,
      updated_at: now,
    };
    if (data.to_stage === "stage1_review") patch.stage1_complete = false;
    await sbFetch(url, key, `deal_rooms?id=eq.${data.deal_room_id}`, "PATCH", patch);
    // Log activity
    await sbFetch(url, key, "activity_log", "POST", {
      deal_room_id: data.deal_room_id,
      actor_user_id: data.actor_user_id,
      actor_name: "Investor",
      action: `Advanced deal to ${STAGE_LABELS[data.to_stage]}`,
      metadata: { to_stage: data.to_stage },
    }).catch(() => null);
    return { ok: true };
  });

// ── Server fn: create or update a meeting ─────────────────────────────────────

type UpsertMeetingInput = {
  deal_room_id: string;
  meeting_number: 1 | 2 | 3;
  scheduled_at?: string | null;
  completed_at?: string | null;
  notes_investor?: string | null;
  notes_shared?: string | null;
  action_items?: string[];
  actor_user_id: string;
};

export const upsertDealRoomMeeting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as UpsertMeetingInput)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { url, key } = getAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };
    const now = new Date().toISOString();

    const existing: any[] = await sbFetch(url, key,
      `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&meeting_number=eq.${data.meeting_number}&select=id`,
      "GET"
    ).catch(() => []);

    const payload: Record<string, unknown> = {};
    if (data.scheduled_at !== undefined) payload.scheduled_at = data.scheduled_at;
    if (data.completed_at !== undefined) payload.completed_at = data.completed_at;
    if (data.notes_investor !== undefined) payload.notes_investor = data.notes_investor;
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
    } else {
      const rows = await sbFetch(url, key, "deal_room_meetings", "POST", {
        deal_room_id: data.deal_room_id,
        meeting_number: data.meeting_number,
        ...payload,
      });
      id = rows?.[0]?.id;
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

// ── Server fn: send term sheet ────────────────────────────────────────────────

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
      // Sending the term sheet triggers Stage 4 unlock and workflow advance
      workflow_stage: "stage2_diligence",
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

    // Log activity
    await sbFetch(url, key, "activity_log", "POST", {
      deal_room_id: data.deal_room_id,
      actor_user_id: data.actor_user_id,
      actor_name: "Investor",
      action: "Sent a term sheet",
      metadata: { amount: data.investment_amount, valuation: data.valuation },
    }).catch(() => null);

    return { ok: true };
  });

// ── Server fn: respond to term sheet (founder) ────────────────────────────────

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

    await sbFetch(url, key, "activity_log", "POST", {
      deal_room_id: data.deal_room_id,
      actor_user_id: data.actor_user_id,
      actor_name: "Founder",
      action: data.response === "accepted"
        ? "Accepted the term sheet"
        : data.response === "countered"
        ? "Requested changes to the term sheet"
        : "Declined the term sheet",
      metadata: { response: data.response },
    }).catch(() => null);

    return { ok: true };
  });

// ── Server fn: get full workflow state ────────────────────────────────────────

type GetWorkflowInput = { deal_room_id: string };

export type WorkflowState = {
  workflow_stage: WorkflowStage | null;
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
    scheduled_at: string | null;
    completed_at: string | null;
    notes_investor: string | null;
    notes_shared: string | null;
    action_items: string[];
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
      sbFetch(url, key,
        `deal_room_meetings?deal_room_id=eq.${data.deal_room_id}&select=id,meeting_number,scheduled_at,completed_at,notes_investor,notes_shared,action_items&order=meeting_number.asc`,
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

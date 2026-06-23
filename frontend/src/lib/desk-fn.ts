import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ChainPhase = "single" | "autonomous_done" | "awaiting_checkpoint" | "completed" | "dismissed";

export type DeskTask = {
  id: string;
  userId: string;
  role: "founder" | "investor";
  taskType: string;
  chainPhase: ChainPhase;
  autonomousSummary: string | null;
  draftContent: string | null;
  checkpointReason: string | null;
  requiresExternalAction: boolean;
  title: string;
  description: string | null;
  priority: "high" | "normal" | "low";
  actionLabel: string | null;
  actionUrl: string | null;
  status: "open" | "snoozed" | "done";
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  createdAt: string;
  completedAt: string | null;
};

function mapRow(r: any): DeskTask {
  return {
    id: r.id,
    userId: r.user_id,
    role: r.role,
    taskType: r.task_type,
    chainPhase: r.chain_phase,
    autonomousSummary: r.autonomous_summary ?? null,
    draftContent: r.draft_content ?? null,
    checkpointReason: r.checkpoint_reason ?? null,
    requiresExternalAction: r.requires_external_action ?? false,
    title: r.title,
    description: r.description ?? null,
    priority: r.priority ?? "normal",
    actionLabel: r.action_label ?? null,
    actionUrl: r.action_url ?? null,
    status: r.status,
    relatedEntityId: r.related_entity_id ?? null,
    relatedEntityType: r.related_entity_type ?? null,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
  };
}

function adminClient() {
  const url = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase config");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Stage detection ───────────────────────────────────────────────────────────

export type FounderStage =
  | "profile_incomplete"
  | "profile_done_no_visibility"
  | "getting_seen_no_traction"
  | "requests_no_deal_room"
  | "deal_room_active";

type StageInput = { startupId: string };

export const getFounderStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): StageInput => d as StageInput)
  .handler(async ({ data }): Promise<FounderStage> => {
    const admin = adminClient();

    // All 4 queries in parallel — use real data, no reimplementation
    const [sessionRes, viewsRes, requestsRes, roomsRes] = await Promise.all([
      admin
        .from("profile_builder_sessions")
        .select("status")
        .eq("startup_id", data.startupId)
        .eq("status", "confirmed")
        .maybeSingle(),
      admin
        .from("document_views")
        .select("id", { count: "exact", head: true })
        .in(
          "deal_room_id",
          admin
            .from("deal_rooms")
            .select("id")
            .eq("startup_id", data.startupId) as any,
        ),
      admin
        .from("discovery_requests")
        .select("id", { count: "exact", head: true })
        .eq("startup_id", data.startupId),
      admin
        .from("deal_rooms")
        .select("id", { count: "exact", head: true })
        .eq("startup_id", data.startupId),
    ]);

    const isConfirmed = !!sessionRes.data;
    const viewCount = viewsRes.count ?? 0;
    const requestCount = requestsRes.count ?? 0;
    const roomCount = roomsRes.count ?? 0;

    if (!isConfirmed) return "profile_incomplete";
    if (roomCount > 0) return "deal_room_active";
    if (requestCount > 0) return "requests_no_deal_room";
    if (viewCount > 0) return "getting_seen_no_traction";
    return "profile_done_no_visibility";
  });

// ── Fetch tasks for a user ────────────────────────────────────────────────────

type FetchInput = { userId: string; role: "founder" | "investor" };

export const getDeskTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): FetchInput => d as FetchInput)
  .handler(async ({ data }): Promise<DeskTask[]> => {
    const admin = adminClient();
    const now = new Date().toISOString();
    const { data: rows, error } = await admin
      .from("desk_tasks")
      .select("*")
      .eq("user_id", data.userId)
      .eq("role", data.role)
      .eq("status", "open")
      .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
      .order("priority", { ascending: false }) // high > normal > low
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return (rows ?? []).map(mapRow);
  });

// ── Fetch recently resolved tasks ─────────────────────────────────────────────

export const getResolvedDeskTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): FetchInput => d as FetchInput)
  .handler(async ({ data }): Promise<DeskTask[]> => {
    const admin = adminClient();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await admin
      .from("desk_tasks")
      .select("*")
      .eq("user_id", data.userId)
      .eq("role", data.role)
      .in("status", ["done"])
      .gte("completed_at", sevenDaysAgo)
      .order("completed_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return (rows ?? []).map(mapRow);
  });

// ── Dismiss / snooze / mark done ─────────────────────────────────────────────

type ActionInput = { taskId: string; userId: string; action: "dismiss" | "done" | "snooze" };

export const updateDeskTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ActionInput => d as ActionInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const admin = adminClient();
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};
    if (data.action === "dismiss") {
      update.status = "done";
      update.chain_phase = "dismissed";
      update.completed_at = now;
    } else if (data.action === "done") {
      update.status = "done";
      update.chain_phase = "completed";
      update.completed_at = now;
    } else if (data.action === "snooze") {
      update.status = "snoozed";
      update.snoozed_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    }
    const { error } = await admin
      .from("desk_tasks")
      .update(update)
      .eq("id", data.taskId)
      .eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

// ── Update draft content ──────────────────────────────────────────────────────

type UpdateDraftInput = { taskId: string; userId: string; draftContent: string };

export const updateDeskTaskDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): UpdateDraftInput => d as UpdateDraftInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const admin = adminClient();
    const { error } = await admin
      .from("desk_tasks")
      .update({ draft_content: data.draftContent })
      .eq("id", data.taskId)
      .eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

// ── Checkpoint: complete + send email ─────────────────────────────────────────

type CheckpointInput = {
  taskId: string;
  userId: string;
  taskType: string;
  draftContent: string;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
};

export const completeCheckpointTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): CheckpointInput => d as CheckpointInput)
  .handler(async ({ data }): Promise<{ ok: boolean; messageId?: string; error?: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const resendKey = cfEnv.RESEND_API_KEY || getEnvVar("RESEND_API_KEY") || "";

    if (!resendKey) {
      return { ok: false, error: "Email service not configured" };
    }

    // Send via Resend
    const subject = data.taskType === "follow_up_investor"
      ? `Following up — ${data.senderName}`
      : `Message from ${data.senderName}`;

    const html = buildEmailHtml(data.senderName, data.draftContent);

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Hockystick <noreply@hockystick.app>",
        to: [data.recipientEmail],
        reply_to: "hello@hockystick.app",
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("[desk-fn] Resend error:", resp.status, body);
      return { ok: false, error: `Email failed: ${resp.status}` };
    }

    const sent = await resp.json() as { id?: string };

    // Mark task completed
    const admin = adminClient();
    await admin.from("desk_tasks").update({
      status: "done",
      chain_phase: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", data.taskId).eq("user_id", data.userId);

    return { ok: true, messageId: sent.id };
  });

function buildEmailHtml(senderName: string, body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((l) => `<p style="margin:0 0 12px;color:#3f3f46;font-size:15px;line-height:1.7;">${l || "&nbsp;"}</p>`)
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:0;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
<div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<div style="background:#0a0a0b;padding:28px 32px;text-align:center;">
  <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Hocky<span style="color:#7c3aed;">stick</span></div>
  <div style="color:#a1a1aa;font-size:12px;margin-top:4px;">Where deals get done</div>
</div>
<div style="padding:32px;">${escaped}</div>
<div style="padding:16px 32px 24px;text-align:center;background:#fafafa;border-top:1px solid #e4e4e7;">
  <p style="color:#71717a;font-size:12px;margin:0;">Sent via <a href="https://hockystick.app" style="color:#7c3aed;">hockystick.app</a></p>
</div>
</div></div></body></html>`;
}

// ── Seed playbook on profile confirmation (called once, immediately) ──────────
// Invokes the edge function's single-founder fast path so the desk has real
// content the moment the founder lands there — no overnight cron wait.

type SeedInput = { founderId: string; startupId: string };

export const seedFounderPlaybook = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): SeedInput => d as SeedInput)
  .handler(async ({ data }): Promise<{ ok: boolean; tasksGenerated?: number; error?: string }> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return { ok: false, error: "Missing config" };

    try {
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/daily-desk-cron?founder_id=${encodeURIComponent(data.founderId)}&startup_id=${encodeURIComponent(data.startupId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!resp.ok) {
        const body = await resp.text();
        console.error("[seedFounderPlaybook] edge fn error:", resp.status, body);
        return { ok: false, error: `Edge function returned ${resp.status}` };
      }
      const result = await resp.json() as { ok: boolean; playbook_tasks_generated?: number };
      return { ok: true, tasksGenerated: result.playbook_tasks_generated ?? 0 };
    } catch (e: any) {
      console.error("[seedFounderPlaybook] fetch error:", e.message);
      return { ok: false, error: e.message };
    }
  });

// ── Trigger the cron manually (admin / test endpoint) ────────────────────────

type TriggerInput = { adminSecret: string };

export const triggerDeskCron = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): TriggerInput => d as TriggerInput)
  .handler(async ({ data }): Promise<{ ok: boolean; report?: unknown; error?: string }> => {
    const cfEnv = (globalThis as any).__cf_env || {};
    const expectedSecret = cfEnv.ADMIN_SECRET_KEY || getEnvVar("ADMIN_SECRET_KEY") || "";
    if (!expectedSecret || data.adminSecret !== expectedSecret) {
      return { ok: false, error: "Unauthorized" };
    }

    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return { ok: false, error: "Missing config" };

    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/daily-desk-cron`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      });
      const report = await resp.json();
      return { ok: resp.ok, report };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });

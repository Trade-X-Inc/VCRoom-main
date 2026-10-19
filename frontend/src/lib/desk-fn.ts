import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getEnvVar } from "@/lib/env";
import { requireUser } from "@/lib/require-user-fn";

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

type StageInput = { startupId: string; accessToken: string };

export const getFounderStage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): StageInput => d as StageInput)
  .handler(async ({ data }): Promise<FounderStage> => {
    const admin = adminClient();

    // Identity from the token — never trust a client-supplied startupId
    // without verifying ownership. See CLAUDE.md §51.
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return "profile_incomplete";
    const { data: owned } = await admin.from("startups").select("id").eq("id", data.startupId).eq("founder_id", auth.uid).maybeSingle();
    if (!owned) return "profile_incomplete";

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

type FetchInput = { accessToken: string; role: "founder" | "investor" };

export const getDeskTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): FetchInput => d as FetchInput)
  .handler(async ({ data }): Promise<DeskTask[]> => {
    const admin = adminClient();
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return [];
    const now = new Date().toISOString();
    const { data: rows, error } = await admin
      .from("desk_tasks")
      .select("*")
      .eq("user_id", auth.uid)
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
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await admin
      .from("desk_tasks")
      .select("*")
      .eq("user_id", auth.uid)
      .eq("role", data.role)
      .in("status", ["done"])
      .gte("completed_at", sevenDaysAgo)
      .order("completed_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return (rows ?? []).map(mapRow);
  });

// ── Dismiss / snooze / mark done ─────────────────────────────────────────────

type ActionInput = { taskId: string; accessToken: string; action: "dismiss" | "done" | "snooze" };

export const updateDeskTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): ActionInput => d as ActionInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const admin = adminClient();
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return { ok: false };
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
      .eq("user_id", auth.uid);
    if (error) throw error;
    return { ok: true };
  });

// ── Update draft content ──────────────────────────────────────────────────────

type UpdateDraftInput = { taskId: string; accessToken: string; draftContent: string };

export const updateDeskTaskDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): UpdateDraftInput => d as UpdateDraftInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const admin = adminClient();
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return { ok: false };
    const { error } = await admin
      .from("desk_tasks")
      .update({ draft_content: data.draftContent })
      .eq("id", data.taskId)
      .eq("user_id", auth.uid);
    if (error) throw error;
    return { ok: true };
  });

// completeCheckpointTask (send a drafted message to a recipient taken from the request) was removed on 19 Oct 2026:
// zero callers, and an authenticated user could address it to any email. CLAUDE.md §20.23, policy D.

// ── Seed playbook on profile confirmation (called once, immediately) ──────────
// Invokes the edge function's single-founder fast path so the desk has real
// content the moment the founder lands there — no overnight cron wait.

type SeedInput = { accessToken: string; startupId: string };

export const seedFounderPlaybook = createServerFn({ method: "POST" })
  .inputValidator((d: unknown): SeedInput => d as SeedInput)
  .handler(async ({ data }): Promise<{ ok: boolean; tasksGenerated?: number; error?: string }> => {
    const supabaseUrl = getEnvVar("SUPABASE_URL") || getEnvVar("VITE_SUPABASE_URL");
    // Presence-only check, per the Fix 8 review: the service-role key is
    // never forwarded from this function any more (see the 11 Oct 2026
    // comment below on the Authorization header) — daily-desk-cron needs
    // its own copy of this key configured in ITS OWN environment to do
    // its privileged writes, so this gate stays as a config sanity check,
    // not because the value is used here.
    const hasServiceRoleKeyConfigured = !!getEnvVar(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    if (!supabaseUrl || !hasServiceRoleKeyConfigured) {
      return { ok: false, error: "Missing config" };
    }

    // Identity from the token — never trust a client-supplied founderId.
    // See CLAUDE.md §51.
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return { ok: false, error: "not_authenticated" };
    const admin = adminClient();
    const { data: owned } = await admin.from("startups").select("id").eq("id", data.startupId).eq("founder_id", auth.uid).maybeSingle();
    if (!owned) return { ok: false, error: "not_authorized" };

    try {
      // Fix, 11 Oct 2026 — this used to send the SERVICE-ROLE key as the
      // bearer token. daily-desk-cron's fast path now derives identity via
      // resolveUid(), which verifies the bearer against /auth/v1/user — a
      // service-role key has no `sub` claim and would be rejected outright,
      // breaking this exact call. Forward the caller's OWN access token
      // instead (already verified above via requireUser, and the
      // founder_id query param is now purely informational — the edge
      // function derives its own uid from this same token and ignores the
      // query param for identity purposes). The service-role key stays out
      // of this request entirely; the edge function still writes with its
      // own privileged client, built from its own env var, independent of
      // whatever bearer token arrives.
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/daily-desk-cron?founder_id=${encodeURIComponent(auth.uid)}&startup_id=${encodeURIComponent(data.startupId)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
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

// triggerDeskCron removed 11 Aug 2026 — zero callers anywhere in the frontend,
// and its target (daily-desk-cron's batch pass) had every scoring computation
// removed the same day (see CLAUDE.md §19c). An unused admin escape hatch to a
// function that no longer does what its name implied is exactly the
// ambiguous-leftover pattern this session repeatedly found and had to
// re-diagnose. If a manual trigger for the fast path is needed later, add one
// deliberately, scoped to what it actually does then.

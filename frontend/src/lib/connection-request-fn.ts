import { createServerFn } from "@tanstack/react-start";

// ─────────────────────────────────────────────────────────────────────────────
// Connection request → deal room flow.
//
// Confirm-first rule (architecture doc):
// - sendConnectionRequest    IMMEDIATE     (own request row + notification)
// - approveConnectionRequest CONFIRM-FIRST (creates a deal room visible to the
//                                           investor — caller must show a
//                                           confirmation card before calling)
// - declineConnectionRequest IMMEDIATE     (own state; investor sees a generic
//                                           message, never the reason)
//
// All three verify the caller's identity from their access token — never from
// a client-supplied user id.
// ─────────────────────────────────────────────────────────────────────────────

type SendInput = { userAccessToken: string; targetStartupId: string; message?: string };
type ApproveInput = { userAccessToken: string; requestId: string };
type DeclineInput = { userAccessToken: string; requestId: string };

function getEnv() {
  const cfEnv = (globalThis as any).__cf_env || {};
  const url = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || (import.meta.env as any).VITE_SUPABASE_URL || "";
  const key = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url, key };
}

async function sbFetch(url: string, key: string, path: string, method: string, body?: unknown, prefer?: string) {
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

async function notify(url: string, key: string, row: {
  user_id: string; kind: string; title: string; body: string; action_url?: string | null; meta?: Record<string, unknown>;
}) {
  await sbFetch(url, key, "notifications", "POST", { ...row, read: false }, "return=minimal").catch(() => null);
}

// ── 1. Send a connection request (IMMEDIATE) ─────────────────────────────────

export const sendConnectionRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as SendInput)
  .handler(async ({ data }): Promise<{ ok: boolean; requestId?: string; status?: string; error?: string }> => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };

    // Duplicate guard — one live request per investor+startup
    const existing: any[] = await sbFetch(
      url, key,
      `discovery_requests?investor_id=eq.${uid}&startup_id=eq.${data.targetStartupId}&status=in.(pending,approved,deal_room_created)&select=id,status`,
      "GET"
    ).catch(() => []);
    if (existing?.length) {
      return { ok: false, error: "already_exists", status: existing[0].status, requestId: existing[0].id };
    }

    const startups: any[] = await sbFetch(
      url, key,
      `startups?id=eq.${data.targetStartupId}&select=id,founder_id,company_name,sector,stage,country`,
      "GET"
    ).catch(() => []);
    const startup = startups?.[0];
    if (!startup) return { ok: false, error: "startup_not_found" };

    const profiles: any[] = await sbFetch(
      url, key,
      `investor_profiles?user_id=eq.${uid}&select=your_name,fund_name`,
      "GET"
    ).catch(() => []);
    const investorName = profiles?.[0]?.your_name ?? "An investor";
    const fundName = profiles?.[0]?.fund_name ?? null;

    const message = (data.message ?? "").trim().slice(0, 200) || null;

    const inserted: any[] = await sbFetch(url, key, "discovery_requests", "POST", {
      investor_id: uid,
      startup_id: data.targetStartupId,
      status: "pending",
      stage: 1,
      message,
    });
    const requestId = inserted?.[0]?.id;
    if (!requestId) return { ok: false, error: "insert_failed" };

    // Auto-create the vc_lead on the founder's side (same behavior the
    // directory Connect button had client-side) and link it back.
    try {
      const leads: any[] = await sbFetch(url, key, "vc_leads", "POST", {
        founder_id: startup.founder_id,
        investor_name: investorName,
        firm_name: fundName,
        sector: startup.sector,
        stage: startup.stage,
        geography: startup.country,
        status: "New",
        source: "Hockystick",
        discovery_request_id: requestId,
      });
      if (leads?.[0]?.id) {
        await sbFetch(url, key, `discovery_requests?id=eq.${requestId}`, "PATCH", { vc_lead_id: leads[0].id });
      }
    } catch {
      // non-fatal — the request itself is what matters
    }

    await notify(url, key, {
      user_id: startup.founder_id,
      kind: "connection_request",
      title: `${investorName} wants to connect`,
      body: message ?? `${investorName}${fundName ? ` from ${fundName}` : ""} requested access to your deal room.`,
      action_url: "/app/connections",
      meta: { request_id: requestId, startup_id: startup.id },
    });

    return { ok: true, requestId, status: "pending" };
  });

// ── 2. Approve → auto-create deal room (CONFIRM-FIRST) ──────────────────────

export const approveConnectionRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as ApproveInput)
  .handler(async ({ data }): Promise<{ ok: boolean; dealRoomId?: string; error?: string }> => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };

    const reqs: any[] = await sbFetch(
      url, key,
      `discovery_requests?id=eq.${data.requestId}&select=id,investor_id,startup_id,status,deal_room_id,vc_lead_id`,
      "GET"
    ).catch(() => []);
    const request = reqs?.[0];
    if (!request) return { ok: false, error: "request_not_found" };

    // Idempotent: room already created for this request
    if (request.status === "deal_room_created" && request.deal_room_id) {
      return { ok: true, dealRoomId: request.deal_room_id };
    }

    const startups: any[] = await sbFetch(
      url, key,
      `startups?id=eq.${request.startup_id}&select=id,founder_id,company_name`,
      "GET"
    ).catch(() => []);
    const startup = startups?.[0];
    if (!startup) return { ok: false, error: "startup_not_found" };
    // The auto-create mechanism NEVER runs without the target founder acting.
    if (startup.founder_id !== uid) return { ok: false, error: "not_authorized" };

    const [profiles, users]: [any[], any[]] = await Promise.all([
      sbFetch(url, key, `investor_profiles?user_id=eq.${request.investor_id}&select=your_name,fund_name`, "GET").catch(() => []),
      sbFetch(url, key, `users?id=eq.${request.investor_id}&select=full_name,email`, "GET").catch(() => []),
    ]);
    const investorName = profiles?.[0]?.your_name ?? users?.[0]?.full_name ?? "Investor";
    const fundName = profiles?.[0]?.fund_name ?? null;
    const investorEmail = users?.[0]?.email ?? null;

    // Create the deal room at the Information Vault stage — the NDA gate on
    // the deal room page fires automatically for any member without an
    // nda_acceptances row, so no extra gating is needed here.
    const rooms: any[] = await sbFetch(url, key, "deal_rooms", "POST", {
      startup_id: startup.id,
      status: "active",
      workflow_stage: "information_vault",
      investor_name: investorName,
      investor_company: fundName,
      investor_email: investorEmail,
      investor_user_id: request.investor_id,
      created_by: uid,
    });
    const dealRoomId = rooms?.[0]?.id;
    if (!dealRoomId) return { ok: false, error: "deal_room_insert_failed" };

    await sbFetch(url, key, "deal_room_members", "POST", [
      { deal_room_id: dealRoomId, user_id: uid, role: "founder" },
      { deal_room_id: dealRoomId, user_id: request.investor_id, role: "investor", invited_by: uid },
    ], "return=minimal").catch(() => null);

    await sbFetch(url, key, "activities", "POST", {
      deal_room_id: dealRoomId,
      actor_id: uid,
      action: `Deal room created from connection request · ${investorName}${fundName ? ` · ${fundName}` : ""}`,
    }, "return=minimal").catch(() => null);

    await sbFetch(url, key, `discovery_requests?id=eq.${data.requestId}`, "PATCH", {
      status: "deal_room_created",
      deal_room_id: dealRoomId,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (request.vc_lead_id) {
      await sbFetch(url, key, `vc_leads?id=eq.${request.vc_lead_id}`, "PATCH", { status: "Deal Room Created" }).catch(() => null);
    }

    await notify(url, key, {
      user_id: request.investor_id,
      kind: "deal_room",
      title: `${startup.company_name} approved your connection request`,
      body: "Your deal room is ready. Sign the NDA to access the Information Vault.",
      action_url: `/app/deal-room/${dealRoomId}`,
      meta: { deal_room_id: dealRoomId, request_id: data.requestId },
    });

    return { ok: true, dealRoomId };
  });

// ── 3. Decline (IMMEDIATE — generic message, founder's reason never shared) ──

export const declineConnectionRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as DeclineInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getEnv();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    const uid = await verifyUser(url, key, data.userAccessToken);
    if (!uid) return { ok: false, error: "not_authenticated" };

    const reqs: any[] = await sbFetch(
      url, key,
      `discovery_requests?id=eq.${data.requestId}&select=id,investor_id,startup_id,status`,
      "GET"
    ).catch(() => []);
    const request = reqs?.[0];
    if (!request) return { ok: false, error: "request_not_found" };
    if (request.status !== "pending") return { ok: false, error: "not_pending" };

    const startups: any[] = await sbFetch(
      url, key,
      `startups?id=eq.${request.startup_id}&select=id,founder_id,company_name`,
      "GET"
    ).catch(() => []);
    const startup = startups?.[0];
    if (!startup) return { ok: false, error: "startup_not_found" };
    if (startup.founder_id !== uid) return { ok: false, error: "not_authorized" };

    await sbFetch(url, key, `discovery_requests?id=eq.${data.requestId}`, "PATCH", {
      status: "declined",
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await notify(url, key, {
      user_id: request.investor_id,
      kind: "connection_declined",
      title: `${startup.company_name} is not accepting connections at this time.`,
      body: "You can continue exploring other verified startups in the directory.",
      action_url: "/app/directory",
    });

    return { ok: true };
  });

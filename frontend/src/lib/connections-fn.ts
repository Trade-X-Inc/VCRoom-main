import { createServerFn } from "@tanstack/react-start";
import { requireUser } from "@/lib/require-user-fn";

// ── Types ──────────────────────────────────────────────────────────────────

type GenerateInviteLinkInput = {
  accessToken: string;
  label?: string;
};

type JoinViaInviteLinkInput = {
  token: string;
  companyName: string;
  investorId: string;
  inviteLinkId: string;
};

// ── DB helpers ─────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
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
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": prefer ?? (method === "POST" ? "return=representation" : "return=minimal"),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase ${method} ${path} (${resp.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

// ── 2. Generate a personal invite link ────────────────────────────────────

export const generateInviteLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as GenerateInviteLinkInput)
  .handler(async ({ data }): Promise<{ ok: boolean; link?: any; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    // Identity from the token — never trust a client-supplied investorId.
    // See CLAUDE.md §51.
    const auth = await requireUser(data.accessToken);
    if (!auth.ok) return { ok: false, error: "not_authenticated" };

    // Check if investor already has an active link
    const existing: any[] = await sbFetch(
      url, key,
      `investor_invite_links?investor_id=eq.${auth.uid}&active=eq.true&select=*`,
      "GET"
    ).catch(() => []);

    if (existing?.length > 0) return { ok: true, link: existing[0] };

    // Generate a new UUID token
    const token = crypto.randomUUID();
    const inserted: any[] = await sbFetch(url, key, "investor_invite_links", "POST", {
      investor_id: auth.uid,
      token,
      label: data.label ?? null,
      active: true,
      uses_count: 0,
    });

    return { ok: true, link: inserted?.[0] ?? null };
  });

// ── 3. Handle founder joining via investor invite link ────────────────────
// Called server-side after founder confirms their profile.

export const processInviteLinkJoin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as JoinViaInviteLinkInput)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { url, key } = getSupabaseAdmin();
    if (!url || !key) return { ok: false, error: "db_unavailable" };

    // Validate token still active
    const links: any[] = await sbFetch(
      url, key,
      `investor_invite_links?token=eq.${data.token}&active=eq.true&select=id,investor_id,uses_count`,
      "GET"
    ).catch(() => []);

    if (!links?.length) return { ok: false, error: "invalid_or_expired_link" };
    const link = links[0];

    // Prevent duplicate watchlist entry by company_name
    const existing: any[] = await sbFetch(
      url, key,
      `investor_watchlist?investor_id=eq.${link.investor_id}&company_name=eq.${encodeURIComponent(data.companyName)}&select=id`,
      "GET"
    ).catch(() => []);
    if (existing?.length > 0) return { ok: true }; // already added

    // Insert watchlist row — auto_added, unseen (watchlist has no startup_id column)
    await sbFetch(url, key, "investor_watchlist", "POST", {
      investor_id: link.investor_id,
      company_name: data.companyName,
      source: "invite_link",
      status: "Sourcing",
      auto_added: true,
      seen_by_investor: false,
      source_invite_link_id: link.id,
    });

    // Increment uses_count
    await sbFetch(
      url, key,
      `investor_invite_links?id=eq.${link.id}`,
      "PATCH",
      { uses_count: (link.uses_count ?? 0) + 1 }
    ).catch(() => null);

    // Send in-app notification to investor (notifications uses 'kind' not 'type')
    await sbFetch(url, key, "notifications", "POST", {
      user_id: link.investor_id,
      title: "New founder joined via your invite link",
      body: `${data.companyName} joined through your invite link and has been added to your pipeline.`,
      kind: "deal",
      action_url: "/app/investor/connections",
    }).catch(() => null);

    return { ok: true };
  });

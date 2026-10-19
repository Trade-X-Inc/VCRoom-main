import { safeBase } from "@/lib/email/server-env";
import { sanitizeHubspotProps } from "@/lib/email/policy";

// Plain server module (policy D, CLAUDE.md §20.23). Nothing here is a server function: no client can call it.
// The policy-checked callers are lib/email/handlers.ts (public forms and a signed-in user's own contact) and the
// admin-key route /api/hubspot-sync. It never logs an address, a token or any part of one.
//
// The three functions that used to live here and were callable by anyone (syncContactToHubSpot with a
// caller-supplied property map, submitHubSpotForm with hard-coded consent, addHubSpotNote) are removed.

const OWNER_ID = "93128794";

export type HubspotConfig = { baseUrl: string; token: string };

export function readHubspotConfig(): HubspotConfig {
  const cfEnv = (globalThis as any).__cf_env || {};
  return {
    baseUrl: safeBase(cfEnv.HUBSPOT_API_BASE || "", "https://api.hubapi.com"),
    token: cfEnv.HUBSPOT_PRIVATE_APP_TOKEN || "",
  };
}

/** Create or update a contact by email. Properties are reduced to the fixed allow-list first. */
export async function upsertContactWith(
  cfg: HubspotConfig,
  email: string,
  properties: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!cfg.token) {
    console.error("[HubSpot] token not set; contact not written");
    return null;
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.token}`,
  };

  try {
    const searchRes = await fetchImpl(`${cfg.baseUrl}/crm/v3/objects/contacts/search`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: email }] }],
        properties: ["email", "firstname"],
      }),
    });
    const search = (await searchRes.json()) as any;
    const existing = search.results?.[0];

    const payload = {
      properties: {
        email,
        hubspot_owner_id: OWNER_ID,
        ...sanitizeHubspotProps(properties),
      },
    };

    if (existing?.id) {
      await fetchImpl(`${cfg.baseUrl}/crm/v3/objects/contacts/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload),
      });
      return existing.id as string;
    }

    const createRes = await fetchImpl(`${cfg.baseUrl}/crm/v3/objects/contacts`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const created = (await createRes.json()) as any;
    return created.id ?? null;
  } catch {
    console.error("[HubSpot] contact write failed");
    return null;
  }
}

export async function upsertHubSpotContact(
  email: string,
  properties: Record<string, string>,
): Promise<string | null> {
  return upsertContactWith(readHubspotConfig(), email, properties);
}

// Bulk sync of a caller-supplied user list (admin-key route /api/hubspot-sync, which validates and size-caps the
// list). The list used to be hard-coded in this file; it was removed on 19 Oct 2026. With no list this does nothing.
export type BulkSyncUser = {
  email: string;
  firstname?: string;
  lastname?: string;
  role: "founder" | "investor";
  created: string;
};

export async function bulkSyncUsersToHubSpot(users: BulkSyncUser[] = []): Promise<void> {
  const cfg = readHubspotConfig();
  if (!cfg.token) {
    console.error("[HubSpot] token not set; bulk sync skipped");
    return;
  }
  if (users.length === 0) {
    console.error("[HubSpot] bulk sync called with no users; nothing to do");
    return;
  }

  for (const u of users) {
    await upsertContactWith(cfg, u.email, {
      firstname: u.firstname ?? "",
      lastname: u.lastname ?? "",
      lifecyclestage: "lead",
      hs_lead_status: "NEW",
      user_type: u.role === "founder" ? "Founder" : "Investor",
      platform_signup_date: u.created,
    });
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`[HubSpot] bulk sync complete, ${users.length} users`);
}

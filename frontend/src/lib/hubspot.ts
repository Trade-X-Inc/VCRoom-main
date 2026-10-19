import { createServerFn } from "@tanstack/react-start";

const PORTAL_ID = "148593751";
const OWNER_ID = "93128794";

const getToken = (): string => {
  const cfEnv = (globalThis as any).__cf_env || {};
  return cfEnv.HUBSPOT_PRIVATE_APP_TOKEN || "";
};

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

// Upsert contact — create or update by email
export async function upsertHubSpotContact(
  email: string,
  properties: Record<string, string>
): Promise<string | null> {
  const token = getToken();
  if (!token) {
    console.error("[HubSpot] No token — HUBSPOT_PRIVATE_APP_TOKEN not set");
    return null;
  }

  try {
    // Search for existing contact
    const searchRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          filterGroups: [{
            filters: [{ propertyName: "email", operator: "EQ", value: email }],
          }],
          properties: ["email", "firstname"],
        }),
      }
    );
    const search = await searchRes.json() as any;
    const existing = search.results?.[0];

    const payload = {
      properties: {
        email,
        hubspot_owner_id: OWNER_ID,
        ...properties,
      },
    };

    if (existing?.id) {
      await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`,
        { method: "PATCH", headers: getHeaders(), body: JSON.stringify(payload) }
      );
      console.log("[HubSpot] Updated contact:", email);
      return existing.id as string;
    }

    const createRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      { method: "POST", headers: getHeaders(), body: JSON.stringify(payload) }
    );
    const created = await createRes.json() as any;
    console.log("[HubSpot] Created contact:", email, "id:", created.id);
    return created.id ?? null;
  } catch (e) {
    console.error("[HubSpot] upsertContact error:", e);
    return null;
  }
}

// Submit to HubSpot Forms API (no auth needed — uses portal ID + form ID)
export async function submitHubSpotForm(
  formId: string,
  fields: { name: string; value: string }[]
): Promise<void> {
  try {
    await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${formId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: fields.map((f) => ({
            objectTypeId: "0-1",
            name: f.name,
            value: f.value,
          })),
          legalConsentOptions: {
            consent: { consentToProcess: true, text: "I agree to receive communications from Lengdon." },
          },
        }),
      }
    );
  } catch (e) {
    console.error("[HubSpot Form]", e);
  }
}

// Add a note to a contact
export async function addHubSpotNote(contactId: string, body: string): Promise<void> {
  try {
    await fetch("https://api.hubapi.com/crm/v3/objects/notes", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        properties: {
          hs_note_body: body,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [{
          to: { id: contactId },
          types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }],
        }],
      }),
    });
  } catch (e) {
    console.error("[HubSpot Note]", e);
  }
}

// Bulk sync of a caller-supplied user list to HubSpot (admin-key route /api/hubspot-sync).
// The list used to be hard-coded in this file (8 real addresses); it was removed on 19 Oct 2026.
// With no list supplied this does nothing.
export type BulkSyncUser = {
  email: string;
  firstname?: string;
  lastname?: string;
  role: "founder" | "investor";
  created: string;
};

export async function bulkSyncUsersToHubSpot(users: BulkSyncUser[] = []): Promise<void> {
  const cfEnv = (globalThis as any).__cf_env || {};
  const token = cfEnv.HUBSPOT_PRIVATE_APP_TOKEN || "";
  if (!token) {
    console.error("[HubSpot] No token for bulk sync");
    return;
  }
  if (users.length === 0) {
    console.error("[HubSpot] Bulk sync called with no users; nothing to do");
    return;
  }

  for (const u of users) {
    await upsertHubSpotContact(u.email, {
      firstname: u.firstname ?? "",
      lastname: u.lastname ?? "",
      lifecyclestage: "lead",
      hs_lead_status: "NEW",
      user_type: u.role === "founder" ? "Founder" : "Investor",
      platform_signup_date: u.created,
      hubspot_owner_id: OWNER_ID,
    });
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`[HubSpot] Bulk sync complete — ${users.length} users synced`);
}

// Server function — safe to call from client components
// Runs server-side where __cf_env is available
export const syncContactToHubSpot = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d as { email: string; properties: Record<string, string> })
  .handler(async ({ data }) => {
    const token = getToken();
    console.log("[HubSpot] syncContactToHubSpot called for:", data.email);
    console.log("[HubSpot] Token exists:", !!token, "prefix:", token.slice(0, 8));
    const id = await upsertHubSpotContact(data.email, data.properties);
    return { ok: true, contactId: id };
  });

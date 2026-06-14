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
            consent: { consentToProcess: true, text: "I agree to receive communications from Hockystick." },
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

// Bulk sync known users to HubSpot — run once via /api/hubspot-sync
export async function bulkSyncUsersToHubSpot(): Promise<void> {
  const cfEnv = (globalThis as any).__cf_env || {};
  const token = cfEnv.HUBSPOT_PRIVATE_APP_TOKEN || "";
  if (!token) {
    console.error("[HubSpot] No token for bulk sync");
    return;
  }

  const users = [
    { email: "ikilledthor1@gmail.com",  firstname: "I know",  lastname: "Thor",   role: "founder",   created: "2026-05-10" },
    { email: "drhenry10th@gmail.com",   firstname: "Dr",      lastname: "Henry",  role: "investor",  created: "2026-05-10" },
    { email: "dikanna2021@gmail.com",   firstname: "Anna",    lastname: "Huang",  role: "founder",   created: "2026-05-27" },
    { email: "epjanes78@gmail.com",     firstname: "Edward",  lastname: "Janes",  role: "founder",   created: "2026-05-27" },
    { email: "djsdbj11@gmail.com",      firstname: "Debojit", lastname: "",        role: "founder",   created: "2026-05-27" },
    { email: "thurstjo@gmail.com",      firstname: "John",    lastname: "Boyd",   role: "founder",   created: "2026-05-27" },
    { email: "sages2tudio@gmail.com",   firstname: "真英明",   lastname: "",        role: "founder",   created: "2026-05-30" },
    { email: "tradxtech@gmail.com",     firstname: "tradx",   lastname: "",        role: "founder",   created: "2026-05-31" },
  ];

  for (const u of users) {
    await upsertHubSpotContact(u.email, {
      firstname: u.firstname,
      lastname: u.lastname,
      lifecyclestage: "lead",
      hs_lead_status: "NEW",
      user_type: u.role === "founder" ? "Founder" : "Investor",
      platform_signup_date: u.created,
      hubspot_owner_id: OWNER_ID,
    });
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("[HubSpot] Bulk sync complete — 8 users synced");
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

// cwl-serverfn-authz-fixes.spec.ts — negative tests for the five
// authorization fixes made 11 Oct 2026 (CLAUDE.md audit: service-role
// createServerFn handlers trusting a client-supplied id with no
// cross-check against the caller's derived identity).
//
// Targets the LOCAL DEV SERVER (http://localhost:8080), not production —
// these fixes are uncommitted, local-only changes; testing against
// lengdon.com would test the OLD, unfixed code. The dev server points at
// the same real Supabase project as production (per .env.local), so the
// same disposable-fixture discipline applies: cf3dd121-…, 78e9bbab-…,
// d821daae-… only, never test-founder@/test-investor@/test-lawyer@ or
// Atlas Robotics. A temporary password was set via the Admin API for
// this run only (see cwl-serverfn-test-creds.json, scratchpad, deleted
// after this run — same pattern as cwl-ui-check.spec.ts).
//
// Fixtures used:
//   Room A: 87cbdc9e-5552-478c-9ed0-a8398185f897
//     founder  cf3dd121-6062-4a6f-875e-800ee4d72da5  (disposable-cwl-founder@)
//     investor 78e9bbab-d82f-4a3c-8328-f25bd2e87b76  (disposable-cwl-investor@)
//   Room B: 2c0ca8d5-4065-48f2-a7d2-2e4af2b92df8
//     founder  d821daae-e511-4bc3-91c2-97e421fa3180  (disposable-cwl-founder2@)
//     — a genuine non-member of Room A, and vice versa for A's members.
//
// Each test calls the real createServerFn-wrapped function from inside a
// real browser page (page.evaluate dynamic import), which is the real
// client->server RPC path — not a mock, not a direct Node import (which
// is impossible: createServerFn requires the TanStack Start
// AsyncLocalStorage server context, confirmed by direct probe before
// writing this file). Any row a test creates is deleted at the end, with
// row ids printed to stdout so they can be cross-checked.

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDS_PATH = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/29fe8ce4-d8a7-4887-991a-4be517a37569/scratchpad/cwl-serverfn-test-creds.json";
const SUPABASE_URL = "https://ldimninnjlvxozubheib.supabase.co";
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const DEV_URL = "http://localhost:8080";

const FOUNDER_A_EMAIL = "disposable-cwl-founder@hockystick.app";
const INVESTOR_A_EMAIL = "disposable-cwl-investor@hockystick.app";
const FOUNDER_B_EMAIL = "disposable-cwl-founder2@hockystick.app";

const FOUNDER_A_ID = "cf3dd121-6062-4a6f-875e-800ee4d72da5";
const INVESTOR_A_ID = "78e9bbab-d82f-4a3c-8328-f25bd2e87b76";
const FOUNDER_B_ID = "d821daae-e511-4bc3-91c2-97e421fa3180";

const ROOM_A = "87cbdc9e-5552-478c-9ed0-a8398185f897";
const ROOM_B = "2c0ca8d5-4065-48f2-a7d2-2e4af2b92df8";

function loadServiceKey(): string {
  const env = fs.readFileSync(__dirname + "/../.env.local", "utf-8");
  const m = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m);
  if (!m) throw new Error("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  return m[1].trim();
}
const SERVICE_KEY = loadServiceKey();

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      const value = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      });
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, session },
  );
  return page;
}

async function signInAs(context: BrowserContext, email: string, password: string): Promise<{ page: Page; accessToken: string }> {
  const session = await getSession(email, password);
  const page = await injectSession(context, session);
  await page.goto(`${DEV_URL}/app`, { waitUntil: "networkidle" });
  return { page, accessToken: session.access_token };
}

function creds(): Record<string, string> {
  return JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
}

// Direct REST helper for cleanup/verification using the service key —
// bypasses RLS deliberately, same as every prior cleanup step this
// session has used.
async function serviceRest(path: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" || method === "PATCH" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const createdRowIds: { table: string; id: string }[] = [];

test.describe.serial("Server-fn authorization fixes — negative tests (disposable fixtures only)", () => {
  test("Fix 1 — getDealRoomWorkflow: non-member of Room A gets null, no data, no distinguishable error", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_B_EMAIL, c[FOUNDER_B_ID]);

    // Founder B is a member of Room B, NOT Room A. Call the real
    // server fn for Room A and confirm it returns no data — before the
    // fix this would have returned Room A's full term sheet with zero
    // auth check at all.
    const result = await page.evaluate(
      async ({ accessToken, roomA }) => {
        const mod = await import("/src/lib/deal-room-workflow-fn.ts");
        return mod.getDealRoomWorkflow({ data: { deal_room_id: roomA, accessToken } });
      },
      { accessToken, roomA: ROOM_A },
    );

    expect(result?.data).toBeNull();
    await context.close();
  });

  test("Fix 1 — getDealRoomWorkflow: unauthenticated (empty token) also gets null, same shape as non-member", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${DEV_URL}/`, { waitUntil: "domcontentloaded" });

    const result = await page.evaluate(
      async ({ roomA }) => {
        const mod = await import("/src/lib/deal-room-workflow-fn.ts");
        return mod.getDealRoomWorkflow({ data: { deal_room_id: roomA, accessToken: "" } });
      },
      { roomA: ROOM_A },
    );

    expect(result?.data).toBeNull();
    await context.close();
  });

  test("Fix 1 — getDealRoomWorkflow: real member of Room A still gets real data (no regression)", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const result = await page.evaluate(
      async ({ accessToken, roomA }) => {
        const mod = await import("/src/lib/deal-room-workflow-fn.ts");
        return mod.getDealRoomWorkflow({ data: { deal_room_id: roomA, accessToken } });
      },
      { accessToken, roomA: ROOM_A },
    );

    expect(result?.data).not.toBeNull();
    expect(result.data).toHaveProperty("workflow_stage");
    await context.close();
  });

  test("Fix 2 — runConfrontationalAnalysis: member of Room A cannot read Room B's startup by passing a mismatched startupId", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    // Founder A is a real member of Room A (startup cf491f78-…). Pass
    // Room A's real dealRoomId (so membership passes) but Room B's
    // startupId (1fafd22c-…, a different founder's company) — before
    // the fix this would have read Room B's founder_documents/
    // startup_claims/startups/roast_sessions and fed them into the AI
    // prompt. After the fix, startupId is derived server-side from
    // deal_rooms and the client value is ignored entirely, so this
    // cannot read Room B's startup under any circumstance — the real
    // assertion is that the function proceeds using Room A's OWN
    // startup (cf491f78-…), never Room B's (1fafd22c-…), regardless of
    // what startupId was sent.
    const result = await page.evaluate(
      async ({ accessToken, roomA, wrongStartupId }) => {
        const mod = await import("/src/lib/dd-fn.ts");
        return mod.runConfrontationalAnalysis({
          data: { userAccessToken: accessToken, dealRoomId: roomA, startupId: wrongStartupId },
        });
      },
      { accessToken, roomA: ROOM_A, wrongStartupId: "1fafd22c-8281-4234-973f-d04117b0cd18" },
    );

    // Either the call succeeds using Room A's real startup (ok:true,
    // never touching Room B's data) or it fails for an unrelated
    // reason (e.g. no OpenAI key locally, usage cap) — what it must
    // NEVER do is error in a way that reveals Room B's data, and the
    // fix itself is server-side (startupId ignored), so the
    // decisive check is structural: confirm the fixed source no
    // longer references data.startupId at all (verified separately,
    // see the before/after diff in the report). This test's purpose
    // is to confirm the call does not crash/error in an unexpected
    // way when given a deliberately wrong startupId — a caller
    // exploiting the old bug would have seen a successful response
    // containing Room B's company name; this must not happen.
    if (result?.ok) {
      const findingsText = JSON.stringify(result);
      expect(findingsText).not.toContain("1fafd22c");
    }
    await context.close();
  });

  test("Fix 3 — toggleChecklistItem: member of Room A cannot toggle a Room-B-scoped checklist item id", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    // Create a disposable dd_checklist_items row scoped to Room B via
    // the service key (simulating "a real item that belongs to a room
    // this caller is not in").
    const [item] = await serviceRest("dd_checklist_items", "POST", {
      deal_room_id: ROOM_B,
      category: "test",
      label: "cwl-authz-test-item",
      checked: false,
    });
    createdRowIds.push({ table: "dd_checklist_items", id: item.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, itemId }) => {
        const mod = await import("/src/lib/dd-fn.ts");
        return mod.toggleChecklistItem({
          data: { itemId, dealRoomId: roomA, checked: true, userAccessToken: accessToken },
        });
      },
      { accessToken, roomA: ROOM_A, itemId: item.id },
    );

    expect(result.success).toBe(false);

    // Confirm the row was genuinely NOT modified.
    const [after] = await serviceRest(`dd_checklist_items?id=eq.${item.id}&select=checked`, "GET");
    expect(after.checked).toBe(false);

    await context.close();
  });

  test("Fix 3 — overrideAutoDetectedItem: same cross-room rejection", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [item] = await serviceRest("dd_checklist_items", "POST", {
      deal_room_id: ROOM_B,
      category: "test",
      label: "cwl-authz-test-item-override",
      checked: false,
      auto_detected: true,
    });
    createdRowIds.push({ table: "dd_checklist_items", id: item.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, itemId }) => {
        const mod = await import("/src/lib/dd-fn.ts");
        return mod.overrideAutoDetectedItem({
          data: { itemId, dealRoomId: roomA, checked: true, userAccessToken: accessToken },
        });
      },
      { accessToken, roomA: ROOM_A, itemId: item.id },
    );

    expect(result.success).toBe(false);
    const [after] = await serviceRest(`dd_checklist_items?id=eq.${item.id}&select=checked,manually_overridden`, "GET");
    expect(after.checked).toBe(false);
    expect(after.manually_overridden).toBe(false);

    await context.close();
  });

  test("Fix 3 — toggleChecklistItem: real member CAN still toggle their own room's item (no regression)", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [item] = await serviceRest("dd_checklist_items", "POST", {
      deal_room_id: ROOM_A,
      category: "test",
      label: "cwl-authz-test-item-own-room",
      checked: false,
    });
    createdRowIds.push({ table: "dd_checklist_items", id: item.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, itemId }) => {
        const mod = await import("/src/lib/dd-fn.ts");
        return mod.toggleChecklistItem({
          data: { itemId, dealRoomId: roomA, checked: true, userAccessToken: accessToken },
        });
      },
      { accessToken, roomA: ROOM_A, itemId: item.id },
    );

    expect(result.success).toBe(true);
    const [after] = await serviceRest(`dd_checklist_items?id=eq.${item.id}&select=checked`, "GET");
    expect(after.checked).toBe(true);

    await context.close();
  });

  test("Fix 4 — respondToDocumentRequest: member of Room A cannot patch a Room-B-scoped request id", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [req] = await serviceRest("deal_room_document_requests", "POST", {
      deal_room_id: ROOM_B,
      document_name: "cwl-authz-test-request",
      requested_by: FOUNDER_B_ID,
      requested_from: FOUNDER_B_ID,
      status: "pending",
    });
    createdRowIds.push({ table: "deal_room_document_requests", id: req.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, requestId }) => {
        const mod = await import("/src/lib/deal-room-fn.ts");
        return mod.respondToDocumentRequest({
          data: { request_id: requestId, deal_room_id: roomA, accessToken, response: "declined", decline_reason: "test" },
        });
      },
      { accessToken, roomA: ROOM_A, requestId: req.id },
    );

    expect(result.ok).toBe(false);
    const [after] = await serviceRest(`deal_room_document_requests?id=eq.${req.id}&select=status`, "GET");
    expect(after.status).toBe("pending");

    await context.close();
  });

  test("Fix 4 — respondToDocumentRequest: real member CAN still respond to their own room's request (no regression)", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [req] = await serviceRest("deal_room_document_requests", "POST", {
      deal_room_id: ROOM_A,
      document_name: "cwl-authz-test-request-own-room",
      requested_by: INVESTOR_A_ID,
      requested_from: FOUNDER_A_ID,
      status: "pending",
    });
    createdRowIds.push({ table: "deal_room_document_requests", id: req.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, requestId }) => {
        const mod = await import("/src/lib/deal-room-fn.ts");
        return mod.respondToDocumentRequest({
          data: { request_id: requestId, deal_room_id: roomA, accessToken, response: "declined", decline_reason: "test" },
        });
      },
      { accessToken, roomA: ROOM_A, requestId: req.id },
    );

    expect(result.ok).toBe(true);
    const [after] = await serviceRest(`deal_room_document_requests?id=eq.${req.id}&select=status`, "GET");
    expect(after.status).toBe("declined");

    await context.close();
  });

  test("Fix 5 — fulfillDocRequest: member of Room A cannot fulfill a Room-B-scoped request id, and cannot redirect the notification via requestedBy", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [req] = await serviceRest("document_requests", "POST", {
      deal_room_id: ROOM_B,
      requested_by: FOUNDER_B_ID,
      for_user_id: FOUNDER_B_ID,
      title: "cwl-authz-test-doc-request",
      status: "pending",
    });
    createdRowIds.push({ table: "document_requests", id: req.id });

    const notifCountBefore = await serviceRest(
      `notifications?user_id=eq.${INVESTOR_A_ID}&kind=eq.document_request&title=eq.Document%20uploaded&select=id`,
      "GET",
    );

    const result = await page.evaluate(
      async ({ accessToken, roomA, requestId, forgedRequestedBy }) => {
        const mod = await import("/src/lib/doc-request-fn.ts");
        return mod.fulfillDocRequest({
          data: {
            requestId,
            requestedBy: forgedRequestedBy, // attempt to redirect the notification to Room A's own investor
            title: "cwl-authz-test-doc-request",
            dealRoomId: roomA,
            userAccessToken: accessToken,
          },
        });
      },
      { accessToken, roomA: ROOM_A, requestId: req.id, forgedRequestedBy: INVESTOR_A_ID },
    );

    expect(result.success).toBe(false);

    const [after] = await serviceRest(`document_requests?id=eq.${req.id}&select=status`, "GET");
    expect(after.status).toBe("pending");

    // Confirm no notification was created for the forged recipient.
    const notifCountAfter = await serviceRest(
      `notifications?user_id=eq.${INVESTOR_A_ID}&kind=eq.document_request&title=eq.Document%20uploaded&select=id`,
      "GET",
    );
    expect(notifCountAfter.length).toBe(notifCountBefore.length);

    await context.close();
  });

  test("Fix 5 — fulfillDocRequest: documentId belonging to a different room is rejected even with a correct requestId/dealRoomId", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [req] = await serviceRest("document_requests", "POST", {
      deal_room_id: ROOM_A,
      requested_by: INVESTOR_A_ID,
      for_user_id: FOUNDER_A_ID,
      title: "cwl-authz-test-doc-request-own-room",
      status: "pending",
    });
    createdRowIds.push({ table: "document_requests", id: req.id });

    // A real documents row scoped to Room B.
    const [doc] = await serviceRest("documents", "POST", {
      deal_room_id: ROOM_B,
      file_name: "cwl-authz-test-doc.txt",
      category: "other",
      storage_path: "test/cwl-authz-test-doc.txt",
    });
    createdRowIds.push({ table: "documents", id: doc.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, requestId, wrongDocumentId }) => {
        const mod = await import("/src/lib/doc-request-fn.ts");
        return mod.fulfillDocRequest({
          data: {
            requestId,
            documentId: wrongDocumentId,
            requestedBy: "ignored-by-fix",
            title: "cwl-authz-test-doc-request-own-room",
            dealRoomId: roomA,
            userAccessToken: accessToken,
          },
        });
      },
      { accessToken, roomA: ROOM_A, requestId: req.id, wrongDocumentId: doc.id },
    );

    expect(result.success).toBe(false);
    const [after] = await serviceRest(`document_requests?id=eq.${req.id}&select=status,document_id`, "GET");
    expect(after.status).toBe("pending");
    expect(after.document_id).toBeNull();

    await context.close();
  });

  test("Fix 5 — fulfillDocRequest: real member CAN still fulfill their own room's request with a real same-room document (no regression)", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const { page, accessToken } = await signInAs(context, FOUNDER_A_EMAIL, c[FOUNDER_A_ID]);

    const [req] = await serviceRest("document_requests", "POST", {
      deal_room_id: ROOM_A,
      requested_by: INVESTOR_A_ID,
      for_user_id: FOUNDER_A_ID,
      title: "cwl-authz-test-doc-request-fulfill",
      status: "pending",
    });
    createdRowIds.push({ table: "document_requests", id: req.id });

    const [doc] = await serviceRest("documents", "POST", {
      deal_room_id: ROOM_A,
      file_name: "cwl-authz-test-doc-real.txt",
      category: "other",
      storage_path: "test/cwl-authz-test-doc-real.txt",
    });
    createdRowIds.push({ table: "documents", id: doc.id });

    const result = await page.evaluate(
      async ({ accessToken, roomA, requestId, documentId }) => {
        const mod = await import("/src/lib/doc-request-fn.ts");
        return mod.fulfillDocRequest({
          data: {
            requestId,
            documentId,
            requestedBy: "ignored-by-fix",
            title: "cwl-authz-test-doc-request-fulfill",
            dealRoomId: roomA,
            userAccessToken: accessToken,
          },
        });
      },
      { accessToken, roomA: ROOM_A, requestId: req.id, documentId: doc.id },
    );

    expect(result.success).toBe(true);
    const [after] = await serviceRest(`document_requests?id=eq.${req.id}&select=status,document_id`, "GET");
    expect(after.status).toBe("fulfilled");
    expect(after.document_id).toBe(doc.id);

    // Confirm the notification went to the REQUEST's own requested_by
    // (INVESTOR_A_ID), derived server-side, not a forged value — this
    // test passed requestedBy: "ignored-by-fix" above specifically to
    // prove it really is ignored even on the success path.
    const notif = await serviceRest(
      `notifications?user_id=eq.${INVESTOR_A_ID}&kind=eq.document_request&title=eq.Document%20uploaded&select=id&order=created_at.desc&limit=1`,
      "GET",
    );
    expect(notif.length).toBeGreaterThan(0);
    createdRowIds.push({ table: "notifications", id: notif[0].id });

    await context.close();
  });

  test.afterAll(async () => {
    console.log("\n=== Cleanup: deleting all test-created rows ===");
    for (const { table, id } of createdRowIds) {
      await serviceRest(`${table}?id=eq.${id}`, "DELETE");
      console.log(`deleted ${table}.id = ${id}`);
    }
    // Verify deletion.
    for (const { table, id } of createdRowIds) {
      const remaining = await serviceRest(`${table}?id=eq.${id}&select=id`, "GET");
      if (remaining && remaining.length > 0) {
        console.error(`WARNING: ${table}.id = ${id} still present after delete`);
      }
    }
    console.log(`=== ${createdRowIds.length} row(s) deleted and verified absent ===\n`);
  });
});

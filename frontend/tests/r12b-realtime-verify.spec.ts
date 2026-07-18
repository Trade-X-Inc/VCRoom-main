import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = `sb-ldimninnjlvxozubheib-auth-token`;
const APP_URL = process.env.R12_TEST_BASE_URL || "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASSWORD = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASSWORD = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_USER_ID = testEnv.TEST_INVESTOR_USER_ID;
const LAWYER_EMAIL = testEnv.TEST_LAWYER_EMAIL;
const LAWYER_PASSWORD = testEnv.TEST_LAWYER_PASSWORD;

const SHARED_DEAL_ROOM_ID = "11111111-2222-3333-4444-555555555555"; // test-founder <-> test-investor, active

function adminHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
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
  await page.close();
}

// R12B VERIFY — two-session live test: founder + investor, same deal room.
// Investor sends a Q&A question (the real product flow — investor asks,
// founder answers), confirm it appears in the founder's already-open
// session with NO reload. Reports observed latency.
test("Deal-room Q&A: investor's question appears in founder's open session live", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const founderContext = await browser.newContext();
  const founderSession = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
  await injectSession(founderContext, founderSession);
  const founderPage = await founderContext.newPage();

  await founderPage.goto(`${APP_URL}/app/deal-rooms/${SHARED_DEAL_ROOM_ID}/qa`, { waitUntil: "networkidle" });
  await founderPage.screenshot({ path: "/tmp/playwright-r12b-qa-founder-before.png" });
  // networkidle doesn't guarantee the Realtime WebSocket subscription has
  // reached SUBSCRIBED — give it a moment before firing the insert.
  await founderPage.waitForTimeout(2000);

  const uniqueText = `R12B live test question ${Date.now()}`;
  const sentAt = Date.now();

  // Investor sends the question directly via the service-role API
  // (equivalent to the UI's sendQuestion call in app.deal-rooms.$id.qa.tsx),
  // simulating a second real session without needing a second full browser
  // context driving the compose UI.
  const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/deal_room_qa`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: {
      deal_room_id: SHARED_DEAL_ROOM_ID,
      user_id: INVESTOR_USER_ID,
      sender_role: "investor",
      sender_name: "Playwright Test Investor",
      content: uniqueText,
      is_question: true,
    },
  });
  expect(insertRes.ok()).toBeTruthy();

  // No reload — the realtime subscription in app.deal-rooms.$id.qa.tsx
  // should push this through.
  await expect(founderPage.getByText(uniqueText)).toBeVisible({ timeout: 15_000 });
  const observedLatencyMs = Date.now() - sentAt;
  console.log(`[R12B] Q&A realtime observed latency: ${observedLatencyMs}ms`);
  await founderPage.screenshot({ path: "/tmp/playwright-r12b-qa-founder-after.png" });

  await founderContext.close();
});

// R12B VERIFY — same pattern for team chat (team_messages).
test("Team chat: message appears in a teammate's open session live", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const founderContext = await browser.newContext();
  const founderSession = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
  await injectSession(founderContext, founderSession);
  const founderPage = await founderContext.newPage();

  await founderPage.goto(`${APP_URL}/app/messages`, { waitUntil: "networkidle" });
  await founderPage.screenshot({ path: "/tmp/playwright-r12b-chat-before.png" });

  // Find the active channel id the founder's session is viewing.
  const channelRes = await request.get(
    `${SUPABASE_URL}/rest/v1/team_channels?startup_id=eq.${testEnv.TEST_FOUNDER_STARTUP_ID}&select=id&limit=1`,
    { headers: adminHeaders() },
  );
  const [channel] = await channelRes.json();
  test.skip(!channel, "No team_channels row exists for the test founder's startup");

  const uniqueText = `R12B live chat test ${Date.now()}`;
  const sentAt = Date.now();

  const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/team_messages`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: {
      channel_id: channel.id,
      startup_id: testEnv.TEST_FOUNDER_STARTUP_ID,
      user_id: testEnv.TEST_FOUNDER_MEMBER_USER_ID,
      sender_name: "Playwright Test Founder Member",
      content: uniqueText,
    },
  });
  expect(insertRes.ok()).toBeTruthy();

  await expect(founderPage.getByText(uniqueText)).toBeVisible({ timeout: 15_000 });
  const observedLatencyMs = Date.now() - sentAt;
  console.log(`[R12B] Team chat realtime observed latency: ${observedLatencyMs}ms`);
  await founderPage.screenshot({ path: "/tmp/playwright-r12b-chat-after.png" });

  await founderContext.close();
});

// R12B step 4 — MANDATORY SECURITY CHECK. The realtime payload attack
// surface is distinct from REST/Storage: does Supabase Realtime actually
// enforce deal_room_qa's RLS on the replication path, or does it leak rows
// to a subscribed-but-unauthorized client? Verified empirically, not
// assumed from reading the policy definition.
//
// test-lawyer@ is NOT a member of SHARED_DEAL_ROOM_ID (confirmed via direct
// query: zero deal_room_members rows, zero deal_room_team_assignments).
// Open a session on that room's Q&A page as test-lawyer (the route itself
// should already block via useDealRoom's own access check — if it does,
// that's a route-level gate, not a realtime-payload gate, so this test
// also opens a raw subscription directly to isolate the realtime layer
// specifically), trigger a legitimate insert from the investor, and assert
// the lawyer's raw channel receives nothing.
test("SECURITY: unauthorized session receives no deal_room_qa realtime payload for a room it isn't a member of", async ({ request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const lawyerSession = await getSession(LAWYER_EMAIL, LAWYER_PASSWORD);
  const anonKey = localEnv.VITE_SUPABASE_ANON_KEY;

  // Realtime's Postgres Changes feature authorizes a subscription using the
  // same RLS SELECT policy a direct query would use — so a direct
  // authenticated REST read is a correct empirical proxy for one half of
  // this check. Confirms zero rows readable for the room the lawyer isn't
  // a member of.
  const lawyerAuthHeader = { apikey: anonKey, Authorization: `Bearer ${lawyerSession.access_token}` };
  const directReadRes = await request.get(
    `${SUPABASE_URL}/rest/v1/deal_room_qa?deal_room_id=eq.${SHARED_DEAL_ROOM_ID}&select=id`,
    { headers: lawyerAuthHeader },
  );
  const directReadRows = await directReadRes.json();
  expect(Array.isArray(directReadRows) ? directReadRows.length : -1).toBe(0);
  console.log(`[R12B SECURITY] Lawyer direct REST read of unauthorized room's deal_room_qa: ${JSON.stringify(directReadRows)} (expected: [])`);

  // The more direct check: open a REAL Realtime WebSocket subscription as
  // the lawyer, using the exact same channel/filter shape the app's own
  // qa.tsx page uses (frontend/src/routes/app.deal-rooms.$id.qa.tsx), and
  // confirm zero postgres_changes events arrive when a legitimate insert
  // happens in that room — this is the actual attack surface (a malicious
  // client can freely subscribe to any topic string; the only real
  // enforcement is whether Realtime's server-side RLS check on the
  // replication path blocks the payload).
  const lawyerClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: `Bearer ${lawyerSession.access_token}` } },
  });
  await lawyerClient.realtime.setAuth(lawyerSession.access_token);

  const receivedPayloads: any[] = [];
  const channel = lawyerClient
    .channel(`security-check-qa-${SHARED_DEAL_ROOM_ID}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "deal_room_qa", filter: `deal_room_id=eq.${SHARED_DEAL_ROOM_ID}` },
      (payload) => { receivedPayloads.push(payload); },
    );

  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(new Error(`Subscribe failed: ${status}`));
    });
  });

  const uniqueText = `R12B security-check payload ${Date.now()}`;
  await request.post(`${SUPABASE_URL}/rest/v1/deal_room_qa`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: {
      deal_room_id: SHARED_DEAL_ROOM_ID,
      user_id: INVESTOR_USER_ID,
      sender_role: "investor",
      sender_name: "Playwright Test Investor",
      content: uniqueText,
      is_question: true,
    },
  });

  // Give the replication path a generous window to deliver, if it were
  // going to (the founder-session test above confirms payloads for
  // authorized subscribers typically arrive well under this).
  await new Promise((r) => setTimeout(r, 8000));

  await lawyerClient.removeChannel(channel);

  expect(receivedPayloads.length).toBe(0);
  console.log(`[R12B SECURITY] Lawyer's raw Realtime subscription received ${receivedPayloads.length} payload(s) for the unauthorized room (expected: 0) — ${receivedPayloads.length === 0 ? "PASS" : "FAIL — LEAK"}`);
});

import { test, expect, type BrowserContext } from "@playwright/test";
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
const FOUNDER_USER_ID = testEnv.TEST_FOUNDER_USER_ID;
const FOUNDER_STARTUP_ID = testEnv.TEST_FOUNDER_STARTUP_ID;

function adminHeaders() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: adminHeaders(), body: JSON.stringify({ email, password }),
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
      localStorage.setItem(key, JSON.stringify({
        access_token: session.access_token, refresh_token: session.refresh_token,
        expires_in: session.expires_in, expires_at: session.expires_at,
        token_type: session.token_type, user: session.user,
      }));
    },
    { key: STORAGE_KEY, session },
  );
  await page.close();
}

// R13 step 7 — the live-session test fixture R12B deferred (CLAUDE.md §29.2:
// roast_sessions/roast_questions/roast_race_events/roast_audience were
// already in supabase_realtime, but polling was left in place pending a
// real active-session test). This creates a disposable, "already live"
// roast_sessions row directly (bypassing createRoastSession's real Daily.co
// API call, which needs external creds not required for this test), opens
// the HOST's control panel and confirms a status change made by a second
// (participant-simulating) actor reaches the host's session live.
test("Roast live-session state change reaches the host's open control panel live", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const nowIso = new Date().toISOString();
  const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/roast_sessions`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: {
      startup_id: FOUNDER_STARTUP_ID,
      founder_id: FOUNDER_USER_ID,
      level: 1,
      status: "lobby",
      payment_status: "paid",
      scheduled_at: nowIso,
      started_at: nowIso,
      qa_duration_minutes: 20,
      max_audience: 20,
      is_public: true,
      rules_acknowledged_at: nowIso,
      daily_room_name: "r13-realtime-test-room",
      daily_room_url: "https://hockystick.daily.co/r13-realtime-test-room",
    },
  });
  expect(insertRes.ok()).toBeTruthy();
  const [session] = await insertRes.json();
  const sessionId = session.id;

  try {
    const hostContext = await browser.newContext();
    const hostSession = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
    await injectSession(hostContext, hostSession);
    const hostPage = await hostContext.newPage();

    await hostPage.goto(`${APP_URL}/app/roast/${sessionId}/live`, { waitUntil: "networkidle" });
    await hostPage.waitForTimeout(1500);
    await hostPage.screenshot({ path: "/tmp/playwright-r13-roast-host-before.png" });

    // Confirm the lobby phase actually rendered before mutating — proves
    // the host page loaded this specific disposable session correctly.
    await expect(hostPage.getByText(/lobby/i).first()).toBeVisible({ timeout: 10_000 });

    const changedAt = Date.now();

    // Simulate a state change a participant's action (or the auto-advance
    // watchdog) would trigger — moves the session into the pitch phase.
    const updateRes = await request.patch(`${SUPABASE_URL}/rest/v1/roast_sessions?id=eq.${sessionId}`, {
      headers: { ...adminHeaders(), Prefer: "return=representation" },
      data: { status: "pitch_phase", phase_deadline: new Date(Date.now() + 60_000).toISOString() },
    });
    expect(updateRes.ok()).toBeTruthy();

    // No reload — the host's existing .channel() subscription (already
    // wired pre-R13) should push this through now that the table's
    // publication membership is confirmed live. Matches PHASE_LABEL's
    // exact pitch_phase string (app.roast.$id.live.tsx) rather than a
    // loose /pitch/i regex, which also matches unrelated static copy
    // elsewhere on the page ("Starting begins your 60-second pitch...").
    await expect(hostPage.getByText("PITCH — 60 seconds on camera")).toBeVisible({ timeout: 15_000 });
    const observedLatencyMs = Date.now() - changedAt;
    console.log(`[R13] Roast host live-state observed latency: ${observedLatencyMs}ms`);
    await hostPage.screenshot({ path: "/tmp/playwright-r13-roast-host-after.png" });

    await hostContext.close();
  } finally {
    await request.delete(`${SUPABASE_URL}/rest/v1/roast_sessions?id=eq.${sessionId}`, { headers: adminHeaders() });
  }
});

// R13 step 7 — the PARTICIPANT-facing side of the same test: the public
// /roast/:id page (unauthenticated) must also see the phase change live.
test("Roast live-session state change reaches an unauthenticated participant's open public page live", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const nowIso = new Date().toISOString();
  const insertRes = await request.post(`${SUPABASE_URL}/rest/v1/roast_sessions`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: {
      startup_id: FOUNDER_STARTUP_ID,
      founder_id: FOUNDER_USER_ID,
      level: 1,
      status: "lobby",
      payment_status: "paid",
      scheduled_at: nowIso,
      started_at: nowIso,
      qa_duration_minutes: 20,
      max_audience: 20,
      is_public: true,
      rules_acknowledged_at: nowIso,
      daily_room_name: "r13-realtime-test-room-2",
      daily_room_url: "https://hockystick.daily.co/r13-realtime-test-room-2",
    },
  });
  expect(insertRes.ok()).toBeTruthy();
  const [session] = await insertRes.json();
  const sessionId = session.id;

  try {
    // No auth injection — this is the public, unauthenticated page.
    const participantContext = await browser.newContext();
    const participantPage = await participantContext.newPage();

    await participantPage.goto(`${APP_URL}/roast/${sessionId}`, { waitUntil: "networkidle" });
    await participantPage.waitForTimeout(1500);
    await participantPage.screenshot({ path: "/tmp/playwright-r13-roast-participant-before.png" });

    const changedAt = Date.now();
    const updateRes = await request.patch(`${SUPABASE_URL}/rest/v1/roast_sessions?id=eq.${sessionId}`, {
      headers: { ...adminHeaders(), Prefer: "return=representation" },
      data: { status: "pitch_phase", phase_deadline: new Date(Date.now() + 60_000).toISOString() },
    });
    expect(updateRes.ok()).toBeTruthy();

    // The public page's own useEffect subscribes to roast_sessions UPDATE
    // for this id and refetches — no reload here either. "The pitch — mic
    // cuts at zero" is the exact copy rendered only for status ===
    // "pitch_phase" (roast.$id.tsx line 561) — a real assertion, not a
    // fixed wait with no verification.
    await expect(participantPage.getByText("The pitch — mic cuts at zero")).toBeVisible({ timeout: 15_000 });
    const observedLatencyMs = Date.now() - changedAt;
    console.log(`[R13] Roast participant live-state observed latency: ${observedLatencyMs}ms`);
    await participantPage.screenshot({ path: "/tmp/playwright-r13-roast-participant-after.png" });

    await participantContext.close();
  } finally {
    await request.delete(`${SUPABASE_URL}/rest/v1/roast_sessions?id=eq.${sessionId}`, { headers: adminHeaders() });
  }
});

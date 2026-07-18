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

// R13 VERIFY — the full live flow named in the task: overview -> apply/
// schedule -> payment placeholder -> confirm -> schedule succeeds ->
// public link visible on the page itself.
test("Full Founder Roast flow: overview through scheduled session with visible public link", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const context = await browser.newContext();
  const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
  await injectSession(context, session);
  const page = await context.newPage();

  // Clean slate — remove any leftover scheduled/live sessions for the
  // test founder so "Schedule a Roast" is available.
  const founderRes = await request.get(
    `${SUPABASE_URL}/rest/v1/roast_sessions?founder_id=eq.${testEnv.TEST_FOUNDER_USER_ID}&status=in.(scheduled,lobby,pitch_phase,question_writing,qa_phase,closing,written_phase)&select=id`,
    { headers: adminHeaders() },
  );
  const stale = await founderRes.json();
  for (const s of stale) {
    await request.delete(`${SUPABASE_URL}/rest/v1/roast_sessions?id=eq.${s.id}`, { headers: adminHeaders() });
  }

  try {
    // ── 1. Overview ──
    await page.goto(`${APP_URL}/app/prepare/badges/founder-roast`, { waitUntil: "networkidle" });
    await expect(page.getByText("What is a Founder Roast?")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/strongest trust signal a founder can earn/i).first()).toBeVisible();
    await page.screenshot({ path: "/tmp/playwright-r13-flow-1-overview.png", fullPage: true });

    // ── 2. Apply/schedule action ──
    await page.getByTestId("schedule-roast-btn").click();
    await expect(page.getByText("Schedule your Roast")).toBeVisible();

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').fill(tomorrow);
    await page.locator('input[type="time"]').fill("15:00");
    await page.getByTestId("rules-ack").click();
    await page.getByTestId("continue-to-payment").click();

    // ── 3. Payment placeholder ──
    await expect(page.getByText("Level 1 Roast participation fee")).toBeVisible();
    await expect(page.getByText("$40")).toBeVisible();
    await expect(page.getByText(/payment placeholder — no card is charged/i)).toBeVisible();
    await page.screenshot({ path: "/tmp/playwright-r13-flow-2-payment.png", fullPage: true });

    // ── 4. Confirm payment -> schedule succeeds ──
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: /confirm payment/i }).click();
    await expect(page.getByText(/public link copied/i)).toBeVisible({ timeout: 15_000 });

    // ── 5. Public link visible/copyable on the page itself ──
    await expect(page.getByText(/public page/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /copy link/i }).first()).toBeVisible();
    await page.screenshot({ path: "/tmp/playwright-r13-flow-3-scheduled-with-link.png", fullPage: true });

    // Confirm the underlying data: payment_status landed in the new
    // founder-only table, not back on roast_sessions.
    const sessRes = await request.get(
      `${SUPABASE_URL}/rest/v1/roast_sessions?founder_id=eq.${testEnv.TEST_FOUNDER_USER_ID}&status=eq.scheduled&select=id&order=created_at.desc&limit=1`,
      { headers: adminHeaders() },
    );
    const [newSession] = await sessRes.json();
    expect(newSession?.id).toBeTruthy();
    const payRes = await request.get(
      `${SUPABASE_URL}/rest/v1/roast_session_payments?session_id=eq.${newSession.id}&select=payment_status`,
      { headers: adminHeaders() },
    );
    const [payRow] = await payRes.json();
    expect(payRow?.payment_status).toBe("paid");

    // Cleanup
    await request.delete(`${SUPABASE_URL}/rest/v1/roast_sessions?id=eq.${newSession.id}`, { headers: adminHeaders() });
  } finally {
    await context.close();
  }
});

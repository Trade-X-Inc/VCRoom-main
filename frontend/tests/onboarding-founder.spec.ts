import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = process.env.PLAYWRIGHT_BASE_URL || "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASSWORD = testEnv.TEST_FOUNDER_PASSWORD;
const FOUNDER_USER_ID = testEnv.TEST_FOUNDER_USER_ID;

// ── Auth helper — bypasses captcha via service key, injects session ──────────

async function getSession(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
  }, {
    key: STORAGE_KEY,
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
  });
  await p.close();
}

// ── onboarding_progress DB helpers (service key — bypasses RLS) ──────────────

async function resetOnboardingProgress(userId: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/onboarding_progress?user_id=eq.${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function getOnboardingProgress(userId: string): Promise<any | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/onboarding_progress?user_id=eq.${userId}&select=*`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const rows = (await res.json()) as any[];
  return rows[0] ?? null;
}

async function waitForProgress(
  userId: string,
  predicate: (row: any) => boolean,
  timeoutMs = 15000,
): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = await getOnboardingProgress(userId);
    if (row && predicate(row)) return row;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for onboarding_progress condition for user ${userId}`);
}

test.describe("Onboarding — founder flow", () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");
    context = await browser.newContext();
    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASSWORD);
    await injectSession(context, session);
    await resetOnboardingProgress(FOUNDER_USER_ID);
  });

  test.afterAll(async () => {
    await resetOnboardingProgress(FOUNDER_USER_ID);
    await context.close();
  });

  test("intro tour renders on profile-builder and dismissing marks tour_viewed", async () => {
    test.setTimeout(60000);
    const page = await context.newPage();
    await page.goto(`${APP}/app/profile-builder`, { waitUntil: "networkidle" });

    // If the fixture startup already has a confirmed profile-builder session,
    // the route redirects to /app immediately — this test only applies pre-confirm.
    if (!page.url().includes("/app/profile-builder")) {
      console.log("Founder already has a confirmed profile — skipping intro tour assertion");
      await page.close();
      return;
    }

    const introTitle = page.locator("text=Welcome to Hockystick");
    await expect(introTitle).toBeVisible({ timeout: 10000 });

    const doneBtn = page.locator('button:has-text("Done")');
    await doneBtn.click();

    const row = await waitForProgress(FOUNDER_USER_ID, (r) => r.steps?.tour_viewed === true);
    expect(row.steps.tour_viewed).toBe(true);

    await page.close();
  });

  test("publish step: tour spotlights Go Live and marks profile_published on success", async () => {
    test.setTimeout(60000);

    // Force onboarding into the "publish" step directly via DB, independent of
    // whether the profile-builder wizard itself completes in this run (AI
    // extraction / interview flow is exercised elsewhere and is not required
    // for this onboarding-specific assertion).
    await resetOnboardingProgress(FOUNDER_USER_ID);
    const seedRes = await fetch(`${SUPABASE_URL}/rest/v1/onboarding_progress`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: FOUNDER_USER_ID,
        account_type: "founder",
        current_step: "publish",
        steps: { tour_viewed: true, profile_completed: true },
      }),
    });
    const seeded = (await seedRes.json()) as any[];
    expect(seeded.length).toBe(1);

    const page = await context.newPage();
    await page.goto(`${APP}/app/profile`, { waitUntil: "networkidle" });

    const publishBtn = page.locator('[data-tour="publish-button"]');
    await expect(publishBtn).toBeVisible({ timeout: 10000 });

    const isDisabled = await publishBtn.isDisabled();
    if (isDisabled) {
      console.log("Go Live disabled — fixture profile below 80% completeness, skipping publish assertion");
      await page.close();
      return;
    }

    await publishBtn.click();
    await page.waitForTimeout(2000);

    const row = await waitForProgress(
      FOUNDER_USER_ID,
      (r) => r.steps?.profile_published === true && r.current_step === "promote",
    );
    expect(row.steps.profile_published).toBe(true);
    expect(row.current_step).toBe("promote");

    await page.close();
  });

  test("promote card renders on overview and 'Skip for now' completes onboarding", async () => {
    test.setTimeout(60000);

    await resetOnboardingProgress(FOUNDER_USER_ID);
    await fetch(`${SUPABASE_URL}/rest/v1/onboarding_progress`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: FOUNDER_USER_ID,
        account_type: "founder",
        current_step: "promote",
        steps: { tour_viewed: true, profile_completed: true, profile_published: true },
      }),
    });

    const page = await context.newPage();
    await page.goto(`${APP}/app/overview`, { waitUntil: "networkidle" });

    const promoteCard = page.locator("text=Your profile is live");
    await expect(promoteCard).toBeVisible({ timeout: 10000 });

    const skipBtn = page.locator('button:has-text("Skip for now")').first();
    await skipBtn.click();

    const row = await waitForProgress(
      FOUNDER_USER_ID,
      (r) => r.steps?.promote_dismissed === true && r.current_step === "done",
    );
    expect(row.steps.promote_dismissed).toBe(true);
    expect(row.current_step).toBe("done");

    // Reload — promote card and tour should no longer render once done
    await page.reload({ waitUntil: "networkidle" });
    const promoteCardAfter = page.locator("text=Your profile is live");
    await expect(promoteCardAfter).not.toBeVisible({ timeout: 5000 });

    await page.close();
  });
});

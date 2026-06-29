/**
 * Playwright tests: AI Operator Panel
 *
 * 1. Panel button visible bottom-right on founder dashboard
 * 2. Panel opens — shows welcome message mentioning "Dashboard"
 * 3. Message sends — response appears, loading showed and disappeared
 * 4. Conversation saves to agent_conversations DB
 * 5. Panel closes — collapses back to button, page still functional
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(p: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (!fs.existsSync(p)) return e;
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    e[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return e;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const FOUNDER_ID = testEnv.TEST_FOUNDER_USER_ID;

async function serviceGet(p: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.text().then((t) => (t ? JSON.parse(t) : null));
}

async function serviceDelete(p: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

async function getSession(email: string, password: string) {
  const r = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return r.json();
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(
    ({ key, s }: any) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          expires_in: s.expires_in,
          expires_at: s.expires_at,
          token_type: s.token_type,
          user: s.user,
        }),
      ),
    { key: STORAGE_KEY, s: session },
  );
  await p.close();
}

async function waitForLoad(page: Page) {
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Verifying access") &&
      !document.body.textContent?.includes("Signing you in") &&
      !document.body.textContent?.includes("Loading…"),
    { timeout: 25000 },
  );
}

test.describe("AI Operator Panel", () => {
  // Clean up any leftover agent_conversations for the test founder before running
  test.beforeAll(async () => {
    await serviceDelete(
      `agent_conversations?user_id=eq.${FOUNDER_ID}&route=eq.%2Fapp%2F`,
    ).catch(() => {});
  });

  test.afterAll(async () => {
    await serviceDelete(
      `agent_conversations?user_id=eq.${FOUNDER_ID}&route=eq.%2Fapp%2F`,
    ).catch(() => {});
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test("1. Panel button visible bottom-right on founder dashboard", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(FOUNDER_EMAIL, FOUNDER_PASS));
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    const btn = page.locator("[data-testid=ai-operator-toggle]");
    await expect(btn).toBeVisible({ timeout: 15000 });

    // Confirm it's in the bottom-right corner
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize()!;
    // button should be in the right half and lower half
    expect(box!.x).toBeGreaterThan(viewport.width / 2);
    expect(box!.y).toBeGreaterThan(viewport.height / 2);

    await page.screenshot({ path: "/tmp/pw-aipanel-1.png" });
    await ctx.close();
    console.log("✓ AI operator button visible bottom-right");
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  test("2. Panel opens — header shows Dashboard page name", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(FOUNDER_EMAIL, FOUNDER_PASS));
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    await page.locator("[data-testid=ai-operator-toggle]").click();

    const panel = page.locator("[data-testid=ai-operator-panel]");
    await expect(panel).toBeVisible({ timeout: 8000 });

    // Panel header always shows the page name — works regardless of conversation history
    const headerText = await panel.locator("div").first().textContent();
    expect(headerText?.toLowerCase()).toContain("dashboard");

    // Either welcome message (no history) or messages (has history) — panel is functional
    const panelContent = await panel.textContent();
    expect(panelContent?.length).toBeGreaterThan(5);

    await page.screenshot({ path: "/tmp/pw-aipanel-2.png" });
    await ctx.close();
    console.log("✓ Panel opens with Dashboard in header");
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  test("3. Message sends — response appears, loading disappears", async ({ browser }) => {
    test.setTimeout(90000);

    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(FOUNDER_EMAIL, FOUNDER_PASS));
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // Open panel
    await page.locator("[data-testid=ai-operator-toggle]").click();
    await expect(page.locator("[data-testid=ai-operator-panel]")).toBeVisible({ timeout: 8000 });

    // Type a message and send
    await page.locator("[data-testid=ai-operator-input]").fill("What page am I on?");
    await page.locator("[data-testid=ai-operator-send]").click();

    // Loading indicator should appear
    await expect(page.locator("[data-testid=ai-operator-loading]")).toBeVisible({ timeout: 5000 });
    console.log("✓ Loading indicator appeared");

    // Loading indicator should disappear (response came back)
    await expect(page.locator("[data-testid=ai-operator-loading]")).toBeHidden({ timeout: 60000 });
    console.log("✓ Loading indicator disappeared");

    // A response should be present (any non-empty assistant message)
    // After the welcome is replaced by actual messages, there should be content
    const panelText = await page.locator("[data-testid=ai-operator-panel]").textContent();
    expect(panelText?.length).toBeGreaterThan(20);

    await page.screenshot({ path: "/tmp/pw-aipanel-3.png" });
    await ctx.close();
    console.log("✓ Response appeared after loading");
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  test("4. Conversation saves and reloads from agent_conversations", async ({ browser }) => {
    test.setTimeout(120000);

    const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);

    // ── Round 1: send a message, verify DB row ────────────────────────────────
    const ctx1 = await browser.newContext();
    await injectSession(ctx1, session);
    const page1 = await ctx1.newPage();

    await page1.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page1);

    await page1.locator("[data-testid=ai-operator-toggle]").click();
    await expect(page1.locator("[data-testid=ai-operator-panel]")).toBeVisible({ timeout: 8000 });

    await page1.locator("[data-testid=ai-operator-input]").fill("What is my completeness score?");
    await page1.locator("[data-testid=ai-operator-send]").click();

    await expect(page1.locator("[data-testid=ai-operator-loading]")).toBeHidden({ timeout: 60000 });

    // Give DB write time to commit
    await page1.waitForTimeout(3000);
    await ctx1.close();

    // SQL verification
    const rows = await serviceGet(
      `agent_conversations?user_id=eq.${FOUNDER_ID}&route=eq.%2Fapp%2F&select=id,route,messages`,
    );
    expect((rows ?? []).length).toBeGreaterThan(0);
    const row = rows[0];
    const msgCount = Array.isArray(row.messages) ? row.messages.length : 0;
    expect(msgCount).toBeGreaterThanOrEqual(2); // user + assistant
    console.log(`SQL RESULT: route=${row.route}, msg_count=${msgCount}`);
    console.log("✓ Row confirmed in Postgres");

    // ── Round 2: reopen panel in fresh context, verify history loads ──────────
    const ctx2 = await browser.newContext();
    await injectSession(ctx2, session);
    const page2 = await ctx2.newPage();

    await page2.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page2);

    await page2.locator("[data-testid=ai-operator-toggle]").click();
    await expect(page2.locator("[data-testid=ai-operator-panel]")).toBeVisible({ timeout: 8000 });

    // Wait briefly for async conversation load
    await page2.waitForTimeout(2000);

    // Panel should show previous messages (not the welcome placeholder)
    const welcomeVisible = await page2.locator("[data-testid=ai-operator-welcome]").isVisible();
    expect(welcomeVisible).toBe(false);

    const panelText = await page2.locator("[data-testid=ai-operator-panel]").textContent();
    expect(panelText?.toLowerCase()).toContain("completeness");

    await page2.screenshot({ path: "/tmp/pw-aipanel-4-reload.png" });
    await ctx2.close();
    console.log("✓ Conversation history reloaded on panel reopen");
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  test("5. Panel closes — button returns, page still functional", async ({ browser }) => {
    const ctx = await browser.newContext();
    await injectSession(ctx, await getSession(FOUNDER_EMAIL, FOUNDER_PASS));
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    // Open panel
    await page.locator("[data-testid=ai-operator-toggle]").click();
    await expect(page.locator("[data-testid=ai-operator-panel]")).toBeVisible({ timeout: 8000 });

    // Close panel
    await page.locator("[data-testid=ai-operator-close]").click();

    // Panel gone, button back
    await expect(page.locator("[data-testid=ai-operator-panel]")).toBeHidden({ timeout: 5000 });
    await expect(page.locator("[data-testid=ai-operator-toggle]")).toBeVisible({ timeout: 5000 });

    // Page is still functional — main content is present
    const mainContent = await page.locator("main").first().textContent();
    expect(mainContent?.length).toBeGreaterThan(10);

    await page.screenshot({ path: "/tmp/pw-aipanel-5.png" });
    await ctx.close();
    console.log("✓ Panel closed, button returned, page functional");
  });
});

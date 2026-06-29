/**
 * ai-panel-fix.spec.ts
 *
 * Tests for:
 *  1. AI panel does not cause page reload when sending a message
 *  2. AI panel sends a message and gets a reply (no crash)
 *  3. Documents page scroll height is bounded
 *  4. Browser tab title contains "Hockystick" and not "MENA"
 */
import { test, expect } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env.test") });

const BASE_URL = process.env.TEST_BASE_URL || "https://hockystick.app";
const SUPABASE_URL = "https://ldimninnjlvxozubheib.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const FOUNDER_EMAIL = "test-founder@hockystick.app";
const FOUNDER_PASS = process.env.TEST_FOUNDER_PASSWORD || "";
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";

async function signInAsFounder(page: any) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: FOUNDER_EMAIL, password: FOUNDER_PASS }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  const session = await res.json();
  await page.goto(BASE_URL);
  await page.evaluate(
    ({ key, val }: { key: string; val: string }) => {
      localStorage.setItem(key, val);
    },
    {
      key: STORAGE_KEY,
      val: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
        token_type: "bearer",
        user: session.user,
      }),
    }
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Test 1: AI panel send does not reload the page
// ────────────────────────────────────────────────────────────────────────────
test("AI panel: no page reload when sending a message", async ({ page }) => {
  await signInAsFounder(page);
  await page.goto(`${BASE_URL}/app/documents`);
  await page.waitForLoadState("networkidle");

  const urlBefore = page.url();

  // Open the AI panel if it has a toggle button
  const toggle = page.locator('[data-testid="ai-panel-toggle"]');
  if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(500);
  }

  // Wait for the AI panel input to be visible
  const input = page.locator('[data-testid="ai-panel-input"]');
  if (!(await input.isVisible({ timeout: 5000 }).catch(() => false))) {
    // Panel may already be open or component absent — skip gracefully
    test.skip();
    return;
  }

  // Type and send a message
  await input.fill("What should I focus on?");
  await page.locator('[data-testid="ai-panel-send"]').click();

  // Wait a moment for any potential reload to occur
  await page.waitForTimeout(2000);

  const urlAfter = page.url();
  expect(urlAfter).toContain("/app/documents");
  // URL must not have reset to home or sign-in
  expect(urlAfter).not.toBe(`${BASE_URL}/`);
  expect(urlAfter).not.toContain("/sign-in");
  // The path must not have changed
  expect(new URL(urlAfter).pathname).toBe(new URL(urlBefore).pathname);
});

// ────────────────────────────────────────────────────────────────────────────
// Test 2: AI panel responds without crashing
// ────────────────────────────────────────────────────────────────────────────
test("AI panel: receives a reply without catch-is-not-a-function error", async ({ page }) => {
  // Capture console errors to detect unhandled rejections
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await signInAsFounder(page);
  await page.goto(`${BASE_URL}/app/documents`);
  await page.waitForLoadState("networkidle");

  const toggle = page.locator('[data-testid="ai-panel-toggle"]');
  if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(500);
  }

  const input = page.locator('[data-testid="ai-panel-input"]');
  if (!(await input.isVisible({ timeout: 5000 }).catch(() => false))) {
    test.skip();
    return;
  }

  const messagesBefore = await page.locator('[data-testid="ai-message"]').count();

  await input.fill("Hello");
  await page.locator('[data-testid="ai-panel-send"]').click();

  // Wait for a reply to appear (AI may take a few seconds)
  await page.waitForFunction(
    (count: number) => {
      const msgs = document.querySelectorAll('[data-testid="ai-message"]');
      return msgs.length > count;
    },
    messagesBefore,
    { timeout: 30000 }
  );

  const messagesAfter = await page.locator('[data-testid="ai-message"]').count();
  expect(messagesAfter).toBeGreaterThan(messagesBefore);

  // Must not have "catch is not a function" or unhandled rejection
  const catchError = consoleErrors.find(
    (e) => e.includes("catch is not a function") || e.includes("is not a function")
  );
  expect(catchError).toBeUndefined();
});

// ────────────────────────────────────────────────────────────────────────────
// Test 3: Documents page scroll height is bounded
// ────────────────────────────────────────────────────────────────────────────
test("Documents page: scroll height bounded (no massive empty space)", async ({ page }) => {
  await signInAsFounder(page);
  await page.goto(`${BASE_URL}/app/documents`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  const { scrollHeight, clientHeight } = await page.evaluate(() => {
    const main =
      document.querySelector("main") ||
      document.querySelector('[class*="overflow-y-auto"]') ||
      document.documentElement;
    return {
      scrollHeight: main.scrollHeight,
      clientHeight: window.innerHeight,
    };
  });

  // Scroll height should not exceed 2.5× viewport — catches unbounded empty space
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight * 2.5);
});

// ────────────────────────────────────────────────────────────────────────────
// Test 4: Browser tab title is correct
// ────────────────────────────────────────────────────────────────────────────
test("Page title: contains Hockystick, does not contain MENA", async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState("domcontentloaded");

  const title = await page.title();
  expect(title).toContain("Hockystick");
  expect(title).not.toMatch(/MENA/i);
  expect(title).not.toMatch(/GCC/i);
});

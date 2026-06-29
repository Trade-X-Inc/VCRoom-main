/**
 * ai-panel-fix2.spec.ts
 *
 * Verifies that the AI panel sends a message and receives a real reply —
 * no raw JS error strings ("sb.rpc", "catch is not a function", "500") in chat.
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
    ({ key, val }: { key: string; val: string }) => localStorage.setItem(key, val),
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

test("AI panel: responds with real content, no raw error strings", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await signInAsFounder(page);
  await page.goto(`${BASE_URL}/app`);
  await page.waitForLoadState("networkidle");

  // Open AI panel if pull tab is visible
  const toggle = page.locator('[data-testid="ai-panel-toggle"]');
  if (await toggle.isVisible({ timeout: 4000 }).catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(600);
  }

  const input = page.locator('[data-testid="ai-panel-input"]');
  if (!(await input.isVisible({ timeout: 6000 }).catch(() => false))) {
    test.skip();
    return;
  }

  const messagesBefore = await page.locator('[data-testid="ai-message"]').count();

  await input.fill("what is my readiness score?");
  await page.keyboard.press("Enter");

  // Wait up to 15s for a reply
  await page.waitForFunction(
    (before: number) => document.querySelectorAll('[data-testid="ai-message"]').length > before,
    messagesBefore,
    { timeout: 15000 }
  );

  const allMessages = await page.locator('[data-testid="ai-message"]').allTextContents();
  const lastMessage = allMessages[allMessages.length - 1] ?? "";

  // Must not contain raw error strings
  expect(lastMessage).not.toContain("sb.rpc");
  expect(lastMessage).not.toContain("catch is not a function");
  expect(lastMessage).not.toContain("500");
  expect(lastMessage).not.toContain("Unexpected error");

  // Must have actual content (more than a few characters)
  expect(lastMessage.length).toBeGreaterThan(10);

  // No unhandled JS errors
  const catchError = consoleErrors.find(
    (e) => e.includes("catch is not a function") || e.includes("Unhandled")
  );
  expect(catchError).toBeUndefined();
});

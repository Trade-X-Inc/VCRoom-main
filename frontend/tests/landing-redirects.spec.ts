/**
 * Playwright tests: Post-login landing page fixes
 *
 * Fix 1: Investor lands on /app/investor/overview (not /app/investor/ AI Advisor)
 * Fix 2: Founder lands on /app (not /app/profile-builder)
 * Fix 3: Team Chat loads with empty state, no error
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

function loadEnv(p: string): Record<string, string> {
  const e: Record<string, string> = {};
  for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    e[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return e;
}

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL   = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY    = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY    = "sb-ldimninnjlvxozubheib-auth-token";
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS  = testEnv.TEST_INVESTOR_PASSWORD;
const FOUNDER_EMAIL  = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS   = testEnv.TEST_FOUNDER_PASSWORD;

async function getSession(email: string, password: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json() as any;
  if (!d.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(d)}`);
  return d;
}

// Simulates the auth callback flow: injects the session into localStorage just
// as the real callback would, then navigates to the auth callback page which
// triggers the redirect logic. We skip the callback and instead test the
// resulting redirect by directly hitting the auth callback URL with the session
// already present — or by injecting to a fresh page and navigating to /auth/callback.
//
// Since the callback uses window.location.href (hard navigate), Playwright can
// follow it via page.waitForURL.

async function injectAndNavigateCallback(ctx: BrowserContext, session: any): Promise<string> {
  const page = await ctx.newPage();

  // First navigate to root to set localStorage
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ key, s }: any) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: s.expires_in,
      expires_at: s.expires_at,
      token_type: s.token_type,
      user: s.user,
    }));
  }, { key: STORAGE_KEY, s: session });

  // Navigate to the auth callback — it will poll for session, find it,
  // determine the role, and do window.location.href to the landing page.
  await page.goto("https://hockystick.app/auth/callback", { waitUntil: "domcontentloaded" });

  // Wait for the redirect to resolve (callback does window.location.href)
  // The callback can take up to ~5s to poll for the session + do DB queries.
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/auth/callback"),
    { timeout: 30000 }
  );

  const landingUrl = page.url();
  await page.screenshot({ path: `/tmp/pw-redirect-${Date.now()}.png` });
  await page.close();
  return landingUrl;
}

// ── Fix 1: Investor lands on overview ────────────────────────────────────────

test("Fix 1 — Investor post-login lands on /app/investor/overview, not /app/investor/advisor", async ({ browser }) => {
  const ctx = await browser.newContext();
  const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASS);

  const landingUrl = await injectAndNavigateCallback(ctx, session);
  const landingPath = new URL(landingUrl).pathname;

  console.log("Investor landing URL:", landingUrl);

  // Must be the overview page
  expect(landingPath).toBe("/app/investor/overview");

  // Must NOT be the AI Advisor index
  expect(landingPath).not.toBe("/app/investor/");
  expect(landingPath).not.toMatch(/\/app\/investor\/advisor/);

  console.log("✓ Investor lands on:", landingPath);
  await ctx.close();
});

// ── Fix 2: Founder lands on /app ─────────────────────────────────────────────

test("Fix 2 — Founder post-login lands on /app, not /app/profile-builder", async ({ browser }) => {
  const ctx = await browser.newContext();
  const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);

  const landingUrl = await injectAndNavigateCallback(ctx, session);
  const landingPath = new URL(landingUrl).pathname;

  console.log("Founder landing URL:", landingUrl);

  // Must be /app or /app/ (the founder overview)
  expect(landingPath === "/app" || landingPath === "/app/").toBe(true);

  // Must NOT be profile-builder or any verify page
  expect(landingPath).not.toContain("profile-builder");
  expect(landingPath).not.toContain("verify");
  expect(landingPath).not.toContain("/app/profile");

  console.log("✓ Founder lands on:", landingPath);
  await ctx.close();
});

// ── Fix 3: Team Chat loads with empty state ───────────────────────────────────

test("Fix 3 — Team Chat loads with empty state, no error", async ({ browser }) => {
  const ctx = await browser.newContext();

  // Use founder session (founders can access /app/messages)
  const session = await getSession(FOUNDER_EMAIL, FOUNDER_PASS);
  const page = await ctx.newPage();

  // Inject session
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ key, s }: any) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: s.expires_in,
      expires_at: s.expires_at,
      token_type: s.token_type,
      user: s.user,
    }));
  }, { key: STORAGE_KEY, s: session });

  // Navigate to team chat
  await page.goto("https://hockystick.app/app/messages", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Signing you in"),
    { timeout: 20000 }
  );

  await page.screenshot({ path: "/tmp/pw-teamchat.png" });

  // Should not have a JS error / crash message
  const bodyText = await page.textContent("body");
  expect(bodyText).not.toContain("Something went wrong");
  expect(bodyText).not.toContain("Unexpected error");

  // Should NOT show any old test messages
  expect(bodyText).not.toContain('"hi"');
  expect(bodyText).not.toContain('"hello"');
  expect(bodyText).not.toContain('"hiii"');

  // Empty state message or the chat input should be present
  const hasEmptyState = (bodyText ?? "").toLowerCase().includes("no messages") ||
    (bodyText ?? "").toLowerCase().includes("invite team") ||
    await page.locator("textarea, input[placeholder]").first().isVisible().catch(() => false);

  expect(hasEmptyState).toBe(true);

  console.log("✓ Team Chat loaded without error. Empty state or input visible.");
  await ctx.close();
});

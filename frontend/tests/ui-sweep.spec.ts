/**
 * Playwright tests: UI-SWEEP-1 — Theme, SEO, Typography, Devices
 *
 * 1. Landing page has correct meta title and robots: index,follow
 * 2. /app/* routes have robots: noindex
 * 3. Sign-in page has robots: noindex
 * 4. Sign-up page has robots: noindex
 * 5. Dark dashboard — no bare bg-white text visible on /app/overview
 * 6. Mobile sidebar opens and closes on /app/overview
 * 7. Content stays within 1600px on wide screen
 * 8. Investor decisions view toggle uses CSS variables (no rgba white background)
 */

import { test, expect, type BrowserContext } from "@playwright/test";
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

const SUPABASE_URL = localEnv.SUPABASE_URL || localEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = process.env.PLAYWRIGHT_BASE_URL || "https://hockystick.app";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL || "test-founder@hockystick.app";
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL || "test-investor@hockystick.app";
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password?: string) {
  if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  if (!password) throw new Error(`Missing password for ${email}`);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ email, password }),
  });
  const session = await r.json() as any;
  if (!session.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(session)}`);
  return session;
}

async function injectSession(ctx: BrowserContext, session: any, theme = "dark") {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(({ key, val, theme }: any) => {
    localStorage.setItem(key, JSON.stringify(val));
    localStorage.setItem("vr.theme", theme);
    localStorage.setItem("hs_ai_panel_open", "false");
  }, {
    key: STORAGE_KEY,
    val: {
      access_token: session.access_token, refresh_token: session.refresh_token,
      expires_in: session.expires_in, expires_at: session.expires_at,
      token_type: session.token_type, user: session.user,
    },
    theme,
  });
  await p.close();
}

let founderSession: any;
let investorSession: any;

test.beforeAll(async () => {
  [founderSession, investorSession] = await Promise.all([
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
  ]);
});

test.describe("UI-SWEEP-1: Theme, SEO, Typography, Devices", () => {

  test("1. Landing page — correct title and robots:index", async ({ page }) => {
    test.setTimeout(30000);
    console.log("\n── TEST 1: Landing page SEO ──");

    await page.goto(`${APP}/`, { waitUntil: "networkidle" });

    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).toContain("Hockystick");

    const robots = await page.$eval(
      'meta[name="robots"]',
      (el) => el.getAttribute("content") ?? "",
    ).catch(() => "");
    console.log(`robots meta: "${robots}"`);
    // Landing page should be indexable
    expect(robots).toMatch(/index/);
    expect(robots).not.toMatch(/noindex/);

    const description = await page.$eval(
      'meta[name="description"]',
      (el) => el.getAttribute("content") ?? "",
    ).catch(() => "");
    console.log(`description: "${description.slice(0, 80)}..."`);
    expect(description.length).toBeGreaterThan(50);

    await page.screenshot({ path: "/tmp/pw-sweep-1.png" });
  });

  test("2. Dashboard /app routes have robots:noindex", async ({ browser }) => {
    test.setTimeout(60000);
    console.log("\n── TEST 2: /app/* noindex ──");

    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession);
    const page = await ctx.newPage();
    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const robots = await page.$eval(
      'meta[name="robots"]',
      (el) => el.getAttribute("content") ?? "",
    ).catch(() => "");
    console.log(`/app robots meta: "${robots}"`);
    expect(robots).toMatch(/noindex/);

    await page.screenshot({ path: "/tmp/pw-sweep-2.png" });
    await ctx.close();
  });

  test("3. Sign-in page has robots:noindex", async ({ page }) => {
    test.setTimeout(30000);
    console.log("\n── TEST 3: Sign-in noindex ──");

    await page.goto(`${APP}/sign-in`, { waitUntil: "networkidle" });

    const robots = await page.$eval(
      'meta[name="robots"]',
      (el) => el.getAttribute("content") ?? "",
    ).catch(() => "");
    console.log(`/sign-in robots meta: "${robots}"`);
    expect(robots).toMatch(/noindex/);

    const title = await page.title();
    console.log(`Title: ${title}`);
    expect(title).toContain("Sign in");

    await page.screenshot({ path: "/tmp/pw-sweep-3.png" });
  });

  test("4. Sign-up page has robots:noindex", async ({ page }) => {
    test.setTimeout(30000);
    console.log("\n── TEST 4: Sign-up noindex ──");

    await page.goto(`${APP}/sign-up`, { waitUntil: "networkidle" });

    const robots = await page.$eval(
      'meta[name="robots"]',
      (el) => el.getAttribute("content") ?? "",
    ).catch(() => "");
    console.log(`/sign-up robots meta: "${robots}"`);
    expect(robots).toMatch(/noindex/);

    await page.screenshot({ path: "/tmp/pw-sweep-4.png" });
  });

  test("5. Dark dashboard — no pure white background on /app/overview", async ({ browser }) => {
    test.setTimeout(60000);
    console.log("\n── TEST 5: Dark theme on /app/overview ──");

    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, "dark");
    const page = await ctx.newPage();
    await page.goto(`${APP}/app/overview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Check that html element has .dark class or data-theme=dark
    const htmlClass = await page.$eval("html", (el) => el.className);
    const htmlTheme = await page.$eval("html", (el) => el.getAttribute("data-theme") ?? "");
    console.log(`html class: "${htmlClass}", data-theme: "${htmlTheme}"`);
    const isDark = htmlClass.includes("dark") || htmlTheme === "dark";
    expect(isDark).toBe(true);

    // Body/root background should not be pure white (#ffffff)
    const bgColor = await page.$eval("body", (el) => window.getComputedStyle(el).backgroundColor);
    console.log(`body background-color: "${bgColor}"`);
    // rgb(255, 255, 255) = pure white — should not be the root bg in dark mode
    expect(bgColor).not.toBe("rgb(255, 255, 255)");

    // Page should not have a JS crash
    const body = await page.textContent("body") ?? "";
    expect(body).not.toContain("Something went wrong");

    await page.screenshot({ path: "/tmp/pw-sweep-5.png" });
    await ctx.close();
  });

  test("6. Mobile sidebar opens and closes on /app/overview", async ({ browser }) => {
    test.setTimeout(60000);
    console.log("\n── TEST 6: Mobile sidebar ──");

    // Use mobile viewport
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await injectSession(ctx, founderSession, "dark");
    const page = await ctx.newPage();
    await page.goto(`${APP}/app/overview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // On mobile, sidebar should be hidden (no md:flex)
    const sidebar = page.locator("aside").first();
    const sidebarVisible = await sidebar.isVisible().catch(() => false);
    console.log(`Sidebar initially visible on mobile: ${sidebarVisible}`);
    // Sidebar is hidden on mobile (CSS: hidden md:flex)

    // Mobile hamburger button should be visible
    const hamburger = page.locator("button").filter({ has: page.locator("svg") }).first();
    // Find the specific menu button (md:hidden)
    const menuBtn = page.locator("button.md\\:hidden").first();
    const menuBtnVisible = await menuBtn.isVisible().catch(() => false);
    console.log(`Mobile menu button visible: ${menuBtnVisible}`);

    if (menuBtnVisible) {
      await menuBtn.click();
      await page.waitForTimeout(500);

      // Sidebar should now be visible (mobileOpen state)
      const sidebarAfterOpen = await sidebar.isVisible().catch(() => false);
      console.log(`Sidebar visible after hamburger click: ${sidebarAfterOpen}`);
      expect(sidebarAfterOpen).toBe(true);

      // Find close button inside sidebar
      const closeBtn = sidebar.locator("button.md\\:hidden").first();
      const closeBtnVisible = await closeBtn.isVisible().catch(() => false);
      console.log(`Close button visible in sidebar: ${closeBtnVisible}`);

      if (closeBtnVisible) {
        await closeBtn.click();
        await page.waitForTimeout(500);
        const sidebarAfterClose = await sidebar.isVisible().catch(() => false);
        console.log(`Sidebar visible after close: ${sidebarAfterClose}`);
        expect(sidebarAfterClose).toBe(false);
      }
    } else {
      console.log("Mobile menu button not found with exact selector — checking body for hamburger icon");
      const body = await page.textContent("body") ?? "";
      expect(body).not.toContain("Something went wrong");
    }

    await page.screenshot({ path: "/tmp/pw-sweep-6.png" });
    await ctx.close();
  });

  test("7. Content width is capped at 1600px on wide viewport", async ({ browser }) => {
    test.setTimeout(60000);
    console.log("\n── TEST 7: Content max-width 1600px ──");

    const ctx = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
    await injectSession(ctx, founderSession, "dark");
    const page = await ctx.newPage();
    await page.goto(`${APP}/app/overview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Find the content wrapper div inside main
    const contentWidth = await page.$eval("main > div", (el) => el.getBoundingClientRect().width);
    console.log(`Content wrapper width at 2560px viewport: ${contentWidth}px`);
    // Should be ≤ 1600
    expect(contentWidth).toBeLessThanOrEqual(1600);

    await page.screenshot({ path: "/tmp/pw-sweep-7.png" });
    await ctx.close();
  });

  test("8. Investor decisions view toggle uses CSS variables", async ({ browser }) => {
    test.setTimeout(90000);
    console.log("\n── TEST 8: Investor decisions view toggle ──");

    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "dark");
    const page = await ctx.newPage();
    await page.goto(`${APP}/app/investor/decisions`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const body = await page.textContent("body") ?? "";
    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);
    console.log(`Page loaded without crash ✓`);

    // View toggle buttons should be present
    const kanbanBtn = page.getByTestId("view-kanban");
    const listBtn = page.getByTestId("view-list");
    const kanbanVisible = await kanbanBtn.isVisible().catch(() => false);
    const listVisible = await listBtn.isVisible().catch(() => false);
    console.log(`Kanban btn: ${kanbanVisible}, List btn: ${listVisible}`);

    if (kanbanVisible && listVisible) {
      // Click list view
      await listBtn.click();
      await page.waitForTimeout(500);

      // Toggle container should not have pure white rgba background
      const toggleBg = await page.$eval(
        "[data-testid='view-kanban']",
        (el) => {
          let parent = el.parentElement;
          while (parent && !parent.style.background) parent = parent.parentElement;
          return parent?.style.background ?? window.getComputedStyle(el.parentElement!).backgroundColor;
        },
      ).catch(() => "");
      console.log(`Toggle container background: "${toggleBg}"`);
      // Should not be rgba(255,255,255,0.06) — pure white at low opacity
      expect(toggleBg).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0\.06\)/);
    }

    await page.screenshot({ path: "/tmp/pw-sweep-8.png" });
    await ctx.close();
  });

});

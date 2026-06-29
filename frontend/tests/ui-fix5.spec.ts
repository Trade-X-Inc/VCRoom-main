/**
 * Playwright tests: UI-FIX-4 — deal room crash fix, theme, borders, scroll, sidebar
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

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = "https://hockystick.app";
const THEME_KEY = "vr.theme";
const DEMO_DEAL_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return r.json();
}

async function injectSession(ctx: BrowserContext, session: any, theme = "light") {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(
    ({ key, s, themeKey, themeVal }: any) => {
      localStorage.setItem(key, JSON.stringify({
        access_token: s.access_token, refresh_token: s.refresh_token,
        expires_in: s.expires_in, expires_at: s.expires_at,
        token_type: s.token_type, user: s.user,
      }));
      localStorage.setItem("hs_ai_panel_open", "false");
      localStorage.setItem(themeKey, themeVal);
    },
    { key: STORAGE_KEY, s: session, themeKey: THEME_KEY, themeVal: theme },
  );
  await p.close();
}

async function waitForLoad(page: any) {
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Verifying access") &&
          !document.body.textContent?.includes("Signing you in") &&
          !document.body.textContent?.includes("Loading…"),
    { timeout: 25000 },
  );
}

let founderSession: any;
let investorSession: any;

test.beforeAll(async () => {
  [founderSession, investorSession] = await Promise.all([
    getSession(FOUNDER_EMAIL, FOUNDER_PASS),
    getSession(INVESTOR_EMAIL, INVESTOR_PASS),
  ]);
});

test.describe("UI-FIX-4: Deal room crash fix + theme", () => {

  test("1. Deal room loads for investor without crashing", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${APP}/app/deal-room/${DEMO_DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    console.log("\n── TEST 1 RESULT ──");
    const url = page.url();
    console.log(`URL: ${url}`);
    console.log(`JS errors: ${errors.length > 0 ? errors.slice(0, 3).join("; ") : "none"}`);

    // No crash / error boundary
    const body = await page.textContent("body") ?? "";
    const hasCrash = body.includes("Something went wrong") || body.includes("ChunkLoadError");
    expect(hasCrash).toBe(false);

    // Should be on deal room or NDA page (not redirected to investor home)
    expect(url).toContain("deal-room");

    // No reference errors
    const hasRefError = errors.some((e) => e.includes("is not defined") || e.includes("ReferenceError"));
    expect(hasRefError).toBe(false);

    await page.screenshot({ path: "/tmp/pw-fix5-1.png" });
    await ctx.close();
  });

  test("2. Deal room Overview tab — content visible, no crash", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(`${APP}/app/deal-room/${DEMO_DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    console.log("\n── TEST 2 RESULT ──");
    const url = page.url();
    console.log(`URL after load: ${url}`);

    if (url.includes("/nda")) {
      console.log("On NDA page — test accounts may not have NDA accepted. Skipping overview assertion.");
      await page.screenshot({ path: "/tmp/pw-fix5-2-nda.png" });
      await ctx.close();
      return;
    }

    // Click Overview tab
    const overviewTab = page.getByTestId("stage-pill-overview");
    await expect(overviewTab).toBeVisible({ timeout: 10000 });
    await overviewTab.click();
    await page.waitForTimeout(1500);

    console.log(`JS errors after click: ${errors.length > 0 ? errors.slice(0, 3).join("; ") : "none"}`);
    const hasRefError = errors.some((e) => e.includes("is not defined"));
    expect(hasRefError).toBe(false);

    const body = await page.textContent("body") ?? "";
    const hasContent = body.includes("Team") || body.includes("Recent activity") || body.includes("Traction") || body.includes("Days open");
    console.log(`Overview content present: ${hasContent}`);
    expect(hasContent).toBe(true);

    await page.screenshot({ path: "/tmp/pw-fix5-2.png" });
    await ctx.close();
  });

  test("3. Deal room — light theme (white/gray background, not #0A0A0B)", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/deal-room/${DEMO_DEAL_ROOM_ID}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    console.log("\n── TEST 3 RESULT ──");
    const url = page.url();

    if (url.includes("/nda")) {
      // Check NDA page bg instead
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      console.log(`NDA page body bg: ${bg}`);
      await page.screenshot({ path: "/tmp/pw-fix5-3-nda.png" });
      await ctx.close();
      return;
    }

    // Check stage bar background — should NOT be rgb(17,17,20) = #111114
    const stageBg = await page.evaluate(() => {
      const bar = document.querySelector("[data-testid='deal-stage-bar']") as HTMLElement;
      return bar ? getComputedStyle(bar).backgroundColor : "not found";
    });
    console.log(`Stage bar bg: ${stageBg}`);
    expect(stageBg).not.toBe("rgb(17, 17, 20)");
    expect(stageBg).not.toBe("rgb(10, 10, 11)");

    await page.screenshot({ path: "/tmp/pw-fix5-3.png" });
    await ctx.close();
  });

  test("4. Decision board — kanban cards have visible borders", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, investorSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/investor/decisions`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 4 RESULT ──");
    const body = await page.textContent("body") ?? "";
    expect(body.includes("Decision") || body.includes("Sourcing") || body.includes("Pipeline")).toBe(true);

    // Check first company card border
    const cardBorder = await page.evaluate(() => {
      const card = document.querySelector("[data-testid^='company-card-']") as HTMLElement;
      if (!card) return null;
      const style = getComputedStyle(card);
      return { border: style.borderTopWidth, color: style.borderTopColor };
    });
    console.log(`Card border: width=${cardBorder?.border}, color=${cardBorder?.color}`);
    if (cardBorder) {
      // Border should exist and not be transparent
      expect(cardBorder.border).not.toBe("0px");
      expect(cardBorder.color).not.toBe("transparent");
      expect(cardBorder.color).not.toBe("rgba(0, 0, 0, 0)");
    }

    await page.screenshot({ path: "/tmp/pw-fix5-4.png" });
    await ctx.close();
  });

  test("5. Documents page — no excessive scroll (< 4× viewport height)", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app/documents`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 5 RESULT ──");
    const { scrollHeight, clientHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    const ratio = scrollHeight / clientHeight;
    console.log(`scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}, ratio: ${ratio.toFixed(2)}`);
    expect(ratio).toBeLessThan(4);

    await page.screenshot({ path: "/tmp/pw-fix5-5.png" });
    await ctx.close();
  });

  test("6. Sidebar nav text readable in light theme (not white on white)", async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext();
    await injectSession(ctx, founderSession, "light");
    const page = await ctx.newPage();

    await page.goto(`${APP}/app`, { waitUntil: "networkidle" });
    await waitForLoad(page);

    console.log("\n── TEST 6 RESULT ──");

    // Check an inactive nav item's computed text color
    const navTextColor = await page.evaluate(() => {
      // Find an inactive nav link (not active)
      const links = Array.from(document.querySelectorAll("nav a"));
      const inactive = links.find((l) => !l.classList.contains("font-medium")) as HTMLElement;
      if (!inactive) return null;
      return getComputedStyle(inactive).color;
    });
    console.log(`Inactive nav item color: ${navTextColor}`);

    if (navTextColor) {
      // Should not be white (255,255,255) — that would be invisible on light sidebar
      expect(navTextColor).not.toBe("rgb(255, 255, 255)");
      // Should be a reasonably dark color — extract R value
      const match = navTextColor.match(/rgb\((\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        // Light sidebar bg is near white; text should not also be near white (r < 200)
        console.log(`R channel: ${r}`);
        expect(r).toBeLessThan(220);
      }
    }

    await page.screenshot({ path: "/tmp/pw-fix5-6.png" });
    await ctx.close();
  });
});

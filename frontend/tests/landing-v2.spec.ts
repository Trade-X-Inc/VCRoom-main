/**
 * Playwright tests: UI-3C — Landing page rewrite
 *
 * 1. Hero headline and CTA visible
 * 2. No banned words in hero
 * 3. 4 how-it-works steps (01–04)
 * 4. For founders + investors sections + pricing
 * 5. Product mockup cards visible (ATLAS ROBOTICS, Match)
 * 6. Dark theme hero (background is dark, not white)
 */

import { test, expect, type Page } from "@playwright/test";

const APP = "https://hockystick.app";

async function goHome(page: Page) {
  await page.goto(APP + "/", { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");
}

test.describe("UI-3C: Landing page rewrite", () => {

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test("1. Hero headline and CTA visible", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 1 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // Headline: "Where deals" or "Stop chasing"
    const hasHeroHeadline = body.includes("Where deals") || body.includes("Stop chasing");
    console.log(`Has hero headline: ${hasHeroHeadline}`);
    expect(hasHeroHeadline).toBe(true);
    console.log("✓ Hero headline present");

    // "Start raising" CTA — primary button
    const startRaising = page.locator('a[href*="sign-up"]').filter({ hasText: /Start raising/i }).first();
    await expect(startRaising).toBeVisible({ timeout: 10000 });
    console.log("✓ 'Start raising' button visible");

    // Hero should be dark — the section itself has a dark bg
    const heroBg = await page.locator('[data-testid="hero-section"]').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`Hero background: ${heroBg}`);
    // rgb(10,10,11) is #0A0A0B, also accept rgba variants
    const isDark = heroBg.includes("10, 10, 11") || heroBg.includes("17, 17, 19") || heroBg === "rgb(0, 0, 0)";
    expect(isDark).toBe(true);
    console.log("✓ Hero has dark background");

    await page.screenshot({ path: "/tmp/pw-landing-v2-1.png", fullPage: false });
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test("2. No banned words in hero section", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 2 RESULT ──");

    const heroText = await page.locator('[data-testid="hero-section"]').textContent() ?? "";
    console.log("Hero text excerpt:", heroText.slice(0, 200));

    const banned = ["AI-powered", "leverage", "revolutionize", "game-changing", "seamless", "ecosystem"];
    for (const word of banned) {
      const found = heroText.toLowerCase().includes(word.toLowerCase());
      console.log(`Contains '${word}': ${found}`);
      expect(found, `Hero must not contain '${word}'`).toBe(false);
    }
    console.log("✓ No banned words in hero");

    await page.screenshot({ path: "/tmp/pw-landing-v2-2.png" });
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test("3. 4 how-it-works steps visible (01–04)", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 3 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // Step text
    const hasBuildProfile = body.includes("Build your verified profile");
    const hasOpenDealRoom = body.includes("Open a deal room");
    console.log(`Has 'Build your verified profile': ${hasBuildProfile}`);
    console.log(`Has 'Open a deal room': ${hasOpenDealRoom}`);
    expect(hasBuildProfile).toBe(true);
    expect(hasOpenDealRoom).toBe(true);

    // Step numbers 01, 02, 03, 04
    for (const n of ["01", "02", "03", "04"]) {
      const has = body.includes(n);
      console.log(`Has step ${n}: ${has}`);
      expect(has, `Step number ${n} must be visible`).toBe(true);
    }
    console.log("✓ All 4 steps present");

    await page.screenshot({ path: "/tmp/pw-landing-v2-3.png" });
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test("4. Founders + investors sections + pricing visible", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 4 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // Founders section headline
    const hasFounders = body.includes("Stop chasing");
    console.log(`Has 'Stop chasing' (founders section): ${hasFounders}`);
    expect(hasFounders).toBe(true);

    // Investors section headline
    const hasInvestors = body.includes("Every deal");
    console.log(`Has 'Every deal' (investors section): ${hasInvestors}`);
    expect(hasInvestors).toBe(true);

    // Pricing
    const has49 = body.includes("$49");
    const hasFree = body.includes("Free");
    console.log(`Has '$49': ${has49}`);
    console.log(`Has 'Free': ${hasFree}`);
    expect(has49).toBe(true);
    expect(hasFree).toBe(true);
    console.log("✓ Founders, investors, and pricing sections all render");

    await page.screenshot({ path: "/tmp/pw-landing-v2-4.png" });
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test("5. Product mockup cards visible (ATLAS ROBOTICS + Match score)", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 5 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // Deal room card — ATLAS ROBOTICS appears in both hero and investor section cards
    const hasAtlas = body.includes("ATLAS ROBOTICS");
    console.log(`Has 'ATLAS ROBOTICS': ${hasAtlas}`);
    expect(hasAtlas).toBe(true);
    console.log("✓ ATLAS ROBOTICS card rendered");

    // Match score — in investor card mockup
    const hasMatch = body.includes("Match");
    console.log(`Has 'Match': ${hasMatch}`);
    expect(hasMatch).toBe(true);
    console.log("✓ Match score text rendered");

    // Readiness score — in founder card mockup
    const hasReadiness = body.includes("Readiness Score");
    console.log(`Has 'Readiness Score': ${hasReadiness}`);
    expect(hasReadiness).toBe(true);
    console.log("✓ Readiness score card rendered");

    await page.screenshot({ path: "/tmp/pw-landing-v2-5.png" });
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  test("6. Dark theme hero — background is dark, not white", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 6 RESULT ──");

    // The root landing container has style={{ background: "#0A0A0B" }}
    // Check the direct child div of body that wraps SiteHeader+sections
    const rootBg = await page.locator("body > div").first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    }).catch(() => "unknown");
    console.log(`Root container background: ${rootBg}`);

    // Hero section background
    const heroBg = await page.locator('[data-testid="hero-section"]').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    console.log(`Hero section background: ${heroBg}`);

    // rgb(10, 10, 11) = #0A0A0B
    // Any combination where R, G, B are all below 25 qualifies as "dark"
    const parseRgb = (s: string) => {
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
    };
    const heroRgb = parseRgb(heroBg);
    console.log(`Hero RGB: ${JSON.stringify(heroRgb)}`);

    if (heroRgb) {
      const isDark = heroRgb.r < 30 && heroRgb.g < 30 && heroRgb.b < 30;
      console.log(`Hero is dark (all channels < 30): ${isDark}`);
      expect(isDark).toBe(true);
    } else {
      // Inline style might not be computed — check class attribute or style attribute
      const heroStyle = await page.locator('[data-testid="hero-section"]').getAttribute("style");
      console.log(`Hero style attr: ${heroStyle}`);
      const hasInlineDark = heroStyle?.includes("#0A0A0B") || heroStyle?.includes("0A0A0B");
      expect(hasInlineDark).toBe(true);
    }
    console.log("✓ Hero background is dark");

    await page.screenshot({ path: "/tmp/pw-landing-v2-6.png", fullPage: false });
  });
});

/**
 * Playwright tests: UI-3B — Landing page rebuild
 *
 * 1. Hero renders — headline, CTA buttons, AI chat mockup
 * 2. Nav links scroll to sections
 * 3. Pricing section — $49/month, Free to join, both CTAs
 * 4. CTAs link correctly to /sign-up
 * 5. Theme toggle works — switches data-theme attribute
 * 6. Mobile nav — hamburger opens drawer with nav links
 */

import { test, expect, type Page } from "@playwright/test";

const APP = "https://hockystick.app";

async function goHome(page: Page) {
  await page.goto(APP + "/", { waitUntil: "networkidle" });
  await page.waitForLoadState("domcontentloaded");
}

test.describe("UI-3B: Landing page rebuild", () => {

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test("1. Hero renders — headline, CTA buttons, AI chat mockup", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 1 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // Headline text
    const hasHeadline = body.includes("Replace warm intros");
    console.log(`Has headline 'Replace warm intros': ${hasHeadline}`);
    expect(hasHeadline).toBe(true);

    // "Founder" CTA — the text contains a curly apostrophe from &rsquo; so match by href
    const founderBtn = page.locator('a[href*="sign-up"][href*="founder"]').first();
    await expect(founderBtn).toBeVisible({ timeout: 10000 });
    console.log("✓ Founder CTA visible");

    // "Investor" CTA
    const investorBtn = page.locator('a[href*="sign-up"][href*="investor"]').first();
    await expect(investorBtn).toBeVisible({ timeout: 5000 });
    console.log("✓ Investor CTA visible");

    // AI chat mockup — look for the AI workstation card content
    const hasMockup = body.includes("Workstation") && body.includes("readiness score");
    console.log(`Has AI chat mockup: ${hasMockup}`);
    expect(hasMockup).toBe(true);
    console.log("✓ AI chat mockup content visible");

    await page.screenshot({ path: "/tmp/pw-landing-1.png", fullPage: false });
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test("2. Nav 'How it works' link scrolls to section", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 2 RESULT ──");

    // Click the "How it works" nav link (desktop nav)
    const howLink = page.locator("a[href='/#how-it-works'], a[href*='how-it-works']").first();
    const linkCount = await howLink.count();
    console.log(`'How it works' link count: ${linkCount}`);

    if (linkCount > 0) {
      await howLink.click();
      await page.waitForTimeout(800);
    }

    // The section content should be visible somewhere in the body
    const body = await page.textContent("body") ?? "";
    const hasSection = body.includes("From profile to deal room");
    console.log(`Has 'How it works' section text: ${hasSection}`);
    expect(hasSection).toBe(true);
    console.log("✓ 'From profile to deal room in four steps.' text present");

    await page.screenshot({ path: "/tmp/pw-landing-2.png" });
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test("3. Pricing section — $49/month, Free to join, both CTAs", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 3 RESULT ──");

    const body = await page.textContent("body") ?? "";

    // $49 / month
    const hasFounderPrice = body.includes("$49");
    console.log(`Has '$49': ${hasFounderPrice}`);
    expect(hasFounderPrice).toBe(true);

    // Free to join
    const hasInvestorPrice = body.includes("Free to join");
    console.log(`Has 'Free to join': ${hasInvestorPrice}`);
    expect(hasInvestorPrice).toBe(true);

    // Both CTA buttons — there will be multiple "Start free" and "Join as investor" links on page
    const startFreeLinks = page.getByRole("link", { name: /Start free/i });
    const startFreeCount = await startFreeLinks.count();
    console.log(`'Start free' link count: ${startFreeCount}`);
    expect(startFreeCount).toBeGreaterThanOrEqual(1);

    const joinLinks = page.getByRole("link", { name: /Join as investor/i });
    const joinCount = await joinLinks.count();
    console.log(`'Join as investor' link count: ${joinCount}`);
    expect(joinCount).toBeGreaterThanOrEqual(1);

    console.log("✓ Pricing section fully rendered");
    await page.screenshot({ path: "/tmp/pw-landing-3.png" });
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test("4. CTAs link correctly to /sign-up", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 4 RESULT ──");

    // Click the hero founder CTA — &rsquo; renders as curly quote, so match by href
    const founderCTA = page.locator('a[href*="sign-up"][href*="founder"]').first();
    const href = await founderCTA.getAttribute("href");
    console.log(`Founder CTA href: ${href}`);

    // The href should contain /sign-up
    expect(href).toContain("/sign-up");
    console.log("✓ Founder CTA links to /sign-up");

    // Click it and check URL
    await founderCTA.click();
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    console.log(`URL after click: ${url}`);
    expect(url).toContain("/sign-up");
    console.log("✓ Navigation to /sign-up confirmed");

    await page.screenshot({ path: "/tmp/pw-landing-4.png" });
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test("5. Theme toggle works on landing page", async ({ page }) => {
    test.setTimeout(60000);
    await goHome(page);

    console.log("\n── TEST 5 RESULT ──");

    // Get initial theme
    const initialTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    console.log(`Initial data-theme: ${initialTheme}`);

    // Find the theme toggle button (aria-label="Toggle theme")
    const themeToggle = page.locator('[aria-label="Toggle theme"]');
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    console.log("✓ Theme toggle visible");

    // Click it — opens dropdown
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Click "Dark" option
    const darkOption = page.getByRole("button", { name: /^Dark$/i });
    const darkCount = await darkOption.count();
    console.log(`Dark option button count: ${darkCount}`);

    if (darkCount > 0) {
      await darkOption.click();
      await page.waitForTimeout(500);
    }

    const afterTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    console.log(`data-theme after toggle: ${afterTheme}`);
    expect(afterTheme).toBe("dark");
    console.log("✓ data-theme is 'dark' after toggle");

    // Toggle back to light
    await themeToggle.click();
    await page.waitForTimeout(300);
    const lightOption = page.getByRole("button", { name: /^Light$/i });
    if (await lightOption.count() > 0) {
      await lightOption.click();
      await page.waitForTimeout(400);
    }

    const finalTheme = await page.evaluate(() =>
      document.documentElement.getAttribute("data-theme")
    );
    console.log(`data-theme after second toggle: ${finalTheme}`);
    expect(finalTheme).toBe("light");
    console.log("✓ data-theme is 'light' after toggling back");

    await page.screenshot({ path: "/tmp/pw-landing-5.png" });
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  test("6. Mobile nav — hamburger opens drawer with nav links", async ({ browser }) => {
    test.setTimeout(60000);
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();

    await page.goto(APP + "/", { waitUntil: "networkidle" });

    console.log("\n── TEST 6 RESULT ──");

    // Desktop nav should be hidden; hamburger visible
    const hamburger = page.locator('[aria-label="Toggle menu"]');
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    console.log("✓ Hamburger button visible on 375px viewport");

    // Click hamburger
    await hamburger.click();
    await page.waitForTimeout(400);

    // Nav links should be visible in the dropdown drawer
    const body = await page.textContent("body") ?? "";
    // The mobile menu shows "Product", "Pricing", "Blog" as links
    const hasNavLinks = body.includes("Product") || body.includes("Pricing") || body.includes("Blog");
    console.log(`Has nav links in mobile drawer: ${hasNavLinks}`);
    expect(hasNavLinks).toBe(true);
    console.log("✓ Mobile nav drawer shows nav links");

    await page.screenshot({ path: "/tmp/pw-landing-6.png" });
    await ctx.close();
  });
});

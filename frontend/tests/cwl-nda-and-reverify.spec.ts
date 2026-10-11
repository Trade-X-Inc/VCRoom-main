// cwl-nda-and-reverify.spec.ts — sign the NDA as both disposable fixtures
// through the REAL UI flow (checkbox + button, not a direct DB insert),
// then re-verify upload/meetings/close now that both are past the NDA
// gate. Disposable fixtures only (cf3dd121-…, 78e9bbab-d82f-4a3c-8328-f25bd2e87b76)
// in the disposable fixture room (87cbdc9e-…). Same session-injection
// pattern as cwl-ui-check.spec.ts.

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDS_PATH = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/29fe8ce4-d8a7-4887-991a-4be517a37569/scratchpad/cwl-nda-check-creds.json";
const SUPABASE_URL = "https://ldimninnjlvxozubheib.supabase.co";
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";

const FOUNDER_EMAIL = "disposable-cwl-founder@hockystick.app";
const INVESTOR_EMAIL = "disposable-cwl-investor@hockystick.app";
const FOUNDER_ID = "cf3dd121-6062-4a6f-875e-800ee4d72da5";
const INVESTOR_ID = "78e9bbab-d82f-4a3c-8328-f25bd2e87b76";
const ROOM_ID = "87cbdc9e-5552-478c-9ed0-a8398185f897";

function loadServiceKey(): string {
  const env = fs.readFileSync(__dirname + "/../.env.local", "utf-8");
  const m = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/m);
  if (!m) throw new Error("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  return m[1].trim();
}

async function getSession(email: string, password: string): Promise<any> {
  const SERVICE_KEY = loadServiceKey();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto("https://lengdon.com/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, session }: { key: string; session: any }) => {
      const value = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      });
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, session },
  );
  await page.close();
}

async function signInAs(context: BrowserContext, email: string, password: string) {
  const session = await getSession(email, password);
  await injectSession(context, session);
  return context.newPage();
}

function creds(): Record<string, string> {
  return JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
}

async function captureConsole(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  return errors;
}

test.describe.serial("NDA sign-then-reverify (disposable fixtures, real UI)", () => {
  test("sign NDA — founder", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const errors = await captureConsole(page);

    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/nda`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-nda-01-before-sign-founder.png", fullPage: true });

    // dismiss the cookie-consent banner first -- it shares ambiguous
    // button text ("Accept all") with nothing on the real NDA button
    // once the selector below is exact, but clearing it keeps the
    // banner from visually/physically obstructing the real controls
    const cookieAccept = page.getByRole("button", { name: "Accept all" });
    if (await cookieAccept.isVisible().catch(() => false)) await cookieAccept.click();

    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.check();

    const signButton = page.getByRole("button", { name: "Accept & Enter Deal Room" });
    await expect(signButton).toBeVisible();
    await signButton.click();

    // real navigation away from /nda confirms the insert succeeded (the
    // handler navigates to /app/deal-rooms/$id only on success — see
    // handleAccept's catch block, which stays on-page and shows an error
    // instead)
    await page.waitForURL(new RegExp(`/app/deal-rooms/${ROOM_ID}$`), { timeout: 15000 });
    await page.screenshot({ path: "test-results/cwl-nda-02-after-sign-founder.png", fullPage: true });

    fs.writeFileSync("/tmp/cwl-nda-console-founder.json", JSON.stringify(errors));
    await context.close();
  });

  test("sign NDA — investor", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, INVESTOR_EMAIL, c[INVESTOR_ID]);
    const errors = await captureConsole(page);

    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/nda`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-nda-03-before-sign-investor.png", fullPage: true });

    const cookieAccept = page.getByRole("button", { name: "Accept all" });
    if (await cookieAccept.isVisible().catch(() => false)) await cookieAccept.click();

    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible({ timeout: 10000 });
    await checkbox.check();

    const signButton = page.getByRole("button", { name: "Accept & Enter Deal Room" });
    await expect(signButton).toBeVisible();
    await signButton.click();

    await page.waitForURL(new RegExp(`/app/deal-rooms/${ROOM_ID}$`), { timeout: 15000 });
    await page.screenshot({ path: "test-results/cwl-nda-04-after-sign-investor.png", fullPage: true });

    fs.writeFileSync("/tmp/cwl-nda-console-investor.json", JSON.stringify(errors));
    await context.close();
  });

  test("re-verify: document upload — founder, post-NDA", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const errors = await captureConsole(page);

    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/documents`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-nda-05-documents-founder-postnda.png", fullPage: true });

    fs.writeFileSync("/tmp/cwl-nda-console-documents.json", JSON.stringify(errors));
    await context.close();
  });

  test("re-verify: meetings — investor, post-NDA", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, INVESTOR_EMAIL, c[INVESTOR_ID]);
    const errors = await captureConsole(page);

    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/meetings`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-nda-06-meetings-investor-postnda.png", fullPage: true });

    fs.writeFileSync("/tmp/cwl-nda-console-meetings.json", JSON.stringify(errors));
    await context.close();
  });

  test("re-verify: close — founder, post-NDA", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const errors = await captureConsole(page);

    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/close`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-nda-07-close-founder-postnda.png", fullPage: true });

    fs.writeFileSync("/tmp/cwl-nda-console-close.json", JSON.stringify(errors));
    await context.close();
  });
});

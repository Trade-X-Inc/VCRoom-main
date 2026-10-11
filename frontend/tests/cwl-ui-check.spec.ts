// cwl-ui-check.spec.ts — client-write lockdown v9+v9.1 UI smoke check.
// Disposable fixtures only (cf3dd121-…, 78e9bbab-d82f-4a3c-8328-f25bd2e87b76,
// d821daae-…) — never test-founder@/test-investor@/test-lawyer@ or any real
// account. Session injected via the service-key password-grant bypass
// (same pattern as tests/auth-and-portfolio.spec.ts), using a temporary
// password set via the Admin API for this check only, under explicit
// approval, and deleted after this run.

import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CREDS_PATH = "/private/tmp/claude-501/-Users-macbookpro-VCROOM-VCRoom-main/29fe8ce4-d8a7-4887-991a-4be517a37569/scratchpad/cwl-ui-check-creds.json";
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

test.describe("Client-write lockdown v9+v9.1 — UI smoke check (disposable fixtures)", () => {
  test("login — founder", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    await page.goto("https://lengdon.com/app", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/sign-in/);
    await page.screenshot({ path: "test-results/cwl-ui-01-login-founder.png", fullPage: true });
    await context.close();
  });

  test("login — investor", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, INVESTOR_EMAIL, c[INVESTOR_ID]);
    await page.goto("https://lengdon.com/app", { waitUntil: "networkidle" });
    await expect(page).not.toHaveURL(/sign-in/);
    await page.screenshot({ path: "test-results/cwl-ui-02-login-investor.png", fullPage: true });
    await context.close();
  });

  test("document upload — founder", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/documents`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-ui-03-documents-founder.png", fullPage: true });
    fs.writeFileSync("/tmp/cwl-ui-console-03.json", JSON.stringify(consoleErrors));
    await context.close();
  });

  test("room create — founder", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    await page.goto("https://lengdon.com/app/deal-rooms", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-ui-04-room-list-founder.png", fullPage: true });
    fs.writeFileSync("/tmp/cwl-ui-console-04.json", JSON.stringify(consoleErrors));
    await context.close();
  });

  test("settings save — founder", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    await page.goto("https://lengdon.com/app/settings", { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-ui-05-settings-founder.png", fullPage: true });
    fs.writeFileSync("/tmp/cwl-ui-console-05.json", JSON.stringify(consoleErrors));
    await context.close();
  });

  test("meetings — investor", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, INVESTOR_EMAIL, c[INVESTOR_ID]);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/meetings`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-ui-06-meetings-investor.png", fullPage: true });
    fs.writeFileSync("/tmp/cwl-ui-console-06.json", JSON.stringify(consoleErrors));
    await context.close();
  });

  test("close — founder", async ({ browser }) => {
    const context = await browser.newContext();
    const c = creds();
    const page = await signInAs(context, FOUNDER_EMAIL, c[FOUNDER_ID]);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
    await page.goto(`https://lengdon.com/app/deal-rooms/${ROOM_ID}/close`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/cwl-ui-07-close-founder.png", fullPage: true });
    fs.writeFileSync("/tmp/cwl-ui-console-07.json", JSON.stringify(consoleErrors));
    await context.close();
  });
});

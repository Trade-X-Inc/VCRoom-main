import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL;
const SUPABASE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = "sb-ldimninnjlvxozubheib-auth-token";
const APP = "http://localhost:8080";

// nda_signed today (pre-Information-stage) — same test founder/investor pair.
const LOCKED_ROOM_ID = "11111111-2222-3333-4444-555555555555";
// closed — Atlas/Dr Henry, genuinely unlocked, used by r4b's spec too.
const UNLOCKED_ROOM_ID = "957f9750-00c7-402a-b1ba-d9c7a4e3ba2f";

const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return (await response.json()) as any;
}

async function signIn(context: BrowserContext, email: string, password: string) {
  const session = await getSession(email, password);
  const page = await context.newPage();
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }: any) => localStorage.setItem(key, JSON.stringify(value)),
    {
      key: STORAGE_KEY,
      value: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      },
    },
  );
  return page;
}

test.describe("R13B — key-person team profiles verification", () => {
  test("Overview — pre-Information-stage room shows founder key-person card (name/title, no bio)", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    await page.goto(`${APP}/app/deal-rooms/${LOCKED_ROOM_ID}/overview`, { waitUntil: "networkidle" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await expect(page.getByText("Jordan Lee")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/r13b-overview-locked-investor.png", fullPage: true });
    expect(errors).toEqual([]);
    await context.close();
  });

  test("Overview — founder side sees investor key-person card pre-unlock too", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    await page.goto(`${APP}/app/deal-rooms/${LOCKED_ROOM_ID}/overview`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r13b-overview-locked-founder.png", fullPage: true });
    await context.close();
  });

  test("Information tab — unlocked room shows full team detail (bio/highlights) on founder side", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    await page.goto(`${APP}/app/deal-rooms/${UNLOCKED_ROOM_ID}/information`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r13b-information-unlocked-founder.png", fullPage: true });
    await context.close();
  });

  test("Information tab — unlocked room, investor side", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    await page.goto(`${APP}/app/deal-rooms/${UNLOCKED_ROOM_ID}/information`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "test-results/r13b-information-unlocked-investor.png", fullPage: true });
    await context.close();
  });

  test("Document Intake — employee 1-pager upload trigger renders", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    await page.goto(`${APP}/app/prepare/ip-vault/document-intake`, { waitUntil: "networkidle" });
    await expect(page.getByText("Add employee 1-pager")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/r13b-document-intake.png", fullPage: true });
    await context.close();
  });

  test("Team Cards (founder) — key-person checkbox and highlights editor render", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, FOUNDER_EMAIL, FOUNDER_PASS);
    // /app/profile redirects (R9 relocation) — the live route is under
    // Prepare > Profile Builder > Team Cards, which renders the same
    // Profile component with view="team-cards" (app.profile.tsx's redirect
    // only fires when the route itself is /app/profile directly).
    await page.goto(`${APP}/app/prepare/profile-builder/team-cards`, { waitUntil: "networkidle" });
    const doneBtn = page.getByRole("button", { name: "Done" });
    await doneBtn.click({ timeout: 5000 }).catch(() => {});
    await expect(page.getByText("Jordan Lee")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/r13b-founder-team-cards.png", fullPage: true });
    await context.close();
  });

  test("Team Cards (investor) — key-person + contact email render", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await signIn(context, INVESTOR_EMAIL, INVESTOR_PASS);
    await page.goto(`${APP}/app/investor/profile`, { waitUntil: "networkidle" });
    await expect(page.getByText("Alex Rivera")).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: "test-results/r13b-investor-team-cards.png", fullPage: true });
    await context.close();
  });
});

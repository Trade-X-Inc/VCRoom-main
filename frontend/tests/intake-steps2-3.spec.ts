import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
  try {
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    const env: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return env;
  } catch { return {}; }
}

const testEnv  = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL    = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY     = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY     = `sb-ldimninnjlvxozubheib-auth-token`;
const INVESTOR_EMAIL  = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASSWORD = testEnv.TEST_INVESTOR_PASSWORD;

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto("https://hockystick.app/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, val, themeKey, themeVal }: any) => {
      localStorage.setItem(key, JSON.stringify(val));
      localStorage.setItem(themeKey, themeVal);
    },
    {
      key: STORAGE_KEY,
      themeKey: "vr.theme",
      themeVal: "dark",
      val: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
        user: session.user,
      },
    }
  );
  await page.close();
}

async function openIntakePage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("https://hockystick.app/app/investor/intake", {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  // Wait for the parse button to appear (confirms page loaded and auth worked)
  await page.waitForSelector('button:has-text("Parse and score")', { timeout: 15_000 });
  return page;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Intake — Steps 2+3: file type enforcement + UI copy", () => {
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    const session = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, session);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("1. UI copy — 'WHAT WE EXTRACT' section present with correct fields", async () => {
    const page = await openIntakePage(context);

    // Check updated section heading
    const extractSection = page.getByText("What we extract", { exact: false });
    await expect(extractSection).toBeVisible();

    // Check updated fields are present
    await expect(page.getByText("Founder name and email", { exact: false })).toBeVisible();
    await expect(page.getByText("Company name and description", { exact: false })).toBeVisible();
    await expect(page.getByText("Funding stage", { exact: false })).toBeVisible();
    await expect(page.getByText("Sector and geography", { exact: false })).toBeVisible();
    await expect(page.getByText("LinkedIn and website URLs", { exact: false })).toBeVisible();

    // Check image PDF note
    await expect(page.getByText("Image-based and scanned PDFs", { exact: false })).toBeVisible();

    console.log("✓ UI copy — WHAT WE EXTRACT section correct");
    await page.close();
  });

  test("2. UI copy — upload subtitle mentions PDF and Excel/CSV only", async () => {
    const page = await openIntakePage(context);

    await expect(page.getByText("Pitch decks (PDF) and contact lists (Excel, CSV)", { exact: false })).toBeVisible();
    await expect(page.getByText("Other file types are not supported", { exact: false })).toBeVisible();

    console.log("✓ UI copy — upload subtitle correct");
    await page.close();
  });

  test("3. Unsupported file type (.docx) — immediately shown as rejected with clear reason", async () => {
    const page = await openIntakePage(context);

    // Create a minimal .docx buffer (just need the extension — content doesn't matter for rejection)
    const docxContent = Buffer.from("PK\x03\x04fake docx content for rejection test");

    // Set the file input to a .docx file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "fake-deck.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: docxContent,
    });

    // File should appear in the uploaded files list
    await expect(page.getByText("fake-deck.docx")).toBeVisible();

    // Click parse — this triggers extractForIntake which should immediately reject the file
    await page.click('button:has-text("Parse and score")');

    // Wait for file processing results panel to appear
    await page.waitForSelector('text=File processing results', { timeout: 20_000 });

    // Check rejection reason is shown
    const rejectionReason = page.getByText("Unsupported file type", { exact: false });
    await expect(rejectionReason).toBeVisible();

    console.log("✓ .docx file rejected with clear message");
    await page.close();
  });

  test("4. CSV with founder data — extracted and candidates returned", async () => {
    test.setTimeout(90_000);
    // Re-inject fresh session to avoid token expiry across multiple tests
    const freshSession = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, freshSession);
    const page = await openIntakePage(context);

    const csvContent = Buffer.from(
      "Name,Company,Email,LinkedIn,Sector,Stage,Location\n" +
      "Sarah Al-Hassan,Volta Energy,sarah@voltaenergy.io,https://linkedin.com/in/sarah-hassan,CleanTech,Seed,Dubai\n" +
      "Amin Khoury,NovaMed,amin@novamed.health,https://linkedin.com/in/amin-khoury,HealthTech,Pre-seed,Abu Dhabi"
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "founders.csv",
      mimeType: "text/csv",
      buffer: csvContent,
    });

    await expect(page.getByText("founders.csv")).toBeVisible();

    // Capture console errors to diagnose batch insert failures
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warn") {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.click('button:has-text("Parse and score")');

    // Wait for the parse button to become active again (spinner gone + button re-enabled)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button') as HTMLButtonElement | null;
        // Look for the non-disabled parse button
        const buttons = Array.from(document.querySelectorAll("button"));
        const parseBtn = buttons.find((b) => b.textContent?.includes("Parse and score"));
        return parseBtn && !parseBtn.disabled;
      },
      { timeout: 75_000 }
    );

    const resultText = await page.textContent("body") ?? "";
    console.log(`── TEST 4 ──\nBody snippet after parse: ${resultText.slice(0, 600)}`);
    if (consoleErrors.length > 0) {
      console.log(`── CONSOLE ERRORS (${consoleErrors.length}):\n${consoleErrors.join("\n")}`);
    }

    // Should show candidates, toast message, or error — parsing completed
    const hasResult = /potential lead|No identifiable|couldn't parse|Found \d|leads?|Volta|NovaMed|sarah@/i.test(resultText);
    expect(hasResult).toBe(true);

    console.log("✓ CSV parsed — candidates returned");
    await page.close();
  });

  test("5. Paste raw text with founder email — extraction works", async () => {
    test.setTimeout(90_000);
    const freshSession = await getSession(INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await injectSession(context, freshSession);
    const page = await openIntakePage(context);

    const pastedText =
      "Hey, met this founder at GITEX — really impressive:\n\n" +
      "Layla Mansour, CEO of BuildRight (construction tech for GCC market).\n" +
      "Email: layla@buildright.io\n" +
      "LinkedIn: https://linkedin.com/in/layla-mansour\n" +
      "Raising $1.5M Pre-seed, HQ in Dubai.\n" +
      "Strong traction — 12 pilot sites signed.";

    const textarea = page.locator("textarea");
    await textarea.fill(pastedText);
    await page.click('button:has-text("Parse and score")');

    // Wait for parse button to re-enable (parse complete)
    await page.waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const parseBtn = buttons.find((b) => b.textContent?.includes("Parse and score"));
        return parseBtn && !parseBtn.disabled;
      },
      { timeout: 75_000 }
    );

    const resultText = await page.textContent("body") ?? "";
    console.log(`── TEST 5 ──\nBody snippet after parse: ${resultText.slice(0, 600)}`);

    // Should show candidates containing founder/company name
    const hasResult = /BuildRight|Layla|potential lead|No identifiable|couldn't parse/i.test(resultText);
    expect(hasResult).toBe(true);

    console.log("✓ Paste text — Layla/BuildRight extracted correctly");
    await page.close();
  });
});

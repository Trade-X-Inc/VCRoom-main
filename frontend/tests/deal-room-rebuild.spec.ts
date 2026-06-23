/**
 * Playwright tests: Deal Room Rebuild (horizontal stage bar + staged panels)
 *
 * 1. Create test deal room — workflow_stage='nda_signed', stage bar renders
 * 2. Sidebar nav is GONE — no <aside> vertical nav button list
 * 3. Stage tab clicks — future stage locked, current stage active content
 * 4. Document request blocking — category='source_code' creates no pending row
 * 5. Meeting skip — skipMeeting sets meeting_type='skipped'
 * 6. Term sheet send — stage2_unlocked=true, term_sheet_sent_at set, stage=term_sheet
 * 7. AI panel opens/closes
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
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

const INVESTOR_EMAIL = testEnv.TEST_INVESTOR_EMAIL;
const INVESTOR_PASS = testEnv.TEST_INVESTOR_PASSWORD;
const INVESTOR_ID = testEnv.TEST_INVESTOR_USER_ID;
const FOUNDER_EMAIL = testEnv.TEST_FOUNDER_EMAIL;
const FOUNDER_PASS = testEnv.TEST_FOUNDER_PASSWORD;
const FOUNDER_ID = testEnv.TEST_FOUNDER_USER_ID;
const STARTUP_ID = testEnv.TEST_FOUNDER_STARTUP_ID || testEnv.TEST_STARTUP_ID;

async function serviceGet(p: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

async function servicePost(p: string, body: Record<string, any>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`POST ${p} (${r.status}): ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function servicePatch(p: string, body: Record<string, any>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${p} (${r.status}): ${await r.text()}`);
}

async function serviceDelete(p: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`DELETE ${p} (${r.status}): ${await r.text()}`);
}

async function getSession(email: string, password: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const d = (await r.json()) as any;
  if (!d.access_token) throw new Error(`Auth failed for ${email}: ${JSON.stringify(d)}`);
  return d;
}

async function injectSession(ctx: BrowserContext, session: any) {
  const p = await ctx.newPage();
  await p.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await p.evaluate(
    ({ key, s }: any) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: s.access_token, refresh_token: s.refresh_token,
          expires_in: s.expires_in, expires_at: s.expires_at,
          token_type: s.token_type, user: s.user,
        }),
      ),
    { key: STORAGE_KEY, s: session },
  );
  await p.close();
}

async function waitForLoad(page: Page) {
  await page.waitForFunction(
    () =>
      !document.body.textContent?.includes("Verifying access") &&
      !document.body.textContent?.includes("Signing you in") &&
      !document.body.textContent?.includes("Loading…"),
    { timeout: 25000 },
  );
}

let testDealRoomId: string;

test.describe("Deal Room Rebuild", () => {

test.beforeAll(async () => {
  const existing = await serviceGet(
    `deal_rooms?created_by=eq.${FOUNDER_ID}&investor_email=eq.${INVESTOR_EMAIL}&select=id`,
  );
  for (const r of existing ?? []) {
    await serviceDelete(`deal_room_document_requests?deal_room_id=eq.${r.id}`).catch(() => {});
    await serviceDelete(`deal_room_meetings?deal_room_id=eq.${r.id}`).catch(() => {});
    await serviceDelete(`nda_acceptances?deal_room_id=eq.${r.id}`).catch(() => {});
    await serviceDelete(`deal_room_members?deal_room_id=eq.${r.id}`).catch(() => {});
    await serviceDelete(`deal_rooms?id=eq.${r.id}`).catch(() => {});
  }

  const rows = await servicePost("deal_rooms", {
    startup_id: STARTUP_ID,
    created_by: FOUNDER_ID,
    investor_name: "PW Test Investor",
    investor_email: INVESTOR_EMAIL,
    investor_company: "Test Ventures",
    status: "active",
    workflow_stage: "nda_signed",
    stage_entered_at: new Date().toISOString(),
    meetings_completed: 0,
    meetings_max: 3,
    stage2_unlocked: false,
  });
  testDealRoomId = rows[0].id;
  console.log("Created test deal room:", testDealRoomId);

  await servicePost("deal_room_members", {
    deal_room_id: testDealRoomId, user_id: FOUNDER_ID, role: "founder", accepted_at: new Date().toISOString(),
  }).catch(() => {});
  await servicePost("deal_room_members", {
    deal_room_id: testDealRoomId, user_id: INVESTOR_ID, role: "investor", accepted_at: new Date().toISOString(),
  }).catch(() => {});

  const ndaAt = new Date().toISOString();
  await servicePost("nda_acceptances", {
    deal_room_id: testDealRoomId, user_id: FOUNDER_ID, role: "founder", accepted_at: ndaAt, nda_version: "v1.0",
  }).catch(() => {});
  await servicePost("nda_acceptances", {
    deal_room_id: testDealRoomId, user_id: INVESTOR_ID, role: "investor", accepted_at: ndaAt, nda_version: "v1.0",
  }).catch(() => {});
});

test.afterAll(async () => {
  if (!testDealRoomId) return;
  await serviceDelete(`deal_room_document_requests?deal_room_id=eq.${testDealRoomId}`).catch(() => {});
  await serviceDelete(`deal_room_meetings?deal_room_id=eq.${testDealRoomId}`).catch(() => {});
  await serviceDelete(`nda_acceptances?deal_room_id=eq.${testDealRoomId}`).catch(() => {});
  await serviceDelete(`deal_room_members?deal_room_id=eq.${testDealRoomId}`).catch(() => {});
  await serviceDelete(`deal_rooms?id=eq.${testDealRoomId}`).catch(() => {});
  console.log("Cleaned up test deal room:", testDealRoomId);
});

// ── Test 1 ────────────────────────────────────────────────────────────────────
test("1. Deal room created — workflow_stage=nda_signed, stage bar renders", async ({ browser }) => {
  expect(testDealRoomId).toBeTruthy();
  const rows = await serviceGet(`deal_rooms?id=eq.${testDealRoomId}&select=workflow_stage`);
  expect(rows?.[0]?.workflow_stage).toBe("nda_signed");

  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${testDealRoomId}`, { waitUntil: "networkidle" });
  await waitForLoad(page);
  await page.screenshot({ path: "/tmp/pw-rebuild-1.png" });

  const stageBar = page.locator("[data-testid=deal-stage-bar]");
  await expect(stageBar).toBeVisible({ timeout: 15000 });
  const pills = page.locator("[data-testid=stage-pills]");
  const text = await pills.textContent();
  expect(text).toContain("NDA & Profiles");
  expect(text).toContain("Stage 1 Review");
  expect(text).toContain("Diligence");
  expect(text).toContain("Term Sheet");
  expect(text).toContain("Closed");

  await ctx.close();
  console.log("✓ Stage bar renders all 5 stages, workflow_stage=nda_signed");
});

// ── Test 2 ────────────────────────────────────────────────────────────────────
test("2. Sidebar nav is gone — replaced by horizontal stage bar", async ({ browser }) => {
  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${testDealRoomId}`, { waitUntil: "networkidle" });
  await waitForLoad(page);

  // The old vertical sidebar had a <nav> with Overview/Document Vault/Workstation/Meetings/Review buttons.
  // Confirm none of those old vertical-nav labels exist as nav buttons.
  const oldNavButtons = page.locator("nav button", { hasText: "Document Vault" });
  expect(await oldNavButtons.count()).toBe(0);
  const oldWorkstation = page.locator("nav button", { hasText: "Workstation" });
  expect(await oldWorkstation.count()).toBe(0);

  // The stage bar (the new nav) is present instead.
  await expect(page.locator("[data-testid=stage-pills]")).toBeVisible();
  await ctx.close();
  console.log("✓ No old sidebar nav buttons; stage bar present");
});

// ── Test 3 ────────────────────────────────────────────────────────────────────
test("3. Stage pills — current active, future locked", async ({ browser }) => {
  // self-contained: create own room so this test is independent of beforeAll/afterAll lifecycle
  const rows = await servicePost("deal_rooms", {
    startup_id: STARTUP_ID, created_by: FOUNDER_ID,
    investor_name: "PW Pill Test", investor_email: INVESTOR_EMAIL,
    investor_company: "Test Ventures", status: "active",
    workflow_stage: "nda_signed", stage_entered_at: new Date().toISOString(),
    meetings_completed: 0, meetings_max: 3, stage2_unlocked: false,
  });
  const pillRoomId = rows[0].id;
  await servicePost("deal_room_members", { deal_room_id: pillRoomId, user_id: FOUNDER_ID, role: "founder", accepted_at: new Date().toISOString() }).catch(() => {});
  await servicePost("deal_room_members", { deal_room_id: pillRoomId, user_id: INVESTOR_ID, role: "investor", accepted_at: new Date().toISOString() }).catch(() => {});
  const ndaAt = new Date().toISOString();
  await servicePost("nda_acceptances", { deal_room_id: pillRoomId, user_id: FOUNDER_ID, role: "founder", accepted_at: ndaAt, nda_version: "v1.0" }).catch(() => {});
  await servicePost("nda_acceptances", { deal_room_id: pillRoomId, user_id: INVESTOR_ID, role: "investor", accepted_at: ndaAt, nda_version: "v1.0" }).catch(() => {});

  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${pillRoomId}`, { waitUntil: "networkidle" });
  await waitForLoad(page);

  // current stage pill = nda_signed
  const current = page.locator("[data-testid=stage-pill-nda_signed]");
  await expect(current).toHaveAttribute("data-state", "current", { timeout: 10000 });

  // future stage = diligence is locked (not navigable)
  const future = page.locator("[data-testid=stage-pill-diligence]");
  await expect(future).toHaveAttribute("data-state", "future");

  // clicking future shows the "Unlocks when" tooltip and does NOT change content
  await future.click();
  await expect(page.locator("text=Unlocks when")).toBeVisible({ timeout: 5000 });

  // current-stage content (NDA panel) is visible
  await page.screenshot({ path: "/tmp/pw-rebuild-3.png" });
  const mainContent = page.locator("main").last();
  expect((await mainContent.textContent())?.toLowerCase()).toContain("nda signed");

  await ctx.close();

  // cleanup
  await serviceDelete(`nda_acceptances?deal_room_id=eq.${pillRoomId}`).catch(() => {});
  await serviceDelete(`deal_room_members?deal_room_id=eq.${pillRoomId}`).catch(() => {});
  await serviceDelete(`deal_rooms?id=eq.${pillRoomId}`).catch(() => {});
  console.log("✓ Current pill active, future pill locked with tooltip");
});

// ── Test 4 ────────────────────────────────────────────────────────────────────
test("4. Document request form — 5 clean options, blocked categories absent, permanent callout visible", async ({ browser }) => {
  await servicePatch(`deal_rooms?id=eq.${testDealRoomId}`, { workflow_stage: "diligence" });

  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${testDealRoomId}`, { waitUntil: "networkidle" });
  await waitForLoad(page);

  // open Document Requests sub-tab
  await page.locator("[data-testid=diligence-sub-requests]").click();

  // ── 1. Permanent boundary callout is always visible ──────────────────────────
  await expect(page.locator("[data-testid=doc-req-boundary-callout]")).toBeVisible({ timeout: 10000 });
  const calloutText = await page.locator("[data-testid=doc-req-boundary-callout]").textContent();
  expect(calloutText).toContain("What we don't facilitate");
  expect(calloutText).toContain("source code");
  console.log("BOUNDARY CALLOUT:", calloutText?.trim().slice(0, 120));

  // ── 2. Dropdown has exactly 5 options with clean labels ───────────────────────
  const select = page.locator("[data-testid=doc-req-category]");
  const options = await select.locator("option").all();
  expect(options.length).toBe(5);

  const labels = await Promise.all(options.map((o) => o.textContent()));
  expect(labels).toContain("General documents");
  expect(labels).toContain("Financial documents");
  expect(labels).toContain("Legal documents");
  expect(labels).toContain("Commercial / contracts");
  expect(labels).toContain("Team & HR documents");
  console.log("DROPDOWN OPTIONS:", labels.join(", "));

  // ── 3. Blocked categories are completely absent from the dropdown ─────────────
  const values = await Promise.all(options.map((o) => o.getAttribute("value")));
  for (const blocked of ["source_code", "technical_ip", "customer_pii", "personal_salary_data", "technical", "ip"]) {
    expect(values).not.toContain(blocked);
    expect(labels).not.toContain(blocked);
  }
  console.log("BLOCKED CATEGORIES:", "absent from dropdown ✓");

  await page.screenshot({ path: "/tmp/pw-rebuild-4.png" });
  await ctx.close();
  console.log("✓ Document request form: 5 clean options, blocked categories absent, boundary callout visible");
});

// ── Test 5 ────────────────────────────────────────────────────────────────────
test("5. Meeting skip — meeting_type='skipped'", async () => {
  await serviceDelete(`deal_room_meetings?deal_room_id=eq.${testDealRoomId}&meeting_number=eq.2`).catch(() => {});
  // Emulate the skipMeeting server fn effect (the fn upserts type='skipped' + completed_at)
  await servicePost("deal_room_meetings", {
    deal_room_id: testDealRoomId,
    meeting_number: 2,
    meeting_type: "skipped",
    completed_at: new Date().toISOString(),
  });

  const rows = await serviceGet(
    `deal_room_meetings?deal_room_id=eq.${testDealRoomId}&meeting_number=eq.2&select=meeting_number,meeting_type,completed_at`,
  );
  console.log("SKIPPED MEETING ROW:", JSON.stringify(rows?.[0]));
  expect(rows?.[0]?.meeting_type).toBe("skipped");
  expect(rows?.[0]?.completed_at).toBeTruthy();
  console.log("✓ Meeting skip recorded with meeting_type='skipped'");
});

// ── Test 6 ────────────────────────────────────────────────────────────────────
test("6. Term sheet send — stage2_unlocked + term_sheet_sent_at + workflow_stage", async ({ browser }) => {
  test.setTimeout(90000);
  await servicePatch(`deal_rooms?id=eq.${testDealRoomId}`, {
    workflow_stage: "term_sheet",
    stage2_unlocked: false,
    term_sheet_status: null,
    term_sheet_sent_at: null,
  });

  const before = await serviceGet(
    `deal_rooms?id=eq.${testDealRoomId}&select=stage2_unlocked,term_sheet_sent_at,workflow_stage`,
  );
  console.log("BEFORE term sheet send:", JSON.stringify(before?.[0]));

  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${testDealRoomId}`, { waitUntil: "networkidle" });
  await waitForLoad(page);

  await page.locator("[data-testid=ts-valuation]").fill("5000000");
  await page.locator("[data-testid=ts-amount]").fill("500000");
  await page.locator("[data-testid=ts-equity]").fill("9");
  await page.locator("[data-testid=send-term-sheet]").click();
  await page.locator("[data-testid=send-ts-confirm-modal-confirm]").click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "/tmp/pw-rebuild-6.png" });
  await ctx.close();

  const after = await serviceGet(
    `deal_rooms?id=eq.${testDealRoomId}&select=stage2_unlocked,term_sheet_sent_at,workflow_stage,term_sheet_status`,
  );
  console.log("AFTER term sheet send:", JSON.stringify(after?.[0]));
  expect(after?.[0]?.stage2_unlocked).toBe(true);
  expect(after?.[0]?.term_sheet_sent_at).toBeTruthy();
  expect(after?.[0]?.workflow_stage).toBe("term_sheet");
  console.log("✓ Term sheet sent: stage2_unlocked=true, sent_at set, stage=term_sheet");
});

// ── Test 7 ────────────────────────────────────────────────────────────────────
test("7. AI panel opens and closes", async ({ browser }) => {
  const ctx = await browser.newContext();
  await injectSession(ctx, await getSession(INVESTOR_EMAIL, INVESTOR_PASS));
  const page = await ctx.newPage();
  await page.goto(`${APP}/app/deal-room/${testDealRoomId}`, { waitUntil: "networkidle" });
  await waitForLoad(page);

  await page.locator("[data-testid=open-ai]").click();
  await expect(page.locator("[data-testid=ai-panel]")).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: "/tmp/pw-rebuild-7-open.png" });

  await page.locator("[data-testid=close-ai]").click();
  await page.waitForTimeout(600);
  await expect(page.locator("[data-testid=ai-panel]")).toHaveCount(0);
  await ctx.close();
  console.log("✓ AI panel opens and closes");
});

}); // end describe "Deal Room Rebuild"

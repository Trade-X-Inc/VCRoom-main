import { test, expect, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(filePath: string): Record<string, string> {
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
}

const testEnv = loadEnv(path.resolve(__dirname, "../../.env.test"));
const localEnv = loadEnv(path.resolve(__dirname, "../.env.local"));

const SUPABASE_URL = localEnv.SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
const SERVICE_KEY = localEnv.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_KEY = `sb-ldimninnjlvxozubheib-auth-token`;
const APP_URL = process.env.R12_TEST_BASE_URL || "https://hockystick.app";

const FOUNDER_STARTUP_ID = testEnv.TEST_FOUNDER_STARTUP_ID;
const FOUNDER_USER_ID = testEnv.TEST_FOUNDER_USER_ID;

function adminHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

// This spec creates and tears down its own disposable invitee — the
// permanent test fixtures (test-viewer@, test-founder-member@, etc.) are
// reserved for role-based checks, not this account-creation/invite-accept
// flow, which needs a brand-new never-before-a-member identity every run.
async function createDisposableInvitee(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "founder", provider: "email", providers: ["email"], is_test_account: true },
      user_metadata: { role: "founder", full_name: "R12 Invite Flow Test", is_test_account: true },
    }),
  });
  const data = (await res.json()) as any;
  if (!data.id) throw new Error(`Failed to create disposable invitee: ${JSON.stringify(data)}`);
  return data.id as string;
}

async function deleteDisposableInvitee(userId: string) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
}

async function getSession(email: string, password: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as any;
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data;
}

async function injectSession(context: BrowserContext, session: any) {
  const page = await context.newPage();
  await page.goto(`${APP_URL}/`, { waitUntil: "domcontentloaded" });
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

// R12 step 4 — live end-to-end verification that an invited member both (a)
// can actually complete the accept flow (team_accounts_self_accept_invite
// must let the INSERT succeed) and (b) lands with their assigned role's
// restrictions active from first login, not next login.
//
// This test caught two real, previously-undetected RLS bugs during
// development that a policy-reading review missed:
//   1. Infinite recursion (42P17) between a startups read policy and
//      team_invites_founder_manage — fixed with a SECURITY DEFINER helper.
//   2. "permission denied for table users" (42501) — the accept policy
//      queried auth.users directly to resolve the caller's own email,
//      which the `authenticated` role has no SELECT grant on. Fixed with
//      auth.email() instead.
// Both fixes are applied migrations; this spec is the regression guard.
test("Invited member accepts and lands with their assigned role (analyst) active", async ({ browser, request }) => {
  test.skip(!SERVICE_KEY, "Requires SUPABASE_SERVICE_ROLE_KEY in frontend/.env.local");

  const stamp = Date.now();
  const email = `r12-invite-flow-${stamp}@hockystick.app`;
  const password = `R12invite!${stamp}`;

  const userId = await createDisposableInvitee(email, password);

  // Create the invite directly via PostgREST (service role bypasses RLS).
  const inviteRes = await request.post(`${SUPABASE_URL}/rest/v1/team_invites`, {
    headers: { ...adminHeaders(), Prefer: "return=representation" },
    data: {
      startup_id: FOUNDER_STARTUP_ID,
      email,
      role: "analyst",
      invited_by: FOUNDER_USER_ID,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  const [invite] = await inviteRes.json();
  expect(invite?.token).toBeTruthy();

  try {
    const context = await browser.newContext();
    const session = await getSession(email, password);
    await injectSession(context, session);
    const page = await context.newPage();

    await page.goto(`${APP_URL}/join?token=${invite.token}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-r12-invite-before-accept.png" });

    await expect(page.getByRole("heading", { name: /join playwright test co/i })).toBeVisible({ timeout: 8000 });

    const acceptBtn = page.getByRole("button", { name: /accept and join/i });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    await expect(page.getByText(/welcome to/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/you've joined as/i)).toBeVisible();
    await page.screenshot({ path: "/tmp/playwright-r12-invite-after-accept.png" });

    // Confirm the member's restricted role is active immediately — land in
    // MemberShell with the Analyst role shown, not AdminShell (which would
    // mean the role wasn't applied, or they were treated as an owner).
    await page.goto(`${APP_URL}/app`, { waitUntil: "networkidle" });
    await page.screenshot({ path: "/tmp/playwright-r12-invite-post-join-app.png" });
    await expect(page.getByText(/analyst/i).first()).toBeVisible();

    await context.close();
  } finally {
    // Teardown: this account and invite are disposable, unlike the four
    // permanent role fixtures.
    await request.delete(`${SUPABASE_URL}/rest/v1/startup_team_accounts?user_id=eq.${userId}`, { headers: adminHeaders() });
    await request.delete(`${SUPABASE_URL}/rest/v1/team_invites?id=eq.${invite.id}`, { headers: adminHeaders() });
    await request.delete(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, { headers: adminHeaders() });
    await deleteDisposableInvitee(userId);
  }
});

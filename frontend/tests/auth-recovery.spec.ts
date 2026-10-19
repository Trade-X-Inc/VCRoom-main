/* eslint-disable @typescript-eslint/no-explicit-any -- the stub Turnstile API is read through window in page.evaluate */
/**
 * Browser tests for password-recovery links, against a build you started locally (A11Y_SCAN_BASE_URL).
 *
 * A recovery link, in whatever style Supabase uses and whatever redirect_to it carried, must land on
 * /reset-password and keep the user there until the password is changed or they sign out. Every Supabase request is
 * intercepted (nothing leaves the machine) and anything unexpected is aborted.
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.A11Y_SCAN_BASE_URL ?? "http://localhost:8791";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const NOW = Math.floor(Date.now() / 1000);
const USER = {
  id: "00000000-0000-4000-8000-000000000002",
  aud: "authenticated",
  role: "authenticated",
  email: "recovery@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  recovery_sent_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
};
const jwt = () =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER.id, aud: "authenticated", role: "authenticated", email: USER.email, exp: NOW + 3600 })}.sig`;
const SESSION = () => ({
  access_token: jwt(),
  token_type: "bearer",
  expires_in: 3600,
  expires_at: NOW + 3600,
  refresh_token: "stub-refresh",
  user: USER,
});
const HASH = () =>
  `access_token=${jwt()}&expires_in=3600&refresh_token=stub-refresh&token_type=bearer&type=recovery`;
const PLAIN_HASH = () =>
  `access_token=${jwt()}&expires_in=3600&refresh_token=stub-refresh&token_type=bearer`;
const VERIFIER_KEYS = [
  "sb-ldimninnjlvxozubheib-auth-token-code-verifier",
  "sb-ci-placeholder-auth-token-code-verifier",
];

const TURNSTILE_STUB = `
(function () {
  var widgets = {}; var n = 0; var T = (window.__ts = { renders: 0, tokens: 0 });
  window.turnstile = {
    render: function (el, o) { var id = "w" + (++n); widgets[id] = o; T.renders++; return id; },
    reset: function () {}, remove: function () {}
  };
  T.deliver = function () { for (var k in widgets) widgets[k].callback("stub-token-" + (++T.tokens)); };
})();`;

type Seen = { url: string; method: string; body: string };

async function setup(page: Page) {
  const seen: Seen[] = [];
  // Tests the wiring, not the CSP: the policy header would block the placeholder Supabase host CI builds with.
  await page.route(BASE + "/**", async (route: Route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    return route.fulfill({ response, headers });
  });
  await page.route(/\/turnstile\/v0\/api\.js/, (r) =>
    r.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: TURNSTILE_STUB,
    }),
  );
  await page.route(/\/(auth|rest)\/v1\//, async (route: Route) => {
    const req = route.request();
    const url = req.url();
    seen.push({ url, method: req.method(), body: req.postData() ?? "" });
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (/\/auth\/v1\/user/.test(url)) return json(USER);
    if (/\/auth\/v1\/verify/.test(url)) return json(SESSION());
    if (/\/auth\/v1\/logout/.test(url)) return route.fulfill({ status: 204 });
    if (/\/auth\/v1\/token/.test(url)) return json(SESSION());
    if (/\/auth\/v1\/authorize/.test(url))
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<p>oauth stub</p>",
      });
    if (/\/rest\/v1\//.test(url)) return json([]);
    return route.abort();
  });
  return seen;
}

const path = (page: Page) => new URL(page.url()).pathname;
// Tables read through the data API. The app shell looks up the signed-in user's own row on every page, so "users" is
// expected; anything else would mean a signed-in page started loading.
const tablesRead = (seen: Seen[]) =>
  [
    ...new Set(
      seen
        .filter((s) => /\/rest\/v1\//.test(s.url))
        .map((s) => new URL(s.url).pathname.split("/").pop()),
    ),
  ].filter((t) => t !== "users");
const markPresent = (page: Page) =>
  page.evaluate(() => localStorage.getItem("lcs_recovery_session") !== null);

async function expectOnResetForm(page: Page) {
  await expect(page).toHaveURL(/\/reset-password$/);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
}

test.describe("a recovery link always lands on the new-password screen", () => {
  test("token in the hash, arriving at the callback", async ({ page }) => {
    await setup(page);
    await page.goto(`${BASE}/auth/callback#${HASH()}`);
    await expectOnResetForm(page);
  });

  test("token in the hash, whichever page it arrives on (redirect_to is not trusted)", async ({
    page,
  }) => {
    for (const landing of [
      "/",
      "/app",
      "/app/overview",
      "/library",
      "/sign-in",
      "/pack",
    ]) {
      const ctx = await page.context().browser()!.newContext();
      const p = await ctx.newPage();
      await setup(p);
      await p.goto(`${BASE}${landing}#${HASH()}`);
      await expectOnResetForm(p);
      await ctx.close();
    }
  });

  test("token_hash verify link", async ({ page }) => {
    const seen = await setup(page);
    await page.goto(`${BASE}/auth/callback?token_hash=abc123&type=recovery`);
    await expectOnResetForm(page);
    expect(
      seen.some(
        (s) =>
          /\/auth\/v1\/verify/.test(s.url) &&
          JSON.parse(s.body).type === "recovery",
      ),
    ).toBe(true);
  });

  test("PKCE code link", async ({ page }) => {
    const seen = await setup(page);
    await page.addInitScript(
      (keys) =>
        (keys as string[]).forEach((k) =>
          localStorage.setItem(k, "verifier123/recovery"),
        ),
      VERIFIER_KEYS,
    );
    await page.goto(`${BASE}/auth/callback?code=pkce-code`);
    await expectOnResetForm(page);
    expect(seen.some((s) => /grant_type=pkce/.test(s.url))).toBe(true);
  });
});

test.describe("while the recovery session is open", () => {
  test("no other app page is reachable, and none loads data", async ({
    page,
  }) => {
    const seen = await setup(page);
    await page.goto(`${BASE}/auth/callback#${HASH()}`);
    await expectOnResetForm(page);
    expect(await markPresent(page)).toBe(true);

    for (const target of [
      "/app",
      "/app/overview",
      "/library",
      "/pack",
      "/deals-preview",
    ]) {
      await page.goto(BASE + target);
      await expectOnResetForm(page);
      expect(
        tablesRead(seen),
        `${target} fetched data during recovery`,
      ).toEqual([]);
    }
  });

  test("a client-side navigation to an app page is sent back too", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(`${BASE}/auth/callback#${HASH()}`);
    await expectOnResetForm(page);
    await page.evaluate(() => {
      window.history.pushState({}, "", "/app");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await expectOnResetForm(page);
  });

  test("after a successful password change the user continues normally", async ({
    page,
  }) => {
    const seen = await setup(page);
    await page.goto(`${BASE}/auth/callback#${HASH()}`);
    await expectOnResetForm(page);
    await page
      .getByLabel("New password", { exact: true })
      .fill("a-long-enough-password");
    await page
      .getByLabel("Confirm new password")
      .fill("a-long-enough-password");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(
      page.getByRole("heading", { name: "Password updated" }),
    ).toBeVisible();
    expect(
      seen.some(
        (s) =>
          s.method === "PUT" &&
          JSON.parse(s.body).password === "a-long-enough-password",
      ),
    ).toBe(true);
    expect(await markPresent(page)).toBe(false);
    await page.goto(BASE + "/app");
    await page.waitForLoadState("domcontentloaded");
    expect(path(page)).not.toBe("/reset-password");
  });

  test("cancel signs out, clears the mark and returns to sign-in", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(`${BASE}/auth/callback#${HASH()}`);
    await expectOnResetForm(page);
    await page.getByRole("button", { name: "Cancel and sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(await markPresent(page)).toBe(false);
  });
});

test.describe("ordinary sign-ins are unaffected", () => {
  test("password sign-in does not set the mark and does not land on /reset-password", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(BASE + "/sign-in");
    await page.waitForFunction(() => (window as any).__ts?.renders >= 1);
    await page.evaluate(() => (window as any).__ts.deliver());
    await page.getByLabel("Email address").fill("someone@example.invalid");
    await page
      .getByLabel("Password", { exact: true })
      .fill("not-a-real-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect
      .poll(() => path(page), { timeout: 15_000 })
      .not.toBe("/sign-in");
    expect(path(page)).not.toBe("/reset-password");
    expect(await markPresent(page)).toBe(false);
  });

  test("Google sign-in return (hash tokens, no type) is a normal sign-in", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(`${BASE}/auth/callback#${PLAIN_HASH()}`);
    await expect
      .poll(() => path(page), { timeout: 15_000 })
      .not.toBe("/auth/callback");
    expect(path(page)).not.toBe("/reset-password");
    expect(await markPresent(page)).toBe(false);
  });

  test("the Google button still starts OAuth", async ({ page }) => {
    const seen = await setup(page);
    await page.goto(BASE + "/sign-in");
    await page.getByRole("button", { name: /Continue with Google/ }).click();
    await expect
      .poll(
        () => seen.filter((s) => /\/auth\/v1\/authorize/.test(s.url)).length,
      )
      .toBe(1);
  });
});

test.describe("accessibility of the new-password screen", () => {
  for (const [w, h] of [
    [1280, 800],
    [375, 812],
  ] as const) {
    test(`axe, ${w}px, form and error state`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        isMobile: w < 500,
        hasTouch: w < 500,
      });
      const page = await ctx.newPage();
      await setup(page);
      await page.goto(`${BASE}/auth/callback#${HASH()}`);
      await expectOnResetForm(page);
      const scan = async () =>
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
            .analyze()
        ).violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`,
        );
      expect(await scan()).toEqual([]);
      await page.getByLabel("New password", { exact: true }).fill("short");
      await page.getByLabel("Confirm new password").fill("short");
      await page.getByRole("button", { name: "Set new password" }).click();
      await expect(page.getByRole("alert")).toContainText("at least 12");
      expect(await scan()).toEqual([]);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      ).toBe(0);
      await ctx.close();
    });
  }
});

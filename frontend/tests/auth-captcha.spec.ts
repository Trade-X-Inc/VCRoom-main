/* eslint-disable @typescript-eslint/no-explicit-any -- the stub Turnstile API is read through window in page.evaluate */
/**
 * Browser tests for the CAPTCHA wiring, against a build you started locally (A11Y_SCAN_BASE_URL).
 *
 * Nothing leaves the machine: the Turnstile script is replaced with a stub (route-fulfilled, so tokens are
 * deterministic and can be held back), and every Supabase auth/rest request is intercepted. Any request that is not
 * expected is aborted, so a wrong test can never reach a real project.
 */
import { test, expect, type Page, type Route } from "@playwright/test";

const BASE = process.env.A11Y_SCAN_BASE_URL ?? "http://localhost:8791";

// Stub of the Turnstile API. Modes: "hold" (tokens only when the test delivers one), "error" (error-callback).
const STUB = `
(function () {
  var widgets = {}; var n = 0;
  var T = (window.__ts = { renders: 0, resets: 0, tokens: 0, mode: window.__TS_MODE || "hold" });
  function deliver(id) { var o = widgets[id]; if (o && o.callback) o.callback("stub-token-" + (++T.tokens)); }
  window.turnstile = {
    render: function (el, o) {
      var id = "w" + (++n); widgets[id] = o; T.renders++;
      el.innerHTML = '<span>stub widget</span>';
      if (T.mode === "error") setTimeout(function () { o["error-callback"] && o["error-callback"](); }, 20);
      return id;
    },
    reset: function (id) { T.resets++; },
    remove: function () {}
  };
  T.deliver = function () { for (var k in widgets) deliver(k); };
  T.expire = function () { for (var k in widgets) widgets[k]["expired-callback"] && widgets[k]["expired-callback"](); };
})();`;

type Seen = { url: string; method: string; body: string };

async function setup(page: Page, mode: "hold" | "error" | "blocked" = "hold") {
  const seen: Seen[] = [];
  await page.addInitScript((m) => {
    (window as unknown as { __TS_MODE: string }).__TS_MODE = m;
  }, mode);
  // The build under test may point at any Supabase host (CI uses a placeholder on the reserved .invalid TLD), and the
  // app's Content-Security-Policy rightly blocks hosts it does not list, before Playwright could intercept them.
  // This file tests the wiring, not the CSP (that is checked separately against the real widget), so the policy header
  // is removed from the document response here.
  await page.route(BASE + "/**", async (route: Route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    return route.fulfill({ response, headers });
  });
  await page.route(/\/turnstile\/v0\/api\.js/, (route: Route) =>
    mode === "blocked"
      ? route.abort()
      : route.fulfill({
          status: 200,
          contentType: "text/javascript",
          body: STUB,
        }),
  );
  await page.route(/\/(auth|rest)\/v1\//, async (route: Route) => {
    const req = route.request();
    seen.push({
      url: req.url(),
      method: req.method(),
      body: req.postData() ?? "",
    });
    if (/\/auth\/v1\/authorize/.test(req.url())) {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<p>oauth stub</p>",
      });
    }
    if (/\/auth\/v1\/(token|recover|signup)/.test(req.url())) {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        }),
      });
    }
    if (/\/rest\/v1\//.test(req.url()) && req.method() === "GET") {
      // The app's own profile lookup after a session appears: answer with no rows, as an empty project would.
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    }
    return route.abort(); // anything else must not happen
  });
  return seen;
}

// Wait until the widget has been rendered (otherwise there is nothing to deliver a token to), then deliver one.
const deliver = async (page: Page) => {
  await page.waitForFunction(
    () => (window as any).__ts && (window as any).__ts.renders >= 1,
  );
  await page.evaluate(() => (window as any).__ts.deliver());
};
const ts = (page: Page) => page.evaluate(() => ({ ...(window as any).__ts }));
const captchaIn = (s: Seen) =>
  JSON.parse(s.body)?.gotrue_meta_security?.captcha_token as string | undefined;

test.describe("CAPTCHA wiring", () => {
  test("sign-in: submit disabled until verified; token sent; widget resets after a failed attempt", async ({
    page,
  }) => {
    const seen = await setup(page);
    await page.goto(BASE + "/sign-in");
    await page.getByLabel("Email address").fill("nobody@example.invalid");
    await page
      .getByLabel("Password", { exact: true })
      .fill("not-a-real-password");
    const submit = page.getByRole("button", { name: "Sign in", exact: true });

    await expect(page.getByTestId("turnstile-status")).toHaveText("Verifying…");
    await expect(submit).toBeDisabled();
    await page.getByLabel("Password", { exact: true }).press("Enter"); // implicit submit must not send anything
    expect(seen.filter((s) => /\/auth\/v1\/token/.test(s.url))).toHaveLength(0);

    await deliver(page);
    await expect(page.getByTestId("turnstile-status")).toHaveText("Verified");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect
      .poll(() => seen.filter((s) => /\/auth\/v1\/token/.test(s.url)).length)
      .toBe(1);
    const first = seen.find((s) => /\/auth\/v1\/token/.test(s.url))!;
    expect(captchaIn(first)).toBe("stub-token-1");

    // After the failed attempt the widget is reset and submit needs a NEW token.
    await expect
      .poll(async () => (await ts(page)).resets)
      .toBeGreaterThanOrEqual(1);
    await expect(submit).toBeDisabled();
    await deliver(page);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect
      .poll(() => seen.filter((s) => /\/auth\/v1\/token/.test(s.url)).length)
      .toBe(2);
    const second = seen.filter((s) => /\/auth\/v1\/token/.test(s.url))[1];
    expect(captchaIn(second)).toBe("stub-token-2");
    expect(captchaIn(second)).not.toBe(captchaIn(first));
  });

  test("sign-in: an expired token is dropped and submit is disabled again", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(BASE + "/sign-in");
    await deliver(page);
    const submit = page.getByRole("button", { name: "Sign in", exact: true });
    await page.getByLabel("Email address").fill("nobody@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("x");
    await expect(submit).toBeEnabled();
    await page.evaluate(() => (window as any).__ts.expire());
    await expect(page.getByTestId("turnstile-status")).toContainText("expired");
    await expect(submit).toBeDisabled();
  });

  test("forgot-password: the reset request carries the captcha token", async ({
    page,
  }) => {
    const seen = await setup(page);
    await page.goto(BASE + "/forgot-password");
    await page.getByLabel("Email address").fill("nobody@example.invalid");
    const submit = page.getByRole("button", { name: /Send reset link/ });
    await expect(submit).toBeDisabled();
    await deliver(page);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect
      .poll(() => seen.filter((s) => /\/auth\/v1\/recover/.test(s.url)).length)
      .toBe(1);
    const req = seen.find((s) => /\/auth\/v1\/recover/.test(s.url))!;
    expect(captchaIn(req)).toBe("stub-token-1");
    await expect
      .poll(async () => (await ts(page)).resets)
      .toBeGreaterThanOrEqual(1);
    await expect(submit).toBeDisabled();
  });

  test("a failing widget keeps submit disabled and offers a retry", async ({
    page,
  }) => {
    const seen = await setup(page, "error");
    await page.goto(BASE + "/sign-in");
    await expect(page.getByTestId("turnstile-status")).toContainText("failed");
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeDisabled();
    await page.getByLabel("Email address").fill("nobody@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("x");
    await page.getByLabel("Password", { exact: true }).press("Enter");
    expect(seen.filter((s) => /\/auth\/v1\/token/.test(s.url))).toHaveLength(0);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect
      .poll(async () => (await ts(page)).renders)
      .toBeGreaterThanOrEqual(1);
  });

  test("a script that cannot load is a visible, retryable error, not a silent bypass", async ({
    page,
  }) => {
    const seen = await setup(page, "blocked");
    await page.goto(BASE + "/sign-in");
    await expect(page.getByTestId("turnstile-status")).toContainText(
      "could not load",
      { timeout: 10_000 },
    );
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeDisabled();
    expect(seen.filter((s) => /\/auth\/v1\/token/.test(s.url))).toHaveLength(0);
  });

  test("Google sign-in is unaffected: works with no token and sends none", async ({
    page,
  }) => {
    const seen = await setup(page, "error");
    await page.goto(BASE + "/sign-in");
    const google = page.getByRole("button", { name: /Continue with Google/ });
    await expect(google).toBeEnabled();
    await google.click();
    await expect
      .poll(
        () => seen.filter((s) => /\/auth\/v1\/authorize/.test(s.url)).length,
      )
      .toBe(1);
    const url = new URL(
      seen.find((s) => /\/auth\/v1\/authorize/.test(s.url))!.url,
    );
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.search).not.toMatch(/captcha/i);
  });

  test("the widget status is a polite live region with an accessible group name", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(BASE + "/sign-in");
    await expect(
      page.getByRole("group", { name: "Security check" }),
    ).toBeVisible();
    const status = page.getByTestId("turnstile-status");
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toHaveAttribute("aria-live", "polite");
  });
});

// ── set a new password ───────────────────────────────────────────────────────────────────────────────────────
// supabase-js keys the stored session by the first label of the project host; seed every host a build might use.
const SESSION_KEYS = [
  "sb-ldimninnjlvxozubheib-auth-token",
  "sb-ci-placeholder-auth-token",
];
const FAKE_SESSION = {
  access_token: "stub.access.token",
  refresh_token: "stub-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "x@example.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  },
};

test.describe("reset-password", () => {
  test("without a reset link it explains and offers a new link (no password form)", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(BASE + "/reset-password");
    await expect(
      page.getByRole("heading", { name: /not active/i }),
    ).toBeVisible();
    await expect(page.getByLabel("New password")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /new reset link/i }),
    ).toBeVisible();
  });

  test("a signed-in session WITHOUT the recovery mark cannot use the form", async ({
    page,
  }) => {
    await setup(page);
    await page.addInitScript(
      ([keys, v]) =>
        (keys as string[]).forEach((k) => localStorage.setItem(k, v as string)),
      [SESSION_KEYS, JSON.stringify(FAKE_SESSION)],
    );
    await page.goto(BASE + "/reset-password");
    await expect(
      page.getByRole("heading", { name: /not active/i }),
    ).toBeVisible();
  });

  test("with the mark: validates 12+ chars and match, sets the password, no browser dialogs", async ({
    page,
  }) => {
    const seen = await setup(page);
    let dialogs = 0;
    page.on("dialog", (d) => {
      dialogs++;
      void d.dismiss();
    });
    await page.route(/\/auth\/v1\/user/, async (route) => {
      const req = route.request();
      seen.push({
        url: req.url(),
        method: req.method(),
        body: req.postData() ?? "",
      });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAKE_SESSION.user),
      });
    });
    await page.addInitScript(
      ([keys, v]) => {
        (keys as string[]).forEach((k) => localStorage.setItem(k, v as string));
        sessionStorage.setItem("lcs_recovery_session", String(Date.now()));
      },
      [SESSION_KEYS, JSON.stringify(FAKE_SESSION)],
    );
    await page.goto(BASE + "/reset-password");
    const pw = page.getByLabel("New password", { exact: true });
    const confirm = page.getByLabel("Confirm new password");
    await expect(pw).toBeVisible();

    await pw.fill("short");
    await confirm.fill("short");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("alert")).toContainText("at least 12");

    await pw.fill("a-long-enough-password");
    await confirm.fill("a-different-password");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(page.getByRole("alert")).toContainText("do not match");
    expect(seen.filter((s) => s.method === "PUT")).toHaveLength(0);

    await confirm.fill("a-long-enough-password");
    await page.getByRole("button", { name: "Set new password" }).click();
    await expect(
      page.getByRole("heading", { name: "Password updated" }),
    ).toBeVisible();
    const put = seen.find((s) => s.method === "PUT")!;
    expect(JSON.parse(put.body).password).toBe("a-long-enough-password");
    // The recovery mark is gone: the form cannot be used again.
    expect(
      await page.evaluate(() => sessionStorage.getItem("lcs_recovery_session")),
    ).toBeNull();
    expect(dialogs).toBe(0);
  });
});

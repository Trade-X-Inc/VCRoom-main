/* eslint-disable @typescript-eslint/no-explicit-any -- the stub Turnstile API and sessionStorage are read through window in page.evaluate */
/**
 * Browser tests for the invitation page, /join#t=<token> (J3b), against a build you started locally
 * (A11Y_SCAN_BASE_URL). Nothing leaves the machine:
 *   - the browser's Supabase requests (the build's placeholder host) are intercepted by Playwright;
 *   - the server side of the accept action is the REAL worker, whose Supabase URL is a loopback mock this spec starts
 *     on port 8799. Start the preview like this (the CI job does the same):
 *       wrangler pages dev dist/client --port 8788 --binding SUPABASE_URL=http://127.0.0.1:8799 \
 *         --binding <the service key binding>=unit-test-service-key
 * The token is a fake. Real invitations are never touched.
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import http from "node:http";

const BASE = process.env.A11Y_SCAN_BASE_URL ?? "http://localhost:8788";
const MOCK_PORT = 8799;
const TOKEN = "Zk3-Qx9_Lm2PabCdEfGhIjKlMnOpQrStUvWxYz01234"; // 43 url-safe characters
const ROOM = "33333333-3333-4333-8333-333333333333";
const STARTUP = "66666666-6666-4666-8666-666666666666";
const INVESTOR = "55555555-5555-4555-8555-555555555555";
const ALICE = "11111111-1111-4111-8111-111111111111";
const STASH_KEY = "lengdon.join.t";
const RETURN_KEY = "lengdon.join.return";

const INVALID =
  "This invitation link is invalid, has expired, or was already used. Ask the sender for a new one.";
const REFUSED_HINT =
  "Make sure you are signed in with the address the invitation was sent to.";
const UNCONFIRMED =
  "Confirm your email address first. Open the confirmation message we sent, then open this invitation link from your email again.";

// ── the loopback mock the worker talks to ───────────────────────────────────
type ServerCall = { schema: string; fn: string; body: any };
const mock = {
  calls: [] as ServerCall[],
  accept: (_b: any): any => ({ ok: false, error: "invalid_or_used" }),
  status: 200,
  appendOk: true,
  reset() {
    mock.calls = [];
    mock.accept = () => ({ ok: false, error: "invalid_or_used" });
    mock.status = 200;
    mock.appendOk = true;
  },
};
let server: http.Server;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const send = (code: number, body: unknown) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === "/auth/v1/user")
        return send(200, { id: ALICE, email: "alice@example.invalid" });
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        const fn = url.pathname.slice("/rest/v1/rpc/".length);
        const schema = String(req.headers["content-profile"] ?? "");
        const body = raw ? JSON.parse(raw) : {};
        mock.calls.push({ schema, fn, body });
        if (fn === "append_record") return send(200, { ok: mock.appendOk });
        if (fn === "accept_invite")
          return mock.status === 200
            ? send(200, mock.accept(body))
            : send(mock.status, { message: "database unavailable" });
        return send(200, { ok: false, error: "unmocked" });
      }
      send(404, {});
    });
  });
  await new Promise<void>((r) =>
    server.listen(MOCK_PORT, "127.0.0.1", () => r()),
  );
});
test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});
test.beforeEach(() => mock.reset());
const acceptCalls = () => mock.calls.filter((c) => c.fn === "accept_invite");

// ── the browser side ────────────────────────────────────────────────────────
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const NOW = Math.floor(Date.now() / 1000);
const user = (confirmed: boolean) => ({
  id: ALICE,
  aud: "authenticated",
  role: "authenticated",
  email: "alice@example.invalid",
  email_confirmed_at: confirmed ? "2026-01-01T00:00:00Z" : null,
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
});
const jwt = () =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: ALICE, aud: "authenticated", role: "authenticated", exp: NOW + 3600 })}.sig`;
const sessionFor = (confirmed: boolean) => ({
  access_token: jwt(),
  token_type: "bearer",
  expires_in: 3600,
  expires_at: NOW + 3600,
  refresh_token: "stub-refresh",
  user: user(confirmed),
});
const SESSION_KEY = "sb-ci-placeholder-auth-token";

const TURNSTILE_STUB = `
(function () {
  var widgets = {}; var n = 0; var T = (window.__ts = { renders: 0, tokens: 0 });
  window.turnstile = {
    render: function (el, o) { var id = "w" + (++n); widgets[id] = o; T.renders++; return id; },
    reset: function () {}, remove: function () {}
  };
  T.deliver = function () { for (var k in widgets) widgets[k].callback("stub-token-" + (++T.tokens)); };
})();`;

type Req = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  type: string;
};
type Opts = {
  session?: "confirmed" | "unconfirmed" | null;
  preview?: (body: any) => any; // return a body, or "abort", or {status, body}
  stash?: { t: string; exp: number } | null; // pre-seeded sessionStorage entry
  returnFlag?: boolean;
};
const VALID_PREVIEW = {
  valid: true,
  org_name: "Acme Robotics",
  role_label: "Analyst",
  expires_on: "2026-10-27",
};

async function setup(page: Page, o: Opts = {}) {
  const reqs: Req[] = [];
  const consoleText: string[] = [];
  const docHeaders: Record<string, Record<string, string>> = {};
  const hrefLog: string[] = [];
  page.on("request", (r) =>
    reqs.push({
      url: r.url(),
      method: r.method(),
      headers: r.headers(),
      body: r.postData() ?? "",
      type: r.resourceType(),
    }),
  );
  page.on("console", (m) => consoleText.push(m.text()));
  page.on("pageerror", (e) => consoleText.push(String(e)));
  await page.addInitScript(
    ({ session, key, stash, stashKey, returnKey, returnFlag }) => {
      try {
        if (session) localStorage.setItem(key, JSON.stringify(session));
        if (stash) sessionStorage.setItem(stashKey, JSON.stringify(stash));
        if (returnFlag) sessionStorage.setItem(returnKey, "1");
      } catch {
        /* storage unavailable */
      }
      // every moment the document changes, note the address: the token must never be in it
      const log = ((window as any).__hrefLog = [] as string[]);
      // Only moments when the page has visible content count: the head (meta tags, the capture script itself) cannot be
      // painted, and the capture script runs in the head before any body content is parsed.
      const note = () => {
        if (document.body && document.body.childNodes.length > 0)
          log.push(location.href);
      };
      document.addEventListener("readystatechange", note);
      document.addEventListener("DOMContentLoaded", note);
      new MutationObserver(note).observe(document, {
        childList: true,
        subtree: true,
      });
    },
    {
      session:
        o.session === "confirmed"
          ? sessionFor(true)
          : o.session === "unconfirmed"
            ? sessionFor(false)
            : null,
      key: SESSION_KEY,
      stash: o.stash ?? null,
      stashKey: STASH_KEY,
      returnKey: RETURN_KEY,
      returnFlag: !!o.returnFlag,
    },
  );
  // Documents: remember the real response headers, then drop the CSP so the placeholder Supabase host is reachable.
  await page.route(BASE + "/**", async (route: Route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const headers = { ...response.headers() };
    docHeaders[new URL(route.request().url()).pathname] = { ...headers };
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
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (/\/rest\/v1\/rpc\/invite_preview/.test(url)) {
      const out = (o.preview ?? (() => VALID_PREVIEW))(
        JSON.parse(req.postData() ?? "{}"),
      );
      if (out === "abort") return route.abort();
      if (out && typeof out === "object" && "__status" in out)
        return json(out.body, out.__status);
      return json(out);
    }
    if (/\/auth\/v1\/user/.test(url))
      return json(user(o.session !== "unconfirmed"));
    if (/\/auth\/v1\/logout/.test(url)) return route.fulfill({ status: 204 });
    if (/\/auth\/v1\/token/.test(url)) return json(sessionFor(true));
    if (/\/rest\/v1\/users/.test(url)) return json([{ role: "founder" }]);
    if (/\/rest\/v1\//.test(url)) return json([]);
    return route.abort();
  });
  // pages the user is sent to after accepting: only the address matters here
  await page.route(BASE + "/app**", (r) =>
    r.request().resourceType() === "document"
      ? r.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><title>app</title>",
        })
      : r.fallback(),
  );
  return { reqs, consoleText, docHeaders, hrefLog };
}

const mainText = (page: Page) => page.locator("main").innerText();
const heading = (page: Page) => page.locator("#join-heading");
const visibleStateReady = async (page: Page) => {
  await expect(heading(page)).not.toHaveText("Checking your invitation");
};
async function openFresh(page: Page, o: Opts = {}, hash = `#t=${TOKEN}`) {
  const ctx = await setup(page, o);
  await page.goto(`${BASE}/join${hash}`);
  await visibleStateReady(page);
  return ctx;
}
const stashOf = (page: Page) =>
  page.evaluate((k) => sessionStorage.getItem(k), STASH_KEY);

// ═══ the token never leaves the stash ═══════════════════════════════════════

test("the token leaves the address bar before anything renders, and is only ever in the stash and two request bodies", async ({
  page,
}) => {
  const { reqs, consoleText, docHeaders } = await openFresh(page, {
    session: "confirmed",
  });
  // the address
  expect(page.url()).toBe(`${BASE}/join`);
  expect(new URL(page.url()).hash).toBe("");
  // every moment the document changed while loading, the address was already clean
  const log: string[] = await page.evaluate(() => (window as any).__hrefLog);
  expect(log.length).toBeGreaterThan(0);
  for (const h of log) expect(h, h).not.toContain(TOKEN);
  // the capture script is in the head, before the body, and carries the page's nonce
  const html = await (await page.request.get(`${BASE}/join`)).text();
  expect(html.indexOf("lengdon.join.t")).toBeGreaterThan(0);
  expect(html.indexOf("lengdon.join.t")).toBeLessThan(html.indexOf("<body"));
  expect(html).toMatch(/<script nonce="[A-Za-z0-9-]+">\(function/);
  // storage: exactly one sessionStorage entry holds it, with a 30-minute expiry; nothing else does
  const storage = await page.evaluate(() => ({
    session: { ...sessionStorage },
    local: { ...localStorage },
    cookie: document.cookie,
  }));
  expect(Object.keys(storage.session)).toEqual([STASH_KEY]);
  const entry = JSON.parse(storage.session[STASH_KEY]);
  expect(entry.t).toBe(TOKEN);
  expect(entry.exp - Date.now()).toBeGreaterThan(29 * 60 * 1000);
  expect(entry.exp - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
  expect(JSON.stringify(storage.local)).not.toContain(TOKEN);
  expect(storage.cookie).not.toContain(TOKEN);
  // requests: never in a URL or a header (Referer included); in a request body only for the preview call
  for (const r of reqs) {
    expect(r.url, r.url).not.toContain(TOKEN);
    expect(JSON.stringify(r.headers), r.url).not.toContain(TOKEN);
    if (r.body.includes(TOKEN))
      expect(r.url).toContain("/rest/v1/rpc/invite_preview");
  }
  expect(consoleText.join("\n")).not.toContain(TOKEN);
  expect(docHeaders["/join"]["referrer-policy"]).toBe("no-referrer");
});

test("a malformed token is also removed from the address, is not stored, and shows the one invalid message", async ({
  page,
}) => {
  await openFresh(page, {}, `#t=${TOKEN.slice(0, 42)}`);
  expect(page.url()).toBe(`${BASE}/join`);
  expect(await stashOf(page)).toBeNull();
  await expect(page.locator("main")).toContainText(INVALID);
});

test("the headers: no-referrer, noindex, no-store and no-transform; no third-party script, frame or connect host; legacy form keeps its policy", async ({
  page,
}) => {
  const { reqs, docHeaders } = await openFresh(page, { session: "confirmed" });
  const h = docHeaders["/join"];
  expect(h["referrer-policy"]).toBe("no-referrer");
  expect(h["x-robots-tag"]).toContain("noindex");
  expect(h["cache-control"]).toContain("no-store");
  expect(h["cache-control"]).toContain("no-transform");
  const csp = h["content-security-policy"];
  for (const host of [
    "challenges.cloudflare.com",
    "daily.co",
    "cloudflareinsights.com",
  ])
    expect(csp, host).not.toContain(host);
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).toContain("report-uri /api/csp-report");
  // the page loaded no script from any other origin
  const origin = new URL(BASE).origin;
  for (const r of reqs.filter((q) => q.type === "script"))
    expect(new URL(r.url).origin, r.url).toBe(origin);
  // the old ?token= link keeps the full policy (it still uses the captcha widget)
  const legacy = await page.request.get(
    `${BASE}/join?token=00000000-0000-4000-8000-000000000000`,
  );
  expect(legacy.headers()["content-security-policy"]).toContain(
    "challenges.cloudflare.com",
  );
  expect(legacy.headers()["referrer-policy"]).toBe("no-referrer");
});

// ═══ preview states ═════════════════════════════════════════════════════════

test("valid: organisation, role, expiry date and the one-address sentence; focus is on the heading", async ({
  page,
}) => {
  await openFresh(page, { session: null });
  await expect(heading(page)).toHaveText(
    "You have been invited to Acme Robotics",
  );
  const text = await mainText(page);
  expect(text).toContain("Acme Robotics");
  expect(text).toContain("Analyst");
  expect(text).toContain("27 October 2026");
  expect(text).toContain(
    "This invitation is for one email address. Sign in with the address it was sent to.",
  );
  await expect(heading(page)).toBeFocused();
});

test("invalid: five different causes give byte-identical output, and so does no token at all", async ({
  browser,
}) => {
  const causes: Array<[string, Opts, string]> = [
    ["valid:false", { preview: () => ({ valid: false }) }, `#t=${TOKEN}`],
    [
      "database error",
      { preview: () => ({ __status: 400, body: { message: "boom" } }) },
      `#t=${TOKEN}`,
    ],
    ["network failure", { preview: () => "abort" }, `#t=${TOKEN}`],
    ["wrong shape", { preview: () => [] }, `#t=${TOKEN}`],
    ["no fragment, no stash", {}, ""],
  ];
  const seen: string[] = [];
  for (const [name, o, hash] of causes) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await openFresh(page, o, hash);
    await expect(heading(page)).toHaveText("This invitation cannot be used");
    const text = await mainText(page);
    expect(text, name).toContain(INVALID);
    seen.push(text);
    await ctx.close();
  }
  expect(new Set(seen).size).toBe(1);
});

test("stash: a fresh entry resumes the page without a fragment; an expired one shows the invalid message", async ({
  browser,
}) => {
  const a = await (await browser.newContext()).newPage();
  await openFresh(
    a,
    { stash: { t: TOKEN, exp: Date.now() + 10 * 60 * 1000 } },
    "",
  );
  await expect(heading(a)).toHaveText("You have been invited to Acme Robotics");
  const b = await (await browser.newContext()).newPage();
  await openFresh(b, { stash: { t: TOKEN, exp: Date.now() - 1000 } }, "");
  await expect(heading(b)).toHaveText("This invitation cannot be used");
  expect(await stashOf(b)).toBeNull();
});

test("a reload keeps working from the stash (the fragment is gone but the invitation is not)", async ({
  page,
}) => {
  await openFresh(page, { session: null });
  await page.reload();
  await visibleStateReady(page);
  await expect(heading(page)).toHaveText(
    "You have been invited to Acme Robotics",
  );
});

// ═══ signed out, unconfirmed ════════════════════════════════════════════════

test("signed out: Sign in and Create an account, no accept button; leaving to sign in sets the return flag", async ({
  page,
}) => {
  await openFresh(page, { session: null });
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept the invitation" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  const flags = await page.evaluate(
    ([r, s]) => [sessionStorage.getItem(r), sessionStorage.getItem(s)],
    [RETURN_KEY, STASH_KEY],
  );
  expect(flags[0]).toBe("1");
  expect(flags[1]).toContain('"t"');
});

test("sign-in from the invitation page returns to /join (a fixed path); without the flag it goes to the app", async ({
  browser,
}) => {
  async function signIn(flag: boolean) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await setup(page, {
      session: null,
      returnFlag: flag,
      stash: flag ? { t: TOKEN, exp: Date.now() + 10 * 60 * 1000 } : null,
    });
    await page.goto(`${BASE}/sign-in`);
    await page.getByLabel("Email address").fill("alice@example.invalid");
    await page
      .getByLabel("Password", { exact: true })
      .fill("not-a-real-password");
    await page.waitForFunction(() => (window as any).__ts?.renders > 0);
    await page.evaluate(() => (window as any).__ts.deliver());
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    return { ctx, page };
  }
  const withFlag = await signIn(true);
  await expect(withFlag.page).toHaveURL(`${BASE}/join`);
  await withFlag.ctx.close();
  const without = await signIn(false);
  await expect(without.page).toHaveURL(/\/app\/?$/);
  await without.ctx.close();
});

test("signed in but the email is not confirmed: the message, no accept button, and the server is never asked", async ({
  page,
}) => {
  await openFresh(page, { session: "unconfirmed" });
  await expect(page.locator("main")).toContainText(UNCONFIRMED);
  await expect(
    page.getByRole("button", { name: "Accept the invitation" }),
  ).toHaveCount(0);
  await page.waitForTimeout(1000);
  expect(acceptCalls()).toHaveLength(0);
});

// ═══ accepting ══════════════════════════════════════════════════════════════

test("signed in and confirmed: shows who you are and waits; NOTHING is accepted until the button is pressed", async ({
  page,
}) => {
  const { reqs } = await openFresh(page, { session: "confirmed" });
  await expect(page.locator("main")).toContainText(
    "You are signed in as alice@example.invalid",
  );
  await expect(
    page.getByRole("button", { name: "Accept the invitation" }),
  ).toBeEnabled();
  await page.waitForTimeout(1500);
  expect(acceptCalls()).toHaveLength(0);
  expect(reqs.filter((r) => r.url.includes("_serverFn"))).toHaveLength(0);
});

const KINDS: Array<[string, Record<string, unknown>, string]> = [
  [
    "team",
    {
      kind: "team",
      role: "analyst",
      org_name: "Acme Robotics",
      scope_startup_id: STARTUP,
    },
    "/app/overview",
  ],
  [
    "fund_team",
    {
      kind: "fund_team",
      role: "associate",
      org_name: "Acme Capital",
      scope_investor_id: INVESTOR,
    },
    "/app/investor/overview",
  ],
  [
    "room_member",
    {
      kind: "room_member",
      role: "investor",
      org_name: "Acme Robotics",
      scope_room_id: ROOM,
    },
    `/app/deal-rooms/${ROOM}/overview`,
  ],
  [
    "room_counsel",
    {
      kind: "room_counsel",
      role: "investor",
      org_name: "Acme Robotics",
      scope_room_id: ROOM,
    },
    `/app/deal-rooms/${ROOM}/overview`,
  ],
];
for (const [kind, result, target] of KINDS) {
  test(`accept (${kind}): one call with the token in the body, the stash cleared, redirect to ${target}`, async ({
    page,
  }) => {
    mock.accept = () => ({
      ok: true,
      scope_room_id: null,
      scope_startup_id: null,
      scope_investor_id: null,
      ...result,
    });
    const { reqs } = await openFresh(page, { session: "confirmed" });
    await page.getByRole("button", { name: "Accept the invitation" }).click();
    await expect(page).toHaveURL(`${BASE}${target}`);
    expect(acceptCalls()).toHaveLength(1);
    expect(acceptCalls()[0].schema).toBe("invite_api");
    expect(acceptCalls()[0].body).toEqual({ p_uid: ALICE, p_token: TOKEN });
    expect(await stashOf(page)).toBeNull();
    for (const r of reqs) expect(r.url, r.url).not.toContain(TOKEN);
  });
}

test("refusal: one generic message plus the hint, the same for every cause; the invitation stays so another account can try", async ({
  browser,
}) => {
  const causes = [
    { ok: false, error: "invalid_or_used" },
    { ok: false, error: "not_authorized" },
    { ok: false },
  ];
  const texts: string[] = [];
  for (const c of causes) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    mock.accept = () => c;
    await openFresh(page, { session: "confirmed" });
    await page.getByRole("button", { name: "Accept the invitation" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("Invitation not accepted.");
    await expect(alert).toContainText(INVALID);
    await expect(alert).toContainText(REFUSED_HINT);
    texts.push(await alert.innerText());
    expect(await stashOf(page)).not.toBeNull();
    await expect(
      page.getByRole("button", { name: "Accept the invitation" }),
    ).toBeEnabled();
    await expect(heading(page)).toBeFocused();
    await ctx.close();
  }
  expect(new Set(texts).size).toBe(1);
});

test("switch account: signs out, offers Sign in again, and keeps the invitation for the next account", async ({
  page,
}) => {
  mock.accept = () => ({ ok: false, error: "invalid_or_used" });
  const { reqs } = await openFresh(page, { session: "confirmed" });
  await page.getByRole("button", { name: "Accept the invitation" }).click();
  await page
    .getByRole("button", { name: "Sign out and switch account" })
    .click();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  expect(reqs.some((r) => r.url.includes("/auth/v1/logout"))).toBe(true);
  expect(
    await page.evaluate((k) => sessionStorage.getItem(k), RETURN_KEY),
  ).toBe("1");
  expect(await stashOf(page)).not.toBeNull();
});

test("a database failure is not the refusal message: it says to try again, and the button works again", async ({
  page,
}) => {
  mock.status = 503;
  await openFresh(page, { session: "confirmed" });
  await page.getByRole("button", { name: "Accept the invitation" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Something went wrong. Try again in a moment.",
  );
  await expect(page.getByRole("alert")).not.toContainText(INVALID);
  await expect(
    page.getByRole("button", { name: "Accept the invitation" }),
  ).toBeEnabled();
});

test("if only the record entry fails, the page says the invitation WAS accepted and links to the app", async ({
  page,
}) => {
  mock.accept = () => ({
    ok: true,
    kind: "team",
    role: "analyst",
    org_name: "Acme Robotics",
    scope_room_id: null,
    scope_startup_id: STARTUP,
    scope_investor_id: null,
  });
  mock.appendOk = false;
  await openFresh(page, { session: "confirmed" });
  await page.getByRole("button", { name: "Accept the invitation" }).click();
  await expect(heading(page)).toHaveText("Invitation accepted");
  await expect(page.locator("main")).toContainText(
    "Your invitation was accepted, but a record entry could not be written. Open the app to continue.",
  );
  await expect(
    page.getByRole("link", { name: "Open the app" }),
  ).toHaveAttribute("href", "/app");
  await expect(
    page.getByRole("button", { name: "Accept the invitation" }),
  ).toHaveCount(0);
  expect(await stashOf(page)).toBeNull();
});

// ═══ accessibility ══════════════════════════════════════════════════════════

async function axeClean(page: Page, label: string) {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    r.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
    label,
  ).toEqual([]);
}
async function noHorizontalScroll(page: Page, label: string) {
  const w = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(w[0], label).toBeLessThanOrEqual(w[1]);
}

for (const [name, size] of [
  ["desktop", { width: 1280, height: 800 }],
  ["phone", { width: 375, height: 812 }],
] as const) {
  test(`axe (WCAG 2.2 AA), errors not colour-only, no horizontal scroll: every state at ${name}`, async ({
    browser,
  }) => {
    async function page_(o: Opts) {
      const ctx = await browser.newContext({ viewport: size });
      const page = await ctx.newPage();
      await openFresh(page, o);
      return { ctx, page };
    }
    // invalid
    let s = await page_({ preview: () => ({ valid: false }) });
    await axeClean(s.page, "invalid");
    await noHorizontalScroll(s.page, "invalid");
    await s.ctx.close();
    // signed out
    s = await page_({ session: null });
    await axeClean(s.page, "signed-out");
    await noHorizontalScroll(s.page, "signed-out");
    await s.ctx.close();
    // unconfirmed
    s = await page_({ session: "unconfirmed" });
    await axeClean(s.page, "unconfirmed");
    await noHorizontalScroll(s.page, "unconfirmed");
    await s.ctx.close();
    // ready, then refused, then failed
    s = await page_({ session: "confirmed" });
    await axeClean(s.page, "ready");
    await noHorizontalScroll(s.page, "ready");
    mock.accept = () => ({ ok: false, error: "invalid_or_used" });
    await s.page.getByRole("button", { name: "Accept the invitation" }).click();
    await expect(s.page.getByRole("alert")).toBeVisible();
    await expect(s.page.getByRole("alert")).toContainText(
      "Invitation not accepted.",
    ); // words, not only a colour
    await axeClean(s.page, "refused");
    await noHorizontalScroll(s.page, "refused");
    mock.status = 503;
    await s.page.getByRole("button", { name: "Accept the invitation" }).click();
    await expect(s.page.getByRole("alert")).toContainText(
      "Something went wrong",
    );
    await axeClean(s.page, "failed");
    await s.ctx.close();
  });
}

test("keyboard: Tab reaches Sign in, Create an account in order, with a visible focus ring; one h1; the status region is polite", async ({
  page,
}) => {
  await openFresh(page, { session: null });
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator('[role="status"]')).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeFocused();
  const ring = await page
    .getByRole("link", { name: "Sign in" })
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Create an account" }),
  ).toBeFocused();
});

test("the old team link /join?token=<uuid> still renders the legacy page, not the new one", async ({
  page,
}) => {
  await setup(page, { session: null, preview: () => ({ valid: false }) });
  await page.goto(`${BASE}/join?token=00000000-0000-4000-8000-000000000000`);
  await expect(page.locator("#join-heading")).toHaveCount(0);
});

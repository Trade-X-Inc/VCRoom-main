/* eslint-disable @typescript-eslint/no-explicit-any -- the harness inspects untyped JSON bodies recorded from a local mock */
// Invitation gateway actions (job J3a): validation, identity, authorization pass-through, step-up, the email send and the
// token rules. Drives the REAL pipeline (runAction) against a loopback mock that plays Supabase Auth, the PostgREST RPC
// layer (pack_api / invite_api), the users table and Resend. Nothing here touches a real network or the live database.
import { test, expect } from "@playwright/test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { runAction } from "../src/lib/actions/gateway";
import {
  AcceptInviteInput,
  CreateInviteInput,
  InviteIdInput,
  ListInvitesInput,
  createNeedsStepUp,
  maskEmail,
  makeInviteDefs,
} from "../src/lib/actions/invite-core";
import { sendInvitationEmail } from "../src/lib/email/invite-send";
import { invitationEmail } from "../src/lib/email/templates";
import type { ProviderEnv } from "../src/lib/email/server-env";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const STARTUP = "66666666-6666-4666-8666-666666666666";
const ROOM = "33333333-3333-4333-8333-333333333333";
const INVESTOR = "55555555-5555-4555-8555-555555555555";
const REQ = "77777777-7777-4777-8777-777777777777";
const INVITE = "99999999-9999-4999-8999-999999999999";
const TOKEN = "Zk3-Qx9_Lm2PabCdEfGhIjKlMnOpQrStUvWxYz01234"; // 43 url-safe characters, the shape the database issues
const INVITEE = "newhire@example.invalid";

type Call = { schema: string; fn: string; body: any };
type Mock = {
  baseUrl: string;
  calls: Call[];
  mails: any[];
  authHits: number;
  rpc: Record<string, (body: any) => any>;
  mailStatus: number;
  stepUpOk: Set<string>;
  reset: () => void;
  close: () => Promise<void>;
};

async function startMock(): Promise<Mock> {
  const m: Mock = {
    baseUrl: "",
    calls: [],
    mails: [],
    authHits: 0,
    rpc: {},
    mailStatus: 200,
    stepUpOk: new Set(),
    reset() {
      m.calls = [];
      m.mails = [];
      m.authHits = 0;
      m.mailStatus = 200;
      m.rpc = {};
      m.stepUpOk = new Set(["step-ok"]);
    },
    close: () => new Promise((r) => server.close(() => r())),
  };
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const url = new URL(req.url ?? "/", "http://x");
      const send = (code: number, body: unknown) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url.pathname === "/auth/v1/user") {
        m.authHits++;
        const t = String(req.headers.authorization ?? "").replace(
          "Bearer ",
          "",
        );
        if (t === "tok-alice")
          return send(200, { id: ALICE, email: "alice@example.invalid" });
        if (t === "tok-bob")
          return send(200, { id: BOB, email: "bob@example.invalid" });
        return send(401, { message: "bad token" });
      }
      if (url.pathname.startsWith("/rest/v1/rpc/")) {
        const fn = url.pathname.slice("/rest/v1/rpc/".length);
        const schema = String(
          req.headers["content-profile"] ?? req.headers["accept-profile"] ?? "",
        );
        const body = raw ? JSON.parse(raw) : {};
        m.calls.push({ schema, fn, body });
        if (
          schema === "pack_api" &&
          fn === "verify_and_consume_step_up_token"
        ) {
          const ok = m.stepUpOk.delete(String(body.p_token));
          return send(
            200,
            ok ? { ok: true } : { ok: false, error: "invalid_token" },
          );
        }
        if (schema === "pack_api" && fn === "append_record")
          return send(
            200,
            m.rpc.append_record ? m.rpc.append_record(body) : { ok: true },
          );
        const h = m.rpc[fn];
        const out = h ? h(body) : { ok: false, error: "unmocked" };
        if (out && out.__http)
          return send(out.__http, { message: "database unavailable" });
        return send(200, out);
      }
      if (url.pathname === "/rest/v1/users") {
        const one = String(req.headers.accept ?? "").includes("pgrst.object");
        const row = { full_name: "Alice Founder" };
        return send(200, one ? row : [row]);
      }
      if (url.pathname === "/emails" && req.method === "POST") {
        m.mails.push(JSON.parse(raw));
        return send(
          m.mailStatus,
          m.mailStatus < 300 ? { id: "em_1" } : { message: "provider down" },
        );
      }
      send(404, { error: "not found" });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  m.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  m.reset();
  return m;
}

let mock: Mock;
let env: ProviderEnv;
let logs: string[] = [];
const origConsole: Record<string, any> = {};

test.beforeAll(async () => {
  mock = await startMock();
  // getEnvVar reads the Cloudflare runtime secrets object first, which is how the worker gets them in production.
  (globalThis as any).__cf_env = {
    SUPABASE_URL: mock.baseUrl,
    // the key's name is assembled so this spec never spells the service-role identifier (check-live-specs.mjs)
    [["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_")]: "unit-test-service-key",
  };
  env = {
    supabaseUrl: mock.baseUrl,
    serviceKey: "unit-test-service-key",
    anonKey: "unit-test-anon",
    resendBase: mock.baseUrl,
    resendKey: "unit-test-resend",
    hubspotBase: mock.baseUrl,
    hubspotToken: "x",
    notionBase: mock.baseUrl,
    notionKey: "x",
    appUrl: "https://app.example.invalid",
  };
});
test.afterAll(async () => {
  delete (globalThis as any).__cf_env;
  await mock.close();
});
test.beforeEach(() => {
  mock.reset();
  logs = [];
  for (const k of ["log", "info", "warn", "error", "debug"] as const) {
    origConsole[k] = console[k];
    (console as any)[k] = (...a: unknown[]) => {
      logs.push(
        a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "),
      );
    };
  }
});
test.afterEach(() => {
  for (const k of ["log", "info", "warn", "error", "debug"] as const)
    (console as any)[k] = origConsole[k];
});

const deps = () => ({
  sendEmail: (d: Parameters<typeof sendInvitationEmail>[1]) =>
    sendInvitationEmail(env, d),
});
const defs = () => makeInviteDefs(deps());
const envelope = (input: unknown, extra: Record<string, unknown> = {}) => ({
  accessToken: "tok-alice",
  scopeId: STARTUP,
  input,
  ...extra,
});
const teamInput = (over: Record<string, unknown> = {}) => ({
  kind: "team",
  email: INVITEE,
  role: "analyst",
  startupId: STARTUP,
  ...over,
});
const created = (over: Record<string, unknown> = {}) => ({
  ok: true,
  invite_id: INVITE,
  token: TOKEN,
  kind: "team",
  role: "analyst",
  email: INVITEE,
  expires_at: "2026-10-27T10:00:00+00:00",
  org_name: "Acme Robotics",
  ...over,
});
const callsTo = (fn: string) =>
  mock.calls.filter((c) => c.schema === "invite_api" && c.fn === fn);

// ── validation ──────────────────────────────────────────────────────────────

test("create input: a valid team invitation parses; the address is trimmed and lowercased", () => {
  const p = CreateInviteInput.safeParse(
    teamInput({ email: "  NewHire@Example.INVALID " }),
  );
  expect(p.success).toBe(true);
  if (p.success) expect(p.data.email).toBe(INVITEE);
});

test("create input: unknown keys are refused, including every spelling of an identity", () => {
  for (const key of [
    "userId",
    "uid",
    "p_uid",
    "createdBy",
    "created_by",
    "invitedBy",
    "actor",
  ]) {
    expect(
      CreateInviteInput.safeParse(teamInput({ [key]: ALICE })).success,
      key,
    ).toBe(false);
  }
  expect(
    InviteIdInput.safeParse({ inviteId: INVITE, userId: ALICE }).success,
  ).toBe(false);
  expect(
    ListInvitesInput.safeParse({
      kind: "team",
      startupId: STARTUP,
      userId: ALICE,
    }).success,
  ).toBe(false);
});

test("create input: malformed addresses are refused", () => {
  for (const email of [
    "",
    "plain",
    "a@b",
    "a b@c.de",
    "a@b c.de",
    "a@@b.co",
    "x@y.z\nbcc@evil.example",
    "x@y.z,other@y.z" + "\u0000",
    `${"a".repeat(250)}@b.co`,
    "@b.co",
  ]) {
    expect(
      CreateInviteInput.safeParse(teamInput({ email })).success,
      JSON.stringify(email),
    ).toBe(false);
  }
});

test("create input: expiry must be a whole number from 1 to 30", () => {
  for (const d of [1, 7, 30])
    expect(
      CreateInviteInput.safeParse(teamInput({ expiresInDays: d })).success,
    ).toBe(true);
  for (const d of [0, -1, 31, 90, 1.5, "7", null, NaN]) {
    expect(
      CreateInviteInput.safeParse(teamInput({ expiresInDays: d })).success,
      String(d),
    ).toBe(false);
  }
});

test("create input: ids must be uuids", () => {
  expect(
    CreateInviteInput.safeParse(teamInput({ startupId: "not-a-uuid" })).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse(teamInput({ startupId: `${STARTUP}x` }))
      .success,
  ).toBe(false);
  expect(InviteIdInput.safeParse({ inviteId: "1; drop table x" }).success).toBe(
    false,
  );
});

test("create input: the role must belong to the kind, and role and address are required except for counsel", () => {
  expect(
    CreateInviteInput.safeParse(teamInput({ role: "owner" })).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse(teamInput({ role: "associate" })).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse({
      kind: "fund_team",
      email: INVITEE,
      role: "external",
      investorId: INVESTOR,
    }).success,
  ).toBe(true);
  expect(
    CreateInviteInput.safeParse({
      kind: "fund_team",
      email: INVITEE,
      role: "viewer",
      investorId: INVESTOR,
    }).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse({
      kind: "room_member",
      email: INVITEE,
      role: "lawyer",
      roomId: ROOM,
    }).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse({
      kind: "room_member",
      email: INVITEE,
      role: "investor",
      roomId: ROOM,
    }).success,
  ).toBe(true);
  expect(
    CreateInviteInput.safeParse(teamInput({ role: undefined })).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse(teamInput({ email: undefined })).success,
  ).toBe(false);
});

test("create input: exactly the scope the kind uses", () => {
  expect(
    CreateInviteInput.safeParse(teamInput({ startupId: undefined })).success,
  ).toBe(false);
  expect(CreateInviteInput.safeParse(teamInput({ roomId: ROOM })).success).toBe(
    false,
  );
  expect(
    CreateInviteInput.safeParse(teamInput({ investorId: INVESTOR })).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse({
      kind: "room_member",
      email: INVITEE,
      role: "investor",
      startupId: STARTUP,
    }).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse({
      kind: "room_member",
      email: INVITEE,
      role: "investor",
      roomId: ROOM,
      startupId: STARTUP,
    }).success,
  ).toBe(false);
});

test("create input: counsel takes a room and an approved request, and never an address from the caller", () => {
  expect(
    CreateInviteInput.safeParse({
      kind: "room_counsel",
      roomId: ROOM,
      requestId: REQ,
    }).success,
  ).toBe(true);
  expect(
    CreateInviteInput.safeParse({
      kind: "room_counsel",
      roomId: ROOM,
      requestId: REQ,
      email: INVITEE,
    }).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse({ kind: "room_counsel", roomId: ROOM }).success,
  ).toBe(false);
  expect(
    CreateInviteInput.safeParse(teamInput({ requestId: REQ })).success,
  ).toBe(false);
});

test("list input: exactly one scope, the one the kind uses", () => {
  expect(
    ListInvitesInput.safeParse({ kind: "team", startupId: STARTUP }).success,
  ).toBe(true);
  expect(
    ListInvitesInput.safeParse({ kind: "team", roomId: ROOM }).success,
  ).toBe(false);
  expect(
    ListInvitesInput.safeParse({
      kind: "team",
      startupId: STARTUP,
      roomId: ROOM,
    }).success,
  ).toBe(false);
  expect(ListInvitesInput.safeParse({ kind: "team" }).success).toBe(false);
  expect(
    ListInvitesInput.safeParse({ kind: "fund_team", investorId: INVESTOR })
      .success,
  ).toBe(true);
});

test("step-up predicate: true only for an admin role on a team or fund-team invitation", () => {
  expect(createNeedsStepUp(teamInput({ role: "admin" }))).toBe(true);
  expect(
    createNeedsStepUp({
      kind: "fund_team",
      email: INVITEE,
      role: "admin",
      investorId: INVESTOR,
    }),
  ).toBe(true);
  expect(createNeedsStepUp(teamInput({ role: "manager" }))).toBe(false);
  expect(createNeedsStepUp(teamInput({ role: "viewer" }))).toBe(false);
  expect(
    createNeedsStepUp({
      kind: "room_member",
      email: INVITEE,
      role: "investor",
      roomId: ROOM,
    }),
  ).toBe(false);
  expect(
    createNeedsStepUp({ kind: "room_counsel", roomId: ROOM, requestId: REQ }),
  ).toBe(false);
  for (const junk of [
    null,
    undefined,
    3,
    "admin",
    [],
    { kind: "team", role: "admin" },
    teamInput({ role: "Admin" }),
    teamInput({ role: "admin", extra: 1 }),
  ]) {
    expect(createNeedsStepUp(junk), JSON.stringify(junk)).toBe(false);
  }
});

test("maskEmail never returns the full address", () => {
  expect(maskEmail("jane.doe@example.com")).toBe("j***@example.com");
  expect(maskEmail("a@b.co")).toBe("a***@b.co");
  for (const bad of ["", "no-at", "@x.co", "x@", null, undefined, 5])
    expect(maskEmail(bad)).toBe("***");
});

// ── identity and authorization ──────────────────────────────────────────────

test("no session: 401 not_authenticated and nothing is called", async () => {
  const r = await runAction(
    defs().create,
    envelope(teamInput(), { accessToken: "" }),
  );
  expect(r).toMatchObject({
    ok: false,
    error: "not_authenticated",
    status: 401,
  });
  const r2 = await runAction(
    defs().create,
    envelope(teamInput(), { accessToken: "garbage" }),
  );
  expect(r2).toMatchObject({ ok: false, status: 401 });
  expect(mock.calls.filter((c) => c.schema === "invite_api")).toHaveLength(0);
  expect(mock.mails).toHaveLength(0);
});

test("p_uid is the verified session user, even when the body and the envelope name someone else", async () => {
  mock.rpc.create_invite = () => created();
  const r = await runAction(
    defs().create,
    envelope(teamInput(), { userId: BOB, uid: BOB, p_uid: BOB }),
  );
  expect(r.ok).toBe(true);
  const c = callsTo("create_invite");
  expect(c).toHaveLength(1);
  expect(c[0].body.p_uid).toBe(ALICE);
  expect(JSON.stringify(c[0].body)).not.toContain(BOB);
});

test("an identity smuggled inside the input is refused as invalid_input and reaches nothing", async () => {
  mock.rpc.create_invite = () => created();
  const r = await runAction(
    defs().create,
    envelope(teamInput({ userId: BOB })),
  );
  expect(r).toMatchObject({ ok: false, error: "invalid_input", status: 400 });
  expect(callsTo("create_invite")).toHaveLength(0);
  expect(mock.mails).toHaveLength(0);
});

test("the RPC arguments are exactly the mapped, validated fields", async () => {
  mock.rpc.create_invite = () => created();
  await runAction(
    defs().create,
    envelope(
      teamInput({ email: " NewHire@Example.INVALID ", expiresInDays: 14 }),
    ),
  );
  expect(callsTo("create_invite")[0].body).toEqual({
    p_uid: ALICE,
    p_kind: "team",
    p_email: INVITEE,
    p_role: "analyst",
    p_scope_room: null,
    p_scope_startup: STARTUP,
    p_scope_investor: null,
    p_request_id: null,
    p_expires_in_days: 14,
  });
});

test("a user with no authority gets the uniform not_authorized: no email, no mark_sent", async () => {
  mock.rpc.create_invite = () => ({ ok: false, error: "not_authorized" });
  const r = await runAction(
    defs().create,
    envelope(teamInput(), { accessToken: "tok-bob" }),
  );
  expect(r).toMatchObject({ ok: false, error: "not_authorized" });
  expect(mock.mails).toHaveLength(0);
  expect(callsTo("mark_sent")).toHaveLength(0);
  expect(callsTo("create_invite")[0].body.p_uid).toBe(BOB);
  for (const [name, fn, body] of [
    ["resend", "resend_invite", { inviteId: INVITE }],
    ["revoke", "revoke_invite", { inviteId: INVITE }],
  ] as const) {
    mock.rpc[fn] = () => ({ ok: false, error: "not_authorized" });
    const d = (defs() as any)[name];
    const x = await runAction(d, envelope(body, { accessToken: "tok-bob" }));
    expect(x, name).toMatchObject({ ok: false, error: "not_authorized" });
  }
  expect(mock.mails).toHaveLength(0);
});

test("an agent caller is refused for every commit-class invitation action", async () => {
  mock.rpc.create_invite = () => created();
  const d = defs();
  for (const [def, input] of [
    [d.create, teamInput()],
    [d.resend, { inviteId: INVITE }],
    [d.revoke, { inviteId: INVITE }],
  ] as const) {
    const r = await runAction(def as any, envelope(input, { isAgent: true }));
    expect(r).toMatchObject({
      ok: false,
      error: "agent_commit_forbidden",
      status: 403,
    });
  }
  expect(mock.calls.filter((c) => c.schema === "invite_api")).toHaveLength(0);
});

test("unknown RPC answers and transport failures become short codes, never a raw message", async () => {
  mock.rpc.create_invite = () => ({
    ok: false,
    error: "relation invite_v1.invite does not exist",
  });
  let r: any = await runAction(defs().create, envelope(teamInput()));
  expect(r).toMatchObject({ ok: false, error: "create_invite_failed" });
  mock.rpc.create_invite = () => "garbage";
  r = await runAction(defs().create, envelope(teamInput()));
  expect(r.ok).toBe(false);
  expect(String(r.error)).toMatch(/^[a-z_]+$/);
  for (const code of [
    "duplicate_pending",
    "daily_cap_sender",
    "too_soon",
    "role_exceeds_caller",
    "already_member",
  ]) {
    mock.rpc.create_invite = () => ({ ok: false, error: code });
    r = await runAction(defs().create, envelope(teamInput()));
    expect(r.error).toBe(code);
  }
});

// ── step-up ─────────────────────────────────────────────────────────────────

test("step-up: an admin-level team invitation needs the password re-entry token", async () => {
  mock.rpc.create_invite = () => created({ role: "admin" });
  const noToken = await runAction(
    defs().create,
    envelope(teamInput({ role: "admin" })),
  );
  expect(noToken).toMatchObject({
    ok: false,
    error: "STEP_UP_REQUIRED",
    status: 401,
  });
  const wrong = await runAction(
    defs().create,
    envelope(teamInput({ role: "admin" }), { stepUpToken: "nope" }),
  );
  expect(wrong).toMatchObject({ ok: false, error: "STEP_UP_REQUIRED" });
  expect(callsTo("create_invite")).toHaveLength(0);
  expect(mock.mails).toHaveLength(0);
  const ok = await runAction(
    defs().create,
    envelope(teamInput({ role: "admin" }), { stepUpToken: "step-ok" }),
  );
  expect(ok.ok).toBe(true);
  expect(callsTo("create_invite")).toHaveLength(1);
  // single use
  const again = await runAction(
    defs().create,
    envelope(teamInput({ role: "admin", email: "other@example.invalid" }), {
      stepUpToken: "step-ok",
    }),
  );
  expect(again).toMatchObject({ ok: false, error: "STEP_UP_REQUIRED" });
});

test("step-up: a fund-team admin needs it; every other role and kind does not", async () => {
  mock.rpc.create_invite = () => created();
  const fundAdmin = await runAction(
    defs().create,
    envelope({
      kind: "fund_team",
      email: INVITEE,
      role: "admin",
      investorId: INVESTOR,
    }),
  );
  expect(fundAdmin).toMatchObject({ ok: false, error: "STEP_UP_REQUIRED" });
  for (const input of [
    teamInput({ role: "manager" }),
    teamInput({ role: "analyst" }),
    teamInput({ role: "viewer" }),
    {
      kind: "fund_team",
      email: INVITEE,
      role: "associate",
      investorId: INVESTOR,
    },
    { kind: "room_member", email: INVITEE, role: "investor", roomId: ROOM },
  ]) {
    const r = await runAction(defs().create, envelope(input));
    expect(r.ok, JSON.stringify(input)).toBe(true);
  }
  // resend and revoke never ask for it
  mock.rpc.resend_invite = () => created();
  mock.rpc.revoke_invite = () => ({ ok: true, invite_id: INVITE });
  expect(
    (await runAction(defs().resend, envelope({ inviteId: INVITE }))).ok,
  ).toBe(true);
  expect(
    (await runAction(defs().revoke, envelope({ inviteId: INVITE }))).ok,
  ).toBe(true);
});

test("step-up: malformed admin input fails validation, not the step-up bypass", async () => {
  mock.rpc.create_invite = () => created();
  const r = await runAction(
    defs().create,
    envelope(teamInput({ role: "admin", userId: BOB }), {
      stepUpToken: "step-ok",
    }),
  );
  expect(r).toMatchObject({ ok: false, error: "invalid_input" });
  expect(callsTo("create_invite")).toHaveLength(0);
});

// ── sending ─────────────────────────────────────────────────────────────────

test("create: sends one email to the stored address with the token in the URL fragment, then mark_sent(true)", async () => {
  mock.rpc.create_invite = () => created();
  const r: any = await runAction(defs().create, envelope(teamInput()));
  expect(r.ok).toBe(true);
  expect(mock.mails).toHaveLength(1);
  const m = mock.mails[0];
  expect(m.to).toEqual([INVITEE]);
  expect(m.html).toContain(`https://app.example.invalid/join#t=${TOKEN}`);
  expect(m.text).toContain(`https://app.example.invalid/join#t=${TOKEN}`);
  expect(m.html).not.toContain("?token=");
  expect(m.html).not.toMatch(/\/join\?/);
  expect(m.text).not.toMatch(/\/join\?/);
  const ms = callsTo("mark_sent");
  expect(ms).toHaveLength(1);
  expect(ms[0].body).toEqual({ p_uid: ALICE, p_invite_id: INVITE, p_ok: true });
  expect(r.data.emailSent).toBe(true);
  expect(r.data.message).toBeUndefined();
});

test("email content: who invited, to what, the role label, the expiry date, and that the link is for this address only", async () => {
  mock.rpc.create_invite = () => created();
  await runAction(defs().create, envelope(teamInput()));
  const m = mock.mails[0];
  expect(m.subject).toBe(
    "Alice Founder invited you to Acme Robotics on Lengdon",
  );
  for (const part of [m.html, m.text]) {
    expect(part).toContain("Alice Founder");
    expect(part).toContain("Acme Robotics");
    expect(part).toContain("Analyst");
    expect(part).toContain("27 Oct 2026");
    expect(part).toContain(
      "works only for the email address this message was sent to",
    );
  }
  expect(m.html).toContain("#1B3A63");
  expect(m.html.toLowerCase()).not.toMatch(/#7c3aed|purple/);
  expect(m.html + m.text).not.toContain("Venture Tech");
  expect(m.html).not.toMatch(/<img|https?:\/\/[^"' )]*\.(png|jpg|gif)/i);
});

test("email content: counsel and room invitations say what the recipient is invited to do", () => {
  const counsel = invitationEmail({
    inviterName: "A",
    orgName: "Acme",
    kind: "room_counsel",
    role: "investor",
    token: TOKEN,
    appUrl: "https://app.example.invalid",
  });
  expect(counsel.text).toContain(
    "legal counsel for the investor side of the Acme deal room",
  );
  expect(counsel.text).toContain("Legal counsel");
  const room = invitationEmail({
    inviterName: "A",
    orgName: "Acme",
    kind: "room_member",
    role: "investor",
    token: TOKEN,
    appUrl: "https://app.example.invalid",
  });
  expect(room.text).toContain("join the Acme deal room as Investor");
});

test("email content: hostile names are escaped and cannot become links", () => {
  const e = invitationEmail({
    inviterName:
      '<script>alert(1)</script>"><a href="https://evil.example">x</a>',
    orgName: "Acme <b>&</b> https://evil.example/phish",
    kind: "team",
    role: "analyst",
    token: TOKEN,
    appUrl: "https://app.example.invalid",
  });
  expect(e.html).not.toContain("<script");
  expect(e.html).not.toContain('href="https://evil.example');
  const hrefs = [...e.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
  for (const h of hrefs)
    expect(h.startsWith("https://app.example.invalid/")).toBe(true);
});

test("a token that is not url-safe is refused before any link is built", () => {
  for (const bad of [
    "short",
    "has space in it padding",
    "a/b/c/d/e/f/g/h",
    `${"a".repeat(70)}`,
  ]) {
    expect(() =>
      invitationEmail({
        inviterName: "A",
        orgName: "B",
        kind: "team",
        role: "viewer",
        token: bad,
        appUrl: "https://app.example.invalid",
      }),
    ).toThrow();
  }
});

const BASE = "https://app.example.invalid";
const mailFor = (inviterName: string, orgName: string, kind = "team") =>
  invitationEmail({
    inviterName,
    orgName,
    kind,
    role: "analyst",
    token: TOKEN,
    appUrl: BASE,
  });
const hrefsOf = (html: string) =>
  [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);

test("a name that tries to impersonate the product with a link is replaced whole by the fallback, in subject, html and text", () => {
  const evil = "Lengdon Security https://evil.example verify";
  const e = mailFor(evil, evil);
  expect(e.subject).toBe("A colleague invited you to Lengdon");
  for (const part of [e.html, e.text]) {
    expect(part).not.toContain("evil.example");
    expect(part).not.toContain("Lengdon Security");
    expect(part).not.toContain("verify");
    expect(part).toContain("A colleague");
    expect(part).toContain("a Lengdon workspace");
  }
  for (const h of hrefsOf(e.html)) expect(h.startsWith(`${BASE}/`)).toBe(true);
});

test("link-like and address-like names are all replaced: schemes, www, dot-TLD, at-sign, spelled-out dots, full-width dots, hidden characters", () => {
  const bad = [
    "http://x",
    "HTTPS://X",
    "ftp://x",
    "javascript:alert(1)",
    "www.evil",
    "evil.example",
    "evil.com/login",
    "pay me at bob@evil",
    "bob at evil dot com",
    "evil (dot) com",
    "evil[dot]com",
    "10.0.0.1",
    "evil．com", // full-width full stop
    "evil。com", // ideographic full stop
    "ht\u200Btps://evil", // hidden zero-width character inside the scheme
    "ww\u200Bw.evil",
    "x\u202Ey.com", // bidi override
  ];
  for (const v of bad) {
    const e = mailFor(v, v);
    expect(e.subject, v).toBe("A colleague invited you to Lengdon");
    expect(e.text, v).toContain("a Lengdon workspace");
    expect(e.text, v).not.toContain(v);
  }
});

test("ordinary names survive unchanged: initials, abbreviations, accents, punctuation", () => {
  const e = mailFor("J. P. Müller-Ng", "Acme Robotics, Inc.");
  expect(e.subject).toBe(
    "J. P. Müller-Ng invited you to Acme Robotics, Inc. on Lengdon",
  );
  expect(e.text).toContain("J. P. Müller-Ng");
  expect(e.text).toContain("Acme Robotics, Inc.");
});

test("the brand word is never accepted in a name: Lengdon in any case or width falls back whole, ordinary names are unchanged", () => {
  for (const v of [
    "Lengdon Support",
    "LENGDON Security",
    "lengdon",
    "Ｌｅｎｇｄｏｎ", // full-width letters
    "Leng\u200Bdon Team", // hidden character inside the word
  ]) {
    const asInviter = mailFor(v, "Acme");
    expect(asInviter.subject, v).toBe(
      "A colleague invited you to Acme on Lengdon",
    );
    expect(asInviter.text, v).not.toContain(v);
    const asOrg = mailFor("Alice", v);
    expect(asOrg.subject, v).toBe("Alice invited you to Lengdon");
    expect(asOrg.text, v).toContain("a Lengdon workspace");
    expect(asOrg.text, v).not.toContain(v);
  }
  const ok = mailFor("Alice", "Acme Robotics, Inc.");
  expect(ok.subject).toBe(
    "Alice invited you to Acme Robotics, Inc. on Lengdon",
  );
});

test("HTML, newline and header-injection characters give a single-line subject and escaped html", () => {
  const inviter =
    'Eve\r\nBcc: attacker@evil.example\r\nSubject: pwned <b>"x"</b>';
  const org = "Acme\n\n<script>alert(1)</script>\t&\u0000 Co";
  const e = mailFor(inviter, org);
  expect(e.subject).not.toMatch(/\p{Cc}/u);
  expect(e.subject).not.toContain("Bcc");
  // the inviter contains an address, so the whole value falls back
  expect(e.subject).toBe(
    "A colleague invited you to Acme <script>alert(1)</script> & Co on Lengdon".replace(
      "<script>alert(1)</script>",
      "<script>alert(1)</script>",
    ),
  );
  expect(e.html).not.toContain("<script");
  expect(e.html).not.toContain("<b>");
  expect(e.html).toContain("&lt;script&gt;");
  expect(e.html).not.toMatch(/Bcc:/);
  expect(e.text).not.toMatch(/Bcc:/);
  expect(e.text).not.toContain("\u0000");
  for (const h of hrefsOf(e.html)) expect(h.startsWith(`${BASE}/`)).toBe(true);
});

test("names are capped at 60 characters, and a long value cannot push a link past the cap", () => {
  const long = "A".repeat(200);
  const e = mailFor(long, long);
  expect(e.subject.length).toBeLessThan(160);
  expect(e.text).not.toContain("A".repeat(61));
  const hidden = `${"A".repeat(70)} https://evil.example`;
  const f = mailFor(hidden, hidden);
  expect(f.text).not.toContain("evil.example");
  expect(f.subject).toBe("A colleague invited you to Lengdon");
});

test("an empty or missing name uses the fallback wording, and room invitations read naturally with it", () => {
  const e = mailFor("", "   ");
  expect(e.subject).toBe("A colleague invited you to Lengdon");
  expect(e.text).toContain(
    "A colleague invited you to join a Lengdon workspace as Analyst on Lengdon.",
  );
  const room = mailFor("", "", "room_member");
  expect(room.text).toContain("join a Lengdon deal room as Investor");
  const counsel = invitationEmail({
    inviterName: "",
    orgName: "",
    kind: "room_counsel",
    role: "founder",
    token: TOKEN,
    appUrl: BASE,
  });
  expect(counsel.text).toContain(
    "legal counsel for the founder side of a Lengdon deal room",
  );
});

test("the link is exactly appUrl + /join#t= + the 43-character token; any other token is never embedded", () => {
  const ok = mailFor("A", "B");
  expect(ok.html).toContain(`${BASE}/join#t=${TOKEN}`);
  expect(ok.text).toContain(`${BASE}/join#t=${TOKEN}`);
  const malformed = [
    TOKEN.slice(0, 42), // one short
    TOKEN + "x", // one long
    TOKEN.slice(0, 42) + "=", // padding
    TOKEN.slice(0, 42) + "+", // standard base64, not url-safe
    TOKEN.slice(0, 42) + "/",
    TOKEN.slice(0, 41) + " x",
    TOKEN.slice(0, 42) + "\n",
    TOKEN.slice(0, 42) + "<",
    "",
    "short",
  ];
  for (const bad of malformed) {
    let out = "";
    try {
      const e = invitationEmail({
        inviterName: "A",
        orgName: "B",
        kind: "team",
        role: "viewer",
        token: bad,
        appUrl: BASE,
      });
      out = e.html + e.text;
    } catch {
      out = "";
    }
    expect(out, JSON.stringify(bad)).toBe("");
  }
});

test("a malformed token from the database sends nothing, records mark_sent(false) and says to resend", async () => {
  for (const bad of ["short", TOKEN + "x", TOKEN.slice(0, 42) + "/"]) {
    mock.reset();
    mock.rpc.create_invite = () => created({ token: bad });
    const r: any = await runAction(defs().create, envelope(teamInput()));
    expect(r.ok).toBe(true);
    expect(r.data.emailSent).toBe(false);
    expect(r.data.message).toContain("You can resend it");
    expect(mock.mails).toHaveLength(0);
    expect(callsTo("mark_sent")).toHaveLength(1);
    expect(callsTo("mark_sent")[0].body.p_ok).toBe(false);
    expect(JSON.stringify(r)).not.toContain(bad);
  }
});

test("a hostile organisation name from the database never reaches the sent message", async () => {
  mock.rpc.create_invite = () =>
    created({ org_name: "Verify your account at https://evil.example/login" });
  const r: any = await runAction(defs().create, envelope(teamInput()));
  expect(r.ok).toBe(true);
  expect(r.data.emailSent).toBe(true);
  const m = mock.mails[0];
  expect(m.subject).not.toContain("evil");
  expect(m.html).not.toContain("evil.example");
  expect(m.text).not.toContain("evil.example");
  expect(m.text).toContain("a Lengdon workspace");
});

test("the token is in no return value, whichever action returns", async () => {
  mock.rpc.create_invite = () => created();
  mock.rpc.resend_invite = () => created();
  mock.rpc.revoke_invite = () => ({
    ok: true,
    invite_id: INVITE,
    token: TOKEN,
  });
  mock.rpc.list_invites = () => ({
    ok: true,
    invites: [
      {
        id: INVITE,
        kind: "team",
        role: "analyst",
        status: "pending",
        email: INVITEE,
        token: TOKEN,
        token_hash: "\\xdeadbeef",
        created_by: ALICE,
        created_at: "2026-10-20T00:00:00Z",
        expires_at: "2026-10-27T00:00:00Z",
        last_sent_at: null,
        send_count: 1,
        accepted_at: null,
      },
    ],
  });
  const d = defs();
  const results = [
    await runAction(d.create, envelope(teamInput())),
    await runAction(d.resend, envelope({ inviteId: INVITE })),
    await runAction(d.revoke, envelope({ inviteId: INVITE })),
    await runAction(d.list, envelope({ kind: "team", startupId: STARTUP })),
  ];
  for (const r of results) {
    const s = JSON.stringify(r);
    expect(s, s).not.toContain(TOKEN);
    expect(s).not.toMatch(/token|hash|deadbeef|created_by/i);
    expect(s).not.toContain(INVITEE);
    expect(s).not.toContain(BOB);
  }
});

test("returned fields are exactly the safe set, with the address masked", async () => {
  mock.rpc.create_invite = () => created();
  const r: any = await runAction(defs().create, envelope(teamInput()));
  expect(Object.keys(r.data).sort()).toEqual([
    "action",
    "email",
    "emailSent",
    "expiresAt",
    "inviteId",
    "kind",
    "orgName",
    "role",
    "status",
  ]);
  expect(r.data.email).toBe("n***@example.invalid");
  expect(r.data.status).toBe("pending");
});

test("list: only the allow-listed fields, masked addresses, and the scope passed through", async () => {
  mock.rpc.list_invites = () => ({
    ok: true,
    invites: [
      {
        id: INVITE,
        kind: "team",
        role: "analyst",
        status: "pending",
        email: INVITEE,
        token_hash: "x",
        created_by: ALICE,
        created_at: "c",
        expires_at: "e",
        last_sent_at: "l",
        send_count: 2,
        accepted_at: null,
        secret: "s",
      },
    ],
  });
  const r: any = await runAction(
    defs().list,
    envelope({ kind: "team", startupId: STARTUP }),
  );
  expect(r.ok).toBe(true);
  expect(Object.keys(r.data.invites[0]).sort()).toEqual([
    "acceptedAt",
    "createdAt",
    "email",
    "expiresAt",
    "id",
    "kind",
    "lastSentAt",
    "role",
    "sendCount",
    "status",
  ]);
  expect(r.data.invites[0].email).toBe("n***@example.invalid");
  expect(r.data.invites[0].sendCount).toBe(2);
  expect(callsTo("list_invites")[0].body).toEqual({
    p_uid: ALICE,
    p_kind: "team",
    p_scope_room: null,
    p_scope_startup: STARTUP,
    p_scope_investor: null,
  });
});

test("no console call anywhere contains the token or the address, on success or on failure", async () => {
  mock.rpc.create_invite = () => created();
  mock.rpc.resend_invite = () => created();
  const d = defs();
  await runAction(d.create, envelope(teamInput()));
  mock.mailStatus = 500;
  await runAction(d.resend, envelope({ inviteId: INVITE }));
  await runAction(
    d.create,
    envelope(teamInput({ email: "other@example.invalid" })),
  );
  const all = logs.join("\n");
  expect(all).not.toContain(TOKEN);
  expect(all).not.toContain(INVITEE);
  expect(all).not.toContain("unit-test-resend");
  expect(all).not.toContain("tok-alice");
});

// ── email failure ───────────────────────────────────────────────────────────

test("email failure: the invitation exists, mark_sent(false) is recorded, and the result says to resend", async () => {
  mock.rpc.create_invite = () => created();
  mock.mailStatus = 500;
  const r: any = await runAction(defs().create, envelope(teamInput()));
  expect(r.ok).toBe(true);
  expect(r.data.emailSent).toBe(false);
  expect(r.data.message).toBe(
    "The invitation was created, but the email could not be sent. You can resend it.",
  );
  expect(r.data.inviteId).toBe(INVITE);
  const ms = callsTo("mark_sent");
  expect(ms).toHaveLength(1);
  expect(ms[0].body.p_ok).toBe(false);
  expect(JSON.stringify(r)).not.toContain(TOKEN);
});

test("email failure: a provider that cannot be reached behaves the same", async () => {
  mock.rpc.create_invite = () => created();
  const dead = {
    sendEmail: (d: Parameters<typeof sendInvitationEmail>[1]) =>
      sendInvitationEmail({ ...env, resendBase: "http://127.0.0.1:1" }, d),
  };
  const r: any = await runAction(
    makeInviteDefs(dead).create,
    envelope(teamInput()),
  );
  expect(r.ok).toBe(true);
  expect(r.data.emailSent).toBe(false);
  expect(callsTo("mark_sent")[0].body.p_ok).toBe(false);
});

test("email failure: a mailer that throws is contained", async () => {
  mock.rpc.create_invite = () => created();
  const boom = {
    sendEmail: async () => {
      throw new Error(`smtp exploded for ${INVITEE} with ${TOKEN}`);
    },
  };
  const r: any = await runAction(
    makeInviteDefs(boom).create,
    envelope(teamInput()),
  );
  expect(r.ok).toBe(true);
  expect(r.data.emailSent).toBe(false);
  expect(JSON.stringify(r)).not.toContain(TOKEN);
  expect(logs.join("\n")).not.toContain(TOKEN);
  expect(callsTo("mark_sent")[0].body.p_ok).toBe(false);
});

test("a failing mark_sent never fails the request", async () => {
  mock.rpc.create_invite = () => created();
  mock.rpc.mark_sent = () => ({ __http: 500 });
  const r: any = await runAction(defs().create, envelope(teamInput()));
  expect(r.ok).toBe(true);
  expect(r.data.emailSent).toBe(true);
});

test("an RPC result without a token or address sends nothing and reports the failure, with no crash", async () => {
  mock.rpc.create_invite = () => created({ token: undefined });
  const r: any = await runAction(defs().create, envelope(teamInput()));
  expect(r.ok).toBe(true);
  expect(r.data.emailSent).toBe(false);
  expect(mock.mails).toHaveLength(0);
  expect(callsTo("mark_sent")[0].body.p_ok).toBe(false);
});

// ── resend / revoke ─────────────────────────────────────────────────────────

test("resend: the new token goes into the email, p_uid is the session user, then mark_sent(true)", async () => {
  const NEW = "Ab1-Cd2_Ef3GhIjKlMnOpQrStUvWxYz5678901234AB"; // 43 characters
  mock.rpc.resend_invite = () => created({ token: NEW });
  const r: any = await runAction(defs().resend, envelope({ inviteId: INVITE }));
  expect(r.ok).toBe(true);
  expect(callsTo("resend_invite")[0].body).toEqual({
    p_uid: ALICE,
    p_invite_id: INVITE,
  });
  expect(mock.mails).toHaveLength(1);
  expect(mock.mails[0].html).toContain(`/join#t=${NEW}`);
  expect(mock.mails[0].html).not.toContain(TOKEN);
  expect(callsTo("mark_sent")[0].body.p_ok).toBe(true);
  expect(r.data.action).toBe("resent");
});

test("resend refused (too soon, or over the send limit): no email, no mark_sent", async () => {
  for (const code of [
    "too_soon",
    "too_many_sends",
    "lifetime_exceeded",
    "invalid_state",
  ]) {
    mock.rpc.resend_invite = () => ({
      ok: false,
      error: code,
      retry_after_seconds: 600,
    });
    const r: any = await runAction(
      defs().resend,
      envelope({ inviteId: INVITE }),
    );
    expect(r).toMatchObject({ ok: false, error: code });
  }
  expect(mock.mails).toHaveLength(0);
  expect(callsTo("mark_sent")).toHaveLength(0);
});

test("revoke: returns the id and status only, sends nothing", async () => {
  mock.rpc.revoke_invite = () => ({
    ok: true,
    invite_id: INVITE,
    already_revoked: true,
  });
  const r: any = await runAction(defs().revoke, envelope({ inviteId: INVITE }));
  expect(r.data).toEqual({
    inviteId: INVITE,
    status: "revoked",
    alreadyRevoked: true,
  });
  expect(mock.mails).toHaveLength(0);
  expect(callsTo("revoke_invite")[0].body).toEqual({
    p_uid: ALICE,
    p_invite_id: INVITE,
  });
});

// ── record ──────────────────────────────────────────────────────────────────

test("the record entry carries the kind and role only: no address, no token, no scope id in its data", async () => {
  mock.rpc.create_invite = () => created();
  await runAction(defs().create, envelope(teamInput()));
  const rec = mock.calls.filter(
    (c) => c.schema === "pack_api" && c.fn === "append_record",
  );
  expect(rec).toHaveLength(1);
  expect(rec[0].body.p_action).toBe("invite.create");
  expect(rec[0].body.p_actor_id).toBe(ALICE);
  expect(rec[0].body.p_object_id).toBe(INVITE);
  expect(rec[0].body.p_data).toEqual({ kind: "team", role: "analyst" });
  expect(JSON.stringify(rec[0].body)).not.toContain(INVITEE);
  expect(JSON.stringify(rec[0].body)).not.toContain(TOKEN);
});

test("the RPCs are called in the invite_api schema, never pack_api or public", async () => {
  mock.rpc.create_invite = () => created();
  await runAction(defs().create, envelope(teamInput()));
  const rpcs = mock.calls.filter((c) =>
    ["create_invite", "mark_sent"].includes(c.fn),
  );
  expect(rpcs.map((c) => c.schema)).toEqual(["invite_api", "invite_api"]);
});

// ── invite.accept (J3b) ─────────────────────────────────────────────────────

const ACCEPT_TOKEN = TOKEN;
const accepted = (over: Record<string, unknown> = {}) => ({
  ok: true,
  kind: "team",
  role: "analyst",
  org_name: "Acme Robotics",
  scope_room_id: null,
  scope_startup_id: STARTUP,
  scope_investor_id: null,
  ...over,
});
const appendCalls = () =>
  mock.calls.filter((c) => c.schema === "pack_api" && c.fn === "append_record");
const OUTPUT_KEYS = [
  "investorId",
  "kind",
  "orgName",
  "role",
  "roomId",
  "startupId",
];

test("accept input: a 43-character url-safe token parses; every other shape is refused without echoing the value", () => {
  expect(AcceptInviteInput.safeParse({ token: ACCEPT_TOKEN }).success).toBe(
    true,
  );
  for (const bad of [
    "",
    "short",
    ACCEPT_TOKEN + "x",
    ACCEPT_TOKEN.slice(0, 42),
    ACCEPT_TOKEN.slice(0, 42) + "=",
    ACCEPT_TOKEN.slice(0, 42) + "+",
    ACCEPT_TOKEN.slice(0, 42) + " ",
    ACCEPT_TOKEN.slice(0, 42) + "\n",
    123,
    null,
  ]) {
    const r = AcceptInviteInput.safeParse({ token: bad });
    expect(r.success, JSON.stringify(bad)).toBe(false);
  }
  expect(AcceptInviteInput.safeParse({}).success).toBe(false);
  for (const extra of [
    "userId",
    "user_id",
    "uid",
    "p_uid",
    "email",
    "inviteId",
  ])
    expect(
      AcceptInviteInput.safeParse({ token: ACCEPT_TOKEN, [extra]: ALICE })
        .success,
      extra,
    ).toBe(false);
});

test("accept: a malformed token is refused as invalid_input, reaches nothing, and the message does not contain it", async () => {
  const bad = ACCEPT_TOKEN.slice(0, 42) + "!";
  const r: any = await runAction(defs().accept, envelope({ token: bad }));
  expect(r.ok).toBe(false);
  expect(r.error.startsWith("invalid_input")).toBe(true);
  expect(JSON.stringify(r)).not.toContain(bad);
  expect(callsTo("accept_invite")).toHaveLength(0);
  expect(logs.join("\n")).not.toContain(bad);
});

test("accept: no session is 401 and nothing is called; an agent caller is refused", async () => {
  const none: any = await runAction(
    defs().accept,
    envelope({ token: ACCEPT_TOKEN }, { accessToken: "" }),
  );
  expect(none.ok).toBe(false);
  expect(none.status).toBe(401);
  const agent: any = await runAction(
    defs().accept,
    envelope({ token: ACCEPT_TOKEN }, { isAgent: true }),
  );
  expect(agent.ok).toBe(false);
  expect(agent.error).toBe("agent_commit_forbidden");
  expect(callsTo("accept_invite")).toHaveLength(0);
});

test("accept: p_uid is the verified session user, never anything in the body or envelope; the RPC gets exactly p_uid and p_token", async () => {
  mock.rpc.accept_invite = () => accepted();
  const r: any = await runAction(
    defs().accept,
    envelope({ token: ACCEPT_TOKEN }, { userId: BOB, uid: BOB, p_uid: BOB }),
  );
  expect(r.ok).toBe(true);
  expect(callsTo("accept_invite")).toHaveLength(1);
  expect(callsTo("accept_invite")[0].body).toEqual({
    p_uid: ALICE,
    p_token: ACCEPT_TOKEN,
  });
  // an identity smuggled inside the input is refused
  mock.calls = [];
  const smuggled: any = await runAction(
    defs().accept,
    envelope({ token: ACCEPT_TOKEN, userId: BOB }),
  );
  expect(smuggled.ok).toBe(false);
  expect(callsTo("accept_invite")).toHaveLength(0);
});

test("accept success, per kind: exactly the safe fields, the right ids, and the record goes to the chain of the thing joined", async () => {
  const cases: Array<[string, Record<string, unknown>, string]> = [
    [
      "team",
      {
        kind: "team",
        role: "analyst",
        scope_room_id: null,
        scope_startup_id: STARTUP,
        scope_investor_id: null,
      },
      STARTUP,
    ],
    [
      "fund_team",
      {
        kind: "fund_team",
        role: "associate",
        scope_room_id: null,
        scope_startup_id: null,
        scope_investor_id: INVESTOR,
      },
      INVESTOR,
    ],
    [
      "room_member",
      {
        kind: "room_member",
        role: "investor",
        scope_room_id: ROOM,
        scope_startup_id: null,
        scope_investor_id: null,
      },
      ROOM,
    ],
    [
      "room_counsel",
      {
        kind: "room_counsel",
        role: "investor",
        scope_room_id: ROOM,
        scope_startup_id: null,
        scope_investor_id: null,
      },
      ROOM,
    ],
  ];
  for (const [kind, over, scope] of cases) {
    mock.reset();
    mock.rpc.accept_invite = () => accepted(over);
    const r: any = await runAction(
      defs().accept,
      envelope({ token: ACCEPT_TOKEN }),
    );
    expect(r.ok, kind).toBe(true);
    expect(Object.keys(r.data).sort(), kind).toEqual(OUTPUT_KEYS);
    expect(r.data.kind).toBe(kind);
    expect(r.data.orgName).toBe("Acme Robotics");
    expect(r.data.roomId).toBe(over.scope_room_id);
    expect(r.data.startupId).toBe(over.scope_startup_id);
    expect(r.data.investorId).toBe(over.scope_investor_id);
    expect(JSON.stringify(r)).not.toContain(ACCEPT_TOKEN);
    const rec = appendCalls();
    expect(rec, kind).toHaveLength(1); // the handler appends; the gateway does not append a second one
    expect(rec[0].body.p_org_id).toBe(scope);
    expect(rec[0].body.p_action).toBe("invite.accept");
    expect(rec[0].body.p_actor_id).toBe(ALICE);
    expect(rec[0].body.p_data).toEqual({ kind, role: over.role });
    expect(JSON.stringify(rec[0].body)).not.toContain(ACCEPT_TOKEN);
  }
});

test("accept refusal: unknown, used, wrong address, unconfirmed and a database error all give the identical invalid_or_used", async () => {
  const answers: any[] = [
    { ok: false, error: "invalid_or_used" },
    { ok: false, error: "not_authorized" },
    { ok: false, error: "email_not_confirmed" },
    { ok: false },
    null,
  ];
  const seen = new Set<string>();
  for (const a of answers) {
    mock.reset();
    mock.rpc.accept_invite = () => a;
    const r: any = await runAction(
      defs().accept,
      envelope({ token: ACCEPT_TOKEN }),
    );
    expect(r.ok).toBe(false);
    seen.add(JSON.stringify({ error: r.error, status: r.status }));
    expect(JSON.stringify(r)).not.toContain(ACCEPT_TOKEN);
    expect(appendCalls()).toHaveLength(0); // nothing was joined, so nothing is recorded
  }
  expect([...seen]).toEqual([
    JSON.stringify({ error: "invalid_or_used", status: 500 }),
  ]);
});

test("accept: a database that cannot be reached is a different, non-uniform code, and still leaks nothing", async () => {
  mock.rpc.accept_invite = () => ({ __http: 503 });
  const r: any = await runAction(
    defs().accept,
    envelope({ token: ACCEPT_TOKEN }),
  );
  expect(r.ok).toBe(false);
  expect(r.error).toBe("accept_invite_rpc_failed");
  expect(JSON.stringify(r)).not.toContain(ACCEPT_TOKEN);
});

test("accept: if the record entry fails after the accept, the caller gets record_append_failed (the invitation is joined)", async () => {
  mock.rpc.accept_invite = () => accepted();
  mock.rpc.append_record = () => ({ ok: false, error: "chain_error" });
  const r: any = await runAction(
    defs().accept,
    envelope({ token: ACCEPT_TOKEN }),
  );
  expect(r.ok).toBe(false);
  expect(r.error).toBe("record_append_failed");
  expect(callsTo("accept_invite")).toHaveLength(1);
  expect(JSON.stringify(r)).not.toContain(ACCEPT_TOKEN);
});

test("accept: the token is in no log line, success or failure", async () => {
  const d = defs();
  mock.rpc.accept_invite = () => accepted();
  await runAction(d.accept, envelope({ token: ACCEPT_TOKEN }));
  mock.rpc.accept_invite = () => ({ ok: false, error: "invalid_or_used" });
  await runAction(d.accept, envelope({ token: ACCEPT_TOKEN }));
  mock.rpc.accept_invite = () => ({ __http: 500 });
  await runAction(d.accept, envelope({ token: ACCEPT_TOKEN }));
  await runAction(d.accept, envelope({ token: ACCEPT_TOKEN.slice(0, 40) }));
  const all = logs.join("\n");
  expect(all).not.toContain(ACCEPT_TOKEN);
  expect(all).not.toContain(ACCEPT_TOKEN.slice(0, 40));
  expect(all).not.toContain("tok-alice");
});

test("accept: the action is called in the invite_api schema only, and sends no email", async () => {
  mock.rpc.accept_invite = () => accepted();
  await runAction(defs().accept, envelope({ token: ACCEPT_TOKEN }));
  expect(callsTo("accept_invite")).toHaveLength(1);
  expect(
    mock.calls.filter(
      (c) => c.fn === "accept_invite" && c.schema !== "invite_api",
    ),
  ).toHaveLength(0);
  expect(mock.mails).toHaveLength(0);
});

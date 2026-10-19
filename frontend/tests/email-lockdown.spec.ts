/* eslint-disable @typescript-eslint/no-explicit-any -- test harness loads server modules dynamically and inspects untyped JSON */
// Email and CRM lockdown (CLAUDE.md §20.23). Runs the policy-checked handlers against local mock providers
// (tests/support/mock-providers.ts) that count every call, so each case can assert both the answer and whether a
// provider was called. Self-contained: it starts its own loopback server and never touches a real network.
import { test, expect } from "@playwright/test";
import {
  startMock,
  ALICE,
  BOB,
  ROOM,
  OWN_TEAM_TOKEN,
  FOREIGN_TEAM_TOKEN,
  OWN_LAWYER_TOKEN,
  FOREIGN_LAWYER_TOKEN,
  INVITEE,
  LAWYER,
  type Mock,
} from "./support/mock-providers";
import {
  welcomeEmailHandler,
  ndaSignedEmailHandler,
  documentUploadedEmailHandler,
  startupTeamInviteHandler,
  lawyerInviteHandler,
  dealRoomInviteHandler,
  waitlistFormHandler,
  contactFormHandler,
  demoFormHandler,
  syncOwnContactHandler,
  type Deps,
} from "../src/lib/email/handlers";
import {
  resolveIdentity,
  type SessionIdentity,
} from "../src/lib/require-user-fn";
import {
  HUBSPOT_ALLOWED_PROPERTIES,
  LIMITS,
  MAX_BULK_SYNC_USERS,
  checkInviteSendable,
  cleanText,
  escapeHtml,
  hasOnlyKeys,
  isUuid,
  isValidEmail,
  parseBulkSyncInput,
  parseContactInput,
  parseDemoInput,
  parseWaitlistInput,
  requireMemberAddresses,
  sanitizeHubspotProps,
  selectMemberRecipients,
} from "../src/lib/email/policy";
import { safeBase } from "../src/lib/email/server-env";

let mock: Mock;
let deps: Deps;
const alice: SessionIdentity = {
  uid: ALICE.id,
  email: ALICE.email,
  emailConfirmed: true,
  fullName: "Alice",
};
const carol: SessionIdentity = {
  uid: "77777777-7777-4777-8777-777777777777",
  email: "carol@example.invalid",
  emailConfirmed: true,
  fullName: "Carol",
};

test.beforeAll(async () => {
  mock = await startMock();
  deps = {
    env: {
      supabaseUrl: mock.baseUrl,
      serviceKey: "unit-test-service",
      anonKey: "unit-test-anon",
      resendBase: mock.baseUrl,
      resendKey: "unit-test-resend",
      hubspotBase: mock.baseUrl,
      hubspotToken: "unit-test-hubspot",
      notionBase: mock.baseUrl,
      notionKey: "unit-test-notion",
      appUrl: "https://app.example.invalid",
    },
  };
});
test.afterAll(async () => {
  await mock.close();
});
test.beforeEach(() => mock.reset());

// ── Identity ─────────────────────────────────────────────────────────────────────────────────────────

test("identity: no token is not_authenticated and the auth server is never asked", async () => {
  const cfg = { url: mock.baseUrl, key: "k" };
  expect(await resolveIdentity(cfg, undefined)).toEqual({
    ok: false,
    error: "not_authenticated",
  });
  expect(await resolveIdentity(cfg, "")).toEqual({
    ok: false,
    error: "not_authenticated",
  });
  expect(mock.hits.auth).toBe(0);
});

test("identity: a bad token is refused, a good token returns the session's own email", async () => {
  const cfg = { url: mock.baseUrl, key: "k" };
  expect(await resolveIdentity(cfg, "tok-nobody")).toEqual({
    ok: false,
    error: "not_authenticated",
  });
  const ok = await resolveIdentity(cfg, "tok-alice");
  expect(ok.ok && ok.identity.email).toBe(ALICE.email);
  expect(ok.ok && ok.identity.emailConfirmed).toBe(true);
});

// ── A: welcome email ─────────────────────────────────────────────────────────────────────────────────

test("A welcome: own address, provider called once, to that address only", async () => {
  const r = await welcomeEmailHandler(deps, alice, {});
  expect(r).toMatchObject({ ok: true, sent: true });
  expect(mock.hits.resend).toBe(1);
  expect(mock.hits.sentTo).toEqual([ALICE.email]);
});

test("A welcome: a recipient in the request is refused and nothing is sent", async () => {
  const r = await welcomeEmailHandler(deps, alice, {
    email: "foreign@example.invalid",
  });
  expect(r).toEqual({ ok: false, error: "invalid_input" });
  expect(mock.hits.resend).toBe(0);
});

test("A welcome: sent once per account, a second call sends nothing", async () => {
  await welcomeEmailHandler(deps, alice, {});
  const again = await welcomeEmailHandler(deps, alice, {});
  expect(again).toMatchObject({
    ok: true,
    sent: false,
    reason: "already_sent",
  });
  expect(mock.hits.resend).toBe(1);
});

test("A welcome: an unconfirmed address gets nothing", async () => {
  const r = await welcomeEmailHandler(
    deps,
    { ...alice, emailConfirmed: false },
    {},
  );
  expect(r).toEqual({ ok: false, error: "email_not_confirmed" });
  expect(mock.hits.resend).toBe(0);
});

// ── B: members only ──────────────────────────────────────────────────────────────────────────────────

test("B nda: the investor member notifies the room's founder, nobody else", async () => {
  const r = await ndaSignedEmailHandler(deps, alice, { dealRoomId: ROOM });
  expect(r).toMatchObject({ ok: true, sent: 1 });
  expect(mock.hits.sentTo).toEqual([BOB.email]);
});

test("B nda: a caller who is not a member gets not_found and nothing is sent", async () => {
  const r = await ndaSignedEmailHandler(deps, carol, { dealRoomId: ROOM });
  expect(r).toEqual({ ok: false, error: "not_found" });
  expect(mock.hits.resend).toBe(0);
});

test("B nda: a request cannot add a recipient", async () => {
  const r = await ndaSignedEmailHandler(deps, alice, {
    dealRoomId: ROOM,
    to: "foreign@example.invalid",
  });
  expect(r).toEqual({ ok: false, error: "invalid_input" });
  expect(mock.hits.resend).toBe(0);
});

test("B nda: repeated calls within the interval send once", async () => {
  await ndaSignedEmailHandler(deps, alice, { dealRoomId: ROOM });
  const again = await ndaSignedEmailHandler(deps, alice, { dealRoomId: ROOM });
  expect(again).toMatchObject({ ok: true, sent: 0, reason: "too_soon" });
  expect(mock.hits.resend).toBe(1);
});

test("B document: members are told, a non-member is refused, an oversize name is refused", async () => {
  const ok = await documentUploadedEmailHandler(
    deps,
    { ...alice, uid: BOB.id, email: BOB.email },
    { dealRoomId: ROOM, documentName: "Deck.pdf" },
  );
  expect(ok).toMatchObject({ ok: true, sent: 1 });
  expect(mock.hits.sentTo).toEqual([ALICE.email]);
  mock.reset();
  expect(
    await documentUploadedEmailHandler(deps, carol, {
      dealRoomId: ROOM,
      documentName: "Deck.pdf",
    }),
  ).toEqual({ ok: false, error: "not_found" });
  expect(
    await documentUploadedEmailHandler(deps, alice, {
      dealRoomId: ROOM,
      documentName: "x".repeat(LIMITS.documentName + 1),
    }),
  ).toEqual({ ok: false, error: "invalid_input" });
  expect(mock.hits.resend).toBe(0);
});

test("B reports and updates: an address that is not a member is refused", () => {
  const members = [
    { user_id: ALICE.id, role: "investor", email: ALICE.email },
    { user_id: BOB.id, role: "founder", email: BOB.email },
  ];
  expect(requireMemberAddresses([BOB.email], members)).toMatchObject({
    ok: true,
  });
  expect(
    requireMemberAddresses([BOB.email, "stranger@example.invalid"], members),
  ).toEqual({ ok: false, error: "recipient_not_member" });
  expect(
    requireMemberAddresses([BOB.email.toUpperCase()], members),
  ).toMatchObject({ ok: true });
  expect(requireMemberAddresses([""], members)).toEqual({
    ok: false,
    error: "recipient_not_member",
  });
});

test("B recipients: members only, never the sender, optional role filter", () => {
  const members = [
    { user_id: "u1", role: "founder", email: "a@example.invalid" },
    { user_id: "u2", role: "investor", email: "b@example.invalid" },
    { user_id: "u3", role: "investor", email: null },
    { user_id: "u4", role: "lawyer", email: "not an address" },
  ];
  expect(
    selectMemberRecipients(members, { excludeUserId: "u1" }).map(
      (m) => m.user_id,
    ),
  ).toEqual(["u2"]);
  expect(
    selectMemberRecipients(members, { roles: ["founder"] }).map(
      (m) => m.user_id,
    ),
  ).toEqual(["u1"]);
});

// ── E: invites ───────────────────────────────────────────────────────────────────────────────────────

test("E team invite: the creator sends to the address on the record, once", async () => {
  const r = await startupTeamInviteHandler(deps, alice, {
    token: OWN_TEAM_TOKEN,
  });
  expect(r).toMatchObject({ ok: true, sent: true });
  expect(mock.hits.sentTo).toEqual([INVITEE]);
  const again = await startupTeamInviteHandler(deps, alice, {
    token: OWN_TEAM_TOKEN,
  });
  expect(again).toEqual({ ok: false, error: "too_soon" });
  expect(mock.hits.resend).toBe(1);
});

test("E team invite: a record the caller did not create is not_found and nothing is sent", async () => {
  expect(
    await startupTeamInviteHandler(deps, alice, { token: FOREIGN_TEAM_TOKEN }),
  ).toEqual({ ok: false, error: "not_found" });
  expect(
    await startupTeamInviteHandler(deps, alice, {
      token: "55555555-5555-4555-8555-000000000000",
    }),
  ).toEqual({ ok: false, error: "not_found" });
  expect(mock.hits.resend).toBe(0);
});

test("E team invite: a recipient or a malformed token in the request is refused", async () => {
  expect(
    await startupTeamInviteHandler(deps, alice, {
      token: OWN_TEAM_TOKEN,
      to: "foreign@example.invalid",
    }),
  ).toEqual({ ok: false, error: "invalid_input" });
  expect(
    await startupTeamInviteHandler(deps, alice, { token: "x&select=*" }),
  ).toEqual({ ok: false, error: "invalid_input" });
  expect(mock.hits.resend).toBe(0);
});

test("E lawyer invite: same rules", async () => {
  expect(
    await lawyerInviteHandler(deps, alice, { token: FOREIGN_LAWYER_TOKEN }),
  ).toEqual({ ok: false, error: "not_found" });
  expect(
    await lawyerInviteHandler(deps, carol, { token: OWN_LAWYER_TOKEN }),
  ).toEqual({ ok: false, error: "not_found" });
  expect(mock.hits.resend).toBe(0);
  expect(
    await lawyerInviteHandler(deps, alice, { token: OWN_LAWYER_TOKEN }),
  ).toMatchObject({ ok: true, sent: true });
  expect(mock.hits.sentTo).toEqual([LAWYER]);
});

test("E deal-room invite: goes to the stored record's address; refused by row-level security means nothing sent", async () => {
  const ok = await dealRoomInviteHandler(deps, alice, "tok-alice", {
    dealRoomId: ROOM,
    email: "New.Person@Example.invalid",
    role: "investor",
  });
  expect(ok).toMatchObject({ ok: true, emailSent: true });
  expect(mock.hits.sentTo).toEqual(["new.person@example.invalid"]);
  mock.reset();
  const refused = await dealRoomInviteHandler(
    deps,
    { ...alice, uid: BOB.id },
    "tok-bob",
    { dealRoomId: ROOM, email: "x@example.invalid" },
  );
  expect(refused).toEqual({ ok: false, error: "not_found" });
  expect(mock.hits.resend).toBe(0);
});

test("E deal-room invite: unknown fields (including a Supabase URL) and bad input are refused", async () => {
  const bad = [
    {
      dealRoomId: ROOM,
      email: "x@example.invalid",
      supabaseUrl: "https://evil.invalid",
    },
    { dealRoomId: ROOM, email: "not-an-address" },
    { dealRoomId: "nope", email: "x@example.invalid" },
    { dealRoomId: ROOM, email: "x@example.invalid", role: "admin" },
    {
      dealRoomId: ROOM,
      email: "x@example.invalid",
      message: "m".repeat(LIMITS.inviteMessage + 1),
    },
  ];
  for (const raw of bad)
    expect(await dealRoomInviteHandler(deps, alice, "tok-alice", raw)).toEqual({
      ok: false,
      error: "invalid_input",
    });
  expect(mock.hits.resend).toBe(0);
});

test("E invite record rules: creator only, open, unexpired, minimum interval", () => {
  const now = Date.parse("2026-10-19T12:00:00Z");
  const rec = {
    invited_by: "u1",
    email: "a@example.invalid",
    accepted_at: null,
    expires_at: "2099-01-01T00:00:00Z",
  };
  expect(checkInviteSendable(rec, "u1", null, now)).toEqual({ ok: true });
  expect(checkInviteSendable(rec, "u2", null, now)).toEqual({
    ok: false,
    error: "not_found",
  });
  expect(checkInviteSendable(null, "u1", null, now)).toEqual({
    ok: false,
    error: "not_found",
  });
  expect(
    checkInviteSendable(
      { ...rec, accepted_at: "2026-01-01T00:00:00Z" },
      "u1",
      null,
      now,
    ),
  ).toEqual({ ok: false, error: "invite_closed" });
  expect(
    checkInviteSendable(
      { ...rec, expires_at: "2020-01-01T00:00:00Z" },
      "u1",
      null,
      now,
    ),
  ).toEqual({ ok: false, error: "invite_closed" });
  expect(
    checkInviteSendable(rec, "u1", new Date(now - 60_000).toISOString(), now),
  ).toEqual({ ok: false, error: "too_soon" });
  expect(
    checkInviteSendable(
      rec,
      "u1",
      new Date(now - 11 * 60_000).toISOString(),
      now,
    ),
  ).toEqual({ ok: true });
  expect(
    checkInviteSendable({ ...rec, email: "bad" }, "u1", null, now),
  ).toEqual({ ok: false, error: "not_found" });
});

// ── C: public forms ──────────────────────────────────────────────────────────────────────────────────

test("C waitlist: valid input reaches HubSpot and Notion once each, with only allow-listed properties", async () => {
  const r = await waitlistFormHandler(deps, {
    email: "Visitor@Example.invalid",
    name: "Vi Sitor",
    role: "founder",
    source: "popup",
  });
  expect(r).toEqual({ ok: true });
  expect(mock.hits.hubspot).toBeGreaterThan(0);
  expect(mock.hits.notion).toBe(1);
  expect(mock.hits.resend).toBe(0);
  const props = Object.keys(mock.hits.hubspotBodies[0].properties).filter(
    (k) => k !== "email" && k !== "hubspot_owner_id",
  );
  for (const k of props) expect(HUBSPOT_ALLOWED_PROPERTIES.has(k)).toBe(true);
  expect(mock.hits.hubspotBodies[0].properties.email).toBe(
    "visitor@example.invalid",
  );
});

test("C public forms: unknown fields, a property map and oversize input are refused and nothing is written", async () => {
  const refused = [
    () =>
      waitlistFormHandler(deps, {
        email: "v@example.invalid",
        source: "popup",
        properties: { lifecyclestage: "customer" },
      }),
    () =>
      waitlistFormHandler(deps, {
        email: "v@example.invalid",
        source: "somewhere else",
      }),
    () =>
      waitlistFormHandler(deps, {
        email: "v@example.invalid",
        name: "n".repeat(LIMITS.name + 1),
        source: "popup",
      }),
    () =>
      waitlistFormHandler(deps, {
        email: "a".repeat(250) + "@example.invalid",
        source: "popup",
      }),
    () =>
      contactFormHandler(deps, {
        email: "v@example.invalid",
        name: "V",
        reason: "General",
        message: "m".repeat(LIMITS.message + 1),
      }),
    () =>
      contactFormHandler(deps, {
        email: "v@example.invalid",
        name: "V",
        reason: "General",
        message: "ok",
        hubspot_owner_id: "1",
      }),
    () =>
      demoFormHandler(deps, {
        email: "v@example.invalid",
        name: "V",
        slot: "Midnight",
      }),
    () =>
      demoFormHandler(deps, {
        email: "v@example.invalid",
        name: "V",
        slot: "Morning (Gulf time)",
        extra: 1,
      }),
  ];
  for (const run of refused)
    expect(await run()).toEqual({ ok: false, error: "invalid_input" });
  expect(mock.hits.hubspot + mock.hits.notion + mock.hits.resend).toBe(0);
});

test("C contact and demo: valid input reaches HubSpot only", async () => {
  expect(
    await contactFormHandler(deps, {
      email: "v@example.invalid",
      name: "V Person",
      company: "Co",
      reason: "General",
      message: "Hello",
    }),
  ).toEqual({ ok: true });
  expect(
    await demoFormHandler(deps, {
      email: "v@example.invalid",
      name: "V Person",
      company: "Co",
      slot: "Morning (Gulf time)",
    }),
  ).toEqual({ ok: true });
  expect(mock.hits.notion).toBe(0);
  expect(mock.hits.resend).toBe(0);
  for (const b of mock.hits.hubspotBodies)
    for (const k of Object.keys(b.properties))
      expect(
        HUBSPOT_ALLOWED_PROPERTIES.has(k) ||
          k === "email" ||
          k === "hubspot_owner_id",
      ).toBe(true);
});

// ── A: a signed-in user's own CRM contact ────────────────────────────────────────────────────────────

test("A own contact: writes the session's own address; an address or property in the request is refused", async () => {
  expect(
    await syncOwnContactHandler(deps, alice, { kind: "account_created" }),
  ).toEqual({ ok: true });
  expect(mock.hits.hubspotBodies[0].properties.email).toBe(ALICE.email);
  mock.reset();
  expect(
    await syncOwnContactHandler(deps, alice, {
      kind: "account_created",
      email: "foreign@example.invalid",
    }),
  ).toEqual({ ok: false, error: "invalid_input" });
  expect(
    await syncOwnContactHandler(deps, alice, {
      kind: "account_created",
      properties: { lifecyclestage: "customer" },
    }),
  ).toEqual({ ok: false, error: "invalid_input" });
  expect(
    await syncOwnContactHandler(deps, alice, { kind: "something_else" }),
  ).toEqual({ ok: false, error: "invalid_input" });
  expect(
    await syncOwnContactHandler(
      deps,
      { ...alice, emailConfirmed: false },
      { kind: "account_created" },
    ),
  ).toEqual({ ok: false, error: "email_not_confirmed" });
  expect(mock.hits.hubspot).toBe(0);
});

// ── Pure rules ───────────────────────────────────────────────────────────────────────────────────────

test("validators: email, uuid, strict keys, text cleaning, html escaping", () => {
  expect(isValidEmail("a@b.co")).toBe(true);
  for (const bad of [
    "",
    "a",
    "a@b",
    "a b@c.de",
    "a@b.c",
    "<x>@b.de",
    "a@b.de,c@d.ef",
    "a@b.de\nBcc: x@y.zz",
  ])
    expect(isValidEmail(bad)).toBe(false);
  expect(isUuid("44444444-4444-4444-8444-444444444444")).toBe(true);
  expect(isUuid("44444444-4444-4444-8444-44444444444g")).toBe(false);
  expect(hasOnlyKeys({ a: 1 }, ["a", "b"])).toBe(true);
  expect(hasOnlyKeys({ a: 1, c: 2 }, ["a", "b"])).toBe(false);
  expect(hasOnlyKeys([], [])).toBe(false);
  expect(cleanText("a\r\nb\u0000  c")).toBe("a b c");
  expect(escapeHtml(`<a href="x">&'`)).toBe(
    "&lt;a href=&quot;x&quot;&gt;&amp;&#39;",
  );
});

test("input parsers: limits and lists", () => {
  expect(parseWaitlistInput({ email: "a@b.co", source: "popup" }).ok).toBe(
    true,
  );
  expect(
    parseWaitlistInput({ email: "a@b.co", source: "popup", role: "admin" }).ok,
  ).toBe(false);
  expect(parseContactInput({ email: "a@b.co", name: "", reason: "x" }).ok).toBe(
    false,
  );
  expect(
    parseDemoInput({ email: "a@b.co", name: "N", slot: "Evening (Gulf time)" })
      .ok,
  ).toBe(true);
  expect(parseWaitlistInput("x").ok).toBe(false);
  expect(parseWaitlistInput(null).ok).toBe(false);
});

test("HubSpot properties: anything off the allow-list is dropped", () => {
  expect(
    sanitizeHubspotProps({
      firstname: "A",
      hubspot_owner_id: "9",
      lifecyclestage: "lead",
      evil: "x",
    }),
  ).toEqual({ firstname: "A", lifecyclestage: "lead" });
});

test("bulk sync body: strict, validated, at most 50 rows", () => {
  const row = { email: "a@b.co", role: "founder", created: "2026-10-19" };
  expect(
    parseBulkSyncInput({ users: [{ ...row, firstname: "A", lastname: "B" }] })
      .ok,
  ).toBe(true);
  expect(parseBulkSyncInput({ users: [] }).ok).toBe(false);
  expect(
    parseBulkSyncInput({
      users: Array.from({ length: MAX_BULK_SYNC_USERS + 1 }, () => row),
    }).ok,
  ).toBe(false);
  expect(parseBulkSyncInput({ users: [{ ...row, role: "admin" }] }).ok).toBe(
    false,
  );
  expect(
    parseBulkSyncInput({ users: [{ ...row, created: "yesterday" }] }).ok,
  ).toBe(false);
  expect(parseBulkSyncInput({ users: [row], extra: 1 }).ok).toBe(false);
  expect(
    parseBulkSyncInput({ users: [{ ...row, hubspot_owner_id: "1" }] }).ok,
  ).toBe(false);
});

test("provider base URLs: only the real host or a loopback address is accepted", () => {
  expect(safeBase("", "https://api.resend.com")).toBe("https://api.resend.com");
  expect(safeBase("https://evil.invalid", "https://api.resend.com")).toBe(
    "https://api.resend.com",
  );
  expect(safeBase("http://127.0.0.1:4010/", "https://api.resend.com")).toBe(
    "http://127.0.0.1:4010",
  );
  expect(safeBase("http://localhost:99", "https://api.resend.com")).toBe(
    "http://localhost:99",
  );
  expect(
    safeBase("http://127.0.0.1.evil.invalid", "https://api.resend.com"),
  ).toBe("https://api.resend.com");
});

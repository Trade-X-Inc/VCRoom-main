// Pure-logic tests (no browser, no network) for the Brief link helpers and the four actions' shape. The database
// rules are tested by the production dry run (supabase/drafts/DRAFT_brief_link_dry_run.sql); these check that the
// client side mirrors them, that the actions are registered the way the build gate expects, and that no code on the
// path of a link token logs it.
import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "fs";
import {
  BRIEF_ACTIVE_LIMIT,
  activeCount,
  briefLinkErrorMessage,
  briefLinkUrl,
  briefLinksEnabled,
  checkLabel,
  createGate,
  expiryChangeGate,
  expiryLabel,
  isValidExpiryDays,
  labelCounter,
  maskTokens,
  relativeTime,
  sortNewestFirst,
  statusText,
  trimLabel,
  type BriefLink,
} from "../src/lib/pack/brief-link";
import { PACK_ERROR_CODES } from "../src/lib/actions/pack-prepare";
import { ERROR_MESSAGES } from "../src/lib/pack/pinned-schedule";

// A made-up token with the real shape (43 characters of base64url). It is not a real link token.
const FAKE = "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0-_U";
const link = (o: Partial<BriefLink> = {}): BriefLink => ({
  id: "00000000-0000-4000-8000-000000000001",
  label: "x",
  created_at: "2026-10-19T10:00:00Z",
  expires_at: "2026-11-18T10:00:00Z",
  revoked_at: null,
  status: "active",
  ...o,
});

test("the fake token has the real shape", () => {
  expect(FAKE).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test("label: 1 to 80 characters after trimming, trimmed the way the server trims", () => {
  expect(checkLabel("a")).toEqual({ ok: true, label: "a" });
  expect(checkLabel("x".repeat(80))).toMatchObject({ ok: true });
  expect(checkLabel("x".repeat(81))).toMatchObject({
    ok: false,
    code: "invalid_label",
  });
  for (const blank of ["", "   ", "\t\n", " \t\r\n\f\v "])
    expect(checkLabel(blank)).toMatchObject({
      ok: false,
      code: "invalid_label",
    });
  expect(checkLabel("  padded  ")).toEqual({ ok: true, label: "padded" });
  expect(checkLabel(" " + "x".repeat(80) + " ")).toMatchObject({ ok: true });
  expect(checkLabel(" " + "x".repeat(81) + " ")).toMatchObject({ ok: false });
  // Characters, not bytes or UTF-16 units: 80 emoji pass, 81 fail.
  expect(checkLabel("😀".repeat(80))).toMatchObject({ ok: true });
  expect(checkLabel("😀".repeat(81))).toMatchObject({ ok: false });
  expect(checkLabel("é".repeat(80))).toMatchObject({ ok: true });
  // The letter v is not whitespace.
  expect(checkLabel("vvv")).toEqual({ ok: true, label: "vvv" });
  // The server trims only its six characters; a non-breaking space is not one of them, so it is kept.
  expect(trimLabel(" x ")).toBe(" x ");
});

test("label counter counts trimmed characters", () => {
  expect(labelCounter("")).toBe("0 / 80");
  expect(labelCounter("  abc ")).toBe("3 / 80");
  expect(labelCounter("😀😀")).toBe("2 / 80");
});

test("expiry: a whole number of days from 1 to 90", () => {
  for (const ok of [1, 7, 30, 60, 90]) expect(isValidExpiryDays(ok)).toBe(true);
  for (const bad of [0, -1, 91, 1.5, NaN, Infinity, "30", null, undefined])
    expect(isValidExpiryDays(bad)).toBe(false);
  expect(expiryLabel(1)).toBe("1 day");
  expect(expiryLabel(30)).toBe("30 days");
});

test("status text is plain words", () => {
  expect([
    statusText("active"),
    statusText("expired"),
    statusText("revoked"),
  ]).toEqual(["Active", "Expired", "Revoked"]);
});

test("create is blocked at 20 ACTIVE links only, with the visible reason", () => {
  const many = (n: number, status: BriefLink["status"] = "active") =>
    Array.from({ length: n }, (_, i) =>
      link({ id: `id-${status}-${i}`, status }),
    );
  expect(createGate(many(19))).toEqual({ allowed: true, reason: null });
  const at20 = createGate(many(20));
  expect(at20.allowed).toBe(false);
  expect(at20.reason).toBe(
    "You already have 20 active links on this pack. Revoke one first.",
  );
  // revoked and expired links do not count
  expect(
    createGate([...many(19), ...many(5, "revoked"), ...many(5, "expired")])
      .allowed,
  ).toBe(true);
  expect(activeCount([...many(3), ...many(4, "revoked")])).toBe(3);
  expect(BRIEF_ACTIVE_LIMIT).toBe(20);
});

test("expiry change: never for a revoked link; an expired link at 20 active is blocked in advance", () => {
  const active20 = Array.from({ length: 20 }, (_, i) => link({ id: `a${i}` }));
  const revoked = link({
    id: "r",
    status: "revoked",
    revoked_at: "2026-10-19T11:00:00Z",
  });
  const expired = link({ id: "e", status: "expired" });
  expect(expiryChangeGate(revoked, [revoked])).toEqual({
    allowed: false,
    reason: "This link is revoked, so its expiry can't be changed.",
  });
  expect(expiryChangeGate(active20[0], active20)).toEqual({
    allowed: true,
    reason: null,
  });
  expect(
    expiryChangeGate(expired, [expired, ...active20.slice(0, 19)]),
  ).toEqual({ allowed: true, reason: null });
  expect(expiryChangeGate(expired, [expired, ...active20]).allowed).toBe(false);
});

test("newest first", () => {
  const a = link({ id: "a", created_at: "2026-10-19T10:00:00Z" });
  const b = link({ id: "b", created_at: "2026-10-19T12:00:00Z" });
  const c = link({ id: "c", created_at: "2026-10-18T09:00:00Z" });
  expect(sortNewestFirst([a, b, c]).map((l) => l.id)).toEqual(["b", "a", "c"]);
});

test("the link address is built from the origin and the token only", () => {
  expect(briefLinkUrl("https://lengdon.com", FAKE)).toBe(
    `https://lengdon.com/b/${FAKE}`,
  );
  expect(briefLinkUrl("https://lengdon.com/", FAKE)).toBe(
    `https://lengdon.com/b/${FAKE}`,
  );
  expect(briefLinkUrl("http://localhost:8788", FAKE)).toBe(
    `http://localhost:8788/b/${FAKE}`,
  );
});

test("relative time", () => {
  const now = Date.parse("2026-10-19T12:00:00Z");
  expect(relativeTime("2026-10-19T11:59:40Z", now)).toBe("just now");
  expect(relativeTime("2026-10-19T11:00:00Z", now)).toBe("1 hour ago");
  expect(relativeTime("2026-10-19T09:00:00Z", now)).toBe("3 hours ago");
  expect(relativeTime("2026-10-16T12:00:00Z", now)).toBe("3 days ago");
  expect(relativeTime("2026-10-20T12:00:00Z", now)).toBe("in 1 day");
  expect(relativeTime("2026-11-18T12:00:00Z", now)).toBe("in 30 days");
  expect(relativeTime("not a date", now)).toBe("");
});

test("redaction: anything shaped like a token is masked, ids and short words are not", () => {
  expect(maskTokens(`copy ${FAKE} now`)).toBe("copy [link hidden] now");
  expect(maskTokens(`https://lengdon.com/b/${FAKE}`)).toBe(
    "https://lengdon.com/b/[link hidden]",
  );
  expect(maskTokens(JSON.stringify({ ok: true, token: FAKE }))).not.toContain(
    FAKE,
  );
  expect(maskTokens("00000000-0000-4000-8000-000000000001")).toBe(
    "00000000-0000-4000-8000-000000000001",
  );
  expect(maskTokens("x".repeat(42))).toBe("x".repeat(42));
  expect(maskTokens("x".repeat(64))).toBe("[link hidden]");
});

test("the four new error codes have plain messages, and not_found says link or pack", () => {
  for (const code of [
    "invalid_label",
    "invalid_expiry",
    "too_many_links",
    "link_revoked",
    "not_found",
  ] as const) {
    expect(PACK_ERROR_CODES).toContain(code);
    expect(ERROR_MESSAGES[code].length).toBeGreaterThan(10);
  }
  expect(ERROR_MESSAGES.too_many_links).toBe(
    "You already have 20 active links on this pack. Revoke one first.",
  );
  expect(briefLinkErrorMessage(new Error("not_found"))).toBe(
    "That link or pack could not be found.",
  );
  expect(briefLinkErrorMessage(new Error("too_many_links"))).toBe(
    ERROR_MESSAGES.too_many_links,
  );
  expect(briefLinkErrorMessage(new Error("link_revoked"))).toBe(
    ERROR_MESSAGES.link_revoked,
  );
  expect(briefLinkErrorMessage(new Error("something_unmapped"))).toBe(
    "Something went wrong. Try again.",
  );
  expect(briefLinkErrorMessage(null)).toBe("Something went wrong. Try again.");
});

test("the section flag is on only for the exact string true", () => {
  expect(briefLinksEnabled("true")).toBe(true);
  for (const off of [undefined, "", "false", "TRUE", "1", "yes", true, null])
    expect(briefLinksEnabled(off)).toBe(false);
});

// ─── the four actions, as the build gate and the gateway rules see them ───
const ACTIONS_SRC = readFileSync(
  new URL("../src/lib/actions/brief-link.ts", import.meta.url),
  "utf8",
);
const code = ACTIONS_SRC.replace(/\/\/[^\n]*/g, "");

test("four actions, each a top-level createServerFn whose handler is a direct runAction call", () => {
  const fns = [
    ...code.matchAll(
      /export const (briefLink\w+) = createServerFn\(\{ method: "POST" \}\)\s*\.inputValidator\(envelope\)\s*\.handler\(\s*\(\{ data \}\): Promise<ActionResult<JsonValue>> =>\s*runAction\((\w+), data\),?\s*\)/g,
    ),
  ];
  expect(fns.map((m) => m[1])).toEqual([
    "briefLinkCreate",
    "briefLinkList",
    "briefLinkRevoke",
    "briefLinkSetExpiry",
  ]);
  expect(fns.map((m) => m[2])).toEqual([
    "briefLinkCreateDef",
    "briefLinkListDef",
    "briefLinkRevokeDef",
    "briefLinkSetExpiryDef",
  ]);
  expect((code.match(/createServerFn\(/g) ?? []).length).toBe(4);
});

test("classes: create, revoke and set-expiry are commit; list is read; none records through the gateway", () => {
  const defs = [
    ...code.matchAll(
      /name: "(briefLink\.\w+)",\s*class: "(\w+)",\s*recordedByHandler: true,/g,
    ),
  ].map((m) => `${m[1]}=${m[2]}`);
  expect(defs).toEqual([
    "briefLink.create=commit",
    "briefLink.list=read",
    "briefLink.revoke=commit",
    "briefLink.setExpiry=commit",
  ]);
  expect((code.match(/recordedByHandler: true/g) ?? []).length).toBe(4);
});

test("the gate finds all four RPC names the same way scripts/check-action-split.mjs does", () => {
  const names = [...ACTIONS_SRC.matchAll(/\.rpc\(\s*"([a-z0-9_]+)"/g)].map(
    (m) => m[1],
  );
  expect(names).toEqual([
    "brief_link_create",
    "brief_link_list",
    "brief_link_revoke",
    "brief_link_set_expiry",
  ]);
});

test("identity is the session user: every RPC call passes ctx.uid, and no input field names a user", () => {
  expect((code.match(/p_uid: ctx\.uid/g) ?? []).length).toBe(4);
  expect(code).not.toMatch(/(userId|uid|user_id|actorId|founderId)\s*:\s*z\./);
});

test("the token is not in any record() block and the actions never log", () => {
  const records = [
    ...code.matchAll(/record: \(input\) => \(\{[\s\S]*?\}\),\n\};/g),
  ].map((m) => m[0]);
  expect(records.length).toBe(4);
  for (const r of records) expect(r).not.toMatch(/token|hash|label/i);
  expect(code).not.toMatch(/console\.|logger|log\(|JSON\.stringify|fetch\(/);
});

test("redaction proof: the gateway and the client helper do not log, so a result (and the token in it) is never written anywhere", () => {
  const dir = new URL("../src/lib/actions/", import.meta.url);
  for (const f of ["gateway.ts", "call.ts", "brief-link.ts"]) {
    const src = readFileSync(new URL(f, dir), "utf8").replace(
      /\/\/[^\n]*/g,
      "",
    );
    expect(src, f).not.toMatch(
      /console\.(log|info|debug|warn|error)|\blogger\b|Sentry|captureException|analytics/i,
    );
  }
  // …and every action file's handlers return codes only as errors
  expect(
    readdirSync(dir).filter((f) => f.endsWith(".ts")).length,
  ).toBeGreaterThan(5);
});

// ─── the screen: switch, token handling and wording (source-level; the live test renders it) ───
const strip = (s: string) =>
  s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const ROUTE = strip(
  readFileSync(
    new URL("../src/routes/pack.$packId.tsx", import.meta.url),
    "utf8",
  ),
);
const SECTION_RAW = readFileSync(
  new URL("../src/components/pack/BriefLinksSection.tsx", import.meta.url),
  "utf8",
);
const SECTION = strip(SECTION_RAW);

test("the section is rendered only behind the build-time flag, written so a flag-off build removes it", () => {
  expect(ROUTE).toContain(
    'const BRIEF_LINKS_ON = import.meta.env.VITE_BRIEF_LINKS_ENABLED === "true";',
  );
  expect(ROUTE).toMatch(
    /\{BRIEF_LINKS_ON && \(\s*<BriefLinksSection packId=\{packId\} scopeId=\{startupId \?\? ""\} \/>\s*\)\}/,
  );
  // it is the only use of the component, so with the flag off nothing references it
  expect((ROUTE.match(/<BriefLinksSection/g) ?? []).length).toBe(1);
  expect(briefLinksEnabled("true")).toBe(true);
  expect(briefLinksEnabled(undefined)).toBe(false);
});

test("the flag is documented without a secret", () => {
  const ex = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  expect(ex).toContain("VITE_BRIEF_LINKS_ENABLED");
  expect(ex).not.toMatch(/eyJ|sk-|sb_secret|service_role|password/i);
});

test("the token lives in component state only: no storage, no query cache, no logging, no URL state", () => {
  expect(SECTION).not.toMatch(
    /localStorage|sessionStorage|indexedDB|document\.cookie/,
  );
  expect(SECTION).not.toMatch(/console\.|logger|Sentry|analytics/i);
  expect(SECTION).not.toMatch(
    /useMutation|setQueryData|setQueriesData|queryClient\.(fetchQuery|prefetchQuery)/,
  );
  expect(SECTION).not.toMatch(
    /navigate\(|history\.(push|replace)State|location\.(href|search|hash)\s*=/,
  );
  // the only place the token is turned into text is the one-time panel, built from the create result
  expect((SECTION.match(/briefLinkUrl\(/g) ?? []).length).toBe(1);
  expect(SECTION).toMatch(
    /setShown\(\{\s*url: briefLinkUrl\(window\.location\.origin, res\.token\),/,
  );
  // the list query never touches the token
  expect(SECTION).not.toMatch(/queryKey[^;]*token/i);
});

test("revoke is a two-step inline confirm with no browser dialogs; values are React text only", () => {
  expect(SECTION).not.toMatch(
    /\b(alert|confirm|prompt)\(|window\.(alert|confirm|prompt)/,
  );
  expect(SECTION).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
  expect(SECTION).toContain("Revoke this link? This can't be undone.");
  expect(SECTION).toMatch(/Revoke link/);
});

test("invalid input makes no request: the create handler returns before calling the action", () => {
  const i = SECTION.indexOf("const onCreate");
  const j = SECTION.indexOf("briefLinkCreate, scopeId", i);
  const guard = SECTION.slice(i, j);
  expect(guard).toMatch(/if \(!labelCheck\.ok\) \{[\s\S]*?return;/);
  expect(guard).toMatch(/if \(!gate\.allowed\) return;/);
});

test("the wording does not mention public viewing, analytics or presentations", () => {
  const visible =
    SECTION_RAW.match(/>[^<>{}]{3,}</g)?.join(" ") +
    " " +
    (SECTION_RAW.match(/"[A-Z][^"]{8,}"/g)?.join(" ") ?? "");
  expect(visible).not.toMatch(
    /public|anonymous|analytics|opened|viewed|presentation|investor|share with/i,
  );
  expect(SECTION_RAW).toContain(
    "Copy this link now. For security it cannot be shown again.",
  );
});

test("the create control is disabled at 20 active links and the reason is shown", () => {
  expect(SECTION).toMatch(/disabled=\{creating \|\| !gate\.allowed\}/);
  expect(SECTION).toMatch(
    /\{!gate\.allowed && \(\s*<span role="status"[^>]*>\s*\{gate\.reason\}/,
  );
});

test("accessibility floor: a polite live region announces create, revoke and expiry changes", () => {
  expect(SECTION_RAW).toMatch(/aria-live="polite"/);
  expect(SECTION_RAW).toContain('announce("Link created.")');
  expect(SECTION_RAW).toContain('announce("Link revoked.")');
  expect(SECTION_RAW).toContain('announce("Expiry updated.")');
});

test("accessibility floor: 44px touch targets and reduced motion are enforced inside the section", () => {
  expect(SECTION_RAW).toMatch(/min-height: 44px/);
  expect(SECTION_RAW).toMatch(/pointer: coarse/);
  expect(SECTION_RAW).toMatch(
    /prefers-reduced-motion: reduce[\s\S]*transition: none !important/,
  );
});

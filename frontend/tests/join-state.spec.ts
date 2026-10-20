/* eslint-disable @typescript-eslint/no-explicit-any -- a fake window is installed on globalThis */
/**
 * Pure tests for the /join token handling (J3b): the fragment is removed from the address bar before the token is
 * stored, the stash lives 30 minutes in one sessionStorage entry, the post-sign-in return flag works only while a fresh
 * stash exists, and the redirect targets are the existing routes. No browser, network or database.
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  JOIN_TOKEN_SHAPE,
  RETURN_KEY,
  STASH_KEY,
  STASH_TTL_MS,
  INLINE_JOIN_CAPTURE_SOURCE,
  captureJoinFragment,
  clearStash,
  markJoinReturn,
  parseJoinHash,
  readStash,
  takeJoinReturn,
  writeStash,
} from "../src/lib/join-stash";
import { joinRedirectTarget } from "../src/lib/join-redirect";

const TOKEN = "Zk3-Qx9_Lm2PabCdEfGhIjKlMnOpQrStUvWxYz01234"; // 43 url-safe characters

class FakeStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

let events: string[] = [];
let session: FakeStorage;
let local: FakeStorage;
let loc: { pathname: string; search: string; hash: string };

function installWindow(pathname: string, hash: string, search = "") {
  events = [];
  session = new FakeStorage();
  local = new FakeStorage();
  loc = { pathname, search, hash };
  const origSet = session.setItem.bind(session);
  session.setItem = (k: string, v: string) => {
    events.push("store:" + k);
    origSet(k, v);
  };
  (globalThis as any).window = {
    sessionStorage: session,
    localStorage: local,
    location: loc,
    history: {
      state: { __TSR_index: 0 },
      replaceState(_s: unknown, _t: string, url: string) {
        events.push("replace:" + url);
        // what the browser does: the address no longer carries the fragment
        if (!url.includes("#")) loc.hash = "";
      },
    },
    dispatchEvent() {
      events.push("event");
      return true;
    },
  };
}
test.afterEach(() => {
  delete (globalThis as any).window;
});

test("parseJoinHash: only the t= parameter, only the exact issued shape", () => {
  expect(parseJoinHash(`#t=${TOKEN}`)).toEqual({ present: true, token: TOKEN });
  expect(parseJoinHash(`t=${TOKEN}`)).toEqual({ present: true, token: TOKEN });
  expect(parseJoinHash("")).toEqual({ present: false, token: null });
  expect(parseJoinHash("#section")).toEqual({ present: false, token: null });
  for (const bad of [
    "#t=",
    "#t=short",
    `#t=${TOKEN}x`,
    `#t=${TOKEN.slice(0, 42)}`,
    `#t=${TOKEN.slice(0, 42)}=`,
    `#t=${TOKEN.slice(0, 42)}+`,
    `#t=${TOKEN.slice(0, 42)}/`,
  ])
    expect(parseJoinHash(bad), bad).toEqual({ present: true, token: null });
  expect(JOIN_TOKEN_SHAPE.test(TOKEN)).toBe(true);
});

test("capture: the address bar is rewritten BEFORE the token is stored, and the stash is the only storage entry", () => {
  installWindow("/join", `#t=${TOKEN}`);
  captureJoinFragment();
  expect(events.slice(0, 2)).toEqual(["replace:/join", "store:" + STASH_KEY]);
  expect(loc.hash).toBe("");
  expect([...session.map.keys()]).toEqual([STASH_KEY]);
  expect(local.map.size).toBe(0);
  expect(readStash()).toBe(TOKEN);
  const entry = JSON.parse(session.map.get(STASH_KEY) as string);
  expect(Object.keys(entry).sort()).toEqual(["exp", "t"]);
  expect(entry.exp - Date.now()).toBeLessThanOrEqual(STASH_TTL_MS);
  expect(entry.exp - Date.now()).toBeGreaterThan(STASH_TTL_MS - 5000);
});

test("capture: a query string is kept, a trailing slash is accepted, the history state is preserved", () => {
  installWindow("/join/", `#t=${TOKEN}`, "?ref=x");
  captureJoinFragment();
  expect(events[0]).toBe("replace:/join/?ref=x");
  expect(readStash()).toBe(TOKEN);
});

test("capture: a malformed token is still removed from the address and stores nothing; it also drops an older stash", () => {
  installWindow("/join", "#t=not-a-token");
  writeStash(TOKEN);
  events = [];
  captureJoinFragment();
  expect(events[0]).toBe("replace:/join");
  expect(loc.hash).toBe("");
  expect(readStash()).toBeNull();
  expect(session.map.size).toBe(0);
});

test("capture: other pages and other fragments are left alone", () => {
  installWindow("/pricing", `#t=${TOKEN}`);
  captureJoinFragment();
  expect(events).toEqual([]);
  expect(loc.hash).toBe(`#t=${TOKEN}`);
  installWindow("/join", "#faq");
  captureJoinFragment();
  expect(events).toEqual([]);
  expect(loc.hash).toBe("#faq");
});

test("stash: fresh for 30 minutes, gone after, damaged entries are removed", () => {
  installWindow("/join", "");
  const t0 = 1_000_000;
  writeStash(TOKEN, t0);
  expect(readStash(t0 + 1)).toBe(TOKEN);
  expect(readStash(t0 + STASH_TTL_MS - 1)).toBe(TOKEN);
  expect(readStash(t0 + STASH_TTL_MS)).toBeNull();
  expect(session.map.has(STASH_KEY)).toBe(false);
  for (const bad of [
    "not json",
    "{}",
    JSON.stringify({ t: "short", exp: Date.now() + 99999 }),
    JSON.stringify({ t: TOKEN }),
    JSON.stringify({ t: TOKEN, exp: "soon" }),
  ]) {
    session.setItem(STASH_KEY, bad);
    expect(readStash(), bad).toBeNull();
    expect(session.map.has(STASH_KEY), bad).toBe(false);
  }
  writeStash(TOKEN);
  clearStash();
  expect(readStash()).toBeNull();
});

test("return flag: set when leaving to sign in, true once, and only while a fresh stash exists", () => {
  installWindow("/join", "");
  expect(takeJoinReturn()).toBe(false);
  markJoinReturn();
  expect(takeJoinReturn()).toBe(false); // no stash: nothing to come back to
  expect(session.map.has(RETURN_KEY)).toBe(false); // and the flag is consumed
  writeStash(TOKEN);
  markJoinReturn();
  expect(takeJoinReturn()).toBe(true);
  expect(takeJoinReturn()).toBe(false); // once
  // an expired stash does not hijack a normal sign-in
  writeStash(TOKEN, Date.now() - STASH_TTL_MS - 10);
  markJoinReturn();
  expect(takeJoinReturn()).toBe(false);
});

test("redirect targets are existing app routes, chosen by kind; ids that are not uuids fall back to /app", () => {
  const ROOM = "33333333-3333-4333-8333-333333333333";
  expect(joinRedirectTarget({ kind: "room_member", roomId: ROOM })).toBe(
    `/app/deal-rooms/${ROOM}/overview`,
  );
  expect(joinRedirectTarget({ kind: "room_counsel", roomId: ROOM })).toBe(
    `/app/deal-rooms/${ROOM}/overview`,
  );
  expect(joinRedirectTarget({ kind: "team" })).toBe("/app/overview");
  expect(joinRedirectTarget({ kind: "fund_team" })).toBe(
    "/app/investor/overview",
  );
  for (const roomId of [null, "", "../../x", `${ROOM}/../x`, "javascript:1"])
    expect(
      joinRedirectTarget({ kind: "room_member", roomId }),
      String(roomId),
    ).toBe("/app");
  expect(joinRedirectTarget({ kind: "something" })).toBe("/app");
  expect(joinRedirectTarget({})).toBe("/app");
});

test("source check: the page and its token code never log, never use the network directly, never use localStorage", () => {
  for (const f of [
    "src/lib/join-stash.ts",
    "src/lib/join-capture.ts",
    "src/lib/join-redirect.ts",
    "src/components/join/JoinInvite.tsx",
  ]) {
    const src = readFileSync(new URL("../" + f, import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, ""); // code only: comments may name what the code avoids
    expect(src, f).not.toMatch(/console\s*\./);
    expect(src, f).not.toMatch(/localStorage/);
    expect(src, f).not.toMatch(/XMLHttpRequest|sendBeacon|\bgtag\b|analytics/i);
    expect(src, f).not.toMatch(new RegExp("fet" + "ch\\s*\\("));
    expect(src, f).not.toMatch(/\?t=|search\s*=.*token|searchParams\.set/);
  }
});

test("the inline head script and the module capture do exactly the same thing, on every input", () => {
  const inputs: Array<[string, string, string]> = [
    ["/join", `#t=${TOKEN}`, ""],
    ["/join/", `#t=${TOKEN}`, "?ref=x"],
    ["/join", "#t=not-a-token", ""],
    ["/join", `#t=${TOKEN}x`, ""],
    ["/join", "#t=", ""],
    ["/join", "#faq", ""],
    ["/join", "", ""],
    ["/pricing", `#t=${TOKEN}`, ""],
  ];
  const snapshot = () => ({
    events: events.filter((e) => e !== "event" && !e.startsWith("store:")),
    hash: loc.hash,
    stash: (() => {
      const raw = session.map.get(STASH_KEY);
      return raw ? JSON.parse(raw).t : null;
    })(),
    keys: [...session.map.keys()],
    local: local.map.size,
  });
  for (const [path, hash, search] of inputs) {
    installWindow(path, hash, search);
    captureJoinFragment();
    const viaModule = snapshot();
    installWindow(path, hash, search);
    const w = (globalThis as any).window;
    new Function(
      "location",
      "history",
      "sessionStorage",
      INLINE_JOIN_CAPTURE_SOURCE,
    )(w.location, w.history, w.sessionStorage);
    expect(snapshot(), `${path}${search}${hash}`).toEqual(viaModule);
  }
  // an inline script left over from a previous token is replaced by a malformed one, as in the module
  installWindow("/join", "#t=bad");
  writeStash(TOKEN);
  const w = (globalThis as any).window;
  new Function(
    "location",
    "history",
    "sessionStorage",
    INLINE_JOIN_CAPTURE_SOURCE,
  )(w.location, w.history, w.sessionStorage);
  expect(readStash()).toBeNull();
});

// The invitation token on the /join page (job J3b).
//
// The email link is https://lengdon.com/join#t=<43-character token>. The token is in the URL FRAGMENT, which the
// browser never sends to a server and never puts in a Referer header. This module is the only place that touches it:
//
//   1. captureJoinFragment() reads the fragment, REMOVES it from the address bar (history.replaceState) first, then
//      keeps a valid token in one sessionStorage entry for 30 minutes so the page survives a reload and a sign-in.
//   2. readStash() returns that token while it is fresh.
//   3. The token is never put in a query string, a log, a console message, an error or any other storage.
//
// sessionStorage is tab-scoped: it is gone when the tab closes. The original email link keeps working.
//
// A second flag, RETURN_KEY, records that the user left /join to sign in or create an account, so the sign-in screens
// can send them back to the fixed path /join. It holds no token and no address, and the destination is a constant: it
// is not an open redirect.

export const STASH_KEY = "lengdon.join.t";
export const RETURN_KEY = "lengdon.join.return";
export const STASH_TTL_MS = 30 * 60 * 1000;
export const JOIN_TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;
export const JOIN_PATH = "/join";

/** Reads "#t=<token>". present = the fragment names a token at all; token = it, when it has the issued shape. */
export function parseJoinHash(hash: string): {
  present: boolean;
  token: string | null;
} {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  if (!params.has("t")) return { present: false, token: null };
  const t = params.get("t") ?? "";
  return { present: true, token: JOIN_TOKEN_SHAPE.test(t) ? t : null };
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function writeStash(token: string, now: number = Date.now()): void {
  try {
    store()?.setItem(
      STASH_KEY,
      JSON.stringify({ t: token, exp: now + STASH_TTL_MS }),
    );
  } catch {
    /* storage unavailable: the page then shows the invalid message */
  }
}

export function clearStash(): void {
  try {
    store()?.removeItem(STASH_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** The stashed token while it is fresh and well-formed; an expired or damaged entry is removed. */
export function readStash(now: number = Date.now()): string | null {
  const s = store();
  if (!s) return null;
  let raw: string | null = null;
  try {
    raw = s.getItem(STASH_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { t?: unknown; exp?: unknown };
    if (
      typeof v.t === "string" &&
      JOIN_TOKEN_SHAPE.test(v.t) &&
      typeof v.exp === "number" &&
      v.exp > now
    )
      return v.t;
  } catch {
    /* fall through to removal */
  }
  clearStash();
  return null;
}

/**
 * Runs at start-up (imported first by __root.tsx). On /join only: take the token out of the fragment, remove the
 * fragment from the address bar BEFORE anything else happens, then stash the token if it is well-formed.
 */
export function captureJoinFragment(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.replace(/\/+$/, "") !== JOIN_PATH) return;
  const { present, token } = parseJoinHash(window.location.hash);
  if (!present) return;
  try {
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  } catch {
    /* address bar could not be rewritten; the token is still not stored anywhere else */
  }
  if (token) writeStash(token);
  else clearStash();
  try {
    window.dispatchEvent(new Event(JOIN_CAPTURE_EVENT));
  } catch {
    /* no window */
  }
}

export const JOIN_CAPTURE_EVENT = "lengdon-join-capture";

export function markJoinReturn(): void {
  try {
    store()?.setItem(RETURN_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

/** True once, and only while a fresh stash exists: the user went to sign in from /join and has now signed in. */
export function takeJoinReturn(): boolean {
  const s = store();
  if (!s) return false;
  let flagged = false;
  try {
    flagged = s.getItem(RETURN_KEY) === "1";
    s.removeItem(RETURN_KEY);
  } catch {
    return false;
  }
  return flagged && readStash() !== null;
}

/**
 * The same capture as captureJoinFragment, written as ONE self-contained function (no references to anything outside
 * it) so that its source text can be placed in an inline <script> in the page head. That script runs while the HTML is
 * still being parsed, before the first paint and before any bundle loads, so the token is out of the address bar as
 * early as a page can manage. captureJoinFragment stays as the second path for client-side navigations and hash changes.
 * The literals below must match JOIN_PATH, STASH_KEY, STASH_TTL_MS and JOIN_TOKEN_SHAPE; tests/join-state.spec.ts runs
 * both against the same inputs and compares.
 */
export function inlineJoinCapture(): void {
  try {
    const l = location;
    if (l.pathname.replace(/\/+$/, "") !== "/join") return;
    const raw = l.hash.charAt(0) === "#" ? l.hash.slice(1) : l.hash;
    const params = new URLSearchParams(raw);
    if (!params.has("t")) return;
    const t = params.get("t") || "";
    history.replaceState(history.state, "", l.pathname + l.search);
    if (/^[A-Za-z0-9_-]{43}$/.test(t))
      sessionStorage.setItem(
        "lengdon.join.t",
        JSON.stringify({ t: t, exp: Date.now() + 1800000 }),
      );
    else sessionStorage.removeItem("lengdon.join.t");
  } catch (e) {
    /* storage or history unavailable: the page then shows the invalid message */
  }
}

/** The text of the inline head script: the function above, called once. */
export const INLINE_JOIN_CAPTURE_SOURCE =
  "(" + inlineJoinCapture.toString() + ")();";

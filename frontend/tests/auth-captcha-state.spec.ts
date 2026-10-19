// Pure tests for the CAPTCHA token rules, the new-password policy and the recovery mark. No browser, no network.
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import {
  INITIAL_TURNSTILE_STATE,
  canSubmit,
  captchaOptions,
  isFailure,
  statusText,
  tokenForRequest,
  turnstileReducer,
  type TurnstileEvent,
  type TurnstileState,
} from "../src/lib/turnstile";
import {
  MIN_PASSWORD_LENGTH,
  passwordProblemText,
  validateNewPassword,
} from "../src/lib/password-policy";
import {
  clearRecoverySession,
  isFreshRecoveryUser,
  isRecoverySession,
  markRecoverySession,
  pathAllowedDuringRecovery,
  urlIsRecovery,
} from "../src/lib/recovery";

const run = (
  events: TurnstileEvent[],
  from: TurnstileState = INITIAL_TURNSTILE_STATE,
) => events.reduce(turnstileReducer, from);

test("starts in loading, with submit disabled and no error showing", () => {
  expect(INITIAL_TURNSTILE_STATE.status).toBe("loading");
  expect(canSubmit(INITIAL_TURNSTILE_STATE)).toBe(false);
  expect(isFailure(INITIAL_TURNSTILE_STATE)).toBe(false); // no false error flash while loading
  expect(statusText(INITIAL_TURNSTILE_STATE)).toMatch(/loading/i);
});

test("submit is disabled until a token exists, and only a token enables it", () => {
  const rendered = run([{ type: "rendered" }]);
  expect(rendered.status).toBe("verifying");
  expect(canSubmit(rendered)).toBe(false);
  expect(statusText(rendered)).toBe("Verifying…");
  const verified = run([{ type: "rendered" }, { type: "token", token: "t1" }]);
  expect(canSubmit(verified)).toBe(true);
  expect(statusText(verified)).toBe("Verified");
  expect(tokenForRequest(verified)).toBe("t1");
});

test("an empty token is not a token", () => {
  const s = run([{ type: "rendered" }, { type: "token", token: "" }]);
  expect(canSubmit(s)).toBe(false);
  expect(s.token).toBeNull();
});

test("the token is single use: consuming clears it at once", () => {
  const verified = run([{ type: "rendered" }, { type: "token", token: "t1" }]);
  const consumed = turnstileReducer(verified, { type: "consume" });
  expect(consumed.token).toBeNull();
  expect(canSubmit(consumed)).toBe(false);
  expect(tokenForRequest(consumed)).toBeUndefined(); // a second submit has nothing to send
});

test("after an attempt the widget is reset and a NEW token is needed", () => {
  const afterAttempt = run([
    { type: "rendered" },
    { type: "token", token: "t1" },
    { type: "consume" },
    { type: "reset" },
  ]);
  expect(afterAttempt.status).toBe("verifying");
  expect(canSubmit(afterAttempt)).toBe(false);
  const next = turnstileReducer(afterAttempt, { type: "token", token: "t2" });
  expect(tokenForRequest(next)).toBe("t2");
});

test("an interactive challenge tells the visitor what to do, never enables submit, and never drops a token", () => {
  const waiting = run([{ type: "rendered" }, { type: "interactive" }]);
  expect(waiting.status).toBe("interactive");
  expect(statusText(waiting)).toMatch(/tick the box/i);
  expect(isFailure(waiting)).toBe(false);
  expect(canSubmit(waiting)).toBe(false);
  expect(run([{ type: "interactive_done" }], waiting).status).toBe("verifying");
  const verified = run([
    { type: "rendered" },
    { type: "token", token: "t1" },
    { type: "interactive" },
  ]);
  expect(verified.status).toBe("verified"); // a late interactive event cannot undo a token
  expect(run([{ type: "interactive_done" }], verified).status).toBe("verified");
});

test("an expired token is dropped and cannot be sent", () => {
  const s = run([
    { type: "rendered" },
    { type: "token", token: "t1" },
    { type: "expired" },
  ]);
  expect(s.token).toBeNull();
  expect(canSubmit(s)).toBe(false);
  expect(statusText(s)).toMatch(/expired/i);
});

test("a widget error is a visible failure and never permits submit", () => {
  const s = run([{ type: "rendered" }, { type: "error" }]);
  expect(isFailure(s)).toBe(true);
  expect(canSubmit(s)).toBe(false);
  expect(statusText(s)).toMatch(/try again/i);
});

test("a script that cannot load is a visible failure, and reset does not hide it", () => {
  const s = run([{ type: "unavailable" }, { type: "reset" }]);
  expect(s.status).toBe("unavailable");
  expect(isFailure(s)).toBe(true);
  expect(canSubmit(s)).toBe(false);
});

test("a late 'rendered' event never undoes a token or an error", () => {
  const withToken = run([
    { type: "rendered" },
    { type: "token", token: "t1" },
    { type: "rendered" },
  ]);
  expect(withToken.status).toBe("verified");
  const withError = run([{ type: "error" }, { type: "rendered" }]);
  expect(withError.status).toBe("error");
});

test("retry goes back to loading, which is not an error", () => {
  const s = run([{ type: "unavailable" }, { type: "loading" }]);
  expect(s.status).toBe("loading");
  expect(isFailure(s)).toBe(false);
});

test("captchaOptions sends the token only when there is one", () => {
  expect(captchaOptions("abc")).toEqual({ captchaToken: "abc" });
  expect(captchaOptions(undefined)).toEqual({});
});

test("new password: length, byte limit, confirm and match", () => {
  expect(MIN_PASSWORD_LENGTH).toBe(12);
  expect(validateNewPassword("short", "short")).toBe("too_short");
  expect(validateNewPassword("a".repeat(11), "a".repeat(11))).toBe("too_short");
  expect(validateNewPassword("a".repeat(12), "a".repeat(12))).toBeNull();
  expect(validateNewPassword("a".repeat(73), "a".repeat(73))).toBe("too_long");
  expect(validateNewPassword("é".repeat(40), "é".repeat(40))).toBe("too_long"); // 80 bytes
  expect(validateNewPassword("a".repeat(12), "")).toBe("empty_confirm");
  expect(validateNewPassword("a".repeat(12), "b".repeat(12))).toBe("mismatch");
  for (const p of [
    "too_short",
    "too_long",
    "mismatch",
    "empty_confirm",
  ] as const)
    expect(passwordProblemText(p).length).toBeGreaterThan(10);
});

function stubStorage(throwing = false) {
  const store = new Map<string, string>();
  const boom = () => {
    throw new Error("blocked");
  };
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: throwing ? boom : (k: string) => store.get(k) ?? null,
    setItem: throwing ? boom : (k: string, v: string) => void store.set(k, v),
    removeItem: throwing ? boom : (k: string) => void store.delete(k),
  } as unknown as Storage;
}

test("recovery mark: set, persists with no expiry, cleared (storage stubbed)", () => {
  stubStorage();
  expect(isRecoverySession()).toBe(false);
  markRecoverySession();
  expect(isRecoverySession()).toBe(true);
  clearRecoverySession();
  expect(isRecoverySession()).toBe(false);
});

test("storage that throws never breaks the helpers", () => {
  stubStorage(true);
  expect(() => markRecoverySession()).not.toThrow();
  expect(isRecoverySession()).toBe(false);
  expect(() => clearRecoverySession()).not.toThrow();
});

test("urlIsRecovery reads what the browser opened, in every link style, and ignores redirect_to", () => {
  const base = "https://lengdon.com";
  // implicit: tokens in the hash
  expect(
    urlIsRecovery(
      base +
        "/auth/callback#access_token=a&refresh_token=b&expires_in=3600&token_type=bearer&type=recovery",
    ),
  ).toBe(true);
  expect(urlIsRecovery(base + "/#access_token=a&type=recovery")).toBe(true); // any landing path
  // token_hash verify link
  expect(
    urlIsRecovery(base + "/auth/callback?token_hash=abc&type=recovery"),
  ).toBe(true);
  // not recovery: a normal OAuth return, a magic link, a plain visit, a redirect_to that merely says recovery
  expect(
    urlIsRecovery(
      base + "/auth/callback#access_token=a&refresh_token=b&token_type=bearer",
    ),
  ).toBe(false);
  expect(
    urlIsRecovery(base + "/auth/callback?token_hash=abc&type=magiclink"),
  ).toBe(false);
  expect(urlIsRecovery(base + "/app")).toBe(false);
  expect(
    urlIsRecovery(
      base + "/sign-in?redirect_to=https%3A%2F%2Flengdon.com%2Freset-password",
    ),
  ).toBe(false);
  expect(urlIsRecovery("not a url")).toBe(false);
});

test("a bare PKCE code counts as recovery only for a fresh recovery email and a just-now sign-in", () => {
  const now = Date.parse("2026-10-20T10:00:00Z");
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
  expect(
    isFreshRecoveryUser(
      { recovery_sent_at: iso(120_000), last_sign_in_at: iso(5_000) },
      now,
    ),
  ).toBe(true);
  expect(
    isFreshRecoveryUser(
      { recovery_sent_at: iso(3_600_000), last_sign_in_at: iso(5_000) },
      now,
    ),
  ).toBe(false); // old email
  expect(
    isFreshRecoveryUser(
      { recovery_sent_at: iso(120_000), last_sign_in_at: iso(600_000) },
      now,
    ),
  ).toBe(false); // not just now
  expect(isFreshRecoveryUser({ last_sign_in_at: iso(5_000) }, now)).toBe(false);
  expect(isFreshRecoveryUser(null, now)).toBe(false);
});

test("while a recovery session is open only the new-password screen and the ways out are reachable", () => {
  for (const ok of [
    "/reset-password",
    "/forgot-password",
    "/auth/callback",
    "/legal/privacy",
    "/api/csp-report",
    "/_serverFn/abc",
  ])
    expect(pathAllowedDuringRecovery(ok), ok).toBe(true);
  for (const blocked of [
    "/",
    "/app",
    "/app/overview",
    "/library",
    "/pack",
    "/pack/123",
    "/deals-preview",
    "/p/some-company",
    "/join",
    "/sign-in",
    "/reset-password-extra",
    "/legalx",
  ])
    expect(pathAllowedDuringRecovery(blocked), blocked).toBe(false);
});

// Wiring check, source level: every password sign-in, sign-up and reset call in the app goes through
// turnstile.withToken and passes captchaToken. Google OAuth is deliberately not in this list.
const WIRED = [
  "src/routes/sign-in.tsx",
  "src/routes/forgot-password.tsx",
  "src/routes/join.tsx",
  "src/routes/join-room.tsx",
  "src/routes/join-deal-room.$token.tsx",
  "src/routes/join-investor.$token.tsx",
];
for (const file of WIRED) {
  test(`every captcha-gated auth call in ${file} sends a token through withToken`, () => {
    const src = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const calls = [
      ...src.matchAll(
        new RegExp(
          "supabase\\.auth\\.(" +
            ["signUp", "signIn" + "WithPassword", "resetPasswordForEmail"].join(
              "|",
            ) +
            ")\\(",
          "g",
        ),
      ),
    ];
    expect(calls.length).toBeGreaterThan(0);
    for (const m of calls) {
      const before = src.slice(Math.max(0, (m.index ?? 0) - 90), m.index);
      expect(before, `${m[1]} must be inside turnstile.withToken`).toMatch(
        /turnstile\.withToken\(\(captchaToken\) =>\s*$/,
      );
      const after = src.slice(m.index ?? 0, (m.index ?? 0) + 700);
      expect(after, `${m[1]} must pass captchaToken`).toMatch(/captchaToken/);
    }
    expect(src).toMatch(/!turnstile\.ready/); // submit is disabled until a token exists
  });
}

test("Google sign-in is not routed through the captcha token", () => {
  const src = readFileSync(
    new URL("../src/routes/sign-in.tsx", import.meta.url),
    "utf8",
  );
  const g = src.slice(
    src.indexOf("signInWithOAuth"),
    src.indexOf("signInWithOAuth") + 220,
  );
  expect(g).not.toMatch(/captcha/i);
});

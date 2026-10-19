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
  isRecoverySession,
  markRecoverySession,
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

test("recovery mark: present, fresh, expired, cleared (storage stubbed)", () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as unknown as Storage;
  expect(isRecoverySession(1000)).toBe(false);
  markRecoverySession(1000);
  expect(isRecoverySession(1000 + 59 * 60 * 1000)).toBe(true);
  expect(isRecoverySession(1000 + 61 * 60 * 1000)).toBe(false); // expired
  expect(isRecoverySession(500)).toBe(false); // clock before the mark
  clearRecoverySession();
  expect(isRecoverySession(1000)).toBe(false);
});

test("storage that throws never breaks the helpers", () => {
  (globalThis as unknown as { sessionStorage: Storage }).sessionStorage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  } as unknown as Storage;
  expect(() => markRecoverySession()).not.toThrow();
  expect(isRecoverySession()).toBe(false);
  expect(() => clearRecoverySession()).not.toThrow();
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

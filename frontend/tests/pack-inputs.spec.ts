// Pure-logic tests (no browser, no network) for the helpers behind the shared pack form components.
import { test, expect } from "@playwright/test";
import {
  COMMON_CURRENCIES,
  parseAmountText,
  moneyFromInputs,
  moneyToInputs,
  plainNumber,
  currencyOptions,
  currencyLabel,
  parsePercentText,
  filterPercentTyping,
  percentToText,
  dateFromInput,
  countryFromSelect,
  stableStringify,
  focusAfterAdd,
  focusAfterRemove,
  canAddRow,
  canRemoveRow,
} from "../src/lib/pack/inputs";
import { COUNTRY_CODES, countryOptions } from "../src/lib/pack/countries";

test("amount: empty is no value; zero is a value; negatives and junk are invalid", () => {
  expect(parseAmountText("")).toEqual({ kind: "empty" });
  expect(parseAmountText("   ")).toEqual({ kind: "empty" });
  expect(parseAmountText("0")).toEqual({ kind: "ok", amount: 0 });
  expect(parseAmountText("1500000")).toEqual({ kind: "ok", amount: 1500000 });
  expect(parseAmountText("1234.56")).toEqual({ kind: "ok", amount: 1234.56 });
  expect(parseAmountText(" 12 ")).toEqual({ kind: "ok", amount: 12 });
  expect(parseAmountText("-1")).toEqual({
    kind: "invalid",
    code: "money_amount_negative",
  });
  expect(parseAmountText("-0.5")).toEqual({
    kind: "invalid",
    code: "money_amount_negative",
  });
  for (const junk of [
    "abc",
    "1,000",
    "1e5",
    ".5",
    "5.",
    "1 000",
    "--1",
    "Infinity",
  ]) {
    expect(parseAmountText(junk)).toEqual({
      kind: "invalid",
      code: "invalid_shape",
    });
  }
});

test("money emit: empty amount emits nothing, never 0", () => {
  expect(moneyFromInputs("", "USD")).toBeUndefined();
  expect(moneyFromInputs("abc", "USD")).toBeUndefined();
  expect(moneyFromInputs("-3", "USD")).toBeUndefined();
  expect(moneyFromInputs("0", "AED")).toEqual({ amount: 0, currency: "AED" });
  expect(moneyFromInputs("10.5", "EUR")).toEqual({
    amount: 10.5,
    currency: "EUR",
  });
});

test("money parse back: stored values show as plain digits", () => {
  expect(moneyToInputs({ amount: 1000000, currency: "GBP" })).toEqual({
    amountText: "1000000",
    currency: "GBP",
  });
  expect(moneyToInputs({ amount: 0, currency: "USD" })).toEqual({
    amountText: "0",
    currency: "USD",
  });
  expect(moneyToInputs(null)).toEqual({ amountText: "", currency: "USD" });
  expect(moneyToInputs("x", "AED")).toEqual({
    amountText: "",
    currency: "AED",
  });
  expect(moneyToInputs({ amount: 5 }, "AED")).toEqual({
    amountText: "5",
    currency: "AED",
  });
  expect(plainNumber(1e21)).not.toMatch(/e/i);
  expect(Number(plainNumber(1e21))).toBe(1e21);
});

test("currencies: the common list, plus any stored code", () => {
  for (const c of [
    "AED",
    "USD",
    "EUR",
    "GBP",
    "INR",
    "SAR",
    "SGD",
    "CAD",
    "AUD",
    "CHF",
    "JPY",
    "CNY",
  ]) {
    expect(COMMON_CURRENCIES).toContain(c);
  }
  expect(currencyOptions("USD")).toEqual([...COMMON_CURRENCIES]);
  expect(currencyOptions("KWD")).toEqual([...COMMON_CURRENCIES, "KWD"]);
  expect(currencyOptions("usd")).toEqual([...COMMON_CURRENCIES]); // not a valid code: not added
  expect(currencyLabel("USD")).toMatch(/^USD/);
});

test("percent: 0 to 100, two decimals, a third decimal is refused", () => {
  expect(parsePercentText("")).toEqual({ kind: "empty" });
  expect(parsePercentText("0")).toEqual({ kind: "ok", percent: 0 });
  expect(parsePercentText("100")).toEqual({ kind: "ok", percent: 100 });
  expect(parsePercentText("33.33")).toEqual({ kind: "ok", percent: 33.33 });
  expect(parsePercentText("12.5")).toEqual({ kind: "ok", percent: 12.5 });
  expect(parsePercentText("0.01")).toEqual({ kind: "ok", percent: 0.01 });
  expect(parsePercentText("33.333")).toEqual({
    kind: "invalid",
    code: "bad_percent",
  });
  expect(parsePercentText("100.01")).toEqual({
    kind: "invalid",
    code: "bad_percent",
  });
  expect(parsePercentText("101")).toEqual({
    kind: "invalid",
    code: "bad_percent",
  });
  expect(parsePercentText("-0.01")).toEqual({
    kind: "invalid",
    code: "bad_percent",
  });
  expect(parsePercentText("abc")).toEqual({
    kind: "invalid",
    code: "invalid_shape",
  });
  expect(parsePercentText("5%")).toEqual({
    kind: "invalid",
    code: "invalid_shape",
  });
});

test("percent typing: a third decimal and stray characters are refused, the previous text is kept", () => {
  expect(filterPercentTyping("33.3", "33.33")).toBe("33.33");
  expect(filterPercentTyping("33.33", "33.333")).toBe("33.33");
  expect(filterPercentTyping("", "abc")).toBe("");
  expect(filterPercentTyping("5", "5a")).toBe("5");
  expect(filterPercentTyping("5", "-5")).toBe("5");
  expect(filterPercentTyping("12", "1234")).toBe("12"); // four integer digits
  expect(filterPercentTyping("100", "")).toBe("");
  expect(filterPercentTyping("", "0.5")).toBe("0.5");
  expect(filterPercentTyping("1", "1.")).toBe("1.");
  expect(percentToText(33.33)).toBe("33.33");
  expect(percentToText(null)).toBe("");
});

test("date: only YYYY-MM-DD passes through", () => {
  expect(dateFromInput("2020-01-15")).toBe("2020-01-15");
  expect(dateFromInput("")).toBeUndefined();
  expect(dateFromInput("2020-1-15")).toBeUndefined();
  expect(dateFromInput("15/01/2020")).toBeUndefined();
});

test("countries: 249 unique ISO codes, each with an English name, sorted by name", () => {
  expect(COUNTRY_CODES.length).toBe(249);
  expect(new Set(COUNTRY_CODES).size).toBe(249);
  for (const c of COUNTRY_CODES) expect(c).toMatch(/^[A-Z]{2}$/);
  for (const reserved of ["UK", "EU", "XK", "UN", "AC", "TA"])
    expect(COUNTRY_CODES).not.toContain(reserved);
  const opts = countryOptions("en");
  expect(opts.length).toBe(249);
  expect(opts.find((o) => o.code === "AE")?.name).toBe("United Arab Emirates");
  expect(opts.find((o) => o.code === "GB")?.name).toBe("United Kingdom");
  expect(opts.every((o) => o.name !== o.code)).toBe(true);
  const names = opts.map((o) => o.name);
  expect([...names].sort((a, b) => a.localeCompare(b, "en"))).toEqual(names);
  expect(countryFromSelect("AE")).toBe("AE");
  expect(countryFromSelect("")).toBeUndefined();
  expect(countryFromSelect("ae")).toBeUndefined();
});

test("stable stringify ignores key order", () => {
  expect(stableStringify({ b: 1, a: { d: 2, c: [1, { z: 1, y: 2 }] } })).toBe(
    stableStringify({ a: { c: [1, { y: 2, z: 1 }], d: 2 }, b: 1 }),
  );
  expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  expect(stableStringify(null)).toBe("null");
  expect(stableStringify(undefined)).toBe("null");
});

test("repeatable rows: limits and where focus goes", () => {
  expect(canAddRow(14, 15)).toBe(true);
  expect(canAddRow(15, 15)).toBe(false);
  expect(canRemoveRow(2, 1)).toBe(true);
  expect(canRemoveRow(1, 1)).toBe(false);
  expect(focusAfterAdd(3)).toEqual({ kind: "row", index: 2 });
  expect(focusAfterRemove(2)).toEqual({ kind: "row", index: 1 });
  expect(focusAfterRemove(0)).toEqual({ kind: "add" });
});

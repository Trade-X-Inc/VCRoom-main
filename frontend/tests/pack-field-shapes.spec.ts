// Pure-logic tests (no browser, no network): runs every case in the shared field-shape-cases.json through the
// client validator. The same file is run through the SQL validator (dry run and a local Postgres), so a green
// run here plus a green run there means both sides agree on every verdict and error code.
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import {
  validateFieldValue,
  valueByteLength,
  MAX_VALUE_BYTES,
  FIELD_IDS,
} from "../src/lib/pack/field-shapes";
import {
  friendlyError,
  GENERIC_ERROR_MESSAGE,
} from "../src/lib/pack/pinned-schedule";

type Case = {
  field: string;
  label: string;
  value: unknown;
  valid: boolean;
  code: string | null;
};
const cases: Case[] = JSON.parse(
  readFileSync(
    new URL("../src/lib/pack/field-shape-cases.json", import.meta.url),
    "utf8",
  ),
).cases;

test("the case file covers all four fields with valid and invalid cases", () => {
  for (const f of Object.values(FIELD_IDS)) {
    expect(
      cases.filter((c) => c.field === f && c.valid).length,
    ).toBeGreaterThan(5);
    expect(
      cases.filter((c) => c.field === f && !c.valid).length,
    ).toBeGreaterThan(10);
  }
});

for (const c of cases) {
  test(`${c.field} | ${c.valid ? "valid" : "invalid"} | ${c.label}`, () => {
    const r = validateFieldValue(c.field, c.value);
    if (c.valid) expect(r).toEqual({ ok: true });
    else expect(r).toEqual({ ok: false, code: c.code });
  });
}

test("a date equal to today is accepted and tomorrow is a future date", () => {
  const base = {
    status: "incorporated",
    legal_name: "A",
    entity_type: "B",
    jurisdiction_country: "AE",
  };
  const today = "2026-10-18";
  expect(
    validateFieldValue(
      FIELD_IDS.incorporation,
      { ...base, incorporation_date: today },
      { today },
    ),
  ).toEqual({ ok: true });
  expect(
    validateFieldValue(
      FIELD_IDS.incorporation,
      { ...base, incorporation_date: "2026-10-19" },
      { today },
    ),
  ).toEqual({ ok: false, code: "future_date" });
});

test("every other field id is accepted unchanged on the client", () => {
  for (const id of [
    "tech.seed.problem_statement",
    "tech.seed.mrr",
    "tech.seed.runway_months",
    "nope",
  ]) {
    expect(validateFieldValue(id, "anything")).toEqual({ ok: true });
    expect(validateFieldValue(id, null)).toEqual({ ok: true });
  }
});

test("the size limit is 8192 bytes, measured as UTF-8 bytes of the jsonb-style text", () => {
  expect(MAX_VALUE_BYTES).toBe(8192);
  expect(valueByteLength({ a: 1 })).toBe('{"a": 1}'.length);
  expect(valueByteLength("é")).toBe(4); // two quotes + two UTF-8 bytes
  expect(valueByteLength("🚀")).toBe(6); // two quotes + four UTF-8 bytes
});

test("every error code in the cases has a plain-English message (not the generic fallback)", () => {
  const codes = new Set(
    cases.filter((c) => !c.valid).map((c) => c.code as string),
  );
  for (const code of codes) {
    expect(friendlyError(new Error(code))).not.toBe(GENERIC_ERROR_MESSAGE);
  }
});

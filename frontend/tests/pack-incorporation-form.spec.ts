// Pure-logic tests (no browser, no network) for the Incorporation form's state, emit and validation, and for the
// market size methodology value. The rules themselves are the ones in field-shapes.ts; these tests check that the
// form never emits a value the server would reject, using the same shared cases.
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import {
  validateFieldValue,
  validateFieldValueDetailed,
  FIELD_IDS,
} from "../src/lib/pack/field-shapes";
import {
  EMPTY_INCORPORATION,
  emitIncorporation,
  incorporationMessage,
  incorporationStateFromValue,
  incorporationSummaryLines,
  isPristineIncorporation,
  isRequiredKey,
  validateIncorporationForm,
  type IncorporationFormState,
} from "../src/lib/pack/incorporation-form";
import { moneyWithMethodology, stableStringify } from "../src/lib/pack/inputs";

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
const incCases = cases.filter((c) => c.field === FIELD_IDS.incorporation);
const TODAY = "2026-10-18";

const filled: IncorporationFormState = {
  ...EMPTY_INCORPORATION,
  status: "incorporated",
  legal_name: "Acme Robotics Ltd",
  entity_type: "Private limited company",
  jurisdiction_country: "AE",
  incorporation_date: "2020-01-15",
};

test("an untouched form is pristine and emits nothing", () => {
  expect(isPristineIncorporation(EMPTY_INCORPORATION)).toBe(true);
  expect(emitIncorporation(EMPTY_INCORPORATION)).toEqual({});
  expect(
    isPristineIncorporation({ ...EMPTY_INCORPORATION, legal_name: "x" }),
  ).toBe(false);
});

test("an incorporated form emits status and the filled keys, trimmed, without empty optionals", () => {
  const out = emitIncorporation({
    ...filled,
    legal_name: "  Acme Robotics Ltd  ",
    jurisdiction_region: "   ",
    registration_number: "REG-1",
  });
  expect(out).toEqual({
    status: "incorporated",
    legal_name: "Acme Robotics Ltd",
    entity_type: "Private limited company",
    jurisdiction_country: "AE",
    incorporation_date: "2020-01-15",
    registration_number: "REG-1",
  });
  expect(
    validateFieldValue(FIELD_IDS.incorporation, out, { today: TODAY }),
  ).toEqual({ ok: true });
});

test("switching to not yet incorporated drops every hidden value from the emitted object", () => {
  const typed = {
    ...filled,
    jurisdiction_region: "Dubai",
    registration_number: "REG-1",
    registered_address: "1 Example Street",
  };
  const switched = emitIncorporation({
    ...typed,
    status: "not_yet_incorporated",
  });
  expect(switched).toEqual({
    status: "not_yet_incorporated",
    jurisdiction_country: "AE",
    jurisdiction_region: "Dubai",
  });
  for (const hidden of [
    "legal_name",
    "entity_type",
    "incorporation_date",
    "registration_number",
    "registered_address",
  ]) {
    expect(switched).not.toHaveProperty(hidden);
  }
  expect(
    validateFieldValue(FIELD_IDS.incorporation, switched, { today: TODAY }),
  ).toEqual({ ok: true });
  // Switching back restores what was typed (the state is kept, only the emit is filtered).
  expect(emitIncorporation({ ...typed, status: "incorporated" })).toMatchObject(
    { legal_name: "Acme Robotics Ltd", registration_number: "REG-1" },
  );
  expect(
    emitIncorporation({
      ...EMPTY_INCORPORATION,
      status: "not_yet_incorporated",
    }),
  ).toEqual({ status: "not_yet_incorporated" });
});

test("state from a stored value is tolerant", () => {
  expect(incorporationStateFromValue(null)).toEqual(EMPTY_INCORPORATION);
  expect(incorporationStateFromValue([])).toEqual(EMPTY_INCORPORATION);
  expect(incorporationStateFromValue("x")).toEqual(EMPTY_INCORPORATION);
  expect(
    incorporationStateFromValue({ status: "maybe", legal_name: 5 }),
  ).toEqual(EMPTY_INCORPORATION);
  expect(
    incorporationStateFromValue({ status: "incorporated", legal_name: "A" }),
  ).toMatchObject({ status: "incorporated", legal_name: "A", entity_type: "" });
});

test("an invalid form gives a message per field and a summary, and is not valid", () => {
  const v = validateIncorporationForm(
    {
      ...filled,
      legal_name: "",
      jurisdiction_country: "",
      incorporation_date: "2099-01-01",
      registered_address: "x".repeat(301),
    },
    { today: TODAY },
  );
  expect(v.valid).toBe(false);
  expect(v.fieldErrors.legal_name).toBe("Legal name is required.");
  expect(v.fieldErrors.jurisdiction_country).toBe(
    "Country of incorporation is required.",
  );
  expect(v.fieldErrors.incorporation_date).toBe(
    "The date can't be in the future.",
  );
  expect(v.fieldErrors.registered_address).toBe(
    "Registered address must be 300 characters or fewer.",
  );
  expect(v.invalidKeys).toEqual([
    "legal_name",
    "jurisdiction_country",
    "incorporation_date",
    "registered_address",
  ]);
  expect(v.summary).toBe("Fix 4 items before saving.");
  const none = validateIncorporationForm(EMPTY_INCORPORATION, { today: TODAY });
  expect(none.valid).toBe(false);
  expect(none.fieldErrors.status).toMatch(/Choose whether/);
  expect(validateIncorporationForm(filled, { today: TODAY })).toMatchObject({
    valid: true,
    summary: null,
    invalidKeys: [],
  });
});

test("required markers follow the chosen status", () => {
  expect(isRequiredKey("incorporated", "legal_name")).toBe(true);
  expect(isRequiredKey("incorporated", "registration_number")).toBe(false);
  expect(isRequiredKey("not_yet_incorporated", "legal_name")).toBe(false);
  expect(isRequiredKey("", "status")).toBe(true);
});

test("messages are plain English for every code the form can raise, never a raw code", () => {
  for (const code of [
    "missing_required",
    "blank",
    "too_long",
    "bad_country",
    "bad_date",
    "future_date",
    "invalid_shape",
    "bad_enum",
    "unknown_key",
  ] as const) {
    const m = incorporationMessage(code, "legal_name");
    expect(m.length).toBeGreaterThan(5);
    expect(m).not.toBe(code);
    expect(m).not.toMatch(/_/);
  }
});

test("the read view shows labelled lines, with the country name, and nothing for an empty value", () => {
  expect(incorporationSummaryLines(null)).toEqual([]);
  const lines = incorporationSummaryLines({
    ...emitIncorporation(filled),
    registered_address: "1 Example Street\nDubai",
  });
  expect(lines[0]).toEqual({ label: "Status", text: "Incorporated" });
  expect(lines.find((l) => l.label === "Country of incorporation")?.text).toBe(
    "United Arab Emirates (AE)",
  );
  expect(lines.find((l) => l.label === "Legal name")?.text).toBe(
    "Acme Robotics Ltd",
  );
  const notYet = incorporationSummaryLines({
    status: "not_yet_incorporated",
    jurisdiction_country: "GB",
  });
  expect(notYet.map((l) => l.label)).toEqual([
    "Status",
    "Planned country of incorporation",
  ]);
  for (const l of lines) expect(l.text).not.toMatch(/[{}[\]]|undefined|null/);
});

test("every valid incorporation case round-trips through the form and still passes the validator", () => {
  const valid = incCases.filter((c) => c.valid);
  expect(valid.length).toBeGreaterThan(8);
  for (const c of valid) {
    const out = emitIncorporation(incorporationStateFromValue(c.value));
    expect(stableStringify(out), c.label).toBe(stableStringify(c.value));
    expect(validateFieldValue(FIELD_IDS.incorporation, out), c.label).toEqual({
      ok: true,
    });
    expect(
      validateIncorporationForm(incorporationStateFromValue(c.value)).valid,
      c.label,
    ).toBe(true);
  }
});

test("the form never emits an invalid case value: it is flagged, or the form could not have produced it", () => {
  const invalid = incCases.filter((c) => !c.valid);
  expect(invalid.length).toBeGreaterThan(30);
  for (const c of invalid) {
    const state = incorporationStateFromValue(c.value);
    const out = emitIncorporation(state);
    const v = validateIncorporationForm(state, { today: TODAY });
    if (stableStringify(out) === stableStringify(c.value)) {
      // The form would send this exact value, so it must refuse to save it.
      expect(v.valid, c.label).toBe(false);
      expect(Object.keys(v.fieldErrors).length, c.label).toBeGreaterThan(0);
    } else {
      // The form cannot produce the case's value (extra keys, wrong types, other status' keys): what it does emit
      // is either valid or flagged, never silently invalid.
      expect(
        validateFieldValue(FIELD_IDS.incorporation, out, { today: TODAY }).ok,
        c.label,
      ).toBe(v.valid);
    }
  }
});

test("each invalid emitted incorporation case reports the same code the shared case expects, on the right key", () => {
  for (const c of incCases.filter(
    (c) => !c.valid && c.code !== "value_too_large",
  )) {
    const r = validateFieldValueDetailed(FIELD_IDS.incorporation, c.value);
    expect(r.ok, c.label).toBe(false);
    if (!r.ok) expect(r.code, c.label).toBe(c.code);
  }
  expect(
    validateFieldValueDetailed(FIELD_IDS.incorporation, {
      status: "incorporated",
      legal_name: "A",
      entity_type: "B",
      jurisdiction_country: "us",
      incorporation_date: "2020-01-01",
    }),
  ).toEqual({ ok: false, code: "bad_country", path: "jurisdiction_country" });
  expect(
    validateFieldValueDetailed(FIELD_IDS.incorporation, {
      status: "incorporated",
    }),
  ).toEqual({ ok: false, code: "missing_required", path: "legal_name" });
});

test("market size: methodology is trimmed and left out when empty; an empty amount emits nothing", () => {
  expect(moneyWithMethodology("1000000", "USD", "")).toEqual({
    amount: 1000000,
    currency: "USD",
  });
  expect(moneyWithMethodology("1000000", "USD", "   ")).toEqual({
    amount: 1000000,
    currency: "USD",
  });
  expect(moneyWithMethodology("1000000", "USD", " Top-down ")).toEqual({
    amount: 1000000,
    currency: "USD",
    methodology: "Top-down",
  });
  expect(moneyWithMethodology("0", "AED", "x")).toEqual({
    amount: 0,
    currency: "AED",
    methodology: "x",
  });
  expect(moneyWithMethodology("", "USD", "Top-down")).toBeUndefined();
  expect(moneyWithMethodology("-1", "USD", "x")).toBeUndefined();
  const tam = FIELD_IDS.marketSizeTam;
  expect(
    validateFieldValue(tam, moneyWithMethodology("5", "USD", "a".repeat(500))),
  ).toEqual({ ok: true });
  expect(
    validateFieldValueDetailed(
      tam,
      moneyWithMethodology("5", "USD", "a".repeat(501)),
    ),
  ).toEqual({ ok: false, code: "too_long", path: "methodology" });
  expect(
    validateFieldValueDetailed(tam, { amount: -1, currency: "USD" }),
  ).toEqual({ ok: false, code: "money_amount_negative", path: "amount" });
});

// Pure-logic tests (no browser, no network) for the Team form: emit, parse and validation. The rules themselves are
// the ones in field-shapes.ts; these tests check that the form never emits a value the server would reject, using
// the shared cases.
import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { FIELD_IDS, validateFieldValue } from "../src/lib/pack/field-shapes";
import {
  EMPTY_TEAM_ROW,
  emitTeam,
  teamRowsFromValue,
  teamSummaryRows,
  validateTeamForm,
  type TeamRow,
} from "../src/lib/pack/team-form";
import { sizeIndicator } from "../src/lib/pack/list-form-common";
import { stableStringify } from "../src/lib/pack/inputs";

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
const teamCases = cases.filter((c) => c.field === FIELD_IDS.team);

const person = (o: Partial<TeamRow> = {}): TeamRow => ({
  ...EMPTY_TEAM_ROW,
  name: "Ada Example",
  role: "CEO",
  is_founder: true,
  ...o,
});
// ───────── team ─────────
test("team: a stored value that is not a list gives one empty row", () => {
  for (const v of [null, undefined, "x", 3, {}, []])
    expect(teamRowsFromValue(v)).toEqual([EMPTY_TEAM_ROW]);
});

test("team: emit trims, keeps real booleans, and leaves an empty LinkedIn URL out", () => {
  const out = emitTeam([
    person({ name: "  Ada Example  ", linkedin_url: "   " }),
    person({
      name: "Bo",
      role: "CTO",
      is_founder: false,
      full_time: true,
      linkedin_url: " https://linkedin.com/in/bo ",
    }),
  ]);
  expect(out[0]).toEqual({
    name: "Ada Example",
    role: "CEO",
    is_founder: true,
    full_time: false,
    is_director: false,
  });
  expect(out[0]).not.toHaveProperty("linkedin_url");
  expect(out[1]).toEqual({
    name: "Bo",
    role: "CTO",
    is_founder: false,
    full_time: true,
    is_director: false,
    linkedin_url: "https://linkedin.com/in/bo",
  });
  for (const r of out)
    for (const k of ["is_founder", "full_time", "is_director"])
      expect(typeof r[k]).toBe("boolean");
});

test("team: no field exists for personal identifiers", () => {
  const keys = Object.keys(
    emitTeam([person({ linkedin_url: "https://x.example/p" })])[0],
  );
  expect(keys.sort()).toEqual([
    "full_time",
    "is_director",
    "is_founder",
    "linkedin_url",
    "name",
    "role",
  ]);
});

test("team: a valid two-person list passes", () => {
  const v = validateTeamForm([
    person(),
    person({ name: "Bo", role: "CTO", is_founder: false }),
  ]);
  expect(v).toMatchObject({
    valid: true,
    summary: null,
    invalidKeys: [],
    formErrors: [],
  });
  expect(validateFieldValue(FIELD_IDS.team, v.value)).toEqual({ ok: true });
});

test("team: no founder is a form-level message, not a row message", () => {
  const v = validateTeamForm([person({ is_founder: false })]);
  expect(v.valid).toBe(false);
  expect(v.formCodes).toEqual(["no_founder"]);
  expect(v.formErrors).toEqual(["Mark at least one team member as a founder."]);
  expect(v.fieldErrors).toEqual({});
});

test("team: row messages name the field and the row", () => {
  const v = validateTeamForm([
    person({ name: "  ", role: "" }),
    person({
      name: "Bo",
      role: "CTO",
      linkedin_url: "http://linkedin.com/in/bo",
    }),
  ]);
  expect(v.fieldErrors["0.name"]).toBe("Name is required.");
  expect(v.fieldErrors["0.role"]).toBe("Role is required.");
  expect(v.fieldErrors["1.linkedin_url"]).toBe(
    "Enter a web address that starts with https://.",
  );
  expect(v.invalidKeys).toEqual(["0.name", "0.role", "1.linkedin_url"]);
  expect(v.summary).toBe("Fix 3 items before saving.");
  expect(
    validateTeamForm([person({ name: "x".repeat(121) })]).fieldErrors["0.name"],
  ).toBe("Name must be 120 characters or fewer.");
  expect(
    validateTeamForm([person({ linkedin_url: "https://" + "a".repeat(300) })])
      .fieldErrors["0.linkedin_url"],
  ).toBe("LinkedIn URL must be 300 characters or fewer.");
});

test("team: 15 rows are allowed and 16 are refused at the form level", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => person({ name: `P${i}` }));
  expect(validateTeamForm(rows(15)).valid).toBe(true);
  const v = validateTeamForm(rows(16));
  expect(v.valid).toBe(false);
  expect(v.formCodes).toContain("too_many_items");
});

test("team: a list too large to send is refused, never shortened", () => {
  const big = Array.from({ length: 15 }, (_, i) =>
    person({
      name: "n".repeat(120),
      role: "r".repeat(120),
      linkedin_url: "https://" + "a".repeat(290),
      is_founder: i === 0,
    }),
  );
  const v = validateTeamForm(big);
  expect(sizeIndicator(v.value).over).toBe(true);
  expect(v.valid).toBe(false);
  expect(v.formCodes).toContain("value_too_large");
  // The emitted value is the full text, not a truncated copy.
  expect((v.value[0] as { name: string }).name.length).toBe(120);
});

test("team: summary rows are labelled text", () => {
  const rows = teamSummaryRows([
    {
      name: "Ada",
      role: "CEO",
      is_founder: true,
      full_time: true,
      is_director: false,
    },
  ]);
  expect(rows).toEqual([
    { name: "Ada", role: "CEO", flags: "Founder · Full-time", linkedin: "" },
  ]);
  expect(teamSummaryRows(null)).toEqual([]);
});

// ───────── size indicator ─────────
test("size indicator: exactly 8192 bytes is allowed, 8193 is over", () => {
  // A string value is its text plus two quotes.
  const exact = sizeIndicator("a".repeat(8190));
  expect(exact).toMatchObject({
    bytes: 8192,
    remaining: 0,
    over: false,
    text: "0 of 8192 bytes left",
  });
  const over = sizeIndicator("a".repeat(8191));
  expect(over).toMatchObject({
    bytes: 8193,
    remaining: -1,
    over: true,
    text: "1 bytes over the 8192 byte limit",
  });
  expect(sizeIndicator([]).bytes).toBe(2);
  // Multi-byte characters count as UTF-8 bytes.
  expect(sizeIndicator("é").bytes).toBe(4);
});

// ───────── the shared cases ─────────
test("every valid team case round-trips through the form and passes the validator", () => {
  const valid = teamCases.filter((c) => c.valid);
  expect(valid.length).toBeGreaterThanOrEqual(10);
  for (const c of valid) {
    const v = validateTeamForm(teamRowsFromValue(c.value));
    expect(stableStringify(v.value), c.label).toBe(stableStringify(c.value));
    expect(validateFieldValue(c.field, v.value), c.label).toEqual({ ok: true });
    expect(v.valid, c.label).toBe(true);
  }
});

test("the form never emits an invalid team case unchanged: it is flagged, or the form could not have produced it", () => {
  const invalid = teamCases.filter((c) => !c.valid);
  expect(invalid.length).toBeGreaterThan(30);
  for (const c of invalid) {
    const v = validateTeamForm(teamRowsFromValue(c.value));
    if (stableStringify(v.value) === stableStringify(c.value))
      expect(v.valid, c.label).toBe(false);
    if (v.valid)
      expect(validateFieldValue(c.field, v.value), c.label).toEqual({
        ok: true,
      });
  }
});

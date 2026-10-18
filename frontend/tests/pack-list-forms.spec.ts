// Pure-logic tests (no browser, no network) for the Team and Cap table forms: emit, parse, validation, the running
// total, the 25% notice and the size indicator. The rules themselves are the ones in field-shapes.ts; these tests
// check that the forms never emit a value the server would reject, using the shared cases.
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
import {
  EMPTY_CAP_ROW,
  capRowsFromValue,
  capSummaryRows,
  capTotal,
  emitCapTable,
  ownerCandidateNotice,
  validateCapTableForm,
  type CapRow,
} from "../src/lib/pack/cap-table-form";
import { sizeIndicator } from "../src/lib/pack/list-form-common";
import { parseSharesText, stableStringify } from "../src/lib/pack/inputs";

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
const capCases = cases.filter((c) => c.field === FIELD_IDS.capTable);

const person = (o: Partial<TeamRow> = {}): TeamRow => ({
  ...EMPTY_TEAM_ROW,
  name: "Ada Example",
  role: "CEO",
  is_founder: true,
  ...o,
});
const holder = (o: Partial<CapRow> = {}): CapRow => ({
  ...EMPTY_CAP_ROW,
  holder_name: "Ada Example",
  holder_kind: "person",
  holder_type: "founder",
  ownership_percent: "50",
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

// ───────── cap table ─────────
test("cap table: a stored value that is not a list gives one empty row", () => {
  for (const v of [null, undefined, "x", {}, []])
    expect(capRowsFromValue(v)).toEqual([EMPTY_CAP_ROW]);
});

test("cap table: emit gives real numbers, omits empty optionals and keeps two decimals", () => {
  const out = emitCapTable([
    holder({ ownership_percent: "33.33", share_class: "  ", shares: "" }),
    holder({
      holder_name: "Fund",
      holder_kind: "company",
      holder_type: "investor",
      ownership_percent: "12.5",
      share_class: " Series A ",
      shares: "1000",
    }),
  ]);
  expect(out[0]).toEqual({
    holder_name: "Ada Example",
    holder_kind: "person",
    holder_type: "founder",
    ownership_percent: 33.33,
  });
  expect(out[1]).toEqual({
    holder_name: "Fund",
    holder_kind: "company",
    holder_type: "investor",
    ownership_percent: 12.5,
    share_class: "Series A",
    shares: 1000,
  });
  expect(Number.isInteger(out[1].shares)).toBe(true);
  expect(typeof out[1].ownership_percent).toBe("number");
});

test("cap table: shares text becomes an integer, or is refused", () => {
  expect(parseSharesText("")).toEqual({ kind: "empty" });
  expect(parseSharesText("0")).toEqual({ kind: "ok", shares: 0 });
  expect(parseSharesText(" 1000 ")).toEqual({ kind: "ok", shares: 1000 });
  for (const t of ["-5", "1.5", "-1.5"])
    expect(parseSharesText(t)).toEqual({ kind: "invalid", code: "bad_shares" });
  for (const t of ["abc", "1e3", "1,000"])
    expect(parseSharesText(t)).toEqual({
      kind: "invalid",
      code: "invalid_shape",
    });
  expect(parseSharesText("9".repeat(20))).toEqual({
    kind: "invalid",
    code: "bad_shares",
  });
});

test("cap table: percent and shares problems are reported on their own field", () => {
  const v = validateCapTableForm([
    holder({ ownership_percent: "100.01", shares: "-5" }),
    holder({ ownership_percent: "33.333" }),
    holder({
      holder_name: "",
      holder_kind: "",
      holder_type: "",
      ownership_percent: "",
    }),
  ]);
  expect(v.valid).toBe(false);
  expect(v.fieldErrors["0.ownership_percent"]).toBe(
    "Enter a percentage from 0 to 100 with at most two decimals.",
  );
  expect(v.fieldErrors["0.shares"]).toBe(
    "Enter a whole number of shares, zero or more.",
  );
  expect(v.fieldErrors["1.ownership_percent"]).toBe(
    "Enter a percentage from 0 to 100 with at most two decimals.",
  );
  expect(v.fieldErrors["2.holder_name"]).toBe("Holder name is required.");
  expect(v.fieldErrors["2.holder_kind"]).toBe(
    "Choose whether the holder is a person, a company or a pool.",
  );
  expect(v.fieldErrors["2.holder_type"]).toBe("Choose a holder type.");
  expect(v.fieldErrors["2.ownership_percent"]).toBe("Ownership is required.");
});

test("cap table: 30 rows are allowed and 31 are refused at the form level", () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      holder({ holder_name: `H${i}`, ownership_percent: "1" }),
    );
  expect(validateCapTableForm(rows(30)).valid).toBe(true);
  expect(validateCapTableForm(rows(31)).formCodes).toContain("too_many_items");
});

test("cap table: the running total at 0, 87.5, 100 and 100.01", () => {
  const t = (...p: string[]) =>
    capTotal(p.map((x) => holder({ ownership_percent: x })));
  expect(t("")).toMatchObject({ state: "empty", total: 0, text: "Total 0%" });
  expect(t("50", "37.5")).toMatchObject({
    state: "under",
    total: 87.5,
    text: "Total 87.5% - cap tables normally add up to 100%",
  });
  expect(t("50", "50")).toMatchObject({
    state: "ok",
    total: 100,
    text: "Total 100%",
  });
  expect(t("33.33", "33.33", "33.34")).toMatchObject({
    state: "ok",
    total: 100,
  });
  expect(t("0.1", "0.2")).toMatchObject({ total: 0.3 });
  expect(t("50", "50.01")).toMatchObject({ state: "over", total: 100.01 });
  expect(t("50", "50.01").text).toMatch(/^Total 100\.01% - /);
  // Unusable text does not count.
  expect(t("50", "abc", "-1")).toMatchObject({
    state: "under",
    total: 50,
    entered: 1,
  });
});

test("cap table: a total that is not 100 never blocks saving", () => {
  for (const [a, b] of [
    ["50", "37.5"],
    ["50", "50.01"],
    ["10", ""],
  ] as const) {
    const rows = [
      holder({ ownership_percent: a }),
      holder({
        holder_name: "Fund",
        holder_kind: "company",
        holder_type: "investor",
        ownership_percent: b || "5",
      }),
    ];
    const v = validateCapTableForm(rows);
    expect(v.valid, `${a}+${b}`).toBe(true);
    expect(validateFieldValue(FIELD_IDS.capTable, v.value)).toEqual({
      ok: true,
    });
  }
});

test("cap table: the 25% notice at 24.99 and 25 for a person, a company and a pool", () => {
  const n = (kind: CapRow["holder_kind"], pct: string) =>
    ownerCandidateNotice(holder({ holder_kind: kind, ownership_percent: pct }));
  expect(n("person", "24.99")).toBeNull();
  expect(n("person", "25")).toBe(
    "Holds 25% or more. People at this level may be asked to verify their identity if a deal proceeds.",
  );
  expect(n("person", "100")).not.toBeNull();
  expect(n("company", "24.99")).toBeNull();
  expect(n("company", "25")).toBe(
    "Holds 25% or more. We may ask who owns this company.",
  );
  expect(n("pool", "40")).toBeNull();
  expect(n("", "40")).toBeNull();
  expect(n("person", "")).toBeNull();
  expect(n("person", "abc")).toBeNull();
});

test("cap table: the notice is display only, never part of the value", () => {
  const out = JSON.stringify(
    emitCapTable([holder({ ownership_percent: "60" })]),
  );
  expect(out).not.toMatch(/Holds 25%|notice|identity|who owns/i);
});

test("cap table: summary rows use human labels", () => {
  expect(
    capSummaryRows([
      {
        holder_name: "Fund",
        holder_kind: "company",
        holder_type: "employee_pool",
        ownership_percent: 12.5,
        shares: 12000,
      },
    ]),
  ).toEqual([
    {
      holder: "Fund",
      kind: "Company",
      type: "Employee pool",
      ownership: "12.5%",
      shareClass: "",
      shares: "12,000",
    },
  ]);
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
test("every valid team and cap table case round-trips through the form and passes the validator", () => {
  const valid = [...teamCases, ...capCases].filter((c) => c.valid);
  expect(valid.length).toBeGreaterThanOrEqual(26);
  for (const c of valid) {
    const isTeam = c.field === FIELD_IDS.team;
    const v = isTeam
      ? validateTeamForm(teamRowsFromValue(c.value))
      : validateCapTableForm(capRowsFromValue(c.value));
    expect(stableStringify(v.value), c.label).toBe(stableStringify(c.value));
    expect(validateFieldValue(c.field, v.value), c.label).toEqual({ ok: true });
    expect(v.valid, c.label).toBe(true);
  }
});

test("the forms never emit an invalid case unchanged: it is flagged, or the form could not have produced it", () => {
  const invalid = [...teamCases, ...capCases].filter((c) => !c.valid);
  expect(invalid.length).toBeGreaterThan(60);
  for (const c of invalid) {
    const isTeam = c.field === FIELD_IDS.team;
    const v = isTeam
      ? validateTeamForm(teamRowsFromValue(c.value))
      : validateCapTableForm(capRowsFromValue(c.value));
    if (stableStringify(v.value) === stableStringify(c.value))
      expect(v.valid, c.label).toBe(false);
    // Whatever the form calls valid is something the server accepts.
    if (v.valid)
      expect(validateFieldValue(c.field, v.value), c.label).toEqual({
        ok: true,
      });
  }
});

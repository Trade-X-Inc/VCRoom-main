// Client-side mirror of the server's shape rules for four pack fields (tech.seed.incorporation,
// tech.seed.team, tech.seed.cap_table, tech.seed.market_size_tam). Pure: no React, router or server imports.
//
// The server is the authority: pack_api.pack_field_set runs pack_field_value_matches_type and then
// pack_api.pack_structured_value_valid (supabase/drafts/DRAFT_pack_field_validators.sql). This module
// returns the SAME verdict and the SAME error code for the same value, in the same order of checks, so a form
// can show the server's message before sending. Both are tested against one case file,
// field-shape-cases.json (tests/pack-field-shapes.spec.ts here, the dry run and a local Postgres run there).
//
// Order of checks: null -> value_required; top-level type; size (8192 bytes); then the field rules, item by
// item. The first failing rule wins. A blank string is one made only of ASCII whitespace (space, tab, newline,
// vertical tab, form feed, carriage return). String lengths count Unicode code points.
// Any other field id is accepted here ({ ok: true }); the server still validates every field.

export const MAX_VALUE_BYTES = 8192;

export const FIELD_IDS = {
  incorporation: "tech.seed.incorporation",
  team: "tech.seed.team",
  capTable: "tech.seed.cap_table",
  marketSizeTam: "tech.seed.market_size_tam",
} as const;

export type FieldShapeCode =
  | "value_required"
  | "value_too_large"
  | "expected_object_or_array"
  | "expected_money_object_with_amount_and_3letter_currency"
  | "money_amount_negative"
  | "invalid_shape"
  | "missing_required"
  | "unknown_key"
  | "blank"
  | "too_long"
  | "bad_enum"
  | "bad_country"
  | "bad_date"
  | "future_date"
  | "bad_percent"
  | "bad_shares"
  | "bad_url"
  | "no_founder"
  | "too_few_items"
  | "too_many_items";

export type FieldShapeResult =
  | { ok: true }
  | { ok: false; code: FieldShapeCode };

const OK: FieldShapeResult = { ok: true };
const fail = (code: FieldShapeCode): FieldShapeResult => ({ ok: false, code });

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const has = (o: Obj, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const BLANK = /^[ \t\n\v\f\r]*$/;
const URL_RE = /^https:\/\/[^ \t\n\v\f\r]+$/;
const codePoints = (s: string) => [...s].length;

// Text of the value the way Postgres renders jsonb (", " and ": " separators). Used only for the size limit.
// Numbers print the JavaScript way, which can differ from jsonb by a trailing zero; the server decides at the
// exact boundary.
export function jsonbText(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(jsonbText).join(", ") + "]";
  return (
    "{" +
    Object.keys(v as Obj)
      .map((k) => JSON.stringify(k) + ": " + jsonbText((v as Obj)[k]))
      .join(", ") +
    "}"
  );
}

export function valueByteLength(v: unknown): number {
  return new TextEncoder().encode(jsonbText(v)).length;
}

// One string key: type, blank, length. Returns a failure or null.
function checkString(
  o: Obj,
  key: string,
  max: number | null,
): FieldShapeResult | null {
  if (!has(o, key)) return null;
  const v = o[key];
  if (typeof v !== "string") return fail("invalid_shape");
  if (BLANK.test(v)) return fail("blank");
  if (max !== null && codePoints(v) > max) return fail("too_long");
  return null;
}
const unknownKey = (o: Obj, allowed: readonly string[]) =>
  Object.keys(o).some((k) => !allowed.includes(k));
const missingKey = (o: Obj, required: readonly string[]) =>
  required.some((k) => !has(o, k));

function realDate(s: string): boolean {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1 || mo < 1 || mo > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    mo - 1
  ];
  return d <= dim;
}

type Issue = { code: FieldShapeCode; path: string };

// Every problem in an incorporation value, in the order the server would report them: the FIRST issue is exactly
// what validateFieldValue returns. `path` is the key the problem belongs to ("" for the value as a whole), so a form
// can show each message beside its own field.
function incorporationIssues(v: unknown, today: string): Issue[] {
  if (!isObj(v)) return [{ code: "invalid_shape", path: "" }];
  const issues: Issue[] = [];
  const all = [
    "status",
    "legal_name",
    "entity_type",
    "jurisdiction_country",
    "jurisdiction_region",
    "incorporation_date",
    "registration_number",
    "registered_address",
  ];
  for (const k of Object.keys(v))
    if (!all.includes(k)) issues.push({ code: "unknown_key", path: k });
  if (!has(v, "status"))
    return [...issues, { code: "missing_required", path: "status" }];
  if (typeof v.status !== "string")
    return [...issues, { code: "invalid_shape", path: "status" }];
  if (v.status !== "incorporated" && v.status !== "not_yet_incorporated")
    return [...issues, { code: "bad_enum", path: "status" }];
  if (v.status === "not_yet_incorporated") {
    for (const k of Object.keys(v)) {
      if (
        !["status", "jurisdiction_country", "jurisdiction_region"].includes(
          k,
        ) &&
        all.includes(k)
      )
        issues.push({ code: "unknown_key", path: k });
    }
  } else {
    for (const k of [
      "legal_name",
      "entity_type",
      "jurisdiction_country",
      "incorporation_date",
    ]) {
      if (!has(v, k)) issues.push({ code: "missing_required", path: k });
    }
  }
  const specs: [string, number | null][] = [
    ["legal_name", 200],
    ["entity_type", 100],
    ["jurisdiction_country", null],
    ["jurisdiction_region", 100],
    ["incorporation_date", null],
    ["registration_number", 64],
    ["registered_address", 300],
  ];
  for (const [key, max] of specs) {
    const r = checkString(v, key, max);
    if (r && !r.ok) {
      issues.push({ code: r.code, path: key });
      continue;
    }
    if (!has(v, key)) continue;
    const s = v[key] as string;
    if (key === "jurisdiction_country" && !/^[A-Z]{2}$/.test(s))
      issues.push({ code: "bad_country", path: key });
    if (key === "incorporation_date") {
      if (!realDate(s)) issues.push({ code: "bad_date", path: key });
      else if (s > today) issues.push({ code: "future_date", path: key });
    }
  }
  return issues;
}

function incorporation(v: unknown, today: string): FieldShapeResult {
  const first = incorporationIssues(v, today)[0];
  return first ? fail(first.code) : OK;
}

// First problem per key for an incorporation value (for showing each message beside its field). Keys the
// whole-value checks (size, wrong top-level type) report under "".
export function incorporationFieldErrors(
  value: unknown,
  opts?: { today?: string },
): Record<string, FieldShapeCode> {
  const out: Record<string, FieldShapeCode> = {};
  if (valueByteLength(value) > MAX_VALUE_BYTES)
    return { "": "value_too_large" };
  for (const i of incorporationIssues(value, opts?.today ?? todayUtc()))
    if (!(i.path in out)) out[i.path] = i.code;
  return out;
}

function team(v: unknown): FieldShapeResult {
  if (!Array.isArray(v)) return fail("invalid_shape");
  if (v.length < 1) return fail("too_few_items");
  if (v.length > 15) return fail("too_many_items");
  let founder = false;
  for (const item of v) {
    if (!isObj(item)) return fail("invalid_shape");
    if (
      unknownKey(item, [
        "name",
        "role",
        "is_founder",
        "full_time",
        "is_director",
        "linkedin_url",
      ])
    )
      return fail("unknown_key");
    if (
      missingKey(item, [
        "name",
        "role",
        "is_founder",
        "full_time",
        "is_director",
      ])
    )
      return fail("missing_required");
    for (const [key, max] of [
      ["name", 120],
      ["role", 120],
      ["linkedin_url", 300],
    ] as [string, number][]) {
      const r = checkString(item, key, max);
      if (r) return r;
      if (
        key === "linkedin_url" &&
        has(item, key) &&
        !URL_RE.test(item[key] as string)
      )
        return fail("bad_url");
    }
    for (const key of ["is_founder", "full_time", "is_director"]) {
      if (typeof item[key] !== "boolean") return fail("invalid_shape");
    }
    if (item.is_founder === true) founder = true;
  }
  return founder ? OK : fail("no_founder");
}

const HOLDER_KINDS = ["person", "company", "pool"];
const HOLDER_TYPES = [
  "founder",
  "investor",
  "employee_pool",
  "advisor",
  "other",
];

function capTable(v: unknown): FieldShapeResult {
  if (!Array.isArray(v)) return fail("invalid_shape");
  if (v.length < 1) return fail("too_few_items");
  if (v.length > 30) return fail("too_many_items");
  for (const item of v) {
    if (!isObj(item)) return fail("invalid_shape");
    if (
      unknownKey(item, [
        "holder_name",
        "holder_kind",
        "holder_type",
        "ownership_percent",
        "share_class",
        "shares",
      ])
    )
      return fail("unknown_key");
    if (
      missingKey(item, [
        "holder_name",
        "holder_kind",
        "holder_type",
        "ownership_percent",
      ])
    )
      return fail("missing_required");
    for (const [key, max] of [
      ["holder_name", 120],
      ["share_class", 60],
    ] as [string, number][]) {
      const r = checkString(item, key, max);
      if (r) return r;
    }
    for (const [key, allowed] of [
      ["holder_kind", HOLDER_KINDS],
      ["holder_type", HOLDER_TYPES],
    ] as [string, string[]][]) {
      if (typeof item[key] !== "string") return fail("invalid_shape");
      if (!allowed.includes(item[key] as string)) return fail("bad_enum");
    }
    const pct = item.ownership_percent;
    if (typeof pct !== "number") return fail("invalid_shape");
    // At most two decimals: the tolerance absorbs binary rounding of values such as 0.07 * 100.
    if (
      pct < 0 ||
      pct > 100 ||
      Math.abs(pct * 100 - Math.round(pct * 100)) > 1e-9
    )
      return fail("bad_percent");
    if (has(item, "shares")) {
      if (typeof item.shares !== "number") return fail("invalid_shape");
      if (item.shares < 0 || !Number.isInteger(item.shares))
        return fail("bad_shares");
    }
  }
  return OK;
}

function marketSizeTam(v: unknown): FieldShapeResult {
  // Existing money rules first (pack_field_value_matches_type), with amount and currency required.
  if (!isObj(v))
    return fail("expected_money_object_with_amount_and_3letter_currency");
  if (
    typeof v.amount !== "number" ||
    typeof v.currency !== "string" ||
    !/^[A-Z]{3}$/.test(v.currency)
  ) {
    return fail("expected_money_object_with_amount_and_3letter_currency");
  }
  if (v.amount < 0) return fail("money_amount_negative");
  return OK;
}

export const todayUtc = () => new Date().toISOString().slice(0, 10);

export function validateFieldValue(
  fieldId: string,
  value: unknown,
  opts?: { today?: string },
): FieldShapeResult {
  const covered = (Object.values(FIELD_IDS) as string[]).includes(fieldId);
  if (!covered) return OK;
  if (value === null || value === undefined) return fail("value_required");
  if (fieldId === FIELD_IDS.marketSizeTam) {
    const money = marketSizeTam(value);
    if (!money.ok) return money;
  } else if (typeof value !== "object") {
    return fail("expected_object_or_array");
  }
  if (valueByteLength(value) > MAX_VALUE_BYTES) return fail("value_too_large");
  switch (fieldId) {
    case FIELD_IDS.incorporation:
      return incorporation(value, opts?.today ?? todayUtc());
    case FIELD_IDS.team:
      return team(value);
    case FIELD_IDS.capTable:
      return capTable(value);
    default: {
      // market_size_tam: optional methodology.
      const r = checkString(value as Obj, "methodology", 500);
      return r ?? OK;
    }
  }
}

export type FieldShapeDetail =
  | { ok: true }
  | { ok: false; code: FieldShapeCode; path: string };

// Same verdict as validateFieldValue, plus the key the problem belongs to when the field has named keys
// (incorporation, market size). "" means the value as a whole.
export function validateFieldValueDetailed(
  fieldId: string,
  value: unknown,
  opts?: { today?: string },
): FieldShapeDetail {
  const r = validateFieldValue(fieldId, value, opts);
  if (r.ok) return r;
  let path = "";
  if (fieldId === FIELD_IDS.incorporation && r.code !== "value_too_large") {
    path = incorporationIssues(value, opts?.today ?? todayUtc())[0]?.path ?? "";
  } else if (fieldId === FIELD_IDS.marketSizeTam) {
    if (r.code === "money_amount_negative") path = "amount";
    else if (
      ["blank", "too_long"].includes(r.code) ||
      (r.code === "invalid_shape" && isObj(value) && has(value, "methodology"))
    )
      path = "methodology";
    else if (
      r.code === "expected_money_object_with_amount_and_3letter_currency" &&
      isObj(value)
    ) {
      path = typeof value.amount !== "number" ? "amount" : "currency";
    }
  }
  return { ok: false, code: r.code, path };
}

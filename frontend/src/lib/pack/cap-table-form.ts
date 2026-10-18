// State, emit and validation for the Cap table form (tech.seed.cap_table). Pure: no React. Per-row messages come
// from capTableIssues() in field-shapes.ts; the running total and the 25% notice are display only and never part
// of the value.
import {
  FIELD_IDS,
  capTableIssues,
  valueByteLength,
  MAX_VALUE_BYTES,
  type FieldShapeCode,
} from "@/lib/pack/field-shapes";
import { ERROR_MESSAGES } from "@/lib/pack/pinned-schedule";
import {
  parsePercentText,
  parseSharesText,
  percentToText,
  plainNumber,
} from "@/lib/pack/inputs";
import { listSummary, type ListValidation } from "@/lib/pack/list-form-common";

export const CAP_TABLE_FIELD_ID = FIELD_IDS.capTable;
export const CAP_TABLE_LIMITS = { min: 1, max: 30 } as const;

export const HOLDER_KINDS = ["person", "company", "pool"] as const;
export const HOLDER_TYPES = [
  "founder",
  "investor",
  "employee_pool",
  "advisor",
  "other",
] as const;
export const HOLDER_KIND_LABELS: Record<string, string> = {
  person: "Person",
  company: "Company",
  pool: "Pool",
};
export const HOLDER_TYPE_LABELS: Record<string, string> = {
  founder: "Founder",
  investor: "Investor",
  employee_pool: "Employee pool",
  advisor: "Advisor",
  other: "Other",
};

export type CapRow = {
  holder_name: string;
  holder_kind: "" | (typeof HOLDER_KINDS)[number];
  holder_type: "" | (typeof HOLDER_TYPES)[number];
  /** What was typed; parsed by parsePercentText. */
  ownership_percent: string;
  share_class: string;
  /** What was typed; parsed by parseSharesText. */
  shares: string;
};

export const EMPTY_CAP_ROW: CapRow = {
  holder_name: "",
  holder_kind: "",
  holder_type: "",
  ownership_percent: "",
  share_class: "",
  shares: "",
};

export const CAP_LABELS: Record<string, string> = {
  holder_name: "Holder name",
  holder_kind: "Holder is a",
  holder_type: "Holder type",
  ownership_percent: "Ownership",
  share_class: "Share class",
  shares: "Shares",
};
const CAP_MAX: Record<string, number> = { holder_name: 120, share_class: 60 };

const str = (v: unknown) => (typeof v === "string" ? v : "");
const oneOf = <T extends string>(v: unknown, list: readonly T[]): "" | T =>
  typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : "";

// The rows a stored value shows in the form. Tolerant: anything that is not a list of objects gives one empty row.
export function capRowsFromValue(value: unknown): CapRow[] {
  if (!Array.isArray(value)) return [{ ...EMPTY_CAP_ROW }];
  const rows = value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      holder_name: str(v.holder_name),
      holder_kind: oneOf(v.holder_kind, HOLDER_KINDS),
      holder_type: oneOf(v.holder_type, HOLDER_TYPES),
      ownership_percent: percentToText(v.ownership_percent),
      share_class: str(v.share_class),
      shares:
        typeof v.shares === "number" && Number.isFinite(v.shares)
          ? plainNumber(v.shares)
          : "",
    }));
  return rows.length ? rows : [{ ...EMPTY_CAP_ROW }];
}

// What would be sent. Optional text is left out when empty; the percentage and shares are real JSON numbers
// (shares an integer), left out when empty or unusable (the form shows what is wrong with the text).
export function emitCapTable(rows: CapRow[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const o: Record<string, unknown> = { holder_name: r.holder_name.trim() };
    if (r.holder_kind) o.holder_kind = r.holder_kind;
    if (r.holder_type) o.holder_type = r.holder_type;
    const p = parsePercentText(r.ownership_percent);
    if (p.kind === "ok") o.ownership_percent = p.percent;
    const sc = r.share_class.trim();
    if (sc !== "") o.share_class = sc;
    const sh = parseSharesText(r.shares);
    if (sh.kind === "ok") o.shares = sh.shares;
    return o;
  });
}

export function capMessage(code: FieldShapeCode, key: string): string {
  const label = CAP_LABELS[key] ?? "This item";
  if (key === "holder_kind" && code !== "too_long")
    return "Choose whether the holder is a person, a company or a pool.";
  if (key === "holder_type" && code !== "too_long")
    return "Choose a holder type.";
  if (key === "ownership_percent" && code === "missing_required")
    return "Ownership is required.";
  if (code === "missing_required" || code === "blank")
    return `${label} is required.`;
  if (code === "too_long" && CAP_MAX[key])
    return `${label} must be ${CAP_MAX[key]} characters or fewer.`;
  const m = (ERROR_MESSAGES as Record<string, string>)[code];
  return m ?? "Check this entry.";
}

export function validateCapTableForm(rows: CapRow[]): ListValidation {
  const value = emitCapTable(rows);
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];
  const formCodes: FieldShapeCode[] = [];
  const formProblem = (code: FieldShapeCode, message: string) => {
    if (!formCodes.includes(code)) {
      formCodes.push(code);
      formErrors.push(message);
    }
  };
  if (valueByteLength(value) > MAX_VALUE_BYTES)
    formProblem("value_too_large", ERROR_MESSAGES.value_too_large);
  // Text that could not become a number is reported with its own message, not as "required".
  rows.forEach((r, i) => {
    const p = parsePercentText(r.ownership_percent);
    if (p.kind === "invalid")
      fieldErrors[`${i}.ownership_percent`] = ERROR_MESSAGES[p.code];
    const sh = parseSharesText(r.shares);
    if (sh.kind === "invalid")
      fieldErrors[`${i}.shares`] = ERROR_MESSAGES[sh.code];
  });
  for (const i of capTableIssues(value)) {
    if (i.row === null) {
      if (i.code === "too_many_items" || i.code === "too_few_items")
        formProblem(i.code, ERROR_MESSAGES[i.code]);
      continue;
    }
    const k = `${i.row}.${i.key}`;
    if (!(k in fieldErrors)) fieldErrors[k] = capMessage(i.code, i.key);
  }
  const invalidKeys = Object.keys(fieldErrors);
  return {
    value,
    fieldErrors,
    formErrors,
    formCodes,
    valid: invalidKeys.length === 0 && formErrors.length === 0,
    summary: listSummary(invalidKeys.length + formErrors.length),
    invalidKeys,
  };
}

// ───────── running total (display only) ─────────
export type CapTotal = {
  /** Sum of the valid percentages, in percent, exact to two decimals. */
  total: number;
  /** How many rows have a usable percentage. */
  entered: number;
  state: "empty" | "ok" | "under" | "over";
  /** Short label for the total line. */
  text: string;
};

export function capTotal(rows: CapRow[]): CapTotal {
  let cents = 0;
  let entered = 0;
  for (const r of rows) {
    const p = parsePercentText(r.ownership_percent);
    if (p.kind === "ok") {
      cents += Math.round(p.percent * 100);
      entered += 1;
    }
  }
  const total = cents / 100;
  if (entered === 0)
    return { total: 0, entered, state: "empty", text: "Total 0%" };
  if (cents === 10000)
    return { total, entered, state: "ok", text: "Total 100%" };
  if (cents < 10000)
    return {
      total,
      entered,
      state: "under",
      text: `Total ${plainNumber(total)}% - cap tables normally add up to 100%`,
    };
  return {
    total,
    entered,
    state: "over",
    text: `Total ${plainNumber(total)}% - this is more than 100%. Check each holder's share.`,
  };
}

// ───────── 25% notice (display only, never stored or sent) ─────────
export const OWNER_THRESHOLD = 25;
export function ownerCandidateNotice(row: CapRow): string | null {
  const p = parsePercentText(row.ownership_percent);
  if (p.kind !== "ok" || p.percent < OWNER_THRESHOLD) return null;
  if (row.holder_kind === "person")
    return "Holds 25% or more. People at this level may be asked to verify their identity if a deal proceeds.";
  if (row.holder_kind === "company")
    return "Holds 25% or more. We may ask who owns this company.";
  return null;
}

export type CapSummaryRow = {
  holder: string;
  kind: string;
  type: string;
  ownership: string;
  shareClass: string;
  shares: string;
};

// Read view of a stored value: a labelled row per holder, never JSON.
export function capSummaryRows(value: unknown): CapSummaryRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      holder: str(v.holder_name),
      kind: HOLDER_KIND_LABELS[str(v.holder_kind)] ?? "",
      type: HOLDER_TYPE_LABELS[str(v.holder_type)] ?? "",
      ownership:
        typeof v.ownership_percent === "number"
          ? `${plainNumber(v.ownership_percent)}%`
          : "",
      shareClass: str(v.share_class),
      shares: typeof v.shares === "number" ? v.shares.toLocaleString("en") : "",
    }));
}

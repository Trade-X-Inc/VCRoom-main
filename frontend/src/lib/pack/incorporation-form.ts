// State, emit and validation for the Incorporation form (tech.seed.incorporation). Pure: no React or server
// imports (tests/pack-incorporation-form.spec.ts). The rules are NOT repeated here: every verdict comes from
// field-shapes.ts (incorporationFieldErrors), the same code the shape cases test against the server validator.
import {
  FIELD_IDS,
  incorporationFieldErrors,
  type FieldShapeCode,
} from "./field-shapes";
import { ERROR_MESSAGES } from "./pinned-schedule";
import { countryOptions } from "./countries";

export type IncorporationStatus = "" | "incorporated" | "not_yet_incorporated";

export type IncorporationFormState = {
  status: IncorporationStatus;
  legal_name: string;
  entity_type: string;
  jurisdiction_country: string;
  jurisdiction_region: string;
  incorporation_date: string;
  registration_number: string;
  registered_address: string;
};

export const INCORPORATION_FIELD_ID = FIELD_IDS.incorporation;

export const EMPTY_INCORPORATION: IncorporationFormState = {
  status: "",
  legal_name: "",
  entity_type: "",
  jurisdiction_country: "",
  jurisdiction_region: "",
  incorporation_date: "",
  registration_number: "",
  registered_address: "",
};

export const INCORPORATION_LABELS: Record<string, string> = {
  status: "Incorporation status",
  legal_name: "Legal name",
  entity_type: "Entity type",
  jurisdiction_country: "Country of incorporation",
  jurisdiction_region: "Region or state",
  incorporation_date: "Date of incorporation",
  registration_number: "Registration number",
  registered_address: "Registered address",
};
export const INCORPORATION_LIMITS: Record<string, number> = {
  legal_name: 200,
  entity_type: 100,
  jurisdiction_region: 100,
  registration_number: 64,
  registered_address: 300,
};
// Keys shown when the company is not yet incorporated (with their "planned" labels).
const NOT_YET_KEYS = ["jurisdiction_country", "jurisdiction_region"] as const;
const INCORPORATED_KEYS = [
  "legal_name",
  "entity_type",
  "jurisdiction_country",
  "jurisdiction_region",
  "incorporation_date",
  "registration_number",
  "registered_address",
] as const;
const REQUIRED_WHEN_INCORPORATED = [
  "legal_name",
  "entity_type",
  "jurisdiction_country",
  "incorporation_date",
];

const str = (v: unknown) => (typeof v === "string" ? v : "");

// Form state from a stored value. Tolerant: anything that is not the approved shape gives an empty form.
export function incorporationStateFromValue(
  v: unknown,
): IncorporationFormState {
  if (!v || typeof v !== "object" || Array.isArray(v))
    return { ...EMPTY_INCORPORATION };
  const o = v as Record<string, unknown>;
  const status =
    o.status === "incorporated" || o.status === "not_yet_incorporated"
      ? o.status
      : "";
  return {
    status,
    legal_name: str(o.legal_name),
    entity_type: str(o.entity_type),
    jurisdiction_country: str(o.jurisdiction_country),
    jurisdiction_region: str(o.jurisdiction_region),
    incorporation_date: str(o.incorporation_date),
    registration_number: str(o.registration_number),
    registered_address: str(o.registered_address),
  };
}

export function isPristineIncorporation(s: IncorporationFormState): boolean {
  return (
    Object.keys(EMPTY_INCORPORATION) as (keyof IncorporationFormState)[]
  ).every((k) => s[k] === EMPTY_INCORPORATION[k]);
}

// The value the form emits. Only the keys that belong to the chosen status are included, so values typed under
// the other status never leave the form (the server rejects extra keys). Text is trimmed; an empty optional key is
// left out; an empty required key is also left out, which the validator reports as missing.
export function emitIncorporation(
  s: IncorporationFormState,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (s.status === "") return out;
  out.status = s.status;
  const keys = s.status === "incorporated" ? INCORPORATED_KEYS : NOT_YET_KEYS;
  for (const k of keys) {
    const t = s[k].trim();
    if (t !== "") out[k] = t;
  }
  return out;
}

// Plain-English message for one field. Missing and blank required fields name the field; the rest come from
// ERROR_MESSAGES, with the length limit named for too_long.
export function incorporationMessage(
  code: FieldShapeCode,
  key: string,
): string {
  const label = INCORPORATION_LABELS[key] ?? "This item";
  if (key === "status")
    return "Choose whether the company is incorporated or not yet incorporated.";
  if (code === "missing_required" || code === "blank")
    return `${label} is required.`;
  if (code === "too_long" && INCORPORATION_LIMITS[key])
    return `${label} must be ${INCORPORATION_LIMITS[key]} characters or fewer.`;
  if (code === "bad_country") return "Choose a country from the list.";
  if (code === "bad_date") return "Enter a real date.";
  const m = (ERROR_MESSAGES as Record<string, string>)[code];
  return m ?? "Check this entry.";
}

export type IncorporationValidation = {
  value: Record<string, string>;
  /** Message per form key (and "" for a problem with the value as a whole). */
  fieldErrors: Record<string, string>;
  valid: boolean;
  /** Short summary for the top of the form when it is not valid. */
  summary: string | null;
  /** Keys with a problem, in form order. */
  invalidKeys: string[];
};

export function validateIncorporationForm(
  s: IncorporationFormState,
  opts?: { today?: string },
): IncorporationValidation {
  const value = emitIncorporation(s);
  const codes = incorporationFieldErrors(value, opts);
  const fieldErrors: Record<string, string> = {};
  for (const [k, code] of Object.entries(codes))
    fieldErrors[k] = incorporationMessage(code, k);
  const order = ["status", ...INCORPORATED_KEYS];
  const invalidKeys = order.filter((k) => k in fieldErrors);
  const valid = Object.keys(fieldErrors).length === 0;
  const n = Object.keys(fieldErrors).length;
  return {
    value,
    fieldErrors,
    valid,
    invalidKeys,
    summary: valid
      ? null
      : n === 1
        ? "Fix 1 item before saving."
        : `Fix ${n} items before saving.`,
  };
}

// Required keys for the chosen status (to show the required marker).
export function isRequiredKey(
  status: IncorporationStatus,
  key: string,
): boolean {
  return (
    key === "status" ||
    (status === "incorporated" && REQUIRED_WHEN_INCORPORATED.includes(key))
  );
}

// Labelled lines for the read view. Values are returned as plain strings (rendered as React text).
export function incorporationSummaryLines(
  v: unknown,
): { label: string; text: string }[] {
  const s = incorporationStateFromValue(v);
  const lines: { label: string; text: string }[] = [];
  if (s.status === "") return lines;
  lines.push({
    label: "Status",
    text: s.status === "incorporated" ? "Incorporated" : "Not yet incorporated",
  });
  const countries = new Map(countryOptions("en").map((c) => [c.code, c.name]));
  const keys = s.status === "incorporated" ? INCORPORATED_KEYS : NOT_YET_KEYS;
  for (const k of keys) {
    const t = s[k];
    if (t === "") continue;
    const label =
      s.status === "not_yet_incorporated"
        ? `Planned ${INCORPORATION_LABELS[k].toLowerCase()}`
        : INCORPORATION_LABELS[k];
    let text = t;
    if (k === "jurisdiction_country")
      text = countries.get(t) ? `${countries.get(t)} (${t})` : t;
    lines.push({ label, text });
  }
  return lines;
}

// State, emit and validation for the Team form (tech.seed.team). Pure: no React. The rules are NOT restated here:
// every message comes from teamIssues() in field-shapes.ts (the same code the server runs), mapped to plain English.
import {
  FIELD_IDS,
  teamIssues,
  valueByteLength,
  MAX_VALUE_BYTES,
  type FieldShapeCode,
} from "@/lib/pack/field-shapes";
import { ERROR_MESSAGES } from "@/lib/pack/pinned-schedule";
import { listSummary, type ListValidation } from "@/lib/pack/list-form-common";

export const TEAM_FIELD_ID = FIELD_IDS.team;
export const TEAM_LIMITS = { min: 1, max: 15 } as const;

export type TeamRow = {
  name: string;
  role: string;
  is_founder: boolean;
  full_time: boolean;
  is_director: boolean;
  linkedin_url: string;
};

export const EMPTY_TEAM_ROW: TeamRow = {
  name: "",
  role: "",
  is_founder: false,
  full_time: false,
  is_director: false,
  linkedin_url: "",
};

export const TEAM_LABELS: Record<string, string> = {
  name: "Name",
  role: "Role",
  linkedin_url: "LinkedIn URL",
};
const TEAM_MAX: Record<string, number> = {
  name: 120,
  role: 120,
  linkedin_url: 300,
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

// The rows a stored value shows in the form. Tolerant: anything that is not a list of objects gives one empty row.
export function teamRowsFromValue(value: unknown): TeamRow[] {
  if (!Array.isArray(value)) return [{ ...EMPTY_TEAM_ROW }];
  const rows = value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      name: str(v.name),
      role: str(v.role),
      is_founder: v.is_founder === true,
      full_time: v.full_time === true,
      is_director: v.is_director === true,
      linkedin_url: str(v.linkedin_url),
    }));
  return rows.length ? rows : [{ ...EMPTY_TEAM_ROW }];
}

// What would be sent. Text is trimmed; the three checkboxes are always real booleans; an empty LinkedIn URL leaves
// the key out (the server rejects blank strings). name and role are always present, so a blank one is reported
// as blank rather than as missing.
export function emitTeam(rows: TeamRow[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const o: Record<string, unknown> = {
      name: r.name.trim(),
      role: r.role.trim(),
      is_founder: r.is_founder === true,
      full_time: r.full_time === true,
      is_director: r.is_director === true,
    };
    const li = r.linkedin_url.trim();
    if (li !== "") o.linkedin_url = li;
    return o;
  });
}

export function teamMessage(code: FieldShapeCode, key: string): string {
  const label = TEAM_LABELS[key] ?? "This item";
  if (code === "missing_required" || code === "blank")
    return `${label} is required.`;
  if (code === "too_long" && TEAM_MAX[key])
    return `${label} must be ${TEAM_MAX[key]} characters or fewer.`;
  if (code === "bad_url") return ERROR_MESSAGES.bad_url;
  const m = (ERROR_MESSAGES as Record<string, string>)[code];
  return m ?? "Check this entry.";
}

export function validateTeamForm(rows: TeamRow[]): ListValidation {
  const value = emitTeam(rows);
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
  for (const i of teamIssues(value)) {
    if (i.row === null) {
      if (
        i.code === "no_founder" ||
        i.code === "too_many_items" ||
        i.code === "too_few_items"
      )
        formProblem(i.code, ERROR_MESSAGES[i.code]);
      continue;
    }
    const k = `${i.row}.${i.key}`;
    if (!(k in fieldErrors)) fieldErrors[k] = teamMessage(i.code, i.key);
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

export type TeamSummaryRow = {
  name: string;
  role: string;
  flags: string;
  linkedin: string;
};

// Read view of a stored value: one entry per person, never JSON.
export function teamSummaryRows(value: unknown): TeamSummaryRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      name: str(v.name),
      role: str(v.role),
      flags:
        [
          v.is_founder === true ? "Founder" : null,
          v.full_time === true ? "Full-time" : null,
          v.is_director === true ? "Director" : null,
        ]
          .filter(Boolean)
          .join(" · ") || "None of founder, full-time or director",
      linkedin: str(v.linkedin_url),
    }));
}

// Pure helpers for the pack screens' schedule handling. No server or router imports, so they can be
// unit-tested in plain Node (tests/pack-pinned-schedule.spec.ts).
//
// A pack is pinned to one schedule row (pack_v1.pack.schedule_id). The screens load THAT schedule through
// the packScheduleGet action (pack_api.pack_schedule_get), never "the latest published technology/seed".
import type { PackErrorCode } from "@/lib/actions/pack-prepare";

// The query key includes the packId: two packs can be pinned to different schedule versions, so a cached
// schedule must never be shared between packs.
export const pinnedScheduleQueryKey = (packId: string) =>
  ["pack-schedule", "pinned", packId] as const;

export function sortScheduleFields<T extends { sort_order: number }>(
  fields: readonly T[] | undefined,
): T[] {
  return [...(fields ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

// True when the schedule that was loaded is the one the pack is pinned to. Both values come from the
// server for the same pack, so a mismatch means a stale or mixed-up response; the screen then shows its
// generic load error instead of rendering fields from the wrong schedule.
export function scheduleMatchesPack(
  pack: { schedule_id: string } | undefined,
  schedule: { id: string } | undefined,
): boolean {
  if (!pack || !schedule) return true; // nothing to compare yet
  return pack.schedule_id === schedule.id;
}

// Friendly, never-raw messages for every mapped error code. Exhaustive against PACK_ERROR_CODES.
export const ERROR_MESSAGES: Record<PackErrorCode, string> = {
  not_authenticated: "Your session expired. Sign in again.",
  forbidden: "You don't have access to this pack.",
  not_found: "That field or pack could not be found.",
  schedule_not_found: "The published schedule could not be found.",
  unknown_field: "That field isn't part of this schedule.",
  value_mismatch:
    "This field changed since you last loaded it. Reload and try again.",
  value_required: "This field can't be blank.",
  value_too_large: "This value is too long. Shorten it and try again.",
  expected_string: "Enter text for this field.",
  expected_number: "Enter a number for this field.",
  expected_money_object_with_amount_and_3letter_currency:
    "Enter an amount and choose a currency.",
  money_amount_negative: "The amount can't be negative.",
  expected_date_string: "Enter a date for this field.",
  expected_iso_date_string: "Enter the date as YYYY-MM-DD.",
  expected_object_or_array: "Enter valid JSON — an object or array.",
  enum_not_supported: "This field type isn't supported yet.",
  unknown_value_type: "This field type isn't recognized.",
};

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";

export function friendlyError(e: unknown): string {
  const code = e instanceof Error ? e.message : "";
  if (Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, code))
    return ERROR_MESSAGES[code as PackErrorCode];
  return GENERIC_ERROR_MESSAGE;
}

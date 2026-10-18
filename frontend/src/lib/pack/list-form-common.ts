// Shared pieces of the list forms (team, cap table): the size indicator and the validation result shape. Pure.
import {
  MAX_VALUE_BYTES,
  valueByteLength,
  type FieldShapeCode,
} from "@/lib/pack/field-shapes";

export type SizeIndicator = {
  bytes: number;
  limit: number;
  remaining: number;
  over: boolean;
  text: string;
};

// Size of the JSON that would be sent, measured the way the server measures it (UTF-8 bytes of the jsonb-style
// text, the same helper field-shapes.ts uses) against the 8192-byte limit.
export function sizeIndicator(value: unknown): SizeIndicator {
  const bytes = valueByteLength(value);
  const remaining = MAX_VALUE_BYTES - bytes;
  const over = bytes > MAX_VALUE_BYTES;
  return {
    bytes,
    limit: MAX_VALUE_BYTES,
    remaining,
    over,
    text: over
      ? `${bytes - MAX_VALUE_BYTES} bytes over the ${MAX_VALUE_BYTES} byte limit`
      : `${remaining} of ${MAX_VALUE_BYTES} bytes left`,
  };
}

export type ListValidation = {
  /** The value that would be sent. */
  value: unknown[];
  /** One message per problem field, keyed "row.key" (row is 0-based). */
  fieldErrors: Record<string, string>;
  /** Messages about the list as a whole (no founder, too many rows, too large). */
  formErrors: string[];
  formCodes: FieldShapeCode[];
  valid: boolean;
  /** "Fix 3 items before saving." or null when valid. */
  summary: string | null;
  /** "row.key" of the problems, in row order (for moving focus to the first one). */
  invalidKeys: string[];
};

export function listSummary(count: number): string | null {
  if (count === 0) return null;
  return `Fix ${count} ${count === 1 ? "item" : "items"} before saving.`;
}

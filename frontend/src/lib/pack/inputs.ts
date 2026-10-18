// Pure helpers behind the shared pack form components (MoneyInput, PercentInput, CountrySelect, DateInput,
// RepeatableRows). No React, router or server imports, so they are unit-tested in plain Node
// (tests/pack-inputs.spec.ts). The server rules live in field-shapes.ts; these helpers only turn what a person
// typed into a value, and a value back into what a control shows.

// ───────── money ─────────
export const COMMON_CURRENCIES = [
  "AED",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "SAR",
  "SGD",
  "CAD",
  "AUD",
  "CHF",
  "JPY",
  "CNY",
] as const;

export type MoneyValue = { amount: number; currency: string };

// A non-negative decimal typed with a dot ("1000", "1234.56", ".5" is not accepted). Empty is "no value".
export type AmountParse =
  | { kind: "empty" }
  | { kind: "ok"; amount: number }
  | { kind: "invalid"; code: "money_amount_negative" | "invalid_shape" };

export function parseAmountText(text: string): AmountParse {
  const t = text.trim();
  if (t === "") return { kind: "empty" };
  if (/^-\d/.test(t) || /^-\.\d/.test(t))
    return { kind: "invalid", code: "money_amount_negative" };
  if (!/^\d+(\.\d+)?$/.test(t))
    return { kind: "invalid", code: "invalid_shape" };
  const n = Number(t);
  if (!Number.isFinite(n)) return { kind: "invalid", code: "invalid_shape" };
  return { kind: "ok", amount: n };
}

// The value a MoneyInput emits. An empty amount is "no value" (undefined), never 0; an explicit 0 is a value.
export function moneyFromInputs(
  amountText: string,
  currency: string,
): MoneyValue | undefined {
  const p = parseAmountText(amountText);
  if (p.kind !== "ok") return undefined;
  return { amount: p.amount, currency };
}

// The market size value: money plus an optional methodology note. The note is trimmed and the key is left out when
// the note is empty. undefined while the amount is empty or unusable.
export function moneyWithMethodology(
  amountText: string,
  currency: string,
  methodologyText: string,
): (MoneyValue & { methodology?: string }) | undefined {
  const m = moneyFromInputs(amountText, currency);
  if (!m) return undefined;
  const note = methodologyText.trim();
  return note === "" ? m : { ...m, methodology: note };
}

export function moneyToInputs(
  value: unknown,
  fallbackCurrency = "USD",
): { amountText: string; currency: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    if (typeof v.amount === "number" && Number.isFinite(v.amount)) {
      return {
        amountText: plainNumber(v.amount),
        currency:
          typeof v.currency === "string" ? v.currency : fallbackCurrency,
      };
    }
  }
  return { amountText: "", currency: fallbackCurrency };
}

// A number as plain digits (no exponent) so it can be shown and parsed back unchanged.
export function plainNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  const s = String(n);
  if (!/e/i.test(s)) return s;
  return n.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}

// Currency codes offered: the common list plus the code already stored (so an existing value is never lost).
export function currencyOptions(current?: string): string[] {
  const list: string[] = [...COMMON_CURRENCIES];
  if (current && /^[A-Z]{3}$/.test(current) && !list.includes(current))
    list.push(current);
  return list;
}

export function currencyLabel(code: string, locale = "en"): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code);
    return name && name !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

// ───────── percent ─────────
export type PercentParse =
  | { kind: "empty" }
  | { kind: "ok"; percent: number }
  | { kind: "invalid"; code: "bad_percent" | "invalid_shape" };

// 0 to 100 with at most two decimals. "33.333" and "100.01" are bad_percent; anything that is not a plain
// number is invalid_shape.
export function parsePercentText(text: string): PercentParse {
  const t = text.trim();
  if (t === "") return { kind: "empty" };
  if (!/^-?\d+(\.\d+)?$/.test(t))
    return { kind: "invalid", code: "invalid_shape" };
  if (/^-/.test(t) || /\.\d{3,}$/.test(t))
    return { kind: "invalid", code: "bad_percent" };
  const n = Number(t);
  if (n < 0 || n > 100) return { kind: "invalid", code: "bad_percent" };
  return { kind: "ok", percent: n };
}

// Keystroke filter: returns the text to keep. A change that would add a third decimal, or a character that cannot
// be part of a percentage, is refused (the previous text is kept). Pasted text that fails is refused the same way.
export function filterPercentTyping(previous: string, next: string): string {
  if (next === "") return "";
  if (!/^\d{0,3}(\.\d{0,2})?$/.test(next)) return previous;
  return next;
}

export function percentToText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? plainNumber(value)
    : "";
}

// ───────── date ─────────
// What a native date input emits is already YYYY-MM-DD or "". Anything else is treated as empty.
export function dateFromInput(text: string): string | undefined {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(text) ? text : undefined;
}

// ───────── country ─────────
export function countryFromSelect(code: string): string | undefined {
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

// ───────── comparing values ─────────
// JSON text with object keys sorted, so two values that differ only in key order compare equal (the database
// stores jsonb with its own key order).
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return (
      "{" +
      Object.keys(o)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stableStringify(o[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v) ?? "null";
}

// ───────── repeatable rows: where focus goes ─────────
export type FocusTarget = { kind: "row"; index: number } | { kind: "add" };

// After adding a row, focus the new (last) row's first control.
export function focusAfterAdd(rowCountAfter: number): FocusTarget {
  return { kind: "row", index: rowCountAfter - 1 };
}

// After removing the row at `removedIndex`, focus the previous row, or the Add button when there is none.
export function focusAfterRemove(removedIndex: number): FocusTarget {
  return removedIndex > 0
    ? { kind: "row", index: removedIndex - 1 }
    : { kind: "add" };
}

export function canAddRow(count: number, max: number): boolean {
  return count < max;
}
export function canRemoveRow(count: number, min: number): boolean {
  return count > min;
}

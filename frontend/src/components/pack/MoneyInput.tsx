import { useMemo } from "react";
import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import {
  currencyLabel,
  currencyOptions,
  parseAmountText,
  type MoneyValue,
  moneyFromInputs,
} from "@/lib/pack/inputs";
import { ERROR_MESSAGES } from "@/lib/pack/pinned-schedule";

// Amount (decimal, not negative) and currency. Emits { amount, currency } through onChange, or undefined while
// the amount is empty: an empty amount is "no value", never 0. The amount is kept as text by the parent, so a
// half-typed number is never rewritten under the cursor.
export function MoneyInput({
  label = "Amount",
  amountText,
  currency,
  onAmountText,
  onCurrency,
  onValue,
  onBlur,
  error,
  required,
}: {
  label?: string;
  amountText: string;
  currency: string;
  onAmountText: (t: string) => void;
  onCurrency: (c: string) => void;
  /** Called with the emitted value (undefined when the amount is empty or invalid) after every change. */
  onValue?: (v: MoneyValue | undefined) => void;
  onBlur?: () => void;
  /** An error to show (from the form); typing problems are shown by this component itself. */
  error?: string | null;
  required?: boolean;
}) {
  const options = useMemo(() => currencyOptions(currency), [currency]);
  const parsed = parseAmountText(amountText);
  const ownError =
    parsed.kind === "invalid" ? ERROR_MESSAGES[parsed.code] : null;
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_minmax(0,14rem)]">
      <PackField
        label={label}
        required={required}
        error={error ?? ownError}
        hint="Numbers only, for example 1500000"
      >
        {(c) => (
          <input
            {...c}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="w-full outline-none"
            style={packInputStyle(!!(error ?? ownError))}
            value={amountText}
            onChange={(e) => {
              onAmountText(e.target.value);
              onValue?.(moneyFromInputs(e.target.value, currency));
            }}
            onBlur={onBlur}
          />
        )}
      </PackField>
      <PackField label="Currency">
        {(c) => (
          <select
            {...c}
            className="w-full outline-none"
            style={packInputStyle(false)}
            value={currency}
            onChange={(e) => {
              onCurrency(e.target.value);
              onValue?.(moneyFromInputs(amountText, e.target.value));
            }}
          >
            {options.map((code) => (
              <option key={code} value={code}>
                {currencyLabel(code)}
              </option>
            ))}
          </select>
        )}
      </PackField>
    </div>
  );
}

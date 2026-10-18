import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import { filterPercentTyping, parsePercentText } from "@/lib/pack/inputs";
import { ERROR_MESSAGES } from "@/lib/pack/pinned-schedule";

// A percentage from 0 to 100 with at most two decimals, shown with a "%" suffix. A third decimal cannot be
// typed or pasted. The text is kept by the parent; the emitted JSON number comes from parsePercentText.
export function PercentInput({
  label,
  text,
  onText,
  onBlur,
  error,
  required,
  name,
  ariaLabel,
}: {
  label: string;
  text: string;
  onText: (t: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  /** Name attribute, for finding the control (for example to move focus to it). */
  name?: string;
  /** Accessible name when the visible label needs more context (for example a row number). */
  ariaLabel?: string;
}) {
  const parsed = parsePercentText(text);
  const ownError =
    parsed.kind === "invalid" ? ERROR_MESSAGES[parsed.code] : null;
  const shown = error ?? ownError;
  return (
    <PackField
      label={label}
      required={required}
      error={shown}
      hint="0 to 100, up to two decimals"
    >
      {(c) => (
        <div className="relative">
          <input
            {...c}
            name={name}
            aria-label={ariaLabel}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="w-full outline-none"
            style={{ ...packInputStyle(!!shown), paddingRight: 28 }}
            value={text}
            onChange={(e) => onText(filterPercentTyping(text, e.target.value))}
            onBlur={onBlur}
          />
          <span
            aria-hidden="true"
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--lcs-ink-muted)", fontSize: 14 }}
          >
            %
          </span>
        </div>
      )}
    </PackField>
  );
}

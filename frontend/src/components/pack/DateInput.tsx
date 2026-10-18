import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";

// A native date input. Emits YYYY-MM-DD, or "" when empty. `max` (YYYY-MM-DD) stops the picker offering later
// dates; the server rule (not in the future, UTC) is applied by the form's validation, not by this control.
export function DateInput({
  label,
  value,
  onChange,
  onBlur,
  max,
  error,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  max?: string;
  error?: string | null;
  required?: boolean;
  hint?: string;
}) {
  return (
    <PackField label={label} required={required} error={error} hint={hint}>
      {(c) => (
        <input
          {...c}
          type="date"
          max={max}
          autoComplete="off"
          className="w-full outline-none"
          style={packInputStyle(!!error)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      )}
    </PackField>
  );
}

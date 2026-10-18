import { useMemo } from "react";
import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import { countryOptions } from "@/lib/pack/countries";

// ISO 3166-1 alpha-2 country picker. Emits the two-letter uppercase code ("" for the blank option).
export function CountrySelect({
  label,
  value,
  onChange,
  onBlur,
  error,
  required,
  hint,
  blankLabel = "Select a country",
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  onBlur?: () => void;
  error?: string | null;
  required?: boolean;
  hint?: string;
  blankLabel?: string;
}) {
  const options = useMemo(() => countryOptions("en"), []);
  return (
    <PackField label={label} required={required} error={error} hint={hint}>
      {(c) => (
        <select
          {...c}
          className="w-full outline-none"
          style={packInputStyle(!!error)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        >
          <option value="">{blankLabel}</option>
          {options.map((o) => (
            <option key={o.code} value={o.code}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </PackField>
  );
}

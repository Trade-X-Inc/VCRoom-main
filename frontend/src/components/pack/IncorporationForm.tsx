import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import { CountrySelect } from "./CountrySelect";
import { DateInput } from "./DateInput";
import {
  INCORPORATION_LABELS,
  INCORPORATION_LIMITS,
  isRequiredKey,
  type IncorporationFormState,
} from "@/lib/pack/incorporation-form";
import { todayUtc } from "@/lib/pack/field-shapes";

// The Incorporation form (tech.seed.incorporation). Controlled and presentational: the parent keeps the state,
// decides which errors are visible, and runs the save. Choosing "Not yet incorporated" hides the incorporated-only
// fields; the parent's emit function drops them from the value.
export function IncorporationForm({
  state,
  onChange,
  errors,
  onTouch,
}: {
  state: IncorporationFormState;
  onChange: (next: IncorporationFormState) => void;
  /** Messages to show, by form key. */
  errors: Record<string, string | undefined>;
  /** Called when a field loses focus, so the parent can start showing its message. */
  onTouch: (key: string) => void;
}) {
  const set = <K extends keyof IncorporationFormState>(
    key: K,
    value: IncorporationFormState[K],
  ) => onChange({ ...state, [key]: value });
  const incorporated = state.status === "incorporated";
  const notYet = state.status === "not_yet_incorporated";
  const textInput = (
    key:
      | "legal_name"
      | "entity_type"
      | "jurisdiction_region"
      | "registration_number",
    autoComplete: string,
  ) => (
    <PackField
      label={
        notYet && key === "jurisdiction_region"
          ? "Planned region or state"
          : INCORPORATION_LABELS[key]
      }
      required={isRequiredKey(state.status, key)}
      error={errors[key]}
      hint={
        key === "registration_number"
          ? "As shown on your certificate of incorporation"
          : undefined
      }
    >
      {(c) => (
        <input
          {...c}
          type="text"
          name={key}
          autoComplete={autoComplete}
          className="w-full outline-none"
          style={packInputStyle(!!errors[key])}
          value={state[key]}
          onChange={(e) => set(key, e.target.value)}
          onBlur={() => onTouch(key)}
        />
      )}
    </PackField>
  );

  return (
    <div className="flex flex-col gap-4">
      <fieldset
        className="flex flex-col gap-2 m-0 p-0 border-0 min-w-0"
        aria-describedby={errors.status ? "inc-status-error" : undefined}
      >
        <legend
          style={{
            fontFamily: "var(--font-lcs-ui)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--lcs-ink)",
            padding: 0,
          }}
        >
          {INCORPORATION_LABELS.status}
          <span aria-hidden="true" style={{ color: "var(--lcs-attention)" }}>
            {" "}
            *
          </span>
          <span className="sr-only"> (required)</span>
        </legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          {(
            [
              ["incorporated", "Incorporated"],
              ["not_yet_incorporated", "Not yet incorporated"],
            ] as const
          ).map(([value, text]) => (
            <label
              key={value}
              className="inline-flex items-center gap-2 min-h-[32px] cursor-pointer"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                fontSize: 14,
                color: "var(--lcs-ink)",
              }}
            >
              <input
                type="radio"
                name="incorporation-status"
                value={value}
                checked={state.status === value}
                onChange={() => set("status", value)}
                onBlur={() => onTouch("status")}
              />
              {text}
            </label>
          ))}
        </div>
        {errors.status && (
          <span
            id="inc-status-error"
            role="alert"
            style={{
              fontFamily: "var(--font-lcs-ui)",
              fontSize: 12,
              color: "var(--lcs-attention)",
            }}
          >
            {errors.status}
          </span>
        )}
      </fieldset>

      {incorporated && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {textInput("legal_name", "organization")}
          {textInput("entity_type", "off")}
          <CountrySelect
            label={INCORPORATION_LABELS.jurisdiction_country}
            required
            value={state.jurisdiction_country}
            onChange={(v) => set("jurisdiction_country", v)}
            onBlur={() => onTouch("jurisdiction_country")}
            error={errors.jurisdiction_country}
          />
          {textInput("jurisdiction_region", "off")}
          <DateInput
            label={INCORPORATION_LABELS.incorporation_date}
            required
            max={todayUtc()}
            value={state.incorporation_date}
            onChange={(v) => set("incorporation_date", v)}
            onBlur={() => onTouch("incorporation_date")}
            error={errors.incorporation_date}
            hint="Not in the future"
          />
          {textInput("registration_number", "off")}
          <div className="sm:col-span-2">
            <PackField
              label={INCORPORATION_LABELS.registered_address}
              error={errors.registered_address}
              counter={`${[...state.registered_address].length} / ${INCORPORATION_LIMITS.registered_address}`}
            >
              {(c) => (
                <textarea
                  {...c}
                  name="registered_address"
                  rows={3}
                  autoComplete="off"
                  className="w-full outline-none resize-none"
                  style={{
                    ...packInputStyle(!!errors.registered_address),
                    height: "auto",
                    padding: "8px 10px",
                  }}
                  value={state.registered_address}
                  onChange={(e) => set("registered_address", e.target.value)}
                  onBlur={() => onTouch("registered_address")}
                />
              )}
            </PackField>
          </div>
        </div>
      )}

      {notYet && (
        <div className="flex flex-col gap-3">
          <div
            style={{
              fontFamily: "var(--font-lcs-ui)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--lcs-ink)",
            }}
          >
            Planned jurisdiction (optional)
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <CountrySelect
              label="Planned country"
              value={state.jurisdiction_country}
              onChange={(v) => set("jurisdiction_country", v)}
              onBlur={() => onTouch("jurisdiction_country")}
              error={errors.jurisdiction_country}
              blankLabel="Not decided"
            />
            {textInput("jurisdiction_region", "off")}
          </div>
        </div>
      )}
    </div>
  );
}

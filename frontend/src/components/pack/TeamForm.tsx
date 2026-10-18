import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import { RepeatableRows, type RowItem } from "./RepeatableRows";
import {
  CheckboxField,
  DECLARED_HINT,
  FormLevelErrors,
  Hint,
  SizeLine,
} from "./ListFormParts";
import {
  EMPTY_TEAM_ROW,
  TEAM_LIMITS,
  type TeamRow,
} from "@/lib/pack/team-form";
import type { SizeIndicator } from "@/lib/pack/list-form-common";

// The Team form (tech.seed.team). Controlled and presentational: the parent keeps the rows, decides which messages
// are visible, and runs the save. No field for date of birth, nationality, ID numbers, address or photo.
export function TeamForm({
  items,
  onChange,
  errors,
  formErrors,
  onTouch,
  size,
}: {
  items: RowItem<TeamRow>[];
  onChange: (items: RowItem<TeamRow>[]) => void;
  /** Visible messages, keyed "row.key" (row is 0-based). */
  errors: Record<string, string | undefined>;
  formErrors: string[];
  /** Called when a control in a row loses focus (row index, key). */
  onTouch: (row: number, key: string) => void;
  size: SizeIndicator;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FormLevelErrors messages={formErrors} />
      <RepeatableRows<TeamRow>
        items={items}
        onChange={onChange}
        min={TEAM_LIMITS.min}
        max={TEAM_LIMITS.max}
        makeRow={() => ({ ...EMPTY_TEAM_ROW })}
        rowLabel="Team member"
        renderRow={(item, i, setRow) => {
          const n = i + 1;
          const set = <K extends keyof TeamRow>(k: K, v: TeamRow[K]) =>
            setRow({ ...item.value, [k]: v });
          return (
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {(["name", "role"] as const).map((key) => (
                  <PackField
                    key={key}
                    label={key === "name" ? "Name" : "Role"}
                    required
                    error={errors[`${i}.${key}`]}
                  >
                    {(c) => (
                      <input
                        {...c}
                        type="text"
                        name={`${i}.${key}`}
                        aria-label={`${key === "name" ? "Name" : "Role"}, team member ${n}`}
                        autoComplete="off"
                        className="w-full outline-none"
                        style={packInputStyle(!!errors[`${i}.${key}`])}
                        value={item.value[key]}
                        onChange={(e) => set(key, e.target.value)}
                        onBlur={() => onTouch(i, key)}
                      />
                    )}
                  </PackField>
                ))}
              </div>
              <fieldset className="m-0 p-0 border-0 min-w-0">
                <legend className="sr-only">
                  Team member {n}: founder, full-time, director
                </legend>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
                  <CheckboxField
                    label="Founder"
                    ariaLabel={`Founder, team member ${n}`}
                    name={`${i}.is_founder`}
                    checked={item.value.is_founder}
                    onChange={(v) => set("is_founder", v)}
                    onBlur={() => onTouch(i, "is_founder")}
                  />
                  <CheckboxField
                    label="Full-time"
                    ariaLabel={`Full-time, team member ${n}`}
                    name={`${i}.full_time`}
                    checked={item.value.full_time}
                    onChange={(v) => set("full_time", v)}
                  />
                  <CheckboxField
                    label="Director"
                    ariaLabel={`Director, team member ${n}`}
                    name={`${i}.is_director`}
                    checked={item.value.is_director}
                    onChange={(v) => set("is_director", v)}
                  />
                </div>
              </fieldset>
              <PackField
                label="LinkedIn URL"
                hint="Optional. Public profile link."
                error={errors[`${i}.linkedin_url`]}
              >
                {(c) => (
                  <input
                    {...c}
                    type="url"
                    inputMode="url"
                    name={`${i}.linkedin_url`}
                    aria-label={`LinkedIn URL, team member ${n}`}
                    autoComplete="off"
                    className="w-full outline-none"
                    style={packInputStyle(!!errors[`${i}.linkedin_url`])}
                    value={item.value.linkedin_url}
                    onChange={(e) => set("linkedin_url", e.target.value)}
                    onBlur={() => onTouch(i, "linkedin_url")}
                  />
                )}
              </PackField>
            </div>
          );
        }}
      />
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Hint>{DECLARED_HINT}</Hint>
        <SizeLine size={size} />
      </div>
    </div>
  );
}

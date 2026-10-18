import { PackField } from "./Field";
import { packInputStyle } from "./field-styles";
import { PercentInput } from "./PercentInput";
import { RepeatableRows, type RowItem } from "./RepeatableRows";
import {
  DECLARED_HINT,
  FormLevelErrors,
  Hint,
  SizeLine,
} from "./ListFormParts";
import {
  CAP_TABLE_LIMITS,
  EMPTY_CAP_ROW,
  HOLDER_KINDS,
  HOLDER_KIND_LABELS,
  HOLDER_TYPES,
  HOLDER_TYPE_LABELS,
  capTotal,
  ownerCandidateNotice,
  type CapRow,
} from "@/lib/pack/cap-table-form";
import type { SizeIndicator } from "@/lib/pack/list-form-common";

// The Cap table form (tech.seed.cap_table). Controlled and presentational. The running total and the 25% notice
// are display only: they are never part of the value and they never block saving.
export function CapTableForm({
  items,
  onChange,
  errors,
  formErrors,
  onTouch,
  size,
}: {
  items: RowItem<CapRow>[];
  onChange: (items: RowItem<CapRow>[]) => void;
  errors: Record<string, string | undefined>;
  formErrors: string[];
  onTouch: (row: number, key: string) => void;
  size: SizeIndicator;
}) {
  const total = capTotal(items.map((it) => it.value));
  const totalStyle: React.CSSProperties =
    total.state === "over"
      ? {
          background: "var(--lcs-attention-wash)",
          border: "1px solid var(--lcs-attention)",
          color: "var(--lcs-ink)",
          fontWeight: 600,
          padding: "8px 12px",
        }
      : total.state === "under"
        ? { color: "var(--lcs-attention)", fontWeight: 500 }
        : { color: "var(--lcs-ink-muted)" };
  return (
    <div className="flex flex-col gap-4">
      <FormLevelErrors messages={formErrors} />
      <div
        data-testid="cap-total"
        data-state={total.state}
        aria-live="polite"
        style={{
          fontFamily: "var(--font-lcs-ui)",
          fontSize: 13,
          ...totalStyle,
        }}
      >
        {total.text}
      </div>
      <RepeatableRows<CapRow>
        items={items}
        onChange={onChange}
        min={CAP_TABLE_LIMITS.min}
        max={CAP_TABLE_LIMITS.max}
        makeRow={() => ({ ...EMPTY_CAP_ROW })}
        rowLabel="Holder"
        renderRow={(item, i, setRow) => {
          const n = i + 1;
          const set = <K extends keyof CapRow>(k: K, v: CapRow[K]) =>
            setRow({ ...item.value, [k]: v });
          const notice = ownerCandidateNotice(item.value);
          return (
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <PackField
                  label="Holder name"
                  required
                  error={errors[`${i}.holder_name`]}
                >
                  {(c) => (
                    <input
                      {...c}
                      type="text"
                      name={`${i}.holder_name`}
                      aria-label={`Holder name, holder ${n}`}
                      autoComplete="off"
                      className="w-full outline-none"
                      style={packInputStyle(!!errors[`${i}.holder_name`])}
                      value={item.value.holder_name}
                      onChange={(e) => set("holder_name", e.target.value)}
                      onBlur={() => onTouch(i, "holder_name")}
                    />
                  )}
                </PackField>
                <PackField
                  label="Holder is a"
                  required
                  error={errors[`${i}.holder_kind`]}
                >
                  {(c) => (
                    <select
                      {...c}
                      name={`${i}.holder_kind`}
                      aria-label={`Holder is a, holder ${n}`}
                      className="w-full outline-none"
                      style={packInputStyle(!!errors[`${i}.holder_kind`])}
                      value={item.value.holder_kind}
                      onChange={(e) =>
                        set(
                          "holder_kind",
                          e.target.value as CapRow["holder_kind"],
                        )
                      }
                      onBlur={() => onTouch(i, "holder_kind")}
                    >
                      <option value="">Choose…</option>
                      {HOLDER_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {HOLDER_KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  )}
                </PackField>
                <PackField
                  label="Holder type"
                  required
                  error={errors[`${i}.holder_type`]}
                >
                  {(c) => (
                    <select
                      {...c}
                      name={`${i}.holder_type`}
                      aria-label={`Holder type, holder ${n}`}
                      className="w-full outline-none"
                      style={packInputStyle(!!errors[`${i}.holder_type`])}
                      value={item.value.holder_type}
                      onChange={(e) =>
                        set(
                          "holder_type",
                          e.target.value as CapRow["holder_type"],
                        )
                      }
                      onBlur={() => onTouch(i, "holder_type")}
                    >
                      <option value="">Choose…</option>
                      {HOLDER_TYPES.map((k) => (
                        <option key={k} value={k}>
                          {HOLDER_TYPE_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  )}
                </PackField>
                <PercentInput
                  label="Ownership"
                  name={`${i}.ownership_percent`}
                  ariaLabel={`Ownership, holder ${n}`}
                  required
                  text={item.value.ownership_percent}
                  onText={(t) => set("ownership_percent", t)}
                  onBlur={() => onTouch(i, "ownership_percent")}
                  error={errors[`${i}.ownership_percent`]}
                />
                <PackField
                  label="Share class"
                  hint="Optional"
                  error={errors[`${i}.share_class`]}
                >
                  {(c) => (
                    <input
                      {...c}
                      type="text"
                      name={`${i}.share_class`}
                      aria-label={`Share class, holder ${n}`}
                      autoComplete="off"
                      className="w-full outline-none"
                      style={packInputStyle(!!errors[`${i}.share_class`])}
                      value={item.value.share_class}
                      onChange={(e) => set("share_class", e.target.value)}
                      onBlur={() => onTouch(i, "share_class")}
                    />
                  )}
                </PackField>
                <PackField
                  label="Shares"
                  hint="Optional. A whole number."
                  error={errors[`${i}.shares`]}
                >
                  {(c) => (
                    <input
                      {...c}
                      type="text"
                      inputMode="numeric"
                      name={`${i}.shares`}
                      aria-label={`Shares, holder ${n}`}
                      autoComplete="off"
                      className="w-full outline-none"
                      style={packInputStyle(!!errors[`${i}.shares`])}
                      value={item.value.shares}
                      onChange={(e) => set("shares", e.target.value)}
                      onBlur={() => onTouch(i, "shares")}
                    />
                  )}
                </PackField>
              </div>
              {notice && (
                <p
                  data-testid="owner-notice"
                  className="m-0"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontSize: 12,
                    color: "var(--lcs-ink-muted)",
                  }}
                >
                  {notice}
                </p>
              )}
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

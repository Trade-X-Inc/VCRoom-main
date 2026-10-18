import { type ReactNode, useEffect, useRef } from "react";
import { LcsButton } from "@/components/lcs";
import {
  canAddRow,
  canRemoveRow,
  focusAfterAdd,
  focusAfterRemove,
  type FocusTarget,
} from "@/lib/pack/inputs";

// Generic add/remove list. Used by the team and cap table forms. Rows carry a stable `key` so typing in one row
// never remounts another. Focus: after Add, the new row's first control; after Remove, the previous row's first
// control, or the Add button when no previous row exists. No reordering. The remove button's accessible name
// includes the row number; Add is disabled at the maximum and the reason is shown on screen.
export type RowItem<T> = { key: string; value: T };

export function RepeatableRows<T>({
  items,
  onChange,
  min,
  max,
  makeRow,
  rowLabel,
  renderRow,
  rowErrors,
}: {
  items: RowItem<T>[];
  onChange: (items: RowItem<T>[]) => void;
  min: number;
  max: number;
  /** Creates a blank row value. */
  makeRow: () => T;
  /** Singular noun for the rows, for example "Team member". */
  rowLabel: string;
  renderRow: (
    item: RowItem<T>,
    index: number,
    setValue: (v: T) => void,
  ) => ReactNode;
  /** One message (or null) per row, same order as items. */
  rowErrors?: (string | null | undefined)[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const pending = useRef<FocusTarget | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    if (target.kind === "add") {
      addButton.current?.focus();
      return;
    }
    const row =
      container.current?.querySelectorAll<HTMLElement>("[data-row]")[
        target.index
      ];
    row
      ?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")
      ?.focus();
  }, [items.length]);

  const add = () => {
    if (!canAddRow(items.length, max)) return;
    counter.current += 1;
    pending.current = focusAfterAdd(items.length + 1);
    onChange([
      ...items,
      { key: `row-${Date.now()}-${counter.current}`, value: makeRow() },
    ]);
  };
  const remove = (index: number) => {
    if (!canRemoveRow(items.length, min)) return;
    pending.current = focusAfterRemove(index);
    onChange(items.filter((_, i) => i !== index));
  };

  const atMax = !canAddRow(items.length, max);
  return (
    <div className="flex flex-col gap-4" ref={container}>
      <ol className="flex flex-col gap-4 list-none p-0 m-0">
        {items.map((item, index) => {
          const err = rowErrors?.[index];
          return (
            <li
              key={item.key}
              data-row
              className="flex flex-col gap-3 p-3"
              style={{
                border: "1px solid var(--lcs-line)",
                background: "var(--lcs-white)",
              }}
              aria-label={`${rowLabel} ${index + 1}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--lcs-ink)",
                  }}
                >
                  {rowLabel} {index + 1}
                </span>
                <LcsButton
                  type="button"
                  variant="secondary"
                  disabled={!canRemoveRow(items.length, min)}
                  aria-label={`Remove ${rowLabel.toLowerCase()} ${index + 1}`}
                  onClick={() => remove(index)}
                >
                  Remove
                </LcsButton>
              </div>
              {renderRow(item, index, (v) =>
                onChange(
                  items.map((it, i) =>
                    i === index ? { ...it, value: v } : it,
                  ),
                ),
              )}
              {err && (
                <span
                  role="alert"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontSize: 12,
                    color: "var(--lcs-attention)",
                  }}
                >
                  {err}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <LcsButton
          ref={addButton}
          type="button"
          variant="secondary"
          disabled={atMax}
          onClick={add}
        >
          Add {rowLabel.toLowerCase()}
        </LcsButton>
        <span
          aria-live="polite"
          style={{
            fontFamily: "var(--font-lcs-ui)",
            fontSize: 12,
            color: "var(--lcs-ink-muted)",
          }}
        >
          {atMax ? `Maximum of ${max} reached.` : `${items.length} of ${max}`}
        </span>
      </div>
    </div>
  );
}

import { type ReactNode, useId } from "react";
import { packHelperStyle, packLabelStyle } from "./field-styles";

// Field wrapper for the pack forms: label, optional hint, error text, required marker. The label is tied to the
// control by htmlFor/id; the hint and the error are tied by aria-describedby; an error also sets aria-invalid.
// Styled with the same tokens as components/lcs/FormField.tsx (which cannot link helper text to its input).
// The control is rendered by `children`, which receives the props it must spread onto the real <input>/<select>.

export type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

export function PackField({
  label,
  hint,
  error,
  required,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  /** e.g. "12 / 300", shown at the right of the hint line and announced politely. */
  counter?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={id} style={packLabelStyle}>
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: "var(--lcs-attention)" }}>
            {" "}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true as const } : {}),
        ...(required ? { "aria-required": true as const } : {}),
      })}
      {(hint || counter) && (
        <div className="flex justify-between gap-3">
          {hint ? (
            <span id={hintId} style={packHelperStyle(false)}>
              {hint}
            </span>
          ) : (
            <span />
          )}
          {counter && (
            <span aria-live="polite" style={packHelperStyle(false)}>
              {counter}
            </span>
          )}
        </div>
      )}
      {error && (
        <span id={errorId} role="alert" style={packHelperStyle(true)}>
          {error}
        </span>
      )}
    </div>
  );
}

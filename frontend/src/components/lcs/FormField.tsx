import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, useId } from "react";

/** Component 08 — Form field set. Label above input, always; helper text
 * below, 11px, gray. Error: border and helper text switch to the attention
 * tone, label stays neutral — no red anywhere, attention amber covers
 * errors too. Inputs 32px height, flat, single 1px border, no inner
 * shadow, sharp corners. */

const fieldWrapClass = "flex flex-col gap-1.5";
const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--lcs-ink)",
};
const helperStyle = (error: boolean): React.CSSProperties => ({
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 11,
  color: error ? "var(--lcs-attention)" : "var(--lcs-ink-muted)",
});
const inputBase = (error: boolean): React.CSSProperties => ({
  height: 32,
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 14,
  color: "var(--lcs-ink)",
  background: "var(--lcs-white)",
  border: `1px solid ${error ? "var(--lcs-attention)" : "var(--lcs-line)"}`,
  borderRadius: 0,
  padding: "0 10px",
});

function FieldShell({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fieldWrapClass}>
      <label style={labelStyle}>{label}</label>
      {children}
      {helper && <span style={helperStyle(!!error)}>{helper}</span>}
    </div>
  );
}

export function LcsTextField({
  label,
  helper,
  error,
  id,
  ...rest
}: { label: string; helper?: string; error?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} helper={helper} error={error}>
      <input id={fieldId} className="w-full outline-none" style={inputBase(!!error)} {...rest} />
    </FieldShell>
  );
}

export function LcsSelectField({
  label,
  helper,
  error,
  id,
  children,
  ...rest
}: { label: string; helper?: string; error?: boolean; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} helper={helper} error={error}>
      <select id={fieldId} className="w-full outline-none" style={inputBase(!!error)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
}

export function LcsTextareaField({
  label,
  helper,
  error,
  id,
  rows = 3,
  ...rest
}: { label: string; helper?: string; error?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell label={label} helper={helper} error={error}>
      <textarea
        id={fieldId}
        rows={rows}
        className="w-full outline-none resize-none"
        style={{ ...inputBase(!!error), height: "auto", padding: "8px 10px" }}
        {...rest}
      />
    </FieldShell>
  );
}

export function LcsDropzone({
  label,
  helper,
  error,
  hint = "Drop file or click to upload",
  onFilesSelected,
}: {
  label: string;
  helper?: string;
  error?: boolean;
  hint?: string;
  onFilesSelected?: (files: FileList) => void;
}) {
  const autoId = useId();
  return (
    <FieldShell label={label} helper={helper} error={error}>
      <label
        htmlFor={autoId}
        className="w-full flex items-center justify-center text-center cursor-pointer"
        style={{
          minHeight: 96,
          fontFamily: "var(--font-lcs-ui)",
          fontSize: 13,
          color: "var(--lcs-ink-muted)",
          background: "var(--lcs-surface)",
          border: `1px dashed ${error ? "var(--lcs-attention)" : "var(--lcs-line)"}`,
        }}
      >
        {hint}
        <input
          id={autoId}
          type="file"
          className="sr-only"
          onChange={(e) => e.target.files && onFilesSelected?.(e.target.files)}
        />
      </label>
    </FieldShell>
  );
}

import type { ReactNode } from "react";
import type { SizeIndicator } from "@/lib/pack/list-form-common";

// Small pieces shared by the Team and Cap table forms.

export const DECLARED_HINT =
  "Details you declare here are verified later, only if a deal proceeds.";

const smallText: React.CSSProperties = {
  fontFamily: "var(--font-lcs-ui)",
  fontSize: 12,
  color: "var(--lcs-ink-muted)",
};

// Form-level problems (no founder, too many rows, too large), shown once at the top of the form.
export function FormLevelErrors({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div
      role="alert"
      className="text-sm p-3 flex flex-col gap-1"
      style={{
        background: "var(--lcs-attention-wash)",
        border: "1px solid var(--lcs-attention)",
        color: "var(--lcs-ink)",
      }}
    >
      {messages.map((m) => (
        <span key={m}>{m}</span>
      ))}
    </div>
  );
}

// Remaining size against the 8192-byte limit. Over the limit the text turns to the attention colour and saving is
// blocked by the form (the value is never shortened).
export function SizeLine({ size }: { size: SizeIndicator }) {
  return (
    <span
      aria-live="polite"
      style={{
        ...smallText,
        color: size.over ? "var(--lcs-attention)" : smallText.color,
        fontWeight: size.over ? 600 : 400,
      }}
    >
      {size.text}
    </span>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <span style={smallText}>{children}</span>;
}

export function CheckboxField({
  label,
  ariaLabel,
  name,
  checked,
  onChange,
  onBlur,
}: {
  label: string;
  ariaLabel: string;
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  onBlur?: () => void;
}) {
  return (
    <label
      className="inline-flex items-center gap-2 min-h-[32px] cursor-pointer"
      style={{
        fontFamily: "var(--font-lcs-ui)",
        fontSize: 14,
        color: "var(--lcs-ink)",
      }}
    >
      <input
        type="checkbox"
        name={name}
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
      />
      {label}
    </label>
  );
}

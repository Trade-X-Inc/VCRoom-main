import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

/** Component 09 — Button set. Primary / secondary / destructive / text-link.
 * One accent, for primary only. Destructive is outlined amber (attention
 * tone), never filled — it should read as serious, not alarming. No red
 * anywhere in the system. */

type Variant = "primary" | "secondary" | "destructive" | "text-link";

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--lcs-accent)",
    color: "var(--lcs-white)",
    border: "1px solid var(--lcs-accent)",
  },
  secondary: {
    background: "var(--lcs-white)",
    color: "var(--lcs-ink)",
    border: "1px solid var(--lcs-line)",
  },
  destructive: {
    background: "var(--lcs-white)",
    color: "var(--lcs-attention)",
    border: "1px solid var(--lcs-attention)",
  },
  "text-link": {
    background: "transparent",
    color: "var(--lcs-accent)",
    border: "1px solid transparent",
    padding: 0,
    height: "auto",
  },
};

export const LcsButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }
>(function LcsButton({ variant = "secondary", className = "", style, children, ...rest }, ref) {
  const isTextLink = variant === "text-link";
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-1.5 shrink-0 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
        isTextLink ? "text-[13px] underline underline-offset-2" : "h-[28px] px-3 text-[13px]"
      } ${className}`}
      style={{
        fontFamily: "var(--font-lcs-ui)",
        fontWeight: 500,
        borderRadius: isTextLink ? 0 : "var(--radius-lcs-control)",
        ...VARIANT_STYLE[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

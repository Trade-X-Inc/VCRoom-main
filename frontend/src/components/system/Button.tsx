import type { ButtonHTMLAttributes } from "react";

/**
 * The only three buttons in the design system.
 *
 * primary — gradient purple, white text, no border
 * ghost   — no background, ink text, 1px ink/8% border
 * text    — no chrome, gradient text, underline on hover
 *
 * No amber, green or red buttons exist. Status is a StatusDot, never a button.
 * Copy rule: max 3 words.
 */
export function HsButton({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "text";
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 text-[13px] font-medium " +
    "transition-opacity disabled:opacity-40 disabled:pointer-events-none " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/20";

  const variants: Record<string, string> = {
    primary: "hs-gradient rounded-lg px-4 py-2 text-white",
    ghost:
      "rounded-lg px-4 py-2 text-[#0A0A0B] border border-black/8 bg-transparent hover:bg-black/[0.02]",
    text: "hs-gradient-text bg-transparent border-0 p-0 hover:underline",
  };

  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

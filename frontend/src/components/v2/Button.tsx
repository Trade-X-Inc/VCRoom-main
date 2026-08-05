// Button — v2 variants (DESIGN.md §6.2).
//
//   primary    Solid --v2-accent, white text, 2px radius, 32px height. One per
//              screen — the single most likely next action.
//   secondary  1px --v2-rule border, panel background, ink text. Everything else.
//   quiet      No border, ink-secondary text, underline on hover. Tertiary in
//              dense contexts.
//   adverse    1px --v2-adverse border, adverse text, NEVER solid fill.
//              Destructive; always paired with a confirmation by the caller.
//
// Labels are verbs naming exactly what happens (§6.2 / §12): "Accept term",
// "Release document" — never "Submit"/"OK"/"Continue". That is the caller's
// responsibility; this component only enforces appearance.
//
// Focus ring is a visible 2px accent outline with 1px offset (§6.3 / §11) —
// never removed. 2px radius (§4.3) via --v2-radius, no shadow ever.

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "quiet" | "adverse";

export interface V2ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 font-v2-ui font-medium " +
  "outline-none transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-v2-accent text-white hover:brightness-110",
  secondary:
    "border border-v2-rule bg-v2-panel text-v2-ink hover:bg-v2-accent-wash",
  quiet:
    "text-v2-ink-secondary hover:underline",
  adverse:
    "border border-v2-adverse text-v2-adverse hover:bg-v2-adverse-wash",
};

export function V2Button({ variant = "secondary", className, style, ...rest }: V2ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], className)}
      style={{
        height: "32px",
        paddingInline: "12px",
        fontSize: "13px",
        borderRadius: "var(--v2-radius)",
        // focus ring colour (utility can't set outline-color to a var cleanly)
        outlineColor: "var(--v2-accent)",
        ...style,
      }}
      {...rest}
    />
  );
}

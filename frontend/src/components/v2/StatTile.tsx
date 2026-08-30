// V2StatTile — a labelled metric card for dashboard/bento layouts.
//
// New primitive, added for the deal-room overview bento-grid rebuild.
// Pattern borrowed from the Figma design reference's "Active Mandates" /
// "Evidence Completeness" tiles — label + big value, optional tone on the
// value for a satisfied/attention/adverse reading (reuses StatusTone, never
// a bespoke colour). No shadows, no radius beyond --v2-radius, no colour
// fill on the tile itself (§13 Prohibitions) — only the value text may take
// a semantic tone colour, matching StatusLabel's "colour never alone" rule
// since the label above it always states what the number means in words.

import { cn } from "@/lib/utils";
import type { StatusTone } from "./StatusLabel";

const TONE_COLOR: Record<StatusTone, string> = {
  satisfied: "var(--v2-satisfied)",
  attention: "var(--v2-attention)",
  adverse: "var(--v2-adverse)",
  neutral: "var(--v2-ink)",
};

export interface V2StatTileProps {
  label: string;
  value: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}

export function V2StatTile({ label, value, tone = "neutral", className }: V2StatTileProps) {
  return (
    <div
      className={cn("bg-v2-panel border border-v2-rule", className)}
      style={{ padding: "17px", borderRadius: "var(--v2-radius)" }}
    >
      <div
        className="font-v2-ui font-medium text-v2-ink-secondary"
        style={{ fontSize: "11px", letterSpacing: "0.06em" }}
      >
        {label}
      </div>
      <div
        className="font-v2-ui font-semibold mt-1"
        style={{ fontSize: "26px", color: TONE_COLOR[tone] }}
      >
        {value}
      </div>
    </div>
  );
}

// R15C — Hockystick success-fee schedule (config, not hardcoded UI).
//
// The fee model is the one already documented across the product (docs/seo.ts,
// docs/pricing.tsx, marketing pricing): 1.5% of the closed deal amount, with a
// minimum of $500 and a maximum of $15,000. Encoded here as the single source of
// truth so the Gate-4 fee calculation, the invoice, and any future change all
// read the same numbers. Configurable — change the constants, not the callers.

export const FEE_SCHEDULE = {
  /** Percentage of the closed deal amount taken as the platform success fee. */
  rate: 0.015, // 1.5%
  /** Fee is never below this. */
  minUsd: 500,
  /** Fee is never above this (the cap). */
  maxUsd: 15000,
  currency: "USD" as const,
} as const;

/**
 * Calculate the platform success fee from a confirmed closed deal amount (USD).
 * Applies the rate, then clamps to [min, max]. Returns whole dollars (rounded).
 * A non-positive/invalid amount yields the minimum (the floor always applies).
 */
export function calculateFee(dealAmountUsd: number): number {
  const amount = Number.isFinite(dealAmountUsd) && dealAmountUsd > 0 ? dealAmountUsd : 0;
  const raw = amount * FEE_SCHEDULE.rate;
  const clamped = Math.min(Math.max(raw, FEE_SCHEDULE.minUsd), FEE_SCHEDULE.maxUsd);
  return Math.round(clamped);
}

/** Human-readable description of the fee basis, for the fee form / invoice. */
export function feeBasisLabel(dealAmountUsd: number): string {
  const fee = calculateFee(dealAmountUsd);
  if (fee === FEE_SCHEDULE.maxUsd) return `1.5% of deal amount, capped at $${FEE_SCHEDULE.maxUsd.toLocaleString()}`;
  if (fee === FEE_SCHEDULE.minUsd) return `1.5% of deal amount, minimum $${FEE_SCHEDULE.minUsd.toLocaleString()}`;
  return "1.5% of deal amount";
}

/** Format a USD amount for display (no cents). */
export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

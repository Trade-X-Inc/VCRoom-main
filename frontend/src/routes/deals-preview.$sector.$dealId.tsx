import { createFileRoute } from "@tanstack/react-router";

// Placeholder stub, 1 Sep 2026 — exists only so Deals hub §2's row-click
// navigation type-checks and resolves. Real content is Deals hub §3
// (single-deal lifecycle: initiation, NDA gate, company profile, document
// vault, due diligence, negotiation, counsel/accountant onboarding,
// closing), built as its own separately-reported section per the build
// order — not yet built as of this commit. Do not treat this file as
// §3's implementation.

export const Route = createFileRoute("/deals-preview/$sector/$dealId")({
  component: () => null,
});

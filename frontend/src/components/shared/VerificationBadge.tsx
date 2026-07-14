import { Link } from "@tanstack/react-router";

interface VerificationBadgeProps {
  /** Numeric tier (0-4) or legacy string tier (investor-side) */
  tier: "none" | "checked" | "verified" | number | string | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
  /** ISO date of the last check — rendered as "Checked [date]" when provided */
  checkedAt?: string | null;
  /** If provided, badge becomes a link to the public verification report */
  verifySlug?: string;
  entityType?: "founder" | "investor";
}

const TIER_CONFIG: Record<string, { icon: string; label: string; className: string; tooltip: string }> = {
  // Legacy string keys (investor side)
  checked: {
    icon: "✓",
    label: "Hockystick Checked",
    className: "bg-accent text-muted-foreground border-border",
    tooltip: "Basic automated verification: website, LinkedIn, and email signals checked. Does not verify fund size or track record.",
  },
  verified: {
    icon: "✦",
    label: "Hockystick Verified",
    className: "bg-[rgba(124,58,237,0.12)] text-[#A855F7] border-[rgba(124,58,237,0.2)]",
    tooltip: "Full verification: identity, registration, and background verified by the Hockystick team.",
  },
  // Numeric tiers — the founder 0-4 model. Each tooltip states exactly what
  // the badge means, because that is the question a VC will ask.
  "1": {
    icon: "✓",
    label: "Identity Confirmed",
    className: "bg-accent text-muted-foreground border-border",
    tooltip: "All four identity checks passed: business email matches the company domain, the website mentions the company, the company was found in a public registry, and the domain has real mail infrastructure and history.",
  },
  "2": {
    icon: "✓",
    label: "Claims Verified",
    className: "bg-[rgba(16,185,129,0.12)] text-[#10B981] border-[rgba(16,185,129,0.2)]",
    tooltip: "At least 3 stated claims (including 1 financial) are each backed by a document that AI review confirmed supports that specific claim.",
  },
  "3": {
    icon: "✓",
    label: "Operationally Verified",
    className: "bg-[rgba(59,130,246,0.12)] text-[#3B82F6] border-[rgba(59,130,246,0.2)]",
    tooltip: "Three primary operational documents (financial activity, customer contract, team evidence) passed strict AI checks, then a Hockystick team member manually reviewed them before the badge was awarded.",
  },
  "4": {
    icon: "✦",
    label: "Hockystick Verified",
    className: "bg-[rgba(124,58,237,0.12)] text-[#A855F7] border-[rgba(124,58,237,0.2)]",
    tooltip: "All prior tiers complete, plus a live video review with a named Hockystick reviewer who confirmed identity against documents.",
  },
};

function formatChecked(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function VerificationBadge({
  tier,
  size = "sm",
  showLabel = true,
  checkedAt,
  verifySlug,
  entityType = "founder",
}: VerificationBadgeProps) {
  if (tier === null || tier === undefined || tier === "none" || tier === 0 || tier === "0") return null;

  const key = String(tier);
  const c = TIER_CONFIG[key];
  if (!c) return null;

  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2.5 py-1";
  const className = `inline-flex items-center gap-1 rounded-full border font-medium ${sizeClass} ${c.className}`;

  const inner = (
    <>
      <span>{c.icon}</span>
      {showLabel && <span>{c.label}</span>}
      {showLabel && checkedAt && (
        <span className="opacity-60 font-normal">· Checked {formatChecked(checkedAt)}</span>
      )}
    </>
  );

  if (verifySlug) {
    return (
      <Link
        to={`/verify/${verifySlug}` as any}
        title={`${c.tooltip} Click for the full verification report.`}
        data-testid="verification-badge"
        className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span title={c.tooltip} data-testid="verification-badge" className={`${className} cursor-help`}>
      {inner}
    </span>
  );
}

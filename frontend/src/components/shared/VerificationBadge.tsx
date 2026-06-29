import { Link } from "@tanstack/react-router";

interface VerificationBadgeProps {
  /** Legacy string tier (investor-side) OR numeric tier (0-3) */
  tier: "none" | "checked" | "verified" | number | string | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
  /** If provided, badge becomes a link to the verify page */
  verifySlug?: string;
  entityType?: "founder" | "investor";
}

const TIER_CONFIG: Record<string, { icon: string; label: string; className: string; tooltip: string }> = {
  // Legacy string keys (investor side)
  checked: {
    icon: "✓",
    label: "Hockystick Checked",
    className: "bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.12)]",
    tooltip: "Basic automated verification: website, LinkedIn, and email signals checked. Does not verify fund size or track record.",
  },
  verified: {
    icon: "✦",
    label: "Hockystick Verified",
    className: "bg-[rgba(124,58,237,0.12)] text-[#A855F7] border-[rgba(124,58,237,0.2)]",
    tooltip: "Full verification: identity, registration, and background verified by the Hockystick team.",
  },
  // Numeric tier keys
  "1": {
    icon: "✓",
    label: "Hockystick Checked",
    className: "bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.12)]",
    tooltip: "Automated verification passed: website resolves, content matches profile, LinkedIn exists, email domain matches. Score ≥60/100.",
  },
  "2": {
    icon: "✓",
    label: "Document Verified",
    className: "bg-[rgba(16,185,129,0.12)] text-[#10B981] border-[rgba(16,185,129,0.2)]",
    tooltip: "Document verification: business registration or trade license cross-checked by AI against company profile.",
  },
  "3": {
    icon: "✦",
    label: "Hockystick Verified",
    className: "bg-[rgba(124,58,237,0.12)] text-[#A855F7] border-[rgba(124,58,237,0.2)]",
    tooltip: "Human-reviewed verification: identity and registration manually confirmed by the Hockystick team.",
  },
};

export function VerificationBadge({
  tier,
  size = "sm",
  showLabel = true,
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
    </>
  );

  if (verifySlug) {
    return (
      <Link
        to={`/verify/${verifySlug}` as any}
        title={c.tooltip}
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

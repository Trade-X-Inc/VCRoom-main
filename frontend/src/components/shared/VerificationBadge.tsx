interface VerificationBadgeProps {
  tier: "none" | "checked" | "verified" | string | null | undefined;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function VerificationBadge({ tier, size = "sm", showLabel = true }: VerificationBadgeProps) {
  if (!tier || tier === "none") return null;

  const config: Record<string, { icon: string; label: string; className: string; tooltip: string }> = {
    checked: {
      icon: "✓",
      label: "Hockystick Checked",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      tooltip: "Basic verification: website, LinkedIn, and public signals checked automatically by Hockystick. Does not verify fund size or investment history.",
    },
    verified: {
      icon: "✦",
      label: "Hockystick Verified",
      className: "bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/20",
      tooltip: "Full verification: identity, fund registration, and track record verified by Hockystick team.",
    },
  };

  const c = config[tier];
  if (!c) return null;

  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  return (
    <span title={c.tooltip} className={`inline-flex items-center gap-1 rounded-full border font-medium cursor-help ${sizeClass} ${c.className}`}>
      <span>{c.icon}</span>
      {showLabel && <span>{c.label}</span>}
    </span>
  );
}

import { Link } from "@tanstack/react-router";
import { AlertTriangle, Lightbulb, X } from "lucide-react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

interface ProfileCompletionBannerProps {
  variant: "founder" | "investor";
  percent?: number;
}

export function ProfileCompletionBanner({ variant, percent }: ProfileCompletionBannerProps) {
  const { progress, markStep } = useOnboardingProgress();

  const dismissKey = variant === "founder" ? "completeness_banner_dismissed" : "thesis_banner_dismissed";
  const dismissed = progress?.steps?.[dismissKey] === true;

  if (dismissed) return null;

  const isFounder = variant === "founder";

  return (
    <div
      className="border px-4 py-3 mb-4 flex items-center justify-between gap-3"
      style={{ background: "var(--lcs-attention-wash)", borderColor: "var(--lcs-attention)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isFounder ? (
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-attention)" }} />
        ) : (
          <Lightbulb className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-attention)" }} />
        )}
        <p className="text-sm min-w-0" style={{ color: "var(--lcs-ink)" }}>
          {isFounder ? (
            <>
              {percent}% ready ·{" "}
              <Link to="/app/profile" className="font-medium underline underline-offset-2" style={{ color: "var(--lcs-accent)" }}>
                Complete profile →
              </Link>
            </>
          ) : (
            <>
              Add your investment thesis so founders can see what you're looking for.{" "}
              <Link to="/app/investor/profile" className="font-medium underline underline-offset-2" style={{ color: "var(--lcs-accent)" }}>
                Set thesis →
              </Link>
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => markStep(dismissKey, true)}
        className="grid h-6 w-6 shrink-0 place-items-center transition-colors"
        style={{ color: "var(--lcs-ink-muted)" }}
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

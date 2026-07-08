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
      className="rounded-xl border px-4 py-3 mb-4 flex items-center justify-between gap-3"
      style={
        isFounder
          ? { background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.3)" }
          : { background: "rgba(124,58,237,0.06)", borderColor: "rgba(124,58,237,0.2)" }
      }
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isFounder ? (
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#F59E0B" }} />
        ) : (
          <Lightbulb className="h-4 w-4 shrink-0" style={{ color: "#7C3AED" }} />
        )}
        <p className="text-sm text-foreground min-w-0">
          {isFounder ? (
            <>
              Your profile is {percent}% complete. Investors see incomplete profiles as a risk signal.{" "}
              <Link to="/app/profile" className="font-medium underline underline-offset-2" style={{ color: "#F59E0B" }}>
                See what's missing →
              </Link>
            </>
          ) : (
            <>
              Set your investment thesis to get matched with relevant founders.{" "}
              <Link to="/app/investor/profile" className="font-medium underline underline-offset-2" style={{ color: "#7C3AED" }}>
                Set thesis →
              </Link>
            </>
          )}
        </p>
      </div>
      <button
        onClick={() => markStep(dismissKey, true)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

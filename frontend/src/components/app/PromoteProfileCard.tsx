import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Rocket, X } from "lucide-react";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

export function PromoteProfileCard() {
  const navigate = useNavigate();
  const { progress, markStep, setCurrentStep } = useOnboardingProgress();

  const shouldShow =
    !!progress &&
    progress.account_type === "founder" &&
    progress.current_step === "promote" &&
    !progress.steps?.promote_dismissed;

  useEffect(() => {
    if (shouldShow && !progress?.steps?.promote_shown) {
      markStep("promote_shown", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  if (!shouldShow) return null;

  function handleInvite() {
    navigate({ to: "/app/deal-rooms", search: { create: "1" } as any });
  }

  function handleSkip() {
    markStep("promote_dismissed", true);
    setCurrentStep("done");
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10">
            <Rocket className="h-5 w-5 text-brand" />
          </div>
          <div>
            <div className="text-sm font-semibold">Your profile is live</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
              Promote it to VCs you're already talking to — invite one into a deal room to share it directly.
            </div>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Skip for now"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleInvite}
          className="rounded-md bg-gradient-brand px-3 py-2 text-sm font-medium text-brand-foreground shadow-glow hover:opacity-90"
        >
          Invite a VC
        </button>
        <button
          onClick={handleSkip}
          className="rounded-md border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

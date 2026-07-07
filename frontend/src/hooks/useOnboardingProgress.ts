import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useAccountContext } from "@/hooks/useAccountContext";

export type OnboardingAccountType = "founder" | "investor";

export type OnboardingProgress = {
  id: string;
  user_id: string;
  account_type: OnboardingAccountType;
  current_step: string;
  steps: Record<string, boolean>;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapAccountType(accountType: string): OnboardingAccountType | null {
  if (accountType.startsWith("founder_")) return "founder";
  if (accountType.startsWith("investor_")) return "investor";
  return null;
}

export function useOnboardingProgress() {
  const { user } = useAuth();
  const accountContext = useAccountContext();
  const queryClient = useQueryClient();

  const onboardingAccountType = mapAccountType(accountContext.accountType);
  const queryKey = ["onboarding-progress", user?.id];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!user?.id && !accountContext.loading && !!onboardingAccountType,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<OnboardingProgress | null> => {
      const uid = user!.id;

      const { data: existing } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (existing) return existing as OnboardingProgress;

      const { data: created, error } = await supabase
        .from("onboarding_progress")
        .upsert(
          {
            user_id: uid,
            account_type: onboardingAccountType,
            current_step: "tour",
            steps: {},
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();

      if (error) {
        console.error("[onboarding] failed to create progress row", error);
        return null;
      }

      return created as OnboardingProgress;
    },
  });

  async function markStep(stepKey: string, value: boolean = true) {
    if (!user?.id || !data) return;

    const nextSteps = { ...data.steps, [stepKey]: value };
    queryClient.setQueryData(queryKey, { ...data, steps: nextSteps });

    const { error } = await supabase
      .from("onboarding_progress")
      .update({ steps: nextSteps, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) {
      console.error("[onboarding] failed to mark step", stepKey, error);
      queryClient.invalidateQueries({ queryKey });
    }
  }

  async function setCurrentStep(step: string) {
    if (!user?.id || !data) return;

    const isDone = step === "done";
    queryClient.setQueryData(queryKey, {
      ...data,
      current_step: step,
      completed_at: isDone ? new Date().toISOString() : data.completed_at,
    });

    const { error } = await supabase
      .from("onboarding_progress")
      .update({
        current_step: step,
        completed_at: isDone ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("[onboarding] failed to set current step", step, error);
      queryClient.invalidateQueries({ queryKey });
    }
  }

  async function dismissTour() {
    await markStep("tour_viewed", true);
  }

  return {
    progress: data ?? null,
    isLoading: accountContext.loading || isLoading,
    markStep,
    setCurrentStep,
    dismissTour,
  };
}

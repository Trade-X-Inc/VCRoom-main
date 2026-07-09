import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────────────────────
// useSubscription — single client-side source of truth for plan state.
//
// If no subscription row exists, the user is treated as trialing with
// trial_ends_at = auth user created_at + 30 days. New signups therefore get
// a 30-day trial with zero writes at signup time. Trial users get the Pro
// limits for their role (the trial is the full product, not a crippled one).
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  plan_name: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "paused";
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  created_at: string;
}

export interface PlanLimits {
  plan_id: string;
  plan_name: string;
  user_type: "founder" | "investor" | "both";
  price_monthly_usd: number;
  deal_room_limit: number;
  team_member_limit: number;
  ai_calls_per_month: number;
  vc_connections_limit: number;
  has_full_ai: boolean;
  has_verification: boolean;
  has_roast_discount: boolean;
  roast_price_usd: number | null;
  extra_deal_room_price_usd: number;
  extra_user_price_usd: number;
}

interface SubscriptionState {
  subscription: SubscriptionRow | null;
  limits: PlanLimits | null;
  /** true when there's no row yet — the implicit 30-day signup trial */
  isImplicitTrial: boolean;
  trialEndsAt: string | null;
}

const TRIAL_DAYS = 30;

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery<SubscriptionState>({
    queryKey: ["subscription", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [{ data: sub }, { data: authData }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      // Which plan's limits apply?
      const defaultPlanId = user!.role === "investor" ? "investor_pro" : "founder_pro";
      const planId = (sub as SubscriptionRow | null)?.plan_id ?? defaultPlanId;

      const { data: limits } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan_id", planId)
        .maybeSingle();

      // Implicit trial: no row => trialing since account creation
      let trialEndsAt: string | null = (sub as SubscriptionRow | null)?.trial_ends_at ?? null;
      if (!sub) {
        const createdAt = authData?.user?.created_at;
        if (createdAt) {
          trialEndsAt = new Date(
            new Date(createdAt).getTime() + TRIAL_DAYS * 24 * 3600 * 1000,
          ).toISOString();
        }
      }

      return {
        subscription: (sub as SubscriptionRow | null) ?? null,
        limits: (limits as PlanLimits | null) ?? null,
        isImplicitTrial: !sub,
        trialEndsAt,
      };
    },
  });

  const state = query.data;
  const sub = state?.subscription ?? null;
  const limits = state?.limits ?? null;

  const status = sub?.status ?? (state ? "trialing" : null);
  const isTrialing = status === "trialing";
  const isActive = status === "active";
  const isPastDue = status === "past_due";
  const isCancelled = status === "cancelled";

  const trialEndsAt = state?.trialEndsAt ?? null;
  const trialDaysRemaining =
    isTrialing && trialEndsAt
      ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 3600 * 1000))
      : null;
  const trialExpired = isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 0;

  return {
    subscription: sub,
    limits,
    isTrialing,
    isActive,
    isPastDue,
    isCancelled,
    /** trial window elapsed and no active plan */
    trialExpired,
    trialEndsAt,
    trialDaysRemaining,
    canCreateDealRoom: (currentCount: number) =>
      limits ? currentCount < limits.deal_room_limit : true,
    canAddTeamMember: (currentCount: number) =>
      limits ? currentCount < limits.team_member_limit : true,
    canUseAI: limits?.has_full_ai ?? true,
    planName: sub?.plan_name ?? (limits?.plan_name ? `${limits.plan_name} (trial)` : "Trial"),
    isLoading: query.isLoading,
  };
}

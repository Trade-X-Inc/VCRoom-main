import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export type AccountContext = {
  accountType:
    | "founder_owner"
    | "founder_admin"
    | "founder_member"
    | "investor_owner"
    | "investor_admin"
    | "investor_member"
    | "unknown";
  role: string;
  startupId: string | null;
  investorProfileId: string | null;
  isOwner: boolean;
  canManageTeam: boolean;
  canAccessFullDashboard: boolean;
  teamAccountId: string | null;
  companyName: string | null;
  loading: boolean;
};

const LOADING_CTX: AccountContext = {
  accountType: "unknown",
  role: "",
  startupId: null,
  investorProfileId: null,
  isOwner: false,
  canManageTeam: false,
  canAccessFullDashboard: false,
  teamAccountId: null,
  companyName: null,
  loading: true,
};

export function useAccountContext(): AccountContext {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["account-context", user?.id],
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const uid = user!.id;

      // 1. Check if founder (startups.founder_id = user.id)
      const { data: startup } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", uid)
        .maybeSingle();

      if (startup) {
        return {
          accountType: "founder_owner" as const,
          role: "owner",
          startupId: startup.id,
          investorProfileId: null,
          isOwner: true,
          canManageTeam: true,
          canAccessFullDashboard: true,
          teamAccountId: null,
          companyName: startup.company_name ?? null,
        };
      }

      // 2. Check if investor owner (investor_profiles.user_id = user.id)
      const { data: investorProfile } = await supabase
        .from("investor_profiles")
        .select("id, fund_name, your_name")
        .eq("user_id", uid)
        .maybeSingle();

      if (investorProfile) {
        return {
          accountType: "investor_owner" as const,
          role: "owner",
          startupId: null,
          investorProfileId: investorProfile.id ?? uid,
          isOwner: true,
          canManageTeam: true,
          canAccessFullDashboard: true,
          teamAccountId: null,
          companyName: investorProfile.fund_name ?? investorProfile.your_name ?? null,
        };
      }

      // 3. Check team membership
      const { data: teamAccount } = await supabase
        .from("startup_team_accounts")
        .select("id, startup_id, investor_profile_id, role, startups(company_name)")
        .eq("user_id", uid)
        .eq("status", "active")
        .maybeSingle();

      if (teamAccount) {
        const role = teamAccount.role ?? "viewer";
        const isAdmin = role === "admin";
        const canFull = isAdmin;

        if (teamAccount.startup_id) {
          const companyName =
            (teamAccount.startups as any)?.company_name ?? null;
          return {
            accountType: (isAdmin ? "founder_admin" : "founder_member") as AccountContext["accountType"],
            role,
            startupId: teamAccount.startup_id,
            investorProfileId: null,
            isOwner: false,
            canManageTeam: isAdmin,
            canAccessFullDashboard: canFull,
            teamAccountId: teamAccount.id,
            companyName,
          };
        }

        if (teamAccount.investor_profile_id) {
          return {
            accountType: (isAdmin ? "investor_admin" : "investor_member") as AccountContext["accountType"],
            role,
            startupId: null,
            investorProfileId: teamAccount.investor_profile_id,
            isOwner: false,
            canManageTeam: isAdmin,
            canAccessFullDashboard: canFull,
            teamAccountId: teamAccount.id,
            companyName: null,
          };
        }
      }

      // 4. Nothing found — unknown/onboarding
      return {
        accountType: "unknown" as const,
        role: "",
        startupId: null,
        investorProfileId: null,
        isOwner: false,
        canManageTeam: false,
        canAccessFullDashboard: false,
        teamAccountId: null,
        companyName: null,
      };
    },
  });

  if (authLoading || isLoading || !data) return LOADING_CTX;

  return { ...data, loading: false };
}

import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

// Ref-counted so the many simultaneous useAccountContext() callers share one
// underlying Supabase realtime channel per user instead of colliding.
const accountContextChannels = new Map<string, { channel: RealtimeChannel; refCount: number }>();

function subscribeAccountContextChannel(userId: string, queryClient: QueryClient) {
  const existing = accountContextChannels.get(userId);
  if (existing) {
    existing.refCount += 1;
    return;
  }
  const channel = supabase
    .channel(`account-context:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "startup_team_accounts", filter: `user_id=eq.${userId}` },
      () => { queryClient.invalidateQueries({ queryKey: ["account-context", userId] }); }
    )
    .subscribe();
  accountContextChannels.set(userId, { channel, refCount: 1 });
}

function unsubscribeAccountContextChannel(userId: string) {
  const existing = accountContextChannels.get(userId);
  if (!existing) return;
  existing.refCount -= 1;
  if (existing.refCount <= 0) {
    supabase.removeChannel(existing.channel);
    accountContextChannels.delete(userId);
  }
}

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
  const queryClient = useQueryClient();

  // R12 step 4 — a role change by an admin (startup_team_accounts.role)
  // must take effect on the affected member's next data fetch, not their
  // next login. staleTime alone (5 min) isn't enough; mirrors the realtime
  // invalidation pattern already used for notifications
  // (NotificationBell.tsx) — a channel scoped to the caller's own row,
  // invalidating this hook's own cache key on any change.
  //
  // This hook is called from many components at once (MemberShell,
  // AppShell, app.tsx, app.audit.tsx, app.member.index.tsx, ...) — a plain
  // per-mount subscription throws "cannot add postgres_changes callbacks
  // ... after subscribe()" because the Supabase client treats repeated
  // .channel() calls with the same topic name as the same channel, and a
  // second .on().subscribe() collides with the first. Ref-count instead:
  // only the first mount opens the channel, only the last unmount closes it.
  useEffect(() => {
    if (!user?.id) return;
    subscribeAccountContextChannel(user.id, queryClient);
    return () => { unsubscribeAccountContextChannel(user.id); };
  }, [user?.id, queryClient]);

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

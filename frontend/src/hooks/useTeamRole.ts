import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FOUNDER_PERMISSIONS, INVESTOR_PERMISSIONS } from "@/lib/roles";

interface TeamRoleResult {
  role: string | null;
  isPrimaryAccount: boolean;
  loading: boolean;
  can: (permission: string) => boolean;
}

export function useTeamRole(accountType: "founder" | "investor"): TeamRoleResult {
  const [role, setRole] = useState<string | null>(null);
  const [isPrimaryAccount, setIsPrimaryAccount] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      if (accountType === "founder") {
        const { data: startup } = await supabase
          .from("startups")
          .select("id")
          .eq("founder_id", user.id)
          .maybeSingle();

        if (startup) {
          if (!cancelled) { setIsPrimaryAccount(true); setRole("owner"); setLoading(false); }
          return;
        }

        const { data: teamAccount } = await supabase
          .from("startup_team_accounts")
          .select("role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .not("startup_id", "is", null)
          .maybeSingle();

        if (!cancelled) { setRole(teamAccount?.role ?? null); setLoading(false); }
      } else {
        const { data: investorProfile } = await supabase
          .from("investor_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (investorProfile) {
          if (!cancelled) { setIsPrimaryAccount(true); setRole("owner"); setLoading(false); }
          return;
        }

        const { data: teamAccount } = await supabase
          .from("startup_team_accounts")
          .select("role")
          .eq("user_id", user.id)
          .eq("status", "active")
          .is("startup_id", null)
          .maybeSingle();

        if (!cancelled) { setRole(teamAccount?.role ?? null); setLoading(false); }
      }
    };

    getRole();
    return () => { cancelled = true; };
  }, [accountType]);

  const can = (permission: string): boolean => {
    if (isPrimaryAccount) return true;
    if (!role) return false;
    const permissions =
      accountType === "founder"
        ? FOUNDER_PERMISSIONS[role]
        : INVESTOR_PERMISSIONS[role];
    return permissions?.[permission] ?? false;
  };

  return { role, isPrimaryAccount, loading, can };
}

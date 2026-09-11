import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import { roomListProgressInvestor } from "@/lib/actions/deal-room-core";
import { useAuth } from "@/lib/auth";

/**
 * Investor mirror of useRaiseProgress — drives the sidebar badges and the
 * /app/investor home spine. Read-only aggregation, no new writes.
 */
export interface DealFlowProgress {
  thesisSet: boolean;
  orgDetailsSet: boolean;
  teamMembersCount: number;
  notificationPrefsSet: boolean;
  watchlistCount: number;
  activeRooms: number;
  pendingDecisions: number;
  portfolioCount: number;
}

export function useDealFlowProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deal-flow-progress", user?.id],
    enabled: !!user?.id && user?.role === "investor",
    staleTime: 60_000,
    queryFn: async (): Promise<DealFlowProgress> => {
      // room_list_progress_investor replaces both the deal_room_members
      // membership lookup and the follow-up deal_rooms fetch — one call,
      // already excludes rooms where the caller is a room-scoped lawyer
      // (CLAUDE.md §20.1: a lawyer's global role can be "investor", but
      // this metric is diligence-pipeline-adjacent and they have no
      // diligence access under (b)). {ok:true, rooms:[]} for a genuine
      // zero-room investor reaches roomRows as [] the normal way. A real
      // gateway failure MUST propagate and fail the whole useQuery (data
      // stays undefined, consumers already null-guard `p`), not silently
      // degrade to [] — a caught failure that renders a plausible "0
      // rooms" state is worse than an uncaught one (CLAUDE.md §7.4).
      const [profile, watchlist, team, userRow, roomsResult] = await Promise.all([
        supabase
          .from("investor_profiles")
          .select("thesis_statement, sectors, stages, fund_name, geography")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("investor_watchlist")
          .select("id, status", { count: "exact" })
          .eq("investor_id", user!.id),
        supabase
          .from("startup_team_accounts")
          .select("id", { count: "exact", head: true })
          .eq("investor_profile_id", user!.id)
          .eq("status", "active"),
        supabase
          .from("users")
          .select("notification_prefs")
          .eq("id", user!.id)
          .maybeSingle(),
        callAction<{ rooms: any[] }>(roomListProgressInvestor, user!.id, {}),
      ]);
      for (const r of [profile, watchlist, team, userRow]) {
        if (r.error) console.error("[deal-flow] fetch failed:", r.error);
      }

      const roomRows = roomsResult.rooms ?? [];
      const activeRooms = roomRows.filter(
        (r) => r.status !== "closed" && r.status !== "archived",
      ).length;
      const pendingDecisions = roomRows.filter(
        (r) =>
          r.status !== "closed" &&
          r.status !== "archived" &&
          !r.investor_decision,
      ).length;

      const thesisSet = !!profile.data?.thesis_statement?.trim();
      const orgDetailsSet = !!profile.data?.fund_name?.trim() || !!profile.data?.geography?.trim();
      const portfolioCount = (watchlist.data ?? []).filter(
        (w) => w.status === "Invested",
      ).length;

      return {
        thesisSet,
        orgDetailsSet,
        teamMembersCount: team.count ?? 0,
        notificationPrefsSet: userRow.data?.notification_prefs != null,
        watchlistCount: watchlist.count ?? 0,
        activeRooms,
        pendingDecisions,
        portfolioCount,
      };
    },
  });
}

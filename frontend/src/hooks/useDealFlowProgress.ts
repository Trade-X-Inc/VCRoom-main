import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/**
 * Investor mirror of useRaiseProgress — drives the sidebar badges and the
 * /app/investor home spine. Read-only aggregation, no new writes.
 */
export interface DealFlowProgress {
  thesisSet: boolean;
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
      const [profile, watchlist, memberships] = await Promise.all([
        supabase
          .from("investor_profiles")
          .select("thesis, sectors, stages")
          .eq("user_id", user!.id)
          .maybeSingle(),
        supabase
          .from("investor_watchlist")
          .select("id, status", { count: "exact" })
          .eq("investor_id", user!.id),
        supabase
          .from("deal_room_members")
          .select("deal_room_id")
          .eq("user_id", user!.id),
      ]);
      for (const r of [profile, watchlist, memberships]) {
        if (r.error) console.error("[deal-flow] fetch failed:", r.error);
      }

      const roomIds = (memberships.data ?? []).map((m) => m.deal_room_id);
      let activeRooms = 0;
      let pendingDecisions = 0;
      if (roomIds.length) {
        const { data: rooms, error } = await supabase
          .from("deal_rooms")
          .select("id, status, investor_decision")
          .in("id", roomIds);
        if (error) console.error("[deal-flow] rooms fetch failed:", error);
        activeRooms = (rooms ?? []).filter(
          (r) => r.status !== "closed" && r.status !== "archived",
        ).length;
        pendingDecisions = (rooms ?? []).filter(
          (r) =>
            r.status !== "closed" &&
            r.status !== "archived" &&
            !r.investor_decision,
        ).length;
      }

      const thesisSet = !!profile.data?.thesis?.trim();
      const portfolioCount = (watchlist.data ?? []).filter(
        (w) => w.status === "Invested",
      ).length;

      return {
        thesisSet,
        watchlistCount: watchlist.count ?? 0,
        activeRooms,
        pendingDecisions,
        portfolioCount,
      };
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useStageTransition } from "@/hooks/useStageTransition";
import { DEAL_STAGES, type DealStage } from "@/lib/deal-room-fn";

/**
 * The single source of room metadata, membership, permissions, and NDA
 * status for every /deal-rooms/:id/* page. Every field here is backed by
 * a useQuery with a stable key and a 5-minute staleTime, so calling this
 * hook from the layout AND from a child tab does not refetch — React
 * Query serves the second call from cache.
 */
export function useDealRoomContext(dealRoomId: string) {
  const { user } = useAuth();
  const userName = user?.fullName ?? "User";

  const { data: room } = useQuery({
    queryKey: ["deal-room", dealRoomId],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("*, startups(*)")
        .eq("id", dealRoomId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: memberRow } = useQuery({
    queryKey: ["deal-room-member", dealRoomId, user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Public-whitelist fields only (name/fund/thesis/sectors) — this is the
  // always-visible summary shown from nda_signed onward on every deal-room
  // tab, not the gated mutual-disclosure data. investor_profiles has no
  // bare peer-read policy anymore (see deal_room_profile_disclosures
  // migration), so this goes through the same whitelist RPC the public
  // /i/:slug page uses, just looked up by user_id instead of slug.
  const { data: investorProfile } = useQuery({
    queryKey: ["deal-room-investor-profile-public", (room as any)?.investor_user_id],
    enabled: !!(room as any)?.investor_user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_investor_profile_by_user_id", {
        p_user_id: (room as any).investor_user_id,
      });
      return data as { your_name?: string; fund_name?: string; thesis?: string; thesis_statement?: string; sectors?: string } | null;
    },
  });

  const { data: ndaAcceptance, isLoading: ndaLoading } = useQuery({
    queryKey: ["nda-acceptance", dealRoomId, user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("id, accepted_at")
        .eq("deal_room_id", dealRoomId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: connectionOrigin } = useQuery({
    queryKey: ["deal-room-origin", dealRoomId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("discovery_requests")
        .select("responded_at, created_at")
        .eq("deal_room_id", dealRoomId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const isInvestor = memberRow ? (memberRow.role === "investor" || memberRow.role === "viewer") : user?.role === "investor";
  const isFounder = memberRow ? memberRow.role === "founder" : user?.role !== "investor";

  const { data: ownedStartup } = useQuery({
    queryKey: ["owned-startup-check", user?.id],
    enabled: !!user?.id && !isInvestor,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });
  const isStartupOwner = !!ownedStartup;

  const { data: teamAccountRow } = useQuery({
    queryKey: ["team-account-row", user?.id],
    enabled: !!user?.id && !isInvestor && !isStartupOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_team_accounts")
        .select("id, startup_id, role")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const isAdminTeamMember = teamAccountRow?.role === "admin";
  // A room-native lawyer (deal_room_members.role === "lawyer", see R14B §4)
  // is scoped entirely by their membership row in THIS room, never by
  // startup_team_accounts — that table can be unrelated (e.g. a fixture
  // account that also happens to be an External team member on a different
  // founder's team). Excluding it here stops the founder-team-assignment
  // gate below from misfiring for a lawyer whose only real access grant is
  // the deal_room_members row.
  const isLawyerMember = memberRow?.role === "lawyer";
  const isTeamMember = !!teamAccountRow && !isInvestor && !isStartupOwner && !isAdminTeamMember && !isLawyerMember;

  const { data: teamAssignment, isLoading: teamAssignmentLoading } = useQuery({
    queryKey: ["team-assignment-gate", dealRoomId, teamAccountRow?.id],
    enabled: isTeamMember && !!teamAccountRow?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_team_assignments")
        .select("deal_room_id")
        .eq("deal_room_id", dealRoomId)
        .eq("team_account_id", teamAccountRow!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  const companyName = (room as any)?.startups?.company_name ?? "Unknown Company";
  const currentStage = ((room as any)?.workflow_stage ?? "nda_signed") as DealStage;
  const currentIndex = DEAL_STAGES.indexOf(currentStage);
  const founderUserId: string | null = (room as any)?.startups?.founder_id ?? null;
  const investorUserId: string | null = (room as any)?.investor_user_id ?? null;
  const startupId: string | null = (room as any)?.startup_id ?? (room as any)?.startups?.id ?? null;
  const startup = (room as any)?.startups ?? null;

  const {
    pendingTransition,
    requesting: stageRequesting,
    approving: stageApproving,
    requestNextStage: doRequestNextStage,
    approveTransition: doApproveTransition,
    rejectTransition: doRejectTransition,
  } = useStageTransition({
    dealRoomId,
    currentStage,
    isInvestor,
    userId: user?.id ?? "",
    investorUserId,
    founderUserId,
  });

  const isApprover = !!pendingTransition && pendingTransition.requested_by !== (user?.id ?? "");

  return {
    dealRoomId,
    userId: user?.id,
    userName,
    room,
    startup,
    startupId,
    companyName,
    currentStage,
    currentIndex,
    founderUserId,
    investorUserId,
    investorProfile,
    connectionOrigin,
    ndaAcceptance,
    ndaLoading,
    isInvestor,
    isFounder,
    isLawyer: isLawyerMember,
    isStartupOwner,
    isTeamMember,
    isAdminTeamMember,
    teamAssignment,
    teamAssignmentLoading,
    pendingTransition,
    stageRequesting,
    stageApproving,
    doRequestNextStage,
    doApproveTransition,
    doRejectTransition,
    isApprover,
  };
}

export type DealRoomContext = ReturnType<typeof useDealRoomContext>;

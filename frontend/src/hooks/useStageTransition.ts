import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { callAction } from "@/lib/actions/call";
import {
  requestNextStage as requestNextStageAction,
  approveTransition as approveTransitionAction,
  rejectTransition as rejectTransitionAction,
} from "@/lib/actions/deal-room-stage";

export interface TransitionRow {
  id: string;
  deal_room_id: string;
  from_stage: string;
  to_stage: string;
  requested_by: string;
  approved_by: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at: string | null;
}

// Build Step 1 (7 Sep 2026): canonical 5-stage sequence, matching
// deal-room-fn.ts's DealStage exactly. Previously used the old
// information_vault/qa/due_diligence/term_sheet/closing vocabulary — that
// set diverged from the DB's canonical values, so requestNextStage() would
// have kept producing to_stage values the new advance_workflow_stage() RPC
// and its BEFORE UPDATE guard reject as non-adjacent/invalid.
const STAGE_ORDER = [
  "nda_signed",
  "qa",
  "diligence",
  "term_sheet",
  "closing_confirmed",
] as const;

function nextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current as typeof STAGE_ORDER[number]);
  return idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

function stageLabel(stage: string): string {
  return stage.replace(/_/g, " ");
}

interface UseStageTransitionInput {
  dealRoomId: string;
  currentStage: string;
  isInvestor: boolean;
  userId: string;
  investorUserId: string | null;
  founderUserId: string | null;
}

interface UseStageTransitionResult {
  pendingTransition: TransitionRow | null;
  requesting: boolean;
  approving: boolean;
  requestNextStage: () => Promise<void>;
  approveTransition: (transitionId: string) => Promise<void>;
  rejectTransition: (transitionId: string) => Promise<{ ok: boolean }>;
}

export function useStageTransition({
  dealRoomId,
  currentStage,
  isInvestor,
  userId,
  investorUserId,
  founderUserId,
}: UseStageTransitionInput): UseStageTransitionResult {
  const queryClient = useQueryClient();
  const [pendingTransition, setPendingTransition] = useState<TransitionRow | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [approving, setApproving] = useState(false);

  // Load and subscribe to pending transition for this room
  useEffect(() => {
    if (!dealRoomId) return;

    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("deal_room_stage_transitions")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setPendingTransition((data as TransitionRow) ?? null);
    }

    load();

    const channel = supabase
      .channel(`stage-transitions-${dealRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_room_stage_transitions",
          filter: `deal_room_id=eq.${dealRoomId}`,
        },
        () => { load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [dealRoomId]);

  const requestNextStage = async () => {
    // Ported to the gateway (Closing-stage record-wiring pass, 27 Sep
    // 2026) — deal_room.stage.requestNext (src/lib/actions/deal-room-
    // stage.ts). The action now does everything this function used to
    // do client-side: reads currentStage server-side, checks for an
    // existing pending transition, decides the diligence+investor
    // auto-advance exception, and — for the auto-approve branch — also
    // calls advance_workflow_stage itself (via the shared advanceStage()
    // helper), rather than this hook calling approveTransition() as a
    // second step. Every branch appends its own record entry.
    setRequesting(true);
    try {
      const result = await callAction<{
        transitionId: string;
        status: "pending" | "approved";
        fromStage: string;
        toStage: string;
        autoApproved: boolean;
      }>(requestNextStageAction, dealRoomId, { dealRoomId });

      if (result.autoApproved) {
        setPendingTransition(null);
        queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
        queryClient.invalidateQueries({ queryKey: ["deal-room-detail"] });
        toast.success(`Advanced to ${stageLabel(result.toStage)}.`);
      } else {
        // Notify the other party — client-side, best-effort, same as
        // before. Not gated by or recorded through the gateway (see
        // deal-room-stage.ts's header comment on notification scope).
        const recipient = isInvestor ? founderUserId : investorUserId;
        if (recipient) {
          const { error: notifErr } = await supabase.from("notifications").insert({
            user_id: recipient,
            kind: "ai_operator",
            title: "Stage advance request",
            body: isInvestor
              ? `The investor has requested to move to the next stage: ${stageLabel(result.toStage)}`
              : `The founder has requested to move to the next stage: ${stageLabel(result.toStage)}`,
            read: false,
            meta: { deal_room_id: dealRoomId, transition_id: result.transitionId },
            action_url: `/app/deal-rooms/${dealRoomId}`,
          });
          if (notifErr) console.error("[stage] request notification failed:", notifErr);
        }
        setPendingTransition({
          id: result.transitionId,
          deal_room_id: dealRoomId,
          from_stage: result.fromStage,
          to_stage: result.toStage,
          requested_by: userId,
          approved_by: null,
          status: "pending",
          created_at: new Date().toISOString(),
          resolved_at: null,
        });
        toast.success("Stage advance requested — waiting for approval.");
      }
    } catch (e: any) {
      const msg = e?.message as string | undefined;
      if (msg === "already_pending") {
        toast.info("A stage advance request is already pending.");
      } else if (msg === "no_next_stage") {
        toast.info("This room is already at its final stage.");
      } else {
        toast.error(msg ?? "Could not request next stage.");
      }
    } finally {
      setRequesting(false);
    }
  };

  const approveTransition = async (transitionId: string) => {
    // Ported to the gateway (Closing-stage record-wiring pass, 27 Sep
    // 2026) — deal_room.stage.approve (src/lib/actions/deal-room-
    // stage.ts). The action re-fetches the transition server-side,
    // enforces requested_by !== ctx.uid (self-approval is a hard
    // FORBIDDEN, always — see the action's own header comment), updates
    // deal_room_stage_transitions, then calls advance_workflow_stage
    // itself via the shared advanceStage() helper. Both the approve
    // write and the stage-advance RPC now happen server-side inside one
    // action call, not two sequential client calls.
    setApproving(true);
    try {
      const result = await callAction<{
        fromStage: string;
        toStage: string;
        requestedBy: string;
      }>(approveTransitionAction, dealRoomId, { dealRoomId, transitionId });

      if (result.requestedBy && result.requestedBy !== userId) {
        const { error: apprNotifErr } = await supabase.from("notifications").insert({
          user_id: result.requestedBy,
          kind: "ai_operator",
          title: "Stage advance approved",
          body: `Your request to advance to ${stageLabel(result.toStage)} has been approved.`,
          read: false,
          meta: { deal_room_id: dealRoomId, transition_id: transitionId },
          action_url: `/app/deal-rooms/${dealRoomId}`,
        });
        if (apprNotifErr) console.error("[stage] approval notification failed:", apprNotifErr);
      }

      setPendingTransition(null);
      queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      queryClient.invalidateQueries({ queryKey: ["deal-room-detail"] });
      toast.success(`Advanced to ${stageLabel(result.toStage)}.`);
    } catch (e: any) {
      const msg = e?.message as string | undefined;
      if (msg === "cannot_approve_own_request") {
        toast.error("You can't approve your own request.");
      } else if (msg === "not_pending") {
        toast.error("This request has already been resolved.");
      } else {
        toast.error(msg ?? "Could not approve transition.");
      }
    } finally {
      setApproving(false);
    }
  };

  const rejectTransition = async (transitionId: string) => {
    // Ported to the gateway (Closing-stage record-wiring pass, 27 Sep
    // 2026) — deal_room.stage.reject (src/lib/actions/deal-room-
    // stage.ts). BEHAVIOR CHANGE, deliberate and reviewed: this now
    // permits the REQUESTER to reject their own pending request
    // (withdrawal), not just the counterparty (decline) — confirmed live
    // before this change that the old direct-RLS path silently no-op'd
    // (0 rows updated, no error) when a requester tried to reject their
    // own request, and this hook's own toast.success("Request
    // declined.") fired regardless, a false success. The gateway action
    // distinguishes the two outcomes (outcome: "withdrawn" | "declined")
    // and records them as distinct chain actions.
    try {
      const result = await callAction<{
        outcome: "withdrawn" | "declined";
        fromStage: string;
        toStage: string;
        requestedBy: string;
      }>(rejectTransitionAction, dealRoomId, { dealRoomId, transitionId });

      if (result.outcome === "declined" && result.requestedBy && result.requestedBy !== userId) {
        const { error: declNotifErr } = await supabase.from("notifications").insert({
          user_id: result.requestedBy,
          kind: "ai_operator",
          title: "Stage advance declined",
          body: `Your request to advance to ${stageLabel(result.toStage)} was declined.`,
          read: false,
          meta: { deal_room_id: dealRoomId, transition_id: transitionId },
          action_url: `/app/deal-rooms/${dealRoomId}`,
        });
        if (declNotifErr) console.error("[stage] decline notification failed:", declNotifErr);
      }

      setPendingTransition(null);
      toast.success(result.outcome === "withdrawn" ? "Request withdrawn." : "Request declined.");
      return { ok: true };
    } catch (e: any) {
      const msg = e?.message as string | undefined;
      toast.error(msg === "not_pending" ? "This request has already been resolved." : msg ?? "Could not reject transition.");
      return { ok: false };
    }
  };

  return { pendingTransition, requesting, approving, requestNextStage, approveTransition, rejectTransition };
}

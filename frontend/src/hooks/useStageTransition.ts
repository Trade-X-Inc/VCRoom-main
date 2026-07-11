import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

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

const STAGE_ORDER = [
  "information_vault",
  "qa",
  "due_diligence",
  "term_sheet",
  "closing",
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
  rejectTransition: (transitionId: string) => Promise<void>;
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
    const next = nextStage(currentStage);
    if (!next) return;

    // Block if a pending transition already exists
    const { data: existing } = await supabase
      .from("deal_room_stage_transitions")
      .select("id")
      .eq("deal_room_id", dealRoomId)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existing) {
      toast.info("A stage advance request is already pending.");
      return;
    }

    // due_diligence → term_sheet by investor requires no approval
    const needsApproval = !(currentStage === "due_diligence" && isInvestor);

    setRequesting(true);
    try {
      const { data: inserted, error } = await supabase
        .from("deal_room_stage_transitions")
        .insert({
          deal_room_id: dealRoomId,
          from_stage: currentStage,
          to_stage: next,
          requested_by: userId,
          status: needsApproval ? "pending" : "approved",
        })
        .select()
        .single();

      if (error) throw error;

      if (!needsApproval) {
        // Auto-approve immediately (investor advancing to term_sheet)
        await approveTransition(inserted.id);
      } else {
        // Notify the other party
        const recipient = isInvestor ? founderUserId : investorUserId;
        if (recipient) {
          const { error: notifErr } = await supabase.from("notifications").insert({
            user_id: recipient,
            kind: "ai_operator",
            title: "Stage advance request",
            body: isInvestor
              ? `The investor has requested to move to the next stage: ${stageLabel(next)}`
              : `The founder has requested to move to the next stage: ${stageLabel(next)}`,
            read: false,
            meta: { deal_room_id: dealRoomId, transition_id: inserted.id },
            action_url: `/app/deal-room/${dealRoomId}`,
          });
          if (notifErr) console.error("[stage] request notification failed:", notifErr);
        }
        setPendingTransition(inserted as TransitionRow);
        toast.success("Stage advance requested — waiting for approval.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not request next stage.");
    } finally {
      setRequesting(false);
    }
  };

  const approveTransition = async (transitionId: string) => {
    setApproving(true);
    try {
      // Fetch the transition to get to_stage and requested_by
      const { data: transition, error: fetchErr } = await supabase
        .from("deal_room_stage_transitions")
        .select("*")
        .eq("id", transitionId)
        .single();
      if (fetchErr) throw fetchErr;

      // Update transition to approved
      const { error: updateErr } = await supabase
        .from("deal_room_stage_transitions")
        .update({
          status: "approved",
          approved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", transitionId);
      if (updateErr) throw updateErr;

      // Advance the deal room workflow_stage
      const { error: roomErr } = await supabase
        .from("deal_rooms")
        .update({ workflow_stage: transition.to_stage })
        .eq("id", dealRoomId);
      if (roomErr) throw roomErr;

      // Notify the requester (if different from approver)
      if (transition.requested_by && transition.requested_by !== userId) {
        const { error: apprNotifErr } = await supabase.from("notifications").insert({
          user_id: transition.requested_by,
          kind: "ai_operator",
          title: "Stage advance approved",
          body: `Your request to advance to ${stageLabel(transition.to_stage)} has been approved.`,
          read: false,
          meta: { deal_room_id: dealRoomId, transition_id: transitionId },
          action_url: `/app/deal-room/${dealRoomId}`,
        });
        if (apprNotifErr) console.error("[stage] approval notification failed:", apprNotifErr);
      }

      setPendingTransition(null);

      // Invalidate deal room query so the stage bar re-renders
      queryClient.invalidateQueries({ queryKey: ["deal-room", dealRoomId] });
      queryClient.invalidateQueries({ queryKey: ["deal-room-detail"] });

      toast.success(`Advanced to ${stageLabel(transition.to_stage)}.`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not approve transition.");
    } finally {
      setApproving(false);
    }
  };

  const rejectTransition = async (transitionId: string) => {
    try {
      // Fetch to get requester
      const { data: transition } = await supabase
        .from("deal_room_stage_transitions")
        .select("requested_by, to_stage")
        .eq("id", transitionId)
        .single();

      const { error: rejErr } = await supabase
        .from("deal_room_stage_transitions")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", transitionId);
      if (rejErr) { console.error("[stage] reject update failed:", rejErr); return { ok: false }; }

      if (transition?.requested_by && transition.requested_by !== userId) {
        const { error: declNotifErr } = await supabase.from("notifications").insert({
          user_id: transition.requested_by,
          kind: "ai_operator",
          title: "Stage advance declined",
          body: `Your request to advance to ${stageLabel(transition.to_stage)} was declined.`,
          read: false,
          meta: { deal_room_id: dealRoomId, transition_id: transitionId },
          action_url: `/app/deal-room/${dealRoomId}`,
        });
        if (declNotifErr) console.error("[stage] decline notification failed:", declNotifErr);
      }

      setPendingTransition(null);
      toast.success("Request declined.");
    } catch (e: any) {
      toast.error(e.message ?? "Could not reject transition.");
    }
  };

  return { pendingTransition, requesting, approving, requestNextStage, approveTransition, rejectTransition };
}

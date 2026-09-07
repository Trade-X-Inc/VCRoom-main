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

    // diligence → term_sheet by investor requires no approval (was
    // due_diligence, the value collapsed into diligence — Build Step 1)
    const needsApproval = !(currentStage === "diligence" && isInvestor);

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
            action_url: `/app/deal-rooms/${dealRoomId}`,
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

      // Advance the deal room workflow_stage — via the sanctioned RPC
      // (Build Step 1), not a direct .update(). The RPC derives the caller
      // via auth.uid(), checks they're a founder/investor principal, and
      // validates old->new adjacency against the canonical sequence before
      // writing; a BEFORE UPDATE trigger enforces the same adjacency rule
      // as defense-in-depth for any write that bypasses this RPC.
      const { data: advanceResult, error: rpcErr } = await supabase.rpc("advance_workflow_stage", {
        p_deal_room_id: dealRoomId,
        p_to_stage: transition.to_stage,
      });
      const advanceRow = Array.isArray(advanceResult) ? advanceResult[0] : advanceResult;
      if (rpcErr || !advanceRow?.ok) {
        throw new Error(advanceRow?.error || rpcErr?.message || "Could not advance stage");
      }

      // Notify the requester (if different from approver)
      if (transition.requested_by && transition.requested_by !== userId) {
        const { error: apprNotifErr } = await supabase.from("notifications").insert({
          user_id: transition.requested_by,
          kind: "ai_operator",
          title: "Stage advance approved",
          body: `Your request to advance to ${stageLabel(transition.to_stage)} has been approved.`,
          read: false,
          meta: { deal_room_id: dealRoomId, transition_id: transitionId },
          action_url: `/app/deal-rooms/${dealRoomId}`,
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
          action_url: `/app/deal-rooms/${dealRoomId}`,
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

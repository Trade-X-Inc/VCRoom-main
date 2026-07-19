import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scale, Loader2, Check, X, Clock3, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { triggerLawyerInvite } from "@/lib/email/triggers";

// R14B step 4 — the Investment Terms gate. Mutual-approval mechanic mirrors
// useStageTransition.ts exactly: request -> counterparty approves/declines
// -> action taken. Two request kinds share one table
// (deal_room_lawyer_requests): invite_lawyer (results in a
// deal_room_lawyer_invites row + email once approved) and waive_counsel
// (results in deal_rooms.waived_legal_counsel once BOTH sides have
// separately confirmed — tracked via the two *_confirmed_by columns, not
// a second mutual-approval round, since either side can independently
// agree to waive without needing the other to have "requested" first).
//
// Gate rule: the investment_terms meeting cannot be scheduled until
// either an accepted lawyer exists for at least one side, or
// waived_legal_counsel is true. Enforced here in the UI (schedule
// controls simply don't render until satisfied) — the real boundary is
// still RLS on deal_room_meeting_records / private notes per role, this
// is just sequencing, not a security gate itself.

type LawyerRequest = {
  id: string;
  kind: "invite_lawyer" | "waive_counsel";
  side: "founder" | "investor";
  lawyer_email: string | null;
  requested_by: string;
  status: "pending" | "approved" | "declined";
};

type LawyerInvite = {
  id: string;
  side: "founder" | "investor";
  email: string;
  accepted_at: string | null;
  expires_at: string;
};

export function useLawyerGateState(dealRoomId: string) {
  const { data: requests = [] } = useQuery<LawyerRequest[]>({
    queryKey: ["lawyer-requests", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_lawyer_requests")
        .select("id, kind, side, lawyer_email, requested_by, status")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: invites = [] } = useQuery<LawyerInvite[]>({
    queryKey: ["lawyer-invites", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_lawyer_invites")
        .select("id, side, email, accepted_at, expires_at")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: room } = useQuery<{ waived_legal_counsel: boolean } | null>({
    queryKey: ["lawyer-gate-room", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("waived_legal_counsel")
        .eq("id", dealRoomId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const hasAcceptedLawyer = invites.some((i) => i.accepted_at);
  const gateOpen = hasAcceptedLawyer || !!room?.waived_legal_counsel;

  return { requests, invites, waived: !!room?.waived_legal_counsel, hasAcceptedLawyer, gateOpen };
}

export function LawyerGate({
  dealRoomId, companyName, userId, isFounder, founderUserId, investorUserId,
}: {
  dealRoomId: string; companyName: string; userId?: string;
  isFounder: boolean; founderUserId: string | null; investorUserId: string | null;
}) {
  const qc = useQueryClient();
  const mySide: "founder" | "investor" = isFounder ? "founder" : "investor";
  const { requests, invites, waived, gateOpen } = useLawyerGateState(dealRoomId);

  const [showInvite, setShowInvite] = useState(false);
  const [lawyerEmail, setLawyerEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lawyer-requests", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["lawyer-invites", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["lawyer-gate-room", dealRoomId] });
  };

  const myPendingInviteRequest = requests.find((r) => r.kind === "invite_lawyer" && r.status === "pending" && r.requested_by === userId);
  const theirPendingInviteRequest = requests.find((r) => r.kind === "invite_lawyer" && r.status === "pending" && r.requested_by !== userId);
  const myPendingWaiveRequest = requests.find((r) => r.kind === "waive_counsel" && r.status === "pending" && r.requested_by === userId);
  const theirPendingWaiveRequest = requests.find((r) => r.kind === "waive_counsel" && r.status === "pending" && r.requested_by !== userId);

  const mySideHasAcceptedLawyer = invites.some((i) => i.side === mySide && i.accepted_at);
  const mySideHasPendingInvite = invites.some((i) => i.side === mySide && !i.accepted_at && new Date(i.expires_at) > new Date());

  const notifyCounterparty = async (title: string, body: string) => {
    const recipient = isFounder ? investorUserId : founderUserId;
    if (!recipient) return;
    try {
      await supabase.from("notifications").insert({
        user_id: recipient,
        kind: "ai_operator",
        title,
        body,
        read: false,
        meta: { deal_room_id: dealRoomId },
        action_url: `/app/deal-rooms/${dealRoomId}/meetings`,
      });
    } catch { /* non-fatal */ }
  };

  const requestInviteLawyer = async () => {
    if (!userId || !lawyerEmail.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("deal_room_lawyer_requests").insert({
        deal_room_id: dealRoomId,
        kind: "invite_lawyer",
        side: mySide,
        lawyer_email: lawyerEmail.trim().toLowerCase(),
        requested_by: userId,
        status: "pending",
      });
      if (error) throw error;
      await notifyCounterparty(
        "Legal counsel requested",
        `${isFounder ? "The founder" : "The investor"} wants to bring in legal counsel for the Investment Terms stage.`,
      );
      toast.success("Request sent — waiting for approval.");
      setShowInvite(false);
      setLawyerEmail("");
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Could not send request");
    } finally {
      setBusy(false);
    }
  };

  const requestWaive = async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("deal_room_lawyer_requests").insert({
        deal_room_id: dealRoomId,
        kind: "waive_counsel",
        side: mySide,
        requested_by: userId,
        status: "pending",
      });
      if (error) throw error;
      await notifyCounterparty(
        "Proceed without counsel?",
        `${isFounder ? "The founder" : "The investor"} proposed proceeding to Investment Terms without legal counsel.`,
      );
      toast.success("Proposal sent — waiting for the other side to confirm.");
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Could not send proposal");
    } finally {
      setBusy(false);
    }
  };

  const resolveRequest = async (request: LawyerRequest, approve: boolean) => {
    if (!userId) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("deal_room_lawyer_requests")
        .update({ status: approve ? "approved" : "declined", approved_by: userId, resolved_at: new Date().toISOString() })
        .eq("id", request.id)
        .eq("status", "pending");
      if (error) throw error;

      if (approve && request.kind === "invite_lawyer" && request.lawyer_email) {
        const { data: invited, error: inviteErr } = await supabase
          .from("deal_room_lawyer_invites")
          .insert({
            deal_room_id: dealRoomId,
            side: request.side,
            email: request.lawyer_email,
            invited_by: userId,
            request_id: request.id,
          })
          .select("token")
          .single();
        if (inviteErr) throw inviteErr;
        if (invited?.token) {
          const { data: { session } } = await supabase.auth.getSession();
          triggerLawyerInvite({
            data: {
              to: request.lawyer_email,
              inviterName: session?.user?.user_metadata?.full_name || session?.user?.email || "Your contact",
              companyName,
              side: request.side,
              token: invited.token,
            },
          }).catch(() => {});
        }
        toast.success("Approved — invite sent.");
      } else if (approve && request.kind === "waive_counsel") {
        // Mutual skip: this approval IS the second side's confirmation —
        // the requester already implicitly agreed by proposing it, so one
        // counterparty approval is sufficient to finalize (matches the
        // "mutual" framing: propose = side A confirms, approve = side B
        // confirms; both are recorded).
        const patch: Record<string, unknown> = {
          waived_legal_counsel: true,
          waived_legal_counsel_at: new Date().toISOString(),
        };
        patch[request.side === "founder" ? "waived_legal_counsel_investor_confirmed_by" : "waived_legal_counsel_founder_confirmed_by"] = userId;
        patch[request.side === "founder" ? "waived_legal_counsel_founder_confirmed_by" : "waived_legal_counsel_investor_confirmed_by"] = request.requested_by;
        const { error: roomErr } = await supabase.from("deal_rooms").update(patch).eq("id", dealRoomId);
        if (roomErr) throw roomErr;
        toast.success("Confirmed — proceeding without counsel.");
      } else {
        toast.success(approve ? "Approved." : "Declined.");
      }
      invalidate();
    } catch (e: any) {
      toast.error(e.message ?? "Could not resolve request");
    } finally {
      setBusy(false);
    }
  };

  if (gateOpen) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#059669]">
        <Check className="h-3.5 w-3.5" />
        {waived ? "Proceeding without counsel (mutually confirmed)" : "Legal counsel confirmed for at least one side"}
      </div>
    );
  }

  // Whose move is it — mirrors R14's Overview framing.
  if (theirPendingInviteRequest) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#71717A]">
          {theirPendingInviteRequest.side === "founder" ? "Founder" : "Investor"} wants to invite {theirPendingInviteRequest.lawyer_email} as counsel.
        </span>
        <button onClick={() => resolveRequest(theirPendingInviteRequest, true)} disabled={busy} className="inline-flex h-7 items-center gap-1 bg-[#7C3AED] px-2.5 text-xs font-medium text-white disabled:opacity-60" style={{ borderRadius: 2 }}>
          <Check className="h-3 w-3" /> Approve
        </button>
        <button onClick={() => resolveRequest(theirPendingInviteRequest, false)} disabled={busy} className="inline-flex h-7 items-center gap-1 border border-[#E4E4E7] bg-white px-2.5 text-xs font-medium text-[#0A0A0B] disabled:opacity-60" style={{ borderRadius: 2 }}>
          <X className="h-3 w-3" /> Decline
        </button>
      </div>
    );
  }

  if (theirPendingWaiveRequest) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#71717A]">
          {theirPendingWaiveRequest.side === "founder" ? "Founder" : "Investor"} proposed proceeding without counsel.
        </span>
        <button onClick={() => resolveRequest(theirPendingWaiveRequest, true)} disabled={busy} className="inline-flex h-7 items-center gap-1 bg-[#7C3AED] px-2.5 text-xs font-medium text-white disabled:opacity-60" style={{ borderRadius: 2 }}>
          <Check className="h-3 w-3" /> Confirm
        </button>
        <button onClick={() => resolveRequest(theirPendingWaiveRequest, false)} disabled={busy} className="inline-flex h-7 items-center gap-1 border border-[#E4E4E7] bg-white px-2.5 text-xs font-medium text-[#0A0A0B] disabled:opacity-60" style={{ borderRadius: 2 }}>
          <X className="h-3 w-3" /> Decline
        </button>
      </div>
    );
  }

  if (myPendingInviteRequest || myPendingWaiveRequest) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
        <Clock3 className="h-3.5 w-3.5" />
        Waiting on {isFounder ? "the investor" : "the founder"} to respond.
      </div>
    );
  }

  if (mySideHasPendingInvite) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
        <Mail className="h-3.5 w-3.5" />
        Invite sent — waiting for counsel to accept.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!showInvite ? (
        <>
          <button onClick={() => setShowInvite(true)} className="inline-flex h-8 items-center gap-1.5 bg-[#7C3AED] px-3 text-xs font-medium text-white" style={{ borderRadius: 2 }}>
            <Scale className="h-3.5 w-3.5" /> Request legal counsel
          </button>
          <button onClick={requestWaive} disabled={busy} className="inline-flex h-8 items-center border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#0A0A0B] disabled:opacity-60" style={{ borderRadius: 2 }}>
            Proceed without counsel
          </button>
        </>
      ) : (
        <>
          <input
            type="email"
            value={lawyerEmail}
            onChange={(e) => setLawyerEmail(e.target.value)}
            placeholder="lawyer@firm.com"
            className="h-8 min-w-[200px] border border-[#E4E4E7] bg-white px-2 text-xs text-[#0A0A0B]"
            style={{ borderRadius: 2 }}
          />
          <button onClick={requestInviteLawyer} disabled={!lawyerEmail.trim() || busy} className="inline-flex h-8 items-center bg-[#7C3AED] px-3 text-xs font-medium text-white disabled:opacity-50" style={{ borderRadius: 2 }}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send request"}
          </button>
          <button onClick={() => setShowInvite(false)} className="inline-flex h-8 items-center border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#0A0A0B]" style={{ borderRadius: 2 }}>
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

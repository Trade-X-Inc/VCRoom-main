import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scale, Loader2, Check, X, Clock3, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { callAction } from "@/lib/actions/call";
import { roomGetTermSheet } from "@/lib/actions/deal-room-core";
import { triggerLawyerInvite } from "@/lib/email/triggers";
import { V2Button, StatusLabel } from "@/components/v2";

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
  accepted_by: string | null;
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
        .select("id, side, email, accepted_at, accepted_by, expires_at")
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
      const res = await callAction<{ term_sheet: { waived_legal_counsel: boolean } }>(
        roomGetTermSheet, dealRoomId, { dealRoomId },
      );
      return { waived_legal_counsel: res.term_sheet.waived_legal_counsel };
    },
  });

  // Real name for an accepted lawyer, once they've actually joined as a
  // deal_room_members row — same users(full_name) join pattern already
  // used for founder/investor identity elsewhere (nda.tsx). Keyed by
  // deal_room_lawyer_invites.accepted_by, the real column linking an
  // accepted invite to the resulting member — not an invented column.
  // Before acceptance there is no user account yet, so only the invited
  // email is ever shown, never a name.
  const acceptedByIds = invites.filter((i) => i.accepted_by).map((i) => i.accepted_by as string);
  const { data: lawyerUsers = [] } = useQuery<{ id: string; full_name: string | null }[]>({
    queryKey: ["lawyer-gate-names", dealRoomId, acceptedByIds.join(",")],
    enabled: acceptedByIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", acceptedByIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const hasAcceptedLawyer = invites.some((i) => i.accepted_at);
  const gateOpen = hasAcceptedLawyer || !!room?.waived_legal_counsel;

  return { requests, invites, lawyerUsers, waived: !!room?.waived_legal_counsel, hasAcceptedLawyer, gateOpen };
}

// Two-panel side-by-side layout — Founder side / Investor side, each
// showing that side's real counsel state at a glance, matching how the
// rest of the app shows founder/investor state symmetrically (overview.tsx's
// founder/investor cards, term-sheets.tsx's dual acceptance). Panel card
// shape (header band + button, key/value rows, status pill) extracted
// verbatim from Figma frame 35:10192 ("Closing Sequence — Counsel Gate
// (Gate 1) Rebuild"), node 35:10237 — per direct instruction to design
// this workflow to match the real founder/investor pattern rather than
// treat the frame as a literal spec. The frame's "Reference ID" and
// "Scoped Undertaking" fields were dropped: neither has a real data
// source (no reference-number or undertaking-document concept exists for
// a lawyer invite), so showing them would be invented content, exactly
// what CLAUDE.md §0a and §3.8 both prohibit.
function CounselPanel({
  side, label, invite, acceptedName, isMySide, busy,
  onInvite, onWaive, onApprove, onDecline,
  showInviteForm, lawyerEmail, onLawyerEmailChange, onSendInvite, onCancelInvite,
  pendingFromThem, pendingWaiveFromThem, pendingFromMe,
}: {
  side: "founder" | "investor";
  label: string;
  invite: LawyerInvite | undefined;
  acceptedName: string | null;
  isMySide: boolean;
  busy: boolean;
  onInvite: () => void;
  onWaive: () => void;
  onApprove: () => void;
  onDecline: () => void;
  showInviteForm: boolean;
  lawyerEmail: string;
  onLawyerEmailChange: (v: string) => void;
  onSendInvite: () => void;
  onCancelInvite: () => void;
  pendingFromThem: LawyerRequest | undefined;
  pendingWaiveFromThem: LawyerRequest | undefined;
  pendingFromMe: LawyerRequest | undefined;
}) {
  const accepted = !!invite?.accepted_at;
  const pendingInvite = invite && !invite.accepted_at && new Date(invite.expires_at) > new Date();

  return (
    <div className="flex-1 min-w-0 bg-white border border-v2-rule" style={{ borderRadius: "var(--v2-radius)" }}>
      <div className="flex items-center justify-between border-b border-v2-rule px-4" style={{ paddingTop: "16px", paddingBottom: "17px" }}>
        <div className="flex items-center gap-2 font-bold text-v2-ink" style={{ fontSize: "11px", letterSpacing: "0.055em" }}>
          <Scale className="h-3 w-3" />
          {label.toUpperCase()}
        </div>
        {isMySide && !accepted && !pendingInvite && !pendingFromMe && !pendingFromThem && !showInviteForm && (
          <V2Button variant="secondary" onClick={onInvite}>
            <UserPlus className="h-3 w-3" /> Invite external
          </V2Button>
        )}
      </div>

      <div className="p-4">
        {accepted ? (
          <>
            <Row label="Counsel">{acceptedName ?? invite?.email}</Row>
            <Row label="Email">{invite?.email}</Row>
            <div className="flex items-center justify-between pt-3">
              <span className="font-bold text-v2-ink-secondary" style={{ fontSize: "11px", letterSpacing: "0.055em" }}>STATUS</span>
              <StatusLabel tone="satisfied">Confirmed</StatusLabel>
            </div>
          </>
        ) : pendingInvite ? (
          <>
            <Row label="Invited">{invite?.email}</Row>
            <div className="flex items-center justify-between pt-3">
              <span className="font-bold text-v2-ink-secondary" style={{ fontSize: "11px", letterSpacing: "0.055em" }}>STATUS</span>
              <StatusLabel tone="attention">Awaiting acceptance</StatusLabel>
            </div>
          </>
        ) : isMySide && pendingFromThem ? (
          <div className="flex flex-col gap-2">
            <p className="text-v2-ink-secondary" style={{ fontSize: "13px" }}>
              Wants to invite {pendingFromThem.lawyer_email} as counsel.
            </p>
            <div className="flex gap-2">
              <V2Button variant="primary" onClick={onApprove} disabled={busy}><Check className="h-3 w-3" /> Approve</V2Button>
              <V2Button variant="secondary" onClick={onDecline} disabled={busy}><X className="h-3 w-3" /> Decline</V2Button>
            </div>
          </div>
        ) : isMySide && pendingWaiveFromThem ? (
          <div className="flex flex-col gap-2">
            <p className="text-v2-ink-secondary" style={{ fontSize: "13px" }}>Proposed proceeding without counsel.</p>
            <div className="flex gap-2">
              <V2Button variant="primary" onClick={onApprove} disabled={busy}><Check className="h-3 w-3" /> Confirm</V2Button>
              <V2Button variant="secondary" onClick={onDecline} disabled={busy}><X className="h-3 w-3" /> Decline</V2Button>
            </div>
          </div>
        ) : isMySide && pendingFromMe ? (
          <div className="flex items-center gap-1.5 text-v2-ink-muted" style={{ fontSize: "12px" }}>
            <Clock3 className="h-3.5 w-3.5" /> Waiting on the other side to respond.
          </div>
        ) : isMySide && showInviteForm ? (
          <div className="flex flex-col gap-2">
            <input
              type="email"
              value={lawyerEmail}
              onChange={(e) => onLawyerEmailChange(e.target.value)}
              placeholder="lawyer@firm.com"
              autoFocus
              className="h-9 border border-v2-rule bg-v2-panel px-3 text-v2-ink outline-none focus:border-v2-accent"
              style={{ fontSize: "13px", borderRadius: "var(--v2-radius)" }}
            />
            <div className="flex gap-2">
              <V2Button variant="primary" onClick={onSendInvite} disabled={!lawyerEmail.trim() || busy}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send request"}
              </V2Button>
              <V2Button variant="secondary" onClick={onCancelInvite}>Cancel</V2Button>
            </div>
          </div>
        ) : isMySide ? (
          <V2Button variant="secondary" onClick={onWaive} disabled={busy}>Proceed without counsel</V2Button>
        ) : (
          <div className="text-v2-ink-muted" style={{ fontSize: "13px" }}>No counsel invited yet.</div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-v2-rule-light py-2 first:pt-0">
      <span className="font-bold text-v2-ink-secondary" style={{ fontSize: "11px", letterSpacing: "0.055em" }}>{label.toUpperCase()}</span>
      <span className="text-v2-ink" style={{ fontSize: "13px" }}>{children}</span>
    </div>
  );
}

export function LawyerGate({
  dealRoomId, companyName, userId, isFounder, founderUserId, investorUserId,
}: {
  dealRoomId: string; companyName: string; userId?: string;
  isFounder: boolean; founderUserId: string | null; investorUserId: string | null;
}) {
  const qc = useQueryClient();
  const mySide: "founder" | "investor" = isFounder ? "founder" : "investor";
  const { requests, invites, lawyerUsers, waived, gateOpen } = useLawyerGateState(dealRoomId);

  const [showInvite, setShowInvite] = useState(false);
  const [lawyerEmail, setLawyerEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lawyer-requests", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["lawyer-invites", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["lawyer-gate-room", dealRoomId] });
  };

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
        // Mutual skip: the request row was just flipped to 'approved' above
        // (its RLS enforces approver <> requester, so this genuinely took
        // both parties). The waiver flag itself can NOT be set by a direct
        // deal_rooms update — the enforce_counsel_waiver_write trigger blocks
        // that (a founder could otherwise waive unilaterally, §6C4). It must
        // go through finalize_counsel_waiver(), which re-checks that an
        // approved waive request exists and records both confirmed_by from
        // it, and works whether the founder OR the investor is the approver.
        const { data: fin, error: rpcErr } = await supabase.rpc("finalize_counsel_waiver", { p_deal_room_id: dealRoomId });
        const finRow = Array.isArray(fin) ? fin[0] : fin;
        if (rpcErr || !finRow?.ok) throw new Error(finRow?.error || rpcErr?.message || "Could not finalize the waiver");
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

  // Per-side view model — called for both "founder" and "investor" so both
  // panels can render simultaneously (the actual scope expansion: the old
  // component only ever rendered whichever single state applied to the
  // caller's own side). Business logic (which requests/invites apply,
  // mutual-approval semantics) is unchanged from the original component;
  // only the render is restructured to show both sides at once.
  const invite = (side: "founder" | "investor") =>
    invites.find((i) => i.side === side && (i.accepted_at || new Date(i.expires_at) > new Date()));
  const acceptedName = (side: "founder" | "investor") => {
    const inv = invite(side);
    if (!inv?.accepted_by) return null;
    return lawyerUsers.find((u) => u.id === inv.accepted_by)?.full_name ?? null;
  };

  if (gateOpen) {
    return (
      <div className="flex items-center gap-2 text-v2-satisfied" style={{ fontSize: "13px" }}>
        <Check className="h-3.5 w-3.5" />
        {waived ? "Proceeding without counsel (mutually confirmed)" : "Legal counsel confirmed for at least one side"}
      </div>
    );
  }

  const sides: { key: "founder" | "investor"; label: string }[] = [
    { key: "founder", label: "Founder side" },
    { key: "investor", label: "Investor side" },
  ];

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {sides.map(({ key, label }) => {
        const isMySide = key === mySide;
        // "From them" only makes sense on my own panel (a request directed at
        // me to approve). On the counterparty's panel there is nothing for
        // me to act on, so those controls simply don't render (isMySide gates
        // every interactive branch in CounselPanel).
        const theirRequestOnMySide = isMySide
          ? requests.find((r) => r.kind === "invite_lawyer" && r.status === "pending" && r.side === mySide && r.requested_by !== userId)
          : undefined;
        const theirWaiveOnMySide = isMySide
          ? requests.find((r) => r.kind === "waive_counsel" && r.status === "pending" && r.side === mySide && r.requested_by !== userId)
          : undefined;
        const myOwnPending = isMySide
          ? requests.find((r) => (r.kind === "invite_lawyer" || r.kind === "waive_counsel") && r.status === "pending" && r.side === mySide && r.requested_by === userId)
          : undefined;

        return (
          <CounselPanel
            key={key}
            side={key}
            label={label}
            invite={invite(key)}
            acceptedName={acceptedName(key)}
            isMySide={isMySide}
            busy={busy}
            onInvite={() => setShowInvite(true)}
            onWaive={requestWaive}
            onApprove={() => {
              const req = theirRequestOnMySide ?? theirWaiveOnMySide;
              if (req) resolveRequest(req, true);
            }}
            onDecline={() => {
              const req = theirRequestOnMySide ?? theirWaiveOnMySide;
              if (req) resolveRequest(req, false);
            }}
            showInviteForm={isMySide && showInvite}
            lawyerEmail={lawyerEmail}
            onLawyerEmailChange={setLawyerEmail}
            onSendInvite={requestInviteLawyer}
            onCancelInvite={() => { setShowInvite(false); setLawyerEmail(""); }}
            pendingFromThem={theirRequestOnMySide}
            pendingWaiveFromThem={theirWaiveOnMySide}
            pendingFromMe={myOwnPending}
          />
        );
      })}
    </div>
  );
}

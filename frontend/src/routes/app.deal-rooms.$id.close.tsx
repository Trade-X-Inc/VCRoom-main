import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import { LawyerGate, useLawyerGateState } from "@/components/app/LawyerGate";
import { TermClosingPanel } from "@/components/app/TermClosingPanel";
import { ClosingPipeline } from "@/components/app/ClosingPipeline";
import { ExitDeal } from "@/components/app/ExitDeal";

// R15C — the closing pipeline (Gates 4-7) is the sole content of this route,
// superseding the old closing-checklist (deal_room_closing_items), which is left
// in the schema but no longer used here. Principals only: DealRoomLayout renders
// LawyerRoomView for a lawyer (never this), and every R15C table is
// dr_is_principal / lawyer-blocked at RLS.
//
// R7-testing fix 2 — the correct gate sequence is: (1) lawyer invitation, then
// (2) agreement preparation, then (3-6) the existing fee/download/payment/close
// pipeline. LawyerGate and TermClosingPanel already exist (R14B / R15B) and are
// still also rendered from meetings.tsx / term-sheets.tsx respectively — same
// components, same data source (dealRoomId), not duplicated logic. Once each
// gate resolves it collapses to a one-line confirmation so the page reads as a
// sequence, not a wall of open panels.

export const Route = createFileRoute("/app/deal-rooms/$id/close")({
  component: ClosePage,
});

const BORDER = "#E4E4E7", INK = "#0A0A0B", INK2 = "#52525B", INK3 = "#71717A";

function GateDone({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border px-4 py-3 text-sm" style={{ borderColor: BORDER, color: INK2 }}>
      <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#059669" }} />
      {label}
    </div>
  );
}

function ClosePage() {
  const { dealRoomId, isInvestor, isFounder, userId, companyName, founderUserId, investorUserId, isClosed, closedAt } = useDealRoom();
  const role: "founder" | "investor" = isInvestor ? "investor" : "founder";
  const { gateOpen: lawyerGateResolved, waived: lawyerWaived, hasAcceptedLawyer } = useLawyerGateState(dealRoomId);

  // fee state for the exit dialog's "already paid" branch
  const { data: fee } = useQuery({
    queryKey: ["closing-fee", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_fees").select("payment_status").eq("deal_room_id", dealRoomId).maybeSingle()).data,
  });
  const feePaid = !!fee && ["beta_bypass", "paid"].includes((fee as any).payment_status);

  // Agreement gate: resolved once a finalized (accepted) agreement exists.
  const { data: agreementFinalized } = useQuery({
    queryKey: ["closing-agreement-finalized", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_agreements")
        .select("id").eq("deal_room_id", dealRoomId).eq("status", "accepted").maybeSingle();
      return !!data;
    },
  });

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8">
      <div className="text-[12px]" style={{ color: INK3 }}>Deal room · Closing</div>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>Close the deal</h1>
      <p className="mt-1 text-sm" style={{ color: INK2 }}>
        {isClosed ? "This deal is closed — the room is a read-only archive." : "Counsel, agreement, fee, signing, investment payment, and mutual close — the full path to a signed deal for " + companyName + "."}
      </p>

      {/* Gate 1 — Lawyer invitation (R14B, surfaced here as the first step) */}
      {!isClosed && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: INK3 }}>1 · Legal counsel</div>
          {lawyerGateResolved ? (
            <GateDone label={lawyerWaived ? "Both parties agreed to proceed without counsel." : hasAcceptedLawyer ? "Legal counsel has joined the room." : "Resolved."} />
          ) : (
            userId && (
              <LawyerGate
                dealRoomId={dealRoomId}
                companyName={companyName}
                userId={userId}
                isFounder={isFounder}
                founderUserId={founderUserId}
                investorUserId={investorUserId}
              />
            )
          )}
        </div>
      )}

      {/* Gate 2 — Agreement preparation (R15B, surfaced here; same component/data as /term-sheets) */}
      {!isClosed && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: INK3 }}>2 · Agreement</div>
          {agreementFinalized ? (
            <GateDone label="Agreement finalized — accepted by both parties." />
          ) : (
            userId && <TermClosingPanel dealRoomId={dealRoomId} role={role} userId={userId} isClosed={isClosed} />
          )}
        </div>
      )}

      {/* Gates 3-6 — fee, download & sign, investment payment, mutual close */}
      <div className="mt-6">
        {!isClosed && <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: INK3 }}>3-6 · Fee, signing, payment, close</div>}
        {userId && <ClosingPipeline dealRoomId={dealRoomId} role={role} userId={userId} isClosed={isClosed} closedAt={closedAt} />}
      </div>

      {!isClosed && (
        <div className="mt-6">
          <ExitDeal feeAlreadyPaid={feePaid} isClosed={isClosed} />
        </div>
      )}
    </div>
  );
}

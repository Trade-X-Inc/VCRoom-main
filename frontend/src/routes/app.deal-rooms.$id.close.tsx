import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import { ClosingPipeline } from "@/components/app/ClosingPipeline";
import { ExitDeal } from "@/components/app/ExitDeal";

// R15C — the closing pipeline (Gates 4-7) is the sole content of this route,
// superseding the old closing-checklist (deal_room_closing_items), which is left
// in the schema but no longer used here. Principals only: DealRoomLayout renders
// LawyerRoomView for a lawyer (never this), and every R15C table is
// dr_is_principal / lawyer-blocked at RLS.

export const Route = createFileRoute("/app/deal-rooms/$id/close")({
  component: ClosePage,
});

const BORDER = "#E4E4E7", INK = "#0A0A0B", INK2 = "#52525B", INK3 = "#71717A";

function ClosePage() {
  const { dealRoomId, isInvestor, userId, companyName, isClosed, closedAt } = useDealRoom();
  const role: "founder" | "investor" = isInvestor ? "investor" : "founder";

  // fee state for the exit dialog's "already paid" branch
  const { data: fee } = useQuery({
    queryKey: ["closing-fee", dealRoomId], enabled: !!dealRoomId,
    queryFn: async () => (await supabase.from("deal_room_fees").select("payment_status").eq("deal_room_id", dealRoomId).maybeSingle()).data,
  });
  const feePaid = !!fee && ["beta_bypass", "paid"].includes((fee as any).payment_status);

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8">
      <div className="text-[12px]" style={{ color: INK3 }}>Deal room · Closing</div>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>Close the deal</h1>
      <p className="mt-1 text-sm" style={{ color: INK2 }}>
        {isClosed ? "This deal is closed — the room is a read-only archive." : "Fee, signing, investment payment, and mutual close — the final steps for " + companyName + "."}
      </p>

      <div className="mt-6">
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

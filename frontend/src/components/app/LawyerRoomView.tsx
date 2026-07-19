import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scale, Check, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import { useLawyerGateState } from "@/components/app/LawyerGate";

// R14B step 4 — locked scope for the room-native lawyer role: deal
// summary, term sheet area, the Investment Terms meeting slot, and its
// records. Nothing else. This component is the ONLY thing DealRoomLayout
// renders for role === "lawyer" (see app.deal-rooms.$id.tsx), so it must
// never delegate to the shared Overview/Information/Q&A/Diligence routes
// even via a stray <Outlet/> or Link — those pages read startup-wide data
// this role is not scoped to.

type NdaSigner = {
  signer_full_name: string | null;
  signer_company: string | null;
  role: string | null;
  accepted_at: string | null;
};

function initials(name?: string | null) {
  return (name ?? "?").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

export function LawyerRoomView() {
  const ctx = useDealRoom();
  const { dealRoomId, companyName, room } = ctx;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onMeetings = path.endsWith("/meetings");

  const { data: ndaSigners = [] } = useQuery<NdaSigner[]>({
    queryKey: ["nda-acceptances-lawyer-view", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("signer_full_name, signer_company, role, accepted_at")
        .eq("deal_room_id", dealRoomId)
        .order("accepted_at", { ascending: true });
      return data ?? [];
    },
  });

  const { waived } = useLawyerGateState(dealRoomId);
  const workflowStage = (room as any)?.workflow_stage ?? "nda_signed";
  const termSheetUnlocked = workflowStage === "term_sheet" || workflowStage === "closed";

  if (onMeetings) {
    // The Interviews tab itself already restricts to the Investment Terms
    // slot for a lawyer session (app.deal-rooms.$id.meetings.tsx checks
    // ctx.isLawyer and only renders stage 5), so it's safe to let the
    // existing route render here rather than duplicate that UI.
    return null;
  }

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-6">
      <div className="mb-6 flex items-center gap-2 text-xs font-medium text-[#71717A]">
        <Scale className="h-3.5 w-3.5" />
        LEGAL COUNSEL VIEW — scoped to the Investment Terms stage only
      </div>

      <div className="mb-6 flex items-center gap-3 border border-[#E4E4E7] bg-white p-5">
        <div className="grid h-11 w-11 place-items-center bg-[#7C3AED] text-sm font-semibold text-white" style={{ borderRadius: 2 }}>
          {companyName?.[0]?.toUpperCase() ?? "D"}
        </div>
        <div>
          <div className="text-lg font-semibold text-[#0A0A0B]" style={{ fontFamily: "Syne, sans-serif" }}>{companyName}</div>
          <div className="text-xs text-[#71717A]">Deal summary — name and stage only, per your access scope</div>
        </div>
      </div>

      <div className="mb-6 border border-[#E4E4E7] bg-white p-5">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">Term Sheet</div>
        {termSheetUnlocked ? (
          <Link
            to={`/app/deal-rooms/$id/term-sheets` as any}
            params={{ id: dealRoomId } as any}
            className="inline-flex h-9 items-center gap-2 bg-[#7C3AED] px-3 text-sm font-medium text-white"
            style={{ borderRadius: 2 }}
          >
            <FileText className="h-4 w-4" /> Open term sheet
          </Link>
        ) : (
          <div className="text-sm text-[#52525B]">Not yet available — unlocks once the deal reaches the Term Sheet stage.</div>
        )}
      </div>

      <div className="mb-6 border border-[#E4E4E7] bg-white p-5">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">Investment Terms meeting</div>
        <p className="mb-3 text-sm text-[#52525B]">
          {waived ? "Both parties agreed to proceed without counsel elsewhere in this room, but your access remains active." : "Schedule, join, and review records for this stage from the Interviews tab."}
        </p>
        <Link
          to={`/app/deal-rooms/$id/meetings` as any}
          params={{ id: dealRoomId } as any}
          className="inline-flex h-9 items-center border border-[#E4E4E7] bg-white px-3 text-sm font-medium text-[#0A0A0B]"
          style={{ borderRadius: 2 }}
        >
          Go to Investment Terms meeting →
        </Link>
      </div>

      <div className="border border-[#E4E4E7] bg-white p-5">
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[#71717A]">NDA signers</div>
        <div className="space-y-2">
          {ndaSigners.length === 0 && <div className="text-sm text-[#71717A]">No signers yet.</div>}
          {ndaSigners.map((signer, i) => (
            <div key={i} className="flex items-center justify-between border-b border-[#E4E4E7] py-2 last:border-0">
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 place-items-center bg-[#F4F4F5] text-[10px] font-medium text-[#52525B]" style={{ borderRadius: 2 }}>
                  {initials(signer.signer_full_name)}
                </div>
                <span className="text-sm text-[#0A0A0B]">{signer.signer_full_name || "—"}</span>
                <span className="text-xs capitalize text-[#71717A]">{signer.role}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-[#059669]">
                <Check className="h-3 w-3" /> {signer.accepted_at ? new Date(signer.accepted_at).toLocaleDateString() : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

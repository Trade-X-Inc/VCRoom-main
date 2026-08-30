import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import { LawyerGate, useLawyerGateState } from "@/components/app/LawyerGate";
import { TermClosingPanel } from "@/components/app/TermClosingPanel";
import { ClosingPipeline } from "@/components/app/ClosingPipeline";
import { ExitDeal } from "@/components/app/ExitDeal";

// Figma frame 35:9939 ("Closing Sequence — Agreement (Gate 2)"), content
// region 35:9976 ("Main - Canvas") only, per CLAUDE.md §0a. Scope: this
// route's OWN header/shell only (title/subtitle block, numbered section
// labels, page container) — the 6-gate sequence-visualizer treatment
// applied to the "N · Label" section headers below. LawyerGate,
// TermClosingPanel, ClosingPipeline, ExitDeal are shared with
// meetings.tsx/term-sheets.tsx and are explicitly NOT restyled here; they
// get their own pass when those routes are checked against their own
// frames. Geometry (radius, padding, gap, border-width, tracking) is
// exact from the frame; color/font values use the real v2 tokens the
// frame's own values don't literally match (v2-accent/v2-rule etc.),
// same substitution already applied to app.deal-rooms.$id.overview.tsx.

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

function GateDone({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 border border-v2-rule px-4 py-3 text-v2-ink-secondary"
      style={{ fontSize: "13px" }}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-v2-satisfied" />
      {label}
    </div>
  );
}

// Numbered section label — 6-gate sequence visualizer's per-gate label
// treatment (bold, 11px, 0.55px tracking, uppercase) from 35:9939,
// applied to this page's own step labels rather than the frame's literal
// 6-node connected visualizer, since close.tsx's real steps are a
// different count/shape (1 · Legal counsel, 2 · Agreement, 3-6 · Fee,
// signing, payment, close) — content/section-count authority stays with
// the real product per standing instruction.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-v2-ui font-bold text-v2-ink-secondary"
      style={{ fontSize: "11px", letterSpacing: "0.55px", textTransform: "uppercase" }}
    >
      {children}
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
    <div className="mx-auto max-w-[1360px] font-v2-ui" style={{ padding: "24px" }}>
      {/* Header card — exact shape from 35:9978 ("Deal Header & Gate
          Progress"): panel bg, 1px rule border, 2px radius, 25px padding,
          drop-shadow(0px 1px 1px rgba(0,0,0,0.05)). */}
      <div
        className="bg-v2-panel border border-v2-rule"
        style={{ borderRadius: "var(--v2-radius)", padding: "25px", boxShadow: "0px 1px 1px rgba(0,0,0,0.05)" }}
      >
        <div className="text-v2-ink-muted" style={{ fontSize: "12px" }}>Deal room · Closing</div>
        <h1 className="mt-1 font-semibold text-v2-ink" style={{ fontSize: "20px", letterSpacing: "-0.2px" }}>Close the deal</h1>
        <p className="mt-1 text-v2-ink-secondary" style={{ fontSize: "13px" }}>
          {isClosed ? "This deal is closed — the room is a read-only archive." : "Counsel, agreement, fee, signing, investment payment, and mutual close — the full path to a signed deal for " + companyName + "."}
        </p>
      </div>

      {/* Gate 1 — Lawyer invitation (R14B, surfaced here as the first step) */}
      {!isClosed && (
        <div className="mt-6">
          <SectionLabel>1 · Legal counsel</SectionLabel>
          <div className="mt-2">
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
        </div>
      )}

      {/* Gate 2 — Agreement preparation (R15B, surfaced here; same component/data as /term-sheets) */}
      {!isClosed && (
        <div className="mt-6">
          <SectionLabel>2 · Agreement</SectionLabel>
          <div className="mt-2">
            {agreementFinalized ? (
              <GateDone label="Agreement finalized — accepted by both parties." />
            ) : (
              userId && <TermClosingPanel dealRoomId={dealRoomId} role={role} userId={userId} isClosed={isClosed} />
            )}
          </div>
        </div>
      )}

      {/* Gates 3-6 — fee, download & sign, investment payment, mutual close */}
      <div className="mt-6">
        {!isClosed && <div className="mb-2"><SectionLabel>3-6 · Fee, signing, payment, close</SectionLabel></div>}
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

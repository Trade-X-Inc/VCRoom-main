import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Scale, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useDealRoom } from "@/hooks/useDealRoom";
import { useLawyerGateState } from "@/components/app/LawyerGate";
import { TermClosingPanel } from "@/components/app/TermClosingPanel";

// R14B step 4 — locked scope for the room-native lawyer role: deal
// summary, term sheet area, the Investment Terms meeting slot, and its
// records. Nothing else. This component is the ONLY thing DealRoomLayout
// renders for role === "lawyer" (see app.deal-rooms.$id.tsx), so it must
// never delegate to the shared Overview/Information/Q&A/Diligence routes
// even via a stray <Outlet/> or Link — those pages read startup-wide data
// this role is not scoped to.
//
// Figma frame 55:3991 ("Counsel View — Specialized Closing Desktop"), left
// panel only (55:4006, "Aside - Left Panel: Data & Status (Dense)") per
// CLAUDE.md §0a — the frame's right panel ("Agreement Viewer", a document
// canvas) and its "Conditions Register" section are explicitly NOT
// ported: this real component has no document-viewer feature and no
// conditions-register data source, so porting either would mean inventing
// content the product doesn't have, not restyling what it does. Extracted
// the dense section-panel grammar (12px JetBrains Mono uppercase header on
// a tinted band, key/value rows, avatar+name+status-pill rows) and applied
// it to the real sections this component actually renders: deal summary,
// agreement/summary panel, meeting link, NDA signers.

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
  const { dealRoomId, companyName } = ctx;
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
  const userId = (ctx as any).userId as string | undefined;

  // R15B: the lawyer sees the generated summary + agreement (dr_is_room_member
  // RLS). They do NOT see term-negotiation history (R15A tables stay
  // dr_is_principal / lawyer-blocked). Show the closing panel once a summary
  // exists (terms locked).
  const { data: summaryExists } = useQuery({
    queryKey: ["lawyer-summary-exists", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_summaries")
        .select("id").eq("deal_room_id", dealRoomId).eq("status", "active").maybeSingle();
      return !!data;
    },
  });

  if (onMeetings) {
    // The Interviews tab itself already restricts to the Investment Terms
    // slot for a lawyer session (app.deal-rooms.$id.meetings.tsx checks
    // ctx.isLawyer and only renders stage 5), so it's safe to let the
    // existing route render here rather than duplicate that UI.
    return null;
  }

  // Dense section-panel shape, extracted verbatim from 55:4007 et al.
  const panel = "border";
  const panelStyle: React.CSSProperties = { background: "var(--lcs-white)", borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" };
  const panelHeaderStyle: React.CSSProperties = {
    background: "var(--lcs-surface)",
    borderBottom: "1px solid var(--lcs-line)",
    padding: "12px 16px 13px",
    fontFamily: "var(--font-lcs-data)",
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--lcs-ink-muted)",
  };

  return (
    <div className="mx-auto max-w-[1360px]" style={{ padding: "24px 32px", fontFamily: "var(--font-lcs-ui)" }}>
      <div className="mb-6 flex items-center gap-2" style={{ color: "var(--lcs-ink-muted)", fontSize: "12px", fontWeight: 500 }}>
        <Scale className="h-3.5 w-3.5" />
        LEGAL COUNSEL VIEW — scoped to the Investment Terms stage only
      </div>

      {/* Deal summary — Term Summary panel shape (dense header + key/value
          rows), applied to the one real field this component shows
          (company name), not the frame's literal purchase-price/shares
          fields, which this role has no data for. */}
      <div className={cn("mb-6", panel)} style={panelStyle}>
        <div style={panelHeaderStyle}>Deal summary</div>
        <div className="flex items-center gap-3 p-4">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center text-sm font-semibold"
            style={{ background: "var(--lcs-accent)", color: "var(--lcs-white)", borderRadius: "var(--radius-lcs-control)" }}
          >
            {companyName?.[0]?.toUpperCase() ?? "D"}
          </div>
          <div>
            <div className="font-semibold" style={{ color: "var(--lcs-ink)", fontSize: "15px" }}>{companyName}</div>
            <div style={{ color: "var(--lcs-ink-muted)", fontSize: "12px" }}>Name and stage only, per your access scope</div>
          </div>
        </div>
      </div>

      {/* R15B: summary + agreement, inline. Lawyer drafts the agreement from the
          summary and uploads it here. No term-negotiation history is shown. */}
      {summaryExists && userId ? (
        <div className="mb-6">
          <TermClosingPanel dealRoomId={dealRoomId} role="lawyer" userId={userId} />
        </div>
      ) : (
        <div className={cn("mb-6", panel)} style={panelStyle}>
          <div style={panelHeaderStyle}>Agreed terms summary</div>
          <div className="p-4" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>
            Not yet available — the summary is generated once both parties finalize the terms.
          </div>
        </div>
      )}

      <div className={cn("mb-6", panel)} style={panelStyle}>
        <div style={panelHeaderStyle}>Investment Terms meeting</div>
        <div className="p-4">
          <p className="mb-3" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>
            {waived ? "Both parties agreed to proceed without counsel elsewhere in this room, but your access remains active." : "Schedule, join, and review records for this stage from the Interviews tab."}
          </p>
          <Link
            to={`/app/deal-rooms/$id/meetings` as any}
            params={{ id: dealRoomId } as any}
            className="inline-flex h-9 items-center border px-3 font-medium"
            style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontSize: "13px", borderRadius: "var(--radius-lcs-control)" }}
          >
            Go to Investment Terms meeting →
          </Link>
        </div>
      </div>

      {/* NDA signers — Signature Status panel shape (avatar + name +
          status pill rows) extracted verbatim from 55:4075. */}
      <div className={panel} style={panelStyle}>
        <div style={panelHeaderStyle}>NDA signers</div>
        <div className="flex flex-col gap-1 p-2">
          {ndaSigners.length === 0 && (
            <div className="px-2 py-1.5" style={{ color: "var(--lcs-ink-muted)", fontSize: "13px" }}>No signers yet.</div>
          )}
          {ndaSigners.map((signer, i) => (
            <div key={i} className="flex items-center justify-between px-2 py-1.5" style={{ borderRadius: "var(--radius-lcs-control)" }}>
              <div className="flex items-center gap-2">
                <div
                  className="grid h-6 w-6 shrink-0 place-items-center"
                  style={{ background: "var(--lcs-progress-wash)", color: "var(--lcs-accent)", borderRadius: "var(--radius-lcs-control)", fontFamily: "var(--font-lcs-data)", fontSize: "10px" }}
                >
                  {initials(signer.signer_full_name)}
                </div>
                <span style={{ color: "var(--lcs-ink)", fontSize: "13px" }}>{signer.signer_full_name || "—"}</span>
                <span className="capitalize" style={{ color: "var(--lcs-ink-muted)", fontSize: "11px" }}>{signer.role}</span>
              </div>
              <span
                className="inline-flex items-center gap-1"
                style={{ background: "var(--lcs-satisfied-wash)", color: "var(--lcs-satisfied)", fontFamily: "var(--font-lcs-data)", fontSize: "10px", borderRadius: "var(--radius-lcs-control)", padding: "2px 6px" }}
              >
                <Check className="h-3 w-3" /> {signer.accepted_at ? new Date(signer.accepted_at).toLocaleDateString() : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

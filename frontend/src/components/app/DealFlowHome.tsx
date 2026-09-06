import { useNavigate } from "@tanstack/react-router";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";
import { LcsPageHeader, LcsCard, LcsEmptyState, LcsButton, LcsStatusPill } from "@/components/lcs";

/**
 * /app/investor — the investor-owner home. Same worklist shape as the
 * founder home: one honest headline, one primary action (or an explicit
 * plain statement when there is none — investors don't initiate deal
 * flow), and real structural sections shown empty-but-labeled with no
 * data. No "browse" or "discover" CTA — no directory exists (Foundation
 * §15/§25). Rebuilt from the old numbered-spine layout, per the
 * Post-login Home Dashboard design brief (6 Sep 2026).
 */

export function DealFlowHome() {
  const navigate = useNavigate();
  const { data: p } = useDealFlowProgress();

  const thesisSet = !!p?.thesisSet;
  const watchlistCount = p?.watchlistCount ?? 0;
  const activeRooms = p?.activeRooms ?? 0;
  const pendingDecisions = p?.pendingDecisions ?? 0;
  const portfolioCount = p?.portfolioCount ?? 0;

  const headline = !thesisSet
    ? "Define your thesis so founders can see what you're looking for."
    : pendingDecisions > 0
      ? `${pendingDecisions} decision${pendingDecisions === 1 ? "" : "s"} pending.`
      : activeRooms > 0
        ? "Here's what's active."
        : "Deals will appear here once a founder shares a brief with you.";

  return (
    <div className="p-6 lg:p-12 max-w-3xl mx-auto" data-testid="deal-flow-home">
      <LcsPageHeader
        title={headline}
        description="Investor"
        action={
          !thesisSet ? (
            <LcsButton variant="primary" onClick={() => navigate({ to: "/app/investor/thesis" })}>
              Define your thesis
            </LcsButton>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        <LcsCard title="Waiting on you">
          {pendingDecisions === 0 ? (
            <div className="p-4">
              <LcsEmptyState text="Nothing waiting on a decision right now." />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                  Rooms awaiting your decision
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                    {pendingDecisions}
                  </span>
                  <LcsStatusPill status="attention" label="Pending" />
                </div>
              </div>
            </div>
          )}
        </LcsCard>

        <LcsCard title="Waiting on them">
          {activeRooms === 0 ? (
            <div className="p-4">
              <LcsEmptyState text="Deals will appear here once a founder shares a brief with you. There's no directory to browse — access always starts with an invitation from the founder." />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                  Active deal rooms
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                    {activeRooms}
                  </span>
                  <LcsStatusPill status="in-progress" label="Active" />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                  On your watchlist
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                    {watchlistCount}
                  </span>
                  <LcsStatusPill status={watchlistCount > 0 ? "satisfied" : "pending"} label={watchlistCount > 0 ? "Tracked" : "None yet"} />
                </div>
              </div>
              {portfolioCount > 0 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                  <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    In your portfolio
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                      {portfolioCount}
                    </span>
                    <LcsStatusPill status="satisfied" label="Invested" />
                  </div>
                </div>
              )}
            </div>
          )}
        </LcsCard>

        <LcsCard title="How deal flow works">
          <p className="p-4 text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            A founder shares a brief with you directly — there's no directory or matching to browse.
            Once you're in a deal room, you review the pack, ask questions, and record a decision. If
            you invest, the room stays open through negotiation and closing.
          </p>
        </LcsCard>
      </div>
    </div>
  );
}

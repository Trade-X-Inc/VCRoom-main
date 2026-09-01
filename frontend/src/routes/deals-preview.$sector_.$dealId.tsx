import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LcsPageShell,
  LcsNavItem,
  LcsPageHeader,
  LcsStatusPill,
  LcsButton,
  LcsEmptyState,
  type LcsStatus,
} from "@/components/lcs";
import {
  getSandboxDeal,
  daysInStage,
  STAGE_ORDER,
  STAGE_LABEL,
  SECTOR_LABEL,
  type LcsDealStage,
  type LcsSandboxDeal,
  type LcsDealListStatus,
} from "@/lib/lcs-sandbox";

// Deals hub §3 — single-deal lifecycle, 1 Sep 2026 (checkpoint 1: shell +
// seven-state stage bar scaffolded; per-stage content built in later
// checkpoints per the same file, each verified live before the next).
// UI only, sandbox data only (src/lib/lcs-sandbox.ts) — same standard as
// §1/§2: lcs/ primitives only, no backend wiring.

export const Route = createFileRoute("/deals-preview/$sector_/$dealId")({
  component: DealLifecycle,
});

const STATUS_TO_PILL: Record<LcsDealListStatus, LcsStatus> = {
  active: "in-progress",
  "in-progress": "in-progress",
  "pending-action": "attention",
  closed: "satisfied",
};

function DealLifecycle() {
  const { sector, dealId } = Route.useParams();
  const [deal, setDeal] = useState<LcsSandboxDeal | null | undefined>(undefined);
  const [activeStage, setActiveStage] = useState<LcsDealStage>("initiation");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const d = getSandboxDeal(dealId);
    setDeal(d ?? null);
    setActiveStage(d?.stage ?? "initiation");
    setNow(Date.now());
  }, [dealId]);

  return (
    <LcsPageShell
      searchPlaceholder="Search deals, LPs, requests"
      userInitials="RM"
      userLabel="R. Mehta"
      sidebar={(collapsed) => (
        <nav className="flex flex-col gap-0.5 p-2">
          {!collapsed && (
            <div className="px-2 py-2 text-[15px] font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
              Lengdon
            </div>
          )}
          <LcsNavItem to="/deals-preview" label="Home" collapsed={collapsed} icon="H" />
          <LcsNavItem to="/deals-preview" label="Deals" active collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Requests" collapsed={collapsed} icon="R" />
          <LcsNavItem to="/deals-preview" label="Investors" collapsed={collapsed} icon="I" />
          <LcsNavItem to="/deals-preview" label="Documents" collapsed={collapsed} icon="D" />
          <LcsNavItem to="/deals-preview" label="Reporting" collapsed={collapsed} icon="R" />
          <LcsNavItem to="/deals-preview" label="Settings" collapsed={collapsed} icon="S" />
        </nav>
      )}
    >
      {deal === undefined ? (
        <div aria-hidden="true" style={{ minHeight: 300 }} />
      ) : deal === null ? (
        <LcsEmptyState
          title="Deal not found"
          text="This deal doesn't exist in the sandbox — it may have been reset."
          action={
            <Link to="/deals-preview/$sector" params={{ sector }}>
              <LcsButton variant="text-link">Back to {SECTOR_LABEL[sector] ?? sector}</LcsButton>
            </Link>
          }
        />
      ) : (
        <>
          <LcsPageHeader
            title={
              <span className="flex items-center gap-3">
                <span>{deal.companyName}</span>
                <span
                  className="text-[13px] font-normal"
                  style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
                >
                  {deal.ref}
                </span>
              </span>
            }
            description={`${deal.counterparty} · Owner ${deal.owner}`}
            action={<LcsStatusPill status={STATUS_TO_PILL[deal.listStatus]} label={deal.listStatus === "in-progress" ? "In Progress" : deal.listStatus === "pending-action" ? "Pending Action" : deal.listStatus === "closed" ? "Closed" : "Active"} />}
          />

          {/* Seven-state stage bar — checkpoint 1's target. Clicking a
              stage switches the content panel below; the deal's real
              current stage (from stageEnteredAt) is preselected on load. */}
          <div className="flex items-center gap-1 mb-6 flex-wrap" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
            {STAGE_ORDER.map((s, i) => {
              const currentIndex = STAGE_ORDER.indexOf(deal.stage);
              const reached = i <= currentIndex;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setActiveStage(s)}
                  className="px-3 h-9 text-[13px] flex items-center gap-1.5 -mb-px"
                  style={{
                    fontFamily: "var(--font-lcs-ui)",
                    fontWeight: activeStage === s ? 500 : 400,
                    color: activeStage === s ? "var(--lcs-accent)" : reached ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
                    borderBottom: activeStage === s ? "2px solid var(--lcs-accent)" : "2px solid transparent",
                    opacity: reached ? 1 : 0.55,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="text-[10px]"
                    style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
                  >
                    {i + 1}
                  </span>
                  {STAGE_LABEL[s]}
                </button>
              );
            })}
          </div>

          <StagePanel deal={deal} stage={activeStage} now={now} />
        </>
      )}
    </LcsPageShell>
  );
}

/** Checkpoint-1 placeholder — each stage gets real content in a later
 * checkpoint of this same build, reported separately per the instruction
 * (NDA gate + document vault next, then diligence/negotiation, then
 * closing gates). Structural scaffold only right now, so the stage bar
 * itself is verifiable before the larger content build continues. */
function StagePanel({ deal, stage, now }: { deal: LcsSandboxDeal; stage: LcsDealStage; now: number | null }) {
  return (
    <div className="border p-8" style={{ borderColor: "var(--lcs-line)" }}>
      <p style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink-muted)", fontSize: 13 }}>
        {STAGE_LABEL[stage]} — content built in a later checkpoint of this section.
        {stage === deal.stage && now !== null && (
          <> This deal has been in this stage for {daysInStage(deal, now)} days.</>
        )}
      </p>
    </div>
  );
}

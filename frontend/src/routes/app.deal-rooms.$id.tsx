import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Clock, Sparkles, X, ArrowLeft, Loader2, Lock } from "lucide-react";
import { AIChat } from "@/components/ai/AIChat";
import { useAuth } from "@/lib/auth";
import { useDealRoomContext, type DealRoomContext } from "@/hooks/useDealRoomContext";
import { DealRoomCtx } from "@/hooks/useDealRoom";
import { STAGES, STAGE_KEY_TO_PATH, stageRank, type DealRoomStageKey } from "@/lib/deal-room-stages";
import { Timeline } from "@/components/app/DealRoomTimeline";

export const Route = createFileRoute("/app/deal-rooms/$id")({
  component: DealRoomLayout,
});

function pathToStageKey(pathname: string): DealRoomStageKey {
  if (pathname.endsWith("/overview")) return "overview";
  if (pathname.endsWith("/information")) return "information_vault";
  if (pathname.endsWith("/documents")) return "information_vault"; // Documents lives under the Information Vault stage
  if (pathname.endsWith("/meetings")) return "meetings";
  if (pathname.endsWith("/qa")) return "qa";
  if (pathname.endsWith("/diligence")) return "due_diligence";
  if (pathname.endsWith("/term-sheets")) return "term_sheet";
  if (pathname.endsWith("/close")) return "closing";
  return "overview";
}

function DealRoomLayout() {
  const { id: dealRoomId } = Route.useParams();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [aiOpen, setAiOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const ctx = useDealRoomContext(dealRoomId);
  const { room, companyName, isInvestor, isTeamMember, teamAssignment, teamAssignmentLoading, ndaAcceptance, ndaLoading, connectionOrigin } = ctx;

  // ── Redirect to NDA page if not yet signed ───────────────────
  useEffect(() => {
    if (!ndaLoading && user?.id && !ndaAcceptance) {
      navigate({ to: "/app/deal-rooms/$id/nda", params: { id: dealRoomId } });
    }
  }, [ndaLoading, ndaAcceptance, user?.id, navigate, dealRoomId]);

  if (!user?.id || ndaLoading || !ndaAcceptance) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-sm text-gray-500 animate-pulse">Verifying access…</div>
      </div>
    );
  }

  // Team member access gate (A2)
  if (isTeamMember && !teamAssignmentLoading && teamAssignment === null) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-100/30">
          <Lock className="h-6 w-6 text-gray-500" />
        </div>
        <div className="text-center">
          <div className="font-semibold">Access restricted</div>
          <div className="mt-1 text-sm text-gray-500 max-w-sm">
            You haven't been assigned to this deal room. Ask your team admin to give you access.
          </div>
        </div>
        <Link to="/app/deal-rooms" className="mt-2 text-sm text-brand hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to deal rooms
        </Link>
      </div>
    );
  }

  const activeStageKey = pathToStageKey(path);

  return (
    <DealRoomCtx.Provider value={ctx}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] relative">
        {/* ── Top header bar ─────────────────────────────────────── */}
        <header
          className="shrink-0 border-b bg-white border-[rgba(0,0,0,0.08)]"
          data-testid="deal-stage-bar"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link
                to={"/app/deal-rooms" as any}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:text-foreground hover:bg-accent shrink-0"
                title="All deal rooms"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div
                className="grid h-8 w-8 place-items-center rounded-lg shrink-0 font-semibold text-foreground"
                style={{ background: "var(--gradient-brand)" }}
              >
                {companyName[0] ?? "D"}
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="text-sm font-semibold text-gray-900 truncate" style={{ fontFamily: "Syne, sans-serif" }}>
                  {companyName}
                </div>
                <div className="text-[10px] text-gray-500">
                  {isInvestor ? "Founder · Deal Room" : "Investor · Deal Room"}
                  {connectionOrigin && (
                    <> · Connected via directory request · {new Date((connectionOrigin as any).responded_at ?? (connectionOrigin as any).created_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            </div>

            <StageTabBar dealRoomId={dealRoomId} workflowStage={(room as any)?.workflow_stage ?? "nda_signed"} isInvestor={isInvestor} activeStageKey={activeStageKey} />

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => setActivityOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:text-foreground hover:bg-gray-100"
                title="Activity"
                data-testid="open-activity"
              >
                <Clock className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAiOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-foreground"
                style={{ background: "var(--gradient-brand)" }}
                data-testid="open-ai"
              >
                <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Ask AI</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── Main content — each tab renders here via Outlet ────── */}
        <main className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
          <StageApprovalBanner ctx={ctx} />
          <Outlet />
        </main>

        {/* ── Activity drawer ─────────────────────────────────────── */}
        {activityOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" onClick={() => setActivityOpen(false)} />
            <aside
              className="fixed top-0 bottom-0 right-0 z-40 w-full sm:w-[420px] border-l border-[rgba(0,0,0,0.08)] flex flex-col bg-white"
              data-testid="activity-drawer"
            >
              <div className="h-14 border-b border-[rgba(0,0,0,0.08)] flex items-center justify-between px-4">
                <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Activity</div>
                <button onClick={() => setActivityOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <Timeline dealRoomId={dealRoomId} />
              </div>
            </aside>
          </>
        )}

        {/* ── AI slide-over ───────────────────────────────────────── */}
        {aiOpen && (
          <>
            <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
            <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-[rgba(0,0,0,0.08)] bg-white shadow-xl flex flex-col" data-testid="ai-panel">
              <div className="h-14 border-b border-[rgba(0,0,0,0.08)] flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">Deal Room AI</div>
                    <div className="text-[10px] text-gray-500">{companyName}</div>
                  </div>
                </div>
                <button onClick={() => setAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-accent hover:text-foreground" data-testid="close-ai"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 min-h-0">
                <AIChat
                  compact
                  userId={user?.id}
                  scope={`the ${companyName} deal room`}
                  startupContext={{
                    companyName: (room as any)?.startups?.company_name,
                    stage: (room as any)?.startups?.stage,
                    sector: (room as any)?.startups?.sector,
                    fundingTarget: (room as any)?.startups?.funding_target,
                    revenue: (room as any)?.startups?.revenue,
                    traction: (room as any)?.startups?.traction,
                  }}
                  initialAssistant="I have context on this deal room — documents, Q&A, diligence checklist, and team. Ask me anything."
                  starters={isInvestor ? [
                    "Summarize this deal in 3 bullets.",
                    "What are the top 3 risks?",
                    "How does ARR growth compare to peers?",
                    "Draft my partner meeting memo.",
                  ] : [
                    "Summarize this deal in 3 bullets.",
                    "What diligence items are still open?",
                    "Draft a follow-up to the investor.",
                    "Flag the top 3 risks.",
                  ]}
                />
              </div>
            </aside>
          </>
        )}
      </div>
    </DealRoomCtx.Provider>
  );
}

// ── Stage approval banner — shown to the approver whenever a pending transition exists
function StageApprovalBanner({ ctx }: { ctx: DealRoomContext }) {
  const { isApprover, pendingTransition, investorUserId, stageApproving, doApproveTransition, doRejectTransition } = ctx;
  if (!isApprover || !pendingTransition) return null;
  return (
    <div
      className="mx-6 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
      data-testid="stage-approval-banner"
    >
      <div className="text-sm text-amber-900">
        <span className="font-semibold">{pendingTransition.requested_by === investorUserId ? "Investor" : "Founder"}</span>
        {" "}has requested to advance to{" "}
        <span className="font-semibold">{pendingTransition.to_stage.replace(/_/g, " ")}</span>.
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => doRejectTransition(pendingTransition.id)}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          data-testid="stage-reject-btn"
        >
          Decline
        </button>
        <button
          onClick={() => doApproveTransition(pendingTransition.id)}
          disabled={stageApproving}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
          style={{ background: "#10B981" }}
          data-testid="stage-approve-btn"
        >
          {stageApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Approve →
        </button>
      </div>
    </div>
  );
}

// ── Stage tab bar — real router links, not local tab state ─────────────
function StageTabBar({
  dealRoomId,
  workflowStage,
  isInvestor,
  activeStageKey,
}: {
  dealRoomId: string;
  workflowStage: string;
  isInvestor: boolean;
  activeStageKey: DealRoomStageKey;
}) {
  const workflowRank = stageRank(workflowStage);
  const canAccess = (stage: DealRoomStageKey) => {
    if (stage === "overview") return true;
    if (stage === "information_vault") return true;
    if (stage === "meetings") return true;
    if (stage === "qa") return workflowRank >= stageRank("qa");
    if (stage === "due_diligence") return workflowRank >= stageRank("due_diligence");
    if (stage === "term_sheet") return isInvestor && workflowRank >= stageRank("term_sheet");
    if (stage === "closing") return workflowRank >= stageRank("closing");
    return false;
  };

  const scrollRef = useRef<HTMLElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const stagePath = (key: DealRoomStageKey) =>
    key === "overview" ? "overview" : STAGE_KEY_TO_PATH[key];

  return (
    <div className="relative min-w-0 flex-1" data-testid="stage-pills">
      <nav ref={scrollRef} className="flex flex-nowrap overflow-x-auto border-b border-[rgba(0,0,0,0.08)] bg-white">
        {STAGES.map((stage) => {
          const active = activeStageKey === stage.key;
          const accessible = canAccess(stage.key);
          const className = active
            ? "hs-gradient text-white rounded-t-lg px-4 py-2 text-sm font-medium whitespace-nowrap"
            : accessible
              ? "text-gray-600 px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg whitespace-nowrap"
              : "text-[#71717A] px-4 py-2 text-sm cursor-not-allowed whitespace-nowrap";
          return accessible ? (
            <Link
              key={stage.key}
              to={`/app/deal-rooms/$id/${stagePath(stage.key)}` as any}
              params={{ id: dealRoomId }}
              className={className}
              data-testid={`stage-pill-${stage.key}`}
              data-state={active ? "current" : "available"}
            >
              <span className="inline-flex items-center gap-1.5">
                {stage.icon && <span aria-hidden="true">{stage.icon}</span>}
                {stage.label}
              </span>
            </Link>
          ) : (
            <button
              key={stage.key}
              disabled
              className={className}
              data-testid={`stage-pill-${stage.key}`}
              data-state="locked"
            >
              <span className="inline-flex items-center gap-1.5">
                {stage.icon && <span aria-hidden="true">{stage.icon}</span>}
                {stage.label}
              </span>
            </button>
          );
        })}
      </nav>
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent" />
      )}
    </div>
  );
}


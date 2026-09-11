import { Link, useNavigate } from "@tanstack/react-router";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";
import { LcsCard, LcsEmptyState, LcsButton } from "@/components/lcs";

/**
 * /app/investor — the investor-owner home. Pulled from the approved
 * Figma frame (kDYUyEq60J0T2i24b6GzAv, node 220:702, "home-investor-
 * empty") and wired to real data — no design interpretation, no
 * fabricated content. Renders as content only, inside the real running
 * AdminShell chrome (the frame's own navy sidebar is not built here —
 * AdminShell is out of scope for this pass, confirmed 7 Sep 2026, same
 * disposition as RaiseHome.tsx).
 *
 * Checklist items verified against real data before building — all 4
 * of the frame's items map to real, distinct fields (investor_profiles'
 * fund_name/geography vs. thesis_statement/check_size/sectors/stages,
 * a real team table, and the real role-agnostic
 * users.notification_prefs route) — zero corrections needed here,
 * unlike the founder and team-member checklists.
 */

const CHECKLIST_ITEMS: {
  key: string;
  label: string;
  done: (p?: { orgDetailsSet: boolean; thesisSet: boolean; teamMembersCount: number; notificationPrefsSet: boolean }) => boolean;
}[] = [
  { key: "org", label: "Organization details", done: (p) => !!p?.orgDetailsSet },
  { key: "thesis", label: "Investment criteria", done: (p) => !!p?.thesisSet },
  { key: "team", label: "Add team members", done: (p) => (p?.teamMembersCount ?? 0) > 0 },
  { key: "notifications", label: "Set notification preferences", done: (p) => !!p?.notificationPrefsSet },
];

const TUTORIALS = [
  "Understanding incoming briefs",
  "Navigating deal rooms",
  "Due diligence workflows",
  "Document review process",
];

const PLATFORM_CARDS: { title: string; text: string }[] = [
  { title: "Deal Room", text: "Private spaces for each founder conversation" },
  { title: "Data Room", text: "Review documents shared by founders with secure access" },
  { title: "Due Diligence Station", text: "Submit questions and review evidence" },
  { title: "Checklists", text: "Track your review requirements" },
  { title: "Documents", text: "Access all shared fundraising documents" },
  { title: "How It Works", text: "Step-by-step guide to the investment workflow" },
];

export function DealFlowHome() {
  const navigate = useNavigate();
  const { data: p } = useDealFlowProgress();

  const thesisSet = !!p?.thesisSet;
  const watchlistCount = p?.watchlistCount ?? 0;
  const activeRooms = p?.activeRooms ?? 0;
  const pendingDecisions = p?.pendingDecisions ?? 0;
  const portfolioCount = p?.portfolioCount ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8" data-testid="deal-flow-home">
      {/* Welcome header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-bold uppercase"
              style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}
            >
              Orientation
            </div>
            <h1
              className="text-[28px] font-bold leading-tight mt-1"
              style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
            >
              Welcome to Lengdon
            </h1>
            <p className="text-[14px] mt-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-serif)" }}>
              Your closing infrastructure for private capital fundraising.
            </p>
          </div>
          <div
            className="px-2.5 py-1.5 shrink-0"
            style={{ background: "var(--lcs-accent)", borderRadius: "var(--radius-lcs-control)" }}
          >
            <span className="text-[11px] font-bold text-white" style={{ fontFamily: "var(--font-lcs-data)" }}>
              INVESTOR
            </span>
          </div>
        </div>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-serif)" }}>
          Deals will appear here once a founder shares a brief with you. Founders initiate by
          sharing their brief directly — there is nothing to browse or discover until then.
        </p>
      </div>

      {/* Complete your profile */}
      <LcsCard title="Complete your profile" onViewAll={() => navigate({ to: "/app/investor/thesis" })}>
        <div className="p-4 flex flex-col gap-2.5">
          {CHECKLIST_ITEMS.map((item) => {
            const done = item.done(p);
            return (
              <div key={item.key} className="flex items-center gap-3">
                <div
                  className="grid place-items-center shrink-0 size-5"
                  style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)" }}
                >
                  <div
                    className="size-3.5"
                    style={{
                      borderRadius: "50%",
                      border: `1.5px solid ${done ? "var(--lcs-satisfied)" : "var(--lcs-ink-muted)"}`,
                      background: done ? "var(--lcs-satisfied)" : "transparent",
                    }}
                  />
                </div>
                <span className="text-[14px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-serif)" }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </LcsCard>

      {/* Getting started - Tutorials */}
      <LcsCard title="Getting started - Tutorials">
        <div className="p-4 flex flex-col gap-2.5">
          {TUTORIALS.map((title) => (
            <div key={title} className="flex items-center justify-between gap-3">
              <span className="text-[14px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-serif)" }}>
                {title}
              </span>
              <Link
                to="/app/support"
                className="text-[12px] font-bold shrink-0"
                style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-data)" }}
              >
                View
              </Link>
            </div>
          ))}
        </div>
      </LcsCard>

      {/* Platform overview */}
      <div className="flex flex-col gap-3">
        <div className="text-[16px] font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Platform overview
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLATFORM_CARDS.map((card) => (
            <div
              key={card.title}
              className="p-4 flex flex-col gap-2"
              style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}
            >
              <div className="text-[14px] font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                {card.title}
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-serif)" }}>
                {card.text}
              </p>
              <span className="text-[12px] font-bold" style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-data)" }}>
                Learn more
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Worklist — carried byte-identical from the pre-existing worklist logic */}
      <div className="flex flex-col gap-3">
        <div className="text-[16px] font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Worklist
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <LcsCard title="Waiting on you" count={pendingDecisions > 0 ? pendingDecisions : undefined}>
            {pendingDecisions === 0 ? (
              <LcsEmptyState text="No pending items. When a founder shares materials requiring your review, they'll appear here." />
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    Rooms awaiting your decision
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-attention)" }}>
                    {pendingDecisions}
                  </span>
                </div>
              </div>
            )}
          </LcsCard>

          <LcsCard title="Waiting on them" count={activeRooms > 0 ? activeRooms : undefined}>
            {activeRooms === 0 ? (
              <LcsEmptyState text="Items you've sent back to founders will be tracked here." />
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    Active deal rooms
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                    {activeRooms}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                  <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    On your watchlist
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                    {watchlistCount}
                  </span>
                </div>
                {portfolioCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                    <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                      In your portfolio
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-satisfied)" }}>
                      {portfolioCount}
                    </span>
                  </div>
                )}
              </div>
            )}
          </LcsCard>

          <LcsCard title="Expiring soon">
            <LcsEmptyState text="No upcoming deadlines. Time-sensitive items will surface here automatically." />
          </LcsCard>
        </div>
      </div>

      {!thesisSet && (
        <div className="flex justify-end">
          <LcsButton variant="primary" onClick={() => navigate({ to: "/app/investor/thesis" })}>
            Define your thesis
          </LcsButton>
        </div>
      )}
    </div>
  );
}

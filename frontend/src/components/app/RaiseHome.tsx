import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useRaiseProgress,
  SECTION_LABELS,
} from "@/hooks/useRaiseProgress";
import { LcsCard, LcsEmptyState, LcsButton } from "@/components/lcs";

/**
 * /app — the founder-owner home. Pulled from the approved Figma frame
 * (kDYUyEq60J0T2i24b6GzAv, node 220:611, "home-founder-empty") and wired
 * to real data — no design interpretation, no fabricated content. Renders
 * as content only, inside the real running AdminShell chrome (the
 * frame's own navy sidebar is not built here — AdminShell is out of
 * scope for this pass, confirmed 7 Sep 2026).
 *
 * Two corrections applied against the frame's literal copy, both
 * confirmed rather than assumed, before any of this was wired:
 * - "0 of 14 fields confirmed" had no real 14-field model anywhere in
 *   the data — rewritten to the real 6-section useRaiseProgress count.
 * - "Connect bank details" had no real backing field anywhere (no
 *   bank-connection concept exists in this product — Foundation §15
 *   excludes money movement/custody outright) — dropped, not replaced
 *   with an invented 4th item. The checklist is 3 real items.
 */

const CHECKLIST_ITEMS: {
  key: string;
  label: string;
  done: (p?: { logoUrl: string | null; teamMembersCount: number; companyName: string | null }) => boolean;
}[] = [
  { key: "company", label: "Company information", done: (p) => !!p?.companyName },
  { key: "logo", label: "Upload logo", done: (p) => !!p?.logoUrl },
  { key: "team", label: "Add team members", done: (p) => (p?.teamMembersCount ?? 0) > 0 },
];

const TUTORIALS = [
  "How to build your pack",
  "Understanding deal rooms",
  "Preparing for due diligence",
  "Your first investor brief",
];

const PLATFORM_CARDS: { title: string; text: string }[] = [
  { title: "Deal Room", text: "Private spaces for each investor conversation" },
  { title: "Data Room", text: "Secure document sharing with granular access control" },
  { title: "Due Diligence Station", text: "Manage questionnaires and evidence requests" },
  { title: "Checklists", text: "Track requirements across your raise" },
  { title: "Documents", text: "Central vault for all your fundraising documents" },
  { title: "How It Works", text: "Step-by-step guide to your fundraising workflow" },
];

export function RaiseHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: p } = useRaiseProgress();

  const firstName = user?.email?.split("@")[0] ?? "Founder";
  const hasStartup = !!p?.startupId;
  const prepareTotal = p?.prepareTotal ?? 6;
  const prepareDone = p?.prepareDone ?? 0;
  const prepareComplete = !!p && p.prepareDone === p.prepareTotal;

  const primaryAction = !hasStartup || !prepareComplete
    ? { to: "/app/prepare" as const, label: "Start building your pack" }
    : !p?.goLiveDone
      ? { to: "/app/go-live" as const, label: "Go live" }
      : { to: "/app/deal-rooms" as const, label: "View deal rooms" };

  // "Waiting on you" — real, on-you pack items not yet complete. Carried
  // byte-identical from the prior worklist logic.
  const onYou = p
    ? (Object.keys(p.sections) as Array<keyof typeof p.sections>).filter(
        (k) => p.sections[k] !== "complete",
      )
    : [];

  // "Waiting on them" — real, in-flight rooms where the next move isn't
  // the founder's. Carried byte-identical from the prior worklist logic.
  const activeRooms = p?.activeRooms ?? 0;
  const closingRooms = p?.closingRooms ?? 0;
  const waitingOnThemCount = activeRooms + closingRooms;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8" data-testid="raise-home">
      {/* Welcome header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-bold uppercase"
              style={{ color: "#e65100", fontFamily: "var(--font-lcs-data)" }}
            >
              Required step
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
              FOUNDER
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[12px]" style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-data)" }}>
            {prepareDone} of {prepareTotal} sections confirmed
          </span>
          <LcsButton variant="primary" onClick={() => navigate({ to: primaryAction.to })} className="shrink-0">
            {primaryAction.label}
            <ArrowRight className="h-4 w-4" />
          </LcsButton>
        </div>
      </div>

      {/* Complete your profile */}
      <LcsCard title="Complete your profile" onViewAll={() => navigate({ to: "/app/prepare" })}>
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

      {/* Worklist */}
      <div className="flex flex-col gap-3">
        <div className="text-[16px] font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Worklist
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <LcsCard title="Waiting on you" count={hasStartup ? onYou.length : undefined}>
            {!hasStartup ? (
              <LcsEmptyState text="Nothing here yet. Tasks will appear as you share your brief and investors respond." />
            ) : onYou.length === 0 ? (
              <LcsEmptyState text="Nothing here yet. Tasks will appear as you share your brief and investors respond." />
            ) : (
              <div className="flex flex-col">
                {onYou.map((k, i) => (
                  <Link
                    key={k}
                    to="/app/prepare"
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i === 0 ? undefined : "1px solid var(--lcs-line)" }}
                    data-testid={`home-onyou-${k}`}
                  >
                    <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                      {SECTION_LABELS[k]}
                    </span>
                    <span className="text-[12px]" style={{ color: p!.sections[k] === "in-progress" ? "var(--lcs-progress)" : "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
                      {p!.sections[k] === "in-progress" ? "In progress" : "Not started"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </LcsCard>

          <LcsCard title="Waiting on them" count={hasStartup && waitingOnThemCount > 0 ? waitingOnThemCount : undefined}>
            {!hasStartup || activeRooms === 0 ? (
              <LcsEmptyState text="Items you've sent to investors will appear here once you begin sharing." />
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
                {closingRooms > 0 && (
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                    <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                      In closing
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-attention)" }}>
                      {closingRooms}
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
    </div>
  );
}

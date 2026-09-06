import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  useRaiseProgress,
  nextIncomplete,
  SECTION_LABELS,
  type RaiseProgress,
} from "@/hooks/useRaiseProgress";
import { LcsPageHeader, LcsCard, LcsEmptyState, LcsButton, LcsStatusPill, type LcsStatus } from "@/components/lcs";

/**
 * /app — the founder-owner home. A worklist, not a dashboard: one honest
 * headline, one primary action computed from the real logged-in account's
 * own state, a 4-phase status strip (Prepare/Present/Engage/Close — the
 * founder's own outer raise journey, distinct from the 7-state deal-room
 * lifecycle that governs one open room), and a 3-panel worklist
 * (Waiting on you / Waiting on them / Expiring soon), each empty-but-
 * labeled when there's no data. No role switcher — a real user has
 * exactly one role, read from their account, never a manual toggle. No
 * invented content, no placeholder companies, no fabricated security/
 * crypto claims anywhere. Per the Post-login Home Dashboard design brief
 * and its correction brief (6 Sep 2026).
 */

const PHASES: { key: string; label: string; text: string; criteria: (p?: RaiseProgress) => string }[] = [
  {
    key: "prepare",
    label: "Prepare",
    text: "Build your pack — profile, documents, verification.",
    criteria: (p) => (p ? `${p.prepareDone} of ${p.prepareTotal} confirmed` : "0 of 6 confirmed"),
  },
  {
    key: "present",
    label: "Present",
    text: "Publish and share with investors you choose.",
    criteria: () => "Pack must be ready",
  },
  {
    key: "engage",
    label: "Engage",
    text: "Answer questions, negotiate terms in a deal room.",
    criteria: () => "A room must be open",
  },
  {
    key: "close",
    label: "Close",
    text: "Confirm terms with both sides and close the raise.",
    criteria: () => "Mutual confirmation",
  },
];

function phaseStatus(index: number, p?: RaiseProgress): LcsStatus {
  if (!p) return index === 0 ? "in-progress" : "pending";
  const prepareDone = p.prepareDone === p.prepareTotal;
  const anySectionStarted = p.prepareDone > 0 || Object.values(p.sections).some((s) => s !== "not-started");
  if (index === 0) return prepareDone ? "satisfied" : anySectionStarted ? "in-progress" : "pending";
  if (index === 1) return p.goLiveDone ? "satisfied" : prepareDone ? "in-progress" : "pending";
  if (index === 2) return p.closedRooms > 0 || p.closingRooms > 0 ? "satisfied" : p.activeRooms > 0 ? "in-progress" : "pending";
  if (index === 3) return p.closedRooms > 0 ? "satisfied" : p.closingRooms > 0 ? "in-progress" : "pending";
  return "pending";
}

const PHASE_STATUS_LABEL: Record<LcsStatus, string> = {
  pending: "Not started",
  "in-progress": "In progress",
  satisfied: "Complete",
  attention: "Needs attention",
};

export function RaiseHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: p } = useRaiseProgress();
  const next = nextIncomplete(p);

  const firstName = user?.email?.split("@")[0] ?? "Founder";
  const hasStartup = !!p?.startupId;
  const prepareComplete = !!p && p.prepareDone === p.prepareTotal;
  const prepareTotal = p?.prepareTotal ?? 6;
  const prepareDone = p?.prepareDone ?? 0;
  const preparePct = prepareTotal > 0 ? Math.round((prepareDone / prepareTotal) * 100) : 0;

  const headline = !hasStartup
    ? "Build your pack to start sharing with investors."
    : prepareComplete
      ? p.goLiveDone
        ? "Your profile is live. Here's what's moving."
        : "Your pack is ready — go live to start sharing."
      : `Next: ${next ? SECTION_LABELS[next] : "finish your pack"}.`;

  const subhead = !hasStartup
    ? "Deal rooms open once your profile, documents, and verification are confirmed."
    : (p?.companyName ?? `Welcome, ${firstName}`);

  const primaryAction = !hasStartup || !prepareComplete
    ? { to: "/app/prepare" as const, label: "Go to Pack Builder" }
    : !p?.goLiveDone
      ? { to: "/app/go-live" as const, label: "Go live" }
      : { to: "/app/deal-rooms" as const, label: "View deal rooms" };

  // "Waiting on you" — real, on-you pack items not yet complete.
  const onYou = p
    ? (Object.keys(p.sections) as Array<keyof typeof p.sections>).filter(
        (k) => p.sections[k] !== "complete",
      )
    : [];

  // "Waiting on them" — real, in-flight rooms where the next move isn't the founder's.
  const activeRooms = p?.activeRooms ?? 0;
  const closingRooms = p?.closingRooms ?? 0;

  return (
    <div className="p-6 lg:p-12 max-w-4xl mx-auto" data-testid="raise-home">
      <div className="p-5 flex flex-col gap-5" style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)" }}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="max-w-xl">
            <h1
              className="text-[22px] font-semibold leading-snug"
              style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
            >
              {headline}
            </h1>
            <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              {subhead}
            </p>
          </div>
          <LcsButton variant="primary" onClick={() => navigate({ to: primaryAction.to })} className="shrink-0">
            {primaryAction.label}
          </LcsButton>
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
              Pack progress
            </span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-data)" }}>
              {prepareDone}/{prepareTotal} ({preparePct}%)
            </span>
          </div>
          <div className="h-1.5" style={{ background: "var(--lcs-line)" }}>
            <div className="h-full" style={{ width: `${preparePct}%`, background: "var(--lcs-accent)" }} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wide font-medium mb-2.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
          How it works
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((phase, i) => {
            const status = phaseStatus(i, p);
            const isCurrent = status === "in-progress";
            return (
              <div
                key={phase.key}
                className="p-4 flex flex-col justify-between"
                style={{
                  background: "var(--lcs-white)",
                  border: isCurrent ? "1px solid var(--lcs-accent)" : "1px solid var(--lcs-line)",
                  borderLeftWidth: isCurrent ? 3 : 1,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ fontFamily: "var(--font-lcs-data)", color: isCurrent ? "var(--lcs-accent)" : "var(--lcs-ink-muted)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <LcsStatusPill status={status} label={PHASE_STATUS_LABEL[status]} />
                  </div>
                  <div className="text-[14px] font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    {phase.label}
                  </div>
                  <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                    {phase.text}
                  </p>
                </div>
                <div
                  className="mt-3 pt-2.5 flex items-center justify-between text-[11px]"
                  style={{ borderTop: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
                >
                  <span>Criteria</span>
                  <span>{phase.criteria(p)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <LcsCard title="Waiting on you">
          {!hasStartup ? (
            <div className="p-4">
              <LcsEmptyState text="Nothing to confirm yet — start by building your pack." />
            </div>
          ) : onYou.length === 0 ? (
            <div className="p-4">
              <LcsEmptyState text="Nothing waiting on you right now." />
            </div>
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
                  <LcsStatusPill
                    status={p!.sections[k] === "in-progress" ? "in-progress" : "pending"}
                    label={p!.sections[k] === "in-progress" ? "In progress" : "Not started"}
                  />
                </Link>
              ))}
            </div>
          )}
        </LcsCard>

        <LcsCard title="Waiting on them">
          {!hasStartup || activeRooms === 0 ? (
            <div className="p-4">
              <LcsEmptyState text="No deal rooms yet — this fills once investors are in one." />
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
              {closingRooms > 0 && (
                <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
                  <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    In closing
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold tabular-nums" style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink)" }}>
                      {closingRooms}
                    </span>
                    <LcsStatusPill status="attention" label="Awaiting close" />
                  </div>
                </div>
              )}
            </div>
          )}
        </LcsCard>

        <LcsCard title="Expiring soon">
          <div className="p-4">
            <LcsEmptyState text="NDA windows and term sheet deadlines appear here as they approach." />
          </div>
        </LcsCard>
      </div>
    </div>
  );
}

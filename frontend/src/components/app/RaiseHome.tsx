import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  useRaiseProgress,
  nextIncomplete,
  SECTION_LABELS,
} from "@/hooks/useRaiseProgress";
import { LcsPageHeader, LcsCard, LcsEmptyState, LcsButton, LcsStatusPill } from "@/components/lcs";

/**
 * /app — the founder-owner home. A worklist, not a dashboard: one honest
 * headline, one primary action, and the real structural sections (what's
 * on the founder, what's on someone else, the real workflow shape) shown
 * empty-but-labeled when there's no data yet. No invented content, no
 * placeholder companies or metrics — per the Post-login Home Dashboard
 * design brief (6 Sep 2026). Rebuilt from the old numbered-spine layout.
 */

const HOW_IT_WORKS = [
  { label: "Prepare", text: "Build your pack — profile, documents, verification." },
  { label: "Present", text: "Publish and share with investors you choose." },
  { label: "Engage", text: "Answer questions, negotiate terms in a deal room." },
  { label: "Close", text: "Confirm terms with both sides and close the raise." },
] as const;

export function RaiseHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: p } = useRaiseProgress();
  const next = nextIncomplete(p);

  const firstName = user?.email?.split("@")[0] ?? "Founder";
  const hasStartup = !!p?.startupId;
  const prepareComplete = !!p && p.prepareDone === p.prepareTotal;

  const headline = !hasStartup
    ? "Build your pack to start sharing with investors."
    : prepareComplete
      ? p.goLiveDone
        ? "Your profile is live. Here's what's moving."
        : "Your pack is ready — go live to start sharing."
      : `Next: ${next ? SECTION_LABELS[next] : "finish your pack"}.`;

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
    <div className="p-6 lg:p-12 max-w-3xl mx-auto" data-testid="raise-home">
      <LcsPageHeader
        title={headline}
        description={p?.companyName ?? `Welcome, ${firstName}`}
        action={
          <LcsButton variant="primary" onClick={() => navigate({ to: primaryAction.to })}>
            {primaryAction.label}
          </LcsButton>
        }
      />

      <div className="flex flex-col gap-4">
        <LcsCard title="Waiting on you">
          {!hasStartup ? (
            <div className="p-4">
              <LcsEmptyState
                text="Nothing to confirm yet — start by building your pack."
              />
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

        <LcsCard title="How it works">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.label} className="flex gap-3">
                <span
                  className="text-[13px] font-semibold tabular-nums shrink-0"
                  style={{ fontFamily: "var(--font-lcs-data)", color: "var(--lcs-ink-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                    {s.label}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                    {s.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LcsCard>
      </div>
    </div>
  );
}

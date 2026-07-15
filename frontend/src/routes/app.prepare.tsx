import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy } from "react";
import { ArrowRight } from "lucide-react";
import { PrepareSection } from "@/components/app/PrepareSection";
import { HsButton, StatusDot } from "@/components/system";
import {
  useRaiseProgress,
  nextIncomplete,
  SECTION_LABELS,
} from "@/hooks/useRaiseProgress";

// ① Prepare — the raise hub. Documents, Verification, Claims, and Badges are
// now real standalone routes (/app/documents, /app/verification, /app/claims,
// /app/badges) — this page links out to them rather than embedding them.
// Profile has its own canonical route (/app/profile) too; shown here as a
// summary card since every other section on this page needs it filled in
// first. Readiness has no standalone route — it stays embedded.

export const Route = createFileRoute("/app/prepare")({
  component: PreparePage,
});

const LazyChecklist = lazy(() =>
  import("@/components/app/ProfileChecklist").then((m) => ({
    default: m.ProfileChecklist,
  })),
);

function ReadinessSection({ startupId }: { startupId: string | null }) {
  if (!startupId) return null;
  return <LazyChecklist startupId={startupId} />;
}

const STATUS_LABEL: Record<string, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  complete: "Complete",
};
const STATUS_TONE: Record<string, "positive" | "warning" | "neutral"> = {
  "not-started": "neutral",
  "in-progress": "warning",
  complete: "positive",
};

function SectionLinkRow({
  to,
  label,
  status,
}: {
  to: string;
  label: string;
  status: string;
}) {
  return (
    <Link
      to={to as any}
      className="flex items-center justify-between gap-4 py-4 border-b border-border/60 last:border-b-0 hover:bg-accent/40 -mx-2 px-2 transition-colors"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-3 shrink-0">
        <StatusDot tone={STATUS_TONE[status] ?? "neutral"} label={STATUS_LABEL[status] ?? status} />
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
    </Link>
  );
}

function PreparePage() {
  const { data: p } = useRaiseProgress();
  const next = nextIncomplete(p);

  return (
    <div className="p-6 lg:p-12 max-w-4xl mx-auto">
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#71717A",
        }}
      >
        Your raise · Step 1
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Prepare
      </h1>

      {/* Progress spine */}
      <div className="mt-6 mb-12 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[13px] font-semibold" data-testid="prepare-progress">
            {p ? `${p.prepareDone} of ${p.prepareTotal} complete` : "—"}
          </div>
          {next && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Next: {SECTION_LABELS[next]}
            </div>
          )}
        </div>
        {next && (
          <a href={`#${next === "verification" ? "verification" : next}`}>
            <HsButton>Continue</HsButton>
          </a>
        )}
        <div className="w-full h-1 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full hs-gradient-static rounded-full transition-all"
            style={{
              width: p ? `${(p.prepareDone / p.prepareTotal) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* Profile — canonical route is /app/profile; summary card here since
          every other section depends on it being filled in first. */}
      <Link
        to={"/app/profile" as any}
        className="block bg-card border border-border/60 rounded-none p-6 mb-6 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Company profile</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {p ? `${p.profilePct}% ready` : "—"}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
            Edit profile <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      <div className="bg-card border border-border/60 rounded-none px-6 mb-6">
        <SectionLinkRow to="/app/documents" label="Documents" status={p?.sections.documents ?? "not-started"} />
        <SectionLinkRow to="/app/verification" label="Verification" status={p?.sections.verification ?? "not-started"} />
        <SectionLinkRow to="/app/claims" label="Claims" status={p?.sections.claims ?? "not-started"} />
        <SectionLinkRow to="/app/badges" label="Badges" status={p?.sections.badges ?? "not-started"} />
      </div>

      <PrepareSection
        id="readiness"
        label="Readiness"
        status={p?.sections.readiness ?? "not-started"}
      >
        <ReadinessSection startupId={p?.startupId ?? null} />
      </PrepareSection>
    </div>
  );
}

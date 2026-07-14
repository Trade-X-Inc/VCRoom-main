import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PrepareSection } from "@/components/app/PrepareSection";
import { HsButton } from "@/components/system";
import {
  useRaiseProgress,
  nextIncomplete,
  SECTION_LABELS,
} from "@/hooks/useRaiseProgress";

// ① Prepare — one page, every preparation section. The old routes
// (/app/profile, /app/documents, /app/advisor, /app/claims, /app/badges)
// redirect to anchors here. Content components are the existing pages,
// imported untouched and mounted lazily on first expand.

export const Route = createFileRoute("/app/prepare")({
  component: PreparePage,
});

const ProfileSection = lazy(() =>
  import("./app.profile").then((m) => ({ default: m.Profile })),
);
const DocumentsSection = lazy(() =>
  import("./app.documents").then((m) => ({ default: m.Documents })),
);
const VerificationSection = lazy(() =>
  import("./app.advisor").then((m) => ({ default: m.VerificationPage })),
);
const ClaimsSection = lazy(() =>
  import("./app.claims").then((m) => ({ default: m.ClaimsPage })),
);
const BadgesSection = lazy(() =>
  import("./app.badges").then((m) => ({ default: m.BadgesPage })),
);
const LazyChecklist = lazy(() =>
  import("@/components/app/ProfileChecklist").then((m) => ({
    default: m.ProfileChecklist,
  })),
);

function ReadinessSection({ startupId }: { startupId: string | null }) {
  if (!startupId) return null;
  return <LazyChecklist startupId={startupId} />;
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
          color: "rgba(0,0,0,0.35)",
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

      <PrepareSection
        id="profile"
        label="Company profile"
        status={p?.sections.profile ?? "not-started"}
        summary={p ? `${p.profilePct}% ready` : undefined}
      >
        <ProfileSection />
      </PrepareSection>

      <PrepareSection
        id="documents"
        label="Documents"
        status={p?.sections.documents ?? "not-started"}
      >
        <DocumentsSection />
      </PrepareSection>

      <PrepareSection
        id="verification"
        label="Verification"
        status={p?.sections.verification ?? "not-started"}
      >
        <VerificationSection />
      </PrepareSection>

      <PrepareSection
        id="claims"
        label="Claims"
        status={p?.sections.claims ?? "not-started"}
      >
        <ClaimsSection />
      </PrepareSection>

      <PrepareSection
        id="readiness"
        label="Readiness"
        status={p?.sections.readiness ?? "not-started"}
      >
        <ReadinessSection startupId={p?.startupId ?? null} />
      </PrepareSection>

      <PrepareSection
        id="badges"
        label="Badges"
        status={p?.sections.badges ?? "not-started"}
      >
        <BadgesSection />
      </PrepareSection>
    </div>
  );
}

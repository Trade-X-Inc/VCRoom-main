import { createFileRoute } from "@tanstack/react-router";
import { lazy, useEffect } from "react";
import { PrepareSection } from "@/components/app/PrepareSection";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ① Thesis — the investor identity: thesis, preferences, exclusions all
// live inside the existing profile editor, wrapped untouched.

export const Route = createFileRoute("/app/investor/thesis")({
  component: ThesisPage,
});

const ProfileEditor = lazy(() =>
  import("./app.investor.profile").then((m) => ({ default: m.InvestorProfilePage })),
);

function ThesisPage() {
  const { data: p } = useDealFlowProgress();
  // The editor contains preferences + exclusions — alias their anchors.
  useEffect(() => {
    if (["#preferences", "#exclusions"].includes(window.location.hash)) {
      window.location.hash = "thesis";
    }
  }, []);
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
        Deal flow · Step 1
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Thesis
      </h1>

      <PrepareSection
        id="thesis"
        label="Thesis"
        status={p?.thesisSet ? "complete" : "in-progress"}
        summary={p?.thesisSet ? "Set" : "Not set"}
      >
        <ProfileEditor />
      </PrepareSection>
    </div>
  );
}

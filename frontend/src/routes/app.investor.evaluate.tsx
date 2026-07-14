import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PrepareSection } from "@/components/app/PrepareSection";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ③ Evaluate — rooms, diligence, analysis.

export const Route = createFileRoute("/app/investor/evaluate")({
  component: EvaluatePage,
});

const Rooms = lazy(() =>
  import("./app.investor.deal-rooms").then((m) => ({ default: m.DealRoomsPage })),
);
const Diligence = lazy(() =>
  import("./app.investor.diligence").then((m) => ({ default: m.DiligencePage })),
);
const Analysis = lazy(() =>
  import("./app.investor.analysis").then((m) => ({ default: m.AnalysisPage })),
);

function EvaluatePage() {
  const { data: p } = useDealFlowProgress();
  return (
    <div className="p-6 lg:p-12 max-w-5xl mx-auto">
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
        Deal flow · Step 3
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Evaluate
      </h1>

      <PrepareSection
        id="deal-rooms"
        label="Deal rooms"
        status={p?.activeRooms ? "in-progress" : "not-started"}
        summary={p ? `${p.activeRooms} active` : undefined}
      >
        <Rooms />
      </PrepareSection>
      <PrepareSection id="diligence" label="Due diligence" status="not-started">
        <Diligence />
      </PrepareSection>
      <PrepareSection id="analysis" label="AI analysis" status="not-started">
        <Analysis />
      </PrepareSection>
    </div>
  );
}

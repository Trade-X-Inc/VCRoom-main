import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PrepareSection } from "@/components/app/PrepareSection";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ② Source — find and import deals.

export const Route = createFileRoute("/app/investor/source")({
  component: SourcePage,
});

const Intake = lazy(() =>
  import("./app.investor.intake").then((m) => ({ default: m.IntakePage })),
);
const Watchlist = lazy(() =>
  import("./app.investor.startups").then((m) => ({ default: m.StartupsPage })),
);
const Directory = lazy(() =>
  import("./app.directory").then((m) => ({ default: m.Directory })),
);
const Connections = lazy(() =>
  import("./app.investor.connections").then((m) => ({ default: m.ConnectionsPage })),
);

function SourcePage() {
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
        Deal flow · Step 2
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Source
      </h1>

      <PrepareSection
        id="watchlist"
        label="Watchlist"
        status={p?.watchlistCount ? "in-progress" : "not-started"}
        summary={p ? `${p.watchlistCount} companies` : undefined}
      >
        <Watchlist />
      </PrepareSection>
      <PrepareSection id="intake" label="Deal intake" status="not-started" summary="Paste, parse, score">
        <Intake />
      </PrepareSection>
      <PrepareSection id="directory" label="Directory" status="not-started" summary="Verified founders">
        <Directory />
      </PrepareSection>
      <PrepareSection id="connections" label="Connections" status="not-started" summary="Requests sent">
        <Connections />
      </PrepareSection>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PrepareSection } from "@/components/app/PrepareSection";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ④ Decide — the decision board and the book.

export const Route = createFileRoute("/app/investor/decide")({
  component: DecidePage,
});

const Decisions = lazy(() =>
  import("./app.investor.decisions").then((m) => ({ default: m.DecisionsPage })),
);
const Portfolio = lazy(() =>
  import("./app.investor.portfolio").then((m) => ({ default: m.PortfolioPage })),
);

function DecidePage() {
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
        Deal flow · Step 4
      </div>
      <h1
        className="text-lg font-bold tracking-tight mt-1 mb-12"
        style={{ fontFamily: "'Syne', sans-serif" }}
      >
        Decide
      </h1>

      <PrepareSection
        id="decisions"
        label="Decisions"
        status={p?.pendingDecisions ? "in-progress" : "not-started"}
        summary={p?.pendingDecisions ? `${p.pendingDecisions} pending` : "None pending"}
      >
        <Decisions />
      </PrepareSection>
      <PrepareSection
        id="portfolio"
        label="Portfolio"
        status={p?.portfolioCount ? "complete" : "not-started"}
        summary={p ? `${p.portfolioCount} invested` : undefined}
      >
        <Portfolio />
      </PrepareSection>
    </div>
  );
}

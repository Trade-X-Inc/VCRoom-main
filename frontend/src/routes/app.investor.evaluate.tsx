import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ③ Evaluate — rooms, diligence, analysis. All three are real standalone
// routes — this page links out to them.

export const Route = createFileRoute("/app/investor/evaluate")({
  component: EvaluatePage,
});

function SectionLinkRow({
  to,
  label,
  summary,
}: {
  to: string;
  label: string;
  summary?: string;
}) {
  return (
    <Link
      to={to as any}
      className="flex items-center justify-between gap-4 py-4 border-b border-border/60 last:border-b-0 hover:bg-accent/40 -mx-2 px-2 transition-colors"
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="flex items-center gap-3 shrink-0">
        {summary && <span className="text-xs text-muted-foreground">{summary}</span>}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
    </Link>
  );
}

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
          color: "#71717A",
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

      <div className="bg-card border border-border/60 rounded-none px-6">
        <SectionLinkRow
          to="/app/investor/deal-rooms"
          label="Deal rooms"
          summary={p ? `${p.activeRooms} active` : undefined}
        />
        <SectionLinkRow to="/app/investor/diligence" label="Due diligence" />
        <SectionLinkRow to="/app/investor/analysis" label="AI analysis" />
      </div>
    </div>
  );
}

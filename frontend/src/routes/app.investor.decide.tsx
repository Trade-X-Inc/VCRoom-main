import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ④ Decide — the decision board and the book. Decisions has a canonical
// route at /app/investor/decisions — summary card here. Portfolio is a
// plain standalone route now — link row.

export const Route = createFileRoute("/app/investor/decide")({
  component: DecidePage,
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
          color: "#71717A",
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

      <Link
        to={"/app/investor/decisions" as any}
        className="block bg-card border border-border/60 rounded-none p-6 mb-6 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Decisions</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {p?.pendingDecisions ? `${p.pendingDecisions} pending` : "None pending"}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand">
            Open board <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      <div className="bg-card border border-border/60 rounded-none px-6">
        <SectionLinkRow
          to="/app/investor/portfolio"
          label="Portfolio"
          summary={p ? `${p.portfolioCount} invested` : undefined}
        />
      </div>
    </div>
  );
}

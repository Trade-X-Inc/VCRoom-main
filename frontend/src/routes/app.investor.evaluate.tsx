import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/system";
import { useDealFlowProgress } from "@/hooks/useDealFlowProgress";

// ③ Evaluate — rooms, diligence, analysis. All three are real standalone
// routes — this page links out to them.

export const Route = createFileRoute("/app/investor/evaluate")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/deal-rooms" as any, replace: true });
  },
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
    <PageFrame
      breadcrumb={[{ label: "Deal flow" }, { label: "Evaluate" }]}
      title="Evaluate"
    >
      <div className="bg-card border border-border/60 rounded-none px-6">
        <SectionLinkRow
          to="/app/investor/deal-rooms"
          label="Deal rooms"
          summary={p ? `${p.activeRooms} active` : undefined}
        />
        <SectionLinkRow to="/app/investor/diligence" label="Due diligence" />
        <SectionLinkRow to="/app/investor/analysis" label="AI analysis" />
      </div>
    </PageFrame>
  );
}

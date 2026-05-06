import { createFileRoute } from "@tanstack/react-router";
import { PieChart } from "lucide-react";

export const Route = createFileRoute("/app/investor/portfolio")({
  component: PortfolioPage,
});

function PortfolioPage() {
  const companies: any[] = [];
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <div className="text-sm text-muted-foreground">Track your investments</div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[["Total invested", "$0"], ["Companies", "0"], ["Avg ownership", "—"], ["Best performer", "—"]].map(([l, v]) => (
          <div key={l}>
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {companies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <PieChart className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No portfolio companies yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">Companies appear here after you mark a deal as Invested in the Decisions board.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

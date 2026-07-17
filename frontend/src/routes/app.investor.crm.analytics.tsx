import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — CRM › CRM Analytics (investor). Minimal page: pipeline conversion
// counts over the investor's own watchlist, distinct from
// /app/investor/analytics (R5's profile/deal-room analytics).
export const Route = createFileRoute("/app/investor/crm/analytics")({
  component: InvestorCrmAnalyticsPage,
});

const PIPELINE_STATUSES = ["Sourcing", "Reviewing", "Diligence", "Watching", "Invested"] as const;

function InvestorCrmAnalyticsPage() {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["investor-crm-analytics-watchlist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("status, source, stage")
        .eq("investor_id", user!.id);
      return data ?? [];
    },
  });

  const counts = PIPELINE_STATUSES.map((status) => ({
    status,
    count: entries.filter((e) => e.status === status).length,
  }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const passed = entries.filter((e) => e.status === "Passed").length;

  const bySource = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      const key = e.source || "Unspecified";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "CRM" }, { label: "CRM Analytics" }]}
      title="CRM Analytics"
      description="Conversion through your sourcing pipeline."
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : entries.length === 0 ? (
        <EmptyState kind="empty" title="No watchlist entries yet" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-none border border-border/60 bg-card p-5">
            <div className="text-sm font-semibold mb-4">Pipeline funnel</div>
            <div className="space-y-3">
              {counts.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-3 text-xs">
                  <span className="w-28 shrink-0 text-muted-foreground truncate">{status}</span>
                  <div className="flex-1 h-2 rounded-none bg-accent overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${(count / maxCount) * 100}%`, background: "#7C3AED" }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              {passed} passed · {entries.length} total tracked
            </div>
          </div>

          <div className="rounded-none border border-border/60 bg-card p-5">
            <div className="text-sm font-semibold mb-4">By source</div>
            {bySource.length === 0 ? (
              <div className="text-sm text-muted-foreground">No source data yet.</div>
            ) : (
              <div className="space-y-3">
                {bySource.map(([source, count]) => (
                  <div key={source} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 text-muted-foreground truncate">{source}</span>
                    <div className="flex-1 h-2 rounded-none bg-accent overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${(count / entries.length) * 100}%`, background: "#7C3AED" }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageFrame>
  );
}

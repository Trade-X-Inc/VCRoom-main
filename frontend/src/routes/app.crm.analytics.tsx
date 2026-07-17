import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — CRM › CRM Analytics. Minimal page: pipeline conversion counts over
// the founder's own vc_leads, distinct from /app/analytics (profile views).
export const Route = createFileRoute("/app/crm/analytics")({
  component: CrmAnalyticsPage,
});

const PIPELINE_STEPS = [
  "New", "Shortlisted", "Contacted", "Replied", "Meeting Booked", "Interested", "Deal Room Created",
] as const;

function CrmAnalyticsPage() {
  const { user } = useAuth();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-analytics-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vc_leads")
        .select("status, source, created_at")
        .eq("founder_id", user!.id);
      return data ?? [];
    },
  });

  const counts = PIPELINE_STEPS.map((step) => ({
    step,
    count: leads.filter((l) => l.status === step).length,
  }));
  const maxCount = Math.max(1, ...counts.map((c) => c.count));
  const rejected = leads.filter((l) => l.status === "Rejected").length;

  const bySource = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const key = l.source || "Unspecified";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <PageFrame
      breadcrumb={[{ label: "CRM" }, { label: "CRM Analytics" }]}
      title="CRM Analytics"
      description="Conversion through your investor pipeline."
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : leads.length === 0 ? (
        <EmptyState kind="empty" title="No connections yet" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-none border border-border/60 bg-card p-5">
            <div className="text-sm font-semibold mb-4">Pipeline funnel</div>
            <div className="space-y-3">
              {counts.map(({ step, count }) => (
                <div key={step} className="flex items-center gap-3 text-xs">
                  <span className="w-32 shrink-0 text-muted-foreground truncate">{step}</span>
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
              {rejected} rejected · {leads.length} total tracked
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
                    <span className="w-32 shrink-0 text-muted-foreground truncate">{source}</span>
                    <div className="flex-1 h-2 rounded-none bg-accent overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${(count / leads.length) * 100}%`, background: "#7C3AED" }}
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

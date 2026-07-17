import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c), R10 step 11 — CRM › CRM Analytics (investor). Pipeline conversion
// over the investor's own watchlist, distinct from /app/investor/analytics
// (R5's profile/deal-room analytics). Diversified beyond bar-only: funnel
// for pipeline stages, donut for source mix, line for entries added over
// time — single brand accent at varying opacity, no rainbow charts.
export const Route = createFileRoute("/app/investor/crm/analytics")({
  component: InvestorCrmAnalyticsPage,
});

const PIPELINE_STATUSES = ["Sourcing", "Reviewing", "Diligence", "Watching", "Invested"] as const;
const BRAND_SHADES = ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#EDE9FE", "#F5F3FF"];

function InvestorCrmAnalyticsPage() {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["investor-crm-analytics-watchlist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("status, source, stage, created_at")
        .eq("investor_id", user!.id);
      return data ?? [];
    },
  });

  const funnelData = PIPELINE_STATUSES.map((status, i) => ({
    name: status,
    value: entries.filter((e) => e.status === status).length,
    fill: BRAND_SHADES[i],
  })).filter((d) => d.value > 0);
  const passed = entries.filter((e) => e.status === "Passed").length;

  const bySource = Object.entries(
    entries.reduce<Record<string, number>>((acc, e) => {
      const key = e.source || "Unspecified";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const sourcePieData = bySource.map(([name, value], i) => ({ name, value, fill: BRAND_SHADES[i % BRAND_SHADES.length] }));

  // Watchlist entries added, weekly buckets over the last 12 weeks. Each
  // bucket is the 7-day window ending at its labeled date.
  const weeklySeries = (() => {
    const weeks: { week: string; count: number }[] = [];
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      const bucketEnd = now - i * oneWeekMs;
      const bucketStart = bucketEnd - oneWeekMs;
      const label = new Date(bucketEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = entries.filter((e: any) => {
        if (!e.created_at) return false;
        const created = new Date(e.created_at).getTime();
        return created > bucketStart && created <= bucketEnd;
      }).length;
      weeks.push({ week: label, count });
    }
    return weeks;
  })();

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
          <div className="rounded-none border border-border bg-white p-5">
            <div className="text-sm font-semibold mb-1">Pipeline funnel</div>
            <div className="text-xs mb-2" style={{ color: "#71717A" }}>{passed} passed · {entries.length} total tracked</div>
            {funnelData.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "#71717A" }}>No active pipeline yet.</p>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart margin={{ top: 8, right: 110, bottom: 8, left: 8 }}>
                    <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E4E4E7", borderRadius: 0 }} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                      <LabelList position="right" dataKey="name" fill="#0A0A0B" fontSize={12} width={100} />
                      {funnelData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-none border border-border bg-white p-5">
            <div className="text-sm font-semibold mb-4">By source</div>
            {sourcePieData.length === 0 ? (
              <p className="text-sm" style={{ color: "#71717A" }}>No source data yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="shrink-0">
                  <PieChart width={160} height={160}>
                    <Pie data={sourcePieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} strokeWidth={2} stroke="#FFFFFF" isAnimationActive={false}>
                      {sourcePieData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E4E4E7", borderRadius: 0 }} />
                  </PieChart>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {sourcePieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ background: d.fill }} />
                      <span className="truncate flex-1" style={{ color: "#52525B" }}>{d.name}</span>
                      <span className="tabular-nums font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-none border border-border bg-white p-5 lg:col-span-2">
            <div className="text-sm font-semibold mb-4">Watchlist entries added (12 weeks)</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklySeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#E4E4E7" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#71717A" }} axisLine={{ stroke: "#E4E4E7" }} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E4E4E7", borderRadius: 0 }} />
                  <Line type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

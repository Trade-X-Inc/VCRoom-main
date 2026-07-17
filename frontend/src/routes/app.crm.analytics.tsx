import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c), R10 step 11 — CRM › CRM Analytics. Pipeline conversion over the
// founder's own vc_leads, distinct from /app/analytics (profile views).
// Diversified beyond bar-only per the Constitution: funnel for pipeline
// stages, donut for source mix, line for leads added over time — single
// brand accent at varying opacity, no rainbow charts.
export const Route = createFileRoute("/app/crm/analytics")({
  component: CrmAnalyticsPage,
});

const PIPELINE_STEPS = [
  "New", "Shortlisted", "Contacted", "Replied", "Meeting Booked", "Interested", "Deal Room Created",
] as const;

// Single brand hue at decreasing opacity — reads as one accent color, not a
// rainbow, while still visually distinguishing funnel stages / pie slices.
const BRAND_SHADES = ["#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#EDE9FE", "#F5F3FF"];

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

  const funnelData = PIPELINE_STEPS.map((step, i) => ({
    name: step,
    value: leads.filter((l) => l.status === step).length,
    fill: BRAND_SHADES[i],
  })).filter((d) => d.value > 0);
  const rejected = leads.filter((l) => l.status === "Rejected").length;

  const bySource = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      const key = l.source || "Unspecified";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const sourcePieData = bySource.map(([name, value], i) => ({ name, value, fill: BRAND_SHADES[i % BRAND_SHADES.length] }));

  // Leads added, weekly buckets over the last 12 weeks
  const weeklySeries = (() => {
    const weeks: { week: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = leads.filter((l) => {
        const created = new Date(l.created_at);
        const diffWeeks = Math.floor((start.getTime() - created.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return diffWeeks === 0 && created <= start;
      }).length;
      weeks.push({ week: label, count });
    }
    return weeks;
  })();

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
          <div className="rounded-none border border-border bg-white p-5">
            <div className="text-sm font-semibold mb-1">Pipeline funnel</div>
            <div className="text-xs mb-2" style={{ color: "#71717A" }}>{rejected} rejected · {leads.length} total tracked</div>
            {funnelData.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "#71717A" }}>No active pipeline yet.</p>
            ) : (
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E4E4E7", borderRadius: 0 }} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive={false}>
                      <LabelList position="right" dataKey="name" fill="#0A0A0B" fontSize={12} />
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
                <div style={{ width: 160, height: 160 }} className="shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sourcePieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} strokeWidth={2} stroke="#FFFFFF">
                        {sourcePieData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #E4E4E7", borderRadius: 0 }} />
                    </PieChart>
                  </ResponsiveContainer>
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
            <div className="text-sm font-semibold mb-4">Leads added (12 weeks)</div>
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

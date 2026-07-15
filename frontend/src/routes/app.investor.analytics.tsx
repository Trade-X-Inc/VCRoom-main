import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";
import { color, font, radius, space, table as tableTokens } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/investor/analytics")({
  component: InvestorAnalytics,
});

// The only pass-reason categories the UI ever writes (see PASS_CATEGORIES in
// app.investor.decisions.tsx) — pass_reason_detail is free text the investor
// typed and must never render here; only this fixed short-category set does,
// same allowlist discipline as the activity-string fix elsewhere in R3/R5.
const PASS_CATEGORIES = ["Valuation", "Traction", "Team", "Market", "Thesis fit", "Timing"] as const;

const FUNNEL_STAGES = ["Sourcing", "Reviewing", "Diligence", "Invested", "Passed"] as const;

function ChartCard({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: string }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, padding: 20 }}>
      <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink, marginBottom: 16 }}>{title}</div>
      {empty ? (
        <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: color.inkTertiary, textAlign: "center", padding: "0 24px" }}>{empty}</div>
      ) : (
        <div style={{ height: 260 }}>{children}</div>
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ textAlign: right ? "right" : "left", fontSize: 12, fontWeight: 500, color: color.inkTertiary, padding: "0 20px", height: 36, borderBottom: `1px solid ${color.border}` }}>
      {children}
    </th>
  );
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td style={{ textAlign: right ? "right" : "left", fontSize: 13, color: color.ink, padding: "0 20px", height: tableTokens.rowHeight, borderBottom: tableTokens.rowBorder, fontVariantNumeric: right ? "tabular-nums" : undefined }}>
      {children}
    </td>
  );
}

function StatCard({ label, value, sub, empty }: { label: string; value: string | number; sub?: string; empty?: string }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, padding: 20 }}>
      <div style={{ fontFamily: font.body, fontSize: 12, color: color.inkTertiary }}>{label}</div>
      {empty ? (
        <div style={{ marginTop: 10, fontSize: 12, color: color.inkTertiary, lineHeight: 1.5 }}>{empty}</div>
      ) : (
        <>
          <div style={{ marginTop: 6, fontFamily: font.display, fontSize: 26, fontWeight: 700, color: color.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          {sub && <div style={{ marginTop: 2, fontSize: 12, color: color.inkTertiary }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

function InvestorAnalytics() {
  const { user } = useAuth();

  const { data: watchlist = [] } = useQuery({
    queryKey: ["ia-watchlist", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("id, status, source, pass_reason_category, created_at, stage_entered_at, updated_at")
        .eq("investor_id", user!.id);
      return data ?? [];
    },
  });

  // ── Conversion funnel ──
  const funnelCounts: Record<string, number> = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0]));
  for (const w of watchlist as any[]) {
    const status = w.status as string;
    if (status === "Sourcing" || status === "Watching") funnelCounts.Sourcing++;
    else if (status === "Reviewing") funnelCounts.Reviewing++;
    else if (status === "Diligence") funnelCounts.Diligence++;
    else if (status === "Invested") funnelCounts.Invested++;
    else if (status === "Passed") funnelCounts.Passed++;
  }
  const funnelSeries = FUNNEL_STAGES.map((s) => ({ stage: s, count: funnelCounts[s] }));
  const totalTracked = (watchlist as any[]).length;

  // ── Pass-reason breakdown (allowlist categories only) ──
  const passReasonCounts: Record<string, number> = {};
  for (const w of watchlist as any[]) {
    if (w.status !== "Passed") continue;
    const cat = PASS_CATEGORIES.includes(w.pass_reason_category) ? w.pass_reason_category : null;
    if (!cat) continue;
    passReasonCounts[cat] = (passReasonCounts[cat] ?? 0) + 1;
  }
  const passReasonRows = Object.entries(passReasonCounts).sort((a, b) => b[1] - a[1]);
  const passedCount = (watchlist as any[]).filter((w) => w.status === "Passed").length;

  // ── Avg days in stage (created_at -> stage_entered_at for entries that
  //    have moved past Sourcing at least once) ──
  const daysInStageSamples = (watchlist as any[])
    .filter((w) => w.stage_entered_at && w.created_at && w.stage_entered_at !== w.created_at)
    .map((w) => (new Date(w.stage_entered_at).getTime() - new Date(w.created_at).getTime()) / 86400000);
  const avgDaysInStage = daysInStageSamples.length > 0
    ? Math.round(daysInStageSamples.reduce((a, b) => a + b, 0) / daysInStageSamples.length)
    : null;

  // ── Source performance ──
  const sourceGroups: Record<string, { total: number; invested: number }> = {};
  for (const w of watchlist as any[]) {
    const source = w.source || "Unspecified";
    if (!sourceGroups[source]) sourceGroups[source] = { total: 0, invested: 0 };
    sourceGroups[source].total++;
    if (w.status === "Invested") sourceGroups[source].invested++;
  }
  const sourceRows = Object.entries(sourceGroups)
    .map(([source, g]) => ({ source, total: g.total, invested: g.invested, rate: g.total > 0 ? Math.round((g.invested / g.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Analytics" }]}
      title="Analytics"
      description="Pipeline conversion, pass reasons, and sourcing performance."
      actions={
        <Link
          to="/app/investor/overview"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, background: color.white, color: color.ink, border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "0 16px", fontSize: 13, fontWeight: 500, fontFamily: font.body, textDecoration: "none" }}
        >
          Overview <ArrowUpRight style={{ width: 14, height: 14 }} />
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.block }}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <StatCard label="Tracked companies" value={totalTracked} sub="in your pipeline" />
          <StatCard
            label="Avg days in stage"
            value={avgDaysInStage !== null ? avgDaysInStage : "—"}
            sub="from source to stage change"
            empty={avgDaysInStage === null ? "No data yet — appears once entries move past Sourcing" : undefined}
          />
          <StatCard label="Passed" value={passedCount} sub="total" />
        </div>

        <ChartCard title="Conversion funnel" empty={totalTracked === 0 ? "No data yet — add companies to your watchlist to see the funnel" : undefined}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={color.border} vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={{ stroke: color.border }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${color.border}`, borderRadius: 0 }} />
              <Bar dataKey="count" fill="#7C3AED" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Pass-reason breakdown</div>
            </div>
            {passReasonRows.length === 0 ? (
              <EmptyState kind="empty" title="No pass reasons recorded yet" />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Category</Th>
                    <Th right>Count</Th>
                  </tr>
                </thead>
                <tbody>
                  {passReasonRows.map(([cat, count]) => (
                    <tr key={cat}>
                      <Td>{cat}</Td>
                      <Td right>{count}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Source performance</div>
            </div>
            {sourceRows.length === 0 ? (
              <EmptyState kind="empty" title="No data yet — add a source when you track a company" />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Source</Th>
                    <Th right>Tracked</Th>
                    <Th right>Invested</Th>
                    <Th right>Rate</Th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map((s) => (
                    <tr key={s.source}>
                      <Td>{s.source}</Td>
                      <Td right>{s.total}</Td>
                      <Td right>{s.invested}</Td>
                      <Td right>{s.rate}%</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

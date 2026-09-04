import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LazyChart } from "@/components/shared/LazyChart";
import { ArrowUpRight, Download, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { LcsPageHeader, LcsEmptyState } from "@/components/lcs";
import { downloadCsv } from "@/lib/csv-export";

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
    <div style={{ border: `1px solid var(--lcs-line)`, borderRadius: 0, background: "var(--lcs-white)", padding: 20 }}>
      <div style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 14, fontWeight: 700, color: "var(--lcs-ink)", marginBottom: 16 }}>{title}</div>
      {empty ? (
        <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--lcs-ink-muted)", textAlign: "center", padding: "0 24px" }}>{empty}</div>
      ) : (
        <div style={{ height: 260 }}>{children}</div>
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ textAlign: right ? "right" : "left", fontSize: 12, fontWeight: 500, color: "var(--lcs-ink-muted)", padding: "0 20px", height: 36, borderBottom: `1px solid var(--lcs-line)` }}>
      {children}
    </th>
  );
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td style={{ textAlign: right ? "right" : "left", fontSize: 13, color: "var(--lcs-ink)", padding: "0 20px", height: 44, borderBottom: "1px solid var(--lcs-line)", fontVariantNumeric: right ? "tabular-nums" : undefined }}>
      {children}
    </td>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 10px",
        background: "var(--lcs-white)", color: "var(--lcs-ink-muted)", border: `1px solid var(--lcs-line)`,
        borderRadius: "var(--radius-lcs-control)", fontSize: 12, fontWeight: 500, cursor: "pointer",
      }}
    >
      <Download style={{ width: 12, height: 12 }} /> CSV
    </button>
  );
}

function TableSection({ title, onExport, children }: { title: string; onExport?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid var(--lcs-line)`, borderRadius: 0, background: "var(--lcs-white)", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid var(--lcs-line)`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 14, fontWeight: 700, color: "var(--lcs-ink)" }}>{title}</div>
        {onExport && <ExportButton onClick={onExport} />}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, empty }: { label: string; value: string | number; sub?: string; empty?: string }) {
  return (
    <div style={{ border: `1px solid var(--lcs-line)`, borderRadius: 0, background: "var(--lcs-white)", padding: 20 }}>
      <div style={{ fontFamily: "var(--font-lcs-ui)", fontSize: 12, color: "var(--lcs-ink-muted)" }}>{label}</div>
      {empty ? (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--lcs-ink-muted)", lineHeight: 1.5 }}>{empty}</div>
      ) : (
        <>
          <div style={{ marginTop: 6, fontFamily: "var(--font-lcs-ui)", fontSize: 26, fontWeight: 700, color: "var(--lcs-ink)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
          {sub && <div style={{ marginTop: 2, fontSize: 12, color: "var(--lcs-ink-muted)" }}>{sub}</div>}
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
  //    have moved forward at least once). Only counts samples where
  //    stage_entered_at is actually after created_at — some seed/legacy
  //    rows have an earlier stage_entered_at than created_at (backfilled
  //    data), which would otherwise show as a nonsensical negative average. ──
  const daysInStageSamples = (watchlist as any[])
    .filter((w) => w.stage_entered_at && w.created_at)
    .map((w) => (new Date(w.stage_entered_at).getTime() - new Date(w.created_at).getTime()) / 86400000)
    .filter((days) => days > 0);
  const avgDaysInStage = daysInStageSamples.length > 0
    ? Math.round(daysInStageSamples.reduce((a, b) => a + b, 0) / daysInStageSamples.length)
    : null;

  // Per-stage breakdown of the same days-in-stage samples, grouped by
  // current status — one average number hides whether it's Sourcing or
  // Diligence that's actually slow.
  const daysInStageByStage: Record<string, number[]> = {};
  for (const w of watchlist as any[]) {
    if (!w.stage_entered_at || !w.created_at) continue;
    const days = (new Date(w.stage_entered_at).getTime() - new Date(w.created_at).getTime()) / 86400000;
    if (days <= 0) continue;
    const key = w.status || "Unspecified";
    (daysInStageByStage[key] ??= []).push(days);
  }
  const daysInStageRows = Object.entries(daysInStageByStage)
    .map(([stage, samples]) => ({
      stage,
      count: samples.length,
      avgDays: Math.round(samples.reduce((a, b) => a + b, 0) / samples.length),
    }))
    .sort((a, b) => b.avgDays - a.avgDays);

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
    <div className="p-6 lg:p-8 max-w-[1360px] mx-auto">
      <div
        className="flex items-center gap-1.5 text-[12px] font-medium mb-3"
        style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
      >
        <span>Investor</span>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Analytics</span>
      </div>
      <LcsPageHeader
        title="Analytics"
        description="Pipeline conversion, pass reasons, and sourcing performance."
        action={
          <Link
            to="/app/investor/overview"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, background: "var(--lcs-white)", color: "var(--lcs-ink)", border: `1px solid var(--lcs-line)`, borderRadius: "var(--radius-lcs-control)", padding: "0 16px", fontSize: 13, fontWeight: 500, fontFamily: "var(--font-lcs-ui)", textDecoration: "none" }}
          >
            Overview <ArrowUpRight style={{ width: 14, height: 14 }} />
          </Link>
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

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
          <LazyChart render={(R) => (
          <R.ResponsiveContainer width="100%" height="100%">
            <R.BarChart data={funnelSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <R.CartesianGrid stroke={"var(--lcs-line)"} vertical={false} />
              <R.XAxis dataKey="stage" tick={{ fontSize: 11, fill: "var(--lcs-ink-muted)" }} axisLine={{ stroke: "var(--lcs-line)" }} tickLine={false} />
              <R.YAxis tick={{ fontSize: 11, fill: "var(--lcs-ink-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <R.Tooltip contentStyle={{ fontSize: 12, border: `1px solid var(--lcs-line)`, borderRadius: 0 }} />
              <R.Bar dataKey="count" fill="#7C3AED" />
            </R.BarChart>
          </R.ResponsiveContainer>
          )} />
        </ChartCard>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <TableSection
            title="Pass-reason breakdown"
            onExport={passReasonRows.length > 0 ? () => downloadCsv("pass-reason-breakdown", ["Category", "Count"], passReasonRows.map(([cat, count]) => [cat, count])) : undefined}
          >
            {passReasonRows.length === 0 ? (
              <LcsEmptyState title="No pass reasons recorded yet" text="Reasons appear here once you record a pass." />
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
          </TableSection>

          <TableSection
            title="Source performance"
            onExport={sourceRows.length > 0 ? () => downloadCsv("source-performance", ["Source", "Tracked", "Invested", "Rate"], sourceRows.map((s) => [s.source, s.total, s.invested, `${s.rate}%`])) : undefined}
          >
            {sourceRows.length === 0 ? (
              <LcsEmptyState title="No data yet" text="Add a source when you track a company." />
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
          </TableSection>
        </div>

        <TableSection
          title="Days in stage, by stage"
          onExport={daysInStageRows.length > 0 ? () => downloadCsv("days-in-stage", ["Stage", "Count", "Avg days"], daysInStageRows.map((r) => [r.stage, r.count, r.avgDays])) : undefined}
        >
          {daysInStageRows.length === 0 ? (
            <LcsEmptyState title="No data yet" text="Conversion appears once entries move past Sourcing." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Stage</Th>
                  <Th right>Count</Th>
                  <Th right>Avg days</Th>
                </tr>
              </thead>
              <tbody>
                {daysInStageRows.map((r) => (
                  <tr key={r.stage}>
                    <Td>{r.stage}</Td>
                    <Td right>{r.count}</Td>
                    <Td right>{r.avgDays}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableSection>
      </div>
    </div>
  );
}

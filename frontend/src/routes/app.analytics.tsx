import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { LazyChart } from "@/components/shared/LazyChart";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";
import { color, font, radius, space, table as tableTokens } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/analytics")({
  component: FounderAnalytics,
});

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

function FounderAnalytics() {
  const { user } = useAuth();

  const { data: startup } = useQuery({
    queryKey: ["analytics-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id, company_name").eq("founder_id", user!.id).limit(1);
      return data?.[0] ?? null;
    },
  });
  const startupId: string | undefined = startup?.id;

  const { data: allViews = [] } = useQuery({
    queryKey: ["analytics-all-views", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("profile_views")
        .select("created_at, source")
        .eq("startup_id", startupId!)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: dealRooms = [] } = useQuery({
    queryKey: ["analytics-deal-rooms", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, investor_name, investor_company, updated_at")
        .eq("startup_id", startupId!)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const roomIds = dealRooms.map((r: any) => r.id);

  const { data: docViews = [] } = useQuery({
    queryKey: ["analytics-doc-views", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_views")
        .select("deal_room_id, document_id, founder_document_id, duration_seconds, created_at")
        .in("deal_room_id", roomIds);
      return data ?? [];
    },
  });

  // Founder's own uploads only — a shared room can also contain documents
  // the investor side uploaded (uploaded_by_role = "investor"), and this
  // page must never show that counterparty content's filename, even though
  // the founder is a legitimate member of the room (CLAUDE.md §9.6).
  const { data: documents = [] } = useQuery({
    queryKey: ["analytics-documents", roomIds.join(","), user?.id],
    enabled: roomIds.length > 0 && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, file_name, deal_room_id")
        .in("deal_room_id", roomIds)
        .eq("uploader_id", user!.id);
      return data ?? [];
    },
  });

  // ── Views timeline (30 days, daily buckets) ──
  const viewsSeries = (() => {
    const days: { date: string; views: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = (allViews as any[]).filter((v) => new Date(v.created_at).toDateString() === d.toDateString()).length;
      days.push({ date: key, views: count });
    }
    return days;
  })();
  const totalViews = (allViews as any[]).length;

  // ── Per-room engagement table ──
  const roomRows = dealRooms.map((r: any) => {
    const views = (docViews as any[]).filter((v) => v.deal_room_id === r.id);
    const totalSeconds = views.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0);
    const uniqueDocs = new Set(views.map((v) => v.document_id ?? v.founder_document_id).filter(Boolean));
    return {
      id: r.id,
      name: r.investor_company || r.investor_name || "Deal room",
      views: views.length,
      timeSpent: totalSeconds > 0 ? `${Math.round(totalSeconds / 60)}m` : "—",
      docsOpened: uniqueDocs.size,
      lastVisit: views.length > 0
        ? formatDistanceToNow(new Date(Math.max(...views.map((v) => new Date(v.created_at).getTime()))), { addSuffix: true })
        : "—",
    };
  });

  // ── Document performance ──
  const docRows = (documents as any[]).map((d) => {
    const views = (docViews as any[]).filter((v) => v.document_id === d.id);
    const totalSeconds = views.reduce((sum, v) => sum + (v.duration_seconds ?? 0), 0);
    return {
      id: d.id,
      name: d.file_name ?? "Document",
      views: views.length,
      avgTime: views.length > 0 ? `${Math.round(totalSeconds / views.length)}s` : "—",
    };
  }).filter((d) => d.views > 0).sort((a, b) => b.views - a.views).slice(0, 10);

  // ── Source breakdown ──
  const sourceCounts = (allViews as any[]).reduce((acc: Record<string, number>, v) => {
    const s = v.source || "Direct link";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  const sourceRows = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  return (
    <PageFrame
      breadcrumb={[{ label: "Analytics" }]}
      title="Analytics"
      description="How investors are engaging with your profile and deal rooms."
      actions={
        <Link
          to="/app/overview"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, background: color.white, color: color.ink, border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "0 16px", fontSize: 13, fontWeight: 500, fontFamily: font.body, textDecoration: "none" }}
        >
          Overview <ArrowUpRight style={{ width: 14, height: 14 }} />
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.block }}>

        <ChartCard title="Profile views (30 days)" empty={totalViews === 0 ? "No data yet — publish your profile to start tracking views" : undefined}>
          <LazyChart render={(R) => (
          <R.ResponsiveContainer width="100%" height="100%">
            <R.AreaChart data={viewsSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <R.CartesianGrid stroke={color.border} vertical={false} />
              <R.XAxis dataKey="date" tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={{ stroke: color.border }} tickLine={false} interval={4} />
              <R.YAxis tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={false} tickLine={false} allowDecimals={false} />
              <R.Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${color.border}`, borderRadius: 0 }} />
              <R.Area type="monotone" dataKey="views" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.08} strokeWidth={2} />
            </R.AreaChart>
          </R.ResponsiveContainer>
          )} />
        </ChartCard>

        <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
            <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Engagement by deal room</div>
          </div>
          {roomRows.length === 0 ? (
            <EmptyState kind="empty" title="No deal rooms yet" />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Deal room</Th>
                  <Th right>Views</Th>
                  <Th right>Time spent</Th>
                  <Th right>Docs opened</Th>
                  <Th right>Last visit</Th>
                </tr>
              </thead>
              <tbody>
                {roomRows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link to="/app/deal-rooms/$id" params={{ id: r.id }} style={{ color: "#7C3AED", textDecoration: "none" }}>{r.name}</Link>
                    </Td>
                    <Td right>{r.views}</Td>
                    <Td right>{r.timeSpent}</Td>
                    <Td right>{r.docsOpened}</Td>
                    <Td right>{r.lastVisit}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Document performance</div>
            </div>
            {docRows.length === 0 ? (
              <EmptyState kind="empty" title="No document views yet" />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Document</Th>
                    <Th right>Views</Th>
                    <Th right>Avg time</Th>
                  </tr>
                </thead>
                <tbody>
                  {docRows.map((d) => (
                    <tr key={d.id}>
                      <Td>{d.name}</Td>
                      <Td right>{d.views}</Td>
                      <Td right>{d.avgTime}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Source breakdown</div>
            </div>
            {sourceRows.length === 0 ? (
              <EmptyState kind="empty" title="No data yet — source tracking appears once profile views come in" />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Source</Th>
                    <Th right>Views</Th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map(([source, count]) => (
                    <tr key={source}>
                      <Td>{source}</Td>
                      <Td right>{count}</Td>
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

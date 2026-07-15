import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { ChevronDown, ChevronUp, X, CheckCircle2, ArrowRight, ArrowUpRight, FileInput, Clock3 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { PageFrame, EmptyState } from "@/components/system";
import { color, font, radius, space } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/investor/overview")({
  component: InvestorOverview,
});

const STAGES = ["Sourced", "Reviewing", "Diligence", "Term Sheet", "Closed"] as const;

const DB_STATUS_TO_STAGE: Record<string, string> = {
  under_review: "Reviewing",
  info_requested: "Diligence",
  partner_review: "Diligence",
  term_sheet: "Term Sheet",
  rejected: "Closed",
  exited: "Closed",
};

// Same allowlist pattern as the founder overview — activities.action is a
// short category string for most writers but at least one write path
// stores a free-text sentence; this page renders outside /deal-rooms/:id/*
// so only pre-approved short forms are allowed through (CLAUDE.md §9.6).
const SAFE_ACTIVITY_ACTIONS = new Set([
  "Uploaded a document",
  "Added a note",
  "Signed the NDA",
  "Sent a term sheet",
  "Requested a document",
  "Investor passed on deal",
  "Granted section access",
  "Revoked section access",
  "Asked a structured Q&A question",
  "Answered a structured Q&A question",
  "Decision: Under Review",
  "Decision: Request More Info",
  "Decision: Move to Partner Review",
  "Decision: Term Sheet Ready",
  "Decision: Not Proceeding",
  "Decision: Exit",
]);
function safeActivityLabel(action: string): string {
  return SAFE_ACTIVITY_ACTIONS.has(action) ? action : "Room activity";
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

function OnboardingChecklist({ profile, watchlistCount, roomIds }: { profile: any; watchlistCount: number; roomIds: string[] }) {
  const { progress, markStep } = useOnboardingProgress();
  const [collapsed, setCollapsed] = useState(false);
  const dismissed = progress?.steps?.checklist_dismissed === true;

  const steps = [
    { id: "thesis", label: "Set your investment thesis", done: !!(profile?.thesis_statement || profile?.thesis), href: "/app/investor/profile" },
    { id: "watchlist", label: "Add a company to watchlist", done: watchlistCount > 0, href: "/app/investor/startups" },
    { id: "intake", label: "Run a deal intake", done: false, href: "/app/investor/intake" },
    { id: "dealroom", label: "Join a deal room", done: roomIds.length > 0, href: "/app/investor/deal-flow" },
  ];
  const completed = steps.filter((s) => s.done).length;
  if (dismissed || completed === steps.length) return null;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: collapsed ? "none" : `1px solid ${color.border}` }}>
        <button onClick={() => setCollapsed((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
          {collapsed ? <ChevronDown style={{ width: 14, height: 14, color: color.inkTertiary }} /> : <ChevronUp style={{ width: 14, height: 14, color: color.inkTertiary }} />}
          <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Get started</span>
          <span style={{ fontSize: 12, color: color.inkTertiary }}>{completed} of {steps.length} complete</span>
        </button>
        <button
          onClick={() => markStep("checklist_dismissed", true)}
          style={{ display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: radius.control, background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}
          title="Skip"
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
      {!collapsed && (
        <div style={{ padding: 20 }}>
          <div style={{ height: 4, background: color.canvas, borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: 4, width: `${pct}%`, background: "#7C3AED" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {steps.map((s) => (
              <Link
                key={s.id}
                to={s.href as any}
                style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", border: `1px solid ${color.border}`, textDecoration: "none", opacity: s.done ? 0.6 : 1 }}
              >
                {s.done
                  ? <CheckCircle2 style={{ width: 14, height: 14, color: "#059669", marginTop: 1, flexShrink: 0 }} />
                  : <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${color.border}`, marginTop: 1, flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: s.done ? color.inkTertiary : color.ink, textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: string }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, padding: 20 }}>
      <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink, marginBottom: 16 }}>{title}</div>
      {empty ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: color.inkTertiary, textAlign: "center", padding: "0 24px" }}>{empty}</div>
      ) : (
        <div style={{ height: 220 }}>{children}</div>
      )}
    </div>
  );
}

function InvestorOverview() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["investor-profile-gate", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("investor_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profileLoading && user?.id && profile === null) {
      navigate({ to: "/app/investor/profile", search: {} });
    }
  }, [profile, profileLoading, user?.id, navigate]);

  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_members").select("deal_room_id").eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];

  const { data: roomsData = [] } = useQuery({
    queryKey: ["investor-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, created_at, updated_at, startup_id, investor_company, investor_name, workflow_stage, startups(company_name, sector, stage)")
        .in("id", roomIds);
      return data ?? [];
    },
  });

  const { data: decisionsData = [] } = useQuery({
    queryKey: ["investor-decisions", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("decisions").select("deal_room_id, status, created_at").in("deal_room_id", roomIds).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: watchlistCount = 0 } = useQuery({
    queryKey: ["investor-watchlist-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase.from("investor_watchlist").select("id", { count: "exact", head: true }).eq("investor_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: watchlistByStatus = [] } = useQuery({
    queryKey: ["investor-watchlist-by-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("investor_watchlist").select("status").eq("investor_id", user!.id);
      return data ?? [];
    },
  });

  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: newMatches = [] } = useQuery({
    queryKey: ["investor-thesis-matches-7d", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("thesis_alerts").select("id, alerted_at").eq("investor_id", user!.id).gte("alerted_at", sevenDaysAgo);
      return data ?? [];
    },
  });

  const { data: matchesOverTime = [] } = useQuery({
    queryKey: ["investor-thesis-matches-30d", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("thesis_alerts").select("alerted_at").eq("investor_id", user!.id).gte("alerted_at", thirtyDaysAgo).order("alerted_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: meetingsThisWeek = 0 } = useQuery({
    queryKey: ["investor-meetings-week", user?.id, roomIds.join(",")],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      const { count } = await supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .in("deal_room_id", roomIds)
        .gte("scheduled_at", startOfWeek.toISOString())
        .lte("scheduled_at", endOfWeek.toISOString());
      return count ?? 0;
    },
  });

  const { data: latestIntakeRun } = useQuery({
    queryKey: ["investor-latest-intake", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("intake_runs")
        .select("id, created_at, input_summary, total_items, extracted_count, failed_count")
        .eq("investor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["founder-activity", roomIds.join(","), user?.id],
    enabled: roomIds.length > 0 && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, action, deal_room_id, created_at, actor_id")
        .in("deal_room_id", roomIds)
        .neq("actor_id", user!.id)
        .gt("created_at", threeDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const latestStatus: Record<string, string | null> = {};
  for (const d of decisionsData) {
    if (!(d.deal_room_id in latestStatus)) latestStatus[d.deal_room_id] = d.status;
  }
  const pipelineCounts: Record<string, number> = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const room of roomsData) {
    const status = latestStatus[room.id] ?? null;
    const stage = DB_STATUS_TO_STAGE[status ?? ""] ?? "Sourced";
    if (stage in pipelineCounts) pipelineCounts[stage]++;
  }
  const pipelineSeries = STAGES.map((s) => ({ stage: s, count: pipelineCounts[s] }));

  const watchlistStaleCount = (() => {
    // "Stale deals" = watchlist entries not in Invested/Passed, unchanged
    // context beyond status counts — no per-row content rendered here.
    return (watchlistByStatus as any[]).filter((w) => w.status === "Reviewing" || w.status === "Diligence").length;
  })();

  const matchesSeries = (() => {
    const days: { date: string; matches: number }[] = [];
    for (let i = 29; i >= 0; i -= 5) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const bucketEnd = new Date(Date.now() - (i - 5) * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = (matchesOverTime as any[]).filter((m) => {
        const md = new Date(m.alerted_at);
        return md >= d && md < bucketEnd;
      }).length;
      days.push({ date: key, matches: count });
    }
    return days;
  })();

  const activityItems = (recentActivity as any[]).map((a) => {
    const room = roomsData.find((r: any) => r.id === a.deal_room_id);
    return {
      id: a.id,
      label: safeActivityLabel(a.action),
      sub: (room?.startups as any)?.company_name || (room as any)?.investor_company || "Deal room",
      time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }),
    };
  });

  const staleRooms = roomsData.filter((r: any) => {
    const status = latestStatus[r.id] ?? null;
    const isEarlyStage = !status || status === "under_review";
    return isEarlyStage && r.created_at < sevenDaysAgo;
  });

  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Overview" }]}
      title="Overview"
      description="Your pipeline at a glance — matches, meetings, and what needs a decision."
      actions={
        <Link
          to="/app/investor/deal-flow"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, background: "#7C3AED", color: "#fff", border: "none", borderRadius: radius.control, padding: "0 16px", fontSize: 13, fontWeight: 500, fontFamily: font.body, textDecoration: "none" }}
        >
          Deal flow <ArrowUpRight style={{ width: 14, height: 14 }} />
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.block }}>

        <OnboardingChecklist profile={profile} watchlistCount={watchlistCount} roomIds={roomIds} />

        {/* Row 1: stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <StatCard label="Active deal rooms" value={roomIds.length} sub={roomIds.length === 1 ? "room" : "rooms"} />
          <StatCard
            label="New thesis matches"
            value={newMatches.length}
            sub="last 7 days"
            empty={newMatches.length === 0 ? "No data yet — matches appear once your thesis is set" : undefined}
          />
          <StatCard label="Stale deals" value={watchlistStaleCount} sub="in review or diligence" />
          <StatCard label="Meetings this week" value={meetingsThisWeek} sub="scheduled" />
        </div>

        {/* Deal intake hero */}
        <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", placeItems: "center", height: 36, width: 36, background: "rgba(124,58,237,0.08)", color: "#7C3AED", flexShrink: 0 }}>
              <FileInput style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Run a deal intake</div>
              <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>
                {latestIntakeRun
                  ? `Last run ${formatDistanceToNow(new Date(latestIntakeRun.created_at), { addSuffix: true })} — ${latestIntakeRun.extracted_count} of ${latestIntakeRun.total_items} extracted`
                  : "Paste your own pipeline or inbox data — we extract thesis-matching candidates"}
              </div>
            </div>
          </div>
          <Link
            to="/app/investor/intake"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, background: "#7C3AED", color: "#fff", border: "none", borderRadius: radius.control, padding: "0 16px", fontSize: 13, fontWeight: 500, textDecoration: "none", flexShrink: 0 }}
          >
            Open intake <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>

        {/* Stale/attention row */}
        {staleRooms.length > 0 && (
          <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Needs a decision</div>
            </div>
            {staleRooms.map((r: any) => (
              <Link
                key={r.id}
                to="/app/deal-rooms/$id"
                params={{ id: r.id }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 44, borderBottom: `1px solid ${color.border}`, textDecoration: "none" }}
              >
                <Clock3 style={{ width: 14, height: 14, color: "#DC2626", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 13, color: color.ink }}>{(r.startups as any)?.company_name ?? "Deal"}</span>
                  <span style={{ fontSize: 12, color: color.inkTertiary }}>no decision update in 7+ days</span>
                </div>
                <ArrowRight style={{ width: 12, height: 12, color: color.inkTertiary, flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        )}

        {/* Row: graphs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ChartCard title="Pipeline funnel">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={color.border} vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={{ stroke: color.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${color.border}`, borderRadius: 0 }} />
                <Bar dataKey="count" fill="#7C3AED" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Matches over time" empty={(matchesOverTime as any[]).length === 0 ? "No data yet — matches appear once your thesis is set" : undefined}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matchesSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={color.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={{ stroke: color.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${color.border}`, borderRadius: 0 }} />
                <Line type="monotone" dataKey="matches" stroke="#7C3AED" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Right rail: activity */}
        <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
            <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Recent activity</div>
          </div>
          {activityItems.length === 0 ? (
            <EmptyState kind="empty" title="No recent activity" />
          ) : (
            <div>
              {activityItems.map((a) => (
                <div key={a.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${color.border}` }}>
                  <div style={{ fontSize: 13, color: color.ink }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>{a.sub} · {a.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageFrame>
  );
}

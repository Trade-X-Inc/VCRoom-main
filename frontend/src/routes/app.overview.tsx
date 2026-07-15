import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import {
  ChevronDown, ChevronUp, X, CheckCircle2, ArrowRight, ArrowUpRight,
  ShieldAlert, MessageSquareWarning, Clock3, FileWarning,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { PageFrame, EmptyState } from "@/components/system";
import { color, font, radius, space } from "@/lib/design-tokens";
import { stageRank, STAGE_KEY_TO_PATH, type DealRoomStageKey } from "@/lib/deal-room-stages";

export const Route = createFileRoute("/app/overview")({
  component: Overview,
});

// ── Safety allowlist for the activity rail — mirrors the investor side's
// SAFE_ACTIVITY_ACTIONS pattern (R5 audit found the founder page never got
// this fix). Only short, pre-approved category strings render; anything
// else (a free-text sentence some write path stored) collapses to a
// generic label rather than leaking deal content on a page outside the
// /deal-rooms/:id/* boundary (CLAUDE.md §9.6).
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
  "Viewed profile",
]);
function safeActivityLabel(action: string): string {
  return SAFE_ACTIVITY_ACTIONS.has(action) ? action : "Room activity";
}

// ── Stat card ──────────────────────────────────────────────────────

function StatCard({
  label, value, sub, trend, empty,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { direction: "up" | "down" | "flat"; label: string } | null;
  empty?: string;
}) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, padding: 20 }}>
      <div style={{ fontFamily: font.body, fontSize: 12, color: color.inkTertiary }}>{label}</div>
      {empty ? (
        <div style={{ marginTop: 10, fontSize: 12, color: color.inkTertiary, lineHeight: 1.5 }}>{empty}</div>
      ) : (
        <>
          <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: font.display, fontSize: 26, fontWeight: 700, color: color.ink, fontVariantNumeric: "tabular-nums" }}>{value}</span>
            {trend && (
              <span style={{
                fontSize: 12, display: "inline-flex", alignItems: "center", gap: 2,
                color: trend.direction === "up" ? "#059669" : trend.direction === "down" ? "#DC2626" : color.inkTertiary,
              }}>
                {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.label}
              </span>
            )}
          </div>
          {sub && <div style={{ marginTop: 2, fontSize: 12, color: color.inkTertiary }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

// ── Skippable onboarding checklist — reuses onboarding_progress ─────

function OnboardingChecklist({
  startup, docs, dealRooms, investorMembers,
}: {
  startup: any;
  docs: any[];
  dealRooms: any[];
  investorMembers: any[];
}) {
  const { progress, markStep } = useOnboardingProgress();
  const [collapsed, setCollapsed] = useState(false);
  const dismissed = progress?.steps?.checklist_dismissed === true;

  const steps = [
    { id: "profile", label: "Complete your company profile", done: !!startup?.company_name, href: "/app/profile" },
    { id: "docs", label: "Upload your pitch deck", done: docs.length > 0, href: "/app/documents" },
    { id: "verify", label: "Run identity verification", done: !!startup?.tier1_passed, href: "/app/verification" },
    { id: "dealroom", label: "Create your first deal room", done: dealRooms.length > 0, href: "/app/deal-rooms" },
    { id: "investor", label: "Invite your first investor", done: investorMembers.length > 0, href: "/app/deal-rooms" },
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
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px",
                  border: `1px solid ${color.border}`, textDecoration: "none",
                  opacity: s.done ? 0.6 : 1,
                }}
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

// ── Needs attention table ───────────────────────────────────────────

interface AttentionRow {
  id: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  href: string;
}

function NeedsAttentionTable({ rows }: { rows: AttentionRow[] }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
        <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Needs your attention</div>
      </div>
      {rows.length === 0 ? (
        <EmptyState kind="empty" title="Nothing needs attention right now" />
      ) : (
        <div>
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.id}
                to={r.href as any}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "0 20px",
                  height: 44, borderBottom: `1px solid ${color.border}`, textDecoration: "none",
                }}
              >
                <Icon style={{ width: 14, height: 14, color: "#DC2626", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 13, color: color.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: color.inkTertiary, whiteSpace: "nowrap" }}>{r.sub}</span>
                </div>
                <ArrowRight style={{ width: 12, height: 12, color: color.inkTertiary, flexShrink: 0 }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chart card wrapper ──────────────────────────────────────────────

function ChartCard({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: string }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, padding: 20 }}>
      <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink, marginBottom: 16 }}>{title}</div>
      {empty ? (
        <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: color.inkTertiary, textAlign: "center", padding: "0 24px" }}>
          {empty}
        </div>
      ) : (
        <div style={{ height: 220 }}>{children}</div>
      )}
    </div>
  );
}

// ── Activity rail item ──────────────────────────────────────────────

function ActivityRail({ items }: { items: { id: string; label: string; sub: string; time: string }[] }) {
  return (
    <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, background: color.white, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${color.border}` }}>
        <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>Recent activity</div>
      </div>
      {items.length === 0 ? (
        <EmptyState kind="empty" title="No activity yet" />
      ) : (
        <div>
          {items.map((a) => (
            <div key={a.id} style={{ padding: "12px 20px", borderBottom: `1px solid ${color.border}` }}>
              <div style={{ fontSize: 13, color: color.ink }}>{a.label}</div>
              <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>{a.sub} · {a.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

function Overview() {
  const { user } = useAuth();

  const { data: startupRaw } = useQuery({
    queryKey: ["overview-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("*").eq("founder_id", user!.id).limit(1);
      return data?.[0] ?? null;
    },
  });
  const startupId: string | undefined = startupRaw?.id;

  const { data: founderVerif } = useQuery({
    queryKey: ["overview-founder-verif", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase.from("founder_verifications").select("tier1_passed, tier1_email_match, tier1_website_match, tier1_registry_match, tier1_infra_match").eq("startup_id", startupId!).maybeSingle();
      return data;
    },
  });
  const startup = startupRaw ? { ...startupRaw, tier1_passed: founderVerif?.tier1_passed } : null;

  const { data: readiness } = useQuery({
    queryKey: ["overview-readiness", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { computeReadiness } = await import("@/lib/readiness-fn");
      return computeReadiness({ data: { startup_id: startupId!, founder_user_id: user!.id } });
    },
  });

  const { data: profileViews = [] } = useQuery({
    queryKey: ["overview-profile-views", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("profile_views")
        .select("created_at")
        .eq("startup_id", startupId!)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: profileViewsPrev7d = [] } = useQuery({
    queryKey: ["overview-profile-views-prev", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("profile_views")
        .select("id")
        .eq("startup_id", startupId!)
        .gte("created_at", fourteenDaysAgo)
        .lt("created_at", sevenDaysAgo);
      return data ?? [];
    },
  });

  const { data: dealRooms = [] } = useQuery({
    queryKey: ["overview-deal-rooms", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, workflow_stage, status, updated_at, investor_name, investor_company")
        .eq("startup_id", startupId!)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["overview-docs", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const roomIds = dealRooms.map((r: any) => r.id);
      if (roomIds.length === 0) return [];
      const { data } = await supabase.from("documents").select("id").in("deal_room_id", roomIds).limit(1);
      return data ?? [];
    },
  });

  const { data: investorMembers = [] } = useQuery({
    queryKey: ["overview-investor-members", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const roomIds = dealRooms.map((r: any) => r.id);
      if (roomIds.length === 0) return [];
      const { data } = await supabase.from("deal_room_members").select("role").in("deal_room_id", roomIds).eq("role", "investor").limit(1);
      return data ?? [];
    },
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["overview-pending-requests", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("discovery_requests")
        .select("id, investor_id, created_at")
        .eq("startup_id", startupId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: unansweredQA = [] } = useQuery({
    queryKey: ["overview-unanswered-qa", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const roomIds = dealRooms.map((r: any) => r.id);
      if (roomIds.length === 0) return [];
      const { data } = await supabase
        .from("deal_room_qa")
        .select("id, deal_room_id, created_at")
        .in("deal_room_id", roomIds)
        .eq("is_question", true)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: unverifiedClaims = [] } = useQuery({
    queryKey: ["overview-unverified-claims", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_claims")
        .select("id, claim_label, proof_status")
        .eq("startup_id", startupId!)
        .eq("proof_status", "unverified")
        .limit(5);
      return data ?? [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["overview-activities", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const roomIds = dealRooms.map((r: any) => r.id);
      if (roomIds.length === 0) return [];
      const { data } = await supabase
        .from("activities")
        .select("id, action, created_at, deal_room_id")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: docViewsByRoom = [] } = useQuery({
    queryKey: ["overview-doc-views-by-room", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const roomIds = dealRooms.map((r: any) => r.id);
      if (roomIds.length === 0) return [];
      const { data } = await supabase
        .from("document_views")
        .select("deal_room_id")
        .in("deal_room_id", roomIds);
      return data ?? [];
    },
  });

  // ── Derived: views-over-time series (last 7 days, daily buckets) ──
  const viewsSeries = (() => {
    const days: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = (profileViews as any[]).filter((v) => {
        const vd = new Date(v.created_at);
        return vd.toDateString() === d.toDateString();
      }).length;
      days.push({ date: key, views: count });
    }
    return days;
  })();
  const totalViews7d = viewsSeries.reduce((a, b) => a + b.views, 0);
  const totalViewsPrev7d = (profileViewsPrev7d as any[]).length;
  const viewsTrend = totalViewsPrev7d > 0
    ? Math.round(((totalViews7d - totalViewsPrev7d) / totalViewsPrev7d) * 100)
    : null;

  // ── Derived: engagement by room (bar chart, room names + counts only) ──
  const engagementByRoom = dealRooms.map((r: any) => {
    const name = r.investor_company || r.investor_name || "Deal room";
    const views = (docViewsByRoom as any[]).filter((v) => v.deal_room_id === r.id).length;
    return { name: name.length > 14 ? `${name.slice(0, 14)}…` : name, views };
  }).filter((r) => r.views > 0).slice(0, 8);

  // ── Derived: needs-attention rows ──
  const staleDays = 7;
  const staleCutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
  const staleRooms = dealRooms.filter((r: any) => new Date(r.updated_at) < staleCutoff);

  const attentionRows: AttentionRow[] = [
    ...(founderVerif && !founderVerif.tier1_passed
      ? [{ id: "verif", icon: ShieldAlert, label: "Identity verification not passed", sub: "Run checks", href: "/app/verification" }]
      : []),
    ...(unverifiedClaims as any[]).map((c) => ({
      id: `claim-${c.id}`,
      icon: FileWarning,
      label: `Unverified claim: ${c.claim_label}`,
      sub: "Attach proof",
      href: "/app/claims",
    })),
    ...staleRooms.map((r: any) => ({
      id: `stale-${r.id}`,
      icon: Clock3,
      label: `${r.investor_company || r.investor_name || "Deal room"} — no activity in ${formatDistanceToNow(new Date(r.updated_at))}`,
      sub: "View room",
      href: `/app/deal-rooms/${r.id}/overview`,
    })),
    ...(unansweredQA as any[]).slice(0, 5).map((q: any) => {
      const room = dealRooms.find((r: any) => r.id === q.deal_room_id);
      const stagePath = STAGE_KEY_TO_PATH["qa" as Exclude<DealRoomStageKey, "overview">];
      return {
        id: `qa-${q.id}`,
        icon: MessageSquareWarning,
        label: `Unanswered question — ${room?.investor_company || room?.investor_name || "deal room"}`,
        sub: "Answer now",
        href: `/app/deal-rooms/${q.deal_room_id}/${stagePath}`,
      };
    }),
  ];

  const activityItems = (activities as any[]).map((a) => {
    const room = dealRooms.find((r: any) => r.id === a.deal_room_id);
    return {
      id: a.id,
      label: safeActivityLabel(a.action),
      sub: room?.investor_company || room?.investor_name || "Deal room",
      time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }),
    };
  });

  return (
    <PageFrame
      breadcrumb={[{ label: "Overview" }]}
      title="Overview"
      description="Your raise at a glance — readiness, activity, and what needs attention."
      actions={
        <Link
          to="/app/deal-rooms"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, height: 36,
            background: "#7C3AED", color: "#fff", border: "none", borderRadius: radius.control,
            padding: "0 16px", fontSize: 13, fontWeight: 500, fontFamily: font.body, textDecoration: "none",
          }}
        >
          Deal rooms <ArrowUpRight style={{ width: 14, height: 14 }} />
        </Link>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: space.block }}>

        {startupId && (
          <OnboardingChecklist startup={startup} docs={docs} dealRooms={dealRooms} investorMembers={investorMembers} />
        )}

        {/* Row 1: stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <StatCard
            label="Readiness score"
            value={readiness ? `${readiness.readiness_score}/100` : "—"}
            trend={readiness?.prev_readiness_score != null
              ? {
                  direction: readiness.readiness_score > readiness.prev_readiness_score ? "up" : readiness.readiness_score < readiness.prev_readiness_score ? "down" : "flat",
                  label: `${Math.abs(readiness.readiness_score - readiness.prev_readiness_score)} pts`,
                }
              : null}
            sub={readiness ? undefined : undefined}
            empty={!startupId ? "No data yet — complete your profile to generate a score" : undefined}
          />
          <StatCard
            label="Profile views"
            value={totalViews7d}
            sub="last 7 days"
            trend={viewsTrend !== null ? { direction: viewsTrend > 0 ? "up" : viewsTrend < 0 ? "down" : "flat", label: `${Math.abs(viewsTrend)}%` } : null}
            empty={totalViews7d === 0 && totalViewsPrev7d === 0 ? "No data yet — publish your profile to start tracking views" : undefined}
          />
          <StatCard
            label="Active deal rooms"
            value={dealRooms.length}
            sub={dealRooms.length === 1 ? "room" : "rooms"}
          />
          <StatCard
            label="Pending investor requests"
            value={pendingRequests.length}
            sub={pendingRequests.length === 1 ? "request" : "requests"}
            empty={pendingRequests.length === 0 ? "No data yet — requests appear when investors ask for access" : undefined}
          />
        </div>

        {/* Row 2: needs attention */}
        <NeedsAttentionTable rows={attentionRows} />

        {/* Row 3: graphs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ChartCard title="Profile views over time" empty={totalViews7d === 0 ? "No data yet — publish your profile to start tracking views" : undefined}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewsSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={color.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={{ stroke: color.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${color.border}`, borderRadius: 0 }} />
                <Area type="monotone" dataKey="views" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Deal room engagement" empty={engagementByRoom.length === 0 ? "No data yet — document views appear once investors open shared files" : undefined}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementByRoom} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={color.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={{ stroke: color.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: color.inkTertiary }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: `1px solid ${color.border}`, borderRadius: 0 }} />
                <Bar dataKey="views" fill="#7C3AED" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Right rail: activity feed (full width below graphs on this layout) */}
        <ActivityRail items={activityItems} />
      </div>
    </PageFrame>
  );
}

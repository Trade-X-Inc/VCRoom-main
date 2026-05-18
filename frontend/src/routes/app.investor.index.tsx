import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, Inbox, Briefcase, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { AttentionStrip, type AttentionItem } from "@/components/app/AttentionStrip";
import { AIBriefPanel, type AIBriefData } from "@/components/app/AIBriefPanel";
import { generateDealBrief } from "@/lib/deal-brief-fn";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/investor/")({
  component: InvestorDashboard,
});

const STAGES = ["Sourced", "Reviewing", "Diligence", "Partner", "Term Sheet", "Closed"] as const;

const DB_STATUS_TO_STAGE: Record<string, string> = {
  under_review: "Reviewing",
  info_requested: "Diligence",
  partner_review: "Partner",
  term_sheet: "Term Sheet",
  rejected: "Closed",
  exited: "Closed",
};

function InvestorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Gate: require investor profile before showing dashboard
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["investor-profile-gate", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!profileLoading && user?.id && profile === null) {
      navigate({ to: "/app/investor/profile", search: {} });
    }
  }, [profile, profileLoading, user?.id, navigate]);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  // Fetch user's deal room memberships
  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];

  // Fetch deal rooms with startup info
  const { data: roomsData = [] } = useQuery({
    queryKey: ["investor-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, created_at, updated_at, startup_id, investor_decision, startups(company_name, sector, stage, funding_target)")
        .in("id", roomIds);
      return data ?? [];
    },
  });

  // Fetch decisions for room count + attention strip
  const { data: decisionsData = [] } = useQuery({
    queryKey: ["investor-decisions", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("decisions")
        .select("deal_room_id, status, created_at")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Watchlist count
  const { data: watchlistCount = 0 } = useQuery({
    queryKey: ["investor-watchlist-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("investor_watchlist")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", user!.id);
      return count ?? 0;
    },
  });

  // Meetings this month (in rooms this investor belongs to)
  const _now = new Date();
  const startOfMonth = new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(_now.getFullYear(), _now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const { data: meetingsThisMonth = 0 } = useQuery({
    queryKey: ["investor-meetings-month", user?.id, _now.getMonth(), _now.getFullYear()],
    enabled: !!user?.id && roomIds.length > 0,
    queryFn: async () => {
      const { count } = await supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .in("deal_room_id", roomIds)
        .gte("scheduled_at", startOfMonth)
        .lte("scheduled_at", endOfMonth);
      return count ?? 0;
    },
  });

  // Fetch recent activity (from founders, not this investor)
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

  // Build stage counts from real data
  const latestStatus: Record<string, string | null> = {};
  for (const d of decisionsData) {
    if (!(d.deal_room_id in latestStatus)) latestStatus[d.deal_room_id] = d.status;
  }
  const stageCounts: Record<string, number> = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const room of roomsData) {
    const status = latestStatus[room.id] ?? null;
    const stage = DB_STATUS_TO_STAGE[status ?? ""] ?? "Sourced";
    if (stage in stageCounts) stageCounts[stage]++;
  }

  // Stats
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();
  const decisionsThisMonth = decisionsData.filter((d) => {
    if (!d.created_at) return false;
    const dt = new Date(d.created_at as string);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  }).length;
  const inDiligence = roomsData.filter((r) => {
    const s = latestStatus[r.id] ?? null;
    return DB_STATUS_TO_STAGE[s ?? ""] === "Diligence";
  }).length;

  // Attention strip items
  const attentionItems: AttentionItem[] = [];
  for (const room of roomsData) {
    const status = latestStatus[room.id] ?? null;
    const isEarlyStage = !status || status === "under_review";
    if (isEarlyStage && room.created_at < sevenDaysAgo) {
      const name = (room.startups as any)?.company_name ?? "Deal";
      attentionItems.push({
        id: `overdue-${room.id}`,
        level: "urgent",
        title: `${name}: no decision update in 7+ days`,
        href: `/app/deal-room/${room.id}`,
      });
    }
  }
  for (const act of recentActivity.slice(0, 3)) {
    attentionItems.push({
      id: `act-${act.id}`,
      level: "info",
      title: `Founder activity: ${act.action}`,
      href: `/app/deal-room/${act.deal_room_id}`,
    });
  }

  // AI brief for selected room
  const selectedRoom = roomsData.find((r) => r.id === selectedRoomId);
  const { data: briefResult, isLoading: briefLoading } = useQuery({
    queryKey: ["ai-brief", selectedRoomId, user?.id],
    enabled: !!selectedRoomId && !!user?.id,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => generateDealBrief({ data: { dealRoomId: selectedRoomId!, userId: user!.id } }),
  });
  const aiBriefData: AIBriefData | null =
    selectedRoomId && briefResult
      ? {
          company: (selectedRoom?.startups as any)?.company_name ?? "Deal",
          thesisMatch: briefResult.matchScore,
          strengths: briefResult.strengths,
          risks: briefResult.risks,
          mitigants: briefResult.mitigants,
          nextAction: briefResult.nextAction,
          dealRoomId: selectedRoomId,
        }
      : null;

  const [insights] = useState<string[]>([
    "Connect your inbox to start sourcing deals automatically.",
    "Invite your partner to collaborate on diligence.",
    "Set your investment thesis to enable AI scoring.",
  ]);

  // Activity feed display items
  const activityFeed = recentActivity.map((act) => {
    const room = roomsData.find((r) => r.id === act.deal_room_id);
    return {
      id: act.id,
      company: (room?.startups as any)?.company_name ?? "Deal",
      action: act.action,
      time: new Date(act.created_at as string).toLocaleDateString(),
    };
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greet}, {user?.fullName?.split(" ")[0] ?? "there"}
          </h1>
          <div className="text-sm text-muted-foreground">{today}</div>
        </div>
        <button className="rounded-[10px] border border-border/60 px-3 py-2 text-sm hover:bg-accent">How it works</button>
      </div>

      <section>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Today's attention</div>
        <AttentionStrip items={attentionItems} />
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Active deal rooms", v: `${roomIds.length}`, s: roomIds.length !== 1 ? "rooms" : "room" },
          { l: "Watchlist", v: `${watchlistCount}`, s: watchlistCount !== 1 ? "companies" : "company" },
          { l: "Meetings this month", v: `${meetingsThisMonth}`, s: "scheduled" },
          { l: "Decisions made", v: `${roomsData.filter((r: any) => r.investor_decision != null).length}`, s: "total" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{k.v}</div>
            <div className="text-[11px] text-muted-foreground">{k.s}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
          <div className="text-sm font-semibold">Deal pipeline</div>
          <span className="text-xs text-muted-foreground">{roomsData.length} deal{roomsData.length !== 1 ? "s" : ""}</span>
        </div>
        {roomsData.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Briefcase className="mx-auto h-8 w-8 opacity-40 mb-2" />
            <div className="font-medium">No deals yet</div>
            <div className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Founders will invite you to their deal rooms — you'll see them here.</div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {roomsData.map((room) => {
              const startup = (room as any).startups;
              const status = latestStatus[room.id] ?? null;
              const stage = DB_STATUS_TO_STAGE[status ?? ""] ?? "Sourced";
              const stageColors: Record<string, string> = {
                Sourced: "bg-muted text-muted-foreground",
                Reviewing: "bg-brand/10 text-brand",
                Diligence: "bg-warning/10 text-warning",
                Partner: "bg-violet/10 text-violet",
                "Term Sheet": "bg-success/10 text-success",
                Closed: "bg-destructive/10 text-destructive",
              };
              return (
                <div key={room.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold text-sm shrink-0">
                    {(startup?.company_name || "D")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{startup?.company_name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{startup?.sector || "—"} · {startup?.stage || "—"}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {room.updated_at ? formatDistanceToNow(new Date(room.updated_at as string), { addSuffix: true }) : "—"}
                  </div>
                  <span className={cn("shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5", stageColors[stage] ?? "bg-muted text-muted-foreground")}>
                    {stage}
                  </span>
                  <Link
                    to="/app/deal-room/$id"
                    params={{ id: room.id }}
                    className="shrink-0 rounded-md border border-border/60 px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                  >
                    Open →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-[1fr_400px] gap-5">
        <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 text-sm font-semibold">Recent activity</div>
          {activityFeed.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Inbox className="mx-auto h-8 w-8 opacity-40" />
              <div className="mt-2">No recent activity</div>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {activityFeed.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.company}</div>
                    <div className="text-xs text-muted-foreground">{a.action}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{a.time}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-gradient-to-br from-brand to-violet text-brand-foreground p-6 relative overflow-hidden">
          <div className="absolute inset-0 noise opacity-20" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium opacity-90">
              <Sparkles className="h-3.5 w-3.5" /> AI Weekly Brief
            </div>
            <h3 className="mt-2 text-lg font-semibold">Your week in deals</h3>
            <ul className="mt-4 space-y-2 text-sm opacity-95">
              {insights.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 opacity-80" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <button className="mt-5 inline-flex items-center gap-1.5 rounded-[10px] bg-background/15 hover:bg-background/25 px-3 py-1.5 text-xs">
              Regenerate
            </button>
          </div>
        </section>
      </div>

      {briefLoading && selectedRoomId && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl bg-card p-8 shadow-elev text-sm text-muted-foreground animate-pulse">
            Generating AI brief…
          </div>
        </div>
      )}

      <AIBriefPanel
        data={aiBriefData}
        onClose={() => setSelectedRoomId(null)}
        onOpenDealRoom={() => {
          if (selectedRoomId) window.location.href = `/app/deal-room/${selectedRoomId}`;
        }}
      />
    </div>
  );
}

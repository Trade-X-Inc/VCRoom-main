import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Sparkles, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AttentionStrip, type AttentionItem } from "@/components/app/AttentionStrip";
import { AIBriefPanel, type AIBriefData } from "@/components/app/AIBriefPanel";
import { generateDealBrief } from "@/lib/deal-brief-fn";

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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

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
        .select("id, created_at, updated_at, startup_id, startups(company_name, sector, stage, funding_target)")
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
            {greet}, {user?.name?.split(" ")[0] ?? "there"}
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
          { l: "Active deals", v: `${roomIds.length}`, s: roomIds.length !== 1 ? "deal rooms" : "deal room" },
          { l: "In diligence", v: `${inDiligence}`, s: "—" },
          { l: "Decisions this month", v: `${decisionsThisMonth}`, s: "—" },
          { l: "Avg deal score", v: "—", s: "—" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{k.v}</div>
            <div className="text-[11px] text-muted-foreground">{k.s}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60 text-sm font-semibold">Deal flow by stage</div>
        <div className="grid grid-cols-3 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-border/60">
          {STAGES.map((s) => (
            <Link key={s} to="/app/investor/deal-flow" className="px-4 py-4 hover:bg-accent/40 transition-colors">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{stageCounts[s] ?? 0}</div>
            </Link>
          ))}
        </div>
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

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AttentionStrip, type AttentionItem } from "@/components/app/AttentionStrip";
import { AIBriefPanel, type AIBriefData } from "@/components/app/AIBriefPanel";
import { generateDealBrief } from "@/lib/deal-brief-fn";

export const Route = createFileRoute("/app/investor/")({
  component: InvestorPipeline,
});

const KANBAN_STAGES = ["Sourced", "Diligence", "Info Req.", "Partner", "Term Sheet", "Pass"];

const DB_STATUS_TO_STAGE: Record<string, string> = {
  under_review: "Diligence",
  info_requested: "Info Req.",
  partner_review: "Partner",
  term_sheet: "Term Sheet",
  rejected: "Pass",
  exited: "Pass",
};

interface KanbanCard {
  id: string | null;
  stage: string;
  n: string;
  s: string;
  check: string;
  score: number;
}

function InvestorPipeline() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Fetch user's deal room IDs
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
        .select("id, created_at, startup_id, startups(company_name, sector, stage, funding_target)")
        .in("id", roomIds);
      return data ?? [];
    },
  });

  // Fetch latest decision per room (ordered desc so first per room = latest)
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

  // Build map roomId → latest status
  const latestStatus: Record<string, string | null> = {};
  for (const d of decisionsData) {
    if (!(d.deal_room_id in latestStatus)) latestStatus[d.deal_room_id] = d.status;
  }

  // Attention strip: overdue deals + recent founder activity
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["founder-activity", roomIds.join(","), user?.id],
    enabled: roomIds.length > 0 && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, action, deal_room_id, created_at")
        .in("deal_room_id", roomIds)
        .neq("actor_id", user!.id)
        .gt("created_at", threeDaysAgo)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

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

  // AI brief for selected room (30 min cache)
  const selectedRoom = roomsData.find((r) => r.id === selectedRoomId);
  const { data: briefResult, isLoading: briefLoading } = useQuery({
    queryKey: ["ai-brief", selectedRoomId, user?.id],
    enabled: !!selectedRoomId && !!user?.id,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      return generateDealBrief({ data: { dealRoomId: selectedRoomId!, userId: user!.id } });
    },
  });

  // Build kanban cards from real data or fall back to mock
  const realCards: KanbanCard[] = roomsData.map((room) => {
    const startup = room.startups as any;
    const status = latestStatus[room.id] ?? null;
    return {
      id: room.id,
      stage: DB_STATUS_TO_STAGE[status ?? ""] ?? "Sourced",
      n: startup?.company_name ?? "Unnamed deal",
      s: [startup?.stage, startup?.sector].filter(Boolean).join(" · ") || "—",
      check: startup?.funding_target ? `$${startup.funding_target}` : "—",
      score: 0,
    };
  });

  const useReal = realCards.length > 0;
  const cards: KanbanCard[] = useReal ? realCards : MOCK_CARDS;

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

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Pipeline</h1>
          <div className="text-sm text-muted-foreground">
            {useReal
              ? `${roomIds.length} active deal room${roomIds.length !== 1 ? "s" : ""}`
              : "128 sourced · 12 in active diligence · 4 decisions this week"}
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow">
          <Plus className="h-4 w-4" /> Source deal
        </button>
      </div>

      {/* Attention strip */}
      <div className="mb-6">
        <AttentionStrip items={attentionItems} />
      </div>

      {/* Kanban board */}
      <div className="-mx-6 lg:-mx-8 px-6 lg:px-8 overflow-x-auto pb-6">
        <div className="flex gap-3 min-w-max">
          {KANBAN_STAGES.map((stage) => {
            const stageCards = cards.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="w-[300px] flex-shrink-0">
                <div className="px-1 mb-2.5 flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {stage} <span className="text-xs text-muted-foreground">{stageCards.length}</span>
                  </div>
                </div>
                <div className="space-y-2 rounded-xl bg-muted/30 p-2 min-h-[200px]">
                  {stageCards.map((c) => (
                    <button
                      key={c.id ?? c.n}
                      onClick={() => c.id ? setSelectedRoomId(c.id) : undefined}
                      className="w-full text-left rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-semibold">{c.n}</div>
                          <div className="text-xs text-muted-foreground">{c.s}</div>
                        </div>
                        {c.score > 0 && (
                          <div className={`text-[11px] font-mono tabular-nums rounded-md px-1.5 py-0.5 ${c.score >= 85 ? "bg-success/15 text-success" : c.score >= 70 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}`}>
                            {c.score}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Ask</span>
                        <span className="font-medium">{c.check}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI brief loading overlay */}
      {briefLoading && selectedRoomId && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-2xl bg-card p-8 shadow-elev text-sm text-muted-foreground animate-pulse">
            Generating AI brief…
          </div>
        </div>
      )}

      {/* AI brief panel */}
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

const MOCK_CARDS: KanbanCard[] = [
  { id: null, stage: "Sourced", n: "Atlas Robotics", s: "Series A · Robotics", check: "$5M", score: 87 },
  { id: null, stage: "Sourced", n: "Lumen AI", s: "Seed · Dev tools", check: "$2M", score: 76 },
  { id: null, stage: "Diligence", n: "Helix Bio", s: "Series A · Biotech", check: "$8M", score: 91 },
  { id: null, stage: "Diligence", n: "Northwind", s: "Seed · Climate", check: "$1.5M", score: 68 },
  { id: null, stage: "Partner", n: "Quanta Labs", s: "Series A · AI", check: "$10M", score: 94 },
  { id: null, stage: "Info Req.", n: "Forge", s: "Seed · Fintech", check: "$3M", score: 72 },
  { id: null, stage: "Term Sheet", n: "Vertex", s: "Series B · SaaS", check: "$15M", score: 89 },
  { id: null, stage: "Pass", n: "Pulse", s: "Seed · Consumer", check: "—", score: 42 },
];

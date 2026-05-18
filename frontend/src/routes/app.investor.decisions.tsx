import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, Pause, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/decisions")({
  component: DecisionsPage,
});

type Room = {
  id: string;
  updatedAt: string | null;
  decision: string | null;
  company: string;
  sector?: string;
  stage?: string;
};

function DecisionsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);

  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids-decisions", user?.id],
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

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-decisions-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_rooms")
        .select("id, updated_at, investor_decision, startups(company_name, sector, stage)")
        .in("id", roomIds);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        updatedAt: r.updated_at as string | null,
        decision: r.investor_decision as string | null,
        company: r.startups?.company_name ?? "Deal",
        sector: r.startups?.sector,
        stage: r.startups?.stage,
      })) as Room[];
    },
  });

  const handleDecision = async (roomId: string, decision: string) => {
    setSaving(roomId + decision);
    try {
      await supabase.from("deal_rooms").update({ investor_decision: decision }).eq("id", roomId);
      await queryClient.invalidateQueries({ queryKey: ["investor-decisions-rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["investor-rooms"] });
    } finally {
      setSaving(null);
    }
  };

  const cols = {
    invest: rooms.filter((r) => r.decision === "invest"),
    hold: rooms.filter((r) => r.decision === "hold"),
    pass: rooms.filter((r) => r.decision === "pass"),
  };
  const undecided = rooms.filter((r) => !r.decision);

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decision Board</h1>
        <div className="text-sm text-muted-foreground">Record your investment decisions across active deals</div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          ["Total deals", `${rooms.length}`],
          ["Invest", `${cols.invest.length}`],
          ["Hold", `${cols.hold.length}`],
          ["Pass rate", rooms.length > 0 ? `${Math.round((cols.pass.length / rooms.length) * 100)}%` : "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card h-64 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground">
          Could not load data. Please refresh.
        </div>
      ) : rooms.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
          <h3 className="text-lg font-semibold">No deals yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Decisions appear here once you've been invited to deal rooms.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {([
              { t: "Invest", key: "invest" as const, c: "success", Icon: Check,  items: cols.invest },
              { t: "Hold",   key: "hold"   as const, c: "warning", Icon: Pause,  items: cols.hold },
              { t: "Pass",   key: "pass"   as const, c: "destructive", Icon: X,  items: cols.pass },
            ] as const).map((col) => (
              <div key={col.t} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
                  <col.Icon className={`h-4 w-4 text-${col.c}`} />
                  <span className="text-sm font-semibold">{col.t}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{col.items.length}</span>
                </div>
                <div className="p-3 space-y-2">
                  {col.items.length === 0 ? (
                    <div className="py-6 text-sm text-muted-foreground text-center">
                      No {col.t.toLowerCase()} decisions yet
                    </div>
                  ) : (
                    col.items.map((room) => (
                      <RoomCard
                        key={room.id}
                        room={room}
                        saving={saving}
                        onDecision={handleDecision}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {undecided.length > 0 && (
            <div className="mt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                Awaiting decision · {undecided.length}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {undecided.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    saving={saving}
                    onDecision={handleDecision}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoomCard({
  room,
  saving,
  onDecision,
}: {
  room: Room;
  saving: string | null;
  onDecision: (roomId: string, decision: string) => void;
}) {
  const buttons = [
    {
      key: "invest",
      label: "Invest",
      cls: "border-success/40 text-success hover:bg-success/10",
      activeCls: "bg-success/15 border-success text-success font-semibold",
    },
    {
      key: "hold",
      label: "Hold",
      cls: "border-warning/40 text-warning hover:bg-warning/10",
      activeCls: "bg-warning/15 border-warning text-warning font-semibold",
    },
    {
      key: "pass",
      label: "Pass",
      cls: "border-destructive/40 text-destructive hover:bg-destructive/10",
      activeCls: "bg-destructive/15 border-destructive text-destructive font-semibold",
    },
  ] as const;

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="mb-3">
        <Link
          to="/app/deal-room/$id"
          params={{ id: room.id }}
          className="text-sm font-medium hover:text-brand transition-colors"
        >
          {room.company}
        </Link>
        {(room.sector || room.stage) && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {[room.sector, room.stage].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        {buttons.map(({ key, label, cls, activeCls }) => {
          const isCurrent = room.decision === key;
          const isSaving = saving === room.id + key;
          return (
            <button
              key={key}
              onClick={() => onDecision(room.id, key)}
              disabled={!!saving}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] transition-colors disabled:opacity-50 ${isCurrent ? activeCls : cls}`}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

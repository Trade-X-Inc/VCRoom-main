import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Deal Rooms › Meetings Calendar. Minimal cross-room view: for each
// room, the scheduled/completed meeting dates only — reusing the existing
// getDealRoomWorkflow() server fn. Per §9.6, outside /deal-rooms/:id/* this
// page may show room name + counterparty + timestamp only, never meeting
// notes or action items.
export const Route = createFileRoute("/app/deal-rooms/meetings-calendar")({
  component: FounderMeetingsCalendar,
});

function FounderMeetingsCalendar() {
  const { user } = useAuth();

  const { data: startup } = useQuery({
    queryKey: ["mc-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["mc-rooms", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, investor_name, status")
        .eq("startup_id", startup!.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["mc-workflows", rooms.map((r) => r.id).join(",")],
    enabled: rooms.length > 0,
    queryFn: async () => {
      const { getDealRoomWorkflow } = await import("@/lib/deal-room-workflow-fn");
      const results = await Promise.all(
        rooms.map(async (r) => {
          const { data } = await getDealRoomWorkflow({ data: { deal_room_id: r.id } });
          return { room: r, workflow: data };
        }),
      );
      return results.flatMap(({ room, workflow }) =>
        (workflow?.meetings ?? [])
          .filter((m) => m.scheduled_at)
          .map((m) => ({
            roomId: room.id,
            investorName: room.investor_name ?? "Pending invite",
            meetingNumber: m.meeting_number,
            scheduledAt: m.scheduled_at as string,
            completed: !!m.completed_at,
          })),
      );
    },
  });

  const sorted = [...rows].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <PageFrame
      breadcrumb={[{ label: "Deal Rooms" }, { label: "Meetings Calendar" }]}
      title="Meetings Calendar"
      description="Scheduled meetings across all your deal rooms."
    >
      {isLoading && rooms.length > 0 ? (
        <EmptyState kind="loading" title="Loading" />
      ) : sorted.length === 0 ? (
        <EmptyState kind="empty" title="No meetings scheduled" />
      ) : (
        <div className="rounded-none border border-border/60 bg-card divide-y divide-border/60">
          {sorted.map((m) => (
            <div key={`${m.roomId}-${m.meetingNumber}`} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{m.investorName}</div>
                  <div className="text-xs text-muted-foreground">
                    Meeting {m.meetingNumber} · {new Date(m.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {m.completed && " · Completed"}
                  </div>
                </div>
              </div>
              <Link
                to={"/app/deal-rooms/$id" as any}
                params={{ id: m.roomId } as any}
                className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 text-xs shrink-0 hover:bg-accent transition-colors"
              >
                Open room <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

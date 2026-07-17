import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Deal Rooms › Meetings Calendar (investor). Same shape as the
// founder side: for each room, scheduled/completed meeting dates only via
// getDealRoomWorkflow(). Per §9.6, room name + counterparty + timestamp
// only — never meeting notes or action items.
export const Route = createFileRoute("/app/investor/deal-rooms/meetings-calendar")({
  component: InvestorMeetingsCalendar,
});

function InvestorMeetingsCalendar() {
  const { user } = useAuth();

  const { data: rooms = [] } = useQuery({
    queryKey: ["investor-mc-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const [membersRes, directRes] = await Promise.all([
        supabase
          .from("deal_room_members")
          .select("deal_room_id, deal_rooms(id, startups(company_name))")
          .eq("user_id", user!.id),
        supabase
          .from("deal_rooms")
          .select("id, startups(company_name)")
          .eq("investor_user_id", user!.id),
      ]);
      const seen = new Set<string>();
      const rows: { id: string; company: string }[] = [];
      for (const r of membersRes.data ?? []) {
        const dr = r.deal_rooms as any;
        if (!dr?.id || seen.has(dr.id)) continue;
        seen.add(dr.id);
        rows.push({ id: dr.id, company: dr.startups?.company_name ?? "Unnamed" });
      }
      for (const dr of directRes.data ?? []) {
        if (!dr.id || seen.has(dr.id)) continue;
        seen.add(dr.id);
        rows.push({ id: dr.id, company: (dr as any).startups?.company_name ?? "Unnamed" });
      }
      return rows;
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["investor-mc-workflows", rooms.map((r) => r.id).join(",")],
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
            company: room.company,
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
      breadcrumb={[{ label: "Investor" }, { label: "Deal Rooms" }, { label: "Meetings Calendar" }]}
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
                  <div className="text-sm font-medium truncate">{m.company}</div>
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

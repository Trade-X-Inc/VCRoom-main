import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";

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
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        breadcrumb={[{ label: "Investor" }, { label: "Deal rooms" }, { label: "Meetings calendar" }]}
        title="Meetings calendar"
        description="Scheduled meetings across all your deal rooms."
      />

      {isLoading && rooms.length > 0 ? (
        <V2SkeletonRows rows={4} columns={3} />
      ) : sorted.length === 0 ? (
        <V2EmptyState text="No meetings scheduled." />
      ) : (
        <LedgerTable>
          <LedgerHead>
            <tr>
              <Th>Company</Th>
              <Th>Meeting</Th>
              <Th>Scheduled</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </LedgerHead>
          <LedgerBody>
            {sorted.map((m) => (
              <Tr key={`${m.roomId}-${m.meetingNumber}`}>
                <Td className="font-medium text-v2-ink">{m.company}</Td>
                <Td>{m.meetingNumber}</Td>
                <Td>
                  {new Date(m.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </Td>
                <Td><StatusLabel tone={m.completed ? "satisfied" : "attention"}>{m.completed ? "Completed" : "Scheduled"}</StatusLabel></Td>
                <Td>
                  <Link
                    to={"/app/deal-rooms/$id" as any}
                    params={{ id: m.roomId } as any}
                    className="inline-flex items-center gap-1 text-v2-accent hover:underline"
                  >
                    Open room <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Td>
              </Tr>
            ))}
          </LedgerBody>
        </LedgerTable>
      )}
    </div>
  );
}

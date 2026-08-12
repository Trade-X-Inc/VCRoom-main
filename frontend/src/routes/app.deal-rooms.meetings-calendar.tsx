import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  V2PageHeader, V2EmptyState, V2SkeletonRows,
  LedgerTable, LedgerHead, LedgerBody, Th, Tr, Td, StatusLabel,
} from "@/components/v2";

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
    <div className="p-8 max-w-5xl mx-auto font-v2-ui text-v2-ink">
      <V2PageHeader
        breadcrumb={[{ label: "Deal rooms" }, { label: "Meetings calendar" }]}
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
              <Th>Investor</Th>
              <Th>Meeting</Th>
              <Th>Scheduled</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </LedgerHead>
          <LedgerBody>
            {sorted.map((m) => (
              <Tr key={`${m.roomId}-${m.meetingNumber}`}>
                <Td className="font-medium text-v2-ink">{m.investorName}</Td>
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

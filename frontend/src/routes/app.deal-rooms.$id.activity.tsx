import { createFileRoute } from "@tanstack/react-router";
import { Timeline } from "@/components/app/DealRoomTimeline";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { dealRoomId } = useDealRoom();
  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8">
      <Timeline dealRoomId={dealRoomId} />
    </div>
  );
}

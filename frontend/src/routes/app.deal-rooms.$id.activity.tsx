import { createFileRoute } from "@tanstack/react-router";
import { Timeline } from "@/components/app/DealRoomTimeline";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  const { dealRoomId } = useDealRoom();
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Timeline dealRoomId={dealRoomId} />
    </div>
  );
}

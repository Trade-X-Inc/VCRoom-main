import { createFileRoute } from "@tanstack/react-router";
import { DealRooms } from "./app.deal-rooms.index";

// R9 extraction — Deal Rooms › Team Assignments. Renders the existing deal
// rooms list's read-only team-roster slice under route control; logic
// untouched. Room name + assignee list only, per §9.6 — no deal content.
function Page() {
  return <DealRooms view="team-assignments" />;
}

export const Route = createFileRoute("/app/deal-rooms/team-assignments")({
  component: Page,
});

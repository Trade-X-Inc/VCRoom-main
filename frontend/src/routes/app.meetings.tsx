import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/app/meetings")({
  component: Meetings,
});

function Meetings() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
      <div className="text-sm text-muted-foreground">Upcoming investor meetings with prep notes.</div>

      <div className="mt-6 rounded-xl border border-border/60 bg-card shadow-card p-10 flex flex-col items-center justify-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-accent">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">No meetings scheduled</div>
        <div className="text-xs text-muted-foreground text-center max-w-xs">
          Schedule meetings with investors directly from a deal room or use the button below.
        </div>
        <button className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow">
          <Calendar className="h-4 w-4" /> Schedule a meeting
        </button>
      </div>
    </div>
  );
}

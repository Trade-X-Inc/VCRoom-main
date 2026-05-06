import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/app/investor/deal-rooms")({
  component: () => (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">Deal Rooms</h1>
      <div className="text-sm text-muted-foreground">Active deal rooms you've been invited to.</div>
      <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Briefcase className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No active deal rooms</h3>
        <p className="mt-1 text-sm text-muted-foreground">Founders' deal room invitations appear here.</p>
      </div>
    </div>
  ),
});

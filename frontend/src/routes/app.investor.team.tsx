import { createFileRoute } from "@tanstack/react-router";
import { Users, UserPlus } from "lucide-react";

export const Route = createFileRoute("/app/investor/team")({
  component: TeamPage,
});

function TeamPage() {
  const members: any[] = [];
  const invites: any[] = [];
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <div className="text-sm text-muted-foreground">Invite analysts and partners to your fund</div>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><UserPlus className="h-4 w-4" /> Invite analyst</button>
      </div>

      <div className="mt-6">
        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No team members yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Invite analysts and partners to collaborate on deals.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-8">
        <div className="text-sm font-semibold mb-2">Pending invites</div>
        {invites.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground text-center">No pending invites.</div>
        ) : null}
      </div>
    </div>
  );
}

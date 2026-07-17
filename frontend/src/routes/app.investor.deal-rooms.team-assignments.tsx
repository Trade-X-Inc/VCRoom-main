import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";

// R9 (c) — Deal Rooms › Team Assignments (investor). No per-room assignment
// table exists on the investor side today (that's a founder-only concept via
// deal_room_team_assignments) — this page honestly shows the team roster
// (same query as /app/investor/team) without fabricating room-level links.
export const Route = createFileRoute("/app/investor/deal-rooms/team-assignments")({
  component: InvestorTeamAssignmentsPage,
});

interface TeamMemberRow {
  id: string;
  role: string;
  display_name: string | null;
  team_member_profiles: { first_name: string | null; last_name: string | null; title: string | null } | null;
}

function InvestorTeamAssignmentsPage() {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery<TeamMemberRow[]>({
    queryKey: ["investor-team-assignments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_team_accounts")
        .select("id, role, display_name, team_member_profiles(first_name, last_name, title)")
        .eq("investor_profile_id", user!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });
      return (data ?? []) as unknown as TeamMemberRow[];
    },
  });

  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Deal Rooms" }, { label: "Team Assignments" }]}
      title="Team Assignments"
      description="Your team roster. Per-room assignment isn't available yet — manage room access from inside each deal room."
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : members.length === 0 ? (
        <EmptyState
          kind="empty"
          title="No team members yet"
          action={{ label: "Manage team", href: "/app/investor/team" }}
        />
      ) : (
        <div className="rounded-none border border-border/60 bg-card divide-y divide-border/60">
          {members.map((m) => {
            const prof = m.team_member_profiles;
            const name = prof?.first_name ? `${prof.first_name} ${prof.last_name ?? ""}`.trim() : (m.display_name ?? "Unknown");
            return (
              <div key={m.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{name}</div>
                  {prof?.title && <div className="text-xs text-muted-foreground truncate">{prof.title}</div>}
                </div>
                <span className="text-xs text-muted-foreground capitalize shrink-0">{m.role}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 text-xs text-muted-foreground">
        <Link to={"/app/investor/team" as any} className="text-brand hover:underline">Manage team roster →</Link>
      </div>
    </PageFrame>
  );
}

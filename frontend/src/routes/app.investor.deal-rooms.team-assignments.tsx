import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { LcsPageHeader, LcsEmptyState, LcsButton } from "@/components/lcs";

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
    <div className="p-6 lg:p-8 max-w-[1360px] mx-auto">
      <div
        className="flex items-center gap-1.5 text-[12px] font-medium mb-3"
        style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
      >
        <span>Investor</span>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Deal Rooms</span>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Team Assignments</span>
      </div>
      <LcsPageHeader
        title="Team Assignments"
        description="Your team roster. Per-room assignment isn't available yet — manage room access from inside each deal room."
      />
      {isLoading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <LcsEmptyState
          title="No team members yet"
          text="People you add to your team appear here."
          action={
            <a href="/app/investor/team">
              <LcsButton variant="secondary">Manage team</LcsButton>
            </a>
          }
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
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare, UserCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { LcsPageHeader, LcsCard, LcsEmptyState, LcsStatusPill } from "@/components/lcs";

export const Route = createFileRoute("/app/member/")({
  component: MemberOverview,
});

/**
 * /app/member — the team-member home (any non-owner, non-admin account:
 * a founder's or investor's team, referred to elsewhere as "advisor" in
 * casual usage, though that isn't a distinct account type in the data
 * model — see AccountContext). Same worklist shape as the founder and
 * investor homes: one honest headline, real assigned rooms shown
 * empty-but-labeled, no invented content. Rebuilt from the old stat-card
 * layout, per the Post-login Home Dashboard design brief (6 Sep 2026).
 */

function MemberOverview() {
  const { user } = useAuth();
  const ctx = useAccountContext();

  const firstName = user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const roleLabel = ROLE_LABELS[ctx.role] ?? ctx.role;
  const roleDescription = ROLE_DESCRIPTIONS[ctx.role] ?? "";

  const { data: assignedRooms = [], isLoading } = useQuery({
    queryKey: ["member-assigned-rooms-overview", ctx.teamAccountId],
    enabled: !!ctx.teamAccountId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_team_assignments")
        .select("deal_room_id, deal_rooms(id, startups(company_name))")
        .eq("team_account_id", ctx.teamAccountId!);
      return (data ?? []) as {
        deal_room_id: string;
        deal_rooms: { id: string; startups: { company_name: string | null } | null } | null;
      }[];
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["member-recent-activity", ctx.teamAccountId],
    enabled: assignedRooms.length > 0,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const roomIds = assignedRooms.map((r) => r.deal_room_id);
      if (!roomIds.length) return [];
      const { data } = await supabase
        .from("deal_room_documents")
        .select("id, deal_room_id")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const headline = isLoading
    ? "Loading your assignments…"
    : assignedRooms.length === 0
      ? "No deal rooms assigned to you yet."
      : `${assignedRooms.length} deal room${assignedRooms.length === 1 ? "" : "s"} assigned to you.`;

  return (
    <div className="p-6 lg:p-12 max-w-3xl mx-auto">
      <LcsPageHeader
        title={headline}
        description={`Welcome, ${firstName}${roleLabel ? ` — ${roleLabel}` : ""}${roleDescription ? `. ${roleDescription}` : ""}`}
      />

      <div className="flex flex-col gap-4">
        <LcsCard title="Your deal rooms">
          {isLoading ? (
            <div className="p-4">
              <LcsEmptyState text="Loading…" />
            </div>
          ) : assignedRooms.length === 0 ? (
            <div className="p-4">
              <LcsEmptyState text="Deal rooms you're assigned to appear here — nothing to show until you're added to one." />
            </div>
          ) : (
            <div className="flex flex-col">
              {assignedRooms.map((r, i) => {
                const companyName = r.deal_rooms?.startups?.company_name ?? "Deal room";
                return (
                  <Link
                    key={r.deal_room_id}
                    to={"/app/deal-rooms/$id" as any}
                    params={{ id: r.deal_room_id }}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i === 0 ? undefined : "1px solid var(--lcs-line)" }}
                  >
                    <span className="text-[13px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                      {companyName}
                    </span>
                    <LcsStatusPill status="in-progress" label="Active" />
                  </Link>
                );
              })}
            </div>
          )}
        </LcsCard>

        <LcsCard title="Recent documents">
          {recentActivity.length === 0 ? (
            <div className="p-4">
              <LcsEmptyState text="Recent uploads across your assigned rooms appear here." />
            </div>
          ) : (
            <div className="p-4 text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              {recentActivity.length} document{recentActivity.length === 1 ? "" : "s"} added recently across your rooms.
            </div>
          )}
        </LcsCard>

        <LcsCard title="Quick links">
          <div className="grid gap-2 p-4 sm:grid-cols-3">
            <QuickLink to="/app/documents" label="Documents" icon={<FileText size={14} />} />
            <QuickLink to="/app/messages" label="Team Chat" icon={<MessageSquare size={14} />} />
            <QuickLink to="/app/member-profile" label="My Profile" icon={<UserCircle2 size={14} />} />
          </div>
        </LcsCard>
      </div>
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      className="flex items-center gap-2 px-3 py-2"
      style={{ border: "1px solid var(--lcs-line)", color: "var(--lcs-ink)", fontSize: 13, fontFamily: "var(--font-lcs-ui)" }}
    >
      <span style={{ color: "var(--lcs-ink-muted)" }}>{icon}</span>
      {label}
    </Link>
  );
}

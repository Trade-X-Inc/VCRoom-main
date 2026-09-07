import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { supabase } from "@/lib/supabase";
import { LcsCard, LcsEmptyState } from "@/components/lcs";

export const Route = createFileRoute("/app/member/")({
  component: MemberOverview,
});

/**
 * /app/member — the team-member home (any non-owner, non-admin account:
 * a founder's or investor's team, referred to elsewhere as "advisor" in
 * casual usage, though that isn't a distinct account type in the data
 * model — see AccountContext). Pulled from the approved Figma frame
 * (kDYUyEq60J0T2i24b6GzAv, node 220:784, "home-team-empty") and wired to
 * real data — no design interpretation, no fabricated content. Renders
 * as content only, inside the real running MemberShell chrome (the
 * frame's own navy sidebar is not built here — MemberShell is out of
 * scope for this pass, confirmed 7 Sep 2026, same disposition as
 * RaiseHome.tsx/DealFlowHome.tsx).
 *
 * Checklist corrected against real data before building: the frame's
 * "Role & permissions" and "Review team guidelines" had no real
 * backing (a per-room role exists but isn't a self-completable step;
 * no team-guidelines content exists anywhere) — dropped, not replaced
 * with placeholders. Checklist is 2 real items: Personal details / Set
 * notification preferences, both role-agnostic via app.settings.tsx /
 * app.settings.notifications.tsx.
 *
 * The prior pass's real "Quick links" card (Documents/Team Chat/My
 * Profile) has no equivalent in the frame and is dropped here — all 3
 * destinations remain reachable via MemberShell's own sidebar nav,
 * confirmed before dropping, nothing becomes unreachable.
 */

const CHECKLIST_ITEMS: { key: string; label: string }[] = [
  { key: "personal", label: "Personal details" },
  { key: "notifications", label: "Set notification preferences" },
];

const TUTORIALS = [
  "Your role in deal rooms",
  "Working with due diligence",
  "Document management",
  "Understanding checklists",
];

const PLATFORM_CARDS: { title: string; text: string }[] = [
  { title: "Deal Room", text: "Collaborate on assigned deals with your team" },
  { title: "Data Room", text: "Access and manage shared documents" },
  { title: "Due Diligence Station", text: "Support evidence gathering and questionnaires" },
  { title: "Checklists", text: "Track assigned tasks and requirements" },
  { title: "Documents", text: "Upload and organize fundraising documents" },
  { title: "How It Works", text: "Step-by-step guide to the platform workflow" },
];

function MemberOverview() {
  const { user } = useAuth();
  const ctx = useAccountContext();

  const firstName = user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

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

  // Checklist state — real, not decorative. full_name is checked directly
  // against the users row (not useAuth()'s user.fullName, which falls
  // back through user_metadata/email and would read "true" even for an
  // account that never actually set it).
  const { data: profileRow } = useQuery({
    queryKey: ["member-checklist-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("full_name, notification_prefs")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });
  const personalDetailsSet = !!profileRow?.full_name?.trim();
  const notificationPrefsSet = profileRow?.notification_prefs != null;

  const hasAssignments = !isLoading && assignedRooms.length > 0;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8" data-testid="member-overview">
      {/* Welcome header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div
              className="text-[11px] font-bold uppercase"
              style={{ color: "#e65100", fontFamily: "var(--font-lcs-data)" }}
            >
              Required step
            </div>
            <h1
              className="text-[28px] font-bold leading-tight mt-1"
              style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
            >
              Welcome to Lengdon
            </h1>
            <p className="text-[14px] mt-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-serif)" }}>
              Your closing infrastructure for private capital fundraising.
            </p>
          </div>
          <div
            className="px-2.5 py-1.5 shrink-0"
            style={{ background: "var(--lcs-accent)", borderRadius: "var(--radius-lcs-control)" }}
          >
            <span className="text-[11px] font-bold text-white" style={{ fontFamily: "var(--font-lcs-data)" }}>
              TEAM MEMBER
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[14px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
            {isLoading
              ? `Loading your assignments, ${firstName}…`
              : hasAssignments
                ? `${assignedRooms.length} deal room${assignedRooms.length === 1 ? "" : "s"} assigned to you, ${firstName}.`
                : "You don't have any deal assignments yet."}
          </p>
          {!hasAssignments && !isLoading && (
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-serif)" }}>
              When a founder or lead adds you to a deal room, your tasks and documents will appear here.
            </p>
          )}
        </div>
      </div>

      {/* Complete your profile */}
      <LcsCard title="Complete your profile">
        <div className="p-4 flex flex-col gap-2.5">
          {CHECKLIST_ITEMS.map((item) => {
            const done = item.key === "personal" ? personalDetailsSet : notificationPrefsSet;
            return (
            <div key={item.key} className="flex items-center gap-3">
              <div
                className="grid place-items-center shrink-0 size-5"
                style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)" }}
              >
                <div
                  className="size-3.5"
                  style={{
                    borderRadius: "50%",
                    border: `1.5px solid ${done ? "var(--lcs-satisfied)" : "var(--lcs-ink-muted)"}`,
                    background: done ? "var(--lcs-satisfied)" : "transparent",
                  }}
                />
              </div>
              <span className="text-[14px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-serif)" }}>
                {item.label}
              </span>
            </div>
            );
          })}
        </div>
      </LcsCard>

      {/* Getting started - Tutorials */}
      <LcsCard title="Getting started - Tutorials">
        <div className="p-4 flex flex-col gap-2.5">
          {TUTORIALS.map((title) => (
            <div key={title} className="flex items-center justify-between gap-3">
              <span className="text-[14px]" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-serif)" }}>
                {title}
              </span>
              <Link
                to="/app/support"
                className="text-[12px] font-bold shrink-0"
                style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-data)" }}
              >
                View
              </Link>
            </div>
          ))}
        </div>
      </LcsCard>

      {/* Platform overview */}
      <div className="flex flex-col gap-3">
        <div className="text-[16px] font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Platform overview
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {PLATFORM_CARDS.map((card) => (
            <div
              key={card.title}
              className="p-4 flex flex-col gap-2"
              style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}
            >
              <div className="text-[14px] font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                {card.title}
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-serif)" }}>
                {card.text}
              </p>
              <span className="text-[12px] font-bold" style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-data)" }}>
                Learn more
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Worklist — carried forward from the pre-existing "Your deal rooms" / "Recent documents" logic, real queries unchanged */}
      <div className="flex flex-col gap-3">
        <div className="text-[16px] font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          Worklist
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <LcsCard title="Waiting on you">
            {isLoading ? (
              <LcsEmptyState text="Loading…" />
            ) : assignedRooms.length === 0 ? (
              <LcsEmptyState text="No tasks assigned. You'll see items here when you're added to a deal room." />
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
                      <span className="text-[12px]" style={{ color: "var(--lcs-progress)", fontFamily: "var(--font-lcs-data)" }}>
                        Active
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </LcsCard>

          <LcsCard title="Waiting on them">
            {recentActivity.length === 0 ? (
              <LcsEmptyState text="Nothing pending from others. Responses you're waiting on will appear here." />
            ) : (
              <div className="p-4 text-[13px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                {recentActivity.length} document{recentActivity.length === 1 ? "" : "s"} added recently across your rooms.
              </div>
            )}
          </LcsCard>

          <LcsCard title="Expiring soon">
            <LcsEmptyState text="No deadlines. Urgent items from your assigned deals will surface here." />
          </LcsCard>
        </div>
      </div>
    </div>
  );
}

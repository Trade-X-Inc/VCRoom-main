import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, FileText, MessageSquare, UserCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/member/")({
  component: MemberOverview,
});

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
        .select("id, name, created_at, deal_room_id")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div style={{ padding: "32px", maxWidth: 800, margin: "0 auto" }}>
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", marginBottom: 6 }}>
          Welcome, {firstName}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: "rgba(124,58,237,0.15)", color: "#a78bfa",
            padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
          }}>
            {roleLabel}
          </span>
          {roleDescription && (
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {roleDescription}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
        <StatCard
          label="Deal Rooms"
          value={isLoading ? "…" : String(assignedRooms.length)}
          icon={<Briefcase size={18} style={{ color: "#a78bfa" }} />}
          note="assigned to you"
        />
        <StatCard
          label="Recent Documents"
          value={String(recentActivity.length)}
          icon={<FileText size={18} style={{ color: "#10B981" }} />}
          note="in your rooms"
        />
      </div>

      {/* Assigned deal rooms */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          My Deal Rooms
        </div>
        {isLoading ? (
          <div style={{ height: 80, borderRadius: 10, background: "rgba(255,255,255,0.04)" }} />
        ) : assignedRooms.length === 0 ? (
          <div style={{
            background: "#111114", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12, padding: "24px", textAlign: "center",
            color: "rgba(255,255,255,0.3)", fontSize: 13,
          }}>
            No deal rooms assigned yet — your admin will assign you when ready.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {assignedRooms.map((r) => {
              const companyName = r.deal_rooms?.startups?.company_name ?? "Deal Room";
              return (
                <Link
                  key={r.deal_room_id}
                  to={"/app/deal-room/$id" as any}
                  params={{ id: r.deal_room_id }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#111114", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: "14px 16px", textDecoration: "none",
                    color: "#fff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>
                      {companyName[0]?.toUpperCase() ?? "D"}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{companyName}</span>
                  </div>
                  <ArrowRight size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                </Link>
              );
            })}
          </div>
        )}
        {assignedRooms.length > 0 && (
          <Link
            to={"/app/deal-rooms" as any}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)" }}
          >
            View all deal rooms <ArrowRight size={12} />
          </Link>
        )}
      </div>

      {/* Quick links */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
          Quick Links
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <QuickLink to="/app/documents" label="Documents" icon={<FileText size={16} />} />
          <QuickLink to="/app/messages" label="Team Chat" icon={<MessageSquare size={16} />} />
          <QuickLink to="/app/member-profile" label="My Profile" icon={<UserCircle2 size={16} />} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, note }: {
  label: string; value: string; icon: React.ReactNode; note?: string;
}) {
  return (
    <div style={{
      background: "#111114", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
      {note && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function QuickLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      to={to as any}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, padding: "12px 14px", textDecoration: "none",
        color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500,
        transition: "background 0.15s",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.4)" }}>{icon}</span>
      {label}
    </Link>
  );
}

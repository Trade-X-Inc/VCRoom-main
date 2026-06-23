import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Mail, X, Loader2, ChevronDown, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { triggerStartupTeamInvite } from "@/lib/email/triggers";
import { FOUNDER_ROLES, FOUNDER_PERMISSIONS, PERMISSION_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

type FounderRole = "admin" | "manager" | "analyst" | "viewer";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:   { bg: "rgba(124,58,237,0.15)",  text: "#7C3AED" },
  manager: { bg: "rgba(16,185,129,0.15)",  text: "#10B981" },
  analyst: { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B" },
  viewer:  { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS.viewer;
  return (
    <span style={{
      background: cfg.bg, color: cfg.text,
      padding: "2px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, display: "inline-block",
    }}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

interface TeamAccountRow {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  team_member_profiles: {
    first_name: string | null;
    last_name: string | null;
    title: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeamInviteRow {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [appointConfirm, setAppointConfirm] = useState<{ id: string; name: string } | null>(null);

  // Get the founder's startup (startup.id ≠ user.id)
  const { data: startup, isLoading: loadingStartup } = useQuery({
    queryKey: ["users-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, founder_name")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Plan limits
  const { data: userPlan } = useQuery({
    queryKey: ["user-plan", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_plans")
        .select("plan, plan_name, team_members_limit")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const teamLimit = userPlan?.team_members_limit ?? 0;
  const isFreePlan = teamLimit === 0;

  // Query members using startup.id (NOT user.id)
  const { data: teamAccounts = [], isLoading: loadingTeam } = useQuery<TeamAccountRow[]>({
    queryKey: ["startup-team-accounts", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_team_accounts")
        .select(`
          id, user_id, role, status, joined_at, display_name, avatar_url,
          team_member_profiles (
            first_name, last_name, title, avatar_url
          )
        `)
        .eq("startup_id", startup!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });
      if (error) console.error("[users] team query error:", error.message);
      return (data ?? []) as TeamAccountRow[];
    },
  });

  // Query pending invites using startup.id
  const { data: pendingInvites = [], isLoading: loadingInvites } = useQuery<TeamInviteRow[]>({
    queryKey: ["team-invites", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("id, email, role, token, created_at, expires_at, accepted_at")
        .eq("startup_id", startup!.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) console.error("[users] invites query error:", error.message);
      return (data ?? []).filter((i) =>
        !i.expires_at || new Date(i.expires_at) > new Date()
      ) as TeamInviteRow[];
    },
  });

  const currentMemberCount = teamAccounts.length;
  const atLimit = !isFreePlan && currentMemberCount >= teamLimit;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["startup-team-accounts", startup?.id] });
    queryClient.invalidateQueries({ queryKey: ["team-invites", startup?.id] });
  };

  const handleChangeRole = async (accountId: string, newRole: string, memberName: string) => {
    if (newRole === "admin") {
      setAppointConfirm({ id: accountId, name: memberName });
      return;
    }
    const { error } = await supabase
      .from("startup_team_accounts")
      .update({ role: newRole })
      .eq("id", accountId);
    if (error) toast.error("Could not update role");
    else { toast.success("Role updated"); invalidate(); }
  };

  const confirmAppoint = async () => {
    if (!appointConfirm) return;
    const { error } = await supabase
      .from("startup_team_accounts")
      .update({ role: "admin" })
      .eq("id", appointConfirm.id);
    setAppointConfirm(null);
    if (error) toast.error("Could not appoint admin");
    else { toast.success(`${appointConfirm.name} is now an admin`); invalidate(); }
  };

  const handleRemoveMember = async (accountId: string, name: string) => {
    if (!confirm(`Remove ${name} from ${startup?.company_name ?? "your team"}?`)) return;
    const { error } = await supabase
      .from("startup_team_accounts")
      .delete()
      .eq("id", accountId);
    if (error) toast.error("Could not remove member");
    else { toast.success(`${name} removed`); invalidate(); }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await supabase.from("team_invites").delete().eq("id", inviteId);
    if (error) toast.error("Could not cancel invite");
    else { toast.success("Invite cancelled"); invalidate(); }
  };

  const handleResendInvite = async (invite: TeamInviteRow) => {
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("team_invites").update({ expires_at: newExpiry }).eq("id", invite.id);
    triggerStartupTeamInvite({
      data: {
        to: invite.email,
        inviterName: startup?.founder_name ?? user?.name ?? "Your team",
        companyName: startup?.company_name ?? "the company",
        role: invite.role,
        token: invite.token,
      },
    }).catch(() => {});
    toast.success("Invite resent");
    invalidate();
  };

  if (loadingStartup) {
    return (
      <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 80, background: "rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  if (!startup) {
    return (
      <div style={{ padding: "48px 32px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
        Team management is only available to founders.
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: "-0.03em", marginBottom: 4 }}>
            Team members
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Manage who has access to {startup.company_name ?? "your workspace"}.
          </p>
        </div>
        <button
          onClick={() => { if (!isFreePlan && !atLimit) setShowInvite(true); }}
          disabled={isFreePlan || atLimit}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: isFreePlan || atLimit ? "rgba(255,255,255,0.06)" : "#7C3AED",
            color: isFreePlan || atLimit ? "rgba(255,255,255,0.3)" : "#fff",
            border: "none", borderRadius: 8, padding: "9px 16px",
            fontSize: 13, fontWeight: 500,
            cursor: isFreePlan || atLimit ? "not-allowed" : "pointer",
          }}
        >
          <UserPlus size={14} /> Invite member
        </button>
      </div>

      {/* Free plan paywall */}
      {isFreePlan && (
        <div style={{
          background: "#111114", border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 24,
        }}>
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            Team collaboration is a paid feature
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 20, maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
            Upgrade to Starter to invite 1 team member, or Pro to invite up to 4 team members.
            Your team gets role-based access to deal rooms, documents, and analysis.
          </p>
          <a
            href="/pricing"
            style={{
              display: "inline-block", background: "#7C3AED", color: "#fff",
              padding: "10px 24px", borderRadius: 8, textDecoration: "none",
              fontSize: 14, fontWeight: 600,
            }}
          >
            View plans →
          </a>
        </div>
      )}

      {/* At limit warning */}
      {atLimit && !isFreePlan && (
        <div style={{
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 10, padding: "14px 16px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <AlertTriangle size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            You've used all {teamLimit} seat(s) on the {userPlan?.plan_name ?? ""} plan.{" "}
            <a href="/pricing" style={{ color: "#7C3AED" }}>Upgrade plan →</a>
          </span>
        </div>
      )}

      {/* Active members */}
      <div style={{ background: "#111114", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Active members</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "1px 7px" }}>
              {loadingTeam ? "…" : currentMemberCount}
            </span>
          </div>
          {!isFreePlan && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              {currentMemberCount} of {teamLimit} seats used
              {atLimit && (
                <span style={{ marginLeft: 8, fontSize: 11, background: "rgba(245,158,11,0.12)", color: "#F59E0B", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                  Limit reached
                </span>
              )}
            </span>
          )}
        </div>
        {loadingTeam ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((i) => <div key={i} style={{ height: 48, borderRadius: 8, background: "rgba(255,255,255,0.04)" }} />)}
          </div>
        ) : teamAccounts.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ marginBottom: 8, opacity: 0.4 }}><Users size={28} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>No team members yet</div>
            <div style={{ fontSize: 12 }}>Invite someone to get started.</div>
          </div>
        ) : (
          teamAccounts.map((m) => {
            const profileFirst = m.team_member_profiles?.first_name ?? "";
            const profileLast = m.team_member_profiles?.last_name ?? "";
            const profileName = [profileFirst, profileLast].filter(Boolean).join(" ");
            const name = profileName || m.display_name || "Team member";
            const avatarUrl = m.team_member_profiles?.avatar_url ?? m.avatar_url;
            const isSelf = m.user_id === user?.id;
            return (
              <MemberRow
                key={m.id}
                name={name}
                role={m.role}
                avatarUrl={avatarUrl}
                title={m.team_member_profiles?.title ?? null}
                joinedAt={m.joined_at}
                isSelf={isSelf}
                roles={FOUNDER_ROLES}
                onChangeRole={(r) => handleChangeRole(m.id, r, name)}
                onRemove={() => handleRemoveMember(m.id, name)}
              />
            );
          })
        )}
      </div>

      {/* Pending invites */}
      <div style={{ background: "#111114", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", marginTop: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Pending invites</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "1px 7px" }}>
            {loadingInvites ? "…" : pendingInvites.length}
          </span>
        </div>
        {loadingInvites ? (
          <div style={{ padding: 24 }}><div style={{ height: 48, borderRadius: 8, background: "rgba(255,255,255,0.04)" }} /></div>
        ) : pendingInvites.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
            <div style={{ marginBottom: 8, opacity: 0.4 }}><Mail size={28} /></div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>No pending invites</div>
            <div style={{ fontSize: 12 }}>Invitations you send will appear here.</div>
          </div>
        ) : (
          pendingInvites.map((inv) => (
            <PendingInviteRow
              key={inv.id}
              invite={inv}
              onCancel={() => handleCancelInvite(inv.id)}
              onResend={() => handleResendInvite(inv)}
            />
          ))
        )}
      </div>

      {/* Invite modal */}
      {showInvite && startup && (
        <InviteModal
          startup={startup}
          inviterName={startup.founder_name ?? user?.name ?? ""}
          onClose={() => setShowInvite(false)}
          onSent={() => { invalidate(); setShowInvite(false); }}
        />
      )}

      {/* Appoint admin confirmation */}
      {appointConfirm && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.7)", display: "grid", placeItems: "center", padding: 16 }}
          onClick={() => setAppointConfirm(null)}
        >
          <div
            style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 20, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", textAlign: "center", marginBottom: 8 }}>
              Appoint {appointConfirm.name} as Admin?
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6, marginBottom: 24 }}>
              Admins have full platform access and can manage other team members. Only assign this role to trusted colleagues.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setAppointConfirm(null)}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAppoint}
                style={{ flex: 1, background: "#7C3AED", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, color: "#fff", fontWeight: 600, cursor: "pointer" }}
              >
                Appoint as Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  name, role, avatarUrl, title, joinedAt, isSelf, roles, onChangeRole, onRemove,
}: {
  name: string; role: string; avatarUrl?: string | null; title?: string | null;
  joinedAt: string | null; isSelf: boolean;
  roles: { value: string; label: string }[];
  onChangeRole: (r: string) => void; onRemove: () => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "#7C3AED", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden",
      }}>
        {avatarUrl
          ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          : initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
          {name}{isSelf && <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 6 }}>(you)</span>}
        </div>
        {title && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{title}</div>}
      </div>
      <div style={{ position: "relative" }} ref={roleRef}>
        <button
          onClick={() => !isSelf && setRoleOpen((o) => !o)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: isSelf ? "default" : "pointer", padding: 0 }}
        >
          <RoleBadge role={role} />
          {!isSelf && <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>
        {roleOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
            background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            overflow: "hidden", minWidth: 200,
          }}>
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => { onChangeRole(r.value); setRoleOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 14px", fontSize: 12, fontWeight: 500,
                  color: r.value === role ? "#7C3AED" : "rgba(255,255,255,0.7)",
                  background: r.value === role ? "rgba(124,58,237,0.08)" : "transparent",
                  border: "none", cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 80, textAlign: "right" }}>
        {joinedAt ? formatDistanceToNow(new Date(joinedAt), { addSuffix: true }) : ""}
      </div>
      {!isSelf && (
        <button
          onClick={onRemove}
          title="Remove member"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function PendingInviteRow({ invite, onCancel, onResend }: { invite: TeamInviteRow; onCancel: () => void; onResend: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mail size={15} style={{ color: "rgba(255,255,255,0.3)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{invite.email}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} />
          Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
        </div>
      </div>
      <RoleBadge role={invite.role} />
      <button
        onClick={onResend}
        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "rgba(255,255,255,0.5)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
      >
        <RefreshCw size={11} /> Resend
      </button>
      <button
        onClick={onCancel}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function InviteModal({
  startup, inviterName, onClose, onSent,
}: {
  startup: { id: string; company_name: string | null };
  inviterName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FounderRole>("analyst");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { toast.error("Enter an email address"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("team_invites")
        .insert({
          startup_id: startup.id,
          email: email.trim().toLowerCase(),
          role,
          invited_by: user!.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("token")
        .single();
      if (error) throw error;
      if (data?.token) {
        triggerStartupTeamInvite({
          data: {
            to: email.trim().toLowerCase(),
            inviterName: inviterName || "Your team",
            companyName: startup.company_name ?? "the company",
            role,
            token: data.token,
          },
        }).catch(() => {});
      }
      toast.success(`Invite sent to ${email.trim()}`);
      onSent();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Invite team member</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
          They'll receive an email to join {startup.company_name} on Hockystick.
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email address</label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="alice@company.com" autoFocus style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as FounderRole)} style={inputStyle}>
            {FOUNDER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {/* Permission breakdown for selected role */}
          {FOUNDER_PERMISSIONS[role] && (
            <div style={{
              marginTop: 8,
              background: role === "admin" ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${role === "admin" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8,
              padding: "14px 16px",
            }}>
              {role === "admin" && (
                <p style={{ fontSize: 12, color: "#F59E0B", lineHeight: 1.5, marginBottom: 10 }}>
                  Admins have full platform access and can manage other team members. Only invite trusted colleagues as Admin.
                </p>
              )}
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                What a {role.charAt(0).toUpperCase() + role.slice(1)} can do
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.entries(FOUNDER_PERMISSIONS[role]).map(([perm, allowed]) => (
                  PERMISSION_LABELS[perm] ? (
                    <div key={perm} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: allowed ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>
                      <span style={{ color: allowed ? "#10B981" : "#EF4444", fontSize: 13, lineHeight: 1 }}>
                        {allowed ? "✓" : "✗"}
                      </span>
                      {PERMISSION_LABELS[perm]}
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSend} disabled={sending || !email.trim()}
            style={{ background: "#7C3AED", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, color: "#fff", fontWeight: 500, cursor: "pointer", opacity: sending || !email.trim() ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {sending && <Loader2 size={13} className="animate-spin" />}
            Send invite
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)",
  textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  padding: "10px 12px", fontSize: 13, color: "#fff",
  outline: "none", boxSizing: "border-box",
};

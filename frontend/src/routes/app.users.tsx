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
import { PermissionGate } from "@/components/app/PermissionGate";
import { LcsButton, LcsEmptyState, LcsModal, LcsTextField, LcsSelectField } from "@/components/lcs";

export const Route = createFileRoute("/app/users")({
  component: () => (
    <PermissionGate permission="manage_team">
      <UsersPage />
    </PermissionGate>
  ),
});

type FounderRole = "admin" | "manager" | "analyst" | "viewer";

// Collapsed from 4 decorative hues to LCS's 4-status vocabulary — a role
// badge isn't a lifecycle state, but each role does carry a real severity
// gradient (admin = highest-trust/most-consequential, viewer = lowest),
// so the same accent-scale reasoning used for task priority applies:
// admin=accent (elevated), manager=satisfied, analyst=attention (not a
// warning — just the remaining distinct tone), viewer=muted (base/no
// special access).
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:   { bg: "var(--lcs-progress-wash)",   text: "var(--lcs-accent)" },
  manager: { bg: "var(--lcs-satisfied-wash)",  text: "var(--lcs-satisfied)" },
  analyst: { bg: "var(--lcs-attention-wash)",  text: "var(--lcs-attention)" },
  viewer:  { bg: "var(--lcs-surface)",         text: "var(--lcs-ink-muted)" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS.viewer;
  return (
    <span style={{
      background: cfg.bg, color: cfg.text,
      padding: "2px 10px",
      fontSize: 11, fontWeight: 600, display: "inline-block", fontFamily: "var(--font-lcs-ui)",
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
    const { error } = await supabase.from("team_invites").update({ expires_at: newExpiry }).eq("id", invite.id);
    if (error) { console.error("[team] invite renew failed:", error); toast.error("Could not resend invite."); return; }
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
      <div className="p-6 lg:p-8 flex items-center justify-center" style={{ color: "var(--lcs-ink-muted)" }}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-12 text-center text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
        Team management is only available to founders.
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
            Team
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            Manage who has access to {startup.company_name ?? "your workspace"}.
          </p>
        </div>
        <LcsButton
          variant="primary"
          onClick={() => { if (!isFreePlan && !atLimit) setShowInvite(true); }}
          disabled={isFreePlan || atLimit}
        >
          <UserPlus className="h-4 w-4" /> Invite member
        </LcsButton>
      </div>

      {/* Free plan paywall */}
      {isFreePlan && (
        <div className="p-6 text-center mb-6" style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Team collaboration is a paid feature</p>
          <p className="text-xs mb-5 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            Upgrade to Starter to invite 1 team member, or Pro to invite up to 4.
            Team members get role-based access to deal rooms, documents, and analysis.
          </p>
          <a href="/pricing">
            <LcsButton variant="primary">View plans →</LcsButton>
          </a>
        </div>
      )}

      {/* At limit warning */}
      {atLimit && !isFreePlan && (
        <div className="px-4 py-3 mb-6 flex items-center gap-3" style={{ borderLeft: "3px solid var(--lcs-attention)", background: "var(--lcs-attention-wash)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-attention)" }} />
          <span className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            You've used all {teamLimit} seat(s) on the {userPlan?.plan_name ?? ""} plan.{" "}
            <a href="/pricing" style={{ color: "var(--lcs-accent)" }} className="hover:underline">Upgrade →</a>
          </span>
        </div>
      )}

      {/* Active members */}
      <div className="overflow-hidden mb-6" style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }} data-testid="active-members-section">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Active members</span>
            <span className="text-[11px] px-2 py-0.5" style={{ color: "var(--lcs-ink-muted)", background: "var(--lcs-surface)", fontFamily: "var(--font-lcs-data)" }}>
              {loadingTeam ? "…" : currentMemberCount}
            </span>
          </div>
          {!isFreePlan && (
            <span className="text-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              {currentMemberCount} of {teamLimit} seats
              {atLimit && (
                <span className="ml-2 text-[11px] font-semibold px-1.5 py-0.5" style={{ background: "var(--lcs-attention-wash)", color: "var(--lcs-attention)" }}>
                  Limit reached
                </span>
              )}
            </span>
          )}
        </div>
        {loadingTeam ? (
          <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : teamAccounts.length === 0 ? (
          <LcsEmptyState title="No team members" text="Invite your team to give them access to deal rooms and documents." />
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
      <div className="overflow-hidden mb-6" style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }} data-testid="pending-invites-section">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
          <Mail className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Pending invites</span>
          <span className="text-[11px] px-2 py-0.5" style={{ color: "var(--lcs-ink-muted)", background: "var(--lcs-surface)", fontFamily: "var(--font-lcs-data)" }}>
            {loadingInvites ? "…" : pendingInvites.length}
          </span>
        </div>
        {loadingInvites ? (
          <div className="flex items-center justify-center py-10" style={{ color: "var(--lcs-ink-muted)" }}>
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : pendingInvites.length === 0 ? (
          <LcsEmptyState title="No pending invites" text="Invitations you send will appear here." />
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

      {/* Role permissions reference */}
      <div className="overflow-hidden" style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }} data-testid="role-permissions-section">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Role permissions</span>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left font-medium pb-3 pr-4" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Permission</th>
                {FOUNDER_ROLES.map((r) => (
                  <th key={r.value} className="text-center pb-3 px-3">
                    <RoleBadge role={r.value} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(FOUNDER_PERMISSIONS.analyst).map(([perm], i) => {
                if (!PERMISSION_LABELS[perm]) return null;
                return (
                  <tr key={perm} style={{ borderTop: i > 0 ? "1px solid var(--lcs-line)" : undefined }}>
                    <td className="py-2.5 pr-4" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{PERMISSION_LABELS[perm]}</td>
                    {FOUNDER_ROLES.map((r) => {
                      const allowed = !!(FOUNDER_PERMISSIONS as any)[r.value]?.[perm];
                      return (
                        <td key={r.value} className="text-center py-2.5 px-3">
                          <span style={{ color: allowed ? "var(--lcs-satisfied)" : "var(--lcs-line)" }}>
                            {allowed ? "✓" : "–"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
        <LcsModal
          title={`Appoint ${appointConfirm.name} as Admin?`}
          onClose={() => setAppointConfirm(null)}
          footer={
            <>
              <LcsButton variant="secondary" onClick={() => setAppointConfirm(null)}>Cancel</LcsButton>
              <LcsButton variant="primary" onClick={confirmAppoint}>Appoint as Admin</LcsButton>
            </>
          }
        >
          <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            Admins have full platform access and can manage other team members. Only assign this to trusted colleagues.
          </p>
        </LcsModal>
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
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
      <div className="h-9 w-9 shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden" style={{ background: "var(--lcs-accent)", color: "var(--lcs-white)", fontFamily: "var(--font-lcs-ui)" }}>
        {avatarUrl
          ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
          : initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
          {name}{isSelf && <span className="font-normal ml-1.5 text-xs" style={{ color: "var(--lcs-ink-muted)" }}>(you)</span>}
        </div>
        {title && <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{title}</div>}
      </div>
      <div className="relative" ref={roleRef}>
        <button
          onClick={() => !isSelf && setRoleOpen((o) => !o)}
          className="inline-flex items-center gap-1 bg-transparent border-none p-0"
          style={{ cursor: isSelf ? "default" : "pointer" }}
        >
          <RoleBadge role={role} />
          {!isSelf && <ChevronDown className="h-3 w-3" style={{ color: "var(--lcs-ink-muted)" }} />}
        </button>
        {roleOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 overflow-hidden min-w-[180px]" style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }}>
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => { onChangeRole(r.value); setRoleOpen(false); }}
                className="block w-full text-left px-3.5 py-2.5 text-xs font-medium transition-colors"
                style={{ color: r.value === role ? "var(--lcs-accent)" : "var(--lcs-ink-muted)", background: r.value === role ? "var(--lcs-progress-wash)" : "transparent", fontFamily: "var(--font-lcs-ui)" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="text-[11px] min-w-[80px] text-right" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
        {joinedAt ? formatDistanceToNow(new Date(joinedAt), { addSuffix: true }) : ""}
      </div>
      {!isSelf && (
        <button
          onClick={onRemove}
          title="Remove member"
          className="transition-colors p-1"
          style={{ color: "var(--lcs-ink-muted)" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function PendingInviteRow({ invite, onCancel, onResend }: { invite: TeamInviteRow; onCancel: () => void; onResend: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
      <div className="h-9 w-9 shrink-0 flex items-center justify-center" style={{ background: "var(--lcs-surface)" }}>
        <Mail className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{invite.email}</div>
        <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
          <Clock className="h-2.5 w-2.5" />
          Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
        </div>
      </div>
      <RoleBadge role={invite.role} />
      <button
        onClick={onResend}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] transition-colors"
        style={{ border: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
      >
        <RefreshCw className="h-3 w-3" /> Resend
      </button>
      <button
        onClick={onCancel}
        className="transition-colors p-1"
        style={{ color: "var(--lcs-ink-muted)" }}
      >
        <X className="h-3.5 w-3.5" />
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
    <LcsModal
      title="Invite team member"
      onClose={onClose}
      footer={
        <>
          <LcsButton variant="secondary" onClick={onClose}>Cancel</LcsButton>
          <LcsButton variant="primary" onClick={handleSend} disabled={sending || !email.trim()}>
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send invite
          </LcsButton>
        </>
      }
    >
      <p className="text-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
        They'll receive an email to join {startup.company_name} on Lengdon.
      </p>
      <LcsTextField
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
        placeholder="alice@company.com"
        autoFocus
      />
      <div>
        <LcsSelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as FounderRole)}>
          {FOUNDER_ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </LcsSelectField>
        {FOUNDER_PERMISSIONS[role] && (
          <div className="mt-2 px-4 py-3.5" style={{ border: `1px solid ${role === "admin" ? "var(--lcs-attention)" : "var(--lcs-line)"}`, background: role === "admin" ? "var(--lcs-attention-wash)" : "var(--lcs-surface)" }}>
            {role === "admin" && (
              <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--lcs-attention)", fontFamily: "var(--font-lcs-ui)" }}>
                Admins have full platform access and can manage other team members.
              </p>
            )}
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
              What a {role} can do
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(FOUNDER_PERMISSIONS[role]).map(([perm, allowed]) => (
                PERMISSION_LABELS[perm] ? (
                  <div key={perm} className="flex items-center gap-1.5 text-xs" style={{ color: allowed ? "var(--lcs-ink)" : "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                    <span style={{ color: allowed ? "var(--lcs-satisfied)" : "var(--lcs-attention)" }}>{allowed ? "✓" : "✗"}</span>
                    {PERMISSION_LABELS[perm]}
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>
    </LcsModal>
  );
}

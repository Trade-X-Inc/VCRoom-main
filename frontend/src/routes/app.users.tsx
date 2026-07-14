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
  admin:   { bg: "rgba(124,58,237,0.15)",  text: "var(--brand)" },
  manager: { bg: "rgba(16,185,129,0.15)",  text: "#10B981" },
  analyst: { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B" },
  viewer:  { bg: "rgba(107,114,128,0.12)", text: "#6B7280" },
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
      <div className="p-6 lg:p-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        Team management is only available to founders.
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
            Team
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to {startup.company_name ?? "your workspace"}.
          </p>
        </div>
        <button
          onClick={() => { if (!isFreePlan && !atLimit) setShowInvite(true); }}
          disabled={isFreePlan || atLimit}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: isFreePlan || atLimit ? "var(--accent)" : "var(--gradient-brand)", color: isFreePlan || atLimit ? "var(--muted-foreground)" : "#fff" }}
        >
          <UserPlus className="h-4 w-4" /> Invite member
        </button>
      </div>

      {/* Free plan paywall */}
      {isFreePlan && (
        <div className="rounded-xl border border-brand/30 bg-accent p-6 text-center mb-6">
          <p className="text-sm font-semibold mb-2">Team collaboration is a paid feature</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto leading-relaxed">
            Upgrade to Starter to invite 1 team member, or Pro to invite up to 4.
            Team members get role-based access to deal rooms, documents, and analysis.
          </p>
          <a
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-lg hs-gradient text-brand-foreground px-4 py-2 text-sm font-semibold hover:bg-accent transition-colors"
          >
            View plans →
          </a>
        </div>
      )}

      {/* At limit warning */}
      {atLimit && !isFreePlan && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 mb-6 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-sm text-muted-foreground">
            You've used all {teamLimit} seat(s) on the {userPlan?.plan_name ?? ""} plan.{" "}
            <a href="/pricing" className="text-brand hover:underline">Upgrade →</a>
          </span>
        </div>
      )}

      {/* Active members */}
      <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden mb-6" data-testid="active-members-section">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Active members</span>
            <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
              {loadingTeam ? "…" : currentMemberCount}
            </span>
          </div>
          {!isFreePlan && (
            <span className="text-xs text-muted-foreground">
              {currentMemberCount} of {teamLimit} seats
              {atLimit && (
                <span className="ml-2 text-[11px] font-semibold rounded-sm px-1.5 py-0.5" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                  Limit reached
                </span>
              )}
            </span>
          )}
        </div>
        {loadingTeam ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />)}
          </div>
        ) : teamAccounts.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Users className="h-7 w-7 mx-auto mb-3 opacity-30" />
            <div className="text-sm font-medium mb-1">No team members yet</div>
            <div className="text-xs">Invite someone to get started.</div>
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
      <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden mb-6" data-testid="pending-invites-section">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Pending invites</span>
          <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
            {loadingInvites ? "…" : pendingInvites.length}
          </span>
        </div>
        {loadingInvites ? (
          <div className="p-6"><div className="h-12 rounded-lg bg-muted/40 animate-pulse" /></div>
        ) : pendingInvites.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Mail className="h-7 w-7 mx-auto mb-3 opacity-30" />
            <div className="text-sm font-medium mb-1">No pending invites</div>
            <div className="text-xs">Invitations you send will appear here.</div>
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

      {/* Role permissions reference */}
      <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden" data-testid="role-permissions-section">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
          <span className="text-sm font-semibold">Role permissions</span>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-muted-foreground font-medium pb-3 pr-4">Permission</th>
                {FOUNDER_ROLES.map((r) => (
                  <th key={r.value} className="text-center pb-3 px-3">
                    <RoleBadge role={r.value} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {Object.entries(FOUNDER_PERMISSIONS.analyst).map(([perm]) => {
                if (!PERMISSION_LABELS[perm]) return null;
                return (
                  <tr key={perm}>
                    <td className="py-2.5 pr-4 text-muted-foreground">{PERMISSION_LABELS[perm]}</td>
                    {FOUNDER_ROLES.map((r) => {
                      const allowed = !!(FOUNDER_PERMISSIONS as any)[r.value]?.[perm];
                      return (
                        <td key={r.value} className="text-center py-2.5 px-3">
                          <span className={allowed ? "text-success" : "text-muted-foreground/30"}>
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
        <div
          className="fixed inset-0 z-60 bg-black/70 grid place-items-center p-4"
          onClick={() => setAppointConfirm(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-2xl mb-3">⚠️</div>
            <div className="text-base font-semibold mb-2">Appoint {appointConfirm.name} as Admin?</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs mx-auto">
              Admins have full platform access and can manage other team members. Only assign this to trusted colleagues.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setAppointConfirm(null)}
                className="flex-1 rounded-lg border border-border/60 py-2.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAppoint}
                className="flex-1 rounded-lg hs-gradient text-brand-foreground py-2.5 text-sm font-semibold hover:bg-accent transition-colors"
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
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 last:border-0">
      <div className="h-9 w-9 rounded-full shrink-0 hs-gradient flex items-center justify-center text-xs font-bold text-white overflow-hidden">
        {avatarUrl
          ? <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
          : initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {name}{isSelf && <span className="text-muted-foreground font-normal ml-1.5 text-xs">(you)</span>}
        </div>
        {title && <div className="text-xs text-muted-foreground mt-0.5">{title}</div>}
      </div>
      <div className="relative" ref={roleRef}>
        <button
          onClick={() => !isSelf && setRoleOpen((o) => !o)}
          className="inline-flex items-center gap-1 bg-transparent border-none p-0"
          style={{ cursor: isSelf ? "default" : "pointer" }}
        >
          <RoleBadge role={role} />
          {!isSelf && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
        </button>
        {roleOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 rounded-lg border border-border/60 bg-card shadow-xl overflow-hidden min-w-[180px]">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => { onChangeRole(r.value); setRoleOpen(false); }}
                className="block w-full text-left px-3.5 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
                style={{ color: r.value === role ? "var(--brand)" : "var(--muted-foreground)", background: r.value === role ? "rgba(124,58,237,0.08)" : "transparent" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground min-w-[80px] text-right">
        {joinedAt ? formatDistanceToNow(new Date(joinedAt), { addSuffix: true }) : ""}
      </div>
      {!isSelf && (
        <button
          onClick={onRemove}
          title="Remove member"
          className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function PendingInviteRow({ invite, onCancel, onResend }: { invite: TeamInviteRow; onCancel: () => void; onResend: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 last:border-0">
      <div className="h-9 w-9 rounded-full shrink-0 bg-muted/60 flex items-center justify-center">
        <Mail className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{invite.email}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
        </div>
      </div>
      <RoleBadge role={invite.role} />
      <button
        onClick={onResend}
        className="inline-flex items-center gap-1 rounded border border-border/60 px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <RefreshCw className="h-3 w-3" /> Resend
      </button>
      <button
        onClick={onCancel}
        className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded"
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

  const inputCls = "w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
  const labelCls = "block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold mb-1">Invite team member</div>
        <div className="text-xs text-muted-foreground mb-6">
          They'll receive an email to join {startup.company_name} on Hockystick.
        </div>
        <div className="mb-4">
          <label className={labelCls}>Email address</label>
          <input
            type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="alice@company.com" autoFocus className={inputCls}
          />
        </div>
        <div className="mb-6">
          <label className={labelCls}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as FounderRole)} className={inputCls}>
            {FOUNDER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {FOUNDER_PERMISSIONS[role] && (
            <div className={`mt-2 rounded-lg border px-4 py-3.5 ${role === "admin" ? "bg-warning/5 border-warning/20" : "bg-background/40 border-border/40"}`}>
              {role === "admin" && (
                <p className="text-xs text-warning leading-relaxed mb-2">
                  Admins have full platform access and can manage other team members.
                </p>
              )}
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                What a {role} can do
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(FOUNDER_PERMISSIONS[role]).map(([perm, allowed]) => (
                  PERMISSION_LABELS[perm] ? (
                    <div key={perm} className={`flex items-center gap-1.5 text-xs ${allowed ? "text-foreground/70" : "text-muted-foreground/30"}`}>
                      <span className={allowed ? "text-success" : "text-destructive"}>{allowed ? "✓" : "✗"}</span>
                      {PERMISSION_LABELS[perm]}
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend} disabled={sending || !email.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg hs-gradient text-brand-foreground px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send invite
          </button>
        </div>
      </div>
    </div>
  );
}

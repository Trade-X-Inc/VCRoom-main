import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Users, UserPlus, Mail, X, Loader2, ChevronDown, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { triggerStartupTeamInvite } from "@/lib/email/triggers";
import { INVESTOR_ROLES, INVESTOR_PERMISSIONS, PERMISSION_LABELS } from "@/lib/roles";

export const Route = createFileRoute("/app/investor/team")({
  component: InvestorTeamPage,
});

type InvestorRole = "admin" | "associate" | "analyst" | "external";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:     { bg: "rgba(124,58,237,0.15)",  text: "#7C3AED" },
  associate: { bg: "rgba(16,185,129,0.15)",  text: "#10B981" },
  analyst:   { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B" },
  external:  { bg: "rgba(107,114,128,0.12)", text: "#6B7280" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS.external;
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

interface TeamMemberRow {
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

interface InviteRow {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  accepted_at: string | null;
}

function InvestorTeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [appointConfirm, setAppointConfirm] = useState<{ id: string; name: string } | null>(null);

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

  // Active team members
  const { data: members = [], isLoading: loadingMembers } = useQuery<TeamMemberRow[]>({
    queryKey: ["investor-team-members", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_team_accounts")
        .select(`
          id, user_id, role, status, joined_at, display_name, avatar_url,
          team_member_profiles (
            first_name, last_name, title, avatar_url
          )
        `)
        .eq("investor_profile_id", user!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });
      if (error) console.error("[investor-team] members error:", error.message);
      return (data ?? []) as TeamMemberRow[];
    },
  });

  // Pending invites
  const { data: pending = [], isLoading: loadingInvites } = useQuery<InviteRow[]>({
    queryKey: ["investor-team-invites", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_invites")
        .select("id, email, role, token, created_at, expires_at, accepted_at")
        .eq("investor_profile_id", user!.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) console.error("[investor-team] invites error:", error.message);
      return (data ?? []).filter((i) =>
        !i.expires_at || new Date(i.expires_at) > new Date()
      ) as InviteRow[];
    },
  });

  const currentMemberCount = members.length;
  const atLimit = !isFreePlan && currentMemberCount >= teamLimit;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["investor-team-members", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["investor-team-invites", user?.id] });
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

  const handleCancelInvite = async (id: string) => {
    const { error } = await supabase.from("team_invites").delete().eq("id", id);
    if (error) { toast.error("Failed to cancel invite"); return; }
    toast.success("Invite cancelled");
    invalidate();
  };

  const handleResendInvite = async (invite: InviteRow) => {
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("team_invites").update({ expires_at: newExpiry }).eq("id", invite.id);
    if (error) { console.error("[team] invite renew failed:", error); toast.error("Could not resend invite."); return; }
    triggerStartupTeamInvite({
      data: {
        to: invite.email,
        inviterName: user?.name ?? "Your team",
        companyName: "your investment team",
        role: invite.role,
        token: invite.token,
      },
    }).catch(() => {});
    toast.success("Invite resent");
    invalidate();
  };

  const handleRemoveMember = async (accountId: string, name: string) => {
    if (!confirm(`Remove ${name} from your team?`)) return;
    const { error } = await supabase.from("startup_team_accounts").delete().eq("id", accountId);
    if (error) toast.error("Could not remove member");
    else { toast.success(`${name} removed`); invalidate(); }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Team</h1>
          <p className="text-sm text-muted-foreground">
            Invite analysts and partners to collaborate on deals.
          </p>
        </div>
        <button
          onClick={() => { if (!isFreePlan && !atLimit) setShowInvite(true); }}
          disabled={isFreePlan || atLimit}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: isFreePlan || atLimit ? "var(--color-muted)" : "#7C3AED",
            color: isFreePlan || atLimit ? "rgba(255,255,255,0.3)" : "#fff",
            border: "none", borderRadius: 8, padding: "9px 16px",
            fontSize: 13, fontWeight: 500,
            cursor: isFreePlan || atLimit ? "not-allowed" : "pointer",
          }}
        >
          <UserPlus size={14} /> Invite analyst
        </button>
      </div>

      {/* Free plan paywall */}
      {isFreePlan && (
        <div className="bg-card border border-brand/30 rounded-xl p-6 text-center mb-6">
          <p className="text-base font-semibold text-foreground mb-2">Team collaboration is a paid feature</p>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto leading-relaxed">
            Upgrade to Starter to invite 1 team member, or Pro to invite up to 4.
            Your analysts get role-based access to deal rooms and documents.
          </p>
          <a href="/pricing" className="inline-block bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-semibold no-underline hover:bg-brand/90 transition-colors">
            View plans →
          </a>
        </div>
      )}

      {/* At limit */}
      {atLimit && !isFreePlan && (
        <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={14} style={{ color: "#F59E0B", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-foreground)" }}>
            You've used all {teamLimit} seat(s) on the {userPlan?.plan_name ?? ""} plan.{" "}
            <a href="/pricing" style={{ color: "#7C3AED" }}>Upgrade plan →</a>
          </span>
        </div>
      )}

      {/* Members section */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Members</span>
            <span className="text-xs text-muted-foreground bg-accent rounded-full px-2 py-px">
              {loadingMembers ? "…" : currentMemberCount + 1}
            </span>
          </div>
          {!isFreePlan && (
            <span className="text-xs text-muted-foreground">
              {currentMemberCount} of {teamLimit} seats used
              {atLimit && (
                <span className="ml-2 text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-semibold">
                  Limit reached
                </span>
              )}
            </span>
          )}
        </div>

        {/* Owner row */}
        <div className="flex items-center px-5 py-3.5 border-b border-border/40 gap-3">
          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--color-foreground)" }}>
            {initials(user?.name ?? user?.email ?? "?")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">
              {user?.name || "You"} <span className="text-muted-foreground font-normal">(you)</span>
            </div>
            <div className="text-xs text-muted-foreground mt-px">{user?.email}</div>
          </div>
          <span className="text-xs font-semibold bg-brand/15 text-brand px-2.5 py-0.5 rounded-full">Owner</span>
        </div>

        {loadingMembers ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2].map((i) => <div key={i} style={{ height: 48, borderRadius: 8, background: "var(--color-muted)" }} />)}
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--color-muted-foreground)", fontSize: 13 }}>
            No team members yet — invite someone to collaborate.
          </div>
        ) : (
          members.map((m) => {
            const profileFirst = m.team_member_profiles?.first_name ?? "";
            const profileLast = m.team_member_profiles?.last_name ?? "";
            const profileName = [profileFirst, profileLast].filter(Boolean).join(" ");
            const name = profileName || m.display_name || "Team member";
            const avatarUrl = m.team_member_profiles?.avatar_url ?? m.avatar_url;
            return (
              <MemberRow
                key={m.id}
                name={name}
                role={m.role}
                avatarUrl={avatarUrl}
                title={m.team_member_profiles?.title ?? null}
                joinedAt={m.joined_at}
                roles={INVESTOR_ROLES}
                onChangeRole={(r) => handleChangeRole(m.id, r, name)}
                onRemove={() => handleRemoveMember(m.id, name)}
              />
            );
          })
        )}
      </div>

      {/* Pending invites */}
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Pending invites</span>
          <span className="text-xs text-muted-foreground bg-accent rounded-full px-2 py-px">
            {loadingInvites ? "…" : pending.length}
          </span>
        </div>
        {loadingInvites ? (
          <div className="p-6"><div className="h-12 rounded-lg bg-accent/40" /></div>
        ) : pending.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-muted-foreground">No pending invites.</div>
        ) : (
          pending.map((inv) => (
            <PendingRow key={inv.id} invite={inv} onCancel={() => handleCancelInvite(inv.id)} onResend={() => handleResendInvite(inv)} />
          ))
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          inviterName={user?.name ?? ""}
          investorProfileId={user?.id ?? ""}
          invitedBy={user?.id ?? ""}
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
            className="bg-card border border-border/60 rounded-2xl p-7 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xl text-center mb-3">⚠️</div>
            <div className="text-base font-semibold text-foreground text-center mb-2">
              Appoint {appointConfirm.name} as Admin?
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-6">
              Admins have full platform access and can manage other team members. Only assign this role to trusted colleagues.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setAppointConfirm(null)} className="flex-1 bg-accent text-muted-foreground hover:text-foreground border-0 rounded-lg py-2.5 text-sm cursor-pointer transition-colors">
                Cancel
              </button>
              <button onClick={confirmAppoint} className="flex-1 bg-brand text-white border-0 rounded-lg py-2.5 text-sm font-semibold cursor-pointer hover:bg-brand/90 transition-colors">
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
  name, role, avatarUrl, title, joinedAt, roles, onChangeRole, onRemove,
}: {
  name: string; role: string; avatarUrl?: string | null; title?: string | null;
  joinedAt: string | null;
  roles: { value: string; label: string }[];
  onChangeRole: (r: string) => void; onRemove: () => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--color-foreground)", overflow: "hidden" }}>
        {avatarUrl ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-foreground)" }}>{name}</div>
        {title && <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginTop: 1 }}>{title}</div>}
      </div>
      <div style={{ position: "relative" }} ref={roleRef}>
        <button
          onClick={() => setRoleOpen((o) => !o)}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
        >
          <RoleBadge role={role} />
          <ChevronDown size={12} style={{ color: "var(--color-muted-foreground)" }} />
        </button>
        {roleOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-20 bg-card border border-border/60 rounded-lg overflow-hidden min-w-[200px]">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => { onChangeRole(r.value); setRoleOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 12, fontWeight: 500, color: r.value === role ? "#7C3AED" : "rgba(255,255,255,0.7)", background: r.value === role ? "rgba(124,58,237,0.08)" : "transparent", border: "none", cursor: "pointer" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", minWidth: 80, textAlign: "right" }}>
        {joinedAt ? formatDistanceToNow(new Date(joinedAt), { addSuffix: true }) : ""}
      </div>
      <button
        onClick={onRemove}
        style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function PendingRow({ invite, onCancel, onResend }: { invite: InviteRow; onCancel: () => void; onResend: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--color-border)", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Mail size={15} style={{ color: "var(--color-muted-foreground)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-foreground)" }}>{invite.email}</div>
        <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={10} />
          Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
        </div>
      </div>
      <RoleBadge role={invite.role} />
      <button onClick={onResend} style={{ background: "transparent", border: "1px solid var(--color-border)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "var(--color-foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        <RefreshCw size={11} /> Resend
      </button>
      <button onClick={onCancel} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)", padding: 4, borderRadius: 4, display: "flex", alignItems: "center" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}>
        <X size={14} />
      </button>
    </div>
  );
}

function InviteModal({
  inviterName, investorProfileId, invitedBy, onClose, onSent,
}: {
  inviterName: string;
  investorProfileId: string;
  invitedBy: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvestorRole>("analyst");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { toast.error("Enter an email address"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("team_invites")
        .insert({
          investor_profile_id: investorProfileId,
          startup_id: null,
          email: email.trim().toLowerCase(),
          role,
          invited_by: invitedBy,
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
            companyName: "your investment team",
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
        style={{ background: "#111114", border: "1px solid var(--color-border)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-foreground)", marginBottom: 4 }}>Invite team member</div>
        <div style={{ fontSize: 12, color: "var(--color-muted-foreground)", marginBottom: 24 }}>
          They'll receive an email to join your investment team on Hockystick.
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }} placeholder="analyst@fund.com" autoFocus style={inputStyle} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as InvestorRole)} style={inputStyle}>
            {INVESTOR_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          {/* Permission breakdown for selected role */}
          {INVESTOR_PERMISSIONS[role] && (
            <div style={{
              marginTop: 8,
              background: role === "admin" || role === "external" ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${role === "admin" || role === "external" ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8,
              padding: "14px 16px",
            }}>
              {role === "external" && (
                <p style={{ fontSize: 12, color: "#F59E0B", lineHeight: 1.6, marginBottom: 10 }}>
                  External analysts can only access deal rooms you explicitly assign them to. They cannot see your startup discovery feed, pipeline, or thesis. Use this role for third-party DD firms and agencies.
                </p>
              )}
              {role === "admin" && (
                <p style={{ fontSize: 12, color: "#F59E0B", lineHeight: 1.5, marginBottom: 10 }}>
                  Admins have full platform access and can manage other team members. Only invite trusted colleagues as Admin.
                </p>
              )}
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-muted-foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                What a {role.charAt(0).toUpperCase() + role.slice(1)} can do
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.entries(INVESTOR_PERMISSIONS[role]).map(([perm, allowed]) => (
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
          <button onClick={onClose} style={{ background: "var(--color-muted)", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: "var(--color-foreground)", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSend} disabled={sending || !email.trim()}
            style={{ background: "#7C3AED", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, color: "var(--color-foreground)", fontWeight: 500, cursor: "pointer", opacity: sending || !email.trim() ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
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
  fontSize: 11, fontWeight: 600, color: "var(--color-muted-foreground)",
  textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--color-muted)",
  border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "10px 12px", fontSize: 13, color: "var(--color-foreground)",
  outline: "none", boxSizing: "border-box",
};

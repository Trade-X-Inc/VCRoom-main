import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Mail, X, Loader2, ChevronDown, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { triggerStartupTeamInvite } from "@/lib/email/triggers";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

type TeamRole = "admin" | "manager" | "analyst" | "viewer";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:   { bg: "rgba(124,58,237,0.15)",  text: "#7C3AED" },
  manager: { bg: "rgba(16,185,129,0.15)",  text: "#10B981" },
  analyst: { bg: "rgba(245,158,11,0.15)",  text: "#F59E0B" },
  viewer:  { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.5)" },
};

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  admin:   "Full platform access — deal rooms, documents, pipeline, team management.",
  manager: "Access to deal rooms, documents, and pipeline they are assigned to.",
  analyst: "Review documents and run due diligence analysis on assigned deal rooms.",
  viewer:  "Read-only access to documents in assigned deal rooms.",
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS.viewer;
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.text,
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 600,
      display: "inline-block",
    }}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
}

interface TeamAccountRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  users: { full_name: string | null; email: string | null } | null;
  team_member_profiles: { avatar_url: string | null; title: string | null } | null;
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

  const { data: startup } = useQuery({
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

  const { data: teamAccounts = [], isLoading: loadingTeam } = useQuery<TeamAccountRow[]>({
    queryKey: ["startup-team-accounts", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_team_accounts")
        .select("id, user_id, role, joined_at, users(full_name, email), team_member_profiles(avatar_url, title)")
        .eq("startup_id", startup!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: true });
      return (data ?? []) as TeamAccountRow[];
    },
  });

  const { data: pendingInvites = [], isLoading: loadingInvites } = useQuery<TeamInviteRow[]>({
    queryKey: ["team-invites", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_invites")
        .select("id, email, role, token, created_at, expires_at, accepted_at")
        .eq("startup_id", startup!.id)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      return (data ?? []).filter((i) =>
        !i.expires_at || new Date(i.expires_at) > new Date()
      ) as TeamInviteRow[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["startup-team-accounts", startup?.id] });
    queryClient.invalidateQueries({ queryKey: ["team-invites", startup?.id] });
  };

  const handleChangeRole = async (accountId: string, newRole: string) => {
    const { error } = await supabase
      .from("startup_team_accounts")
      .update({ role: newRole })
      .eq("id", accountId);
    if (error) toast.error("Could not update role");
    else { toast.success("Role updated"); invalidate(); }
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
    const { error } = await supabase
      .from("team_invites")
      .delete()
      .eq("id", inviteId);
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

  const isFounder = !!startup;

  if (!isFounder && !loadingTeam) {
    return (
      <div style={{ padding: "48px 32px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
        Team management is only available to founders.
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fff", letterSpacing: "-0.03em", marginBottom: 4 }}>
            Team members
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Manage who has access to {startup?.company_name ?? "your workspace"}.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#7C3AED", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 16px", fontSize: 13,
            fontWeight: 500, cursor: "pointer",
          }}
        >
          <UserPlus size={14} /> Invite member
        </button>
      </div>

      {/* Active members */}
      <Section title="Active members" count={teamAccounts.length} loading={loadingTeam}>
        {teamAccounts.length === 0 ? (
          <EmptyState icon={<Users size={28} />} text="No team members yet" sub="Invite someone to get started." />
        ) : (
          teamAccounts.map((m) => {
            const name = m.users?.full_name ?? "Unknown";
            const email = m.users?.email ?? "";
            const isSelf = m.user_id === user?.id;
            const avatarUrl = (m.team_member_profiles as any)?.avatar_url;
            return (
              <MemberRow
                key={m.id}
                name={name}
                email={email}
                role={m.role}
                avatarUrl={avatarUrl}
                title={(m.team_member_profiles as any)?.title}
                joinedAt={m.joined_at}
                isSelf={isSelf}
                onChangeRole={(r) => handleChangeRole(m.id, r)}
                onRemove={() => handleRemoveMember(m.id, name)}
              />
            );
          })
        )}
      </Section>

      {/* Pending invites */}
      <Section title="Pending invites" count={pendingInvites.length} loading={loadingInvites} style={{ marginTop: 24 }}>
        {pendingInvites.length === 0 ? (
          <EmptyState icon={<Mail size={28} />} text="No pending invites" sub="Invitations you send will appear here." />
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
      </Section>

      {showInvite && startup && (
        <InviteModal
          startup={startup}
          inviterName={startup.founder_name ?? user?.name ?? ""}
          onClose={() => setShowInvite(false)}
          onSent={invalidate}
        />
      )}
    </div>
  );
}

function Section({
  title, count, loading, children, style,
}: {
  title: string; count: number; loading: boolean; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ background: "#111114", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", ...style }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{title}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: "1px 7px" }}>
          {loading ? "…" : count}
        </span>
      </div>
      {loading ? (
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2].map((i) => <div key={i} style={{ height: 48, borderRadius: 8, background: "rgba(255,255,255,0.04)" }} />)}
        </div>
      ) : children}
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
      <div style={{ marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{text}</div>
      <div style={{ fontSize: 12 }}>{sub}</div>
    </div>
  );
}

function MemberRow({
  name, email, role, avatarUrl, title, joinedAt, isSelf, onChangeRole, onRemove,
}: {
  name: string; email: string; role: string; avatarUrl?: string | null; title?: string | null;
  joinedAt: string | null; isSelf: boolean;
  onChangeRole: (r: string) => void; onRemove: () => void;
}) {
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 12 }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden",
      }}>
        {avatarUrl
          ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          : initials(name)}
      </div>

      {/* Name + email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>
          {name}{isSelf && <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: 6 }}>(you)</span>}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
          {title ? `${title} · ${email}` : email}
        </div>
      </div>

      {/* Role badge / dropdown */}
      <div style={{ position: "relative" }} ref={roleRef}>
        <button
          onClick={() => !isSelf && setRoleOpen((o) => !o)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "transparent", border: "none", cursor: isSelf ? "default" : "pointer", padding: 0,
          }}
        >
          <RoleBadge role={role} />
          {!isSelf && <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>
        {roleOpen && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20,
            background: "#1a1a1f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            overflow: "hidden", minWidth: 130,
          }}>
            {(["admin", "manager", "analyst", "viewer"] as TeamRole[]).map((r) => (
              <button
                key={r}
                onClick={() => { onChangeRole(r); setRoleOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 14px", fontSize: 12, fontWeight: 500,
                  color: r === role ? "#7C3AED" : "rgba(255,255,255,0.7)",
                  background: r === role ? "rgba(124,58,237,0.08)" : "transparent",
                  border: "none", cursor: "pointer",
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Joined */}
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 80, textAlign: "right" }}>
        {joinedAt ? formatDistanceToNow(new Date(joinedAt), { addSuffix: true }) : ""}
      </div>

      {/* Remove */}
      {!isSelf && (
        <button
          onClick={onRemove}
          title="Remove member"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.25)", padding: 4, borderRadius: 4,
            display: "flex", alignItems: "center",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function PendingInviteRow({
  invite, onCancel, onResend,
}: {
  invite: TeamInviteRow; onCancel: () => void; onResend: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
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
        title="Resend invite"
        style={{
          background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, padding: "5px 10px", fontSize: 11,
          color: "rgba(255,255,255,0.5)", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <RefreshCw size={11} /> Resend
      </button>
      <button
        onClick={onCancel}
        title="Cancel invite"
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.25)", padding: 4, borderRadius: 4,
          display: "flex", alignItems: "center",
        }}
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
  const [role, setRole] = useState<TeamRole>("analyst");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) { toast.error("Enter an email address"); return; }
    if (!startup.id) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("team_invites")
        .insert({
          startup_id: startup.id,
          email: email.trim().toLowerCase(),
          role,
          invited_by: user!.id,
        })
        .select("token")
        .single();
      if (error) throw error;
      setSent(true);
      onSent();
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

        {sent ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Invite sent</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
              {email} will receive an email with a link to join.
            </div>
            <button onClick={() => { setSent(false); setEmail(""); setRole("analyst"); }}
              style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "rgba(255,255,255,0.6)", cursor: "pointer", marginRight: 8 }}>
              Invite another
            </button>
            <button onClick={onClose}
              style={{ background: "#7C3AED", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "#fff", cursor: "pointer" }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@company.com"
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#fff",
                  outline: "none", boxSizing: "border-box",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                Role
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["admin", "manager", "analyst", "viewer"] as TeamRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    style={{
                      padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: "pointer",
                      border: "1px solid",
                      borderColor: role === r ? "#7C3AED" : "rgba(255,255,255,0.1)",
                      background: role === r ? "rgba(124,58,237,0.15)" : "transparent",
                      color: role === r ? "#7C3AED" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1.5 }}>
                {ROLE_DESCRIPTIONS[role]}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#7C3AED", border: "none", borderRadius: 8,
                  padding: "9px 18px", fontSize: 13, fontWeight: 500,
                  color: "#fff", cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                Send invite
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

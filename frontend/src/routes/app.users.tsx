import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Search, Mail, Copy, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

type Role = "Owner" | "Admin" | "Member" | "Viewer";

const roleColor: Record<string, string> = {
  Owner: "bg-violet/10 text-violet border-violet/20",
  Admin: "bg-brand/10 text-brand border-brand/20",
  Member: "bg-accent text-foreground border-border/60",
  Viewer: "bg-muted text-muted-foreground border-border/60",
  investor: "bg-success/10 text-success border-success/20",
  founder: "bg-brand/10 text-brand border-brand/20",
};

interface InviteRow {
  id: string;
  email: string;
  role: string;
  deal_room_id: string | null;
  invited_by: string;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
  token: string;
}

interface MemberRow {
  user_id: string;
  role: string;
  created_at: string;
  users: { full_name: string; email?: string } | null;
}

function UsersPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"team" | "invites">("team");
  const [q, setQ] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  // Fetch workspace members via organization_members (graceful fallback)
  const { data: members = [], isLoading: membersLoading } = useQuery<MemberRow[]>({
    queryKey: ["org-members", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("organization_members")
          .select("user_id, role, created_at, users(full_name)")
          .order("created_at", { ascending: true });
        if (error) return [];
        return (data ?? []) as MemberRow[];
      } catch {
        return [];
      }
    },
  });

  // Fetch pending invites (workspace-level: deal_room_id IS NULL, or all sent by this user)
  const { data: invites = [], isLoading: invitesLoading } = useQuery<InviteRow[]>({
    queryKey: ["my-invites", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("id, email, role, deal_room_id, invited_by, accepted_at, expires_at, created_at, token")
        .eq("invited_by", user!.id)
        .is("deal_room_id", null)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as InviteRow[];
    },
  });

  const pendingInvites = invites.filter(
    (i) => !i.accepted_at && (!i.expires_at || new Date(i.expires_at) > new Date()),
  );

  const filteredMembers = members.filter((m) => {
    if (!q) return true;
    const name = m.users?.full_name ?? "";
    return name.toLowerCase().includes(q.toLowerCase());
  });

  const filteredInvites = invites.filter((i) =>
    !q || i.email.toLowerCase().includes(q.toLowerCase()),
  );

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this invite?")) return;
    const { error } = await supabase.from("invites").delete().eq("id", id);
    if (error) {
      toast.error("Could not revoke invite");
    } else {
      toast.success("Invite revoked");
      queryClient.invalidateQueries({ queryKey: ["my-invites", user?.id] });
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/join/${token}`;
    navigator.clipboard?.writeText(link);
    toast.success("Link copied");
  };

  // Build member list: always include current user as Owner
  const selfRow: MemberRow = {
    user_id: user?.id ?? "",
    role: "Owner",
    created_at: new Date().toISOString(),
    users: { full_name: user?.name ?? "You" },
  };
  const allMembers = [selfRow, ...filteredMembers.filter((m) => m.user_id !== user?.id)];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">Team & users</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage who can access your workspace and deal rooms.</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm font-medium shadow-glow"
        >
          <UserPlus className="h-4 w-4" /> Invite people
        </button>
      </div>

      {/* Tabs + search */}
      <div className="mt-6 flex items-center gap-2 border-b border-border/60">
        {([
          { k: "team", l: "Team", count: allMembers.length },
          { k: "invites", l: "Invites", count: pendingInvites.length },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.l} <span className="ml-1 text-xs text-muted-foreground tabular-nums">{t.count}</span>
            {tab === t.k && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
        ))}
        <div className="ml-auto relative pb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-64 rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>
      </div>

      {/* Team tab */}
      {tab === "team" && (
        <>
          {membersLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_60px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <div>Member</div><div>Role</div><div>Joined</div><div></div>
              </div>
              <div className="divide-y divide-border/60">
                {allMembers.map((m) => {
                  const name = m.users?.full_name ?? "Unknown";
                  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
                  const isSelf = m.user_id === user?.id;
                  return (
                    <div key={m.user_id} className="grid grid-cols-[1.6fr_1fr_1fr_60px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{name}{isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</div>
                        </div>
                      </div>
                      <div>
                        <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium border ${roleColor[m.role] ?? roleColor.Member}`}>
                          {m.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isSelf ? "Owner" : formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                      </div>
                      <div />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {allMembers.length <= 1 && !membersLoading && (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-card p-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <div className="text-sm font-medium">Just you for now</div>
              <div className="text-xs text-muted-foreground mt-1">Invite your first team member to get started.</div>
              <button onClick={() => setShowInvite(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow">
                <UserPlus className="h-3.5 w-3.5" /> Invite someone
              </button>
            </div>
          )}
        </>
      )}

      {/* Invites tab */}
      {tab === "invites" && (
        <>
          {invitesLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border/60 bg-card p-8 text-center">
              <Mail className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <div className="text-sm font-medium">No pending invites</div>
              <div className="text-xs text-muted-foreground mt-1">Invited people will appear here.</div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
              <div className="grid grid-cols-[1.6fr_1fr_1fr_80px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <div>Email</div><div>Role</div><div>Sent</div><div></div>
              </div>
              <div className="divide-y divide-border/60">
                {filteredInvites.map((inv) => {
                  const expired = inv.expires_at ? new Date(inv.expires_at) < new Date() : false;
                  const accepted = !!inv.accepted_at;
                  const status = accepted ? "Accepted" : expired ? "Expired" : "Pending";
                  const statusCls = accepted
                    ? "bg-success/10 text-success border-success/20"
                    : expired
                    ? "bg-muted text-muted-foreground border-border/60"
                    : "bg-warning/10 text-warning border-warning/20";
                  return (
                    <div key={inv.id} className="grid grid-cols-[1.6fr_1fr_1fr_80px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{inv.email}</span>
                      </div>
                      <div>
                        <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium border ${roleColor[inv.role] ?? roleColor.Member}`}>
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                        <div className="mt-0.5">
                          <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${statusCls}`}>{status}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {!accepted && !expired && (
                          <>
                            <button
                              title="Copy invite link"
                              onClick={() => copyInviteLink(inv.token)}
                              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title="Revoke"
                              onClick={() => handleRevoke(inv.id)}
                              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showInvite && (
        <InviteModal
          userId={user?.id ?? ""}
          onClose={() => setShowInvite(false)}
          onSent={() => queryClient.invalidateQueries({ queryKey: ["my-invites", user?.id] })}
        />
      )}
    </div>
  );
}

function InviteModal({ userId, onClose, onSent }: { userId: string; onClose: () => void; onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Member");
  const [sending, setSending] = useState(false);
  const [sentToken, setSentToken] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) { toast.error("Enter an email address"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("invites")
        .insert({
          email: email.trim().toLowerCase(),
          role: role.toLowerCase(),
          invited_by: userId,
          deal_room_id: null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("token")
        .single();
      if (error) throw error;
      setSentToken(data?.token ?? null);
      toast.success("Invite created");
      onSent();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const inviteLink = sentToken ? `${window.location.origin}/join/${sentToken}` : null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border/60 bg-popover shadow-elev overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="text-sm font-semibold">Invite people to your workspace</div>
          <div className="mt-0.5 text-xs text-muted-foreground">They'll receive a secure invite link.</div>
        </div>

        {sentToken ? (
          <div className="p-6">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success mb-4">
              <Check className="h-6 w-6" />
            </div>
            <div className="text-sm font-medium text-center">Invite created</div>
            <div className="mt-1 text-xs text-muted-foreground text-center mb-4">Share this link with {email}</div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-accent/30 p-2">
              <code className="flex-1 truncate text-[11px] px-1">{inviteLink}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(inviteLink!); toast.success("Copied"); }}
                className="grid h-8 w-8 place-items-center rounded-md border border-border/60 hover:bg-accent shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={onClose} className="mt-4 w-full rounded-md bg-foreground text-background py-2 text-sm font-medium">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium">Email address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="alice@firm.com"
                className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              >
                {(["Admin", "Member", "Viewer"] as Role[]).map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">Cancel</button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm font-medium shadow-glow disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Send invite
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

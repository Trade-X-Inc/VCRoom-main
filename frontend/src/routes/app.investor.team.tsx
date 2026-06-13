import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Users, UserPlus, X, Loader2, Mail, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { triggerDealRoomInvite } from "@/lib/email/triggers";

export const Route = createFileRoute("/app/investor/team")({
  component: TeamPage,
});

function TeamPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch pending invites sent by this user
  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ["investor-invites", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("id, email, role, created_at, accepted_at")
        .eq("invited_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const pending = invites.filter((i: any) => !i.accepted_at);
  const accepted = invites.filter((i: any) => !!i.accepted_at);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user?.id) return;
    setSending(true);
    try {
      const { data: inserted, error } = await supabase
        .from("invites")
        .insert({
          email: inviteEmail.trim().toLowerCase(),
          role: "investor",
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("token")
        .single();
      if (error) throw error;

      // Send invite email non-blocking
      if (inserted?.token) {
        triggerDealRoomInvite({
          data: {
            to: inviteEmail.trim().toLowerCase(),
            investorName: "there",
            founderName: user.fullName || "Your contact",
            companyName: user.fullName ? `${user.fullName}'s workspace` : "Hockystick",
            inviteToken: inserted.token,
          },
        }).catch(() => {});
      }

      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
      queryClient.invalidateQueries({ queryKey: ["investor-invites", user.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    const { error } = await supabase.from("invites").delete().eq("id", id);
    if (error) { toast.error("Failed to cancel invite"); return; }
    toast.success("Invite cancelled");
    queryClient.invalidateQueries({ queryKey: ["investor-invites", user?.id] });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <div className="text-sm text-muted-foreground">Invite analysts and partners to collaborate on deals</div>
        </div>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
        >
          <UserPlus className="h-4 w-4" /> Invite analyst
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="mt-5 rounded-2xl border border-brand/30 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Send an invite</div>
            <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder="colleague@fund.com"
                className="w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={sending || !inviteEmail.trim()}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60"
            >
              {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            They'll receive a link to join as an investor collaborator.
          </p>
        </div>
      )}

      {/* Current user as team member */}
      <div className="mt-6">
        <div className="text-sm font-semibold mb-3">Members</div>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-brand-foreground font-semibold text-sm">
              {user?.fullName?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{user?.fullName || "You"}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
            <span className="text-[10px] font-medium rounded-full bg-brand/10 text-brand px-2 py-0.5">Owner</span>
          </div>
        </div>

        {/* Accepted invites */}
        {accepted.length > 0 && (
          <div className="mt-2 space-y-2">
            {accepted.map((inv: any) => (
              <div key={inv.id} className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-semibold text-muted-foreground">
                  {inv.email[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(inv.accepted_at), { addSuffix: true })}
                  </div>
                </div>
                <span className="text-[10px] font-medium rounded-full bg-success/10 text-success px-2 py-0.5">Analyst</span>
              </div>
            ))}
          </div>
        )}

        {accepted.length === 0 && !showInvite && (
          <div className="mt-4 rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">Just you so far</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Invite analysts and partners to collaborate on deals together.
            </p>
          </div>
        )}
      </div>

      {/* Pending invites */}
      <div className="mt-8">
        <div className="text-sm font-semibold mb-3">Pending invites</div>
        {invitesLoading ? (
          <div className="h-20 rounded-2xl border border-border/60 bg-card animate-pulse" />
        ) : pending.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground text-center">
            No pending invites.
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((inv: any) => (
              <div key={inv.id} className="rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{inv.email}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Sent {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                  </div>
                </div>
                <span className="text-[10px] rounded-full bg-warning/10 text-warning px-2 py-0.5">Pending</span>
                <button
                  onClick={() => handleCancelInvite(inv.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Cancel invite"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

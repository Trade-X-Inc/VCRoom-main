import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Gift } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { generateReferralCode, getReferralStats } from "@/lib/referral";
import { toast } from "sonner";

export const Route = createFileRoute("/app/referrals")({
  head: () => ({
    meta: [{ title: "Referrals — Hockystick" }],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.user?.id || context.user?.role !== "founder") {
      throw new Error("Unauthorized");
    }
  },
  component: Referrals,
});

function Referrals() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user?.id) {
    return <div>Loading...</div>;
  }

  const referralCode = generateReferralCode(user.id);
  const referralLink = `${window.location.origin}/invite?ref=${referralCode}`;

  // Get referral stats
  const { data: stats } = useQuery({
    queryKey: ["referral-stats", user.id],
    enabled: !!user.id,
    queryFn: () => getReferralStats(user.id),
  });

  // Get list of referrals
  const { data: referrals } = useQuery({
    queryKey: ["referrals-list", user.id],
    enabled: !!user.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteBonus = Math.floor((stats?.invited ?? 0) / 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Referrals</h1>
        <p className="text-muted-foreground">
          Invite founders and investors to Hockystick and unlock benefits.
        </p>
      </div>

      {/* Your Referral Link */}
      <div className="bg-card border border-border/60 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Your referral link</h2>
          <p className="text-sm text-muted-foreground">
            Share this link with others. They'll get exclusive founding member benefits.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-3 py-2 border border-border/60 rounded-lg bg-background text-foreground text-sm font-mono"
          />
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-6">
          <div className="text-sm text-muted-foreground mb-1">People invited</div>
          <div className="text-3xl font-semibold">{stats?.invited ?? 0}</div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-6">
          <div className="text-sm text-muted-foreground mb-1">Joined</div>
          <div className="text-3xl font-semibold">{stats?.converted ?? 0}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Bonus unlocked</span>
          </div>
          <div className="text-2xl font-semibold">
            +{inviteBonus} deal room{inviteBonus !== 1 ? "s" : ""}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Every 3 invites = 1 extra deal room
          </p>
        </div>
      </div>

      {/* Invited People Table */}
      <div className="bg-card border border-border/60 rounded-xl p-6">
        <h3 className="font-semibold mb-4">People you've invited</h3>

        {referrals && referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Invited</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((referral: any) => (
                  <tr
                    key={referral.id}
                    className="border-b border-border/60 hover:bg-background/50 transition-colors"
                  >
                    <td className="py-3 px-2">{referral.joinee_email}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          referral.status === "joined"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {referral.status === "joined" ? "Joined" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">You haven't invited anyone yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Share your referral link to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

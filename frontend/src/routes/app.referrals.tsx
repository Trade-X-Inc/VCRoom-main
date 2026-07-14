import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Gift, Users } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { generateReferralCode, getReferralStats } from "@/lib/referral";
import { toast } from "sonner";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Hockystick" }] }),
  component: Referrals,
});

function Referrals() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user?.id ? generateReferralCode(user.id) : "";
  const referralLink = user?.id
    ? `${typeof window !== "undefined" ? window.location.origin : "https://hockystick.app"}/invite?ref=${referralCode}`
    : "";

  const { data: stats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    enabled: !!user?.id,
    queryFn: () => getReferralStats(user!.id),
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals-list", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Referrals
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Invite others to Hockystick and unlock extra deal rooms.
        </p>
      </div>

      {/* Referral link */}
      <div className="rounded-lg border border-brand/20 bg-accent p-6">
        <h2 className="text-sm font-semibold mb-1">Your referral link</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Share this link. Every 3 people who join = 1 extra deal room for you.
        </p>
        <div className="flex gap-2">
          <input readOnly value={referralLink}
            className="flex-1 px-3 py-2 rounded-lg border border-border/60 bg-background text-sm font-mono text-muted-foreground" />
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg hs-gradient text-brand-foreground text-sm font-semibold hover:bg-accent transition-colors whitespace-nowrap">
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="rounded-none border border-border/60 bg-card p-5">
          <div className="text-xs text-muted-foreground mb-1">People invited</div>
          <div className="text-3xl font-bold text-brand">{stats?.invited ?? 0}</div>
        </div>
        <div className="rounded-none border border-border/60 bg-card p-5">
          <div className="text-xs text-muted-foreground mb-1">Joined</div>
          <div className="text-3xl font-bold text-brand">{stats?.converted ?? 0}</div>
        </div>
        <div className="rounded-lg border border-brand/20 bg-accent p-5">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift className="h-3.5 w-3.5 text-brand" />
            <span className="text-xs font-semibold text-brand">Bonus unlocked</span>
          </div>
          <div className="text-2xl font-bold">+{inviteBonus} deal room{inviteBonus !== 1 ? "s" : ""}</div>
          <p className="text-xs text-muted-foreground mt-1">Every 3 invites = 1 extra deal room</p>
        </div>
      </div>

      {/* Referrals table */}
      <div className="rounded-none border border-border/60 bg-card p-5">
        <h3 className="text-sm font-semibold mb-4">People you've invited</h3>
        {(referrals as any[]).length === 0 ? (
          <EmptyState kind="empty" title="No invites sent" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {(referrals as any[]).map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 px-2">{r.joinee_email}</td>
                  <td className="py-2.5 px-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${r.status === "joined" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                      {r.status === "joined" ? "Joined" : "Pending"}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

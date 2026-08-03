import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Loader2, Users, Clock, CheckCircle2, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/connections")({
  component: ConnectionRequestsPage,
});

// ── Incoming connection requests (investor → founder) ─────────────────────
// Approve is CONFIRM-FIRST: it creates a deal room visible to the investor,
// so the confirmation card below must be acknowledged before the call.

export function ConnectionRequestsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["incoming-connection-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: myStartups } = await supabase
        .from("startups").select("id, company_name").eq("founder_id", user!.id);
      const startupIds = (myStartups ?? []).map((s: any) => s.id);
      if (!startupIds.length) return [];

      const { data: reqs } = await supabase
        .from("discovery_requests")
        .select("id, investor_id, startup_id, status, message, created_at")
        .in("startup_id", startupIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!reqs?.length) return [];

      // investor_profiles has no bare peer-read RLS anymore — whitelist-filtered
      // batch RPC only. check_size_min/max only appear if that investor has
      // whitelisted them under Public visibility.
      const { data: profiles } = await supabase.rpc("get_public_investor_profiles_by_user_ids", {
        p_user_ids: reqs.map((r: any) => r.investor_id),
      });
      const pmap = Object.fromEntries(((profiles ?? []) as any[]).map((p) => [p.user_id, p]));
      return reqs.map((r: any) => ({ ...r, profile: pmap[r.investor_id] ?? null }));
    },
  });

  const approve = async (requestId: string) => {
    setActingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const { approveConnectionRequest } = await import("@/lib/connection-request-fn");
      const result = await approveConnectionRequest({
        data: { userAccessToken: session.access_token, requestId },
      });
      if (result.ok && result.dealRoomId) {
        toast.success("Deal room created — investor notified");
        qc.invalidateQueries({ queryKey: ["incoming-connection-requests", user?.id] });
        navigate({ to: "/app/deal-rooms/$id", params: { id: result.dealRoomId } });
      } else {
        toast.error("Could not create deal room. Please try again.");
      }
    } catch (e) {
      console.error("approveConnectionRequest failed:", e);
      toast.error("Could not create deal room. Please try again.");
    } finally {
      setActingId(null);
      setConfirmId(null);
    }
  };

  const decline = async (requestId: string) => {
    setActingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const { declineConnectionRequest } = await import("@/lib/connection-request-fn");
      const result = await declineConnectionRequest({
        data: { userAccessToken: session.access_token, requestId },
      });
      if (result.ok) {
        toast.success("Request declined");
        qc.invalidateQueries({ queryKey: ["incoming-connection-requests", user?.id] });
      } else {
        toast.error("Could not decline request.");
      }
    } catch (e) {
      console.error("declineConnectionRequest failed:", e);
      toast.error("Could not decline request.");
    } finally {
      setActingId(null);
    }
  };

  const daysAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) return "today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-brand" />
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Connection requests
        </h1>
      </div>

      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : requests.length === 0 ? (
        <EmptyState kind="empty" title="No connection requests" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {requests.map((r: any) => {
            const name = r.profile?.your_name ?? "Investor";
            const fund = r.profile?.fund_name;
            const thesis = [r.profile?.sectors, r.profile?.stages,
              r.profile?.check_size_min ? `$${r.profile.check_size_min}${r.profile?.check_size_max ? `–$${r.profile.check_size_max}` : "+"}` : null,
            ].filter(Boolean).join(" · ");
            return (
              <div key={r.id} className="rounded-none border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--hs-text-primary)" }}>
                      {name}{fund ? <span className="font-normal text-muted-foreground"> · {fund}</span> : null}
                    </div>
                    {thesis && <div className="text-xs text-muted-foreground mt-0.5 truncate">{thesis}</div>}
                    {r.message && (
                      <div className="text-xs mt-2 rounded-lg px-3 py-2" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--hs-text-secondary)" }}>
                        "{r.message}"
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {daysAgo(r.created_at)}
                  </span>
                </div>

                {confirmId === r.id ? (
                  <div className="mt-3 rounded-lg px-3 py-3" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--hs-text-secondary)" }}>
                      This will create a deal room with <span className="font-semibold text-foreground">{name}</span>.
                      They'll be notified immediately and can view your Information Vault after signing the NDA. Proceed?
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => approve(r.id)}
                        disabled={actingId === r.id}
                        className="flex items-center gap-1.5 rounded-lg hs-gradient text-brand-foreground px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                      >
                        {actingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={actingId === r.id}
                        className="rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setConfirmId(r.id)}
                      disabled={!!actingId}
                      className="flex items-center gap-1.5 rounded-lg hs-gradient text-brand-foreground px-3 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                    >
                      Open deal room <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => decline(r.id)}
                      disabled={!!actingId}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
                    >
                      {actingId === r.id ? "…" : "Decline"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

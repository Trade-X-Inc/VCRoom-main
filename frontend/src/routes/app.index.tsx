import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2, ChevronRight, Briefcase, Clock, Eye, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// P4: /app is the 4-step raise Home.
export const Route = createFileRoute("/app/")({
  component: RaiseHome,
});

import { RaiseHome } from "@/components/app/RaiseHome";

// ─────────────────────────────────────────────────────────────────────────────
// Deal Activity card
// ─────────────────────────────────────────────────────────────────────────────

interface DealRoom {
  id: string;
  status: string;
  created_at: string;
  investor_name: string | null;
  investor_company: string | null;
}

interface AccessRequest {
  id: string;
  investor_id: string;
  created_at: string;
  investor_profiles: { your_name: string | null; fund_name: string | null } | null;
}

interface DocViewSummary {
  deal_room_id: string;
  count: number;
  most_recent: string;
  viewer_name: string | null;
}

function daysAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  confirmDanger,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  confirmDanger?: boolean;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border/60 rounded-none p-7 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-foreground leading-relaxed mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground/70 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium rounded-lg text-foreground transition-colors"
            style={{ background: confirmDanger ? "#EF4444" : "var(--gradient-brand)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


function DealActivityCard({
  startupId,
  profileSlug,
  companyName,
}: {
  startupId: string;
  profileSlug: string | null;
  companyName: string | null;
}) {
  const [confirmAction, setConfirmAction] = useState<{
    requestId: string;
    investorId: string;
    action: "approved" | "declined";
    investorName: string | null;
  } | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: dealRooms = [] } = useQuery<DealRoom[]>({
    queryKey: ["home-deal-rooms", startupId],
    enabled: !!startupId && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, status, created_at, investor_name, investor_company")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });
      return (data ?? []) as DealRoom[];
    },
  });

  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(true);

  const loadRequests = async () => {
    setReqLoading(true);
    const { data: reqs } = await supabase
      .from("discovery_requests")
      .select("id, investor_id, created_at")
      .eq("startup_id", startupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!reqs || reqs.length === 0) { setRequests([]); setReqLoading(false); return; }

    // investor_profiles has no bare peer-read RLS anymore — whitelist-filtered
    // batch RPC only (your_name/fund_name are both in the default whitelist).
    const investorIds = reqs.map((r: any) => r.investor_id);
    const { data: profiles } = await supabase.rpc("get_public_investor_profiles_by_user_ids", { p_user_ids: investorIds });

    const pm = Object.fromEntries(((profiles ?? []) as any[]).map((p) => [p.user_id, p]));
    setRequests(reqs.map((r: any) => ({ ...r, investor_profiles: pm[r.investor_id] ?? null })));
    setReqLoading(false);
  };

  useEffect(() => { loadRequests(); }, [startupId]);

  const { data: docViewsByRoom = [] } = useQuery<DocViewSummary[]>({
    queryKey: ["home-doc-views", startupId],
    enabled: dealRooms.length > 0 && typeof window !== "undefined",
    staleTime: 0,
    queryFn: async () => {
      const roomIds = dealRooms.map((r) => r.id);
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("document_views")
        .select("deal_room_id, created_at, viewer_name")
        .in("deal_room_id", roomIds)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false });

      if (!data || data.length === 0) return [];

      const grouped: Record<string, DocViewSummary> = {};
      for (const row of data as any[]) {
        if (!grouped[row.deal_room_id]) {
          grouped[row.deal_room_id] = {
            deal_room_id: row.deal_room_id,
            count: 0,
            most_recent: row.created_at,
            viewer_name: row.viewer_name,
          };
        }
        grouped[row.deal_room_id].count++;
        if (row.created_at > grouped[row.deal_room_id].most_recent) {
          grouped[row.deal_room_id].most_recent = row.created_at;
          grouped[row.deal_room_id].viewer_name = row.viewer_name;
        }
      }
      return Object.values(grouped);
    },
  });

  const executeAction = async () => {
    if (!confirmAction) return;
    const { requestId, investorId, action, investorName } = confirmAction;
    setConfirmAction(null);
    setActingId(requestId);

    const { error } = await supabase
      .from("discovery_requests")
      .update({ status: action, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      if (action === "approved") {
        toast.success(`Access approved. ${investorName ?? "Investor"} can now view your on-request sections.`);
        const name = companyName ?? "The founder";
        supabase.from("notifications").insert({
          user_id: investorId,
          kind: "access_approved",
          title: `${name} approved your access`,
          body: "You can now view their business model, market, traction, and team sections.",
          read: false,
          action_url: profileSlug ? `/p/${profileSlug}` : null,
          meta: { startup_id: startupId },
        }).then(({ error: nErr }) => {
          if (nErr) console.warn("[notification] access_approved failed:", nErr.message);
        });
      } else {
        toast.success("Request declined.");
      }
    } else {
      toast.error("Could not update request.");
    }
    setActingId(null);
  };

  const pendingCount = requests.length;
  const activeRoomCount = dealRooms.filter((r) => r.status === "active").length;
  let subtext: string;
  if (pendingCount > 0) {
    subtext = `${pendingCount} investor${pendingCount > 1 ? "s" : ""} waiting on you`;
  } else if (activeRoomCount > 0) {
    subtext = `${activeRoomCount} active deal room${activeRoomCount > 1 ? "s" : ""}`;
  } else {
    subtext = "No active investor activity yet";
  }

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden mt-4">
        <div
          style={{ padding: "20px 24px", borderBottom: "var(--color-border)" }}
          className="flex items-start gap-3"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: pendingCount > 0 ? "rgba(245,158,11,0.1)" : "rgba(124,58,237,0.1)" }}
          >
            <Briefcase
              className="h-4 w-4"
              style={{ color: pendingCount > 0 ? "#F59E0B" : "#A855F7" }}
            />
          </div>
          <div>
            <h2
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Deal Activity
            </h2>
            <p className="text-xs mt-0.5" style={{ color: pendingCount > 0 ? "#F59E0B" : "var(--color-muted-foreground)" }}>
              {subtext}
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }} className="space-y-4">
          {reqLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground ">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading requests…
            </div>
          )}

          {!reqLoading && requests.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2" style={{ letterSpacing: "0.1em" }}>
                Pending access requests
              </div>
              <div className="space-y-2">
                {requests.map((req) => {
                  const name = req.investor_profiles?.your_name ?? "Unknown investor";
                  const firm = req.investor_profiles?.fund_name;
                  const isActing = actingId === req.id;
                  return (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 flex-wrap"
                      style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{name}</div>
                        <div className="text-xs mt-0.5 text-muted-foreground">
                          {firm && <span>{firm} · </span>}
                          Requested {daysAgo(req.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground " />
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                setConfirmAction({ requestId: req.id, investorId: req.investor_id, action: "approved", investorName: name })
                              }
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({ requestId: req.id, investorId: req.investor_id, action: "declined", investorName: name })
                              }
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
                            >
                              <X className="h-3 w-3" /> Decline
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

          {dealRooms.length === 0 && requests.length === 0 && !reqLoading ? (
            <p className="text-xs text-muted-foreground">
              No active investor activity yet. Once an investor requests access to your profile, it'll show up here.
            </p>
          ) : (
            dealRooms.length > 0 && (
              <div>
                {requests.length > 0 && (
                  <div className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2" style={{ letterSpacing: "0.1em" }}>
                    Deal rooms
                  </div>
                )}
                <div className="space-y-2">
                  {dealRooms.map((room) => {
                    const viewSummary = docViewsByRoom.find((v) => v.deal_room_id === room.id);
                    return (
                      <div
                        key={room.id}
                        className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 flex-wrap"
                        style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">
                              {room.investor_name ?? "Investor"}
                              {room.investor_company ? ` · ${room.investor_company}` : ""}
                            </span>
                            <span
                              className="text-[11px] px-1.5 py-0.5 rounded-full capitalize shrink-0"
                              style={
                                room.status === "active"
                                  ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }
                                  : { background: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }
                              }
                            >
                              {room.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" /> Opened {daysAgo(room.created_at)}
                            </span>
                            {viewSummary ? (
                              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Eye className="h-3 w-3" />
                                {viewSummary.viewer_name ?? "Investor"} viewed {viewSummary.count} document{viewSummary.count !== 1 ? "s" : ""} {daysAgo(viewSummary.most_recent)}
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                                No document views in the last 7 days
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          to="/app/deal-rooms/$id"
                          params={{ id: room.id }}
                          className="inline-flex items-center gap-1 text-xs font-medium shrink-0 transition-colors"
                          style={{ color: "rgba(124,58,237,0.8)" }}
                        >
                          Open deal room <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          message={
            confirmAction.action === "approved"
              ? `Approve access for ${confirmAction.investorName ?? "this investor"}? They will be able to view your on-request profile sections.`
              : `Decline access for ${confirmAction.investorName ?? "this investor"}?`
          }
          onConfirm={executeAction}
          onCancel={() => setConfirmAction(null)}
          confirmLabel={confirmAction.action === "approved" ? "Approve access" : "Decline"}
          confirmDanger={confirmAction.action === "declined"}
        />
      )}
    </>
  );
}


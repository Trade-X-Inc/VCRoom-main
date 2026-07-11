import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus, Copy, Check, Loader2, ChevronRight,
  Circle, Send, Link as LinkIcon, Building2, AlertCircle,
  LayoutList, LayoutGrid, Table2, Columns3, Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logActivity } from "@/lib/activity-log-fn";

export const Route = createFileRoute("/app/investor/connections")({
  component: ConnectionsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["Sourcing", "Reviewing", "Diligence"] as const;
const TERMINAL_STATUSES = ["Invested", "Passed"] as const;
const ALL_STATUSES = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES, "Watching"] as const;

type WatchlistStatus = typeof ALL_STATUSES[number];

interface WatchlistRow {
  id: string;
  company_name: string;
  status: WatchlistStatus;
  source: string | null;
  sector: string | null;
  stage: string | null;
  auto_added: boolean;
  seen_by_investor: boolean;
  source_invite_link_id: string | null;
  startup_id: string | null;
  created_at: string;
  updated_at: string;
}

interface IntakeCandidate {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  thesis_fit_score: number | null;
  watchlist_id: string | null;
  invite_sent_at: string | null;
  matched_startup_id: string | null;
}

interface InviteLink {
  id: string;
  token: string;
  label: string | null;
  uses_count: number;
  active: boolean;
  created_at: string;
}

type ViewMode = "pipeline" | "list" | "card" | "kanban";

// Stage tab definitions
type TabKey = "all" | "new_intake" | "sourcing" | "reviewing" | "diligence" | "invested";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new_intake", label: "New from intake" },
  { key: "sourcing", label: "Sourcing" },
  { key: "reviewing", label: "Reviewing" },
  { key: "diligence", label: "Diligence" },
  { key: "invested", label: "Invested" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Sourcing:   { bg: "rgba(124,58,237,0.10)", text: "#A855F7" },
  Reviewing:  { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
  Diligence:  { bg: "rgba(59,130,246,0.12)", text: "#60A5FA" },
  Invested:   { bg: "rgba(16,185,129,0.12)", text: "#10B981" },
  Passed:     { bg: "rgba(239,68,68,0.10)",  text: "#EF4444" },
  Watching:   { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)" },
};

// ── Confirm-first modal ────────────────────────────────────────────────────

function ConfirmModal({ count, onConfirm, onCancel, confirming }: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onCancel}>
      <div style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)", borderRadius: 16, padding: 28, maxWidth: 420, width: "100%" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-semibold mb-2" style={{ fontFamily: "Syne, sans-serif", color: "var(--hs-text-primary)" }}>Send Hockystick invites</div>
        <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--hs-text-muted)" }}>
          This will send a real email invite to <strong style={{ color: "var(--hs-text-secondary)" }}>{count} {count === 1 ? "founder" : "founders"}</strong> and add them to your pipeline as Sourcing leads. This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs transition-colors" style={{ color: "var(--hs-text-muted)" }}>Cancel</button>
          <button onClick={onConfirm} disabled={confirming}
            style={{ background: confirming ? "rgba(124,58,237,0.4)" : "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: confirming ? "not-allowed" : "pointer" }}>
            {confirming ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Sending…</span> : `Send ${count} invite${count !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Watchlist row component ────────────────────────────────────────────────

function PipelineRow({ row, onMarkSeen, onDecide }: {
  row: WatchlistRow;
  onMarkSeen: (id: string) => void;
  onDecide: (id: string, decision: "Sourcing" | "Passed") => void;
}) {
  const isNew = row.auto_added && !row.seen_by_investor;
  const statusStyle = STATUS_COLORS[row.status] ?? STATUS_COLORS.Watching;

  return (
    <div
      style={{ background: "var(--hs-bg-secondary)", border: `1px solid ${isNew ? "rgba(124,58,237,0.35)" : "var(--hs-border)"}`, borderRadius: 10, padding: "12px 16px", cursor: isNew ? "pointer" : "default" }}
      onClick={() => { if (isNew) onMarkSeen(row.id); }}
      className="flex items-center gap-3 transition-colors"
    >
      {/* New dot */}
      {isNew && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED", flexShrink: 0 }} title="New — auto-added via invite link" />}

      {/* Avatar placeholder */}
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Building2 className="h-4 w-4" style={{ color: "#A855F7" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--hs-text-primary)" }}>{row.company_name}</span>
          {isNew && <span style={{ background: "rgba(124,58,237,0.12)", color: "#A855F7", borderRadius: 99, padding: "1px 8px", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>Via invite link</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {row.sector && <span className="text-[11px]" style={{ color: "var(--hs-text-muted)" }}>{row.sector}</span>}
          {row.stage && <span className="text-[11px]" style={{ color: "var(--hs-text-muted)" }}>{row.stage}</span>}
          {row.source && <span className="text-[11px]" style={{ color: "var(--hs-text-muted)" }}>· {row.source}</span>}
        </div>
      </div>

      {/* Status badge */}
      <span style={{ background: statusStyle.bg, color: statusStyle.text, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
        {row.status}
      </span>

      {/* Approve/Reject for new auto-added rows */}
      {isNew && (
        <div className="flex gap-1.5 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onDecide(row.id, "Sourcing")}
            style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Approve
          </button>
          <button
            onClick={() => onDecide(row.id, "Passed")}
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Decline
          </button>
        </div>
      )}

      {!isNew && <ChevronRight className="h-4 w-4 text-white/15 flex-shrink-0" />}
    </div>
  );
}

// ── Intake candidate row ───────────────────────────────────────────────────

function CandidateRow({ candidate, selected, onToggle }: {
  candidate: IntakeCandidate;
  selected: boolean;
  onToggle: () => void;
}) {
  const score = candidate.thesis_fit_score ?? 0;
  const scoreColor = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "rgba(255,255,255,0.3)";
  const alreadyInvited = !!candidate.invite_sent_at;

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px" }}
      className="flex items-center gap-3">
      <input type="checkbox" checked={selected} onChange={onToggle} disabled={alreadyInvited}
        style={{ width: 15, height: 15, accentColor: "#7C3AED", flexShrink: 0, cursor: alreadyInvited ? "not-allowed" : "pointer" }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{candidate.company_name}</span>
          {candidate.matched_startup_id && (
            <span style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>On platform</span>
          )}
          {alreadyInvited && (
            <span style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", borderRadius: 99, padding: "1px 7px", fontSize: 10 }}>Invited</span>
          )}
        </div>
        {candidate.contact_email && (
          <div className="text-[11px] text-white/30 mt-0.5">{candidate.contact_email}</div>
        )}
      </div>

      <span style={{ background: score >= 60 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)", color: scoreColor, borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
        {score}% fit
      </span>
    </div>
  );
}

// ── Invite link panel ──────────────────────────────────────────────────────

function InviteLinkPanel({ investorId }: { investorId: string }) {
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const { data: link, isLoading } = useQuery<InviteLink | null>({
    queryKey: ["investor-invite-link", investorId],
    enabled: !!investorId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_invite_links")
        .select("*")
        .eq("investor_id", investorId)
        .eq("active", true)
        .maybeSingle();
      return data as InviteLink | null;
    },
  });

  const linkUrl = link ? `https://hockystick.app/join-investor/${link.token}` : null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { generateInviteLink } = await import("@/lib/connections-fn");
      const result = await generateInviteLink({ data: { investorId } });
      if (result.ok) {
        qc.invalidateQueries({ queryKey: ["investor-invite-link", investorId] });
        toast.success("Invite link created");
      }
    } catch {
      toast.error("Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied");
    });
  };

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 20px" }}>
      <div className="flex items-center gap-2 mb-3">
        <LinkIcon className="h-4 w-4" style={{ color: "#A855F7" }} />
        <span className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Your invite link</span>
      </div>
      <p className="text-xs text-white/40 leading-relaxed mb-4">
        Share this link with founders directly. Anyone who joins through it is automatically added to your pipeline.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-white/30"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
      ) : link ? (
        <div className="space-y-3">
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="text-xs text-white/50 truncate flex-1 font-mono">{linkUrl}</span>
            <button onClick={handleCopy}
              style={{ background: copied ? "rgba(16,185,129,0.15)" : "rgba(124,58,237,0.15)", color: copied ? "#10B981" : "#A855F7", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
              {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          <div className="text-xs text-white/30">{link.uses_count ?? 0} founder{(link.uses_count ?? 0) !== 1 ? "s" : ""} joined via this link</div>
        </div>
      ) : (
        <button onClick={handleGenerate} disabled={generating}
          style={{ background: generating ? "rgba(124,58,237,0.3)" : "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {generating ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</> : <><Plus className="h-3 w-3" /> Generate invite link</>}
        </button>
      )}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────

function ListView({ rows, search }: { rows: WatchlistRow[]; search: string }) {
  const filtered = rows.filter((r) =>
    !search || r.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.sector ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) return (
    <div style={{ padding: "40px 16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12 }}>
      <p className="text-sm text-muted-foreground">{search ? "No results matching your search." : "No companies in pipeline yet."}</p>
    </div>
  );

  return (
    <div className="space-y-2" data-testid="list-view">
      {filtered.map((r) => {
        const statusStyle = STATUS_COLORS[r.status] ?? STATUS_COLORS.Watching;
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
            style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="text-sm font-bold" style={{ color: "#A855F7" }}>{r.company_name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "var(--hs-text-primary)" }}>{r.company_name}</span>
                {r.stage && <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: "rgba(124,58,237,0.1)", color: "#A855F7" }}>{r.stage}</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {r.sector && <span className="text-[11px]" style={{ color: "var(--hs-text-muted)" }}>{r.sector}</span>}
                {r.source && <span className="text-[11px]" style={{ color: "var(--hs-text-muted)" }}>· {r.source}</span>}
              </div>
            </div>
            <span style={{ background: statusStyle.bg, color: statusStyle.text, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              {r.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Card view ─────────────────────────────────────────────────────────────

function CardView({ rows, search }: { rows: WatchlistRow[]; search: string }) {
  const filtered = rows.filter((r) =>
    !search || r.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.sector ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) return (
    <div style={{ padding: "40px 16px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12 }}>
      <p className="text-sm text-muted-foreground">{search ? "No results." : "No companies yet."}</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="card-view">
      {filtered.map((r) => {
        const statusStyle = STATUS_COLORS[r.status] ?? STATUS_COLORS.Watching;
        return (
          <div key={r.id} className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)" }}>
            <div className="flex items-start justify-between">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="text-base font-bold" style={{ color: "#A855F7" }}>{r.company_name[0]?.toUpperCase()}</span>
              </div>
              <span style={{ background: statusStyle.bg, color: statusStyle.text, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
                {r.status}
              </span>
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "var(--hs-text-primary)" }}>{r.company_name}</div>
              {r.sector && <div className="text-xs mt-0.5" style={{ color: "var(--hs-text-muted)" }}>{r.sector}</div>}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-auto">
              {r.stage && <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: "rgba(124,58,237,0.1)", color: "#A855F7" }}>{r.stage}</span>}
              {r.source && <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: "rgba(255,255,255,0.06)", color: "var(--hs-text-muted)" }}>{r.source}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Kanban view ───────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { label: string; statuses: string[] }[] = [
  { label: "Sourcing",  statuses: ["Sourcing", "Watching"] },
  { label: "Reviewing", statuses: ["Reviewing"] },
  { label: "Diligence", statuses: ["Diligence"] },
  { label: "Decision",  statuses: [] },
  { label: "Invested/Passed", statuses: ["Invested", "Passed"] },
];

function KanbanView({ rows }: { rows: WatchlistRow[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-view">
      {KANBAN_COLUMNS.map((col) => {
        const cards = rows.filter((r) => col.statuses.includes(r.status));
        return (
          <div key={col.label} style={{ minWidth: 220, flex: "0 0 220px" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--hs-text-muted)" }}>{col.label}</span>
              <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "var(--hs-text-muted)" }}>{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map((r) => {
                const statusStyle = STATUS_COLORS[r.status] ?? STATUS_COLORS.Watching;
                return (
                  <div key={r.id} className="rounded-xl p-3 space-y-2"
                    style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--hs-text-primary)" }}>{r.company_name}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.stage && <span className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: "rgba(124,58,237,0.1)", color: "#A855F7" }}>{r.stage}</span>}
                      <span style={{ background: statusStyle.bg, color: statusStyle.text, borderRadius: 99, padding: "1px 8px", fontSize: 10, fontWeight: 600 }}>{r.status}</span>
                    </div>
                  </div>
                );
              })}
              {cards.length === 0 && (
                <div style={{ border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
                  <p className="text-xs" style={{ color: "var(--hs-text-muted)" }}>No connections yet</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

// ── Sent connection requests — closes the loop for the investor ────────────
function SentRequestsPanel({ investorUserId }: { investorUserId: string }) {
  const { data: sent = [] } = useQuery({
    queryKey: ["sent-connection-requests", investorUserId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("discovery_requests")
        .select("id, startup_id, status, deal_room_id, created_at")
        .eq("investor_id", investorUserId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (!reqs?.length) return [];
      const { data: startups } = await supabase
        .from("startups")
        .select("id, company_name, users(full_name)")
        .in("id", reqs.map((r: any) => r.startup_id));
      const smap = Object.fromEntries((startups ?? []).map((s: any) => [s.id, s]));
      return reqs.map((r: any) => ({ ...r, startup: smap[r.startup_id] ?? null }));
    },
  });

  if (!sent.length) return null;

  const pill = (r: any) => {
    if (r.status === "deal_room_created" && r.deal_room_id) {
      return (
        <Link
          to="/app/deal-room/$id"
          params={{ id: r.deal_room_id }}
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full hover:opacity-80"
          style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}
        >
          Deal room →
        </Link>
      );
    }
    if (r.status === "approved" || r.status === "connected") {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#10B981" }}>Approved</span>;
    }
    if (r.status === "declined" || r.status === "rejected") {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>Declined</span>;
    }
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>Pending</span>;
  };

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 20px" }}>
      <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Sent requests</div>
      <div className="space-y-2.5">
        {sent.map((r: any) => {
          const founderName = Array.isArray(r.startup?.users) ? r.startup?.users?.[0]?.full_name : r.startup?.users?.full_name;
          return (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-white/80 truncate">{r.startup?.company_name ?? "Startup"}</div>
                <div className="text-[10px] text-white/30 truncate">
                  {founderName ? `${founderName} · ` : ""}{new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              {pill(r)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [search, setSearch] = useState("");

  const THESIS_THRESHOLD = 60;

  // ── Investor profile (for profile id + name/fund)
  const { data: investorProfile } = useQuery({
    queryKey: ["connections-investor-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("id, your_name, fund_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // ── Watchlist rows (includes discovery_requests with status='connected' merged in)
  const { data: watchlist = [], refetch: refetchWatchlist } = useQuery<WatchlistRow[]>({
    queryKey: ["connections-watchlist", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const [watchlistRes, discoveryRes] = await Promise.all([
        supabase
          .from("investor_watchlist")
          .select("id,company_name,status,source,sector,stage,auto_added,seen_by_investor,source_invite_link_id,startup_id,created_at,updated_at")
          .eq("investor_id", user!.id)
          .order("created_at", { ascending: false }),
        // Pull connected discovery_requests — investor_id column stores auth.uid()
        supabase
          .from("discovery_requests")
          .select("id,startup_id,status,created_at,startups(company_name,sector,stage)")
          .eq("investor_id", user!.id)
          .eq("status", "connected"),
      ]);

      const rows: WatchlistRow[] = (watchlistRes.data ?? []) as WatchlistRow[];
      const existingStartupIds = new Set(rows.map((r) => r.startup_id).filter(Boolean));

      // Merge discovery_requests entries not already in watchlist
      for (const dr of discoveryRes.data ?? []) {
        if (existingStartupIds.has(dr.startup_id)) continue;
        const s = (dr as any).startups;
        rows.push({
          id: `dr-${dr.id}`,
          company_name: s?.company_name ?? "Unknown",
          status: "Reviewing" as any,
          source: "connected",
          sector: s?.sector ?? null,
          stage: s?.stage ?? null,
          auto_added: true,
          seen_by_investor: true,
          source_invite_link_id: null,
          startup_id: dr.startup_id,
          created_at: dr.created_at,
          updated_at: dr.created_at,
        });
      }

      return rows;
    },
  });

  // ── Intake candidates (not yet watchlisted)
  const { data: allCandidates = [], refetch: refetchCandidates } = useQuery<IntakeCandidate[]>({
    queryKey: ["connections-intake-candidates", investorProfile?.id],
    enabled: !!investorProfile?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_intake_candidates")
        .select("id,company_name,contact_name,contact_email,thesis_fit_score,watchlist_id,invite_sent_at,matched_startup_id")
        .eq("investor_profile_id", investorProfile!.id)
        .order("thesis_fit_score", { ascending: false });
      return (data ?? []) as IntakeCandidate[];
    },
  });

  // Derive sections
  const matchedCandidates = allCandidates.filter(
    (c) => (c.thesis_fit_score ?? 0) >= THESIS_THRESHOLD && !c.watchlist_id
  );
  const unmatchedCandidates = allCandidates.filter(
    (c) => (c.thesis_fit_score ?? 0) < THESIS_THRESHOLD && !c.watchlist_id
  );
  const newFromIntakeCount = matchedCandidates.length;

  // Tab counts
  const tabCounts: Record<TabKey, number> = {
    all: watchlist.length,
    new_intake: newFromIntakeCount,
    sourcing: watchlist.filter((w) => w.status === "Sourcing").length,
    reviewing: watchlist.filter((w) => w.status === "Reviewing").length,
    diligence: watchlist.filter((w) => w.status === "Diligence").length,
    invested: watchlist.filter((w) => w.status === "Invested").length,
  };

  // Filtered pipeline rows by tab
  const filteredPipeline = watchlist.filter((w) => {
    if (activeTab === "all") return true;
    if (activeTab === "new_intake") return false; // handled separately
    if (activeTab === "sourcing") return w.status === "Sourcing";
    if (activeTab === "reviewing") return w.status === "Reviewing";
    if (activeTab === "diligence") return w.status === "Diligence";
    if (activeTab === "invested") return w.status === "Invested";
    return true;
  });

  // ── Mark seen
  const handleMarkSeen = async (id: string) => {
    await supabase.from("investor_watchlist").update({ seen_by_investor: true }).eq("id", id);
    qc.setQueryData<WatchlistRow[]>(["connections-watchlist", user?.id], (prev) =>
      prev?.map((r) => r.id === id ? { ...r, seen_by_investor: true } : r) ?? []
    );
  };

  // ── Approve / Decline auto-added row (confirm-first for Decline since it's a real decision)
  const handleDecide = async (id: string, decision: "Sourcing" | "Passed") => {
    if (decision === "Passed") {
      if (!window.confirm("Decline this connection request? This will move them to Passed. You can change this later.")) return;
    }
    setDecidingId(id);
    const row = watchlist.find((w) => w.id === id);
    try {
      await supabase.from("investor_watchlist")
        .update({ status: decision, seen_by_investor: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      logActivity({
        account_type: "investor",
        account_id: user?.id ?? "",
        actor_user_id: user?.id ?? "",
        actor_name: user?.fullName || user?.email || "Investor",
        action_type: decision === "Sourcing" ? "connection_approved" : "connection_rejected",
        target_label: row?.company_name ?? "Company",
        detail: decision === "Sourcing" ? `Approved connection — moved to Sourcing` : `Declined connection request`,
      });
      refetchWatchlist();
    } finally {
      setDecidingId(null);
    }
  };

  // ── Bulk invite
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (candidates: IntakeCandidate[]) => {
    const eligible = candidates.filter((c) => !c.invite_sent_at).map((c) => c.id);
    const allSelected = eligible.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        eligible.forEach((id) => next.delete(id));
      } else {
        eligible.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSendInvites = async () => {
    if (!investorProfile?.id || selectedIds.size === 0) return;
    setConfirming(true);
    try {
      const { sendIntakeInvites } = await import("@/lib/connections-fn");
      const result = await sendIntakeInvites({
        data: {
          investorId: user!.id,
          investorProfileId: investorProfile.id,
          candidateIds: Array.from(selectedIds),
          investorName: investorProfile.your_name ?? "The investor",
          investorFundName: investorProfile.fund_name ?? "our fund",
        },
      });
      setShowConfirm(false);
      setSelectedIds(new Set());
      refetchCandidates();
      refetchWatchlist();
      if (result.sent > 0) toast.success(`${result.sent} invite${result.sent !== 1 ? "s" : ""} sent`);
      if (result.errors.length > 0) toast.error(`${result.errors.length} failed — check console`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invites");
    } finally {
      setConfirming(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const card = "bg-card border border-border/60 rounded-xl p-5";

  const VIEW_BUTTONS: { mode: ViewMode; icon: (props: any) => JSX.Element; label: string; testid: string }[] = [
    { mode: "pipeline", icon: Table2,   label: "Table",   testid: "view-pipeline" },
    { mode: "list",     icon: LayoutList, label: "List",  testid: "view-list" },
    { mode: "card",     icon: LayoutGrid, label: "Card",  testid: "view-card" },
    { mode: "kanban",   icon: Columns3,   label: "Kanban", testid: "view-kanban" },
  ];

  return (
    <div className="p-5 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif", color: "var(--hs-text-primary)" }}>Connections</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--hs-text-muted)" }}>
            Your pipeline — {watchlist.length} active {watchlist.length === 1 ? "company" : "companies"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--hs-text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies…"
              className="text-sm rounded-lg pl-8 pr-3 py-1.5 outline-none"
              style={{ background: "var(--hs-bg-secondary)", border: "1px solid var(--hs-border)", color: "var(--hs-text-primary)", width: 180 }}
            />
          </div>
          {/* View toggle */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--hs-border)" }}>
            {VIEW_BUTTONS.map(({ mode, icon: Icon, label, testid }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                data-testid={testid}
                title={label}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: viewMode === mode ? "#7C3AED" : "var(--hs-bg-secondary)",
                  color: viewMode === mode ? "#fff" : "var(--hs-text-muted)",
                  borderRight: "1px solid var(--hs-border)",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alternate views: list, card, kanban */}
      {viewMode === "list" && (
        <ListView rows={watchlist} search={search} />
      )}
      {viewMode === "card" && (
        <CardView rows={watchlist} search={search} />
      )}
      {viewMode === "kanban" && (
        <KanbanView rows={watchlist} />
      )}

      {/* Default pipeline view (tabs + intake + pipeline + right sidebar) */}
      {viewMode === "pipeline" && (
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* LEFT — main pipeline area */}
        <div className="space-y-6 min-w-0">

          {/* Stage tabs */}
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                  activeTab === tab.key
                    ? "bg-brand/10 text-brand border border-brand/20"
                    : "text-muted-foreground hover:text-foreground border border-transparent hover:bg-accent"
                )}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    activeTab === tab.key ? "bg-brand/20 text-brand" : "bg-accent text-muted-foreground"
                  )}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* NEW FROM INTAKE — thesis matched */}
          {(activeTab === "all" || activeTab === "new_intake") && (
            <div className={card}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>
                    From your last deal intake — thesis matched
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Founders scoring {THESIS_THRESHOLD}% or above on your thesis, not yet in pipeline
                  </div>
                </div>
                {matchedCandidates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSelectAll(matchedCandidates)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {matchedCandidates.filter((c) => !c.invite_sent_at).every((c) => selectedIds.has(c.id)) ? "Deselect all" : "Select all"}
                    </button>
                    {selectedIds.size > 0 && (
                      <button
                        onClick={() => setShowConfirm(true)}
                        style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <Send className="h-3 w-3" />
                        Send {selectedIds.size} invite{selectedIds.size !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {matchedCandidates.length === 0 ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
                  <p className="text-xs text-muted-foreground">No thesis-matched candidates yet — run a deal intake to surface leads above {THESIS_THRESHOLD}% fit.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matchedCandidates.map((c) => (
                    <CandidateRow
                      key={c.id}
                      candidate={c}
                      selected={selectedIds.has(c.id)}
                      onToggle={() => toggleSelect(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FROM INTAKE — not thesis match */}
          {(activeTab === "all" || activeTab === "new_intake") && unmatchedCandidates.length > 0 && (
            <div className={card}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold" style={{ fontFamily: "Syne, sans-serif" }}>
                    From intake — outside thesis
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Below {THESIS_THRESHOLD}% fit — you can still invite them
                  </div>
                </div>
                {unmatchedCandidates.filter((c) => !c.invite_sent_at).length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSelectAll(unmatchedCandidates)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {unmatchedCandidates.filter((c) => !c.invite_sent_at).every((c) => selectedIds.has(c.id)) ? "Deselect all" : "Select all"}
                    </button>
                    {selectedIds.size > 0 && selectedIds.size > (Array.from(selectedIds).filter((id) => matchedCandidates.some((c) => c.id === id)).length) && (
                      <button
                        onClick={() => setShowConfirm(true)}
                        style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <Send className="h-3 w-3" />
                        Send {selectedIds.size} invite{selectedIds.size !== 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {unmatchedCandidates.map((c) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    selected={selectedIds.has(c.id)}
                    onToggle={() => toggleSelect(c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE PIPELINE */}
          {activeTab !== "new_intake" && (
            <div className={card}>
              <div className="text-sm font-semibold mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
                {activeTab === "all" ? "Active pipeline" : TABS.find((t) => t.key === activeTab)?.label}
              </div>

              {filteredPipeline.length === 0 ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
                  {activeTab === "all" ? (
                    <p className="text-xs text-muted-foreground">
                      No companies in your pipeline yet. Add from intake matches above, or use Deal Intake to find new leads.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No companies at this stage.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPipeline.map((row) => (
                    <PipelineRow
                      key={row.id}
                      row={row}
                      onMarkSeen={handleMarkSeen}
                      onDecide={handleDecide}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">
          {/* Invite link */}
          {user?.id && <InviteLinkPanel investorId={user.id} />}

          {/* Sent connection requests */}
          {user?.id && <SentRequestsPanel investorUserId={user.id} />}

          {/* Pipeline stats */}
          <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 20px" }}>
            <div className="text-sm font-semibold text-white mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Pipeline summary</div>
            <div className="space-y-2">
              {[
                { label: "Sourcing",  count: watchlist.filter((w) => w.status === "Sourcing").length,   color: "#A855F7" },
                { label: "Reviewing", count: watchlist.filter((w) => w.status === "Reviewing").length,  color: "#F59E0B" },
                { label: "Diligence", count: watchlist.filter((w) => w.status === "Diligence").length,  color: "#60A5FA" },
                { label: "Invested",  count: watchlist.filter((w) => w.status === "Invested").length,   color: "#10B981" },
                { label: "Passed",    count: watchlist.filter((w) => w.status === "Passed").length,     color: "#EF4444" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Circle className="h-2 w-2" style={{ fill: color, color }} />
                    <span className="text-xs text-white/50">{label}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: count > 0 ? color : "rgba(255,255,255,0.2)" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-added notice if any unseen */}
          {watchlist.some((w) => w.auto_added && !w.seen_by_investor) && (
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 8 }}>
              <AlertCircle className="h-4 w-4 text-brand mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-white/70">Founders waiting for review</div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  {watchlist.filter((w) => w.auto_added && !w.seen_by_investor).length} founder{watchlist.filter((w) => w.auto_added && !w.seen_by_investor).length !== 1 ? "s" : ""} joined via your invite link. Click each row to approve or decline.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )} {/* end pipeline view */}

      {/* Confirm modal */}
      {showConfirm && (
        <ConfirmModal
          count={selectedIds.size}
          onConfirm={handleSendInvites}
          onCancel={() => setShowConfirm(false)}
          confirming={confirming}
        />
      )}
    </div>
  );
}

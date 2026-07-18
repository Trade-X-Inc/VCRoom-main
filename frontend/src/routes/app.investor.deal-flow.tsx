import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Inbox, Search, Clock, Plus, Loader2, ArrowRight, FileText, TrendingUp, AlertTriangle, HelpCircle, CheckCircle2, List, LayoutGrid } from "lucide-react";
import { PageGuide } from "@/components/app/PageGuide";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import type { AgentDealBrief } from "@/lib/deal-brief-fn";
import { EmptyState } from "@/components/system";
import { color, table as tableTokens } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/investor/deal-flow")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/investor/discover/deal-flow" as any, replace: true });
  },
  component: DealFlowPage,
});

// ── Deal Brief Panel ──────────────────────────────────────────────────────────

function DealBriefPanel({ startupId, investorId, dealRoomId }: { startupId: string; investorId: string; dealRoomId: string }) {
  const [brief, setBrief] = useState<AgentDealBrief | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!startupId || !investorId) return;
    import("@/lib/deal-brief-fn").then(({ fetchDealBrief, markBriefViewed }) => {
      fetchDealBrief(investorId, startupId).then((b) => {
        setBrief(b);
        setLoaded(true);
        if (b && !b.viewed_at) markBriefViewed(b.id).catch(() => {});
      });
    });
  }, [startupId, investorId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token ?? "";
      const { runDealBrief, markBriefViewed } = await import("@/lib/deal-brief-fn");
      const result = await runDealBrief({ startupId, investorId, userId: investorId, jwt });
      setBrief(result);
      if (!result.viewed_at) markBriefViewed(result.id).catch(() => {});
      toast.success("Deal brief generated");
    } catch {
      toast.error("Failed to generate brief. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!loaded) return null;

  if (!brief) {
    return (
      <div
        data-testid="deal-brief-panel"
        style={{ borderTop: "1px solid var(--border)", padding: "12px 20px" }}
        className="flex items-center justify-between gap-3"
      >
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          No deal brief
        </span>
        <button
          data-testid="generate-brief-btn"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground transition-colors"
          style={{ background: generating ? "rgba(124,58,237,0.4)" : "var(--gradient-brand)", cursor: generating ? "not-allowed" : "pointer" }}
        >
          {generating ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</> : <><FileText className="h-3 w-3" /> Generate brief</>}
        </button>
      </div>
    );
  }

  const matchColor =
    brief.match_score >= 80
      ? { bg: "rgba(16,185,129,0.12)", text: "#10B981", border: "rgba(16,185,129,0.2)" }
      : brief.match_score >= 50
      ? { bg: "rgba(245,158,11,0.1)", text: "#F59E0B", border: "rgba(245,158,11,0.2)" }
      : { bg: "rgba(239,68,68,0.12)", text: "#EF4444", border: "rgba(239,68,68,0.2)" };

  const matchLabel =
    brief.match_score >= 80 ? "Strong match" : brief.match_score >= 50 ? "Partial match" : "Weak match";

  const verdictBorder =
    brief.verdict_signal === "positive"
      ? "#10B981"
      : brief.verdict_signal === "negative"
      ? "#EF4444"
      : "var(--accent)";

  return (
    <div
      data-testid="deal-brief-panel"
      style={{ borderTop: "1px solid var(--border)", padding: "16px 20px 20px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)", fontFamily: "Syne, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Deal Brief
        </span>
        <span
          data-testid="match-score-badge"
          className="text-[11px] px-2 py-0.5 rounded-full font-medium"
          style={{ background: matchColor.bg, color: matchColor.text, border: `1px solid ${matchColor.border}` }}
        >
          {brief.match_score}/100 · {matchLabel}
        </span>
      </div>

      {/* Headline */}
      {brief.headline && (
        <p className="text-sm font-semibold text-foreground mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
          {brief.headline}
        </p>
      )}

      {/* Thesis */}
      {brief.investment_thesis && (
        <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}>
          {brief.investment_thesis}
        </p>
      )}

      {/* Key metrics pills */}
      {brief.key_metrics && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(brief.key_metrics).filter(([, v]) => v != null && v !== "").slice(0, 4).map(([k, v]) => (
            <span key={k} className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
              {String(v)}
            </span>
          ))}
        </div>
      )}

      {/* Strengths + Red flags */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {Array.isArray(brief.strengths) && brief.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <TrendingUp className="h-3 w-3" style={{ color: "#10B981" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#10B981" }}>Strengths</span>
            </div>
            {brief.strengths.slice(0, 2).map((s, i) => (
              <p key={i} className="text-[11px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>· {s}</p>
            ))}
          </div>
        )}
        {Array.isArray(brief.red_flags) && brief.red_flags.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <AlertTriangle className="h-3 w-3" style={{ color: "#EF4444" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#EF4444" }}>Red flags</span>
            </div>
            {brief.red_flags.slice(0, 2).map((f, i) => (
              <p key={i} className="text-[11px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>· {f}</p>
            ))}
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {Array.isArray(brief.suggested_questions) && brief.suggested_questions.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1.5">
            <HelpCircle className="h-3 w-3" style={{ color: "rgba(124,58,237,0.8)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(124,58,237,0.8)" }}>Questions to ask</span>
          </div>
          {brief.suggested_questions.slice(0, 2).map((q, i) => (
            <p key={i} className="text-[11px] mb-0.5" style={{ color: "var(--muted-foreground)" }}>{i + 1}. {q}</p>
          ))}
        </div>
      )}

      {/* Verdict */}
      {brief.overall_verdict && (
        <div
          className="rounded-lg px-3 py-2.5 mb-3 text-xs leading-relaxed"
          style={{
            background: "var(--accent)",
            borderLeft: `3px solid ${verdictBorder}`,
            color: "var(--muted-foreground)",
          }}
        >
          {brief.overall_verdict}
        </div>
      )}

      {/* Docs */}
      {brief.document_readiness && (
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-3 w-3" style={{ color: "var(--faint)" }} />
          <span className="text-[11px]" style={{ color: "var(--faint)" }}>
            {(brief.document_readiness as any).uploaded_count ?? 0} docs uploaded
            {(brief.document_readiness as any).top_missing ? ` · Missing: ${(brief.document_readiness as any).top_missing}` : ""}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
        <span className="text-[10px]" style={{ color: "var(--faint)" }}>
          Brief generated {format(new Date(brief.generated_at), "d MMM yyyy")}
          {brief.viewed_at ? ` · Viewed ${format(new Date(brief.viewed_at), "d MMM")}` : ""}
        </span>
        <Link
          to="/app/deal-rooms/$id"
          params={{ id: dealRoomId }}
          className="inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: "rgba(124,58,237,0.8)" }}
        >
          Open deal room <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function DealFlowPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [addingWatchlist, setAddingWatchlist] = useState<string | null>(null);
  // R14 — table is the default; a VC scans more rooms per screen in a
  // table than a 2-3 col card grid. Cards stay available via the toggle.
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const handleAddToWatchlist = async (dealRoomId: string, company: string) => {
    if (!user?.id) return;
    setAddingWatchlist(dealRoomId);
    try {
      const { error } = await supabase.from("investor_watchlist").insert({
        investor_id: user.id,
        company_name: company,
        source: "deal_flow",
        status: "Watching",
      });
      if (error) throw error;
      toast.success(`${company} added to watchlist`);
      queryClient.invalidateQueries({ queryKey: ["investor-watchlist-count", user.id] });
    } catch {
      toast.error("Failed to add to watchlist");
    } finally {
      setAddingWatchlist(null);
    }
  };

  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ["investor-deal-flow", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_members")
        .select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status, startup_id, investor_company, investor_name,
            startups(company_name, sector, stage, funding_target, description, tagline)
          )
        `)
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? [])
        .map((r: any) => {
          const dr = r.deal_rooms;
          const companyName =
            dr?.startups?.company_name ||
            dr?.investor_company ||
            (dr?.investor_name ? `Deal with ${dr.investor_name}` : null) ||
            "Unnamed";
          return {
          id: r.deal_room_id,
          updatedAt: dr?.updated_at,
          status: dr?.status,
          startupId: dr?.startup_id ?? null,
          company: companyName,
          sector: dr?.startups?.sector,
          stage: dr?.startups?.stage,
          fundingTarget: dr?.startups?.funding_target,
          blurb: dr?.startups?.tagline || dr?.startups?.description,
        };
        })
        .filter((r) => !!r.id)
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    },
  });

  const filtered = q
    ? rooms.filter((r) =>
        r.company.toLowerCase().includes(q.toLowerCase()) ||
        (r.sector ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : rooms;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deal Flow</h1>
          <div className="text-sm text-muted-foreground">
            Deal rooms you've been invited to appear here automatically
          </div>
        </div>
        <PageGuide pageId="investor-deal-flow" />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company or sector…"
            className="w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 gap-0.5 shrink-0">
          <button
            onClick={() => setViewMode("table")}
            title="Table view"
            className={`p-1.5 rounded-md transition-colors ${viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            title="Card view"
            className={`p-1.5 rounded-md transition-colors ${viewMode === "cards" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <EmptyState kind="loading" title="Loading" />
        ) : isError ? (
          <EmptyState
            kind="error"
            title="Something went wrong"
            action={{ label: "Try again", onClick: () => window.location.reload() }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState kind={q ? "no-results" : "empty"} title={q ? "No matches" : "No deals"} />
        ) : viewMode === "table" ? (
          <div style={{ overflowX: "auto", border: `1px solid ${color.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${color.border}` }}>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Company</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Sector</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "left", fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Stage</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "right", fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Target</th>
                  <th style={{ padding: "0 16px", height: 36, textAlign: "right", fontSize: 11, fontWeight: 500, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>Updated</th>
                  <th style={{ padding: "0 16px", height: 36 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => (
                  <tr
                    key={room.id}
                    onClick={() => navigate({ to: "/app/deal-rooms/$id", params: { id: room.id } })}
                    style={{ height: tableTokens.rowHeight, borderBottom: tableTokens.rowBorder, cursor: "pointer" }}
                    className="hover:bg-accent/30 transition-colors"
                  >
                    <td style={{ padding: "0 16px", fontSize: 13, fontWeight: 600, color: color.ink }}>{room.company}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: color.inkTertiary }}>{room.sector || "—"}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: color.inkTertiary }}>{room.stage || "—"}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: color.ink, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{room.fundingTarget || "—"}</td>
                    <td style={{ padding: "0 16px", fontSize: 13, color: color.inkTertiary, textAlign: "right", whiteSpace: "nowrap" }}>
                      {room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true }) : "—"}
                    </td>
                    <td style={{ padding: "0 16px", textAlign: "right" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAddToWatchlist(room.id, room.company); }}
                        disabled={addingWatchlist === room.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[11px] hover:bg-accent disabled:opacity-50"
                      >
                        {addingWatchlist === room.id
                          ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          : <Plus className="h-2.5 w-2.5" />}
                        Watchlist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((room) => (
              <div key={room.id} className="rounded-2xl border border-border/60 bg-card hover:shadow-card transition-shadow group flex flex-col">
                <Link
                  to="/app/deal-rooms/$id"
                  params={{ id: room.id }}
                  className="flex-1 block p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-sm font-semibold shrink-0">
                      {room.company[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate group-hover:text-brand transition-colors">{room.company}</div>
                      <div className="text-xs text-muted-foreground">
                        {room.sector || "General"} · {room.stage || "Stage TBD"}
                      </div>
                    </div>
                  </div>
                  {room.blurb && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{room.blurb}</p>
                  )}
                </Link>
                <div className="px-5 pb-4 flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-xs font-medium text-brand">
                    {room.fundingTarget || "Target TBD"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {room.updatedAt
                        ? formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })
                        : "—"}
                    </span>
                    <button
                      onClick={() => handleAddToWatchlist(room.id, room.company)}
                      disabled={addingWatchlist === room.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-0.5 text-[10px] hover:bg-accent disabled:opacity-50"
                    >
                      {addingWatchlist === room.id
                        ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        : <Plus className="h-2.5 w-2.5" />}
                      Watchlist
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); void navigate({ to: "/app/deal-rooms/$id", params: { id: room.id } }); }}
                      className="inline-flex items-center gap-1 rounded-md bg-accent text-brand px-2 py-0.5 text-[10px] font-medium hover:bg-accent"
                    >
                      Open <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
                {room.startupId && user?.id && (
                  <DealBriefPanel
                    startupId={room.startupId}
                    investorId={user.id}
                    dealRoomId={room.id}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

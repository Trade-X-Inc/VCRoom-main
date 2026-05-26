import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck, ExternalLink, Loader2, Flag, Clock, Eye, CheckCircle2,
  ChevronDown, Building2, Users, Globe, TrendingUp, Target, ArrowRight,
  Plus, Search, X, Briefcase,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/investor/diligence")({
  component: DiligencePage,
});

const CATEGORIES = ["Financials", "Team", "Legal", "Market", "Product", "References"] as const;
type DDCategory = (typeof CATEGORIES)[number];
const STATUSES = ["Pending", "In Review", "Complete", "Red Flag"] as const;
type DDStatus = (typeof STATUSES)[number];

const STATUS_CONFIG: Record<DDStatus, { icon: any; cls: string; label: string }> = {
  "Pending":   { icon: Clock,        cls: "bg-muted text-muted-foreground",     label: "Pending" },
  "In Review": { icon: Eye,          cls: "bg-brand/10 text-brand",             label: "In Review" },
  "Complete":  { icon: CheckCircle2, cls: "bg-success/10 text-success",         label: "Complete" },
  "Red Flag":  { icon: Flag,         cls: "bg-destructive/10 text-destructive", label: "Red Flag" },
};

// Standard DD checklist items per category
const DD_CHECKLIST: Record<DDCategory, string[]> = {
  Financials: [
    "Revenue model reviewed",
    "Last 12 months MRR/ARR verified",
    "Burn rate & runway calculated",
    "Cap table reviewed",
    "Revenue projections stress-tested",
    "Unit economics (LTV/CAC) assessed",
  ],
  Team: [
    "Founders' backgrounds verified",
    "Key team members identified",
    "Gaps in leadership assessed",
    "Founder-market fit evaluated",
    "Equity split reviewed",
    "Advisor quality checked",
  ],
  Legal: [
    "Company incorporation verified",
    "IP ownership confirmed",
    "Outstanding litigation checked",
    "Shareholder agreements reviewed",
    "Employee contracts checked",
    "Regulatory compliance assessed",
  ],
  Market: [
    "TAM/SAM/SOM validated",
    "Market growth rate confirmed",
    "Key competitors mapped",
    "Differentiation assessed",
    "Go-to-market strategy reviewed",
    "Geographic expansion potential",
  ],
  Product: [
    "Product demo completed",
    "Technical architecture reviewed",
    "Product-market fit signals",
    "Roadmap feasibility assessed",
    "Tech debt evaluated",
    "Key metrics (DAU/MAU, churn) reviewed",
  ],
  References: [
    "Customer references collected",
    "Reference calls completed",
    "Net Promoter Score data reviewed",
    "Case studies / testimonials reviewed",
    "Investor reference checks done",
    "Team reference checks done",
  ],
};

function DiligencePage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const [selectedStartupId, setSelectedStartupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCat, setExpandedCat] = useState<DDCategory | null>("Financials");

  // Fetch investor's thesis
  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-dd", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("thesis, preferred_stages, preferred_sectors, min_ticket, max_ticket")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch investor's watchlist companies
  const { data: startups = [], isLoading: startupsLoading } = useQuery({
    queryKey: ["investor-watchlist-dd", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_watchlist")
        .select("*")
        .eq("investor_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Separate query for deal room membership (for "Open Deal Room" button)
  const { data: memberRooms = [] } = useQuery({
    queryKey: ["investor-rooms", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(startup_id)")
        .eq("user_id", userId);
      return data ?? [];
    },
  });

  const getDealRoomId = (startupId: string) => {
    const match = (memberRooms as any[]).find((m: any) => (m.deal_rooms as any)?.startup_id === startupId);
    return match?.deal_room_id ?? null;
  };

  // DD checklist state for selected startup (stored in Supabase)
  const { data: ddState = {} } = useQuery({
    queryKey: ["lite-dd-state", userId, selectedStartupId],
    enabled: !!userId && !!selectedStartupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_dd_lite")
        .select("category, item_index, checked, status")
        .eq("investor_id", userId)
        .eq("watchlist_id", selectedStartupId!);
      const state: Record<string, any> = {};
      (data ?? []).forEach((row: any) => {
        const key = `${row.category}::${row.item_index}`;
        state[key] = { checked: row.checked };
        if (row.status) state[`status::${row.category}`] = row.status;
      });
      return state;
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ category, index, checked }: { category: string; index: number; checked: boolean }) => {
      await supabase.from("investor_dd_lite").upsert({
        investor_id: userId,
        watchlist_id: selectedStartupId,
        category,
        item_index: index,
        checked,
      }, { onConflict: "investor_id,watchlist_id,category,item_index" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lite-dd-state", userId, selectedStartupId] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ category, status }: { category: string; status: string }) => {
      await supabase.from("investor_dd_lite").upsert({
        investor_id: userId,
        watchlist_id: selectedStartupId,
        category,
        item_index: -1,
        checked: false,
        status,
      }, { onConflict: "investor_id,watchlist_id,category,item_index" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lite-dd-state", userId, selectedStartupId] }),
  });

  const getChecked = (category: string, index: number) =>
    ddState[`${category}::${index}`]?.checked ?? false;

  const getCatStatus = (category: string): DDStatus =>
    (ddState[`status::${category}`] as DDStatus) ?? "Pending";

  const getCatProgress = (category: DDCategory) => {
    const items = DD_CHECKLIST[category];
    const done = items.filter((_, i) => getChecked(category, i)).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  const getTotalProgress = () => {
    const total = CATEGORIES.reduce((sum, c) => sum + DD_CHECKLIST[c].length, 0);
    const done = CATEGORIES.reduce((sum, c) => {
      return sum + DD_CHECKLIST[c].filter((_, i) => getChecked(c, i)).length;
    }, 0);
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  // Thesis match scoring
  const getThesisMatch = (startup: any) => {
    if (!investorProfile) return null;
    let score = 0; let max = 0;
    const { preferred_stages, preferred_sectors } = investorProfile;

    if (preferred_stages?.length) {
      max += 40;
      if (preferred_stages.includes(startup.stage)) score += 40;
    }
    if (preferred_sectors?.length) {
      max += 40;
      if (preferred_sectors.some((s: string) => startup.sector?.toLowerCase().includes(s.toLowerCase()))) score += 40;
    }
    max += 20; // bonus for having description
    if (startup.description?.length > 50) score += 20;

    if (max === 0) return null;
    return Math.round((score / max) * 100);
  };

  const selectedStartup = startups.find((s) => s.id === selectedStartupId);
  const filteredStartups = startups.filter((s) =>
    s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.sector?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const thesisMatch = selectedStartup ? getThesisMatch(selectedStartup) : null;
  const totalProgress = selectedStartupId ? getTotalProgress() : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left sidebar — company picker */}
      <div className="w-72 shrink-0 border-r border-border/60 flex flex-col bg-card overflow-hidden">
        <div className="px-4 py-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold">Due Diligence</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies…"
              className="w-full rounded-lg border border-border/60 bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-brand/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {startupsLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          )}
          {!startupsLoading && filteredStartups.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No companies yet. Add founders to your pipeline first.</p>
            </div>
          )}
          {filteredStartups.map((s) => {
            const match = getThesisMatch(s);
            const isSelected = selectedStartupId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStartupId(s.id)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-colors border-b border-border/40 last:border-0",
                  isSelected ? "bg-brand/5 border-l-2 border-l-brand" : "hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand/20 to-brand/10 text-[11px] font-bold text-brand shrink-0">
                    {s.company_name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{s.company_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{s.stage} · {s.sector || "—"}</div>
                  </div>
                  {match !== null && (
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                      match >= 70 ? "bg-success/15 text-success" : match >= 40 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                    )}>
                      {match}%
                    </span>
                  )}
                </div>
                {getDealRoomId(s.id) && (
                  <div className="mt-1 ml-10 flex items-center gap-1">
                    <Briefcase className="h-2.5 w-2.5 text-brand" />
                    <span className="text-[9px] text-brand">In deal room</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedStartup ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
              <h3 className="text-base font-semibold">Select a company</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Pick a company from the left to run due diligence — see their profile, thesis fit, and track your checklist.
              </p>
              {startups.length === 0 && !startupsLoading && (
                <Link
                  to="/app/investor/deal-flow"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow"
                >
                  View Deal Flow <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand/20 to-brand/10 text-lg font-bold text-brand">
                  {selectedStartup.company_name?.[0]}
                </div>
                <div>
                  <h1 className="text-xl font-semibold">{selectedStartup.company_name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{selectedStartup.stage}</span>
                    {selectedStartup.sector && <><span className="text-muted-foreground/40">·</span><span className="text-xs text-muted-foreground">{selectedStartup.sector}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {getDealRoomId(selectedStartup.id) ? (
                  <Link
                    to="/app/deal-room/$id"
                    params={{ id: getDealRoomId(selectedStartup.id)! }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
                  >
                    <Briefcase className="h-4 w-4" /> Open Deal Room <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/app/deal-rooms"
                    className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-sm hover:bg-brand/10"
                  >
                    <Plus className="h-4 w-4" /> Create Deal Room
                  </Link>
                )}
              </div>
            </div>

            {/* Three cols: profile + thesis + progress */}
            <div className="grid sm:grid-cols-3 gap-4">
              {/* Founder profile */}
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Founder</div>
                <div className="flex items-center gap-2">
                  {selectedStartup.users?.avatar_url ? (
                    <img src={selectedStartup.users.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                      {selectedStartup.users?.full_name?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium">{selectedStartup.users?.full_name ?? "Unknown"}</div>
                    <div className="text-[10px] text-muted-foreground">Founder & CEO</div>
                  </div>
                </div>
                {selectedStartup.team_size && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Team size: <span className="text-foreground font-medium">{selectedStartup.team_size}</span>
                  </div>
                )}
                {selectedStartup.website && (
                  <a
                    href={selectedStartup.website.startsWith("http") ? selectedStartup.website : `https://${selectedStartup.website}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-brand hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> {selectedStartup.website}
                  </a>
                )}
                {selectedStartup.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{selectedStartup.description}</p>
                )}
              </div>

              {/* Thesis match */}
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Thesis Match</div>
                {thesisMatch === null ? (
                  <div className="text-xs text-muted-foreground">
                    No thesis set.{" "}
                    <Link to="/app/investor/profile" className="text-brand hover:underline">Set your thesis →</Link>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-2">
                      <div className={cn(
                        "text-3xl font-bold",
                        thesisMatch >= 70 ? "text-success" : thesisMatch >= 40 ? "text-warning" : "text-muted-foreground"
                      )}>
                        {thesisMatch}%
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">fit score</div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          thesisMatch >= 70 ? "bg-success" : thesisMatch >= 40 ? "bg-warning" : "bg-muted-foreground/40"
                        )}
                        style={{ width: `${thesisMatch}%` }}
                      />
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {investorProfile?.preferred_stages?.length > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Stage</span>
                          {investorProfile.preferred_stages.includes(selectedStartup.stage)
                            ? <span className="text-success flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Match</span>
                            : <span className="text-muted-foreground">No match ({selectedStartup.stage})</span>}
                        </div>
                      )}
                      {investorProfile?.preferred_sectors?.length > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Sector</span>
                          {investorProfile.preferred_sectors.some((s: string) => selectedStartup.sector?.toLowerCase().includes(s.toLowerCase()))
                            ? <span className="text-success flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> Match</span>
                            : <span className="text-muted-foreground">No match</span>}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* DD progress */}
              <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">DD Progress</div>
                {totalProgress && (
                  <>
                    <div className="flex items-end gap-2">
                      <div className="text-3xl font-bold">{totalProgress.pct}%</div>
                      <div className="text-xs text-muted-foreground mb-1">{totalProgress.done}/{totalProgress.total} items</div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-gradient-brand rounded-full transition-all" style={{ width: `${totalProgress.pct}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {CATEGORIES.map((cat) => {
                        const { pct } = getCatProgress(cat);
                        const status = getCatStatus(cat);
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <div key={cat} className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]", cfg.cls)}>
                            <cfg.icon className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{cat}</span>
                            <span className="ml-auto font-medium">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Checklist accordion */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Due Diligence Checklist</h2>
              <p className="text-xs text-muted-foreground -mt-2">Lite version — document analysis available in the Deal Room workstation.</p>
              {CATEGORIES.map((cat) => {
                const { done, total, pct } = getCatProgress(cat);
                const status = getCatStatus(cat);
                const cfg = STATUS_CONFIG[status];
                const isOpen = expandedCat === cat;
                return (
                  <div key={cat} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    {/* Category header */}
                    <button
                      onClick={() => setExpandedCat(isOpen ? null : cat)}
                      className="w-full flex items-center gap-3 px-5 py-4 hover:bg-accent/30 transition-colors"
                    >
                      <span className={cn("grid h-7 w-7 place-items-center rounded-lg shrink-0", cfg.cls)}>
                        <cfg.icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold">{cat}</div>
                        <div className="text-[10px] text-muted-foreground">{done}/{total} complete</div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-24 hidden sm:block">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-brand transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {/* Status selector */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={status}
                          onChange={(e) => setStatus.mutate({ category: cat, status: e.target.value })}
                          className={cn(
                            "appearance-none rounded-md px-2.5 py-1 text-[11px] font-medium pr-6 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand/50",
                            cfg.cls
                          )}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                    </button>

                    {/* Checklist items */}
                    {isOpen && (
                      <div className="border-t border-border/60 divide-y divide-border/40">
                        {DD_CHECKLIST[cat].map((item, idx) => {
                          const checked = getChecked(cat, idx);
                          return (
                            <label
                              key={idx}
                              className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => toggleItem.mutate({ category: cat, index: idx, checked: e.target.checked })}
                                className="h-4 w-4 rounded border-border accent-brand cursor-pointer"
                              />
                              <span className={cn("text-sm flex-1", checked && "line-through text-muted-foreground")}>
                                {item}
                              </span>
                              {checked && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom note */}
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Document analysis is in the Deal Room.</span>{" "}
                This checklist covers profile review and thesis match. For deep document analysis — pitch decks, financials, legal docs — open the Deal Room Workstation.
                {getDealRoomId(selectedStartup.id)
                  ? <Link to="/app/deal-room/$id" params={{ id: getDealRoomId(selectedStartup.id)! }} className="ml-1 text-brand hover:underline">Go to workstation →</Link>
                  : <Link to="/app/deal-rooms" className="ml-1 text-brand hover:underline">Create a deal room →</Link>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
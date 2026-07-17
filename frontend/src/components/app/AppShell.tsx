import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import {
  MessageCircle, Search, Settings, ChevronsLeft, ChevronDown, ChevronRight,
  ArrowLeft, Sparkles, UserCircle2, Menu, X,
} from "lucide-react";
import {
  founderSections, investorSections, activeSectionFor, overviewPathFor,
  isGroup, firstLeafOf, allLeavesOf, type L2Section, type L3Item,
} from "@/lib/nav-structure";
import { AIOperatorPanel } from "@/components/ai/AIOperatorPanel";
import { useSubscription } from "@/hooks/useSubscription";
import {
  getFounderCompleteness,
  getInvestorCompleteness,
  getFounderProfileCompleteness,
  type ProfileBuilderSession,
  type InvestorProfile,
} from "@/lib/profileCompleteness";
import { ProfileCompletionBanner } from "@/components/app/ProfileCompletionBanner";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/store";

interface SearchResult {
  id: string;
  type: "startup" | "investor" | "document" | "deal_room";
  title: string;
  subtitle: string | null;
  tag: string | null;
  tag2: string | null;
  slug: string | null;
  url: string;
  rank: number;
}

// R9: the L2/L3/L4 hierarchy lives in src/lib/nav-structure.ts \u2014 this file
// only renders it (L2 list \u27f7 section L3 list, the single sidebar swap).
const memberProfileNav = { to: "/app/member-profile", label: "My Profile", icon: UserCircle2 };

const SIDEBAR_KEY = "hs_sidebar_expanded";

function getSidebarDefault(): boolean {
  // Collapsed by default (true = collapsed) unless user previously expanded
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(SIDEBAR_KEY);
  return stored === null ? true : stored !== "1";
}

export function AppShell({ children }: { children?: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsedState] = useState(getSidebarDefault);
  const [mobileOpen, setMobileOpen] = useState(false);
  // The mobile drawer always renders at full width regardless of the desktop
  // collapsed/expanded preference, so labels must show whenever it's open —
  // otherwise nav items render as unlabeled icons with no way to identify them.
  const showExpanded = !collapsed || mobileOpen;

  const setCollapsed = (val: boolean) => {
    setCollapsedState(val);
    try {
      localStorage.setItem(SIDEBAR_KEY, val ? "0" : "1");
    } catch {}
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const profile = useProfile();

  const isInvestor = user?.role === "investor";

  // R9 contextual navigation: L2 list by default; inside a group section the
  // sidebar swaps (the ONLY swap) to that section's L3 list.
  const sections = isInvestor ? investorSections : founderSections;
  const activeSection = activeSectionFor(path, sections);
  const overviewPath = overviewPathFor(isInvestor);
  // R12 step 1: ground-truth set of which L3 groups are visibly expanded.
  // Previously this was computed via an XOR of a "manually toggled" flag
  // against "does this group contain the active leaf" — which meant
  // clicking any L4 child (changing which leaf is active) flipped that XOR
  // and collapsed the group the user was just looking at. Now expansion is
  // explicit: a group opens when its own toggle is clicked, or the first
  // time navigation lands inside it, and it only ever closes when the user
  // clicks that group's own toggle again — never as a side effect of
  // clicking one of its own children.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Longest-matching leaf wins active state — "Deal Room" (/app/deal-rooms)
  // must not light up while a sibling like /app/deal-rooms/prep-notes is open.
  const bestMatch = (() => {
    if (!activeSection) return null;
    let best: string | null = null;
    for (const leaf of allLeavesOf(activeSection)) {
      if (path === leaf.to || path.startsWith(leaf.to + "/")) {
        if (!best || leaf.to.length > best.length) best = leaf.to;
      }
    }
    return best;
  })();
  // Fresh L2 section entry ("Back to Dashboard" or clicking a different L2
  // group) resets to a clean sidebar, auto-opening only the group containing
  // the section's own active leaf, if any.
  useEffect(() => {
    if (!activeSection) { setExpandedGroups(new Set()); return; }
    const initial = new Set<string>();
    for (const item of activeSection.children ?? []) {
      if (isGroup(item) && item.children.some((c) => path === c.to || path.startsWith(c.to + "/"))) {
        initial.add(item.label);
      }
    }
    setExpandedGroups(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection?.key]);
  // Auto-open (never auto-close) whenever navigation lands inside a group
  // that isn't already expanded — e.g. following a link from outside the
  // sidebar directly into an L4 leaf.
  useEffect(() => {
    if (!activeSection || !bestMatch) return;
    for (const item of activeSection.children ?? []) {
      if (isGroup(item) && item.children.some((c) => c.to === bestMatch) && !expandedGroups.has(item.label)) {
        setExpandedGroups((prev) => new Set(prev).add(item.label));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestMatch]);
  // Ask AI panel — trigger lives in the header (right corner, next to profile).
  const [aiOpen, setAiOpen] = useState<boolean>(
    () => typeof localStorage !== "undefined" && localStorage.getItem("hs_ai_panel_open") === "true",
  );

  // Company name + profile-completeness fields from startups table (founder only)
  const { data: startupData } = useQuery({
    queryKey: ["shell-startup", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select(
          "id, company_name, stage, tagline, sector, country, funding_target, description, problem, solution, why_us, intro_video_url, founder_name, revenue_model, use_of_funds"
        )
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as
        | ({ id: string; company_name: string; stage: string | null } & Record<string, unknown>)
        | null;
    },
  });

  // Team membership check (shows "My Profile" nav item)
  const { data: isTeamMember } = useQuery({
    queryKey: ["is-team-member", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { count } = await supabase
        .from("startup_team_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "active");
      return (count ?? 0) > 0;
    },
  });

  // Profile completeness — founder side
  const { data: pbSession } = useQuery({
    queryKey: ["shell-pb-session", startupData?.id],
    enabled: !!startupData?.id && !isInvestor,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_builder_sessions")
        .select("status, path, missing_fields")
        .eq("startup_id", startupData!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as ProfileBuilderSession | null;
    },
  });

  // Profile completeness — investor side
  const { data: investorProfileFields } = useQuery({
    queryKey: ["shell-investor-completeness", user?.id],
    enabled: !!user?.id && isInvestor,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("fund_name, your_name, thesis, thesis_statement, sectors, stages, check_size_min, check_size_max, geography")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as (InvestorProfile & { thesis_statement: string | null }) | null;
    },
  });

  const shellCompleteness = isInvestor
    ? getInvestorCompleteness(investorProfileFields ?? null)
    : getFounderCompleteness(pbSession ?? null);

  // Profile-completion gate (Task 2) — distinct from the session/8-field
  // completeness above, which drives the sidebar widget only.
  const founderProfilePercent = !isInvestor && startupData
    ? getFounderProfileCompleteness(startupData).percent
    : null;
  const investorHasThesisStatement = isInvestor
    ? !!(investorProfileFields?.thesis_statement && investorProfileFields.thesis_statement.trim())
    : null;

  const resumeUrl = isInvestor ? "/app/investor/profile" : "/app/profile-builder";

  const lastRedirectRef = useRef<string>("");
  useEffect(() => {
    if (!user) return;
    const investorOutOfBounds =
      isInvestor &&
      !path.startsWith("/app/investor") &&
      !path.startsWith("/app/team-chat") &&
      path !== "/app/advisor" &&
      path !== "/app/verification" &&
      !path.startsWith("/app/profile") &&
      !path.startsWith("/app/settings") &&
      !path.startsWith("/app/investor/settings") &&
      !path.startsWith("/app/meetings") &&
      !path.startsWith("/app/deal-room") &&
      !path.startsWith("/app/messages") &&
      !path.startsWith("/app/directory") &&
      !path.startsWith("/app/wall") &&
      !path.startsWith("/app/referrals") &&
      !path.startsWith("/app/member-profile") &&
      !path.startsWith("/app/audit") &&
      !path.startsWith("/app/feedback");
    const founderOutOfBounds = !isInvestor && path.startsWith("/app/investor") && !path.startsWith("/app/member-profile");
    if (investorOutOfBounds && lastRedirectRef.current !== "investor") {
      lastRedirectRef.current = "investor";
      navigate({ to: "/app/investor" });
    } else if (founderOutOfBounds && lastRedirectRef.current !== "founder") {
      lastRedirectRef.current = "founder";
      navigate({ to: "/app" });
    } else if (!investorOutOfBounds && !founderOutOfBounds) {
      lastRedirectRef.current = "";
    }
  }, [isInvestor, path]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;
        const { data: userRow } = await supabase
          .from("users")
          .select("role")
          .eq("id", authUser.id)
          .maybeSingle();
        const { data, error } = await supabase.rpc("global_search", {
          search_query: query.trim(),
          searcher_id: authUser.id,
          searcher_role: userRow?.role ?? "founder",
          result_limit: 8,
        });
        if (!error && data) setSearchResults(data as SearchResult[]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  if (authLoading) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Redirecting…</div>;
  }

  const workspaceName = isInvestor
    ? (user.fullName || "")
    : (startupData?.company_name || profile?.name || "");

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "border-r border-border/60 bg-sidebar flex flex-col transition-all duration-200 z-50",
        // Desktop: always visible, collapsible
        "hidden md:flex",
        collapsed ? "md:w-[68px]" : "md:w-[248px]",
        // Mobile: fixed overlay, slides in
        mobileOpen && "!flex fixed inset-y-0 left-0 w-[248px] shadow-xl",
      )}>
        <div className="h-14 md:h-16 flex items-center px-4 border-b border-border/60 shrink-0">
          {/* Logo is an in-app home affordance while signed in — never the
              public marketing page (CLAUDE.md §9 logo auth branch). */}
          <Link to={(isInvestor ? "/app/investor" : "/app") as any} className="flex-1"><Logo withWordmark={showExpanded} /></Link>
          {/* Desktop collapse button */}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="hidden md:block text-muted-foreground hover:text-foreground">
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
          {/* Mobile close button */}
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-3">
          <div className={cn("flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2", !showExpanded && "justify-center")}>
            {profile?.logoDataUrl && !isInvestor ? (
              <img src={profile.logoDataUrl} alt={workspaceName} className="h-6 w-6 rounded-md object-cover" />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-[10px] font-semibold text-brand-foreground">
                {user.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : "VR"}
              </div>
            )}
            {showExpanded && (
              <div className="flex-1 min-w-0">
                {workspaceName ? (
                  <>
                    <div className="text-xs font-medium truncate">{workspaceName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {isInvestor ? "Fund · Partner" : (startupData?.stage || profile?.stage || "Company")}
                    </div>
                  </>
                ) : (
                  <Link to={(isInvestor ? "/app/investor/profile" : "/app/profile") as any} className="text-xs font-medium text-brand hover:underline">
                    Set up your profile →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile completeness banner — hidden when complete or sidebar collapsed */}
        {showExpanded && !shellCompleteness.isComplete && (
          <div style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            margin: "0 12px 8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                Profile {shellCompleteness.percent}% complete
              </span>
            </div>
            <div className="h-1 rounded-sm overflow-hidden mb-2 bg-muted">
              <div style={{
                height: "100%",
                width: `${shellCompleteness.percent}%`,
                background: "var(--gradient-brand)",
                borderRadius: 2,
                transition: "width 0.3s",
              }} />
            </div>
            <a href={resumeUrl} style={{
              fontSize: 12,
              color: "#A855F7",
              fontWeight: 500,
              textDecoration: "none",
            }}>
              Finish it →
            </a>
          </div>
        )}

        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {activeSection ? (
            /* ── L3 sidebar — the single swap. Back always → L2 Overview. ── */
            <>
              <Link
                to={overviewPath as any}
                onClick={() => setMobileOpen(false)}
                data-testid="back-to-dashboard"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors",
                  !showExpanded && "justify-center px-0",
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                {showExpanded && <span>Back to Dashboard</span>}
              </Link>
              {showExpanded && (
                <div
                  className="px-2.5 pt-4 pb-1.5 font-semibold"
                  style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, color: "var(--foreground)" }}
                >
                  {activeSection.label}
                </div>
              )}
              {showExpanded && (activeSection.children ?? []).map((item: L3Item) => {
                if (isGroup(item)) {
                  // L3 group label — expand/collapse only, never a page.
                  const expanded = expandedGroups.has(item.label);
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          next.has(item.label) ? next.delete(item.label) : next.add(item.label);
                          return next;
                        })}
                        data-testid={`l3-group-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                        className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-left"
                      >
                        {expanded
                          ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                        <span className="flex-1">{item.label}</span>
                      </button>
                      {expanded && (
                        <div className="ml-[13px] pl-3 border-l border-border/60 space-y-0.5 mt-0.5 mb-1">
                          {item.children.map((leaf) => {
                            const leafActive = bestMatch === leaf.to;
                            return (
                              <Link
                                key={leaf.to}
                                to={leaf.to as any}
                                preload="intent"
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                                  leafActive
                                    ? "text-brand font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                                )}
                              >
                                {leaf.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                // L3 leaf — a real page.
                const leafActive = bestMatch === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    preload="intent"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                      leafActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                    )}
                  >
                    {leafActive && (
                      <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full hs-gradient-static" />
                    )}
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </>
          ) : (
            /* ── L2 list — the shell's default sidebar. ── */
            sections.map((s: L2Section) => {
              const target = s.to ?? firstLeafOf(s);
              const active = !!s.to && (path === s.to || path.startsWith(s.to + "/"));
              return (
                <Link
                  key={s.key}
                  to={target as any}
                  preload="intent"
                  onClick={() => setMobileOpen(false)}
                  aria-label={s.label}
                  data-testid={`l2-${s.key}`}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                    !showExpanded && "justify-center px-0",
                  )}
                >
                  {active && (
                    <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full hs-gradient-static" />
                  )}
                  <s.icon className={cn("h-4 w-4", active && "text-brand")} />
                  {showExpanded && <span className="flex-1">{s.label}</span>}
                  {showExpanded && s.children && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                  )}
                </Link>
              );
            })
          )}

          {showExpanded && (
            <>
              <div className="mx-2 mt-5 mb-2 hs-hairline-t" />
              {isTeamMember && (
                <Link
                  to={memberProfileNav.to as any}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                >
                  <memberProfileNav.icon className="h-4 w-4" />
                  <span>{memberProfileNav.label}</span>
                </Link>
              )}
              <Link
                to={"/app/feedback" as any}
                onClick={() => setMobileOpen(false)}
                aria-label="Feedback"
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Feedback</span>
              </Link>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border/60">
          {!showExpanded ? (
            <>
              {/* Percent ring when sidebar collapsed + profile incomplete */}
              {!shellCompleteness.isComplete && (
                <a href={resumeUrl} title={`Profile ${shellCompleteness.percent}% complete — finish it`}
                  className="mb-1 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-muted)" strokeWidth="3" />
                    <circle
                      cx="16" cy="16" r="13" fill="none"
                      stroke="var(--brand)" strokeWidth="3"
                      strokeDasharray={`${2 * Math.PI * 13}`}
                      strokeDashoffset={`${2 * Math.PI * 13 * (1 - shellCompleteness.percent / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 16 16)"
                    />
                    <text x="16" y="20" textAnchor="middle" fill="#A855F7" fontSize="8" fontWeight="600">
                      {shellCompleteness.percent}%
                    </text>
                  </svg>
                </a>
              )}
              <Link
                to={"/app/settings" as any}
                className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button onClick={() => setCollapsed(false)} className="mt-1 w-full grid place-items-center py-2 text-muted-foreground hover:text-foreground">
                <ChevronsLeft className="h-4 w-4 rotate-180" />
              </button>
            </>
          ) : null}
        </div>
      </aside>

      {/* Main content + AI panel */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {/* Content column */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 md:h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center px-3 md:px-6 gap-2 md:gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden grid h-9 w-9 place-items-center rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Search — hidden on mobile, visible md+ */}
            <div className="hidden md:flex flex-1 max-w-md">
              <button
                onClick={() => setSearchOpen(true)}
                className="relative w-full flex items-center rounded-md border border-border/60 bg-background/60 pl-9 pr-12 py-2 text-sm text-muted-foreground/70 hover:border-brand/40 hover:text-muted-foreground transition-colors text-left"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                Search
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">⌘K</kbd>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1.5 md:gap-2">
              {/* Ask AI — the panel's trigger lives here now (R9 decision),
                  not on a right-edge rail. */}
              <button
                onClick={() => setAiOpen(true)}
                data-testid="header-ask-ai"
                aria-label="Ask AI"
                className="inline-flex items-center gap-1.5 h-9 rounded-md px-3 text-sm font-medium text-white hs-gradient transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden md:inline">Ask AI</span>
              </button>
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <SubscriptionBanner />
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col">
            <div className="flex flex-col flex-1 w-full max-w-[1600px] mx-auto">
              {!isInvestor && founderProfilePercent !== null && founderProfilePercent >= 40 && founderProfilePercent < 70 && (
                <ProfileCompletionBanner variant="founder" percent={founderProfilePercent} />
              )}
              {isInvestor && investorHasThesisStatement === false && (
                <ProfileCompletionBanner variant="investor" />
              )}
              {children ?? <Outlet />}
            </div>
          </main>
        </div>

        {/* AI Operator Panel — right side, full height, part of shell layout */}
        {user && (
          <AIOperatorPanel
            userRole={isInvestor ? "investor" : "founder"}
            userId={user.id}
            open={aiOpen}
            onOpenChange={setAiOpen}
            pageContext={
              !isInvestor && startupData
                ? {
                    route: "",
                    pageName: "",
                    relevantData: {
                      company: startupData.company_name,
                      stage: startupData.stage ?? undefined,
                      completenessPercent: founderProfilePercent ?? undefined,
                    },
                  }
                : undefined
            }
          />
        )}
      </div>
      {/* Global search modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl bg-card border border-border/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 p-4 border-b border-border/60">
              <Search size={18} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search founders, investors, documents..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
              {searching && (
                <div className="w-4 h-4 border-2 border-muted border-t-brand rounded-full animate-spin shrink-0" />
              )}
              <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                </div>
              )}
              {searchQuery.length < 2 && (
                <div className="py-6 text-center">
                  <p className="text-xs text-muted-foreground">Search founders, investors, documents, deal rooms</p>
                </div>
              )}
              {(["startup", "investor", "deal_room", "document"] as const).map((type) => {
                const typeResults = searchResults.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;
                const typeLabel = { startup: "Founders", investor: "Investors", deal_room: "Deal Rooms", document: "Documents" }[type];
                const typeIcon = { startup: "◎", investor: "✦", deal_room: "🏛", document: "≡" }[type];
                return (
                  <div key={type} className="mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider px-3 mb-1">{typeIcon} {typeLabel}</p>
                    {typeResults.map((result) => (
                      <a
                        key={result.id}
                        href={result.url}
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-accent transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground group-hover:text-[#a78bfa] transition-colors truncate">{result.title}</p>
                          {result.subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 ml-3 shrink-0">
                          {result.tag && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>
                              {result.tag}
                            </span>
                          )}
                          {result.tag2 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{result.tag2}</span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {searchResults.length > 0 && (
              <div className="px-4 py-2 border-t border-border flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</span>
                <span className="text-xs text-muted-foreground ml-auto">↵ to open</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subscription banner — trial expiry / payment failure (soft gate only) ─────
// Shown at the top of every /app/* page. Not dismissible. Does NOT block
// access — hard blocking arrives with Stripe.

function SubscriptionBanner() {
  const { trialExpired, isPastDue, trialEndsAt } = useSubscription();

  if (isPastDue) {
    return (
      <div
        className="w-full px-4 py-2.5 text-center text-sm font-medium text-foreground shrink-0"
        style={{ background: "#B45309" }}
        data-testid="subscription-banner-pastdue"
      >
        Your payment failed. Update your payment method to restore full access.{" "}
        <Link to={"/pricing" as any} className="underline underline-offset-2 font-semibold">
          Update payment →
        </Link>
      </div>
    );
  }

  if (trialExpired) {
    const ended = trialEndsAt
      ? new Date(trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "recently";
    return (
      <div
        className="w-full px-4 py-2.5 text-center text-sm font-medium text-foreground shrink-0"
        style={{ background: "var(--gradient-brand)" }}
        data-testid="subscription-banner-trial"
      >
        Your free trial ended on {ended}. Choose a plan to keep access.{" "}
        <Link to={"/pricing" as any} className="underline underline-offset-2 font-semibold">
          View plans →
        </Link>
      </div>
    );
  }

  return null;
}

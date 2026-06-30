import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutGrid, Users, Building2, FileText, Briefcase,
  MessageSquare, MessageCircle, Calendar, Search, Settings, ChevronsLeft, Plus, Gavel,
  PieChart, Brain, ClipboardCheck, ShieldCheck, UserCog, UserCircle2, Gift, Globe, Trophy, Menu, X, FileInput, LayoutDashboard,
} from "lucide-react";
import { AIOperatorPanel } from "@/components/ai/AIOperatorPanel";
import {
  getFounderCompleteness,
  getInvestorCompleteness,
  type ProfileBuilderSession,
  type InvestorProfile,
} from "@/lib/profileCompleteness";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/store";

interface NavItem { to: string; label: string; icon: any; badge?: string; }

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

const founderNav: NavItem[] = [
  { to: "/app/overview", label: "Overview", icon: LayoutGrid },
  { to: "/app", label: "Workstation", icon: LayoutDashboard },
  { to: "/app/deal-rooms", label: "Deal Rooms", icon: Briefcase },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/meetings", label: "Meetings", icon: Calendar },
  { to: "/app/connections", label: "Connections", icon: Users },
  { to: "/app/messages", label: "Team Chat", icon: MessageSquare },
  { to: "/app/directory", label: "Directory", icon: Globe },
  { to: "/app/wall", label: "The Wall", icon: Trophy },
  { to: "/app/referrals", label: "Referrals", icon: Gift },
];

const investorNav: NavItem[] = [
  { to: "/app/investor/overview", label: "Overview", icon: LayoutGrid },
  { to: "/app/investor/intake", label: "Deal Intake", icon: FileInput },
  { to: "/app/investor/connections", label: "Connections", icon: Users },
  { to: "/app/investor/deal-rooms", label: "Deal Rooms", icon: Briefcase },
  { to: "/app/investor/diligence", label: "Due Diligence", icon: ClipboardCheck },
  { to: "/app/investor/analysis", label: "AI Analysis", icon: Brain },
  { to: "/app/investor/decisions", label: "Decisions", icon: Gavel },
  { to: "/app/investor/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/app/meetings", label: "Meetings", icon: Calendar },
  { to: "/app/messages", label: "Team Chat", icon: MessageSquare },
  { to: "/app/directory", label: "Directory", icon: Globe },
  { to: "/app/wall", label: "The Wall", icon: Trophy },
  { to: "/app/referrals", label: "Referrals", icon: Gift },
];

const workspaceNavFounder: NavItem[] = [
  { to: "/app/profile", label: "Profile", icon: UserCircle2 },
  { to: "/app/users", label: "Team", icon: UserCog },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const memberProfileNav: NavItem = { to: "/app/member-profile", label: "My Profile", icon: UserCircle2 };

const workspaceNavInvestor: NavItem[] = [
  { to: "/app/investor/profile", label: "Profile", icon: UserCircle2 },
  { to: "/app/investor/team", label: "Team", icon: Users },
  // Feedback button is injected inline after Team (index 1)
  { to: "/app/investor/settings", label: "Settings", icon: Settings },
];

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
  const nav = isInvestor ? investorNav : founderNav;
  const workspaceNav = isInvestor ? workspaceNavInvestor : workspaceNavFounder;

  // Company name from startups table (founder only)
  const { data: startupData } = useQuery({
    queryKey: ["shell-startup", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, stage")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as { id: string; company_name: string; stage: string | null } | null;
    },
  });

  // Deal room count (founder only)
  const { data: dealRoomCount } = useQuery({
    queryKey: ["shell-deal-room-count", startupData?.id],
    enabled: !!startupData?.id && !isInvestor,
    queryFn: async () => {
      const { count } = await supabase
        .from("deal_rooms")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupData!.id);
      return count ?? 0;
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

  // Connections badge — unseen auto-added entries (red dot priority) else active count
  const { data: investorDealCount } = useQuery({
    queryKey: ["shell-investor-deal-count", user?.id],
    enabled: !!user?.id && isInvestor,
    queryFn: async () => {
      // Prioritise unseen auto-added rows (founders who joined via invite link)
      const { count: unseen } = await supabase
        .from("investor_watchlist")
        .select("*", { count: "exact", head: true })
        .eq("investor_id", user!.id)
        .eq("auto_added", true)
        .eq("seen_by_investor", false);
      if ((unseen ?? 0) > 0) return unseen ?? 0;
      // Fall back to total active count
      const { count } = await supabase
        .from("investor_watchlist")
        .select("*", { count: "exact", head: true })
        .eq("investor_id", user!.id)
        .not("status", "in", '("Invested","Passed")');
      return count ?? 0;
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
        .select("fund_name, your_name, thesis, sectors, stages, check_size_min, check_size_max, geography")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as InvestorProfile | null;
    },
  });

  const shellCompleteness = isInvestor
    ? getInvestorCompleteness(investorProfileFields ?? null)
    : getFounderCompleteness(pbSession ?? null);

  const resumeUrl = isInvestor ? "/app/investor/profile" : "/app/profile-builder";

  const lastRedirectRef = useRef<string>("");
  useEffect(() => {
    if (!user) return;
    const investorOutOfBounds =
      isInvestor &&
      !path.startsWith("/app/investor") &&
      !workspaceNavInvestor.some((n) => path.startsWith(n.to)) &&
      path !== "/app/advisor" &&
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
          <Link to="/" className="flex-1"><Logo withWordmark={!collapsed} /></Link>
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
          <div className={cn("flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2", collapsed && "justify-center")}>
            {profile?.logoDataUrl && !isInvestor ? (
              <img src={profile.logoDataUrl} alt={workspaceName} className="h-6 w-6 rounded-md object-cover" />
            ) : (
              <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-[10px] font-semibold text-brand-foreground">
                {user.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : "VR"}
              </div>
            )}
            {!collapsed && (
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
        {!collapsed && !shellCompleteness.isComplete && (
          <div style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            margin: "0 12px 8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                Profile {shellCompleteness.percent}% complete
              </span>
            </div>
            <div className="h-1 rounded-sm overflow-hidden mb-2 bg-muted">
              <div style={{
                height: "100%",
                width: `${shellCompleteness.percent}%`,
                background: "#7C3AED",
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

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isInvestor ? "Investor" : "Workspace"}
            </div>
          )}
          {nav.map((n, index) => {
            const active = path === n.to || path === n.to + "/" || (n.to !== "/app" && n.to !== "/app/overview" && n.to !== "/app/investor" && path.startsWith(n.to));
            const badge = (() => {
              if (n.to === "/app/deal-rooms") return dealRoomCount && dealRoomCount > 0 ? String(dealRoomCount) : undefined;
              if (n.to === "/app/investor/connections") return investorDealCount && investorDealCount > 0 ? String(investorDealCount) : undefined;
              return n.badge;
            })();
            
            // Show COMMUNITY section label before directory item
            const showCommunityLabel = n.to === "/app/directory" && !collapsed;
            
            return (
              <div key={n.to}>
                {showCommunityLabel && (
                  <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Community
                  </div>
                )}
                <Link
                  to={n.to as any}
                  preload="intent"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors group",
                    active ? "bg-accent text-foreground font-medium shadow-xs" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <n.icon className={cn("h-4 w-4", active && "text-brand")} />
                  {!collapsed && <span className="flex-1">{n.label}</span>}
                  {!collapsed && badge && (
                    <span className="text-[10px] rounded-full bg-background border border-border/60 px-1.5 py-0.5 text-muted-foreground">
                      {badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}

          {!collapsed && (
            <>
              <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Admin
              </div>
              {/* Render workspace nav items, injecting Feedback button after "Team" item (index 1) */}
              {[...workspaceNav, ...(isTeamMember ? [memberProfileNav] : [])].map((n, idx) => {
                const active = path === n.to || path.startsWith(n.to + "/");
                return (
                  <div key={n.to}>
                    <Link
                      to={n.to as any}
                      preload="intent"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                        active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                    >
                      <n.icon className={cn("h-4 w-4", active && "text-brand")} />
                      <span>{n.label}</span>
                    </Link>
                    {/* Inject Feedback after Team (index 1 = second item) */}
                    {idx === 1 && (
                      <Link
                        to={"/app/feedback" as any}
                        onClick={() => setMobileOpen(false)}
                        className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Feedback</span>
                      </Link>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border/60">
          {collapsed ? (
            <>
              {/* Percent ring when sidebar collapsed + profile incomplete */}
              {!shellCompleteness.isComplete && (
                <a href={resumeUrl} title={`Profile ${shellCompleteness.percent}% complete — finish it`}
                  className="mb-1 flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-muted)" strokeWidth="3" />
                    <circle
                      cx="16" cy="16" r="13" fill="none"
                      stroke="#7C3AED" strokeWidth="3"
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
                Search investors, documents, deals…
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">⌘K</kbd>
              </button>
            </div>

            <div className="ml-auto flex items-center gap-1.5 md:gap-2">
              <button className="hidden md:grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4" />
              </button>
              <ThemeToggle />
              <NotificationBell />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col">
            <div className="flex flex-col flex-1 w-full max-w-[1600px] mx-auto">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>

        {/* AI Operator Panel — right side, full height, part of shell layout */}
        {user && (
          <AIOperatorPanel
            userRole={isInvestor ? "investor" : "founder"}
            userId={user.id}
            pageContext={
              !isInvestor && startupData
                ? {
                    route: "",
                    pageName: "",
                    relevantData: {
                      company: startupData.company_name,
                      stage: startupData.stage ?? undefined,
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
                <div className="w-4 h-4 border-2 border-muted border-t-[#7C3AED] rounded-full animate-spin shrink-0" />
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
              <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3">
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

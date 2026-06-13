import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutGrid, Users, Building2, FileText, Briefcase,
  MessageSquare, MessageCircle, Calendar, Sparkles, Search, Settings, ChevronsLeft, Plus, Inbox, Gavel,
  PieChart, Brain, ClipboardCheck, ShieldCheck, UserCog, Kanban, BarChart3, UserCircle2, Gift, Globe, Trophy, Newspaper, Plug, Menu, X, Rocket,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/store";

interface NavItem { to: string; label: string; icon: any; badge?: string; }

const founderNav: NavItem[] = [
  { to: "/app", label: "Overview", icon: LayoutGrid },
  { to: "/app/leads", label: "VC Leads", icon: Users },
  { to: "/app/pipeline", label: "Pipeline", icon: Kanban },
  { to: "/app/deal-rooms", label: "Deal Rooms", icon: Briefcase },
  { to: "/app/profile", label: "Company Profile", icon: Building2 },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/meetings", label: "Meetings", icon: Calendar },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/advisor", label: "AI Advisor", icon: Sparkles },
  { to: "/app/messages", label: "Team Chat", icon: MessageSquare },
  { to: "/app/directory", label: "Directory", icon: Globe },
  { to: "/app/accelerators", label: "Accelerators", icon: Rocket },
  { to: "/app/wall", label: "The Wall", icon: Trophy },
  { to: "/app/referrals", label: "Referrals", icon: Gift },
];

const investorNav: NavItem[] = [
  { to: "/app/investor", label: "Overview", icon: LayoutGrid },
  { to: "/app/investor/deal-flow", label: "Deal Flow", icon: Inbox },
  { to: "/app/investor/pipeline", label: "My Pipeline", icon: Kanban },
  { to: "/app/investor/startups", label: "Startups", icon: Building2 },
  { to: "/app/investor/diligence", label: "Due Diligence", icon: ClipboardCheck },
  { to: "/app/investor/analysis", label: "AI Analysis", icon: Brain },
  { to: "/app/investor/advisor", label: "AI Advisor", icon: Sparkles },
  { to: "/app/investor/decisions", label: "Decisions", icon: Gavel },
  { to: "/app/investor/portfolio", label: "Portfolio", icon: PieChart },
  { to: "/app/meetings", label: "Meetings", icon: Calendar },
  { to: "/app/messages", label: "Team Chat", icon: MessageSquare },
  { to: "/app/directory", label: "Directory", icon: Globe },
  { to: "/app/wall", label: "The Wall", icon: Trophy },
  { to: "/app/referrals", label: "Referrals", icon: Gift },
];

const workspaceNavFounder: NavItem[] = [
  { to: "/app/users", label: "Team & Users", icon: UserCog },
  { to: "/app/audit", label: "Audit Log", icon: ShieldCheck },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const workspaceNavInvestor: NavItem[] = [
  { to: "/app/investor/profile", label: "Profile", icon: UserCircle2 },
  { to: "/app/investor/team", label: "Team", icon: Users },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    setSaving(true);
    try {
      await supabase.from("feedback").insert({
        user_id: user?.id,
        email: user?.email,
        rating,
        message: comment.trim(),
        created_at: new Date().toISOString(),
      });
      toast.success("Thank you for your feedback!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border/60 rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">How is your experience?</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2 justify-center">
          {[1,2,3,4,5].map((s) => (
            <button key={s} onClick={() => setRating(s)}
              className={`text-2xl transition-transform hover:scale-110 ${s <= rating ? "opacity-100" : "opacity-30"}`}>
              ⭐
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any comments? (optional)"
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand/50"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border/60 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving || !rating}
            className="flex-1 rounded-lg bg-brand text-brand-foreground py-2 text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors">
            {saving ? "Sending…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children?: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const profile = useProfile();

  const isInvestor = user?.role === "investor";
  const nav = isInvestor ? investorNav : founderNav;
  const workspaceNav = isInvestor ? workspaceNavInvestor : workspaceNavFounder;

  // Live lead count from Supabase (founder only)
  const { data: leadCount } = useQuery({
    queryKey: ["lead-count", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { count } = await supabase
        .from("vc_leads")
        .select("*", { count: "exact", head: true })
        .eq("founder_id", user!.id);
      return count ?? 0;
    },
  });

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

  // Investor deal room count (investor only)
  const { data: investorDealCount } = useQuery({
    queryKey: ["shell-investor-deal-count", user?.id],
    enabled: !!user?.id && isInvestor,
    queryFn: async () => {
      const { count } = await supabase
        .from("deal_room_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
  });

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
      !path.startsWith("/app/meetings") &&
      !path.startsWith("/app/deal-room") &&
      !path.startsWith("/app/messages") &&
      !path.startsWith("/app/news") &&
      !path.startsWith("/app/directory") &&
      !path.startsWith("/app/wall") &&
      !path.startsWith("/app/referrals");
    const founderOutOfBounds = !isInvestor && path.startsWith("/app/investor");
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
    <div className="min-h-screen bg-background flex">
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

        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {isInvestor ? "Investor" : "Workspace"}
            </div>
          )}
          {nav.map((n, index) => {
            const active = path === n.to || path === n.to + "/" || (n.to !== "/app" && n.to !== "/app/investor" && path.startsWith(n.to));
            const badge = (() => {
              if (n.to === "/app/leads") return leadCount && leadCount > 0 ? String(leadCount) : undefined;
              if (n.to === "/app/deal-rooms") return dealRoomCount && dealRoomCount > 0 ? String(dealRoomCount) : undefined;
              if (n.to === "/app/investor/deal-flow") return investorDealCount && investorDealCount > 0 ? String(investorDealCount) : undefined;
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
              {/* Feedback button — opens modal, no navigation */}
              <button
                onClick={() => { setFeedbackOpen(true); setMobileOpen(false); }}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Feedback</span>
              </button>
              {workspaceNav.map((n) => {
                const active = path.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
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
                );
              })}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border/60">
          {collapsed ? (
            <>
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
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search investors, documents, deals…"
                className="w-full rounded-md border border-border/60 bg-background/60 pl-9 pr-12 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
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
        <main className="flex-1 min-w-0 overflow-x-hidden">{children ?? <Outlet />}</main>
      </div>
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}

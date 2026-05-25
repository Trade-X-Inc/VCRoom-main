import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutGrid, Users, Building2, FileText, Briefcase,
  MessageSquare, Calendar, Sparkles, Search, Settings, ChevronsLeft, Plus, Inbox, Gavel,
  PieChart, Brain, ClipboardCheck, ShieldCheck, UserCog, Kanban, BarChart3, UserCircle2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { LangSwitcher } from "@/components/app/LangSwitcher";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/store";

interface NavItem { to: string; labelKey: string; icon: any; badge?: string; }

const founderNav: NavItem[] = [
  { to: "/app", labelKey: "app.overview", icon: LayoutGrid },
  { to: "/app/leads", labelKey: "app.leads", icon: Users },
  { to: "/app/pipeline", labelKey: "app.pipeline", icon: Kanban },
  { to: "/app/deal-rooms", labelKey: "app.dealRooms", icon: Briefcase },
  { to: "/app/profile", labelKey: "app.profile", icon: Building2 },
  { to: "/app/documents", labelKey: "app.documents", icon: FileText },
  { to: "/app/meetings", labelKey: "app.meetings", icon: Calendar },
  { to: "/app/reports", labelKey: "reports.title", icon: BarChart3 },
  { to: "/app/advisor", labelKey: "app.advisor", icon: Sparkles },
  { to: "/app/messages", labelKey: "Team Chat", icon: MessageSquare },
];

const investorNav: NavItem[] = [
  { to: "/app/investor", labelKey: "app.overview", icon: LayoutGrid },
  { to: "/app/investor/deal-flow", labelKey: "Deal Flow", icon: Inbox },
  { to: "/app/investor/pipeline", labelKey: "My Pipeline", icon: Kanban },
  { to: "/app/investor/startups", labelKey: "app.startups", icon: Building2 },
  { to: "/app/investor/diligence", labelKey: "app.diligence", icon: ClipboardCheck },
  { to: "/app/investor/analysis", labelKey: "app.analysis", icon: Brain },
  { to: "/app/investor/advisor", labelKey: "AI Advisor", icon: Sparkles },
  { to: "/app/investor/decisions", labelKey: "app.decisions", icon: Gavel },
  { to: "/app/investor/portfolio", labelKey: "Portfolio", icon: PieChart },
  { to: "/app/meetings", labelKey: "app.meetings", icon: Calendar },
  { to: "/app/messages", labelKey: "Team Chat", icon: MessageSquare },
  { to: "/app/investor/profile", labelKey: "Profile", icon: UserCircle2 },
];

const workspaceNavFounder: NavItem[] = [
  { to: "/app/users", labelKey: "app.users", icon: UserCog },
  { to: "/app/audit", labelKey: "app.audit", icon: ShieldCheck },
  { to: "/app/settings", labelKey: "app.settings", icon: Settings },
];

const workspaceNavInvestor: NavItem[] = [
  { to: "/app/investor/team", labelKey: "Team", icon: Users },
  { to: "/app/settings", labelKey: "app.settings", icon: Settings },
];

export function AppShell({ children }: { children?: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { t } = useI18n();
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
      !path.startsWith("/app/messages");
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

  if (!user) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Redirecting…</div>;
  }

  const workspaceName = isInvestor
    ? (user.fullName || "")
    : (startupData?.company_name || profile?.name || "");

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn("border-r border-border/60 bg-sidebar flex flex-col transition-all", collapsed ? "w-[68px]" : "w-[248px]")}>
        <div className="h-16 flex items-center px-4 border-b border-border/60">
          <Link to="/" className="flex-1"><Logo withWordmark={!collapsed} /></Link>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-muted-foreground hover:text-foreground">
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
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
              {isInvestor ? "Investor" : t("app.workspace")}
            </div>
          )}
          {nav.map((n) => {
            const active = path === n.to || path === n.to + "/" || (n.to !== "/app" && n.to !== "/app/investor" && path.startsWith(n.to));
            const badge = (() => {
              if (n.to === "/app/leads") return leadCount && leadCount > 0 ? String(leadCount) : undefined;
              if (n.to === "/app/deal-rooms") return dealRoomCount && dealRoomCount > 0 ? String(dealRoomCount) : undefined;
              if (n.to === "/app/investor/deal-flow") return investorDealCount && investorDealCount > 0 ? String(investorDealCount) : undefined;
              return n.badge;
            })();
            return (
              <Link
                key={n.to}
                to={n.to as any}
                preload="intent"
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors group",
                  active ? "bg-accent text-foreground font-medium shadow-xs" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <n.icon className={cn("h-4 w-4", active && "text-brand")} />
                {!collapsed && <span className="flex-1">{t(n.labelKey)}</span>}
                {!collapsed && badge && (
                  <span className="text-[10px] rounded-full bg-background border border-border/60 px-1.5 py-0.5 text-muted-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}

          {!collapsed && (
            <>
              <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {t("app.admin")}
              </div>
              {workspaceNav.map((n) => {
                const active = path.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to as any}
                    preload="intent"
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                      active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    <n.icon className={cn("h-4 w-4", active && "text-brand")} />
                    <span>{t(n.labelKey)}</span>
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
        <header className="h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center px-6 gap-3">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder={t("app.search")}
                className="w-full rounded-md border border-border/60 bg-background/60 pl-9 pr-12 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <Plus className="h-4 w-4" />
            </button>
            <LangSwitcher />
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 min-w-0">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
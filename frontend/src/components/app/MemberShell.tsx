import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutGrid, FileText, Sparkles, MessageSquare,
  UserCircle2, Settings, Menu, X, MessageCircle, Briefcase,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useAccountContext } from "@/hooks/useAccountContext";
import { NotificationBell } from "@/components/app/NotificationBell";
import { UserMenu } from "@/components/app/UserMenu";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, FOUNDER_PERMISSIONS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { X as CloseIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFounderProfileCompleteness } from "@/lib/profileCompleteness";
import { ProfileCompletionBanner } from "@/components/app/ProfileCompletionBanner";

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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><CloseIcon className="h-4 w-4" /></button>
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

export function MemberShell({ children }: { children?: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const ctx = useAccountContext();

  // Assigned deal rooms count
  const { data: assignedRooms = [] } = useQuery({
    queryKey: ["member-assigned-rooms", ctx.teamAccountId],
    enabled: !!ctx.teamAccountId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_team_assignments")
        .select("deal_room_id, deal_rooms(id, startups(company_name))")
        .eq("team_account_id", ctx.teamAccountId!);
      return data ?? [];
    },
  });

  const roleLabel = ROLE_LABELS[ctx.role] ?? ctx.role;
  const canUseAI = FOUNDER_PERMISSIONS[ctx.role]?.use_ai_advisor ?? false;
  const canEditProfile = FOUNDER_PERMISSIONS[ctx.role]?.edit_profile ?? false;
  const assignedCount = assignedRooms.length;

  // Profile-completion banner (Task 2) — only for founder team members who
  // can actually act on it (edit_profile permission, e.g. "manager").
  const { data: memberStartup } = useQuery({
    queryKey: ["member-shell-startup", ctx.startupId],
    enabled: !!ctx.startupId && canEditProfile,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select(
          "company_name, tagline, sector, stage, country, funding_target, description, problem, solution, why_us, intro_video_url, founder_name, revenue_model, use_of_funds"
        )
        .eq("id", ctx.startupId!)
        .maybeSingle();
      return data;
    },
  });
  const memberFounderPercent = memberStartup ? getFounderProfileCompleteness(memberStartup).percent : null;

  const navItems = [
    { to: "/app/member", label: "Overview", icon: LayoutGrid },
    { to: "/app/deal-rooms", label: "My Deal Rooms", icon: Briefcase, badge: assignedCount > 0 ? String(assignedCount) : undefined },
    { to: "/app/documents", label: "Documents", icon: FileText },
    ...(canUseAI ? [{ to: "/app/advisor", label: "AI Advisor", icon: Sparkles }] : []),
    { to: "/app/messages", label: "Team Chat", icon: MessageSquare },
  ];

  if (authLoading || ctx.loading) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Redirecting…</div>;
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "border-r border-border/60 bg-sidebar flex flex-col transition-all duration-200 z-50",
        "hidden md:flex md:w-[248px]",
        mobileOpen && "!flex fixed inset-y-0 left-0 w-[248px] shadow-xl",
      )}>
        {/* Logo */}
        <div className="h-14 md:h-16 flex items-center px-4 border-b border-border/60 shrink-0">
          <Link to="/" className="flex-1"><Logo withWordmark /></Link>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Identity block */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-[10px] font-semibold text-brand-foreground shrink-0">
              {user.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : "TM"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{ctx.companyName ?? "Team"}</div>
              <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                <span
                  style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", padding: "1px 6px", borderRadius: 99, fontSize: 10, fontWeight: 600 }}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          <div className="px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Workspace
          </div>
          {navItems.map((n) => {
            const active = path === n.to || (n.to !== "/app/member" && path.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to as any}
                preload="intent"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active ? "bg-accent text-foreground font-medium shadow-xs" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <n.icon className={cn("h-4 w-4", active && "text-brand")} />
                <span className="flex-1">{n.label}</span>
                {n.badge && (
                  <span className="text-[10px] rounded-full bg-background border border-border/60 px-1.5 py-0.5 text-muted-foreground">
                    {n.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            My Account
          </div>
          <Link
            to={"/app/member-profile" as any}
            preload="intent"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              path.startsWith("/app/member-profile") ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <UserCircle2 className={cn("h-4 w-4", path.startsWith("/app/member-profile") && "text-brand")} />
            <span>My Profile</span>
          </Link>

          <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Support
          </div>
          <button
            onClick={() => { setFeedbackOpen(true); setMobileOpen(false); }}
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Feedback</span>
          </button>
        </nav>

        <div className="p-3 border-t border-border/60" />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-20 flex items-center px-3 md:px-6 gap-2 md:gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden grid h-9 w-9 place-items-center rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto flex flex-col">
          <div className="flex flex-col flex-1 w-full max-w-[1600px] mx-auto">
            {canEditProfile && memberFounderPercent !== null && memberFounderPercent >= 40 && memberFounderPercent < 70 && (
              <ProfileCompletionBanner variant="founder" percent={memberFounderPercent} />
            )}
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}

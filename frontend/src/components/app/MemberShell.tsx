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
import { cn } from "@/lib/utils";
import { ROLE_LABELS, FOUNDER_PERMISSIONS } from "@/lib/roles";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { X as CloseIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getFounderProfileCompleteness } from "@/lib/profileCompleteness";
import { ProfileCompletionBanner } from "@/components/app/ProfileCompletionBanner";
import { V2Button } from "@/components/v2";

// Star rating replaced with a plain 1-5 numeric scale (§13 bans emoji and
// decorative iconography in the interface — the star glyphs were exactly
// that, not a functional control).
function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id,
        email: user?.email,
        rating,
        message: comment.trim(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Thank you for your feedback!");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(22,24,28,0.4)" }}>
      <div
        className="w-full max-w-sm p-6 space-y-4 font-v2-ui"
        style={{ background: "var(--v2-panel)", border: "1px solid var(--v2-rule)", borderRadius: "var(--v2-radius)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm" style={{ color: "var(--v2-ink)" }}>How is your experience?</h3>
          <button onClick={onClose} style={{ color: "var(--v2-ink-muted)" }}><CloseIcon className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className="h-9 w-9 text-sm font-medium font-v2-data transition-colors"
              style={{
                borderRadius: "var(--v2-radius)",
                border: s === rating ? "1.5px solid var(--v2-accent)" : "1px solid var(--v2-rule)",
                background: s === rating ? "var(--v2-accent-wash)" : "var(--v2-panel)",
                color: s === rating ? "var(--v2-accent)" : "var(--v2-ink-muted)",
              }}
              aria-label={`Rate ${s} of 5`}
              aria-pressed={s === rating}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any comments? (optional)"
          className="w-full px-3 py-2 text-sm resize-none outline-none font-v2-ui"
          style={{ border: "1px solid var(--v2-rule)", borderRadius: "var(--v2-radius)", background: "var(--v2-panel)", color: "var(--v2-ink)" }}
        />
        <div className="flex gap-2">
          <V2Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</V2Button>
          <V2Button variant="primary" className="flex-1" onClick={submit} disabled={saving || !rating}>
            {saving ? "Sending…" : "Submit"}
          </V2Button>
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
    { to: "/app/messages", label: "Team Chat", icon: MessageSquare },
  ];

  if (authLoading || ctx.loading) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-background grid place-items-center text-sm text-muted-foreground">Redirecting…</div>;
  }

  return (
    <div className="h-screen flex overflow-hidden font-v2-ui" style={{ background: "var(--v2-surface)" }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(22,24,28,0.4)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col transition-all duration-200 z-50",
          "hidden md:flex md:w-[248px]",
          mobileOpen && "!flex fixed inset-y-0 left-0 w-[248px]",
        )}
        style={{ borderInlineEnd: "1px solid var(--v2-rule)", background: "var(--v2-panel)" }}
      >
        {/* Logo */}
        <div className="h-14 md:h-16 flex items-center px-4 shrink-0" style={{ borderBottom: "1px solid var(--v2-rule)" }}>
          {/* Logo is an in-app home affordance while signed in — never the
              public marketing page (CLAUDE.md §9 logo auth branch). */}
          <Link to={"/app/member" as any} className="flex-1"><Logo withWordmark /></Link>
          <button onClick={() => setMobileOpen(false)} className="md:hidden transition-colors" style={{ color: "var(--v2-ink-muted)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Identity block */}
        <div className="px-3 py-3">
          <div
            className="flex items-center gap-2 px-2.5 py-2"
            style={{ border: "1px solid var(--v2-rule)", borderRadius: "var(--v2-radius)", background: "var(--v2-panel)" }}
          >
            <div
              className="grid h-6 w-6 place-items-center text-[10px] font-semibold text-white shrink-0"
              style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-accent)" }}
            >
              {user.fullName ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : "TM"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: "var(--v2-ink)" }}>{ctx.companyName ?? "Team"}</div>
              <div className="text-[10px] truncate flex items-center gap-1" style={{ color: "var(--v2-ink-muted)" }}>
                <span
                  style={{
                    background: "var(--v2-accent-wash)", color: "var(--v2-accent)",
                    padding: "1px 6px", borderRadius: "var(--v2-radius)", fontSize: 10, fontWeight: 600,
                  }}
                >
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          <div className="px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--v2-ink-muted)" }}>
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
                className="flex items-center gap-2.5 text-sm font-v2-ui transition-colors"
                style={{
                  borderRadius: "var(--v2-radius)", padding: "8px 10px",
                  background: active ? "var(--v2-accent-wash)" : "transparent",
                  color: active ? "var(--v2-ink)" : "var(--v2-ink-muted)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                <n.icon className="h-4 w-4" style={{ color: active ? "var(--v2-accent)" : undefined }} />
                <span className="flex-1">{n.label}</span>
                {n.badge && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 font-v2-data"
                    style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-surface)", border: "1px solid var(--v2-rule)", color: "var(--v2-ink-muted)" }}
                  >
                    {n.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--v2-ink-muted)" }}>
            My Account
          </div>
          <Link
            to={"/app/member-profile" as any}
            preload="intent"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 text-sm font-v2-ui transition-colors"
            style={{
              borderRadius: "var(--v2-radius)", padding: "8px 10px",
              background: path.startsWith("/app/member-profile") ? "var(--v2-accent-wash)" : "transparent",
              color: path.startsWith("/app/member-profile") ? "var(--v2-ink)" : "var(--v2-ink-muted)",
              fontWeight: path.startsWith("/app/member-profile") ? 500 : 400,
            }}
          >
            <UserCircle2 className="h-4 w-4" style={{ color: path.startsWith("/app/member-profile") ? "var(--v2-accent)" : undefined }} />
            <span>My Profile</span>
          </Link>

          <div className="px-2 pt-4 pb-1.5 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--v2-ink-muted)" }}>
            Support
          </div>
          <button
            onClick={() => { setFeedbackOpen(true); setMobileOpen(false); }}
            className="w-full flex items-center gap-2.5 text-sm font-v2-ui transition-colors"
            style={{ borderRadius: "var(--v2-radius)", padding: "8px 10px", color: "var(--v2-ink-muted)" }}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Feedback</span>
          </button>
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid var(--v2-rule)" }} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 md:h-16 sticky top-0 z-20 flex items-center px-3 md:px-6 gap-2 md:gap-3"
          style={{ borderBottom: "1px solid var(--v2-rule)", background: "var(--v2-surface)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden grid h-9 w-9 place-items-center transition-colors shrink-0"
            style={{ borderRadius: "var(--v2-radius)", color: "var(--v2-ink-muted)" }}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
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

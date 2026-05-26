import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight, TrendingUp, Users, Briefcase, Mail, Sparkles,
  Calendar, FileText, CheckCircle2, Clock, Building2, X, Loader2,
  HelpCircle, ExternalLink, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: Overview,
});

// ── Types ──────────────────────────────────────────────────────────

interface Startup {
  id: string;
  name?: string | null;
  stage?: string | null;
  target_raise?: number | null;
  founder_id?: string;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  deal_room_id?: string | null;
  actor_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface DealRoom {
  id: string;
  name?: string | null;
  status?: string | null;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function activityIcon(action: string): { Icon: React.ElementType; cls: string } {
  const a = action.toLowerCase();
  if (a.includes("sign") || a.includes("nda")) return { Icon: CheckCircle2, cls: "text-success" };
  if (a.includes("document") || a.includes("view") || a.includes("file")) return { Icon: FileText, cls: "text-brand" };
  if (a.includes("email") || a.includes("reply") || a.includes("message")) return { Icon: Mail, cls: "text-violet" };
  if (a.includes("meeting") || a.includes("calendar") || a.includes("schedule")) return { Icon: Calendar, cls: "text-warning" };
  if (a.includes("deal") || a.includes("room")) return { Icon: Briefcase, cls: "text-success" };
  return { Icon: Clock, cls: "text-muted-foreground" };
}

const DEAL_ROOM_PROGRESS: Record<string, { p: number; bar: string }> = {
  decision: { p: 90, bar: "bg-success" },
  diligence: { p: 75, bar: "bg-success" },
  qa: { p: 52, bar: "bg-warning" },
  "q&a": { p: 52, bar: "bg-warning" },
  review: { p: 40, bar: "bg-brand" },
  onboard: { p: 20, bar: "bg-brand" },
};

function dealRoomProgress(status: string | null | undefined): { p: number; bar: string } {
  const s = (status ?? "").toLowerCase();
  for (const [key, val] of Object.entries(DEAL_ROOM_PROGRESS)) {
    if (s.includes(key)) return val;
  }
  return { p: 10, bar: "bg-brand" };
}

// ── How it works modal ─────────────────────────────────────────────

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { n: "1", title: "Add VC leads", body: "Build your target list of investors manually or via CSV import." },
    { n: "2", title: "Generate AI emails", body: "Use AI to write personalised cold outreach and follow-ups for each investor." },
    { n: "3", title: "Create deal rooms", body: "When VCs show interest, open a secure deal room to share documents." },
    { n: "4", title: "Close your round", body: "Manage diligence, Q&A, and investor decisions all in one place." },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">How Hockystick works</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5">
          {steps.map((s) => (
            <div key={s.n} className="flex items-start gap-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-sm font-semibold">
                {s.n}
              </div>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Onboarding step card ───────────────────────────────────────────

function OnboardingStep({
  icon: Icon,
  title,
  description,
  buttonLabel,
  to,
  done,
  disabled,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  buttonLabel: string;
  to: string;
  done: boolean;
  disabled?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-6 shadow-card flex flex-col gap-3",
        disabled && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", disabled ? "bg-muted" : "bg-brand/10")}>
          <Icon className={cn("h-5 w-5", disabled ? "text-muted-foreground" : "text-brand")} />
        </div>
        {done && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</div>
      </div>
      <button
        disabled={disabled}
        onClick={() => !disabled && navigate({ to: to as any })}
        className={cn(
          "mt-auto rounded-md px-3 py-2 text-sm font-medium transition-colors text-center",
          done
            ? "border border-border/60 text-muted-foreground hover:bg-accent"
            : disabled
            ? "border border-border/60 text-muted-foreground cursor-not-allowed"
            : "bg-gradient-brand text-brand-foreground shadow-glow hover:opacity-90",
        )}
      >
        {done ? "✓ " : ""}{buttonLabel}
      </button>
    </div>
  );
}

// ── Founder onboarding checklist ───────────────────────────────────

function FounderOnboarding({
  startup,
  docs,
  dealRooms,
  investorMembers,
}: {
  startup: any;
  docs: any[];
  dealRooms: any[];
  investorMembers: any[];
}) {
  const [dismissed, setDismissed] = useState(
    () => typeof localStorage !== "undefined" && !!localStorage.getItem("hs_onboarding_founder_dismissed"),
  );

  const steps = [
    {
      id: "profile",
      label: "Complete your company profile",
      description: "Add your pitch, team, and financials",
      done: !!(startup?.name),
      href: "/app/profile",
    },
    {
      id: "docs",
      label: "Upload your pitch deck",
      description: "Share documents with investors securely",
      done: docs.length > 0,
      href: "/app/documents",
    },
    {
      id: "dealroom",
      label: "Create your first deal room",
      description: "Your private space to close deals",
      done: dealRooms.length > 0,
      href: "/app/deal-rooms",
    },
    {
      id: "investor",
      label: "Invite your first investor",
      description: "Send a secure deal room invitation",
      done: investorMembers.length > 0,
      href: "/app/deal-rooms",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (dismissed || completed === steps.length) return null;

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">Get started with Hockystick</div>
          <div className="text-xs text-muted-foreground">{completed} of {steps.length} steps complete</div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem("hs_onboarding_founder_dismissed", "1");
            setDismissed(true);
          }}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-brand rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => (
          <Link
            key={step.id}
            to={step.href as any}
            className={cn(
              "rounded-lg border px-3 py-2.5 flex items-start gap-2.5 transition-colors",
              step.done
                ? "border-success/30 bg-success/5 opacity-70 pointer-events-none"
                : "border-border/60 bg-background/60 hover:bg-accent",
            )}
          >
            <div className="mt-0.5 shrink-0">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
            <div>
              <div className={cn("text-xs font-medium leading-tight", step.done && "text-muted-foreground")}>
                {step.label}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{step.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  trend,
  comingSoon,
}: {
  label: string;
  value: string | number;
  sub: string;
  trend?: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span
          className={cn("text-2xl font-semibold tracking-tight", comingSoon && "text-muted-foreground")}
        >
          {value}
        </span>
        {trend && (
          <span className="text-xs text-success inline-flex items-center gap-0.5">
            <TrendingUp className="h-3 w-3" /> {trend}
          </span>
        )}
        {comingSoon && (
          <span title="Coming soon" className="cursor-help inline-flex items-center">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60" />
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

function Overview() {
  const { user } = useAuth();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // FIX 1 — detect new vs returning user (parallel queries)
  const { data: startup = null, isLoading: startupLoading } = useQuery<Startup | null>({
    queryKey: ["my-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("*")
        .eq("founder_id", user!.id)
        .limit(1);
      return (data?.[0] as Startup) ?? null;
    },
  });

  const { data: leadCount = 0, isLoading: leadLoading } = useQuery<number>({
    queryKey: ["lead-count", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("vc_leads")
        .select("*", { count: "exact", head: true })
        .eq("founder_id", user!.id);
      return count ?? 0;
    },
  });

  const { data: dealRoomCount = 0 } = useQuery<number>({
    queryKey: ["deal-room-count", user?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("deal_rooms")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startup!.id);
      return count ?? 0;
    },
  });

  // Returning-user queries
  const { data: meetingCount = 0 } = useQuery<number>({
    queryKey: ["meeting-count", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data: rooms } = await supabase
        .from("deal_rooms")
        .select("id")
        .eq("startup_id", startup!.id);
      const ids = (rooms ?? []).map((r: { id: string }) => r.id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .in("deal_room_id", ids)
        .gt("scheduled_at", new Date().toISOString());
      return count ?? 0;
    },
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["recent-activity", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data: rooms } = await supabase
        .from("deal_rooms")
        .select("id")
        .eq("startup_id", startup!.id);
      const ids = (rooms ?? []).map((r: { id: string }) => r.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("activities")
        .select("*")
        .in("deal_room_id", ids)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Activity[];
    },
  });

  const { data: dealRooms = [] } = useQuery<DealRoom[]>({
    queryKey: ["hot-deal-rooms", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("*")
        .eq("startup_id", startup!.id)
        .order("updated_at", { ascending: false })
        .limit(3);
      return (data ?? []) as DealRoom[];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["my-docs-any", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data: rooms } = await supabase
        .from("deal_rooms").select("id").eq("startup_id", startup!.id);
      const ids = (rooms ?? []).map((r: any) => r.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("documents").select("id").in("deal_room_id", ids).limit(1);
      return data ?? [];
    },
  });

  const { data: investorMembers = [] } = useQuery({
    queryKey: ["investor-members-any", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data: rooms } = await supabase
        .from("deal_rooms").select("id").eq("startup_id", startup!.id);
      const ids = (rooms ?? []).map((r: any) => r.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("deal_room_members").select("role").in("deal_room_id", ids).eq("role", "investor").limit(1);
      return data ?? [];
    },
  });

  const { data: pipelineLeads = [] } = useQuery<{ status: string }[]>({
    queryKey: ["pipeline-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vc_leads")
        .select("status")
        .eq("founder_id", user!.id);
      return (data ?? []) as { status: string }[];
    },
  });

  const { data: overdueLeads = [] } = useQuery<
    { id: string; investor_name: string; firm_name: string | null; follow_up_date: string }[]
  >({
    queryKey: ["overdue-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("vc_leads")
        .select("id, investor_name, firm_name, follow_up_date")
        .eq("founder_id", user!.id)
        .lte("follow_up_date", today.toISOString())
        .order("follow_up_date", { ascending: true })
        .limit(5);
      return (data ?? []) as any[];
    },
  });

  const { data: todayMeetings = [] } = useQuery<any[]>({
    queryKey: ["today-meetings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from("meetings")
        .select("id, title, scheduled_at, meeting_link, vc_leads(investor_name)")
        .eq("created_by", user!.id)
        .gte("scheduled_at", start.toISOString())
        .lte("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const isQueriesLoading = !user?.id || startupLoading || leadLoading;
  const isNewUser = !isQueriesLoading && !startup && leadCount === 0;

  // ── Loading state ────────────────────────────────────────────────
  if (isQueriesLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── FIX 2 — New user onboarding view ────────────────────────────
  if (isNewUser) {
    const completedSteps =
      (startup ? 1 : 0) + (leadCount > 0 ? 1 : 0) + (dealRoomCount > 0 ? 1 : 0);
    const progressPct = Math.round((completedSteps / 4) * 100);

    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Hockystick 👋</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Let's get your fundraise set up. Complete these steps to get started.
            </p>
          </div>
          <button
            onClick={() => setHowItWorksOpen(true)}
            className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" /> How it works
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{completedSteps} of 4 steps complete</span>
            <span className="text-xs text-muted-foreground">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-brand rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Step cards 2×2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OnboardingStep
            icon={Building2}
            title="Set up your company profile"
            description="Add your startup details, team, and pitch so investors know who you are."
            buttonLabel="Set up profile"
            to="/app/profile"
            done={!!startup}
          />
          <OnboardingStep
            icon={Users}
            title="Build your investor list"
            description="Add VCs manually or import a CSV of investor contacts to target."
            buttonLabel="Add leads"
            to="/app/leads"
            done={leadCount > 0}
          />
          <OnboardingStep
            icon={Briefcase}
            title="Create your first deal room"
            description="A secure space to share documents and collaborate with investors."
            buttonLabel="Create deal room"
            to="/app/deal-rooms"
            done={dealRoomCount > 0}
          />
          <OnboardingStep
            icon={Mail}
            title="Invite your first investor"
            description="Send a deal room invite with NDA to a VC you're in conversation with."
            buttonLabel="Go to deal rooms"
            to="/app/deal-rooms"
            done={false}
            disabled={dealRoomCount === 0}
          />
        </div>

        {howItWorksOpen && <HowItWorksModal onClose={() => setHowItWorksOpen(false)} />}
      </div>
    );
  }

  // ── FIX 3 — Returning user dashboard ────────────────────────────

  const statusMap: Record<string, number> = {};
  pipelineLeads.forEach(({ status }) => {
    statusMap[status] = (statusMap[status] ?? 0) + 1;
  });

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user?.name?.split(" ")[0] ?? "Founder";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <FounderOnboarding startup={startup} docs={docs} dealRooms={dealRooms} investorMembers={investorMembers} />
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{greeting}, {firstName}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {startup?.name ?? "Your Startup"}{startup?.stage ? ` — ${startup.stage}` : ""}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setHowItWorksOpen(true)}
            className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" /> How it works
          </button>
          <Link
            to="/app/email"
            className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"
          >
            <Mail className="h-4 w-4" /> Compose
          </Link>
          <Link
            to="/app/leads"
            className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow inline-flex items-center gap-1.5"
          >
            Add lead <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Today's actions */}
      {(() => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleDealRooms = dealRooms.filter((r) => new Date(r.updated_at) < sevenDaysAgo);
        const noProfile = !startup?.name;

        type Action = {
          key: string;
          label: string;
          sub: string;
          border: string;
          link?: string | null;
          to?: string;
        };

        const actions: Action[] = [
          ...overdueLeads.map((l) => ({
            key: l.id,
            label: `Follow up with ${l.investor_name}${l.firm_name ? ` at ${l.firm_name}` : ""}`,
            sub: `Due ${new Date(l.follow_up_date).toLocaleDateString()}`,
            border: "border-l-destructive",
            to: "/app/leads",
          })),
          ...todayMeetings.map((m) => ({
            key: m.id,
            label: m.title,
            sub: `Today at ${format(new Date(m.scheduled_at), "h:mm a")}`,
            border: "border-l-warning",
            link: m.meeting_link,
            to: "/app/meetings",
          })),
          ...staleDealRooms.map((r) => ({
            key: r.id,
            label: `Deal room with ${r.name ?? "investor"} is stale`,
            sub: `No activity for ${formatDistanceToNow(new Date(r.updated_at))}`,
            border: "border-l-warning",
          })),
          ...(noProfile
            ? [{
                key: "profile",
                label: "Complete your company profile",
                sub: "Add your startup details to attract investors",
                border: "border-l-brand",
                to: "/app/profile",
              }]
            : []),
        ];

        if (actions.length === 0) {
          return (
            <div className="mt-6 rounded-xl border border-success/30 bg-success/5 px-5 py-3.5 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              <span className="text-sm font-medium text-success">You're all caught up</span>
            </div>
          );
        }

        return (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-warning" /> Today's actions
            </div>
            <div className="space-y-2">
              {actions.map((a) => (
                <div
                  key={a.key}
                  className={cn(
                    "rounded-xl border border-border/60 bg-card px-4 py-3 border-l-4 shadow-card flex items-center justify-between gap-4",
                    a.border,
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.sub}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.link && (
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs hover:bg-brand/10"
                      >
                        <ExternalLink className="h-3 w-3" /> Join
                      </a>
                    )}
                    {a.to && (
                      <Link
                        to={a.to as any}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        View <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Raise progress */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-[0.05]" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Round progress</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="text-3xl font-semibold tracking-tight text-muted-foreground"
                title="Coming soon"
              >
                --
              </span>
              <span className="text-sm text-muted-foreground">
                {startup?.target_raise
                  ? `of $${(startup.target_raise / 1_000_000).toFixed(0)}M target`
                  : "target not set"}
              </span>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Soft circled</div>
              <div className="font-medium text-muted-foreground" title="Coming soon">--</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Lead</div>
              <div className="font-medium text-muted-foreground" title="Coming soon">--</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Close</div>
              <div className="font-medium text-muted-foreground" title="Coming soon">--</div>
            </div>
          </div>
        </div>
        <div className="relative mt-5 h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-0 bg-gradient-brand rounded-full" />
        </div>
        <div className="relative mt-2 flex justify-between text-[11px] text-muted-foreground">
          {startup?.target_raise ? (
            <>
              <span>$0</span>
              <span>${((startup.target_raise / 1_000_000) * 0.25).toFixed(1)}M</span>
              <span>${((startup.target_raise / 1_000_000) * 0.5).toFixed(1)}M</span>
              <span>${((startup.target_raise / 1_000_000) * 0.75).toFixed(1)}M</span>
              <span>${(startup.target_raise / 1_000_000).toFixed(0)}M</span>
            </>
          ) : (
            <><span>$0</span><span>$2M</span><span>$4M</span><span>$6M</span><span>$8M</span></>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Active VCs"
          value={leadCount}
          sub="in pipeline"
          trend={leadCount > 0 ? `+${leadCount} total` : undefined}
        />
        <Stat label="Reply rate" value="--" sub="vs benchmark" comingSoon />
        <Stat label="Meetings" value={meetingCount} sub="upcoming" />
        <Stat label="Deal rooms" value={dealRoomCount} sub={dealRoomCount === 1 ? "1 active" : `${dealRoomCount} active`} />
      </div>

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        {/* Pipeline at a glance */}
        <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card shadow-card">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <div>
              <div className="text-sm font-semibold">Pipeline at a glance</div>
              <div className="text-xs text-muted-foreground">{leadCount} leads total</div>
            </div>
            <Link to="/app/leads" className="text-xs text-brand inline-flex items-center gap-1">
              Open pipeline <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5 grid grid-cols-7 gap-2">
            {(
              [
                ["New", statusMap["New"] ?? 0, "bg-muted-foreground/40"],
                ["Contact", statusMap["Contacted"] ?? 0, "bg-foreground/40"],
                ["Replied", statusMap["Replied"] ?? 0, "bg-brand"],
                ["Meeting", statusMap["Meeting Booked"] ?? 0, "bg-violet"],
                ["Interest", statusMap["Interested"] ?? 0, "bg-warning"],
                ["DR", statusMap["Deal Room Created"] ?? 0, "bg-success"],
                ["Pass", statusMap["Rejected"] ?? 0, "bg-destructive/60"],
              ] as [string, number, string][]
            ).map(([l, n, c]) => (
              <div key={l} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground truncate">{l}</span>
                  <span className={cn("h-1.5 w-1.5 rounded-full", c)} />
                </div>
                <div className="mt-1 text-lg font-semibold">{n}</div>
                <div
                  className={cn("mt-2 h-1 rounded-full opacity-50", c)}
                  style={{ width: `${Math.min(100, n * 8)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* AI Advisor */}
        <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="p-5 border-b border-border/60 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Advisor</div>
              <div className="text-xs text-muted-foreground">Suggested actions</div>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {[
              { t: "Complete your startup profile", d: "Add pitch deck and team details to attract investors" },
              { t: "Import your VC target list", d: "Upload a CSV or add leads manually" },
              { t: "Create your first deal room", d: "Set up a secure space to share documents" },
            ].map((a) => (
              <div
                key={a.t}
                className="rounded-lg border border-border/60 bg-background/40 p-3 hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="text-sm font-medium">{a.t}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <div className="rounded-xl border border-border/60 bg-card shadow-card">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div className="text-sm font-semibold">Recent activity</div>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
          {activities.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No activity yet — invite an investor to get started.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {activities.map((a) => {
                const { Icon, cls } = activityIcon(a.action);
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <Icon className={cn("h-4 w-4 shrink-0", cls)} />
                    <div className="flex-1 text-sm truncate capitalize">
                      {a.action.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> {timeAgo(a.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hot deal rooms */}
        <div className="rounded-xl border border-border/60 bg-card shadow-card">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div className="text-sm font-semibold">Hot deal rooms</div>
            <Link to={"/app/deal-rooms" as any} className="text-xs text-brand">
              View all
            </Link>
          </div>
          {dealRooms.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No deal rooms yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {dealRooms.map((r) => {
                const { p, bar } = dealRoomProgress(r.status);
                const initials = (r.name ?? "?")
                  .split(" ")
                  .map((s: string) => s[0] ?? "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <Link
                    to={"/app/deal-rooms" as any}
                    key={r.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-soft text-xs font-semibold border border-border/60">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.name ?? "Deal Room"}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {r.status ?? "Active"}
                      </div>
                    </div>
                    <div className="w-20">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full", bar)} style={{ width: `${p}%` }} />
                      </div>
                      <div className="text-[10px] text-muted-foreground text-right mt-0.5">{p}%</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {howItWorksOpen && <HowItWorksModal onClose={() => setHowItWorksOpen(false)} />}
    </div>
  );
}

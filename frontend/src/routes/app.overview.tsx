import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { getDeskTasks } from "@/lib/desk-fn";
import {
  ArrowUpRight, TrendingUp, Users, Briefcase, Mail, Sparkles,
  Calendar, FileText, CheckCircle2, Clock, Building2, X, Loader2,
  HelpCircle, ExternalLink, AlertCircle, ShieldCheck, Check, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { ProfileChecklist } from "@/components/app/ProfileChecklist";
import { PromoteProfileCard } from "@/components/app/PromoteProfileCard";

export const Route = createFileRoute("/app/overview")({
  // TODO(R5): auth.callback.tsx redirects returning founders here after
  // login — this is the real, live post-login landing target today, not
  // dead legacy code, even though it immediately bounces to /app. Do not
  // delete or fold into the de-shim pass. This is the page to build out
  // as the real /home per the target route map; until then leave in place.
  // P4: the 4-step Home at /app IS the overview now.
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
  component: Overview,
});

// ── Types ──────────────────────────────────────────────────────────

interface Startup {
  id: string;
  name?: string | null;
  company_name?: string | null;
  profile_slug?: string | null;
  stage?: string | null;
  target_raise?: number | null;
  founder_id?: string;
  profile_published?: boolean | null;
  publicly_discoverable?: boolean | null;
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
  review: { p: 40, bar: "hs-gradient" },
  onboard: { p: 20, bar: "hs-gradient" },
};

function dealRoomProgress(status: string | null | undefined): { p: number; bar: string } {
  const s = (status ?? "").toLowerCase();
  for (const [key, val] of Object.entries(DEAL_ROOM_PROGRESS)) {
    if (s.includes(key)) return val;
  }
  return { p: 10, bar: "hs-gradient" };
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
        "rounded-none border border-border/60 bg-card p-6 flex flex-col gap-3",
        disabled && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", disabled ? "bg-muted" : "bg-accent")}>
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
  const { progress, markStep } = useOnboardingProgress();
  const dismissed = progress?.steps?.checklist_dismissed === true;

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
    <div className="rounded-none border border-border/60 bg-card shadow-card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold">Get started with Hockystick</div>
          <div className="text-xs text-muted-foreground">{completed} of {steps.length} steps complete</div>
        </div>
        <button
          onClick={() => markStep("checklist_dismissed", true)}
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
    <div className="relative overflow-hidden rounded-none border border-border/60 bg-card p-5 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span
          className={cn("text-lg font-bold tracking-tight", comingSoon && "text-muted-foreground")}
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

// ── Access Requests Panel ──────────────────────────────────────────

interface AccessRequest {
  id: string;
  investor_id: string;
  startup_id: string;
  status: string;
  created_at: string;
  investors?: {
    full_name: string | null;
    firm: string | null;
    role: string | null;
  } | null;
  investor_verification?: {
    verification_status: string | null;
  } | null;
}

function AccessRequestsPanel({ startupId, companyName, profileSlug }: {
  startupId: string;
  companyName?: string | null;
  profileSlug?: string | null;
}) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("discovery_requests")
      .select("id, investor_id, startup_id, status, created_at")
      .eq("startup_id", startupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!reqs || reqs.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Fetch investor profiles separately — no FK from discovery_requests to investor_profiles.
    // investor_profiles has no bare peer-read RLS anymore — whitelist-filtered
    // batch RPC only (your_name/fund_name/role are all in the default whitelist).
    const investorIds = reqs.map((r: any) => r.investor_id);
    const { data: profiles } = await supabase.rpc("get_public_investor_profiles_by_user_ids", { p_user_ids: investorIds });

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p: any) => [p.user_id, p])
    );

    const enriched = reqs.map((r: any) => ({
      ...r,
      investor_profiles: profileMap[r.investor_id] ?? null,
    }));

    setRequests(enriched as any[]);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, [startupId]);

  const daysAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) return "today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  };

  return (
    <div className="rounded-none border border-border/60 bg-card shadow-card mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold">Investor Access Requests</span>
          {!loading && requests.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full hs-gradient text-brand-foreground text-[10px] font-semibold px-1.5">
              {requests.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No pending access requests.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">When investors request access to your on-request sections, they will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req: any) => {
              const profile = req.investor_profiles;
              const name = profile?.your_name ?? "Unknown investor";
              const firm = profile?.fund_name ?? null;
              const role = profile?.role ?? null;

              return (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[firm, role].filter(Boolean).join(" · ")}
                      {[firm, role].some(Boolean) && " · "}
                      Requested {daysAgo(req.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Approval now lives in /app/connections — it can open a
                        deal room (confirm-first), so there is one review flow,
                        not two with different outcomes. */}
                    <Link
                      to="/app/connections"
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ background: "rgba(124,58,237,0.15)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.3)" }}
                    >
                      Review <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

function Overview() {
  const { user } = useAuth();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const navigate = useNavigate();
  const { progress, markStep } = useOnboardingProgress();

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

  // Journey state: has the founder passed Tier 1 identity verification?
  const { data: tier1Passed = false } = useQuery<boolean>({
    queryKey: ["tier1-passed", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_verifications")
        .select("tier1_passed")
        .eq("startup_id", startup!.id)
        .maybeSingle();
      return !!data?.tier1_passed;
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

  const { data: deskTasks = [] } = useQuery({
    queryKey: ["desk-tasks-overview", user?.id],
    enabled: !!user?.id,
    queryFn: () => getDeskTasks({ data: { userId: user!.id, role: "founder" } }),
  });

  const isQueriesLoading = !user?.id || startupLoading || leadLoading;
  // Guided journey persists until the profile is live in the directory —
  // previously it vanished as soon as a startup row existed, dropping
  // mid-journey founders onto a dashboard of empty widgets.
  const isNewUser =
    !isQueriesLoading &&
    (!startup || (!startup.profile_published && dealRoomCount === 0 && leadCount === 0));

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
    // One sequential path: build → verify → publish. One primary CTA at a
    // time — a brand-new founder should never face four parallel choices.
    const journeySteps = [
      {
        key: "build",
        done: !!startup,
        title: "Build your profile",
        time: "~10 minutes",
        description: "Answer a short AI interview or upload your pitch deck. We turn it into an investor-ready profile.",
        cta: "Build your profile",
        to: "/app/profile-builder",
      },
      {
        key: "verify",
        done: tier1Passed,
        title: "Verify your identity",
        time: "~2 minutes",
        description: "Four automatic checks — email domain, website, public registry, mail infrastructure. Investors see exactly what was confirmed.",
        cta: "Run identity check",
        to: "/app/advisor",
      },
      {
        key: "publish",
        done: !!startup?.profile_published,
        title: "Publish to the directory",
        time: "~1 minute",
        description: "Go live so investors can find you and request access — no warm intro needed.",
        cta: "Publish your profile",
        to: "/app/profile",
      },
    ];
    const currentIdx = journeySteps.findIndex((s) => !s.done);
    const current = journeySteps[currentIdx === -1 ? journeySteps.length - 1 : currentIdx];
    const doneCount = journeySteps.filter((s) => s.done).length;

    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Welcome to Hockystick 👋</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Three steps to a live, verified profile investors can find.
            </p>
          </div>
          <Link
            to="/app/settings"
            search={{ tab: "help" } as any}
            className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" /> How it works
          </Link>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{doneCount} of {journeySteps.length} steps complete</span>
            <span className="text-xs text-muted-foreground">{Math.round((doneCount / journeySteps.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-brand rounded-full transition-all duration-500"
              style={{ width: `${Math.round((doneCount / journeySteps.length) * 100)}%` }}
            />
          </div>
        </div>

        {/* The ONE thing to do next */}
        <div className="rounded-lg border-2 p-6 mb-4" style={{ borderColor: "rgba(124,58,237,0.5)", background: "rgba(124,58,237,0.06)" }}>
          <div className="text-xs font-semibold uppercase tracking-widest text-brand mb-2">
            Your next step · {current.time}
          </div>
          <div className="text-lg font-semibold">{current.title}</div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{current.description}</p>
          <button
            onClick={() => navigate({ to: current.to as any })}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-foreground hover:opacity-90"
            style={{ background: "var(--gradient-brand)" }}
            data-testid="journey-primary-cta"
          >
            {current.cta} <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* The full path, compact */}
        <div className="rounded-none border border-border/60 bg-card divide-y divide-border/60">
          {journeySteps.map((s, i) => (
            <div key={s.key} className={cn("flex items-center gap-3 px-4 py-3", i === currentIdx && "hs-gradient/[0.04]")}>
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10B981" }} />
              ) : (
                <span className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border text-[9px] font-bold shrink-0",
                  i === currentIdx ? "border-brand text-brand" : "border-border text-muted-foreground"
                )}>
                  {i + 1}
                </span>
              )}
              <span className={cn("text-sm flex-1", s.done ? "text-muted-foreground line-through" : i === currentIdx ? "font-medium" : "text-muted-foreground")}>
                {s.title}
              </span>
              <span className="text-[11px] text-muted-foreground">{s.time}</span>
            </div>
          ))}
        </div>

        {startup?.id && (
          <div className="mt-4">
            <ProfileChecklist startupId={startup.id} />
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          After you're live: back your numbers with <Link to={"/app/claims" as any} className="text-brand hover:underline">verified claims</Link> to
          earn the Claims Verified badge, and share your profile link — investors request access directly, no cold outreach.
        </p>

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

  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const highPriorityTasks = deskTasks.filter((t: any) => t.priority === "high");
  const normalPriorityTasks = deskTasks.filter((t: any) => t.priority !== "high");

  const founderTourStep =
    progress?.account_type === "founder" && progress.current_step === "publish"
      ? {
          id: "publish-next",
          title: "Your profile is built",
          body: "Now let's publish it so investors can find you.",
          cta: { label: "Go to Publish", onClick: () => navigate({ to: "/app/profile" as any }) },
        }
      : null;

  return (
    <div className="p-6 lg:p-8">
      {founderTourStep && (
        <OnboardingTour
          steps={[founderTourStep]}
          activeIndex={0}
          onSkip={() => markStep("tour_viewed", true)}
          onNext={() => markStep("tour_viewed", true)}
          onFinish={() => markStep("tour_viewed", true)}
        />
      )}
      {progress?.account_type === "founder" && progress.current_step === "promote" && (
        <div className="mb-6">
          <PromoteProfileCard />
        </div>
      )}
      <FounderOnboarding startup={startup} docs={docs} dealRooms={dealRooms} investorMembers={investorMembers} />
      {startup?.id && (
        <AccessRequestsPanel
          startupId={startup.id}
          companyName={startup.company_name ?? startup.name}
          profileSlug={startup.profile_slug}
        />
      )}

      {/* Today section — tasks from Daily Desk */}
      {deskTasks.length > 0 && (
        <div className="mb-8">
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today</div>
            <div className="text-lg font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>{todayLabel}</div>
          </div>
          <div className="space-y-2">
            {[...highPriorityTasks, ...normalPriorityTasks].slice(0, 5).map((t: any) => (
              <div key={t.id} className="rounded-none border border-border/60 bg-card px-4 py-3 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: t.priority === "high" ? "#EF4444" : t.priority === "normal" ? "#F59E0B" : "var(--faint)" }} />
                <span className="text-sm flex-1 truncate">{t.title}</span>
                {t.priority === "high" && (
                  <span className="text-[10px] rounded-full px-2 py-0.5 font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>High</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs text-muted-foreground">{greeting}, {firstName}</div>
          <h1 className="mt-1 text-lg font-bold tracking-tight">
            {startup?.name ?? "Your Startup"}{startup?.stage ? ` — ${startup.stage}` : ""}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/app/settings"
            search={{ tab: "help" } as any}
            className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"
          >
            <HelpCircle className="h-4 w-4" /> How it works
          </Link>
          <Link
            to="/app/email"
            className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent inline-flex items-center gap-1.5"
          >
            <Mail className="h-4 w-4" /> Compose
          </Link>
          <Link
            to="/app/deal-rooms"
            className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow inline-flex items-center gap-1.5"
          >
            Deal rooms <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Live-in-directory confirmation */}
      {startup?.profile_published && startup?.profile_slug && (
        <div className="flex items-center justify-between flex-wrap gap-3 rounded-lg px-4 py-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2.5 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "#10B981" }} />
            <span className="text-foreground font-medium">Your profile is live in the directory.</span>
            <span className="text-muted-foreground hidden sm:inline">Investors can find you and request access.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`https://hockystick.app/p/${startup.profile_slug}`);
                toast.success("Profile link copied");
              }}
              className="rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Copy profile link
            </button>
            <a
              href={`/p/${startup.profile_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-foreground hover:opacity-90"
              style={{ background: "var(--gradient-brand)" }}
            >
              View your public profile →
            </a>
          </div>
        </div>
      )}

      {/* Fundraising readiness checklist */}
      {startup?.id && <ProfileChecklist startupId={startup.id} />}

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
            to: "/app/deal-rooms",
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
            <div className="mt-6 rounded-lg border border-success/30 bg-success/5 px-5 py-3.5 flex items-center gap-3">
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
                    "rounded-none border border-border/60 bg-card px-4 py-3 border-l-4 flex items-center justify-between gap-4",
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
                        className="inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-accent text-brand px-3 py-1.5 text-xs hover:bg-accent"
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
                className="text-xl font-semibold tracking-tight text-muted-foreground"
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
        <div className="lg:col-span-2 rounded-none border border-border/60 bg-card shadow-card">
          <div className="flex items-center justify-between p-5 border-b border-border/60">
            <div>
              <div className="text-sm font-semibold">Pipeline at a glance</div>
              <div className="text-xs text-muted-foreground">{leadCount} leads total</div>
            </div>
            <Link to="/app/deal-rooms" className="text-xs text-brand inline-flex items-center gap-1">
              Deal rooms <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5 grid grid-cols-7 gap-2">
            {(
              [
                ["New", statusMap["New"] ?? 0, "bg-muted-foreground/40"],
                ["Contact", statusMap["Contacted"] ?? 0, "bg-foreground/40"],
                ["Replied", statusMap["Replied"] ?? 0, "hs-gradient"],
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
        <div className="rounded-none border border-border/60 bg-card shadow-card overflow-hidden">
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
        <div className="rounded-none border border-border/60 bg-card shadow-card">
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
        <div className="rounded-none border border-border/60 bg-card shadow-card">
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

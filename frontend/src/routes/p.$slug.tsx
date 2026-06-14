import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Users, Video, Sparkles, Lock } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface PublicStartup {
  id: string;
  company_name: string | null;
  tagline: string | null;
  stage: string | null;
  sector: string | null;
  country: string | null;
  funding_target: string | null;
  valuation: string | null;
  traction: string | null;
  revenue: string | null;
  team_size: number | null;
  description: string | null;
  website: string | null;
  problem: string | null;
  solution: string | null;
  business_model: string | null;
  use_of_funds: string | null;
  current_investors: string | null;
  market_size: string | null;
  competitive_advantage: string | null;
  why_now: string | null;
  why_us: string | null;
  tam: string | null;
  sam: string | null;
  target_customer: string | null;
  revenue_model: string | null;
  pricing: string | null;
  unit_economics: string | null;
  burn_rate: string | null;
  runway_months: number | null;
  advisors: string | null;
  competitors: string | null;
  milestones: string | null;
  intro_video_url: string | null;
  product_video_url: string | null;
  moat: string | null;
  founder_name: string | null;
  founder_linkedin: string | null;
  cofounder_name: string | null;
  cofounder_linkedin: string | null;
  logo_url: string | null;
  profile_slug: string | null;
  social_links: Array<{ platform: string; url: string }> | null;
  founder_id: string | null;
  registry_verified: boolean | null;
  key_metric: string | null;
  growth_rate: string | null;
  customer_count: string | null;
  previous_funding: string | null;
  section_visibility: Record<string, string> | null;
}

type AccessLevel = "public" | "on_request" | "deal_room" | "founder";

// Sections map to access tiers — the spec's canonical sections
const SECTION_DEFAULTS: Record<string, string> = {
  identity: "public",
  business_model: "on_request",
  market: "on_request",
  traction: "on_request",
  team: "on_request",
  financials: "deal_room",
};

export const Route = createFileRoute("/p/$slug")({
  head: ({ loaderData }) => {
    const startup = loaderData as PublicStartup | null;
    if (!startup) {
      return { meta: [{ title: "Founder profile not found — Hockystick" }] };
    }
    return {
      meta: [
        { title: `${startup.company_name || "Founder profile"} — Hockystick` },
        { name: "description", content: startup.tagline || startup.description || "Verified founder profile on Hockystick." },
        { property: "og:title", content: `${startup.company_name || "Founder profile"} — Hockystick` },
        { property: "og:description", content: startup.tagline || startup.description || "Verified founder profile on Hockystick." },
      ],
    };
  },
  loader: async ({ params }) => {
    if (!params.slug) return null;
    const cfEnv = (globalThis as any).__cf_env || {};
    const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
    const client = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;
    const { data } = await client
      .from("startups")
      .select("*")
      .eq("profile_slug", params.slug)
      .eq("profile_published", true)
      .maybeSingle();
    return data as PublicStartup | null;
  },
  component: FounderPublicProfile,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "—";
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  if (isNaN(n) || n === 0) return String(value);
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return "$" + Math.round(n / 1_000) + "K";
  return "$" + n.toLocaleString();
}

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/([^?/]+)$/,
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function YouTubeEmbed({ url, label }: { url: string; label: string }) {
  const videoId = getYouTubeId(url);
  if (!videoId) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-500">
        Watch {label} →
      </a>
    );
  }
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <a href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank" rel="noopener noreferrer"
      className="relative block w-full aspect-video rounded-2xl overflow-hidden group cursor-pointer">
      <img src={thumbnail} alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[16px] border-l-white ml-1" />
        </div>
      </div>
    </a>
  );
}

// ─── Access level determination ───────────────────────────────────────────────

async function getAccessLevel(startup: PublicStartup): Promise<{ level: AccessLevel; userId: string | null; userRole: string | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { level: "public", userId: null, userRole: null };

  const userId = session.user.id;

  // Fetch user role
  const { data: userRow } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  const userRole = userRow?.role ?? null;

  // Founder viewing own profile
  if (startup.founder_id === userId) return { level: "founder", userId, userRole };

  // Check active deal room membership — any deal room belonging to this startup
  const { data: dealRooms } = await supabase
    .from("deal_rooms")
    .select("id")
    .eq("startup_id", startup.id);
  const roomIds = (dealRooms ?? []).map((r: { id: string }) => r.id);

  if (roomIds.length > 0) {
    const { data: membership } = await supabase
      .from("deal_room_members")
      .select("id")
      .eq("user_id", userId)
      .in("deal_room_id", roomIds)
      .maybeSingle();
    if (membership) return { level: "deal_room", userId, userRole };
  }

  // Check approved discovery request
  const { data: request } = await supabase
    .from("discovery_requests")
    .select("status")
    .eq("investor_id", userId)
    .eq("startup_id", startup.id)
    .eq("status", "approved")
    .maybeSingle();

  if (request) return { level: "on_request", userId, userRole };

  return { level: "public", userId, userRole };
}

// Returns whether a section is accessible at a given access level
function canView(sectionVis: string, accessLevel: AccessLevel): boolean {
  if (accessLevel === "founder" || accessLevel === "deal_room") return true;
  if (accessLevel === "on_request") return sectionVis === "public" || sectionVis === "on_request";
  return sectionVis === "public";
}

// ─── Locked section cards ─────────────────────────────────────────────────────

type RequestStatus = "idle" | "pending" | "approved" | "rejected" | "submitting";

function LockedSectionCard({
  sectionLabel,
  sectionVis,
  userId,
  userRole,
  startupId,
  startupSlug,
  requestStatus,
  onRequestAccess,
}: {
  sectionLabel: string;
  sectionVis: string;
  userId: string | null;
  userRole: string | null;
  startupId: string;
  startupSlug: string | null;
  requestStatus: RequestStatus;
  onRequestAccess: () => void;
}) {
  const isDealRoom = sectionVis === "deal_room";

  return (
    <div style={{
      background: '#111114',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '32px 24px',
      textAlign: 'center',
      marginBottom: 24,
    }}>
      <div style={{
        width: 40, height: 40,
        background: 'rgba(124,58,237,0.1)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Lock size={18} style={{ color: '#7C3AED' }} />
      </div>
      <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
        {sectionLabel}
      </p>
      {isDealRoom ? (
        <>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>
            This section is available inside the deal room. Founders share financials with investors they have approved.
          </p>
          <a
            href="/sign-up?role=investor"
            style={{
              display: 'inline-block',
              background: '#7C3AED',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Connect on Hockystick →
          </a>
        </>
      ) : requestStatus === "pending" ? (
        <>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>
            This section is available to verified investors with an approved access request.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#10B981',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
          }}>
            ✓ Access requested — pending founder approval
          </div>
        </>
      ) : requestStatus === "approved" ? (
        <p style={{ color: '#10B981', fontSize: 13 }}>Access approved — content should be visible.</p>
      ) : requestStatus === "rejected" ? (
        <>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>
            This section is available to verified investors with an approved access request.
          </p>
          <p style={{ color: 'rgba(239,68,68,0.7)', fontSize: 12 }}>
            Your previous request was not approved.
          </p>
        </>
      ) : (
        <>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>
            This section is available to verified investors with an approved access request.
          </p>
          <button
            onClick={onRequestAccess}
            disabled={requestStatus === "submitting"}
            style={{
              background: '#7C3AED',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: 8,
              cursor: requestStatus === "submitting" ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: requestStatus === "submitting" ? 0.7 : 1,
            }}
          >
            {requestStatus === "submitting" ? "Requesting…" : "Request access"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function FounderPublicProfile() {
  const startup = Route.useLoaderData() as PublicStartup | null;

  const [accessLevel, setAccessLevel] = useState<AccessLevel>("public");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  // Per-section request status (keyed by section key)
  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatus>>({});
  // Existing request record from DB
  const [existingRequest, setExistingRequest] = useState<{ status: string } | null>(null);

  useEffect(() => {
    if (!startup) return;
    getAccessLevel(startup).then(({ level, userId, userRole }) => {
      setAccessLevel(level);
      setViewerId(userId);
      setViewerRole(userRole);
      setAccessLoaded(true);
    });
  }, [startup?.id]);

  // Pre-load existing discovery request for this investor
  useEffect(() => {
    if (!startup?.id) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("discovery_requests")
        .select("status")
        .eq("investor_id", session.user.id)
        .eq("startup_id", startup.id)
        .maybeSingle();
      if (data) {
        setExistingRequest(data);
        // Pre-populate all on_request sections with the existing status
        const vis = getVisibility(startup);
        const statuses: Record<string, RequestStatus> = {};
        Object.entries(vis).forEach(([k, v]) => {
          if (v === "on_request") {
            statuses[k] = data.status as RequestStatus;
          }
        });
        setRequestStatuses(statuses);
      }
    });
  }, [startup?.id]);

  const { data: registryCheck } = useQuery({
    queryKey: ["registry-check-public", startup?.id],
    enabled: !!startup?.id && !!startup?.registry_verified,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_registry_checks")
        .select("verified, confidence_score, verified_jurisdiction, sources, checked_at")
        .eq("startup_id", startup!.id)
        .maybeSingle();
      return data;
    },
  });

  // Profile view tracking
  useEffect(() => {
    if (!startup?.id) return;
    const startTime = Date.now();
    let viewRowId: string | null = null;

    async function trackView() {
      const { data: { user } } = await supabase.auth.getUser();
      let viewerName: string | null = null;
      let viewerFund: string | null = null;
      let trackedRole: string | null = null;

      if (user) {
        const { data: userRow } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
        trackedRole = userRow?.role ?? null;
        if (trackedRole === "investor") {
          const { data: profile } = await supabase.from("investor_profiles").select("your_name, fund_name").eq("user_id", user.id).maybeSingle();
          viewerName = profile?.your_name ?? null;
          viewerFund = profile?.fund_name ?? null;
        }
      }

      const { data: viewRow } = await supabase.from("profile_views").insert({
        startup_id: startup!.id,
        viewer_id: user?.id ?? null,
        viewer_role: trackedRole,
        viewer_name: viewerName,
        viewer_fund: viewerFund,
        source: new URLSearchParams(window.location.search).get("src"),
        referrer: document.referrer || null,
      }).select("id").single();

      if (viewRow?.id) viewRowId = viewRow.id;

      if (user && trackedRole === "investor" && startup!.founder_id) {
        const investorLabel = viewerFund ? `${viewerName ?? "An investor"} from ${viewerFund}` : viewerName ?? "An investor";
        await supabase.from("notifications").insert({
          user_id: startup!.founder_id,
          kind: "view", type: "profile_view",
          title: `${investorLabel} viewed your profile`,
          body: `${investorLabel} just visited your Hockystick profile.`,
          read: false, action_url: "/app/profile?tab=analytics",
          meta: { viewer_name: viewerName, viewer_fund: viewerFund, viewer_id: user.id },
        }).then(() => {});
      }
    }

    const logDuration = async () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (duration < 3 || !viewRowId) return;
      await supabase.from("profile_views").update({ duration_seconds: duration }).eq("id", viewRowId);
    };

    trackView();
    const onVisibility = () => { if (document.visibilityState === "hidden") logDuration(); };
    window.addEventListener("beforeunload", logDuration);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", logDuration);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [startup?.id]);

  if (!startup) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 py-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Profile not found</h1>
          <p className="text-muted-foreground mb-8">This founder profile either does not exist or has not been published yet.</p>
          <Link to="/"><Button className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Hockystick</Button></Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const vis = getVisibility(startup);

  // Handler for "Request access" button
  const handleRequestAccess = async (sectionKey: string) => {
    // Not logged in
    if (!viewerId) {
      window.location.href = `/sign-up?role=investor&interest=${startup.profile_slug ?? ""}`;
      return;
    }

    // Logged in as founder
    if (viewerRole === "founder") {
      toast.error("You are viewing this as a founder. Switch to an investor account to request access.");
      return;
    }

    // Check existing request
    const existing = existingRequest;
    if (existing) {
      if (existing.status === "pending") {
        toast.info("Your access request is pending founder approval.");
        setRequestStatuses((prev) => ({ ...prev, [sectionKey]: "pending" }));
        return;
      }
      if (existing.status === "approved") {
        return;
      }
      if (existing.status === "rejected") {
        toast.error("Your previous request was not approved. Connect with this founder through other channels.");
        setRequestStatuses((prev) => ({ ...prev, [sectionKey]: "rejected" }));
        return;
      }
    }

    // Create request
    setRequestStatuses((prev) => ({ ...prev, [sectionKey]: "submitting" }));
    const { error } = await supabase.from("discovery_requests").insert({
      investor_id: viewerId,
      startup_id: startup.id,
      status: "pending",
      stage: 1,
    });

    if (error) {
      toast.error("Could not submit request. Please try again.");
      setRequestStatuses((prev) => ({ ...prev, [sectionKey]: "idle" }));
      return;
    }

    // Mark all on_request sections as pending in one shot
    const allPending: Record<string, RequestStatus> = {};
    Object.entries(vis).forEach(([k, v]) => {
      if (v === "on_request") allPending[k] = "pending";
    });
    setRequestStatuses(allPending);
    setExistingRequest({ status: "pending" });

    // Fire-and-forget: notify founder via edge function (non-blocking)
    supabase.functions.invoke("notify-access-request", {
      body: { startup_id: startup.id, investor_id: viewerId },
    }).catch(() => {
      console.warn("[notify-access-request] Notification failed — request was still created");
    });
  };

  const sectionLabels: Record<string, string> = {
    business_model: "Business Model",
    market: "Market Opportunity",
    traction: "Traction & Metrics",
    team: "Team Details",
    financials: "Financials",
  };

  function SectionGate({ sectionKey, children }: { sectionKey: string; children: React.ReactNode }) {
    const sectionVis = vis[sectionKey] ?? SECTION_DEFAULTS[sectionKey] ?? "public";
    if (canView(sectionVis, accessLevel)) return <>{children}</>;
    return (
      <LockedSectionCard
        sectionLabel={sectionLabels[sectionKey] ?? sectionKey}
        sectionVis={sectionVis}
        userId={viewerId}
        userRole={viewerRole}
        startupId={startup.id}
        startupSlug={startup.profile_slug}
        requestStatus={requestStatuses[sectionKey] ?? "idle"}
        onRequestAccess={() => handleRequestAccess(sectionKey)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-16" style={{ paddingBottom: 80 }}>
        {/* Header — always public */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Verified founder profile</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
              {startup.company_name || "Unnamed startup"}
            </h1>
            {startup.tagline && <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{startup.tagline}</p>}
            {startup?.registry_verified && registryCheck && (
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
                  title={`Company registration verified with ${registryCheck.confidence_score}% confidence.`}
                >
                  ✓ Registered company
                </span>
              </div>
            )}
            {(startup.social_links ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {(startup.social_links ?? []).map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                    {link.platform} →
                  </a>
                ))}
              </div>
            )}
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand/80">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>

        {/* Intro video — identity section */}
        {startup.intro_video_url && (
          <div className="mb-8 rounded-3xl border border-border/70 bg-card p-6 shadow-card">
            <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">Meet the founder</div>
            <YouTubeEmbed url={startup.intro_video_url} label="founder intro" />
            <a href={startup.intro_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 inline-block">Open video link →</a>
          </div>
        )}

        {/* Identity cards — always public */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-3xl bg-purple-950 text-white grid place-items-center text-xl font-semibold overflow-hidden">
                {startup.logo_url
                  ? <img src={startup.logo_url} alt={startup.company_name ?? "Logo"} className="h-full w-full object-cover" />
                  : (startup.company_name || "?")[0]}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Stage</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{startup.stage || "N/A"}</div>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              {startup.sector && <div><span className="font-semibold text-foreground">Sector:</span> {startup.sector}</div>}
              {startup.country && <div><span className="font-semibold text-foreground">HQ:</span> {startup.country}</div>}
              {startup.founder_name && <div><span className="font-semibold text-foreground">Founder:</span> {startup.founder_name}</div>}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
              <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-4">Summary</div>
              <p className="text-sm leading-relaxed text-muted-foreground">{startup.description || startup.solution || "No summary provided yet."}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Raising</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(startup.funding_target)}</div>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Team size</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{startup.team_size ?? "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Problem & Solution — identity section (always public) */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <ProfileSection label="Problem" value={startup.problem} fallback="No problem statement provided." />
            <ProfileSection label="Solution" value={startup.solution} fallback="No solution details yet." />
            <ProfileSection label="Why us" value={startup.why_us} fallback="Why your team is uniquely positioned." />
            <ProfileSection label="Why now" value={startup.why_now} fallback="What makes this the right time to build?" />

            {/* Business Model section */}
            <SectionGate sectionKey="business_model">
              <ProfileSection label="Business model" value={startup.business_model} fallback="Business model details not available." />
              {(startup.revenue_model || startup.pricing || startup.use_of_funds) && (
                <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                  <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground mb-3">Revenue model & pricing</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {startup.revenue_model && <div><span className="font-semibold text-foreground">Revenue:</span> {startup.revenue_model}</div>}
                    {startup.pricing && <div><span className="font-semibold text-foreground">Pricing:</span> {startup.pricing}</div>}
                    {startup.target_customer && <div><span className="font-semibold text-foreground">Target customer:</span> {startup.target_customer}</div>}
                    {startup.use_of_funds && <div><span className="font-semibold text-foreground">Use of funds:</span> {startup.use_of_funds}</div>}
                  </div>
                </div>
              )}
              {startup.revenue && (
                <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue</div>
                  <div className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(startup.revenue)}</div>
                </div>
              )}
            </SectionGate>

            {/* Market section */}
            <SectionGate sectionKey="market">
              <ProfileSection
                label="Market opportunity"
                value={startup.market_size || startup.tam
                  ? `${startup.market_size ? startup.market_size + " • " : ""}${startup.tam ? `TAM: ${startup.tam}` : ""}${startup.sam ? ` • SAM: ${startup.sam}` : ""}${startup.target_customer ? ` • Customer: ${startup.target_customer}` : ""}`
                  : null}
                fallback="Market opportunity details not provided."
              />
              {(startup.competitive_advantage || startup.why_now || startup.moat) && (
                <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                  <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground mb-3">Competitive position</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {startup.competitive_advantage && <div><span className="font-semibold text-foreground">Advantage:</span> {startup.competitive_advantage}</div>}
                    {startup.moat && <div><span className="font-semibold text-foreground">Moat:</span> {startup.moat}</div>}
                    {startup.competitors && <div><span className="font-semibold text-foreground">Competitors:</span> {startup.competitors}</div>}
                  </div>
                </div>
              )}
            </SectionGate>

            {/* Traction section */}
            <SectionGate sectionKey="traction">
              <ProfileSection label="Traction" value={startup.traction} fallback="Traction data not available." />
              {(startup.key_metric || startup.growth_rate || startup.customer_count || startup.milestones) && (
                <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                  <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground mb-3">Key metrics</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {startup.key_metric && <div><span className="font-semibold text-foreground">Key metric:</span> {startup.key_metric}</div>}
                    {startup.growth_rate && <div><span className="font-semibold text-foreground">Growth:</span> {startup.growth_rate}</div>}
                    {startup.customer_count && <div><span className="font-semibold text-foreground">Customers:</span> {startup.customer_count}</div>}
                    {startup.milestones && <div><span className="font-semibold text-foreground">Milestones:</span> {startup.milestones}</div>}
                  </div>
                </div>
              )}
            </SectionGate>

            {/* Product video */}
            {startup.product_video_url && (
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground mb-3">PRODUCT DEMO</div>
                <YouTubeEmbed url={startup.product_video_url} label="product demo" />
                <a href={startup.product_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 inline-block">Open video link →</a>
              </div>
            )}

            {/* Financials section */}
            <SectionGate sectionKey="financials">
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground mb-3">Financials</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {startup.valuation && (
                    <div>
                      <div className="text-xs text-muted-foreground">Valuation</div>
                      <div className="mt-1 font-semibold">{formatCurrency(startup.valuation)}</div>
                    </div>
                  )}
                  {startup.burn_rate && (
                    <div>
                      <div className="text-xs text-muted-foreground">Burn rate</div>
                      <div className="mt-1 font-semibold">{startup.burn_rate}</div>
                    </div>
                  )}
                  {startup.runway_months && (
                    <div>
                      <div className="text-xs text-muted-foreground">Runway</div>
                      <div className="mt-1 font-semibold">{startup.runway_months} months</div>
                    </div>
                  )}
                  {startup.previous_funding && (
                    <div>
                      <div className="text-xs text-muted-foreground">Previous funding</div>
                      <div className="mt-1 font-semibold">{startup.previous_funding}</div>
                    </div>
                  )}
                  {startup.current_investors && (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Current investors</div>
                      <div className="mt-1 text-sm">{startup.current_investors}</div>
                    </div>
                  )}
                  {startup.unit_economics && (
                    <div className="sm:col-span-2">
                      <div className="text-xs text-muted-foreground">Unit economics</div>
                      <div className="mt-1 text-sm">{startup.unit_economics}</div>
                    </div>
                  )}
                </div>
              </div>
            </SectionGate>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {startup.logo_url && (
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Logo</div>
                <img src={startup.logo_url} alt={startup.company_name ?? "Logo"} className="mt-4 w-full rounded-3xl object-cover" />
              </div>
            )}

            {/* Team section */}
            <SectionGate sectionKey="team">
              <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                <div className="text-sm font-semibold mb-3">Team</div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  {startup.founder_name && <div><span className="font-semibold text-foreground">Founder:</span> {startup.founder_name}</div>}
                  {startup.founder_linkedin && (
                    <div><span className="font-semibold text-foreground">LinkedIn:</span>{" "}
                      <a href={startup.founder_linkedin} target="_blank" rel="noreferrer" className="text-brand hover:underline">View profile</a>
                    </div>
                  )}
                  {startup.cofounder_name && <div><span className="font-semibold text-foreground">Co-founder:</span> {startup.cofounder_name}</div>}
                  {startup.cofounder_linkedin && (
                    <div><span className="font-semibold text-foreground">Co-founder LinkedIn:</span>{" "}
                      <a href={startup.cofounder_linkedin} target="_blank" rel="noreferrer" className="text-brand hover:underline">View profile</a>
                    </div>
                  )}
                  {startup.advisors && <div><span className="font-semibold text-foreground">Advisors:</span> {startup.advisors}</div>}
                </div>
              </div>
            </SectionGate>
          </div>
        </div>
      </main>

      <div className="border-t border-gray-100 py-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Powered by Hockystick
        </Link>
      </div>

      <SiteFooter />

      {/* Sticky CTA bar — hidden if viewer is the startup founder */}
      {startup && viewerId !== startup.founder_id && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(10,10,11,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)', padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 50, fontFamily: 'DM Sans, sans-serif',
        }}>
          <div>
            <p style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, margin: 0 }}>
              Interested in {startup.company_name}?
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
              Request access to their full data room on Hockystick
            </p>
          </div>
          <a
            href={viewerRole === "investor"
              ? "/app/investor/deal-flow"
              : `/sign-up?role=investor&interest=${startup.profile_slug}`}
            style={{
              background: '#7C3AED', color: '#ffffff', padding: '10px 20px',
              borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
            }}>
            {viewerRole === "investor" ? "View in deal flow →" : "Request access →"}
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVisibility(startup: PublicStartup): Record<string, string> {
  return {
    ...SECTION_DEFAULTS,
    ...(startup.section_visibility ?? {}),
  };
}

function ProfileSection({ label, value, fallback }: { label: string; value: string | null | undefined; fallback?: string }) {
  const content = value?.trim().length ? value : fallback;
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
      <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground mb-3">{label}</div>
      <p className="text-sm leading-relaxed text-muted-foreground">{content}</p>
    </div>
  );
}

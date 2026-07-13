import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Users, Video, Sparkles, Lock, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { BadgeDisplay, useBadges } from "@/components/app/BadgeDisplay";

/** Public view: earned badges only — no locked states, tooltip descriptions. */
function PublicBadges({ startupId }: { startupId: string }) {
  const { data: badges = [] } = useBadges({ startupId });
  if (!badges.length) return null;
  return (
    <div className="mt-3">
      <BadgeDisplay badges={badges} size="sm" maxVisible={6} context="public" />
    </div>
  );
}

/** Roast record: the receipts behind the badge. Public sessions only. */
function RoastRecordLink({ startupId }: { startupId: string }) {
  const { data: sessions = [] } = useQuery({
    queryKey: ["public-roast-record", startupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_sessions")
        .select("id, level, status, scheduled_at, badge_awarded")
        .eq("startup_id", startupId)
        .eq("is_public", true)
        .in("status", ["scheduled", "lobby", "completed", "expired"])
        .order("scheduled_at", { ascending: false })
        .limit(3);
      if (error) {
        console.error("[roast] public record fetch failed:", error);
        return [];
      }
      return data ?? [];
    },
  });
  if (!sessions.length) return null;
  return (
    <div className="mt-4 space-y-2">
      {sessions.map((s) => {
        const upcoming = s.status === "scheduled" || s.status === "lobby";
        const label = upcoming
          ? `Live Roast ${new Date(s.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} — join as a challenger`
          : s.status === "completed"
            ? `Survived a Level ${s.level} Roast — read the public Q&A record`
            : `Level ${s.level} Roast expired incomplete — see the record`;
        return (
          <a
            key={s.id}
            href={`/roast/${s.id}`}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={
              s.status === "expired"
                ? {
                    background: "rgba(239,68,68,0.12)",
                    borderColor: "rgba(239,68,68,0.3)",
                    color: "#F87171",
                  }
                : {
                    background: "rgba(249,115,22,0.12)",
                    borderColor: "rgba(249,115,22,0.3)",
                    color: "#FB923C",
                  }
            }
          >
            <span aria-hidden>🔥</span> {label} <span aria-hidden>→</span>
          </a>
        );
      })}
    </div>
  );
}

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
    const d = loaderData as { startup: PublicStartup | null; slug: string };
    const startup = d?.startup;
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
    if (!params.slug) return { startup: null, slug: "" };
    const cfEnv = (globalThis as any).__cf_env || {};
    const supabaseUrl = cfEnv.SUPABASE_URL || cfEnv.VITE_SUPABASE_URL || "https://ldimninnjlvxozubheib.supabase.co";
    const serviceKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY || "";
    const client = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;
    // Only return the profile if publicly published — owner preview is handled client-side
    const { data } = await client
      .from("startups")
      .select("*")
      .eq("profile_slug", params.slug)
      .eq("profile_published", true)
      .maybeSingle();
    return { startup: data as PublicStartup | null, slug: params.slug };
  },
  component: FounderPublicProfileWrapper,
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

  // Check approved discovery request (deal_room_created implies approved)
  const { data: request } = await supabase
    .from("discovery_requests")
    .select("status")
    .eq("investor_id", userId)
    .eq("startup_id", startup.id)
    .in("status", ["approved", "deal_room_created"])
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

// ─── Owner-preview wrapper ────────────────────────────────────────────────────
// Mirrors the same pattern used on /i/$slug. The server loader has no session
// context (service-role client, no user JWT), so owner detection happens here
// on the client after auth is available.

function FounderPublicProfileWrapper() {
  const { startup: publicStartup, slug } = Route.useLoaderData() as { startup: PublicStartup | null; slug: string };

  const [ownerState, setOwnerState] = useState<
    | { loading: true }
    | { loading: false; isOwner: false }
    | { loading: false; isOwner: true; startup: PublicStartup }
  >({ loading: !publicStartup });

  useEffect(() => {
    if (publicStartup) return; // already public — no owner check needed
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id || cancelled) {
          if (!cancelled) setOwnerState({ loading: false, isOwner: false });
          return;
        }
        const { data: ownedStartup } = await supabase
          .from("startups")
          .select("*")
          .eq("profile_slug", slug)
          .eq("founder_id", session.user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!ownedStartup) {
          setOwnerState({ loading: false, isOwner: false });
          return;
        }
        setOwnerState({ loading: false, isOwner: true, startup: ownedStartup as PublicStartup });
      } catch {
        if (!cancelled) setOwnerState({ loading: false, isOwner: false });
      }
    })();
    return () => { cancelled = true; };
  }, [publicStartup, slug]);

  // Public profile found — render normally, no banner
  if (publicStartup) {
    return <FounderPublicProfile startup={publicStartup} isOwnerPreview={false} />;
  }

  // Still resolving session
  if (ownerState.loading) {
    return (
      <div style={{ background: "#0A0A0B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Logged-in owner viewing their own unpublished profile — show with preview banner
  if (ownerState.isOwner) {
    return <FounderPublicProfile startup={ownerState.startup} isOwnerPreview={true} />;
  }

  // Not published / not owner
  return (
    <div style={{ background: "#0A0A0B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#FAFAFA" }}>
        <h1 style={{ fontSize: 32, fontFamily: "Syne, sans-serif", fontWeight: 800, marginBottom: 12 }}>Profile private</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>This founder profile hasn't been published yet.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 24, color: "#7C3AED", textDecoration: "underline", fontSize: 14 }}>Back to Hockystick</a>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ClaimStatusPill({ status }: { status: string }) {
  if (status === "ai_confirmed") {
    return (
      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
        ✓ Verified
      </span>
    );
  }
  if (status === "ai_mismatch") {
    return (
      <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}>
        ⚠ Mismatch
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
      Unverified
    </span>
  );
}

function FounderPublicProfile({ startup, isOwnerPreview }: { startup: PublicStartup; isOwnerPreview: boolean }) {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(isOwnerPreview ? "founder" : "public");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [accessLoaded, setAccessLoaded] = useState(false);

  // Per-section request status (keyed by section key)
  const [requestStatuses, setRequestStatuses] = useState<Record<string, RequestStatus>>({});
  // Existing request record from DB
  const [existingRequest, setExistingRequest] = useState<{ status: string } | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");
  const [connectSending, setConnectSending] = useState(false);

  useEffect(() => {
    if (isOwnerPreview) {
      // Owner is already confirmed — full access, no need to call getAccessLevel
      supabase.auth.getSession().then(({ data: { session } }) => {
        setViewerId(session?.user?.id ?? null);
        setViewerRole("founder");
        setAccessLoaded(true);
      });
      return;
    }
    getAccessLevel(startup).then(({ level, userId, userRole }) => {
      setAccessLevel(level);
      setViewerId(userId);
      setViewerRole(userRole);
      setAccessLoaded(true);
    });
  }, [startup?.id, isOwnerPreview]);

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
        // Pre-populate all on_request sections with the existing status.
        // DB statuses → UI statuses: deal_room_created counts as approved,
        // declined (what the founder side writes) maps to rejected.
        const uiStatus: RequestStatus =
          data.status === "deal_room_created" ? "approved" :
          data.status === "declined" || data.status === "rejected" ? "rejected" :
          (data.status as RequestStatus);
        const vis = getVisibility(startup);
        const statuses: Record<string, RequestStatus> = {};
        Object.entries(vis).forEach(([k, v]) => {
          if (v === "on_request") {
            statuses[k] = uiStatus;
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

  const { data: founderVerification } = useQuery({
    queryKey: ["founder-verification-public", startup?.id],
    enabled: !!startup?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_verifications")
        .select("current_tier, tier1_passed, tier1_score, tier2_passed, tier3_passed")
        .eq("startup_id", startup!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Claims: only ai_confirmed ones are shown publicly (unverified/mismatch are
  // shown as "Unverified" to investors — they need to see what's not backed up)
  const { data: publicClaims = [] } = useQuery({
    queryKey: ["public-claims", startup?.id],
    enabled: !!startup?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_claims")
        .select("claim_type, claim_label, claim_value, proof_status")
        .eq("startup_id", startup!.id);
      return (data ?? []) as Array<{ claim_type: string; claim_label: string; claim_value: string; proof_status: string }>;
    },
  });

  const publicClaimByType = (type: string) => publicClaims.find((c) => c.claim_type === type);

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
        const { error: viewNotifErr } = await supabase.from("notifications").insert({
          user_id: startup!.founder_id,
          kind: "view", type: "profile_view",
          title: `${investorLabel} viewed your profile`,
          body: `${investorLabel} just visited your Hockystick profile.`,
          read: false, action_url: "/app/profile?tab=analytics",
          meta: { viewer_name: viewerName, viewer_fund: viewerFund, viewer_id: user.id },
        });
        if (viewNotifErr) console.error("[profile-views] notification failed:", viewNotifErr);
      }
    }

    const logDuration = async () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (duration < 3 || !viewRowId) return;
      const { error: durErr } = await supabase.from("profile_views").update({ duration_seconds: duration }).eq("id", viewRowId);
      if (durErr) console.error("[profile-views] duration update failed:", durErr);
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
      if (existing.status === "approved" || existing.status === "deal_room_created") {
        return;
      }
      if (existing.status === "rejected" || existing.status === "declined") {
        toast.error("Your previous request was not approved. Connect with this founder through other channels.");
        setRequestStatuses((prev) => ({ ...prev, [sectionKey]: "rejected" }));
        return;
      }
    }

    // Open the message modal — the actual send happens in submitConnectRequest
    setShowConnectModal(true);
  };

  const submitConnectRequest = async () => {
    if (connectSending) return;
    setConnectSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/sign-up?role=investor&interest=${startup.profile_slug ?? ""}`;
        return;
      }
      const { sendConnectionRequest } = await import("@/lib/connection-request-fn");
      const result = await sendConnectionRequest({
        data: {
          userAccessToken: session.access_token,
          targetStartupId: startup.id,
          message: connectMessage.trim() || undefined,
        },
      });

      if (result.ok || result.error === "already_exists") {
        const allPending: Record<string, RequestStatus> = {};
        Object.entries(vis).forEach(([k, v]) => {
          if (v === "on_request") allPending[k] = "pending";
        });
        setRequestStatuses(allPending);
        setExistingRequest({ status: result.status ?? "pending" });
        setShowConnectModal(false);
        setConnectMessage("");
        toast.success(result.ok ? "Connection request sent" : "Request already sent — pending founder approval");
      } else {
        toast.error("Could not submit request. Please try again.");
      }
    } catch (e) {
      console.error("sendConnectionRequest failed:", e);
      toast.error("Could not submit request. Please try again.");
    } finally {
      setConnectSending(false);
    }
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

      {/* Connection request modal — optional message, max 200 chars */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !connectSending && setShowConnectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Syne, sans-serif" }}>
              Request access to {startup.company_name}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              The founder reviews every request. If approved, a private deal room opens for both of you.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Add a message (optional)
            </label>
            <textarea
              value={connectMessage}
              onChange={(e) => setConnectMessage(e.target.value.slice(0, 200))}
              rows={3}
              maxLength={200}
              placeholder="Why you're interested, your fund's thesis fit…"
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none resize-none"
            />
            <div className="mt-1 text-right text-[11px] text-gray-400">{connectMessage.length}/200</div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={submitConnectRequest}
                disabled={connectSending}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {connectSending ? "Sending…" : "Send request"}
              </button>
              <button
                onClick={() => setShowConnectModal(false)}
                disabled={connectSending}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Owner preview banner — amber, same style as /i/$slug */}
      {isOwnerPreview && (
        <div style={{
          background: "rgba(245,158,11,0.12)",
          borderBottom: "1px solid rgba(245,158,11,0.25)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EyeOff style={{ height: 14, width: 14, color: "#F59E0B", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#F59E0B", fontWeight: 500 }}>
              Preview mode — this is how your profile will look to others. Not published yet.
            </span>
          </div>
          <a href="/app/profile" style={{ fontSize: 12, color: "#F59E0B", textDecoration: "underline", whiteSpace: "nowrap" }}>
            Back to profile settings
          </a>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-16" style={{ paddingBottom: 80 }}>
        {/* Header — always public */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Verified founder profile</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
              {startup.company_name || "Unnamed startup"}
            </h1>
            {startup.tagline && <p className="mt-4 max-w-3xl text-lg text-muted-foreground">{startup.tagline}</p>}
            {(startup?.registry_verified && registryCheck || (founderVerification?.current_tier ?? 0) > 0) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {startup?.registry_verified && registryCheck && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }}
                    title={`Company registration verified with ${registryCheck.confidence_score}% confidence.`}
                  >
                    ✓ Registered company
                  </span>
                )}
                {(founderVerification?.current_tier ?? 0) > 0 && (
                  <VerificationBadge
                    tier={founderVerification!.current_tier}
                    size="md"
                    verifySlug={startup.profile_slug ?? undefined}
                    entityType="founder"
                  />
                )}
              </div>
            )}
            {/* Earned badges — trust first, then readiness, then community */}
            {startup?.id && <PublicBadges startupId={startup.id} />}
            {startup?.id && <RoastRecordLink startupId={startup.id} />}
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
              {startup.revenue && (() => {
                const revClaim = publicClaimByType("revenue");
                const isUnverified = !revClaim || revClaim.proof_status === "unverified" || revClaim.proof_status === "ai_mismatch";
                return (
                  <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue</div>
                      {revClaim && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1"
                          style={isUnverified
                            ? { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }
                            : revClaim.proof_status === "ai_mismatch"
                            ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }
                            : { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}
                        >
                          {revClaim.proof_status === "ai_confirmed" ? "✓ Verified" : revClaim.proof_status === "ai_mismatch" ? "⚠ Mismatch" : "Unverified"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(startup.revenue)}</div>
                  </div>
                );
              })()}
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
                    {startup.key_metric && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><span className="font-semibold text-foreground">Key metric:</span> {startup.key_metric}</span>
                        {publicClaimByType("key_metric") && <ClaimStatusPill status={publicClaimByType("key_metric")!.proof_status} />}
                      </div>
                    )}
                    {startup.growth_rate && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><span className="font-semibold text-foreground">Growth:</span> {startup.growth_rate}</span>
                        {publicClaimByType("growth_rate") && <ClaimStatusPill status={publicClaimByType("growth_rate")!.proof_status} />}
                      </div>
                    )}
                    {startup.customer_count && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><span className="font-semibold text-foreground">Customers:</span> {startup.customer_count}</span>
                        {publicClaimByType("customer_count") && <ClaimStatusPill status={publicClaimByType("customer_count")!.proof_status} />}
                      </div>
                    )}
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Globe, Users, Video, Lock, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// Restyled onto the public site's real navy/gold convention (23 Sep 2026
// public-site restyle pass) — this file previously used the internal-app
// v1 theme's --brand/--card/--border/--muted-foreground/--foreground CSS
// vars (all still live and purple, see styles.css), not the navy/gold
// hex convention SiteHeader.tsx/PageHero.tsx and the rest of the public
// site use. Inline styles/constants only; every data binding, query, and
// handler below is unchanged.
const INK = "#0a2540";
const INK_MUTED = "#425466";
const INK_FAINT = "#64748b";
const RULE = "#e6e9ef";
const SURFACE = "#f8f9fb";
const FONT_SEMIBOLD = "'Geist:SemiBold', sans-serif";
const FONT_MEDIUM = "'Inter:Medium', sans-serif";
const FONT_REGULAR = "'Inter:Regular', sans-serif";
const cardStyle: React.CSSProperties = { border: `1px solid ${RULE}`, background: "#fff", padding: 24 };

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
            style={{
              fontFamily: FONT_MEDIUM,
              display: "inline-flex", alignItems: "center", gap: 8,
              border: "1px solid", padding: "10px 16px", fontSize: 13,
              transition: "opacity 150ms",
              ...(s.status === "expired"
                ? { background: "#FEF2F2", borderColor: "#FECACA", color: "#DC2626" }
                : { background: "#FFF7ED", borderColor: "#FED7AA", color: "#C2410C" }),
            }}
          >
            {label} <span aria-hidden>→</span>
          </a>
        );
      })}
    </div>
  );
}

// Field set matches get_public_founder_profile()'s actual output exactly
// (supabase/migrations/20260823000000_public_founder_profile_whitelist.sql)
// -- not the old 77-column startups row. website and registry_verified
// removed: unused by this page (confirmed by grep) and never part of the
// RPC's whitelist. See that migration's header comment for the full
// section -> field derivation.
interface PublicStartup {
  id: string;
  founder_id: string | null;
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
      return { meta: [{ title: "Founder profile not found — Lengdon" }] };
    }
    const fallbackDescription = [startup.sector, startup.stage].filter(Boolean).join(" · ") || "Founder profile on Lengdon.";
    return {
      meta: [
        { title: `${startup.company_name || "Founder profile"} — Lengdon` },
        { name: "description", content: startup.tagline || startup.description || fallbackDescription },
        { property: "og:title", content: `${startup.company_name || "Founder profile"} — Lengdon` },
        { property: "og:description", content: startup.tagline || startup.description || fallbackDescription },
      ],
    };
  },
  loader: async ({ params }) => {
    if (!params.slug) return { startup: null, slug: "" };
    // Anon client, SECURITY DEFINER RPC — NEVER service-role + select(*) on
    // a public-facing route. get_public_founder_profile() re-checks
    // profile_published internally and returns only the always-public
    // field set plus each conditional section's fields where that row's
    // own section_visibility marks the section public, filtered in SQL —
    // not by what this page chooses to render. Mirrors /i/:slug's
    // get_public_investor_profile(). See CLAUDE.md's incident entry and
    // supabase/migrations/20260823000000_public_founder_profile_whitelist.sql
    // for the exposure this closed (70 days, full 77-column row, including
    // founder_email/burn_rate/unit_economics, shipped to every anonymous
    // visitor of a published profile).
    const { data, error } = await supabase.rpc("get_public_founder_profile", { p_slug: params.slug });
    if (error) {
      console.error("[p.$slug] get_public_founder_profile failed:", error);
      return { startup: null, slug: params.slug };
    }
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
        style={{ fontFamily: FONT_MEDIUM, display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: INK }}>
        Watch {label} →
      </a>
    );
  }
  const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <a href={`https://www.youtube.com/watch?v=${videoId}`}
      target="_blank" rel="noopener noreferrer"
      className="relative block w-full aspect-video rounded-2xl overflow-hidden group cursor-pointer">
      <img src={thumbnail} alt={label} loading="lazy" className="w-full h-full object-cover" />
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
      background: '#fff',
      border: `1px solid ${RULE}`,
      padding: '32px 24px',
      textAlign: 'center',
      marginBottom: 24,
    }}>
      <div style={{
        width: 40, height: 40,
        background: SURFACE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Lock size={18} style={{ color: INK }} />
      </div>
      <p style={{ fontFamily: FONT_MEDIUM, color: INK, fontSize: 15, marginBottom: 8 }}>
        {sectionLabel}
      </p>
      {isDealRoom ? (
        <>
          <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginBottom: 20 }}>
            This section is available inside the deal room. Founders share financials with investors they have approved.
          </p>
          <a
            href="/sign-up?role=investor"
            style={{
              fontFamily: FONT_SEMIBOLD,
              display: 'inline-block',
              background: INK,
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Connect on Lengdon →
          </a>
        </>
      ) : requestStatus === "pending" ? (
        <>
          <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginBottom: 16 }}>
            This section is available to verified investors with an approved access request.
          </p>
          <div style={{
            fontFamily: FONT_MEDIUM,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#059669',
            padding: '8px 16px',
            fontSize: 13,
          }}>
            Access requested — pending founder approval
          </div>
        </>
      ) : requestStatus === "approved" ? (
        <p style={{ fontFamily: FONT_REGULAR, color: '#059669', fontSize: 13 }}>Access approved — content should be visible.</p>
      ) : requestStatus === "rejected" ? (
        <>
          <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginBottom: 16 }}>
            This section is available to verified investors with an approved access request.
          </p>
          <p style={{ fontFamily: FONT_REGULAR, color: '#DC2626', fontSize: 12 }}>
            Your previous request was not approved.
          </p>
        </>
      ) : (
        <>
          <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 13, marginBottom: 20 }}>
            This section is available to verified investors with an approved access request.
          </p>
          <button
            onClick={onRequestAccess}
            disabled={requestStatus === "submitting"}
            style={{
              fontFamily: FONT_SEMIBOLD,
              background: INK,
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              cursor: requestStatus === "submitting" ? 'wait' : 'pointer',
              fontSize: 14,
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
// context (anon RPC call, no user JWT), so owner detection happens here on
// the client after auth is available, using the authenticated user's own
// session and startups_own RLS (founder_id = auth.uid()) -- not the public
// RPC, which never returns unpublished or non-whitelisted data regardless
// of who calls it.

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
      <div style={{ background: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${RULE}`, borderTopColor: INK, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
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
    <div style={{ background: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: FONT_SEMIBOLD, fontSize: 32, color: INK, marginBottom: 12 }}>Profile private</h1>
        <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 15 }}>This founder profile hasn't been published yet.</p>
        <a href="/" style={{ fontFamily: FONT_REGULAR, display: "inline-block", marginTop: 24, color: INK, textDecoration: "underline", fontSize: 14 }}>Back to Lengdon</a>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
    }).catch((err) => {
      // A failed access check must fail to the LEAST access level, not hang.
      // getAccessLevel's own internal fallback for every negative case
      // (no session, not founder, not a member, no approved request) is
      // already "public" — matching that here rather than inventing a new
      // behavior. accessLevel's useState default is already "public"
      // (unless isOwnerPreview, which never reaches this branch), so no
      // explicit reset is needed — only accessLoaded must still flip, or
      // the page hangs in its loading state forever.
      console.error("[p.$slug] access level check failed, defaulting to public:", err);
      setViewerId(null);
      setViewerRole(null);
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
          body: `${investorLabel} just visited your Lengdon profile.`,
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
    <div className="min-h-screen bg-white" style={{ color: INK }}>
      <SiteHeader />

      {/* Connection request modal — optional message, max 200 chars */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !connectSending && setShowConnectModal(false)}
        >
          <div
            className="w-full max-w-md bg-white p-6"
            style={{ border: `1px solid ${RULE}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: FONT_SEMIBOLD, fontSize: 18, color: INK }}>
              Request access to {startup.company_name}
            </h3>
            <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 14, marginTop: 4 }}>
              The founder reviews every request. If approved, a private deal room opens for both of you.
            </p>
            <label style={{ fontFamily: FONT_MEDIUM, display: "block", marginTop: 16, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: INK_FAINT }}>
              Add a message (optional)
            </label>
            <textarea
              value={connectMessage}
              onChange={(e) => setConnectMessage(e.target.value.slice(0, 200))}
              rows={3}
              maxLength={200}
              placeholder="Why you're interested, your fund's thesis fit…"
              style={{ fontFamily: FONT_REGULAR, marginTop: 6, width: "100%", border: `1px solid ${RULE}`, padding: "8px 12px", fontSize: 14, color: INK, outline: "none", resize: "none" }}
            />
            <div style={{ fontFamily: FONT_REGULAR, marginTop: 4, textAlign: "right", fontSize: 11, color: INK_FAINT }}>{connectMessage.length}/200</div>
            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <button
                onClick={submitConnectRequest}
                disabled={connectSending}
                style={{ fontFamily: FONT_SEMIBOLD, flex: 1, background: INK, padding: "10px 16px", fontSize: 14, color: "#fff", border: "none", cursor: connectSending ? "not-allowed" : "pointer", opacity: connectSending ? 0.6 : 1 }}
              >
                {connectSending ? "Sending…" : "Send request"}
              </button>
              <button
                onClick={() => setShowConnectModal(false)}
                disabled={connectSending}
                style={{ fontFamily: FONT_MEDIUM, border: `1px solid ${RULE}`, padding: "10px 16px", fontSize: 14, color: INK_MUTED, background: "#fff", cursor: "pointer" }}
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
          background: "#FFFBEB",
          borderBottom: "1px solid #FDE68A",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EyeOff style={{ height: 14, width: 14, color: "#92400E", flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_MEDIUM, fontSize: 13, color: "#92400E" }}>
              Preview mode — this is how your profile will look to others. Not published yet.
            </span>
          </div>
          <a href="/app/profile" style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: "#92400E", textDecoration: "underline", whiteSpace: "nowrap" }}>
            Back to profile settings
          </a>
        </div>
      )}
      <main id="main-content" className="mx-auto max-w-6xl px-4 sm:px-6 py-16" style={{ paddingBottom: 80 }}>
        {/* Header — always public */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", color: INK_FAINT }}>Founder profile</p>
            <h1 style={{ fontFamily: FONT_SEMIBOLD, marginTop: 12, fontSize: 36, letterSpacing: "-0.02em", color: INK }}>
              {startup.company_name || "Unnamed startup"}
            </h1>
            {startup.tagline && <p style={{ fontFamily: FONT_REGULAR, marginTop: 16, maxWidth: 720, fontSize: 18, color: INK_MUTED }}>{startup.tagline}</p>}
            {startup?.id && <RoastRecordLink startupId={startup.id} />}
            {(startup.social_links ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {(startup.social_links ?? []).map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: FONT_MEDIUM, padding: "6px 12px", fontSize: 12, background: SURFACE, border: `1px solid ${RULE}`, color: INK_MUTED, transition: "color 150ms" }}>
                    {link.platform} →
                  </a>
                ))}
              </div>
            )}
          </div>
          <Link to="/" style={{ fontFamily: FONT_MEDIUM, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: INK }}>
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>

        {/* Intro video — identity section */}
        {startup.intro_video_url && (
          <div style={{ ...cardStyle, marginBottom: 32 }}>
            <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", color: INK_FAINT, marginBottom: 16 }}>Meet the founder</div>
            <YouTubeEmbed url={startup.intro_video_url} label="founder intro" />
            <a href={startup.intro_video_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT, marginTop: 4, display: "inline-block" }}>Open video link →</a>
          </div>
        )}

        {/* Identity cards — always public */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div style={cardStyle}>
            <div className="flex items-center gap-4">
              <div style={{ height: 64, width: 64, background: INK, color: "#fff", display: "grid", placeItems: "center", fontFamily: FONT_SEMIBOLD, fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
                {startup.logo_url
                  ? <img src={startup.logo_url} alt={startup.company_name ?? "Logo"} className="h-full w-full object-cover" />
                  : (startup.company_name || "?")[0]}
              </div>
              <div>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.2em", color: INK_FAINT }}>Stage</div>
                <div style={{ fontFamily: FONT_MEDIUM, marginTop: 8, fontSize: 17, color: INK }}>{startup.stage || "N/A"}</div>
              </div>
            </div>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: INK_MUTED, fontFamily: FONT_REGULAR }}>
              {startup.sector && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Sector:</span> {startup.sector}</div>}
              {startup.country && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>HQ:</span> {startup.country}</div>}
              {startup.founder_name && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Founder:</span> {startup.founder_name}</div>}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div style={cardStyle}>
              <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.2em", color: INK_FAINT, marginBottom: 16 }}>Summary</div>
              <p style={{ fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 1.6, color: INK_MUTED }}>{startup.description || startup.solution || "No summary provided yet."}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div style={cardStyle}>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT }}>Raising</div>
                <div style={{ fontFamily: FONT_MEDIUM, marginTop: 8, fontSize: 17, color: INK }}>{formatCurrency(startup.funding_target)}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT }}>Team size</div>
                <div style={{ fontFamily: FONT_MEDIUM, marginTop: 8, fontSize: 17, color: INK }}>{startup.team_size ?? "—"}</div>
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
                <div style={cardStyle}>
                  <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT, marginBottom: 12 }}>Revenue model & pricing</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: INK_MUTED, fontFamily: FONT_REGULAR }}>
                    {startup.revenue_model && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Revenue:</span> {startup.revenue_model}</div>}
                    {startup.pricing && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Pricing:</span> {startup.pricing}</div>}
                    {startup.target_customer && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Target customer:</span> {startup.target_customer}</div>}
                    {startup.use_of_funds && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Use of funds:</span> {startup.use_of_funds}</div>}
                  </div>
                </div>
              )}
              {startup.revenue && (
                <div style={cardStyle}>
                  <div style={{ fontFamily: FONT_MEDIUM, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT }}>Revenue</div>
                  <div style={{ fontFamily: FONT_MEDIUM, marginTop: 8, fontSize: 17, color: INK }}>{formatCurrency(startup.revenue)}</div>
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
                <div style={cardStyle}>
                  <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT, marginBottom: 12 }}>Competitive position</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: INK_MUTED, fontFamily: FONT_REGULAR }}>
                    {startup.competitive_advantage && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Advantage:</span> {startup.competitive_advantage}</div>}
                    {startup.moat && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Moat:</span> {startup.moat}</div>}
                    {startup.competitors && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Competitors:</span> {startup.competitors}</div>}
                  </div>
                </div>
              )}
            </SectionGate>

            {/* Traction section */}
            <SectionGate sectionKey="traction">
              <ProfileSection label="Traction" value={startup.traction} fallback="Traction data not available." />
              {(startup.key_metric || startup.growth_rate || startup.customer_count || startup.milestones) && (
                <div style={cardStyle}>
                  <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT, marginBottom: 12 }}>Key metrics</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: INK_MUTED, fontFamily: FONT_REGULAR }}>
                    {startup.key_metric && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Key metric:</span> {startup.key_metric}</span>
                      </div>
                    )}
                    {startup.growth_rate && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Growth:</span> {startup.growth_rate}</span>
                      </div>
                    )}
                    {startup.customer_count && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Customers:</span> {startup.customer_count}</span>
                      </div>
                    )}
                    {startup.milestones && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Milestones:</span> {startup.milestones}</div>}
                  </div>
                </div>
              )}
            </SectionGate>

            {/* Product video */}
            {startup.product_video_url && (
              <div style={cardStyle}>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT, marginBottom: 12 }}>Product demo</div>
                <YouTubeEmbed url={startup.product_video_url} label="product demo" />
                <a href={startup.product_video_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT, marginTop: 4, display: "inline-block" }}>Open video link →</a>
              </div>
            )}

            {/* Financials section */}
            <SectionGate sectionKey="financials">
              <div style={cardStyle}>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT, marginBottom: 12 }}>Financials</div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {startup.valuation && (
                    <div>
                      <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT }}>Valuation</div>
                      <div style={{ fontFamily: FONT_MEDIUM, marginTop: 4, color: INK }}>{formatCurrency(startup.valuation)}</div>
                    </div>
                  )}
                  {startup.burn_rate && (
                    <div>
                      <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT }}>Burn rate</div>
                      <div style={{ fontFamily: FONT_MEDIUM, marginTop: 4, color: INK }}>{startup.burn_rate}</div>
                    </div>
                  )}
                  {startup.runway_months && (
                    <div>
                      <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT }}>Runway</div>
                      <div style={{ fontFamily: FONT_MEDIUM, marginTop: 4, color: INK }}>{startup.runway_months} months</div>
                    </div>
                  )}
                  {startup.previous_funding && (
                    <div>
                      <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT }}>Previous funding</div>
                      <div style={{ fontFamily: FONT_MEDIUM, marginTop: 4, color: INK }}>{startup.previous_funding}</div>
                    </div>
                  )}
                  {startup.current_investors && (
                    <div className="sm:col-span-2">
                      <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT }}>Current investors</div>
                      <div style={{ fontFamily: FONT_REGULAR, marginTop: 4, fontSize: 14, color: INK_MUTED }}>{startup.current_investors}</div>
                    </div>
                  )}
                  {startup.unit_economics && (
                    <div className="sm:col-span-2">
                      <div style={{ fontFamily: FONT_REGULAR, fontSize: 12, color: INK_FAINT }}>Unit economics</div>
                      <div style={{ fontFamily: FONT_REGULAR, marginTop: 4, fontSize: 14, color: INK_MUTED }}>{startup.unit_economics}</div>
                    </div>
                  )}
                </div>
              </div>
            </SectionGate>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {startup.logo_url && (
              <div style={cardStyle}>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT }}>Logo</div>
                <img src={startup.logo_url} alt={startup.company_name ?? "Logo"} loading="lazy" style={{ marginTop: 16, width: "100%", objectFit: "cover" }} />
              </div>
            )}

            {/* Team section */}
            <SectionGate sectionKey="team">
              <div style={cardStyle}>
                <div style={{ fontFamily: FONT_MEDIUM, fontSize: 14, color: INK, marginBottom: 12 }}>Team</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: INK_MUTED, fontFamily: FONT_REGULAR }}>
                  {startup.founder_name && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Founder:</span> {startup.founder_name}</div>}
                  {startup.founder_linkedin && (
                    <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>LinkedIn:</span>{" "}
                      <a href={startup.founder_linkedin} target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: "underline" }}>View profile</a>
                    </div>
                  )}
                  {startup.cofounder_name && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Co-founder:</span> {startup.cofounder_name}</div>}
                  {startup.cofounder_linkedin && (
                    <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Co-founder LinkedIn:</span>{" "}
                      <a href={startup.cofounder_linkedin} target="_blank" rel="noreferrer" style={{ color: INK, textDecoration: "underline" }}>View profile</a>
                    </div>
                  )}
                  {startup.advisors && <div><span style={{ fontFamily: FONT_MEDIUM, color: INK }}>Advisors:</span> {startup.advisors}</div>}
                </div>
              </div>
            </SectionGate>
          </div>
        </div>
      </main>

      <div style={{ borderTop: `1px solid ${RULE}`, padding: "24px 0", textAlign: "center" }}>
        <Link to="/" style={{ fontFamily: FONT_REGULAR, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: INK_FAINT }}>
          Powered by Lengdon
        </Link>
      </div>

      <SiteFooter />

      {/* Sticky CTA bar — hidden if viewer is the startup founder */}
      {startup && viewerId !== startup.founder_id && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: `1px solid ${RULE}`,
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 50,
        }}>
          <div>
            <p style={{ fontFamily: FONT_MEDIUM, color: INK, fontSize: 14, margin: 0 }}>
              Interested in {startup.company_name}?
            </p>
            <p style={{ fontFamily: FONT_REGULAR, color: INK_MUTED, fontSize: 12, margin: 0 }}>
              Request access to their full data room on Lengdon
            </p>
          </div>
          <a
            href={viewerRole === "investor"
              ? "/app/investor/deal-flow"
              : `/sign-up?role=investor&interest=${startup.profile_slug}`}
            style={{
              fontFamily: FONT_SEMIBOLD,
              background: INK, color: '#fff', padding: '10px 20px',
              textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap',
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
    <div style={cardStyle}>
      <div style={{ fontFamily: FONT_MEDIUM, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.18em", color: INK_FAINT, marginBottom: 12 }}>{label}</div>
      <p style={{ fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 1.6, color: INK_MUTED }}>{content}</p>
    </div>
  );
}

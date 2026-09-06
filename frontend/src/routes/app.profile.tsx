import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LazyChart } from "@/components/shared/LazyChart";
import {
  Building2, Globe, Users, Upload, Pencil, Trash2, Plus, X, Loader2, Check,
  Eye, Edit3, Download, Zap, AlignLeft, AlertTriangle, Copy, Sparkles, BarChart3,
  Shield, Briefcase, TrendingUp, DollarSign, CheckCircle2,
  Linkedin, Twitter, Instagram, Target, Save, RefreshCw,
  ChevronRight,
} from "lucide-react";
import type { FounderThesis } from "@/lib/founder-thesis-fn";
import { PageGuide } from "@/components/app/PageGuide";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { LcsEmptyState, LcsButton, LcsStatusPill, type LcsStatus, LcsModal, LcsSkeleton } from "@/components/lcs";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { getFounderProfileCompleteness } from "@/lib/profileCompleteness";

export const Route = createFileRoute("/app/profile")({
  // R9 relocation: the profile now lives as Prepare › Profile Builder leaves.
  beforeLoad: () => {
    throw redirect({ to: "/app/prepare/profile-builder/quick-setup" as any, replace: true });
  },
  component: Profile,
});

// ── Types ──────────────────────────────────────────────────────────

interface StartupRow {
  id: string; company_name: string; sector: string | null; stage: string | null;
  country: string | null; funding_target: string | null; valuation: string | null;
  traction: string | null; revenue: string | null; team_size: number | null;
  description: string | null; website: string | null; problem: string | null;
  solution: string | null; business_model: string | null; use_of_funds: string | null;
  logo_url: string | null; pitch_deck_url: string | null; tagline: string | null;
  founded_year: number | null; previous_funding: string | null;
  current_investors: string | null; market_size: string | null;
  competitive_advantage: string | null; why_now: string | null;
  founder_name: string | null; founder_email: string | null;
  founder_linkedin: string | null; cofounder_name: string | null;
  cofounder_linkedin: string | null; key_metric: string | null;
  growth_rate: string | null; customer_count: string | null;
  profile_slug: string | null; profile_published: boolean | null; section_visibility: Record<string, SectionVisibility> | null;
  why_us: string | null; tam: string | null; sam: string | null;
  target_customer: string | null; revenue_model: string | null; pricing: string | null;
  unit_economics: string | null; burn_rate: string | null; runway_months: number | null;
  advisors: string | null; competitors: string | null; milestones: string | null;
  intro_video_url: string | null; product_video_url: string | null; moat: string | null;
  social_links: Array<{ platform: string; url: string }> | null;
}

interface TeamMember {
  id: string; name: string | null; title: string | null;
  photo_url: string | null; tag: string | null; display_order: number;
  key_person: boolean;
}

interface TeamMemberDetail {
  team_member_id: string;
  bio: string | null;
  highlights: string[];
  social_links: Array<{ platform: string; url: string }>;
}

type SectionVisibility = "public" | "on_request" | "deal_room";

const defaultSectionVisibility: Record<string, SectionVisibility> = {
  problem_solution: "public",
  market: "public",
  traction: "public",
  business_model: "public",
  team: "public",
  competition: "public",
  fundraising: "public",
  media: "public",
};

const STAGES = ["Pre-idea", "Pre-seed", "Seed", "Series A", "Series B", "Growth", "Profitable"];
const MEMBER_TAGS = ["Founder", "Co-Founder", "Advisor", "Employee", "Board Member"] as const;
const MEMBER_SOCIAL_PLATFORMS = ["LinkedIn", "X / Twitter", "Website", "AngelList", "Crunchbase", "Other"];

type FormState = {
  company_name: string; sector: string; stage: string; country: string;
  funding_target: string; valuation: string; traction: string; revenue: string;
  team_size: string; description: string; website: string;
  problem: string; solution: string; business_model: string; use_of_funds: string;
  tagline: string; founded_year: string; previous_funding: string;
  current_investors: string; market_size: string; competitive_advantage: string;
  why_now: string; founder_name: string; founder_email: string;
  founder_linkedin: string; cofounder_name: string; cofounder_linkedin: string;
  key_metric: string; growth_rate: string; customer_count: string;
  why_us: string; tam: string; sam: string; target_customer: string;
  revenue_model: string; pricing: string; unit_economics: string; burn_rate: string;
  runway_months: string; advisors: string; competitors: string; milestones: string;
  intro_video_url: string; product_video_url: string; moat: string;
  legal_entity_name: string; registration_number: string;
  section_visibility: Record<string, SectionVisibility>;
};

const emptyForm: FormState = {
  company_name: "", sector: "", stage: "", country: "",
  funding_target: "", valuation: "", traction: "", revenue: "",
  team_size: "", description: "", website: "",
  problem: "", solution: "", business_model: "", use_of_funds: "",
  tagline: "", founded_year: "", previous_funding: "", current_investors: "",
  market_size: "", competitive_advantage: "", why_now: "",
  founder_name: "", founder_email: "", founder_linkedin: "",
  cofounder_name: "", cofounder_linkedin: "",
  key_metric: "", growth_rate: "", customer_count: "",
  why_us: "", tam: "", sam: "", target_customer: "",
  revenue_model: "", pricing: "", unit_economics: "", burn_rate: "",
  runway_months: "", advisors: "", competitors: "", milestones: "",
  intro_video_url: "", product_video_url: "", moat: "",
  legal_entity_name: "", registration_number: "",
  section_visibility: defaultSectionVisibility,
};

const formatNumber = (val: string) => {
  const num = val.replace(/[^0-9]/g, "");
  return num ? Number(num).toLocaleString() : "";
};
const cleanNumber = (val: string) => val.replace(/,/g, "");

function safeStringify(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (Array.isArray(val)) return val.map((v) => safeStringify(v)).join(", ");
  if (typeof val === "object") {
    return Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }
  return String(val);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function completeVisibility(value: Record<string, SectionVisibility> | null | undefined) {
  return {
    ...defaultSectionVisibility,
    ...(value ?? {}),
  };
}

function fromStartup(s: StartupRow): FormState {
  return {
    company_name: s.company_name ?? "", sector: s.sector ?? "", stage: s.stage ?? "",
    country: s.country ?? "", funding_target: s.funding_target ?? "",
    valuation: s.valuation ?? "", traction: s.traction ?? "", revenue: s.revenue ?? "",
    team_size: s.team_size?.toString() ?? "", description: s.description ?? "",
    website: s.website ?? "", problem: s.problem ?? "", solution: s.solution ?? "",
    business_model: s.business_model ?? "", use_of_funds: s.use_of_funds ?? "",
    tagline: s.tagline ?? "", founded_year: s.founded_year?.toString() ?? "",
    previous_funding: s.previous_funding ?? "", current_investors: s.current_investors ?? "",
    market_size: s.market_size ?? "", competitive_advantage: s.competitive_advantage ?? "",
    why_now: s.why_now ?? "", founder_name: s.founder_name ?? "",
    founder_email: s.founder_email ?? "", founder_linkedin: s.founder_linkedin ?? "",
    cofounder_name: s.cofounder_name ?? "", cofounder_linkedin: s.cofounder_linkedin ?? "",
    key_metric: s.key_metric ?? "", growth_rate: s.growth_rate ?? "",
    customer_count: s.customer_count ?? "",
    why_us: s.why_us ?? "", tam: s.tam ?? s.market_size ?? "", sam: s.sam ?? "",
    target_customer: s.target_customer ?? "", revenue_model: s.revenue_model ?? "",
    pricing: s.pricing ?? "", unit_economics: s.unit_economics ?? "",
    burn_rate: s.burn_rate ?? "", runway_months: s.runway_months?.toString() ?? "",
    advisors: s.advisors ?? "", competitors: s.competitors ?? "",
    milestones: s.milestones ?? "", intro_video_url: s.intro_video_url ?? "",
    product_video_url: s.product_video_url ?? "", moat: s.moat ?? "",
    legal_entity_name: (s as any).legal_entity_name ?? "",
    registration_number: (s as any).registration_number ?? "",
    section_visibility: completeVisibility(s.section_visibility),
  };
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Component ──────────────────────────────────────────────────────

export type ProfileView = "quick" | "full" | "privacy" | "preview" | "analytics" | "team-cards" | "fundraising-thesis";

// Cover/logo hero card wrappers — a clickable <label> when upload is allowed
// (Profile Builder), a plain <div> when it's read-only (Digital Profile View).
function CoverArea({ readOnly, children }: { readOnly: boolean; children: React.ReactNode }) {
  const cls = "relative h-40 block overflow-hidden" + (readOnly ? "" : " cursor-pointer group");
  return readOnly ? <div className={cls}>{children}</div> : <label className={cls}>{children}</label>;
}
function LogoArea({ readOnly, children }: { readOnly: boolean; children: React.ReactNode }) {
  const cls = "relative shrink-0" + (readOnly ? "" : " cursor-pointer group");
  return readOnly ? <div className={cls}>{children}</div> : <label className={cls}>{children}</label>;
}

// R9: `view` renders a single leaf's slice of this page under route control
// (the swapped sidebar owns navigation between slices). Omitted = original
// standalone behavior with the internal tab bar.
export function Profile({ view }: { view?: ProfileView } = {}) {
  const isTabView = !view || !["team-cards", "fundraising-thesis"].includes(view);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { progress, markStep, setCurrentStep } = useOnboardingProgress();

  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [tab, setTab] = useState<"quick" | "full" | "privacy" | "preview" | "analytics">(
    view && view !== "team-cards" && view !== "fundraising-thesis" ? view : "quick",
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [profilePublishing, setProfilePublishing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deckUploading, setDeckUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<Record<string, unknown> | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showExtractionPreview, setShowExtractionPreview] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // Founder thesis state
  const [thesisForm, setThesisForm] = useState({
    preferred_check_size_min: "",
    preferred_check_size_max: "",
    preferred_investor_type: "",
    board_preference: "",
    sector_expertise_wanted: "",
    geography_preference: "",
    exclusions: "",
    what_good_fit_looks_like: "",
  });
  const [thesisInitialized, setThesisInitialized] = useState(false);
  const [thesisSaving, setThesisSaving] = useState(false);
  const [thesisSaved, setThesisSaved] = useState(false);
  const [thesisProposing, setThesisProposing] = useState(false);

  const { data: startup, isLoading } = useQuery<StartupRow | null>({
    queryKey: ["my-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups").select("*").eq("founder_id", user!.id).limit(1).maybeSingle();
      return data as StartupRow | null;
    },
  });

  // ── Founder thesis ────────────────────────────────────────────────────────
  const { data: existingThesis } = useQuery<FounderThesis | null>({
    queryKey: ["founder-thesis", startup?.id],
    enabled: !!startup?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { getFounderThesis } = await import("@/lib/founder-thesis-fn");
      const { data: { session } } = await supabase.auth.getSession();
      return getFounderThesis({ data: { startupId: startup!.id, accessToken: session?.access_token ?? "" } });
    },
  });

  // Populate thesis form once data arrives
  if (existingThesis !== undefined && !thesisInitialized) {
    setThesisInitialized(true);
    if (existingThesis) {
      setThesisForm({
        preferred_check_size_min: existingThesis.preferred_check_size_min ?? "",
        preferred_check_size_max: existingThesis.preferred_check_size_max ?? "",
        preferred_investor_type: existingThesis.preferred_investor_type ?? "",
        board_preference: existingThesis.board_preference ?? "",
        sector_expertise_wanted: existingThesis.sector_expertise_wanted ?? "",
        geography_preference: existingThesis.geography_preference ?? "",
        exclusions: existingThesis.exclusions ?? "",
        what_good_fit_looks_like: existingThesis.what_good_fit_looks_like ?? "",
      });
    }
  }

  const thesisField = (key: keyof typeof thesisForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setThesisForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleThesisSave = async (status: "draft" | "complete") => {
    if (!startup?.id) return;
    setThesisSaving(true);
    try {
      const { upsertFounderThesis } = await import("@/lib/founder-thesis-fn");
      const { data: { session } } = await supabase.auth.getSession();
      const result = await upsertFounderThesis({ data: { startupId: startup.id, accessToken: session?.access_token ?? "", ...thesisForm, status } });
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      setThesisSaved(true);
      setTimeout(() => setThesisSaved(false), 3000);
      toast.success(status === "complete" ? "Investor criteria saved" : "Draft saved");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setThesisSaving(false);
    }
  };

  const handleThesisAIPropose = async () => {
    if (!startup?.id || thesisProposing) return;
    setThesisProposing(true);
    try {
      const { proposeFounderThesis } = await import("@/lib/founder-thesis-fn");
      const proposed = await proposeFounderThesis({
        data: {
          company_name: (form as any).company_name || startup.company_name || "",
          sector: (form as any).sector || "",
          stage: (form as any).stage || "",
          problem: (form as any).problem || "",
          solution: (form as any).solution || "",
          revenue: (form as any).revenue || "",
          traction: (form as any).traction || "",
          country: (form as any).country || "",
        },
      });
      if (!proposed.ok) { toast.error(proposed.error || "AI proposal failed"); return; }
      setThesisForm((prev) => ({
        preferred_check_size_min: proposed.preferred_check_size_min || prev.preferred_check_size_min,
        preferred_check_size_max: proposed.preferred_check_size_max || prev.preferred_check_size_max,
        preferred_investor_type: proposed.preferred_investor_type || prev.preferred_investor_type,
        board_preference: proposed.board_preference || prev.board_preference,
        sector_expertise_wanted: proposed.sector_expertise_wanted || prev.sector_expertise_wanted,
        geography_preference: proposed.geography_preference || prev.geography_preference,
        exclusions: proposed.exclusions || prev.exclusions,
        what_good_fit_looks_like: proposed.what_good_fit_looks_like || prev.what_good_fit_looks_like,
      }));
      toast.success("AI suggestions applied — edit anything that's wrong before saving.");
    } catch {
      toast.error("AI proposal failed. Fill in the form manually.");
    } finally {
      setThesisProposing(false);
    }
  };

  // Profile views analytics
  const { data: profileViews = [] } = useQuery({
    queryKey: ["profile-views", startup?.id],
    enabled: !!startup?.id && tab === "analytics",
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_views")
        .select("id, viewer_id, viewer_role, viewer_name, viewer_fund, referrer, source, created_at, duration_seconds, users ( full_name, avatar_url )")
        .eq("startup_id", startup!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const totalViews = profileViews.length;
  const uniqueViewers = new Set(profileViews.filter((v: any) => v.viewer_id).map((v: any) => v.viewer_id)).size;
  const anonymousViews = profileViews.filter((v: any) => !v.viewer_id).length;
  const last7Days = profileViews.filter((v: any) => new Date(v.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const viewsWithDuration = profileViews.filter((v: any) => v.duration_seconds != null);
  const avgDuration = viewsWithDuration.length > 0
    ? Math.round(viewsWithDuration.reduce((s: number, v: any) => s + (v.duration_seconds ?? 0), 0) / viewsWithDuration.length)
    : 0;
  const sourceBreakdown = profileViews.reduce((acc: Record<string, number>, v: any) => {
    const src = v.source || (v.referrer?.includes("linkedin") ? "LinkedIn" : v.referrer?.includes("twitter") || v.referrer?.includes("x.com") ? "X" : v.referrer?.includes("whatsapp") ? "WhatsApp" : v.referrer ? "Other" : "Direct");
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});

  // R10 step 9: 30-day time series — matches the ChartCard/AreaChart pattern
  // already used by app.analytics.tsx's document-view analytics.
  const viewsSeries = (() => {
    const days: { date: string; views: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const count = profileViews.filter((v: any) => new Date(v.created_at).toDateString() === d.toDateString()).length;
      days.push({ date: key, views: count });
    }
    return days;
  })();

  useEffect(() => {
    if (startup) {
      setForm(fromStartup(startup));
      setLogoUrl(startup.logo_url ?? null);
      setCoverUrl((startup as any).cover_image_url ?? null);
      setAvatarUrl((startup as any).founder_avatar_url ?? null);
      setSocialLinks(startup.social_links ?? []);
      if (startup.pitch_deck_url) {
        const parts = startup.pitch_deck_url.split("/");
        setDeckName(decodeURIComponent(parts[parts.length - 1] ?? "pitch-deck.pdf").replace(/^\d+-/, ""));
      }
    }
  }, [startup]);

  const field = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const profileSlug = startup?.profile_slug ?? slugify(form.company_name || "");

  // Merge the startup row underneath: the form doesn't track builder-only
  // fields (one_liner, investor_narrative) but they count toward publish.
  const completenessScore = getFounderProfileCompleteness({ ...(startup ?? {}), ...form }).percent;

  const profileReady = completenessScore >= 80;

  const updateSectionVisibility = async (section: string, visibility: SectionVisibility) => {
    if (!startup?.id) return;
    const nextVisibility = { ...form.section_visibility, [section]: visibility };
    setForm((f) => ({ ...f, section_visibility: nextVisibility }));
    try {
      const { error } = await supabase.from("startups").update({ section_visibility: nextVisibility }).eq("id", startup.id);
      if (error) throw error;
      toast.success("Section visibility updated");
    } catch {
      toast.error("Could not save visibility");
    }
  };

  const handleGoLive = async () => {
    if (!startup?.id) {
      toast.error("Save your profile before publishing.");
      return;
    }
    if (!profileReady) {
      toast.error("Complete at least 80% of your profile to go live.");
      return;
    }
    setProfilePublishing(true);
    try {
      // Group 4 correction (3 Sep 2026): publicly_discoverable removed from
      // this write — traced and confirmed dead (no query anywhere filters,
      // orders, or gates on it; the real public-profile whitelist RPC
      // explicitly excludes it by name). There is no directory or browse
      // feature for it to control — CLAUDE.md §15 prohibits building one.
      // The prior comment here ("makes the startup discoverable in the
      // directory") described a feature that was never actually built.
      const { error } = await supabase
        .from("startups")
        .update({ profile_published: true, profile_slug: profileSlug })
        .eq("id", startup.id);
      if (error) throw error;
      toast.success("Profile is live on Lengdon.");
      // Durable confirmation — the founder should know their public profile
      // is live, with a link to it. Copy corrected in the same pass: the
      // original claimed the profile is "live in the directory" and that
      // "investors can now find you" — no directory or discovery surface
      // reads publicly_discoverable or surfaces published profiles to
      // investors at all; the only way to reach this URL is the link itself.
      import("@/lib/notify").then(({ notifyUser }) =>
        notifyUser({
          userId: user!.id,
          kind: "system",
          title: "Your profile is live",
          body: "Share your public profile link with investors — anyone with the link can view it.",
          actionUrl: `/p/${profileSlug}`,
        })
      ).catch((e) => console.error("[profile] live notification failed:", e));
      queryClient.invalidateQueries({ queryKey: ["my-startup", user?.id] });

      try {
        await markStep("profile_published", true);
        await setCurrentStep("promote");
      } catch {
        // Non-fatal — onboarding progress is best-effort, never blocks publishing.
      }
    } catch (e: any) {
      toast.error(e.message || "Could not publish profile.");
    } finally {
      setProfilePublishing(false);
    }
  };

  // STEP 1: Check-then-insert-or-update (no upsert with onConflict)
  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const completeness_score = getFounderProfileCompleteness({ ...(startup ?? {}), ...form }).percent;

      const payload = {
        company_name: form.company_name,
        sector: form.sector || null,
        stage: form.stage || null,
        country: form.country || null,
        funding_target: form.funding_target || null,
        valuation: form.valuation || null,
        traction: form.traction || null,
        revenue: form.revenue || null,
        team_size: form.team_size ? parseInt(cleanNumber(form.team_size), 10) : null,
        description: form.description || null,
        website: form.website || null,
        problem: form.problem || null,
        solution: form.solution || null,
        why_us: form.why_us || null,
        business_model: form.business_model || null,
        use_of_funds: form.use_of_funds || null,
        tagline: form.tagline || null,
        founded_year: form.founded_year ? parseInt(form.founded_year, 10) : null,
        previous_funding: form.previous_funding || null,
        current_investors: form.current_investors || null,
        market_size: form.market_size || null,
        tam: form.tam || null,
        sam: form.sam || null,
        target_customer: form.target_customer || null,
        competitive_advantage: form.competitive_advantage || null,
        why_now: form.why_now || null,
        founder_name: form.founder_name || null,
        founder_email: form.founder_email || null,
        founder_linkedin: form.founder_linkedin || null,
        cofounder_name: form.cofounder_name || null,
        cofounder_linkedin: form.cofounder_linkedin || null,
        key_metric: form.key_metric || null,
        growth_rate: form.growth_rate || null,
        customer_count: form.customer_count || null,
        revenue_model: form.revenue_model || null,
        pricing: form.pricing || null,
        unit_economics: form.unit_economics || null,
        burn_rate: form.burn_rate || null,
        runway_months: form.runway_months ? parseInt(form.runway_months, 10) : null,
        advisors: form.advisors || null,
        competitors: form.competitors || null,
        milestones: form.milestones || null,
        intro_video_url: form.intro_video_url || null,
        product_video_url: form.product_video_url || null,
        moat: form.moat || null,
        legal_entity_name: form.legal_entity_name || null,
        registration_number: form.registration_number || null,
        section_visibility: form.section_visibility,
        social_links: socialLinks.filter((l) => l.platform && l.url),
        profile_slug: form.company_name ? slugify(form.company_name) : null,
        completeness_score,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("startups").select("id").eq("founder_id", user.id).maybeSingle();

      let error;
      let newStartupId: string | null = null;
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("startups").update(payload).eq("id", existing.id);
        error = updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("startups")
          .insert({ ...payload, founder_id: user.id, created_at: new Date().toISOString() })
          .select("id")
          .single();
        error = insertError;
        newStartupId = inserted?.id ?? null;
      }

      if (error) {
        toast.error("Failed to save: " + error.message);
      } else {
        toast.success("Profile saved");
        queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
        // Readiness-checklist regeneration removed 18 Aug 2026 — Foundation
        // §15/§25. This fired generateFounderChecklist on every profile save,
        // writing an AI-generated 0-100 readiness score. Fire-and-forget with
        // its own .catch(), so removing it affects nothing else in this
        // handler. See CLAUDE.md's profile_checklists retirement entry.
        queryClient.invalidateQueries({ queryKey: ["my-startup-overview"] });
        queryClient.invalidateQueries({ queryKey: ["shell-startup", user.id] });
        setMode("view");

        // Migrate localStorage skip flag to DB now that a startup row exists
        if (newStartupId && typeof window !== "undefined" && localStorage.getItem("pb_skipped") === "1") {
          supabase
            .from("profile_builder_sessions")
            .insert({ startup_id: newStartupId, status: "skipped", path: null })
            .then(({ error }) => {
              if (error) { console.error("[profile] pb_skipped migration failed:", error); return; }
              localStorage.removeItem("pb_skipped");
            }); // non-blocking, localStorage flag remains as fallback
        }

        // If founder arrived via an investor invite link, wire up the auto-add flow
        if (newStartupId && typeof window !== "undefined") {
          const pendingToken = sessionStorage.getItem("pending_investor_invite_token");
          const pendingLinkId = sessionStorage.getItem("pending_investor_invite_link_id");
          const pendingInvestorId = sessionStorage.getItem("pending_investor_id");
          if (pendingToken && pendingLinkId && pendingInvestorId) {
            import("@/lib/connections-fn").then(({ processInviteLinkJoin }) => {
              processInviteLinkJoin({
                data: {
                  token: pendingToken,
                  companyName: form.company_name || "Unknown company",
                  investorId: pendingInvestorId,
                  inviteLinkId: pendingLinkId,
                },
              }).then(() => {
                sessionStorage.removeItem("pending_investor_invite_token");
                sessionStorage.removeItem("pending_investor_invite_link_id");
                sessionStorage.removeItem("pending_investor_id");
              }).catch(() => null);
            }).catch(() => null);
          }
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!user?.id) return;
    setLogoUploading(true);
    try {
      const path = `startups/${user.id}/logo`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setLogoUrl(url);
      if (startup?.id) {
        const { error: logoErr } = await supabase.from("startups").update({ logo_url: url }).eq("id", startup.id);
        if (logoErr) throw logoErr;
        queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
      }
      toast.success("Logo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setCoverUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `startups/${user.id}/cover.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setCoverUrl(url);
      if (startup?.id) {
        const { error: coverErr } = await supabase.from("startups").update({ cover_image_url: url }).eq("id", startup.id);
        if (coverErr) throw coverErr;
        queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
      }
      toast.success("Cover image updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `founders/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
      if (startup?.id) {
        const { error: avatarErr } = await supabase.from("startups").update({ founder_avatar_url: url }).eq("id", startup.id);
        if (avatarErr) throw avatarErr;
        queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
        // UserMenu's top-right avatar reads this same column via useFounderAvatarUrl —
        // invalidate so it updates without a page reload (§27 real-time UI rule).
        queryClient.invalidateQueries({ queryKey: ["founder-avatar-url", startup.id] });
      }
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeckUpload = async (file: File) => {
    if (!user?.id) return;
    setDeckUploading(true);
    try {
      const path = `pitch-decks/${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (error) throw error;
      if (startup?.id) {
        const { error: deckErr } = await supabase.from("startups").update({ pitch_deck_url: path }).eq("id", startup.id);
        if (deckErr) throw deckErr;
        queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
      }
      setDeckName(file.name);
      toast.success("Pitch deck uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setDeckUploading(false);
    }
  };

  const FIELD_LABELS: Record<string, string> = {
    company_name: "Company name", tagline: "Tagline", description: "Description",
    sector: "Sector", stage: "Stage", country: "Country",
    funding_target: "Funding target", valuation: "Valuation",
    problem: "Problem", solution: "Solution", why_us: "Why us", why_now: "Why now",
    tam: "Total addressable market", sam: "Serviceable market",
    target_customer: "Target customer", revenue: "Revenue",
    revenue_model: "Revenue model", growth_rate: "Growth rate",
    customer_count: "Customer count", traction: "Traction", pricing: "Pricing",
    burn_rate: "Burn rate", runway_months: "Runway (months)",
    founder_name: "Founder name", cofounder_name: "Co-founder name",
    competitors: "Competitors", competitive_advantage: "Competitive advantage",
    moat: "Moat", use_of_funds: "Use of funds", milestones: "Milestones",
    current_investors: "Current investors", team_size: "Team size", founded_year: "Founded year",
  };

  const handleExtractFromDeck = async (file: File) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
    ];
    if (!allowed.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".pptx")) {
      setExtractionError("Please upload a PDF or PPTX file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setExtractionError("File must be under 10MB");
      return;
    }
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("extract-pitch-deck", {
        body: { fileBase64: base64, fileName: file.name, mimeType: file.type },
      });
      console.log("Extraction response:", data);
      if (error) throw new Error(error.message);
      // data may be the outer envelope { success, data } or the inner fields object directly
      const extracted: Record<string, unknown> =
        data?.data && typeof data.data === "object" ? data.data
        : data?.success === undefined && data && typeof data === "object" ? data
        : null;
      console.log("Extracted fields:", extracted);
      if (!extracted) throw new Error("Extraction returned no data");
      const nonNull = new Set(
        Object.keys(extracted).filter((k) => extracted[k] !== null && extracted[k] !== undefined && extracted[k] !== ""),
      );
      if (nonNull.size === 0) {
        setExtractionError("Could not extract data from this file. Try a text-based PDF (not a scanned image).");
        return;
      }
      setExtractionResult(extracted);
      setSelectedFields(nonNull);
      setShowExtractionPreview(true);
      // Also upload the file to storage
      handleDeckUpload(file);
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  };

  const applyExtractedFields = () => {
    if (!extractionResult) return;
    setForm((prev) => {
      const next = { ...prev };
      selectedFields.forEach((field) => {
        const value = extractionResult[field];
        if (value !== null && value !== undefined && field in next) {
          let str = safeStringify(value);
          if (field === "stage") str = str.replace(/\s*stage\s*/gi, "").trim();
          if (field === "sector") str = str.replace(/\s*(industry|sector|space)$/gi, "").trim();
          (next as any)[field] = str;
        }
      });
      return next;
    });
    setShowExtractionPreview(false);
    setExtractionResult(null);
    toast.success(`${selectedFields.size} fields applied — review and save your profile`);
  };

  // STEP 4: PDF via print
  const handleDownloadPDF = () => window.print();

  const initials = form.company_name
    ? form.company_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
        <LcsSkeleton className="h-8 w-64" />
        <LcsSkeleton className="h-4 w-96" />
        <LcsSkeleton className="h-64" />
      </div>
    );
  }

  // ── STEP 3: View Mode ──────────────────────────────────────────────
  if (mode === "view") {
    const filled = (v: unknown): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === "number") return v > 0;
      if (typeof v === "boolean") return v;
      return String(v).trim().length > 0;
    };

    const pairs: [string, string | null | undefined][] = [
      ["Stage", form.stage], ["Sector", form.sector], ["Country", form.country],
      ["Website", form.website], ["Founded", form.founded_year],
      ["Team size", form.team_size], ["Revenue / ARR", form.revenue],
      ["Growth rate", form.growth_rate], ["Customers", form.customer_count],
      ["Key metric", form.key_metric], ["Funding target", form.funding_target],
      ["Valuation", form.valuation], ["Previous funding", form.previous_funding],
      ["Current investors", form.current_investors], ["Market size", form.market_size],
    ].filter(([, v]) => filled(v)) as [string, string][];

    return (
      <>
        {/* STEP 4: Print CSS */}
        <style>{`
          @media print {
            aside, header, .no-print { display: none !important; }
            body { background: white !important; }
            .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          }
        `}</style>

        <div className="p-6 lg:p-8">
          <div
            className="flex items-center gap-1.5 text-[12px] font-medium mb-3"
            style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
          >
            <Link to={"/app/prepare" as any} style={{ color: "var(--lcs-ink-muted)" }} className="hover:underline">
              Your raise
            </Link>
            <ChevronRight style={{ width: 12, height: 12 }} />
            <span>Profile</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6 no-print">
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Company Profile</h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>How investors see your startup.</p>
            </div>
            <div className="flex items-center gap-2">
              <LcsButton variant="secondary" onClick={handleDownloadPDF} style={{ height: 32 }}>
                <Download className="h-4 w-4" /> Download PDF
              </LcsButton>
              <LcsButton variant="primary" onClick={() => setMode("edit")} style={{ height: 32 }}>
                <Edit3 className="h-4 w-4" /> Edit profile
              </LcsButton>
            </div>
          </div>

          <div className="border overflow-hidden print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
            <div className="h-28 relative" style={{ background: "var(--lcs-surface)" }} />
            <div className="px-6 pb-6 -mt-10">
              <div className="flex items-end gap-4">
                <div
                  className="grid h-20 w-20 place-items-center text-lg font-bold overflow-hidden shrink-0"
                  style={{ borderRadius: "50%", background: "var(--lcs-accent)", color: "var(--lcs-white)", border: "4px solid var(--lcs-white)", fontFamily: "var(--font-lcs-ui)" }}
                >
                  {logoUrl
                    ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                    : <span>{initials}</span>}
                </div>
                <div className="pb-1">
                  <h2 className="text-2xl font-bold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{form.company_name || "Unnamed Company"}</h2>
                  {filled(form.tagline) && <p className="text-sm mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>{form.tagline}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {filled(form.stage) && <LcsStatusPill status="in-progress" label={form.stage} />}
                    {filled(form.sector) && <LcsStatusPill status="pending" label={form.sector} />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {filled(form.description) && (
            <div className="mt-4 border p-5 print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
              <div className="text-sm font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>About</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{form.description}</p>
            </div>
          )}

          {pairs.length > 0 && (
            <div className="mt-4 border p-5 print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
              <div className="text-sm font-semibold mb-3" style={{ color: "var(--lcs-ink)" }}>Key details</div>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {pairs.map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between pb-2 gap-2" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
                    <span className="text-xs shrink-0" style={{ color: "var(--lcs-ink-muted)" }}>{label}</span>
                    <span className="text-sm font-medium truncate" style={{ color: "var(--lcs-ink)" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(filled(form.problem) || filled(form.solution)) && (
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {filled(form.problem) && (
                <div className="border p-5 print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>Problem</div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{form.problem}</p>
                </div>
              )}
              {filled(form.solution) && (
                <div className="border p-5 print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>Solution</div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{form.solution}</p>
                </div>
              )}
            </div>
          )}

          {(filled(form.traction) || filled(form.business_model) || filled(form.use_of_funds) || filled(form.why_now) || filled(form.competitive_advantage)) && (
            <div className="mt-4 space-y-4">
              {[
                ["Traction highlights", form.traction],
                ["Business model", form.business_model],
                ["Use of funds", form.use_of_funds],
                ["Why now?", form.why_now],
                ["Competitive advantage", form.competitive_advantage],
              ].filter(([, v]) => filled(v)).map(([label, val]) => (
                <div key={label as string} className="border p-5 print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>{label}</div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{val}</p>
                </div>
              ))}
            </div>
          )}

          {(filled(form.founder_name) || filled(form.founder_email)) && (
            <div className="mt-4 border p-5 print-card" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
              <div className="text-sm font-semibold mb-3" style={{ color: "var(--lcs-ink)" }}>Contact</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["Founder", form.founder_name],
                  ["Email", form.founder_email],
                  ["LinkedIn", form.founder_linkedin],
                  ["Co-founder", form.cofounder_name],
                  ["Co-founder LinkedIn", form.cofounder_linkedin],
                ].filter(([, v]) => filled(v)).map(([label, val]) => (
                  <div key={label as string}>
                    <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{label}</div>
                    <div className="text-sm font-medium mt-0.5" style={{ color: "var(--lcs-ink)" }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {startup?.id && (
            <div className="mt-4 no-print">
              <TeamMembersSection startupId={startup.id} readOnly />
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Edit Mode ──────────────────────────────────────────────────────

  const SaveBtn = ({ full = false }: { full?: boolean }) => (
    <LcsButton
      variant="primary"
      onClick={handleSave}
      disabled={saving}
      className={full ? "w-full" : ""}
      style={{ height: 32, ...(full ? { width: "100%" } : {}) }}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      Save changes
    </LcsButton>
  );

  return (
    <div className="p-6 lg:p-8">
      <div
        className="flex items-center gap-1.5 text-[12px] font-medium mb-3"
        style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
      >
        <Link to={"/app/prepare" as any} style={{ color: "var(--lcs-ink-muted)" }} className="hover:underline">
          Your raise
        </Link>
        <ChevronRight style={{ width: 12, height: 12 }} />
        <span>Profile</span>
      </div>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{startup ? "Edit profile" : "Create your profile"}</h1>
          <div className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
            {startup ? "Edit your startup details, team, and pitch." : "Set up your startup profile so investors know who you are."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PageGuide pageId="profile" />
          {startup && (
            <LcsButton variant="secondary" onClick={() => setMode("view")} style={{ height: 32 }}>
              <Eye className="h-4 w-4" /> View profile
            </LcsButton>
          )}
          <SaveBtn />
        </div>
      </div>

      <div className="mt-6 border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>Profile completion</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)" }}>
                <div
                  className="h-full"
                  style={{
                    borderRadius: "var(--radius-lcs-control)",
                    width: `${Math.min(completenessScore, 100)}%`,
                    background: completenessScore < 41 ? "var(--lcs-attention)" : completenessScore < 80 ? "var(--lcs-progress)" : "var(--lcs-satisfied)",
                  }}
                />
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{completenessScore}%</div>
            </div>
          </div>
          <LcsButton
            variant={profileReady ? "primary" : "secondary"}
            data-tour="publish-button"
            onClick={handleGoLive}
            disabled={!profileReady || profilePublishing}
            style={{ height: 32 }}
          >
            Go live
          </LcsButton>
        </div>
        {progress?.account_type === "founder" && progress.current_step === "publish" && (
          <OnboardingTour
            steps={[{
              id: "publish",
              target: "publish-button",
              title: "Publish your profile",
              body: "Once you're at least 80% complete, go live to make your profile visible and ready to share with investors.",
            }]}
            activeIndex={0}
            onSkip={() => markStep("tour_viewed", true)}
            onNext={() => markStep("tour_viewed", true)}
            onFinish={() => markStep("tour_viewed", true)}
          />
        )}
        {completenessScore < 80 && (
          <div className="mt-4 px-4 py-3 text-sm" style={{ borderRadius: 0, border: "1px solid var(--lcs-attention)", background: "var(--lcs-attention-wash)", color: "var(--lcs-attention)" }}>
            <span className="font-semibold">Your profile is not yet visible in the directory.</span> Complete at least 80% to go live.
          </div>
        )}
      </div>

      {startup && !form.company_name.trim() && (
        <div className="mt-4 flex items-start gap-3 px-4 py-3 text-sm" style={{ borderRadius: 0, border: "1px solid var(--lcs-attention)", background: "var(--lcs-attention-wash)", color: "var(--lcs-attention)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Company name is missing.</span>{" "}
            Investors currently see "Unnamed" in their deal flow. Add your startup name below to fix this.
          </span>
        </div>
      )}

      {/* Hero card — R7-testing fix 4: renders on the Full Profile leaf
          (view === "full", edit mode with upload controls) and the
          standalone (!view) case. The Digital Profile View leaf
          (view === "preview") still shows this card but display-only — no
          upload affordances — since uploading belongs in Profile Builder,
          not Go Live. Every other Profile leaf (Quick Setup, Team Cards,
          Fundraising Thesis, Privacy Settings) still doesn't render this. */}
      {(!view || view === "full" || view === "preview") && (() => {
        const canUpload = !view || view === "full";
        return (
      <div className="mt-6 overflow-hidden" style={{ borderRadius: 0, border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }}>
        <CoverArea readOnly={!canUpload}>
          {coverUrl ? (
            <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full relative" style={{ background: "var(--lcs-surface)" }} />
          )}
          {canUpload && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              {coverUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <span
                  className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                  style={{ borderRadius: "var(--radius-lcs-control)", background: "rgba(255,255,255,0.9)", color: "var(--lcs-ink)" }}
                >
                  <Upload className="h-3.5 w-3.5" /> {coverUrl ? "Replace cover" : "Add cover image"}
                </span>
              )}
            </div>
          )}
          {canUpload && <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />}
        </CoverArea>
        <div className="px-6 pb-6 -mt-10 relative">
          <div className="flex items-end gap-4">
            <LogoArea readOnly={!canUpload}>
              <div
                className="grid h-20 w-20 place-items-center text-lg font-bold overflow-hidden"
                style={{ borderRadius: "50%", background: "var(--lcs-accent)", color: "var(--lcs-white)", border: "4px solid var(--lcs-white)", fontFamily: "var(--font-lcs-ui)" }}
              >
                {logoUploading
                  ? <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--lcs-white)" }} />
                  : logoUrl
                  ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                  : <span>{initials}</span>}
              </div>
              {canUpload && (
                <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderRadius: "50%", background: "rgba(0,0,0,0.4)" }}>
                  <Upload className="h-5 w-5 text-white" />
                </div>
              )}
              {canUpload && <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />}
            </LogoArea>
          </div>
          <div className="mt-4">
            <div className="text-xl font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>{form.company_name || "Your Company"}</div>
            <div className="text-sm mt-1" style={{ color: "var(--lcs-ink-muted)" }}>{form.tagline || form.description || "Add a tagline below"}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
              <span>Your profile link:</span>
              <span className="px-2 py-1 text-[11px] font-medium" style={{ borderRadius: 0, border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-data)" }}>lengdon.com/p/{profileSlug || "your-slug"}</span>
              <LcsButton
                variant="secondary"
                onClick={() => {
                  if (profileSlug) {
                    navigator.clipboard.writeText(`https://lengdon.com/p/${profileSlug}`);
                    toast.success("Profile URL copied");
                  }
                }}
                style={{ height: 24, padding: "0 8px" }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </LcsButton>
            </div>
          </div>
        </div>
      </div>
        );
      })()}

      {/* STEP 6: Quick setup / Full details tabs — hidden under R9 route
          control, where the swapped sidebar owns navigation between slices */}
      {!view && (
      <div className="mt-5 flex items-center gap-1 p-1 w-fit" style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
        <button
          onClick={() => setTab("quick")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
          style={{
            borderRadius: "var(--radius-lcs-control)",
            background: tab === "quick" ? "var(--lcs-white)" : "transparent",
            color: tab === "quick" ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
            fontWeight: tab === "quick" ? 600 : 400,
          }}
        >
          <Zap className="h-3.5 w-3.5" /> Quick setup
        </button>
        <button
          onClick={() => setTab("full")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
          style={{
            borderRadius: "var(--radius-lcs-control)",
            background: tab === "full" ? "var(--lcs-white)" : "transparent",
            color: tab === "full" ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
            fontWeight: tab === "full" ? 600 : 400,
          }}
        >
          <AlignLeft className="h-3.5 w-3.5" /> Full details
        </button>
        <button
          onClick={() => setTab("privacy")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
          style={{
            borderRadius: "var(--radius-lcs-control)",
            background: tab === "privacy" ? "var(--lcs-white)" : "transparent",
            color: tab === "privacy" ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
            fontWeight: tab === "privacy" ? 600 : 400,
          }}
        >
          <Shield className="h-3.5 w-3.5" /> Privacy
        </button>
        <button
          onClick={() => setTab("preview")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
          style={{
            borderRadius: "var(--radius-lcs-control)",
            background: tab === "preview" ? "var(--lcs-white)" : "transparent",
            color: tab === "preview" ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
            fontWeight: tab === "preview" ? 600 : 400,
          }}
        >
          <Eye className="h-3.5 w-3.5" /> Profile preview
        </button>
        <button
          onClick={() => setTab("analytics")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors"
          style={{
            borderRadius: "var(--radius-lcs-control)",
            background: tab === "analytics" ? "var(--lcs-white)" : "transparent",
            color: tab === "analytics" ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
            fontWeight: tab === "analytics" ? 600 : 400,
          }}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Analytics{totalViews > 0 ? ` (${totalViews})` : ""}
        </button>
      </div>
      )}

      {extractionError && (
        <div className="mt-4 flex items-start gap-2 px-4 py-3 text-sm" style={{ borderRadius: 0, border: "1px solid var(--lcs-attention)", background: "var(--lcs-attention-wash)", color: "var(--lcs-attention)" }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{extractionError}</span>
          <button onClick={() => setExtractionError(null)} className="ml-auto" style={{ color: "var(--lcs-attention)" }}><X className="h-4 w-4" /></button>
        </div>
      )}

      {showExtractionPreview && extractionResult && (
        <LcsModal
          title="AI extracted these fields"
          onClose={() => setShowExtractionPreview(false)}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{selectedFields.size} field{selectedFields.size !== 1 ? "s" : ""} selected</span>
              <div className="flex gap-2">
                <LcsButton variant="secondary" onClick={() => setShowExtractionPreview(false)} style={{ height: 28 }}>Cancel</LcsButton>
                <LcsButton variant="primary" onClick={applyExtractedFields} disabled={selectedFields.size === 0} style={{ height: 28 }}>
                  Apply selected fields →
                </LcsButton>
              </div>
            </div>
          }
        >
          <p className="text-xs -mt-2" style={{ color: "var(--lcs-ink-muted)" }}>Select which fields to apply to your profile.</p>
          <div className="space-y-2">
            {Object.entries(FIELD_LABELS).map(([key, label]) => {
              const val = extractionResult[key];
              if (val === null || val === undefined) return null;
              const checked = selectedFields.has(key);
              return (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={(e) => setSelectedFields((prev) => { const next = new Set(prev); e.target.checked ? next.add(key) : next.delete(key); return next; })}
                    className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium" style={{ color: "var(--lcs-ink-muted)" }}>{label}: </span>
                    <span className="text-xs break-words" style={{ color: "var(--lcs-ink)" }}>{safeStringify(val)}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </LcsModal>
      )}

      {isTabView && (tab === "quick" ? (
        // QUICK SETUP: 5 fields
        <div className="mt-4 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FormSection title="Quick setup">
              <Field label="Company name" value={form.company_name} onChange={field("company_name")} placeholder="Atlas Robotics" />
              <Field label="Tagline" value={form.tagline} onChange={field("tagline")} placeholder="One line that explains your company" />
              <Field label="Website" value={form.website} onChange={field("website")} placeholder="https://example.com" />
              <Field label="Country / HQ" value={form.country} onChange={field("country")} placeholder="San Francisco, USA" />
              <Field label="Sector" value={form.sector} onChange={field("sector")} placeholder="B2B SaaS, Fintech, AI..." />
              <div className="pt-2">
                <SaveBtn full />
              </div>
            </FormSection>
          </div>
          <div>
            <RightCol
              form={form}
              deckName={deckName}
              deckUploading={deckUploading}
              onDeckUpload={handleExtractFromDeck}
              isExtracting={isExtracting}
              sectionVisibility={form.section_visibility}
              onVisibilityChange={updateSectionVisibility}
              showVisibility={tab === "full"}
            />
          </div>
        </div>
      ) : tab === "full" ? (
        // FULL DETAILS: all sections
        <div className="mt-4 grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <FormSection title="Company identity">
              <Field label="Company name" value={form.company_name} onChange={field("company_name")} placeholder="Atlas Robotics" />
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Legal entity name</label>
                <input
                  type="text"
                  value={form.legal_entity_name ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, legal_entity_name: e.target.value }))}
                  placeholder="Full registered legal name (if different from trading name)"
                  className="w-full px-4 py-3 text-sm outline-none transition-colors mt-2"
                  style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Company registration number</label>
                <input
                  type="text"
                  value={form.registration_number ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, registration_number: e.target.value }))}
                  placeholder="e.g. 0001234 (Companies House), CL1234 (DIFC)"
                  className="w-full px-4 py-3 text-sm outline-none transition-colors"
                  style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--lcs-ink-muted)" }}>Optional but improves registry verification accuracy</p>
              </div>

              <Field label="Tagline" value={form.tagline} onChange={field("tagline")} placeholder="One line that explains your company" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Website" value={form.website} onChange={field("website")} placeholder="https://example.com" />
                <Field label="Founded year" value={form.founded_year} onChange={field("founded_year")} placeholder="2022" />
                <Field label="Country / HQ" value={form.country} onChange={field("country")} placeholder="San Francisco, USA" />
                <Field label="Team size" value={form.team_size} onChange={field("team_size")} placeholder="e.g. 12" title="Number of full-time team members" />
                <Field label="Sector" value={form.sector} onChange={field("sector")} placeholder="B2B SaaS, Fintech, AI..." />
                <div>
                  <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Stage</label>
                  <select
                    value={form.stage}
                    onChange={field("stage")}
                    className="mt-1 w-full px-3 py-2 text-sm outline-none"
                    style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                  >
                    <option value="">Select stage</option>
                    {STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <TextArea label="Description" value={form.description} onChange={field("description")} placeholder="What does your company do?" rows={3} />
            </FormSection>

            <FormSection title="Fundraising">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Funding target" value={form.funding_target} onChange={field("funding_target")} placeholder="e.g. 2,000,000" title="Enter amount in USD, use commas for thousands (e.g. 2,000,000)" onBlur={(e) => setForm((f) => ({ ...f, funding_target: formatNumber(e.target.value) }))} />
                <Field label="Pre-money valuation" value={form.valuation} onChange={field("valuation")} placeholder="e.g. 20,000,000" title="Pre-money valuation in USD" onBlur={(e) => setForm((f) => ({ ...f, valuation: formatNumber(e.target.value) }))} />
                <Field label="Previous funding raised" value={form.previous_funding} onChange={field("previous_funding")} placeholder="$500K pre-seed" />
                <Field label="Current investors" value={form.current_investors} onChange={field("current_investors")} placeholder="Y Combinator, Sequoia" />
              </div>
              <TextArea label="Use of funds" value={form.use_of_funds} onChange={field("use_of_funds")} placeholder="40% engineering, 30% sales, 30% ops" rows={2} />
            </FormSection>

            <FormSection title="Traction & metrics">
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Revenue */}
                <div>
                  <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Revenue / ARR</label>
                  <input
                    value={form.revenue}
                    onChange={field("revenue")}
                    onBlur={(e) => setForm((f) => ({ ...f, revenue: formatNumber(e.target.value) }))}
                    placeholder="e.g. 500,000"
                    className="w-full px-3 py-2 text-sm outline-none mt-1"
                    style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                  />
                </div>
                {/* Growth rate */}
                <div>
                  <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Growth rate</label>
                  <input
                    value={form.growth_rate}
                    onChange={field("growth_rate")}
                    placeholder="+15% MoM"
                    className="w-full px-3 py-2 text-sm outline-none mt-1"
                    style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                  />
                </div>
                {/* Customer count */}
                <div>
                  <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Customer count</label>
                  <input
                    value={form.customer_count}
                    onChange={field("customer_count")}
                    placeholder="500 paying customers"
                    className="w-full px-3 py-2 text-sm outline-none mt-1"
                    style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                  />
                </div>
                {/* Key metric */}
                <div>
                  <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Key metric</label>
                  <input
                    value={form.key_metric}
                    onChange={field("key_metric")}
                    placeholder="Your most important metric"
                    className="w-full px-3 py-2 text-sm outline-none mt-1"
                    style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                  />
                </div>
              </div>
              {/* Traction textarea */}
              <div>
                <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Traction highlights</label>
                <textarea
                  value={form.traction}
                  onChange={field("traction")}
                  placeholder="Key traction highlights..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm outline-none resize-none mt-1"
                  style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                />
              </div>
            </FormSection>

            {/* Cap Table — founder-only, not visible to investors by default */}
            {startup?.id && <CapTableSection startupId={startup.id} />}

            <FormSection title="Vision & strategy">
              <TextArea label="Problem" value={form.problem} onChange={field("problem")} placeholder="What problem are you solving?" rows={4} />
              <TextArea label="Solution" value={form.solution} onChange={field("solution")} placeholder="How does your product solve it?" rows={4} />
              <TextArea label="Business model" value={form.business_model} onChange={field("business_model")} placeholder="How do you make money?" rows={3} />
              <Field label="Market size" value={form.market_size} onChange={field("market_size") as any} placeholder="$50B TAM, $5B SAM…" />
              <TextArea label="Why us" value={form.why_us} onChange={field("why_us")} placeholder="Why is your team uniquely positioned?" rows={3} />
              <TextArea label="Why now?" value={form.why_now} onChange={field("why_now")} placeholder="What tailwind or market shift makes this the right time?" rows={2} />
            </FormSection>

            <FormSection title="Market & opportunity">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="TAM" value={form.tam} onChange={field("tam")} placeholder="Total addressable market" />
                <Field label="SAM" value={form.sam} onChange={field("sam")} placeholder="Serviceable addressable market" />
                <Field label="Target customer" value={form.target_customer} onChange={field("target_customer")} placeholder="Who will buy from you?" />
              </div>
            </FormSection>

            <FormSection title="Business model details">
              <TextArea label="Revenue model" value={form.revenue_model} onChange={field("revenue_model")} placeholder="How do you generate revenue?" rows={3} />
              <Field label="Pricing" value={form.pricing} onChange={field("pricing")} placeholder="Pricing model or range" />
              <TextArea label="Unit economics" value={form.unit_economics} onChange={field("unit_economics")} placeholder="CAC, LTV or contribution margin" rows={3} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Burn rate" value={form.burn_rate} onChange={field("burn_rate")} placeholder="$ / month" />
                <Field label="Runway (months)" value={form.runway_months} onChange={field("runway_months")} placeholder="e.g. 12" />
              </div>
            </FormSection>

            <FormSection title="Cap & relationships">
              <TextArea label="Moat" value={form.moat} onChange={field("moat")} placeholder="What protects your business?" rows={3} />
              <TextArea label="Competitors" value={form.competitors} onChange={field("competitors")} placeholder="Key competitors and alternatives" rows={3} />
              <TextArea label="Milestones" value={form.milestones} onChange={field("milestones")} placeholder="Key traction, launches, and milestones" rows={3} />
              <TextArea label="Advisors" value={form.advisors} onChange={field("advisors")} placeholder="Notable advisors" rows={2} />
            </FormSection>

            <FormSection title="Media">
              <Field label="Intro video URL" value={form.intro_video_url} onChange={field("intro_video_url")} placeholder="YouTube or Loom link" />
              <Field label="Product video URL" value={form.product_video_url} onChange={field("product_video_url")} placeholder="Optional product walkthrough link" />
            </FormSection>

            <FormSection title="Social links">
              <div className="space-y-2">
                {socialLinks.map((link, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={link.platform}
                      onChange={(e) => setSocialLinks((prev) => prev.map((l, j) => j === i ? { ...l, platform: e.target.value } : l))}
                      placeholder="Platform name"
                      className="w-32 shrink-0 px-3 py-2 text-sm outline-none"
                      style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                    />
                    <input
                      value={link.url}
                      onChange={(e) => setSocialLinks((prev) => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 text-sm outline-none"
                      style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))}
                      className="px-2 text-lg leading-none"
                      style={{ color: "var(--lcs-ink-muted)" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <LcsButton
                  variant="text-link"
                  onClick={() => setSocialLinks((prev) => [...prev, { platform: "", url: "" }])}
                >
                  + Add social link
                </LcsButton>
              </div>
            </FormSection>

            <FormSection title="Contact">
              {/* Founder avatar upload */}
              <div className="mb-4 flex items-center gap-4">
                <label className="relative cursor-pointer group shrink-0">
                  <div
                    className="h-[72px] w-[72px] overflow-hidden flex items-center justify-center text-2xl font-bold"
                    style={{ borderRadius: "50%", background: "var(--lcs-accent)", color: "var(--lcs-white)", fontFamily: "var(--font-lcs-ui)" }}
                  >
                    {avatarUploading
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      : <span>{(form.founder_name || user?.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderRadius: "50%", background: "rgba(0,0,0,0.5)" }}>
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                </label>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)" }}>Profile photo</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>Max 2MB. JPG, PNG or WebP.</div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Founder name" value={form.founder_name} onChange={field("founder_name")} placeholder="Jane Smith" />
                <Field label="Founder email" value={form.founder_email} onChange={field("founder_email")} placeholder="jane@startup.com" />
                <Field label="Founder LinkedIn" value={form.founder_linkedin} onChange={field("founder_linkedin")} placeholder="linkedin.com/in/janesmith" />
                <Field label="Co-founder name" value={form.cofounder_name} onChange={field("cofounder_name")} placeholder="Alex Lee" />
                <Field label="Co-founder LinkedIn" value={form.cofounder_linkedin} onChange={field("cofounder_linkedin")} placeholder="linkedin.com/in/alexlee" />
              </div>
            </FormSection>

            <div className="pb-2">
              <SaveBtn full />
            </div>
          </div>

          <div className="space-y-4">
            <RightCol
              form={form}
              deckName={deckName}
              deckUploading={deckUploading}
              onDeckUpload={handleExtractFromDeck}
              isExtracting={isExtracting}
              sectionVisibility={form.section_visibility}
              onVisibilityChange={updateSectionVisibility}
              showVisibility={tab === "full"}
            />
          </div>
        </div>
      ) : tab === "privacy" ? (
        <PrivacyTab
          startupId={startup?.id ?? null}
          sectionVisibility={form.section_visibility}
          onSave={async (newVis) => {
            if (!startup?.id) { toast.error("Save your profile first."); return; }
            setForm((f) => ({ ...f, section_visibility: newVis }));
            const { error } = await supabase
              .from("startups")
              .update({ section_visibility: newVis })
              .eq("id", startup.id);
            if (error) toast.error("Failed to save privacy settings.");
            else toast.success("Privacy settings saved.");
          }}
        />
      ) : tab === "analytics" ? (
        <div className="mt-4 space-y-6">
          {!startup?.profile_slug ? (
            <div className="border p-8 text-center" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
              <BarChart3 className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--lcs-ink-muted)", opacity: 0.3 }} />
              <p className="text-sm font-medium mb-1" style={{ color: "var(--lcs-ink)" }}>Publish your profile first to start tracking views</p>
              <p className="text-xs mb-3" style={{ color: "var(--lcs-ink-muted)" }}>Go to Full Details, fill at least 80% of fields, then click "Go live"</p>
              <button onClick={() => setTab("full")} className="text-xs hover:underline" style={{ color: "var(--lcs-accent)" }}>Go to Full Details →</button>
            </div>
          ) : (
            <>
              {/* Stats — R10 step 9: restyled to white bordered cells,
                  matching app.analytics.tsx's ChartCard convention */}
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)" }}>Profile Analytics</p>
                <p className="text-xs mb-4" style={{ color: "var(--lcs-ink-muted)" }}>Tracking views of lengdon.com/p/{startup.profile_slug}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total views", value: String(totalViews) },
                    { label: "Unique visitors", value: String(uniqueViewers) },
                    { label: "Avg duration", value: avgDuration > 0 ? `${avgDuration}s` : "0s" },
                    { label: "Last 7 days", value: String(last7Days) },
                  ].map(({ label, value }) => (
                    <div key={label} className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                      <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>{value}</p>
                      <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: "var(--lcs-ink-muted)" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Views over time — 30-day area chart */}
              <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--lcs-ink-muted)" }}>Profile views (30 days)</p>
                {totalViews === 0 ? (
                  <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>No data yet — publish your profile to start tracking views.</p>
                ) : (
                  <div style={{ height: 220 }}>
                    <LazyChart render={(R) => (
                    <R.ResponsiveContainer width="100%" height="100%">
                      <R.AreaChart data={viewsSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <R.CartesianGrid stroke="var(--lcs-line)" vertical={false} />
                        <R.XAxis dataKey="date" tick={{ fontSize: 11, fill: "#57544E" }} axisLine={{ stroke: "#DDDBD6" }} tickLine={false} interval={4} />
                        <R.YAxis tick={{ fontSize: 11, fill: "#57544E" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <R.Tooltip contentStyle={{ fontSize: 12, border: "1px solid #DDDBD6", borderRadius: 0 }} />
                        <R.Area type="monotone" dataKey="views" stroke="#1F4E8C" fill="#1F4E8C" fillOpacity={0.08} strokeWidth={2} />
                      </R.AreaChart>
                    </R.ResponsiveContainer>
                    )} />
                  </div>
                )}
              </div>

              {totalViews === 0 ? (
                <LcsEmptyState title="No views yet" text="Views of your public profile appear here." />
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Traffic sources */}
                  <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--lcs-ink-muted)" }}>Traffic sources</p>
                    <div className="space-y-3">
                      {Object.entries(sourceBreakdown).sort(([, a], [, b]) => (b as number) - (a as number)).map(([source, count]) => (
                        <div key={source} className="flex items-center gap-3">
                          <span className="text-sm w-20 shrink-0" style={{ color: "var(--lcs-ink-muted)" }}>{source}</span>
                          <div className="flex-1 h-1.5 overflow-hidden" style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", borderRadius: 0 }}>
                            <div className="h-full" style={{ width: `${((count as number) / totalViews) * 100}%`, background: "var(--lcs-accent)" }} />
                          </div>
                          <span className="text-sm w-6 text-right tabular-nums" style={{ color: "var(--lcs-ink-muted)" }}>{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* View history */}
                  <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--lcs-ink-muted)" }}>View history</p>
                    <div>
                      {profileViews.map((view: any) => {
                        const namedInvestor = view.viewer_role === "investor" && view.viewer_name;
                        const viewerLabel = view.viewer_name
                          ? view.viewer_fund
                            ? `${view.viewer_name} · ${view.viewer_fund}`
                            : view.viewer_name
                          : view.viewer_id && view.users?.full_name
                          ? view.users.full_name
                          : "Anonymous visitor";
                        const avatarLetter = view.viewer_name
                          ? view.viewer_name.charAt(0).toUpperCase()
                          : view.users?.full_name
                          ? view.users.full_name.charAt(0).toUpperCase()
                          : null;
                        return (
                        <div
                          key={view.id}
                          className="flex items-center justify-between py-3 last:border-0"
                          style={{
                            borderBottom: "1px solid var(--lcs-line)",
                            ...(namedInvestor ? { background: "var(--lcs-surface)", padding: "12px", margin: "0 -12px", borderLeft: "2px solid var(--lcs-accent)" } : {}),
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {avatarLetter ? (
                              <div
                                className="w-8 h-8 flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ borderRadius: "50%", background: "var(--lcs-surface)", color: "var(--lcs-accent)" }}
                              >
                                {avatarLetter}
                              </div>
                            ) : (
                              <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ borderRadius: "50%", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}>?</div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm truncate flex items-center gap-1.5" style={{ color: "var(--lcs-ink)" }}>
                                {viewerLabel}
                                {namedInvestor && (
                                  <span className="text-xs px-1.5 py-0.5" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)", color: "var(--lcs-accent)" }}>Investor</span>
                                )}
                              </p>
                              <p className="text-xs truncate" style={{ color: "var(--lcs-ink-muted)" }}>
                                {view.source || (view.referrer?.includes("linkedin") ? "via LinkedIn" : view.referrer?.includes("x.com") ? "via X" : view.referrer ? `via ${(() => { try { return new URL(view.referrer).hostname; } catch { return view.referrer; } })()}` : "Direct link")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            {view.duration_seconds > 0 && (
                              <span className="text-xs tabular-nums" style={{ color: "var(--lcs-ink-muted)" }}>
                                {view.duration_seconds < 60 ? `${view.duration_seconds}s` : `${Math.floor(view.duration_seconds / 60)}m ${view.duration_seconds % 60}s`}
                              </span>
                            )}
                            <p className="text-xs tabular-nums" style={{ color: "var(--lcs-ink-muted)" }}>{formatRelativeTime(view.created_at)}</p>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Share link */}
              <div className="p-4 border" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--lcs-ink-muted)" }}>Your shareable profile link</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm truncate" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>lengdon.com/p/{startup.profile_slug}</span>
                  <LcsButton
                    variant="secondary"
                    onClick={() => { navigator.clipboard.writeText(`https://lengdon.com/p/${startup.profile_slug}`); toast.success("Copied!"); }}
                    style={{ height: 28 }}
                  >
                    Copy
                  </LcsButton>
                  <a
                    href={`https://lengdon.com/p/${startup.profile_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-accent)" }}
                  >
                    Open →
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        // R10 step 1: preview tab redesigned — the Hero card above already
        // carries name/tagline/logo/cover, so this starts straight at the
        // stat row. Every stat cell fixed from bg-[#111118] (unmigrated
        // legacy dark box) to a white bordered cell per the Constitution.
        <div className="mt-4 space-y-6">
          <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Overview</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["Stage", form.stage], ["Sector", form.sector],
                ["Country", form.country], ["Founded", form.founded_year],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label} className="border p-4" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-surface)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>{label}</div>
                  <div className="mt-2 text-sm font-medium" style={{ color: "var(--lcs-ink)" }}>{val || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>About</div>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{form.description || "Your company description appears here."}</p>
            </div>
            <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Key metrics</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {([
                  ["Raising", form.funding_target], ["Valuation", form.valuation], ["Revenue", form.revenue],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="border p-4" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-surface)" }}>
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>{label}</div>
                    <div className="mt-2 text-sm font-medium" style={{ color: "var(--lcs-ink)" }}>{val || "—"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {([
              ["Problem", form.problem, "Describe the customer problem."],
              ["Solution", form.solution, "Explain how you solve it."],
              ["Why us", form.why_us, "Why is your team uniquely positioned?"],
              ["Why now", form.why_now, "Why is now the right moment?"],
            ] as [string, string, string][]).map(([label, val, placeholder]) => (
              <div key={label} className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>{label}</div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>{val || placeholder}</p>
              </div>
            ))}
          </div>

          {(form.tam || form.sam || form.target_customer || form.revenue_model || form.pricing || form.unit_economics || form.burn_rate || form.runway_months || form.advisors || form.competitors || form.milestones || form.intro_video_url || form.product_video_url || form.moat) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {(form.tam || form.sam || form.target_customer) && (
                <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Market opportunity</div>
                  <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
                    {form.tam && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>TAM:</span> {form.tam}</div>}
                    {form.sam && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>SAM:</span> {form.sam}</div>}
                    {form.target_customer && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Target customer:</span> {form.target_customer}</div>}
                  </div>
                </div>
              )}
              {(form.revenue_model || form.pricing || form.unit_economics) && (
                <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Business model</div>
                  <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
                    {form.revenue_model && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Revenue model:</span> {form.revenue_model}</div>}
                    {form.pricing && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Pricing:</span> {form.pricing}</div>}
                    {form.unit_economics && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Unit economics:</span> {form.unit_economics}</div>}
                  </div>
                </div>
              )}
              {(form.burn_rate || form.runway_months) && (
                <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Runway</div>
                  <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
                    {form.burn_rate && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Burn rate:</span> {form.burn_rate}</div>}
                    {form.runway_months && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Runway:</span> {form.runway_months} months</div>}
                  </div>
                </div>
              )}
              {(form.advisors || form.competitors || form.milestones || form.moat || form.intro_video_url || form.product_video_url) && (
                <div className="border p-6" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lcs-ink-muted)" }}>Differentiators</div>
                  <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
                    {form.moat && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Moat:</span> {form.moat}</div>}
                    {form.competitors && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Competitors:</span> {form.competitors}</div>}
                    {form.milestones && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Milestones:</span> {form.milestones}</div>}
                    {form.advisors && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Advisors:</span> {form.advisors}</div>}
                    {form.intro_video_url && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Intro video:</span> <a href={form.intro_video_url} target="_blank" rel="noreferrer" style={{ color: "var(--lcs-accent)" }} className="hover:underline">Watch</a></div>}
                    {form.product_video_url && <div><span className="font-semibold" style={{ color: "var(--lcs-ink)" }}>Product video:</span> <a href={form.product_video_url} target="_blank" rel="noreferrer" style={{ color: "var(--lcs-accent)" }} className="hover:underline">Watch</a></div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {startup?.id && (view === "team-cards" || (!view && tab !== "analytics")) && (
        <div className="mt-8">
          <TeamMembersSection startupId={startup.id} />
        </div>
      )}

      {!startup?.id && !isLoading && (view === "team-cards" || (!view && tab !== "analytics")) && (
        <div className="mt-6 p-6 text-center text-sm" style={{ borderRadius: 0, border: "1px dashed var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink-muted)" }}>
          Save your profile first to add team members.
        </div>
      )}

      {/* ── Investor criteria / Founder thesis ───────────────────────── */}
      {startup?.id && (view === "fundraising-thesis" || (!view && tab !== "analytics")) && (
        <div className="mt-8 border p-5 space-y-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
          {/* Section header */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-progress-wash)" }}>
              <Target className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>
                  What kind of investor are you looking for
                </h2>
                {existingThesis?.status === "complete" && <LcsStatusPill status="satisfied" label="Complete" />}
              </div>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>
                The last step. This helps us match you with investors who are actually right for you, not just anyone who's interested.
              </p>
            </div>
          </div>

          {/* AI propose banner — only if thesis not yet complete */}
          {existingThesis?.status !== "complete" && (
            <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderRadius: 0, background: "var(--lcs-progress-wash)", border: "1px solid var(--lcs-line)" }}>
              <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--lcs-ink-muted)" }}>
                Based on your profile and documents, we can suggest a starting point — edit anything that's wrong.
              </p>
              <LcsButton variant="secondary" onClick={handleThesisAIPropose} disabled={thesisProposing} style={{ height: 28 }}>
                {thesisProposing
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Proposing…</>
                  : <><Sparkles className="h-3 w-3" /> Suggest defaults</>}
              </LcsButton>
            </div>
          )}

          {/* Regenerate button for complete thesis */}
          {existingThesis?.status === "complete" && (
            <LcsButton variant="text-link" onClick={handleThesisAIPropose} disabled={thesisProposing}>
              {thesisProposing
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</>
                : <><RefreshCw className="h-3 w-3" /> Regenerate AI suggestions</>}
            </LcsButton>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Check size */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>
                Check size range
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={thesisForm.preferred_check_size_min}
                  onChange={thesisField("preferred_check_size_min")}
                  placeholder="Min e.g. $250k"
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                />
                <span className="text-xs shrink-0" style={{ color: "var(--lcs-ink-muted)" }}>to</span>
                <input
                  value={thesisForm.preferred_check_size_max}
                  onChange={thesisField("preferred_check_size_max")}
                  placeholder="Max e.g. $3M"
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                />
              </div>
            </div>

            {/* Investor type */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>Investor type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {["Capital only", "Capital + sector expertise", "Capital + network access"].map((val) => {
                  const active = thesisForm.preferred_investor_type === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setThesisForm((p) => ({ ...p, preferred_investor_type: val }))}
                      className="px-3 py-2.5 text-left text-sm transition-colors"
                      style={{
                        borderRadius: "var(--radius-lcs-control)",
                        border: `1px solid ${active ? "var(--lcs-accent)" : "var(--lcs-line)"}`,
                        background: active ? "var(--lcs-progress-wash)" : "var(--lcs-white)",
                        color: active ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
                      }}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board preference */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>Involvement preference</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: "Hands-on (board seat, regular check-ins)", short: "Hands-on" },
                  { val: "Collaborative (available but not directive)", short: "Collaborative" },
                  { val: "Hands-off (capital only, minimal involvement)", short: "Hands-off" },
                ].map(({ val, short }) => {
                  const active = thesisForm.board_preference === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setThesisForm((p) => ({ ...p, board_preference: val }))}
                      className="px-3 py-2.5 text-left text-sm transition-colors"
                      style={{
                        borderRadius: "var(--radius-lcs-control)",
                        border: `1px solid ${active ? "var(--lcs-accent)" : "var(--lcs-line)"}`,
                        background: active ? "var(--lcs-progress-wash)" : "var(--lcs-white)",
                        color: active ? "var(--lcs-ink)" : "var(--lcs-ink-muted)",
                      }}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sector expertise */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>Sector expertise wanted</label>
              <input
                value={thesisForm.sector_expertise_wanted}
                onChange={thesisField("sector_expertise_wanted")}
                placeholder="e.g. Defence, robotics, GCC enterprise sales"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
              />
            </div>

            {/* Geography */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>Geography preference</label>
              <input
                value={thesisForm.geography_preference}
                onChange={thesisField("geography_preference")}
                placeholder="e.g. GCC-based or UK/Europe, or 'No preference'"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
              />
            </div>

            {/* Exclusions */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>Exclusions / red lines</label>
              <textarea
                rows={2}
                value={thesisForm.exclusions}
                onChange={thesisField("exclusions")}
                placeholder="e.g. No investors with portfolio conflicts in defence or surveillance tech"
                className="w-full px-3 py-2 text-sm outline-none resize-none"
                style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
              />
            </div>

            {/* What good fit looks like */}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--lcs-ink-muted)" }}>What a great-fit investor looks like</label>
              <textarea
                rows={3}
                value={thesisForm.what_good_fit_looks_like}
                onChange={thesisField("what_good_fit_looks_like")}
                placeholder="In your own words — what would make you say yes immediately?"
                className="w-full px-3 py-2 text-sm outline-none resize-none"
                style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
              />
            </div>

            {/* Save actions */}
            <div className="flex items-center gap-3 pt-1">
              <LcsButton
                variant="primary"
                onClick={() => handleThesisSave("complete")}
                disabled={thesisSaving || !startup?.id}
                style={{ height: 32 }}
              >
                {thesisSaving ? <Loader2 className="h-4 w-4 animate-spin" />
                  : thesisSaved ? <CheckCircle2 className="h-4 w-4" />
                  : <Save className="h-4 w-4" />}
                {thesisSaved ? "Saved" : "Save investor criteria"}
              </LcsButton>
              <LcsButton
                variant="text-link"
                onClick={() => handleThesisSave("draft")}
                disabled={thesisSaving || !startup?.id}
              >
                Save as draft
              </LcsButton>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Privacy Tab ────────────────────────────────────────────────────

const PRIVACY_SECTIONS: {
  key: string;
  label: string;
  Icon: React.ElementType;
  fields: string;
  note?: string;
  locked?: boolean;
  defaultVal: SectionVisibility;
}[] = [
  {
    key: "identity",
    label: "Identity",
    Icon: Building2,
    fields: "Company name, tagline, sector, stage, website, team size, intro video",
    note: "Identity is always public. Investors need to find you.",
    locked: true,
    defaultVal: "public",
  },
  {
    key: "business_model",
    label: "Business Model",
    Icon: Briefcase,
    fields: "Revenue model, pricing, target customer, use of funds",
    defaultVal: "on_request",
  },
  {
    key: "market",
    label: "Market",
    Icon: Globe,
    fields: "Market size, TAM/SAM, competitive advantage, why now, differentiators",
    defaultVal: "on_request",
  },
  {
    key: "traction",
    label: "Traction",
    Icon: TrendingUp,
    fields: "Key metrics, growth rate, customer count, milestones",
    defaultVal: "on_request",
  },
  {
    key: "team",
    label: "Team",
    Icon: Users,
    fields: "Founder LinkedIn, co-founder details, advisors",
    defaultVal: "on_request",
  },
  {
    key: "financials",
    label: "Financials",
    Icon: DollarSign,
    fields: "Valuation, burn rate, runway, previous funding, current investors",
    note: "Recommended: keep financials in deal room only. This data is sensitive and should only be shared with investors you have approved.",
    defaultVal: "deal_room",
  },
];

const VIS_OPTIONS: { value: SectionVisibility; label: string; desc: string }[] = [
  { value: "public",     label: "Public",          desc: "Visible to anyone who finds your profile" },
  { value: "on_request", label: "On Request",       desc: "Visible after you approve an investor's request" },
  { value: "deal_room",  label: "Deal Room Only",   desc: "Visible only inside an active deal room" },
];

function PrivacyTab({
  startupId,
  sectionVisibility,
  onSave,
}: {
  startupId: string | null;
  sectionVisibility: Record<string, SectionVisibility>;
  onSave: (v: Record<string, SectionVisibility>) => Promise<void>;
}) {
  const [local, setLocal] = useState<Record<string, SectionVisibility>>(() => ({
    identity: "public",
    business_model: "on_request",
    market: "on_request",
    traction: "on_request",
    team: "on_request",
    financials: "deal_room",
    ...sectionVisibility,
  }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
        <div className="flex items-start gap-3 mb-6">
          <div className="grid h-9 w-9 place-items-center shrink-0 mt-0.5" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)" }}>
            <Shield className="h-5 w-5" style={{ color: "var(--lcs-accent)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Profile Privacy Controls</div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--lcs-ink-muted)" }}>
              Control what investors see at each stage of your fundraising relationship.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {PRIVACY_SECTIONS.map((section) => {
            const current = local[section.key] ?? section.defaultVal;
            return (
              <div
                key={section.key}
                className="border p-5"
                style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-surface)" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left: label + fields */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="grid h-8 w-8 place-items-center shrink-0 mt-0.5" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-white)" }}>
                      <section.Icon className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{section.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>{section.fields}</div>
                      {section.note && (
                        <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--lcs-attention)" }}>{section.note}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: toggle */}
                  <div className="shrink-0">
                    {section.locked ? (
                      <div
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                        style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-accent)", background: "var(--lcs-white)", color: "var(--lcs-accent)" }}
                      >
                        Public — always on
                      </div>
                    ) : (
                      <div className="flex overflow-hidden" style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)" }}>
                        {VIS_OPTIONS.map((opt, i) => (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.desc}
                            onClick={() => setLocal((prev) => ({ ...prev, [section.key]: opt.value }))}
                            className="px-3 py-1.5 text-xs font-medium transition-colors"
                            style={{
                              borderRight: i < VIS_OPTIONS.length - 1 ? "1px solid var(--lcs-line)" : "none",
                              background: current === opt.value ? "var(--lcs-accent)" : "transparent",
                              color: current === opt.value ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description of current selection */}
                {!section.locked && (
                  <div className="mt-3 text-xs" style={{ color: "var(--lcs-ink-muted)", opacity: 0.7 }}>
                    {VIS_OPTIONS.find((o) => o.value === current)?.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Changes take effect immediately on your public profile.</p>
          <LcsButton variant="primary" onClick={handleSave} disabled={saving || !startupId} style={{ height: 32 }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save privacy settings
          </LcsButton>
        </div>
      </div>
    </div>
  );
}

// ── Right column (shared between tabs) ────────────────────────────

function RightCol({ form, deckName, deckUploading, isExtracting, onDeckUpload, sectionVisibility, onVisibilityChange, showVisibility }: {
  form: FormState;
  deckName: string | null;
  deckUploading: boolean;
  isExtracting: boolean;
  onDeckUpload: (f: File) => void;
  sectionVisibility?: Record<string, SectionVisibility>;
  onVisibilityChange?: (section: string, visibility: SectionVisibility) => void;
  showVisibility?: boolean;
}) {
  return (
    <>
      <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Pitch deck</div>
          <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)", color: "var(--lcs-accent)" }}>AI</span>
        </div>
        {isExtracting ? (
          <div className="p-5 text-center" style={{ borderRadius: 0, border: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
            <Loader2 className="h-6 w-6 mx-auto animate-spin" style={{ color: "var(--lcs-accent)" }} />
            <div className="text-sm font-medium mt-3" style={{ color: "var(--lcs-ink)" }}>Analysing pitch deck…</div>
            <div className="text-xs mt-1" style={{ color: "var(--lcs-ink-muted)" }}>This takes 10–20 seconds</div>
          </div>
        ) : deckName ? (
          <div className="p-3" style={{ borderRadius: 0, border: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
            <div className="text-sm font-medium truncate" style={{ color: "var(--lcs-ink)" }}>{deckName}</div>
            <div className="text-xs mt-0.5 mb-2" style={{ color: "var(--lcs-ink-muted)" }}>Uploaded</div>
            <label className="text-xs hover:underline cursor-pointer" style={{ color: "var(--lcs-accent)" }}>
              Replace &amp; re-extract
              <input type="file" accept=".pdf,.pptx" className="sr-only" onChange={(e) => e.target.files?.[0] && onDeckUpload(e.target.files[0])} />
            </label>
          </div>
        ) : (
          <label className="p-5 text-center cursor-pointer transition-colors block" style={{ borderRadius: 0, border: "1px dashed var(--lcs-line)", background: "var(--lcs-white)" }}>
            <Upload className="h-5 w-5 mx-auto" style={{ color: "var(--lcs-ink-muted)" }} />
            <div className="text-sm font-medium mt-2" style={{ color: "var(--lcs-ink)" }}>Upload pitch deck</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>PDF or PPTX · Max 10MB</div>
            <div className="text-xs mt-2" style={{ color: "var(--lcs-accent)" }}>AI will extract and pre-fill your profile</div>
            <input type="file" accept=".pdf,.pptx" className="sr-only" onChange={(e) => e.target.files?.[0] && onDeckUpload(e.target.files[0])} />
          </label>
        )}
      </div>

      <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--lcs-ink)" }}>Overview</div>
        <div className="space-y-2.5">
          {([
            [Globe, "Stage", form.stage],
            [Users, "Team", form.team_size],
            [Building2, "Sector", form.sector],
          ] as [any, string, string][]).map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />
              <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{label}</span>
              <span className="ml-auto font-medium text-sm" style={{ color: "var(--lcs-ink)" }}>{val || "—"}</span>
            </div>
          ))}
          {form.growth_rate && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Growth</span>
              <span className="ml-auto font-medium text-sm" style={{ color: "var(--lcs-satisfied)" }}>{form.growth_rate}</span>
            </div>
          )}
          {form.customer_count && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Customers</span>
              <span className="ml-auto font-medium text-sm" style={{ color: "var(--lcs-ink)" }}>{form.customer_count}</span>
            </div>
          )}
        </div>
      </div>
      {showVisibility && sectionVisibility && onVisibilityChange && (
        <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: "var(--lcs-ink)" }}>Section visibility</div>
          <div className="space-y-4">
            {([
              ["problem_solution", "Problem & solution"],
              ["market", "Market"],
              ["traction", "Traction"],
              ["business_model", "Business model"],
              ["team", "Team"],
              ["competition", "Competition"],
              ["fundraising", "Fundraising"],
              ["media", "Media"],
            ] as [string, string][]).map(([section, label]) => (
              <div key={section}>
                <div className="text-xs mb-2" style={{ color: "var(--lcs-ink-muted)" }}>{label}</div>
                <VisibilitySelector
                  visibility={sectionVisibility[section] ?? "public"}
                  onChange={(value) => onVisibilityChange(section, value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ── Cap table section ─────────────────────────────────────────────

interface CapRow {
  id: string;
  startup_id: string;
  shareholder_name: string;
  shareholder_role: string | null;
  ownership_percent: number;
  signed_agreement_doc_id: string | null;
  agreement_status: string | null;
  linkedin_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
  social_verified: boolean;
  created_at: string;
  updated_at: string;
}

const CAP_ROLES = ["Founder", "Co-Founder", "Angel Investor", "VC", "Employee (ESOP)", "Advisor", "Other"];

function CapTableSection({ startupId }: { startupId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const blank = { shareholder_name: "", shareholder_role: "Founder", ownership_percent: "", linkedin_url: "", x_url: "", instagram_url: "" };
  const [form, setForm] = useState(blank);

  const { data: rows = [] } = useQuery<CapRow[]>({
    queryKey: ["cap-table", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase.from("startup_cap_table").select("*").eq("startup_id", startupId).order("created_at");
      return (data ?? []) as CapRow[];
    },
  });

  const totalOwnership = rows.reduce((s, r) => s + Number(r.ownership_percent), 0);
  const overLimit = totalOwnership > 100;

  const handleSave = async () => {
    if (!form.shareholder_name.trim() || !form.ownership_percent) return;
    const pct = parseFloat(String(form.ownership_percent));
    if (isNaN(pct) || pct <= 0) { toast.error("Enter a valid ownership percentage."); return; }
    setSaving(true);
    try {
      const payload = {
        startup_id: startupId,
        shareholder_name: form.shareholder_name.trim(),
        shareholder_role: form.shareholder_role || null,
        ownership_percent: pct,
        linkedin_url: form.linkedin_url.trim() || null,
        x_url: form.x_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await supabase.from("startup_cap_table").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("startup_cap_table").insert({ ...payload, social_verified: false });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["cap-table", startupId] });
      setForm(blank); setShowForm(false); setEditingId(null);
      toast.success("Shareholder saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("startup_cap_table").delete().eq("id", id);
    if (error) { console.error("[cap-table] delete failed:", error); toast.error("Could not delete shareholder."); return; }
    qc.invalidateQueries({ queryKey: ["cap-table", startupId] });
  };

  const startEdit = (row: CapRow) => {
    setEditingId(row.id);
    setForm({
      shareholder_name: row.shareholder_name,
      shareholder_role: row.shareholder_role ?? "Founder",
      ownership_percent: String(row.ownership_percent),
      linkedin_url: row.linkedin_url ?? "",
      x_url: row.x_url ?? "",
      instagram_url: row.instagram_url ?? "",
    });
    setShowForm(true);
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const inputCls = "mt-1 w-full px-3 py-2 text-sm outline-none";
  const inputStyle: React.CSSProperties = { borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" };

  return (
    <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Cap Table</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>Visible only to you — not shared with investors by default.</div>
        </div>
        <LcsButton variant="secondary" onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm(blank); }} style={{ height: 28 }}>
          <Plus className="h-3.5 w-3.5" /> Add shareholder
        </LcsButton>
      </div>

      {overLimit && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 text-xs" style={{ borderRadius: 0, background: "var(--lcs-attention-wash)", border: "1px solid var(--lcs-attention)", color: "var(--lcs-attention)" }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Total ownership is {totalOwnership.toFixed(1)}% — exceeds 100%. This may be intentional if data is incomplete.
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2 mb-4">
          {rows.map((row) => (
            <div key={row.id}
              style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", borderRadius: 0 }}
              className="px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "var(--lcs-ink)" }}>{row.shareholder_name}</span>
                    {row.shareholder_role && (
                      <span className="text-xs px-1.5 py-0.5" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)" }}>
                        {row.shareholder_role}
                      </span>
                    )}
                    <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink-muted)" }}>{row.ownership_percent}%</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {row.linkedin_url && <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lcs-ink-muted)" }} className="transition-colors"><Linkedin className="h-3.5 w-3.5" /></a>}
                    {row.x_url && <a href={row.x_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lcs-ink-muted)" }} className="transition-colors"><Twitter className="h-3.5 w-3.5" /></a>}
                    {row.instagram_url && <a href={row.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--lcs-ink-muted)" }} className="transition-colors"><Instagram className="h-3.5 w-3.5" /></a>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => startEdit(row)} className="p-1" style={{ color: "var(--lcs-ink-muted)" }}><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(row.id)} className="p-1" style={{ color: "var(--lcs-ink-muted)" }}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-1 text-xs text-right" style={{ color: "var(--lcs-ink-muted)" }}>
            Total documented: <span className="font-semibold" style={overLimit ? { color: "var(--lcs-attention)" } : { fontWeight: 500 }}>{totalOwnership.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {rows.length === 0 && !showForm && (
        <p className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>No shareholders</p>
      )}

      {showForm && (
        <div style={{ background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", borderRadius: 0 }} className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Shareholder name *</label>
              <input value={form.shareholder_name} onChange={f("shareholder_name")} placeholder="Jane Smith" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Role</label>
              <select value={form.shareholder_role} onChange={f("shareholder_role")} className={inputCls} style={inputStyle}>
                {CAP_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Ownership % *</label>
              <input type="number" min="0" max="100" step="0.01" value={form.ownership_percent} onChange={f("ownership_percent")} placeholder="25.0" className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div className="text-xs font-medium pt-1" style={{ color: "var(--lcs-ink-muted)" }}>Social links (at least one required for verification)</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs flex items-center gap-1" style={{ color: "var(--lcs-ink-muted)" }}><Linkedin className="h-3 w-3" /> LinkedIn URL</label>
              <input value={form.linkedin_url} onChange={f("linkedin_url")} placeholder="https://linkedin.com/in/..." className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs flex items-center gap-1" style={{ color: "var(--lcs-ink-muted)" }}><Twitter className="h-3 w-3" /> X (Twitter) URL</label>
              <input value={form.x_url} onChange={f("x_url")} placeholder="https://x.com/..." className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs flex items-center gap-1" style={{ color: "var(--lcs-ink-muted)" }}><Instagram className="h-3 w-3" /> Instagram URL</label>
              <input value={form.instagram_url} onChange={f("instagram_url")} placeholder="https://instagram.com/..." className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <LcsButton variant="text-link" onClick={() => { setShowForm(false); setEditingId(null); setForm(blank); }}>Cancel</LcsButton>
            <LcsButton variant="primary" onClick={handleSave} disabled={saving} style={{ height: 28 }}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingId ? "Update" : "Add shareholder"}
            </LcsButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable field components ──────────────────────────────────────

function FormSection({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border p-5" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{title}</div>
        {badge}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", onBlur, title, badge }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  title?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{label}</label>
        {badge}
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        title={title}
        className="w-full px-3 py-2 text-sm outline-none"
        style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, badge }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
  badge?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{label}</label>
        {badge}
      </div>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm outline-none resize-none"
        style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
      />
    </div>
  );
}

function VisibilitySelector({ visibility, onChange }: { visibility: SectionVisibility; onChange: (value: SectionVisibility) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
      <span className="font-semibold uppercase tracking-[0.24em]">Visibility</span>
      {[
        { value: "public" as SectionVisibility, label: "Public" },
        { value: "on_request" as SectionVisibility, label: "On request" },
        { value: "deal_room" as SectionVisibility, label: "Deal room only" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="px-3 py-1 text-[11px] transition"
          style={{
            borderRadius: "var(--radius-lcs-control)",
            border: `1px solid ${visibility === option.value ? "var(--lcs-accent)" : "var(--lcs-line)"}`,
            background: visibility === option.value ? "var(--lcs-progress-wash)" : "transparent",
            color: visibility === option.value ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ── Team Members Section ───────────────────────────────────────────

function TeamMembersSection({ startupId, readOnly = false }: { startupId: string; readOnly?: boolean }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const blankMember = {
    full_name: "", role: "", tag: "Employee", photo_url: "",
    key_person: false, bio: "",
    highlights: [] as string[],
    social_links: [] as Array<{ platform: string; url: string }>,
  };
  const [mf, setMf] = useState(blankMember);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team-members", startupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members").select("*").eq("startup_id", startupId).order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  // R13B — bio/highlights/social_links live in team_member_details now
  // (split from team_members so the disclosure gate is real — see
  // CLAUDE.md §33). The founder always reads their own via the owner RLS
  // policy, same as any other row on their startup.
  const memberIds = members.map((m) => m.id);
  const { data: details = [] } = useQuery<TeamMemberDetail[]>({
    queryKey: ["team-member-details", startupId, memberIds.join(",")],
    enabled: memberIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_member_details").select("*").in("team_member_id", memberIds);
      if (error) throw error;
      return (data ?? []) as TeamMemberDetail[];
    },
  });
  const detailByMemberId = new Map(details.map((d) => [d.team_member_id, d]));

  const openEdit = (m: TeamMember) => {
    const d = detailByMemberId.get(m.id);
    setMf({
      full_name: m.name ?? "", role: m.title ?? "", tag: m.tag ?? "Employee",
      photo_url: m.photo_url ?? "", key_person: m.key_person,
      bio: d?.bio ?? "", highlights: d?.highlights ?? [], social_links: d?.social_links ?? [],
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setMf(blankMember); };

  const setField = (k: "full_name" | "role" | "tag" | "bio") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setMf((f) => ({ ...f, [k]: e.target.value }));

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const slot = editingId ?? `new-${Date.now()}`;
      const path = `team/${startupId}/${slot}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setMf((f) => ({ ...f, photo_url: data.publicUrl }));
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const addHighlight = () => setMf((f) => ({ ...f, highlights: [...f.highlights, ""] }));
  const updateHighlight = (i: number, v: string) => setMf((f) => ({ ...f, highlights: f.highlights.map((h, idx) => (idx === i ? v : h)) }));
  const removeHighlight = (i: number) => setMf((f) => ({ ...f, highlights: f.highlights.filter((_, idx) => idx !== i) }));

  const addSocialLink = () => setMf((f) => ({ ...f, social_links: [...f.social_links, { platform: MEMBER_SOCIAL_PLATFORMS[0], url: "" }] }));
  const updateSocialLink = (i: number, patch: Partial<{ platform: string; url: string }>) =>
    setMf((f) => ({ ...f, social_links: f.social_links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  const removeSocialLink = (i: number) => setMf((f) => ({ ...f, social_links: f.social_links.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const publicPayload = {
        name: mf.full_name, title: mf.role,
        tag: mf.tag || null, photo_url: mf.photo_url || null,
        key_person: mf.key_person,
      };
      let memberId = editingId;
      if (editingId) {
        const { error } = await supabase.from("team_members").update(publicPayload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("team_members")
          .insert({ ...publicPayload, startup_id: startupId, display_order: members.length })
          .select("id").single();
        if (error) throw error;
        memberId = data.id;
      }

      const detailPayload = {
        team_member_id: memberId,
        bio: mf.bio || null,
        highlights: mf.highlights.filter((h) => h.trim()),
        social_links: mf.social_links.filter((l) => l.url.trim()),
        updated_at: new Date().toISOString(),
      };
      const { error: detailErr } = await supabase.from("team_member_details").upsert(detailPayload, { onConflict: "team_member_id" });
      if (detailErr) throw detailErr;

      toast.success(editingId ? "Team member updated" : "Team member added");
      queryClient.invalidateQueries({ queryKey: ["team-members", startupId] });
      queryClient.invalidateQueries({ queryKey: ["team-member-details", startupId] });
      closeForm();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("team_members").delete().eq("id", id);
      if (error) throw error;
      toast.success("Team member removed");
      queryClient.invalidateQueries({ queryKey: ["team-members", startupId] });
      queryClient.invalidateQueries({ queryKey: ["team-member-details", startupId] });
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Team members</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>
            Key people get a full profile — visible as a card in every deal room, full detail unlocks with mutual disclosure.
          </p>
        </div>
        {!readOnly && (
          <LcsButton variant="secondary" onClick={() => { closeForm(); setShowForm((v) => !v); }} style={{ height: 28 }}>
            <Plus className="h-3.5 w-3.5" /> Add member
          </LcsButton>
        )}
      </div>

      {!readOnly && showForm && (
        <div className="mb-5 border p-5" style={{ borderColor: "var(--lcs-accent)", borderRadius: 0, background: "var(--lcs-white)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{editingId ? "Edit team member" : "New team member"}</div>
            <button onClick={closeForm} style={{ color: "var(--lcs-ink-muted)" }}><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer">
                <div
                  className="grid h-14 w-14 place-items-center overflow-hidden text-sm font-semibold shrink-0"
                  style={{ borderRadius: "50%", background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)" }}
                >
                  {photoUploading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : mf.photo_url
                    ? <img src={mf.photo_url} alt="" className="h-full w-full object-cover" />
                    : (mf.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?")}
                </div>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
              </label>
              <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Click avatar to upload photo</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Full name</label>
                <input value={mf.full_name} onChange={setField("full_name")} placeholder="Jane Smith" className="mt-1 w-full px-3 py-2 text-sm outline-none" style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Role / title</label>
                <input value={mf.role} onChange={setField("role")} placeholder="CTO" className="mt-1 w-full px-3 py-2 text-sm outline-none" style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }} />
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Tag</label>
                <select value={mf.tag} onChange={setField("tag")} className="mt-1 w-full px-3 py-2 text-sm outline-none" style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                  {MEMBER_TAGS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mf.key_person}
                    onChange={(e) => setMf((f) => ({ ...f, key_person: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium" style={{ color: "var(--lcs-ink)" }}>Key person</span>
                </label>
              </div>
              <div className="sm:col-span-2 text-xs -mt-1" style={{ color: "var(--lcs-ink-muted)" }}>
                Key people appear as a card in every shared deal room from the moment both parties enter — name, photo,
                and title only, until the room's Information stage unlocks the full profile below.
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs flex items-center justify-between" style={{ color: "var(--lcs-ink-muted)" }}>
                  Bio <span style={{ color: "var(--lcs-ink-muted)", opacity: 0.6 }}>{mf.bio.length}/200</span>
                </label>
                <textarea
                  value={mf.bio}
                  onChange={(e) => { if (e.target.value.length <= 200) setField("bio")(e); }}
                  placeholder="Brief background and expertise"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 text-sm outline-none resize-none"
                  style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Highlights</label>
                <div className="mt-1 space-y-2">
                  {mf.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={h}
                        onChange={(e) => updateHighlight(i, e.target.value)}
                        placeholder="e.g. Led engineering at a $50M ARR startup"
                        className="flex-1 px-3 py-2 text-sm outline-none"
                        style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                      />
                      <button onClick={() => removeHighlight(i)} className="grid h-8 w-8 place-items-center" style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <LcsButton variant="secondary" onClick={addHighlight} style={{ height: 28 }}>
                    <Plus className="h-3 w-3" /> Add highlight
                  </LcsButton>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Social links</label>
                <div className="mt-1 space-y-2">
                  {mf.social_links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={l.platform}
                        onChange={(e) => updateSocialLink(i, { platform: e.target.value })}
                        className="w-36 shrink-0 px-2 py-2 text-xs outline-none"
                        style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                      >
                        {MEMBER_SOCIAL_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <input
                        value={l.url}
                        onChange={(e) => updateSocialLink(i, { url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 text-sm outline-none"
                        style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
                      />
                      <button onClick={() => removeSocialLink(i)} className="grid h-8 w-8 place-items-center" style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <LcsButton variant="secondary" onClick={addSocialLink} style={{ height: 28 }}>
                    <Plus className="h-3 w-3" /> Add link
                  </LcsButton>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <LcsButton variant="secondary" onClick={closeForm} style={{ height: 32 }}>Cancel</LcsButton>
              <LcsButton variant="primary" onClick={handleSubmit} disabled={submitting} style={{ height: 32 }}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editingId ? "Save changes" : "Add member"}
              </LcsButton>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <LcsEmptyState title="No team members" text="People you add to your team appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((m) => {
            const inits = (m.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
            const d = detailByMemberId.get(m.id);
            return (
              <div key={m.id} className="border p-4" style={{ borderColor: "var(--lcs-line)", borderRadius: 0, background: "var(--lcs-white)" }}>
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center overflow-hidden text-xs font-semibold shrink-0"
                    style={{ borderRadius: "50%", background: "var(--lcs-surface)", border: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)" }}
                  >
                    {m.photo_url ? <img src={m.photo_url} alt={m.name ?? ""} className="h-full w-full object-cover" /> : inits}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-semibold truncate" style={{ color: "var(--lcs-ink)" }}>{m.name}</div>
                      {m.key_person && (
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 shrink-0"
                          style={{ borderRadius: "var(--radius-lcs-control)", border: "1px solid var(--lcs-accent)", color: "var(--lcs-accent)" }}
                        >
                          KEY
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--lcs-ink-muted)" }}>{m.title}</div>
                    {m.tag && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 font-medium mt-1 inline-block"
                        style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}
                      >
                        {m.tag}
                      </span>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(m)} className="grid h-7 w-7 place-items-center" style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="grid h-7 w-7 place-items-center disabled:opacity-40"
                        style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}
                      >
                        {deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
                {d?.bio && <div className="mt-2 text-xs line-clamp-2" style={{ color: "var(--lcs-ink-muted)" }}>{d.bio}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

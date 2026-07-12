import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Globe, Users, Upload, Pencil, Trash2, Plus, X, Loader2, Check,
  Eye, Edit3, Download, Zap, AlignLeft, AlertTriangle, Copy, Sparkles, BarChart3,
  Shield, Briefcase, TrendingUp, DollarSign, CheckCircle2, XCircle,
  Clock, Linkedin, Twitter, Instagram, Target, Save, RefreshCw,
} from "lucide-react";
import type { StartupClaim, ClaimStatus } from "@/lib/claims-fn";
import type { FounderThesis } from "@/lib/founder-thesis-fn";
import { AttachProofModal } from "@/components/app/AttachProofModal";
import { BadgesSection } from "@/components/app/BadgesSection";
import { OperationalVerificationSection } from "./app.profile.operational";
import { PageGuide } from "@/components/app/PageGuide";
import { FieldVerificationBadge, prewarmClassificationCache } from "@/components/app/FieldVerificationBadge";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { getFounderProfileCompleteness } from "@/lib/profileCompleteness";

export const Route = createFileRoute("/app/profile")({
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
  linkedin_url: string | null; bio: string | null; photo_url: string | null;
  tag: string | null; display_order: number;
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

function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { progress, markStep, setCurrentStep } = useOnboardingProgress();

  const [mode, setMode] = useState<"edit" | "view">("edit");
  const [tab, setTab] = useState<"quick" | "full" | "privacy" | "preview" | "analytics">("quick");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [profilePublishing, setProfilePublishing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
  const [runningRegistryCheck, setRunningRegistryCheck] = useState(false);
  // Attach-proof modal state
  const [attachingClaim, setAttachingClaim] = useState<{ type: string; label: string; value: string } | null>(null);
  const [attachingFile, setAttachingFile] = useState<File | null>(null);
  const [attachingRunning, setAttachingRunning] = useState(false);

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

  // Prewarm classification cache once per mount
  useEffect(() => { prewarmClassificationCache(); }, []);

  // ── Founder Tier 1 verification result ───────────────────────────────────
  // (Was previously querying a nonexistent verification_tier column keyed by a
  //  nonexistent user_id column — the query 400'd silently and tier state never
  //  loaded on this page.)
  const { data: founderVerification } = useQuery({
    queryKey: ["founder-verification", startup?.id],
    enabled: !!startup?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_verifications")
        .select("tier1_passed, current_tier")
        .eq("startup_id", startup!.id)
        .maybeSingle();
      return data;
    },
  });

  const founderTier1Passed = founderVerification?.tier1_passed === true;

  // ── Claims (quantitative field verification) ──────────────────────────────
  const { data: claims = [], refetch: refetchClaims } = useQuery<StartupClaim[]>({
    queryKey: ["startup-claims", startup?.id],
    enabled: !!startup?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_claims")
        .select("*")
        .eq("startup_id", startup!.id);
      return (data ?? []) as StartupClaim[];
    },
  });

  const claimByType = (type: string): StartupClaim | undefined =>
    claims.find((c) => c.claim_type === type);

  // ── Founder thesis ────────────────────────────────────────────────────────
  const { data: existingThesis } = useQuery<FounderThesis | null>({
    queryKey: ["founder-thesis", startup?.id],
    enabled: !!startup?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { getFounderThesis } = await import("@/lib/founder-thesis-fn");
      return getFounderThesis({ data: { startupId: startup!.id } });
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
      const result = await upsertFounderThesis({ data: { startupId: startup.id, ...thesisForm, status } });
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

  const { data: registryCheck, refetch: refetchRegistryCheck } = useQuery({
    queryKey: ["registry-check", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_registry_checks")
        .select("*")
        .eq("startup_id", startup!.id)
        .maybeSingle();
      return data;
    },
  });

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

  useEffect(() => {
    if (startup) {
      setForm(fromStartup(startup));
      setLogoUrl(startup.logo_url ?? null);
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
      // Going live also makes the startup discoverable in the directory —
      // without this, published profiles never appeared anywhere (the
      // settings toggle remains available as an opt-out).
      const { error } = await supabase
        .from("startups")
        .update({ profile_published: true, profile_slug: profileSlug, publicly_discoverable: true })
        .eq("id", startup.id);
      if (error) throw error;
      toast.success("Profile is live on Hockystick.");
      // Durable confirmation — the founder should know they're now visible
      // in the directory, with a link to their own public profile.
      import("@/lib/notify").then(({ notifyUser }) =>
        notifyUser({
          userId: user!.id,
          kind: "system",
          title: "Your profile is live in the directory",
          body: "Investors can now find you and request access. Share your public profile link anywhere.",
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

  const runRegistryCheck = async () => {
    if (!startup?.id) return;
    setRunningRegistryCheck(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-company-registry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ startup_id: startup.id }),
        }
      );
      await refetchRegistryCheck();
    } catch (e: any) {
      toast.error("Registry check failed: " + (e.message ?? "Unknown error"));
    } finally {
      setRunningRegistryCheck(false);
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

        // Upsert claims for every quantitative field that has a value — fire-and-forget
        const savedStartupId = existing?.id ?? newStartupId;
        if (savedStartupId) {
          const { upsertClaim } = await import("@/lib/claims-fn");
          const quantFields: Array<{ type: string; label: string; value: string | null }> = [
            { type: "revenue",        label: "Revenue / ARR",   value: form.revenue || null },
            { type: "growth_rate",    label: "Growth Rate",     value: form.growth_rate || null },
            { type: "customer_count", label: "Customers",       value: form.customer_count || null },
            { type: "key_metric",     label: "Key Metric",      value: form.key_metric || null },
            { type: "traction",       label: "Traction",        value: form.traction || null },
          ];
          for (const qf of quantFields) {
            if (qf.value) {
              upsertClaim({ data: { startup_id: savedStartupId, claim_type: qf.type, claim_label: qf.label, claim_value: qf.value } })
                .catch(() => null);
            }
          }
          // Refresh claims after a brief delay to let upserts settle
          setTimeout(() => refetchClaims(), 1200);
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
        <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-96 rounded bg-muted/60 animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
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

        <div className="p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6 no-print">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Company Profile</h1>
              <p className="text-sm text-muted-foreground mt-0.5">How investors see your startup.</p>
              {/* Part 3 — claims + cap table summary */}
              {claims.length > 0 && (() => {
                const confirmed = claims.filter((c) => c.proof_status === "ai_confirmed").length;
                const mismatched = claims.filter((c) => c.proof_status === "ai_mismatch").length;
                return (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                      style={mismatched > 0
                        ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }
                        : confirmed === claims.length
                        ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }
                        : { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}
                    >
                      {mismatched > 0 ? <XCircle className="h-3 w-3" /> : confirmed === claims.length ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {confirmed}/{claims.length} claims verified
                      {mismatched > 0 && ` · ${mismatched} mismatch${mismatched > 1 ? "es" : ""}`}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Download PDF
              </button>
              <button
                onClick={() => setMode("edit")}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
              >
                <Edit3 className="h-4 w-4" /> Edit profile
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden print-card">
            <div className="h-28 bg-gradient-mesh relative">
              <div className="absolute inset-0 noise opacity-40" />
            </div>
            <div className="px-6 pb-6 -mt-10">
              <div className="flex items-end gap-4">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground text-2xl font-semibold border-4 border-background shadow-elev overflow-hidden shrink-0">
                  {logoUrl
                    ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                    : <span>{initials}</span>}
                </div>
                <div className="pb-1">
                  <h2 className="text-2xl font-bold">{form.company_name || "Unnamed Company"}</h2>
                  {filled(form.tagline) && <p className="text-sm text-muted-foreground mt-0.5">{form.tagline}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {filled(form.stage) && (
                      <span className="rounded-full bg-brand/10 text-brand text-xs px-2.5 py-0.5 font-medium">{form.stage}</span>
                    )}
                    {filled(form.sector) && (
                      <span className="rounded-full bg-violet/10 text-violet text-xs px-2.5 py-0.5 font-medium">{form.sector}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {filled(form.description) && (
            <div className="mt-4 rounded-xl border border-border/60 bg-card p-5 shadow-card print-card">
              <div className="text-sm font-semibold mb-2">About</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{form.description}</p>
            </div>
          )}

          {pairs.length > 0 && (
            <div className="mt-4 rounded-xl border border-border/60 bg-card p-5 shadow-card print-card">
              <div className="text-sm font-semibold mb-3">Key details</div>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                {pairs.map(([label, val]) => {
                  // Map display label to claim_type
                  const claimTypeMap: Record<string, string> = {
                    "Revenue / ARR": "revenue",
                    "Growth rate": "growth_rate",
                    "Customers": "customer_count",
                    "Key metric": "key_metric",
                  };
                  const claimType = claimTypeMap[label];
                  const claim = claimType ? claimByType(claimType) : undefined;
                  const cfg = claim ? STATUS_CONFIG[claim.proof_status as ClaimStatus] : undefined;
                  return (
                    <div key={label} className="flex items-center justify-between border-b border-border/40 pb-2 gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                      <div className="flex items-center gap-2 min-w-0">
                        {cfg && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full text-[10px] font-medium px-1.5 py-0.5 shrink-0"
                            style={cfg.style}
                            title={claim?.proof_status}
                          >
                            {cfg.icon}
                          </span>
                        )}
                        <span className="text-sm font-medium truncate">{val}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(filled(form.problem) || filled(form.solution)) && (
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {filled(form.problem) && (
                <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card print-card">
                  <div className="text-sm font-semibold mb-2">Problem</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{form.problem}</p>
                </div>
              )}
              {filled(form.solution) && (
                <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card print-card">
                  <div className="text-sm font-semibold mb-2">Solution</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{form.solution}</p>
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
                <div key={label as string} className="rounded-xl border border-border/60 bg-card p-5 shadow-card print-card">
                  <div className="text-sm font-semibold mb-2">{label}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{val}</p>
                </div>
              ))}
            </div>
          )}

          {(filled(form.founder_name) || filled(form.founder_email)) && (
            <div className="mt-4 rounded-xl border border-border/60 bg-card p-5 shadow-card print-card">
              <div className="text-sm font-semibold mb-3">Contact</div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ["Founder", form.founder_name],
                  ["Email", form.founder_email],
                  ["LinkedIn", form.founder_linkedin],
                  ["Co-founder", form.cofounder_name],
                  ["Co-founder LinkedIn", form.cofounder_linkedin],
                ].filter(([, v]) => filled(v)).map(([label, val]) => (
                  <div key={label as string}>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-sm font-medium mt-0.5">{val}</div>
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
    <button
      onClick={handleSave}
      disabled={saving}
      className={cn(
        "inline-flex items-center gap-2 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60",
        full && "w-full justify-center",
      )}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      Save changes
    </button>
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{startup ? "Edit profile" : "Create your profile"}</h1>
          <div className="text-sm text-muted-foreground">
            {startup ? "Edit your startup details, team, and pitch." : "Set up your startup profile so investors know who you are."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PageGuide pageId="profile" />
          {startup && (
            <button
              onClick={() => setMode("view")}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent"
            >
              <Eye className="h-4 w-4" /> View profile
            </button>
          )}
          <SaveBtn />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Profile completion</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${completenessScore < 41 ? "bg-red-500" : completenessScore < 80 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(completenessScore, 100)}%` }} />
              </div>
              <div className="text-sm font-semibold">{completenessScore}%</div>
            </div>
          </div>
          <button
            data-tour="publish-button"
            onClick={handleGoLive}
            disabled={!profileReady || profilePublishing}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${profileReady ? "bg-[#7C3AED] text-white hover:bg-[#6d28d9]" : "bg-white/5 text-muted-foreground cursor-not-allowed"}`}
          >
            Go live
          </button>
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
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <span className="font-semibold">Your profile is not yet visible in the directory.</span> Complete at least 80% to go live.
          </div>
        )}
        <div className="mt-3">
          <a
            href="/trust"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs transition-colors"
            style={{ color: "rgba(124,58,237,0.65)" }}
          >
            See how verification works →
          </a>
        </div>
      </div>

      {startup && !form.company_name.trim() && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">Company name is missing.</span>{" "}
            Investors currently see "Unnamed" in their deal flow. Add your startup name below to fix this.
          </span>
        </div>
      )}

      {/* Hero card */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
        <div className="h-32 bg-gradient-mesh relative">
          <div className="absolute inset-0 noise opacity-40" />
        </div>
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            <label className="relative cursor-pointer group shrink-0">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-brand text-brand-foreground text-2xl font-semibold border-4 border-background shadow-elev overflow-hidden">
                {logoUploading
                  ? <Loader2 className="h-6 w-6 animate-spin text-brand-foreground" />
                  : logoUrl
                  ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" />
                  : <span>{initials}</span>}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/40 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            </label>
            <div className="pb-1">
              <div className="text-xl font-semibold">{form.company_name || "Your Company"}</div>
              <div className="text-sm text-muted-foreground">{form.tagline || form.description || "Add a tagline below"}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Your profile link:</span>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium text-foreground">hockystick.app/p/{profileSlug || "your-slug"}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (profileSlug) {
                      navigator.clipboard.writeText(`https://hockystick.app/p/${profileSlug}`);
                      toast.success("Profile URL copied");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-white/5 px-2 py-1 text-xs text-muted-foreground hover:bg-white/10 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 6: Quick setup / Full details tabs */}
      <div className="mt-5 flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTab("quick")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            tab === "quick" ? "bg-background text-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Zap className="h-3.5 w-3.5" /> Quick setup
        </button>
        <button
          onClick={() => setTab("full")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            tab === "full" ? "bg-background text-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AlignLeft className="h-3.5 w-3.5" /> Full details
        </button>
        <button
          onClick={() => setTab("privacy")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            tab === "privacy" ? "bg-background text-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Shield className="h-3.5 w-3.5" /> Privacy
        </button>
        <button
          onClick={() => setTab("preview")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            tab === "preview" ? "bg-background text-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Eye className="h-3.5 w-3.5" /> Profile preview
        </button>
        <button
          onClick={() => setTab("analytics")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
            tab === "analytics" ? "bg-background text-foreground font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Analytics{totalViews > 0 ? ` (${totalViews})` : ""}
        </button>
      </div>

      {extractionError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{extractionError}</span>
          <button onClick={() => setExtractionError(null)} className="ml-auto text-destructive/60 hover:text-destructive"><X className="h-4 w-4" /></button>
        </div>
      )}

      {showExtractionPreview && extractionResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowExtractionPreview(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-border/60 shrink-0">
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm"><Sparkles className="h-4 w-4 text-brand" /> AI extracted these fields</div>
                <p className="text-xs text-muted-foreground mt-1">Select which fields to apply to your profile.</p>
              </div>
              <button onClick={() => setShowExtractionPreview(false)} className="text-muted-foreground hover:text-foreground ml-4"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-2">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const val = extractionResult[key];
                if (val === null || val === undefined) return null;
                const checked = selectedFields.has(key);
                return (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" checked={checked} onChange={(e) => setSelectedFields((prev) => { const next = new Set(prev); e.target.checked ? next.add(key) : next.delete(key); return next; })}
                      className="mt-0.5 accent-purple-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-muted-foreground">{label}: </span>
                      <span className="text-xs text-foreground break-words">{safeStringify(val)}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="px-5 py-4 border-t border-border/60 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-muted-foreground">{selectedFields.size} field{selectedFields.size !== 1 ? "s" : ""} selected</span>
              <div className="flex gap-2">
                <button onClick={() => setShowExtractionPreview(false)} className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
                <button onClick={applyExtractedFields} disabled={selectedFields.size === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50">
                  Apply selected fields →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "quick" ? (
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
            <FormSection
              title="Company identity"
              badge={<FieldVerificationBadge profileType="startup" fieldName="legal_entity_name" tier1Passed={founderTier1Passed} compact />}
            >
              <Field label="Company name" value={form.company_name} onChange={field("company_name")} placeholder="Atlas Robotics" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Legal entity name</label>
                  <FieldVerificationBadge profileType="startup" fieldName="legal_entity_name" tier1Passed={founderTier1Passed} />
                </div>
                <input
                  type="text"
                  value={form.legal_entity_name ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, legal_entity_name: e.target.value }))}
                  placeholder="Full registered legal name (if different from trading name)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-[#7C3AED]/50 outline-none transition-colors"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Company registration number</label>
                  <FieldVerificationBadge profileType="startup" fieldName="registration_number" tier1Passed={founderTier1Passed} />
                </div>
                <input
                  type="text"
                  value={form.registration_number ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, registration_number: e.target.value }))}
                  placeholder="e.g. 0001234 (Companies House), CL1234 (DIFC)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:border-[#7C3AED]/50 outline-none transition-colors"
                />
                <p className="text-xs text-white/25 mt-1">Optional but improves registry verification accuracy</p>
              </div>

              {/* Registry verification section */}
              {registryCheck ? (
                <div className="p-4 rounded-xl border mt-2" style={{
                  background: registryCheck.verified ? "rgba(16,185,129,0.07)" : "rgba(255,255,255,0.03)",
                  border: registryCheck.verified ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Company registry check</p>
                    <span className="text-xs font-bold" style={{ color: registryCheck.verified ? "#10B981" : "rgba(255,255,255,0.3)" }}>
                      {registryCheck.verified ? `✓ ${registryCheck.confidence_score}% confidence` : "○ Not verified"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{registryCheck.verification_summary}</p>

                  {/* Structured registry sources (OpenCorporates / Companies House) */}
                  {(registryCheck.sources as Array<{ registry: string; url: string; confidence?: string }> | null)
                    ?.filter((s) => !s.registry?.includes("DIFC"))
                    .length ? (
                    <div className="mt-2 space-y-1">
                      {(registryCheck.sources as Array<{ registry: string; url: string }>)
                        .filter((s) => !s.registry?.includes("DIFC"))
                        .map((source, i) => (
                          <a key={i} href={source.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs block hover:underline" style={{ color: "#7C3AED" }}>
                            ↗ {source.registry}
                          </a>
                        ))}
                    </div>
                  ) : null}

                  {/* DIFC result — visually secondary, clearly labeled as best-effort */}
                  {registryCheck.difc_check_method === "ai_web_search" && (
                    <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>DIFC (UAE): best-effort web search</span>
                        <span className="text-[11px]" style={{ color: registryCheck.difc_found ? "#10B981" : "rgba(255,255,255,0.25)" }}>
                          {registryCheck.difc_found ? "✓ Match found" : "○ No match"}
                          {registryCheck.difc_confidence ? ` · ${registryCheck.difc_confidence} confidence` : ""}
                        </span>
                      </div>
                      <p className="text-[11px] leading-snug" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Not a direct registry API — AI-assisted search of the DIFC public register page.
                        {registryCheck.difc_source_url && (
                          <>
                            {" "}
                            <a href={registryCheck.difc_source_url} target="_blank" rel="noopener noreferrer"
                              className="hover:underline" style={{ color: "#7C3AED" }}>
                              Verify on difc.ae ↗
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  )}

                  <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                    Checked {new Date(registryCheck.checked_at).toLocaleDateString()} · Source-cited, not manually confirmed
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border mt-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs text-white/30">
                    Registry check runs automatically when your profile is published. Checks OpenCorporates (140+ jurisdictions), UK Companies House, and DIFC (best-effort web search).
                  </p>
                </div>
              )}
              <button
                onClick={runRegistryCheck}
                disabled={runningRegistryCheck || !startup?.id}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
              >
                {runningRegistryCheck ? "⟳ Checking registries..." : "↻ Run registry check"}
              </button>

              <Field label="Tagline" value={form.tagline} onChange={field("tagline")} placeholder="One line that explains your company" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Website" value={form.website} onChange={field("website")} placeholder="https://example.com"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="website" tier1Passed={founderTier1Passed} compact />} />
                <Field label="Founded year" value={form.founded_year} onChange={field("founded_year")} placeholder="2022" />
                <Field label="Country / HQ" value={form.country} onChange={field("country")} placeholder="San Francisco, USA" />
                <Field label="Team size" value={form.team_size} onChange={field("team_size")} placeholder="e.g. 12" title="Number of full-time team members"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="team_size" claimStatus={claimByType("team_size")?.proof_status}
                    onAttachProof={startup?.id ? () => setAttachingClaim({ type: "team_size", label: "Team Size", value: form.team_size }) : undefined} compact />} />
                <Field label="Sector" value={form.sector} onChange={field("sector")} placeholder="B2B SaaS, Fintech, AI..." />
                <div>
                  <label className="text-xs text-muted-foreground">Stage</label>
                  <select value={form.stage} onChange={field("stage")} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50">
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
                <Field label="Previous funding raised" value={form.previous_funding} onChange={field("previous_funding")} placeholder="$500K pre-seed"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="previous_funding" claimStatus={claimByType("previous_funding")?.proof_status}
                    onAttachProof={startup?.id ? () => setAttachingClaim({ type: "previous_funding", label: "Previous Funding", value: form.previous_funding }) : undefined} compact />} />
                <Field label="Current investors" value={form.current_investors} onChange={field("current_investors")} placeholder="Y Combinator, Sequoia"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="current_investors" compact />} />
              </div>
              <TextArea label="Use of funds" value={form.use_of_funds} onChange={field("use_of_funds")} placeholder="40% engineering, 30% sales, 30% ops" rows={2} />
            </FormSection>

            <FormSection
              title="Traction & metrics"
              badge={<FieldVerificationBadge profileType="startup" fieldName="revenue" claimStatus={claimByType("revenue")?.proof_status} compact />}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Revenue */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Revenue / ARR</label>
                    <ClaimBadge claim={claimByType("revenue")} onAttach={startup?.id ? () => setAttachingClaim({ type: "revenue", label: "Revenue / ARR", value: form.revenue }) : undefined} />
                  </div>
                  <input value={form.revenue} onChange={field("revenue")} onBlur={(e) => setForm((f) => ({ ...f, revenue: formatNumber(e.target.value) }))} placeholder="e.g. 500,000" className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
                </div>
                {/* Growth rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Growth rate</label>
                    <ClaimBadge claim={claimByType("growth_rate")} onAttach={startup?.id ? () => setAttachingClaim({ type: "growth_rate", label: "Growth Rate", value: form.growth_rate }) : undefined} />
                  </div>
                  <input value={form.growth_rate} onChange={field("growth_rate")} placeholder="+15% MoM" className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
                </div>
                {/* Customer count */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Customer count</label>
                    <ClaimBadge claim={claimByType("customer_count")} onAttach={startup?.id ? () => setAttachingClaim({ type: "customer_count", label: "Customers", value: form.customer_count }) : undefined} />
                  </div>
                  <input value={form.customer_count} onChange={field("customer_count")} placeholder="500 paying customers" className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
                </div>
                {/* Key metric */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Key metric</label>
                    <ClaimBadge claim={claimByType("key_metric")} onAttach={startup?.id ? () => setAttachingClaim({ type: "key_metric", label: "Key Metric", value: form.key_metric }) : undefined} />
                  </div>
                  <input value={form.key_metric} onChange={field("key_metric")} placeholder="Your most important metric" className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
                </div>
              </div>
              {/* Traction textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground">Traction highlights</label>
                  <ClaimBadge claim={claimByType("traction")} onAttach={startup?.id ? () => setAttachingClaim({ type: "traction", label: "Traction", value: form.traction }) : undefined} />
                </div>
                <textarea value={form.traction} onChange={field("traction")} placeholder="Key traction highlights..." rows={3} className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" />
              </div>
            </FormSection>

            {/* Cap Table — founder-only, not visible to investors by default */}
            {startup?.id && <CapTableSection startupId={startup.id} />}

            <FormSection
              title="Vision & strategy"
              badge={<FieldVerificationBadge profileType="startup" fieldName="problem" compact />}
            >
              <TextArea label="Problem" value={form.problem} onChange={field("problem")} placeholder="What problem are you solving?" rows={4}
                badge={<FieldVerificationBadge profileType="startup" fieldName="problem" />} />
              <TextArea label="Solution" value={form.solution} onChange={field("solution")} placeholder="How does your product solve it?" rows={4}
                badge={<FieldVerificationBadge profileType="startup" fieldName="solution" />} />
              <TextArea label="Business model" value={form.business_model} onChange={field("business_model")} placeholder="How do you make money?" rows={3}
                badge={<FieldVerificationBadge profileType="startup" fieldName="business_model" />} />
              <Field label="Market size" value={form.market_size} onChange={field("market_size") as any} placeholder="$50B TAM, $5B SAM…" />
              <TextArea label="Why us" value={form.why_us} onChange={field("why_us")} placeholder="Why is your team uniquely positioned?" rows={3}
                badge={<FieldVerificationBadge profileType="startup" fieldName="why_us" />} />
              <TextArea label="Why now?" value={form.why_now} onChange={field("why_now")} placeholder="What tailwind or market shift makes this the right time?" rows={2}
                badge={<FieldVerificationBadge profileType="startup" fieldName="why_now" />} />
            </FormSection>

            <FormSection title="Market & opportunity">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="TAM" value={form.tam} onChange={field("tam")} placeholder="Total addressable market" />
                <Field label="SAM" value={form.sam} onChange={field("sam")} placeholder="Serviceable addressable market" />
                <Field label="Target customer" value={form.target_customer} onChange={field("target_customer")} placeholder="Who will buy from you?"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="target_customer" compact />} />
              </div>
            </FormSection>

            <FormSection title="Business model details">
              <TextArea label="Revenue model" value={form.revenue_model} onChange={field("revenue_model")} placeholder="How do you generate revenue?" rows={3} />
              <Field label="Pricing" value={form.pricing} onChange={field("pricing")} placeholder="Pricing model or range" />
              <TextArea label="Unit economics" value={form.unit_economics} onChange={field("unit_economics")} placeholder="CAC, LTV or contribution margin" rows={3}
                badge={<FieldVerificationBadge profileType="startup" fieldName="unit_economics" />} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Burn rate" value={form.burn_rate} onChange={field("burn_rate")} placeholder="$ / month"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="burn_rate" claimStatus={claimByType("burn_rate")?.proof_status}
                    onAttachProof={startup?.id ? () => setAttachingClaim({ type: "burn_rate", label: "Burn Rate", value: form.burn_rate }) : undefined} compact />} />
                <Field label="Runway (months)" value={form.runway_months} onChange={field("runway_months")} placeholder="e.g. 12"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="runway_months" claimStatus={claimByType("runway_months")?.proof_status}
                    onAttachProof={startup?.id ? () => setAttachingClaim({ type: "runway_months", label: "Runway (months)", value: form.runway_months }) : undefined} compact />} />
              </div>
            </FormSection>

            <FormSection
              title="Cap & relationships"
              badge={<FieldVerificationBadge profileType="startup" fieldName="advisors" compact />}
            >
              <TextArea label="Moat" value={form.moat} onChange={field("moat")} placeholder="What protects your business?" rows={3}
                badge={<FieldVerificationBadge profileType="startup" fieldName="moat" />} />
              <TextArea label="Competitors" value={form.competitors} onChange={field("competitors")} placeholder="Key competitors and alternatives" rows={3}
                badge={<FieldVerificationBadge profileType="startup" fieldName="competitors" />} />
              <TextArea label="Milestones" value={form.milestones} onChange={field("milestones")} placeholder="Key traction, launches, and milestones" rows={3}
                badge={<FieldVerificationBadge profileType="startup" fieldName="milestones" />} />
              <TextArea label="Advisors" value={form.advisors} onChange={field("advisors")} placeholder="Notable advisors" rows={2}
                badge={<FieldVerificationBadge profileType="startup" fieldName="advisors" />} />
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
                      className="w-32 shrink-0 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                    />
                    <input
                      value={link.url}
                      onChange={(e) => setSocialLinks((prev) => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                      placeholder="https://..."
                      className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                    />
                    <button
                      type="button"
                      onClick={() => setSocialLinks((prev) => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-foreground px-2 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSocialLinks((prev) => [...prev, { platform: "", url: "" }])}
                  className="text-xs text-brand hover:text-brand/80 transition-colors"
                >
                  + Add social link
                </button>
              </div>
            </FormSection>

            <FormSection title="Contact">
              {/* Founder avatar upload */}
              <div className="mb-4 flex items-center gap-4">
                <label className="relative cursor-pointer group shrink-0">
                  <div className="h-[72px] w-[72px] rounded-full overflow-hidden bg-gradient-brand flex items-center justify-center text-brand-foreground text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>
                    {avatarUploading
                      ? <Loader2 className="h-5 w-5 animate-spin" />
                      : avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      : <span>{(form.founder_name || user?.name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                </label>
                <div>
                  <div className="text-sm font-medium">Profile photo</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Max 2MB. JPG, PNG or WebP.</div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Founder name" value={form.founder_name} onChange={field("founder_name")} placeholder="Jane Smith" />
                <Field label="Founder email" value={form.founder_email} onChange={field("founder_email")} placeholder="jane@startup.com" />
                <Field label="Founder LinkedIn" value={form.founder_linkedin} onChange={field("founder_linkedin")} placeholder="linkedin.com/in/janesmith"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="founder_linkedin" tier1Passed={founderTier1Passed} compact />} />
                <Field label="Co-founder name" value={form.cofounder_name} onChange={field("cofounder_name")} placeholder="Alex Lee" />
                <Field label="Co-founder LinkedIn" value={form.cofounder_linkedin} onChange={field("cofounder_linkedin")} placeholder="linkedin.com/in/alexlee"
                  badge={<FieldVerificationBadge profileType="startup" fieldName="cofounder_linkedin" compact />} />
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
            <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Publish your profile first to start tracking views</p>
              <p className="text-xs text-muted-foreground mb-3">Go to Full Details, fill at least 80% of fields, then click "Go live"</p>
              <button onClick={() => setTab("full")} className="text-xs text-brand hover:underline">Go to Full Details →</button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Profile Analytics</p>
                <p className="text-xs text-muted-foreground mb-4">Tracking views of hockystick.app/p/{startup.profile_slug}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total views", value: String(totalViews) },
                    { label: "Unique visitors", value: String(uniqueViewers) },
                    { label: "Avg duration", value: avgDuration > 0 ? `${avgDuration}s` : "0s" },
                    { label: "Last 7 days", value: String(last7Days) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 border border-white/8 rounded-xl p-5">
                      <p className="text-3xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>{value}</p>
                      <p className="text-xs text-white/40 uppercase tracking-wider mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {totalViews === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/20 text-4xl mb-3">◎</p>
                  <p className="text-white/50 text-sm">No views yet</p>
                  <p className="text-white/30 text-xs mt-1">Share your profile link to start tracking views</p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Traffic sources */}
                  <div className="rounded-xl border border-border/60 bg-card p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">Traffic sources</p>
                    <div className="space-y-3">
                      {Object.entries(sourceBreakdown).sort(([, a], [, b]) => (b as number) - (a as number)).map(([source, count]) => (
                        <div key={source} className="flex items-center gap-3">
                          <span className="text-sm text-white/60 w-20 shrink-0">{source}</span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${((count as number) / totalViews) * 100}%` }} />
                          </div>
                          <span className="text-sm text-white/60 w-6 text-right tabular-nums">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* View history */}
                  <div className="rounded-xl border border-border/60 bg-card p-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-4">View history</p>
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
                        <div key={view.id} className={cn(
                          "flex items-center justify-between py-3 border-b border-white/5 last:border-0",
                          namedInvestor && "bg-[#7C3AED]/5 rounded-lg px-3 -mx-3 border-l-2 border-l-[#7C3AED]/40"
                        )}>
                          <div className="flex items-center gap-3 min-w-0">
                            {avatarLetter ? (
                              <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-xs text-[#7C3AED] font-bold shrink-0">
                                {avatarLetter}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/30 shrink-0">?</div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm text-white truncate flex items-center gap-1.5">
                                {viewerLabel}
                                {namedInvestor && (
                                  <span className="text-xs bg-[#7C3AED]/20 text-[#7C3AED] px-1.5 py-0.5 rounded">Investor</span>
                                )}
                              </p>
                              <p className="text-xs text-white/40 truncate">
                                {view.source || (view.referrer?.includes("linkedin") ? "via LinkedIn" : view.referrer?.includes("x.com") ? "via X" : view.referrer ? `via ${(() => { try { return new URL(view.referrer).hostname; } catch { return view.referrer; } })()}` : "Direct link")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            {view.duration_seconds > 0 && (
                              <span className="text-xs text-white/30 tabular-nums">
                                {view.duration_seconds < 60 ? `${view.duration_seconds}s` : `${Math.floor(view.duration_seconds / 60)}m ${view.duration_seconds % 60}s`}
                              </span>
                            )}
                            <p className="text-xs text-white/40 tabular-nums">{formatRelativeTime(view.created_at)}</p>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Share link */}
              <div className="p-4 rounded-xl border border-white/8 bg-white/[0.02]">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Your shareable profile link</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-white/70 font-mono truncate">hockystick.app/p/{startup.profile_slug}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`https://hockystick.app/p/${startup.profile_slug}`); toast.success("Copied!"); }}
                    className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >Copy</button>
                  <a
                    href={`https://hockystick.app/p/${startup.profile_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs bg-[#7C3AED]/20 border border-[#7C3AED]/30 rounded-lg text-[#7C3AED] hover:bg-[#7C3AED]/30 transition-colors"
                  >Open →</a>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Profile preview</div>
                <h2 className="mt-3 text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif" }}>{form.company_name || "Your company"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{form.tagline || "Your headline goes here."}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Stage</div>
                  <div className="mt-2 text-sm text-foreground">{form.stage || "—"}</div>
                </div>
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Sector</div>
                  <div className="mt-2 text-sm text-foreground">{form.sector || "—"}</div>
                </div>
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Country</div>
                  <div className="mt-2 text-sm text-foreground">{form.country || "—"}</div>
                </div>
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Founded</div>
                  <div className="mt-2 text-sm text-foreground">{form.founded_year || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">About</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.description || "Your company description appears here."}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Key metrics</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Raising</div>
                  <div className="mt-2 text-sm text-foreground">{form.funding_target || "—"}</div>
                </div>
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Valuation</div>
                  <div className="mt-2 text-sm text-foreground">{form.valuation || "—"}</div>
                </div>
                <div className="rounded-2xl bg-[#111118] p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Revenue</div>
                  <div className="mt-2 text-sm text-foreground">{form.revenue || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Problem</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.problem || "Describe the customer problem."}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Solution</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.solution || "Explain how you solve it."}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Why us</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.why_us || "Why is your team uniquely positioned?"}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Why now</div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{form.why_now || "Why is now the right moment?"}</p>
            </div>
          </div>

          {(form.tam || form.sam || form.target_customer || form.revenue_model || form.pricing || form.unit_economics || form.burn_rate || form.runway_months || form.advisors || form.competitors || form.milestones || form.intro_video_url || form.product_video_url || form.moat) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {(form.tam || form.sam || form.target_customer) && (
                <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Market opportunity</div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {form.tam && <div><span className="font-semibold text-foreground">TAM:</span> {form.tam}</div>}
                    {form.sam && <div><span className="font-semibold text-foreground">SAM:</span> {form.sam}</div>}
                    {form.target_customer && <div><span className="font-semibold text-foreground">Target customer:</span> {form.target_customer}</div>}
                  </div>
                </div>
              )}
              {(form.revenue_model || form.pricing || form.unit_economics) && (
                <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Business model</div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {form.revenue_model && <div><span className="font-semibold text-foreground">Revenue model:</span> {form.revenue_model}</div>}
                    {form.pricing && <div><span className="font-semibold text-foreground">Pricing:</span> {form.pricing}</div>}
                    {form.unit_economics && <div><span className="font-semibold text-foreground">Unit economics:</span> {form.unit_economics}</div>}
                  </div>
                </div>
              )}
              {(form.burn_rate || form.runway_months) && (
                <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Runway</div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {form.burn_rate && <div><span className="font-semibold text-foreground">Burn rate:</span> {form.burn_rate}</div>}
                    {form.runway_months && <div><span className="font-semibold text-foreground">Runway:</span> {form.runway_months} months</div>}
                  </div>
                </div>
              )}
              {(form.advisors || form.competitors || form.milestones || form.moat || form.intro_video_url || form.product_video_url) && (
                <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Differentiators</div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {form.moat && <div><span className="font-semibold text-foreground">Moat:</span> {form.moat}</div>}
                    {form.competitors && <div><span className="font-semibold text-foreground">Competitors:</span> {form.competitors}</div>}
                    {form.milestones && <div><span className="font-semibold text-foreground">Milestones:</span> {form.milestones}</div>}
                    {form.advisors && <div><span className="font-semibold text-foreground">Advisors:</span> {form.advisors}</div>}
                    {form.intro_video_url && <div><span className="font-semibold text-foreground">Intro video:</span> <a href={form.intro_video_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">Watch</a></div>}
                    {form.product_video_url && <div><span className="font-semibold text-foreground">Product video:</span> <a href={form.product_video_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">Watch</a></div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {startup?.id && tab !== "analytics" && (
        <div className="mt-8">
          <TeamMembersSection startupId={startup.id} />
        </div>
      )}

      {!startup?.id && !isLoading && tab !== "analytics" && (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          Save your profile first to add team members.
        </div>
      )}

      {/* ── Investor criteria / Founder thesis ───────────────────────── */}
      {startup?.id && tab !== "analytics" && (
        <div className="mt-8 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-5">
          {/* Section header */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "rgba(124,58,237,0.1)" }}>
              <Target className="h-4 w-4" style={{ color: "#A855F7" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
                  What kind of investor are you looking for
                </h2>
                {existingThesis?.status === "complete" && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
                    <CheckCircle2 className="h-3 w-3" /> Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                The last step. This helps us match you with investors who are actually right for you, not just anyone who's interested.
              </p>
            </div>
          </div>

          {/* AI propose banner — only if thesis not yet complete */}
          {existingThesis?.status !== "complete" && (
            <div className="rounded-lg px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
              style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <p className="text-xs text-white/50 leading-relaxed flex-1">
                Based on your profile and documents, we can suggest a starting point — edit anything that's wrong.
              </p>
              <button
                onClick={handleThesisAIPropose}
                disabled={thesisProposing}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shrink-0 transition-colors"
                style={{
                  background: thesisProposing ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: thesisProposing ? "rgba(255,255,255,0.4)" : "#A855F7",
                  cursor: thesisProposing ? "not-allowed" : "pointer",
                }}
              >
                {thesisProposing
                  ? <><Loader2 className="h-3 w-3 animate-spin" /> Proposing…</>
                  : <><Sparkles className="h-3 w-3" /> Suggest defaults</>}
              </button>
            </div>
          )}

          {/* Regenerate button for complete thesis */}
          {existingThesis?.status === "complete" && (
            <button
              onClick={handleThesisAIPropose}
              disabled={thesisProposing}
              className="inline-flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: thesisProposing ? "not-allowed" : "pointer", padding: 0 }}
            >
              {thesisProposing
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Regenerating…</>
                : <><RefreshCw className="h-3 w-3" /> Regenerate AI suggestions</>}
            </button>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            {/* Check size */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Check size range
              </label>
              <div className="flex items-center gap-2">
                <input
                  value={thesisForm.preferred_check_size_min}
                  onChange={thesisField("preferred_check_size_min")}
                  placeholder="Min e.g. $250k"
                  className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
                <span className="text-xs text-muted-foreground shrink-0">to</span>
                <input
                  value={thesisForm.preferred_check_size_max}
                  onChange={thesisField("preferred_check_size_max")}
                  placeholder="Max e.g. $3M"
                  className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                />
              </div>
            </div>

            {/* Investor type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Investor type</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {["Capital only", "Capital + sector expertise", "Capital + network access"].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThesisForm((p) => ({ ...p, preferred_investor_type: val }))}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      thesisForm.preferred_investor_type === val
                        ? "border-brand/60 bg-brand/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:border-border"
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Board preference */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Involvement preference</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { val: "Hands-on (board seat, regular check-ins)", short: "Hands-on" },
                  { val: "Collaborative (available but not directive)", short: "Collaborative" },
                  { val: "Hands-off (capital only, minimal involvement)", short: "Hands-off" },
                ].map(({ val, short }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setThesisForm((p) => ({ ...p, board_preference: val }))}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      thesisForm.board_preference === val
                        ? "border-brand/60 bg-brand/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:border-border"
                    }`}
                  >
                    {short}
                  </button>
                ))}
              </div>
            </div>

            {/* Sector expertise */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Sector expertise wanted</label>
              <input
                value={thesisForm.sector_expertise_wanted}
                onChange={thesisField("sector_expertise_wanted")}
                placeholder="e.g. Defence, robotics, GCC enterprise sales"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>

            {/* Geography */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Geography preference</label>
              <input
                value={thesisForm.geography_preference}
                onChange={thesisField("geography_preference")}
                placeholder="e.g. GCC-based or UK/Europe, or 'No preference'"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>

            {/* Exclusions */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Exclusions / red lines</label>
              <textarea
                rows={2}
                value={thesisForm.exclusions}
                onChange={thesisField("exclusions")}
                placeholder="e.g. No investors with portfolio conflicts in defence or surveillance tech"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
              />
            </div>

            {/* What good fit looks like */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">What a great-fit investor looks like</label>
              <textarea
                rows={3}
                value={thesisForm.what_good_fit_looks_like}
                onChange={thesisField("what_good_fit_looks_like")}
                placeholder="In your own words — what would make you say yes immediately?"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
              />
            </div>

            {/* Save actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleThesisSave("complete")}
                disabled={thesisSaving || !startup?.id}
                className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-60 transition-colors"
              >
                {thesisSaving ? <Loader2 className="h-4 w-4 animate-spin" />
                  : thesisSaved ? <CheckCircle2 className="h-4 w-4" />
                  : <Save className="h-4 w-4" />}
                {thesisSaved ? "Saved" : "Save investor criteria"}
              </button>
              <button
                type="button"
                onClick={() => handleThesisSave("draft")}
                disabled={thesisSaving || !startup?.id}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                Save as draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badges — earned + locked criteria, below the verification area */}
      {startup?.id && tab !== "analytics" && (
        <div className="mt-8">
          <BadgesSection startupId={startup.id} />
        </div>
      )}

      {/* Operational Verified — Tier 3 */}
      {startup?.id && tab !== "analytics" && (
        <div className="mt-8">
          <OperationalVerificationSection
            startupId={startup.id}
            companyName={form.company_name}
            userEmail={user?.email ?? ""}
            displayName={form.company_name || "Founder"}
          />
        </div>
      )}

      {/* Attach-proof modal — rendered outside the form to avoid nesting */}
      {attachingClaim && startup?.id && (
        <AttachProofModal
          claim={attachingClaim}
          startupId={startup.id}
          onClose={() => { setAttachingClaim(null); setAttachingFile(null); }}
          onDone={() => { refetchClaims(); setAttachingClaim(null); setAttachingFile(null); }}
        />
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
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
        <div className="flex items-start gap-3 mb-6">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 shrink-0 mt-0.5">
            <Shield className="h-5 w-5 text-brand" />
          </div>
          <div>
            <div className="text-sm font-semibold">Profile Privacy Controls</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
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
                className="rounded-xl border border-border/60 bg-background/40 p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left: label + fields */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0 mt-0.5">
                      <section.Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{section.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{section.fields}</div>
                      {section.note && (
                        <div className="mt-2 text-xs text-warning leading-relaxed">{section.note}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: toggle */}
                  <div className="shrink-0">
                    {section.locked ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand">
                        🌐 Public — always on
                      </div>
                    ) : (
                      <div className="flex rounded-lg border border-border/60 overflow-hidden">
                        {VIS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            title={opt.desc}
                            onClick={() => setLocal((prev) => ({ ...prev, [section.key]: opt.value }))}
                            className={cn(
                              "px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 border-border/60",
                              current === opt.value
                                ? "bg-brand text-white"
                                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent",
                            )}
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
                  <div className="mt-3 text-xs text-muted-foreground/70">
                    {VIS_OPTIONS.find((o) => o.value === current)?.desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Changes take effect immediately on your public profile.</p>
          <button
            onClick={handleSave}
            disabled={saving || !startupId}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save privacy settings
          </button>
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
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="text-sm font-semibold">Pitch deck</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium">AI</span>
        </div>
        {isExtracting ? (
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 text-center">
            <Loader2 className="h-6 w-6 text-brand mx-auto animate-spin" />
            <div className="text-sm font-medium mt-3 text-foreground">Analysing pitch deck…</div>
            <div className="text-xs text-muted-foreground mt-1">This takes 10–20 seconds</div>
          </div>
        ) : deckName ? (
          <div className="rounded-lg border border-border/60 bg-accent/30 p-3">
            <div className="text-sm font-medium truncate">{deckName}</div>
            <div className="text-xs text-muted-foreground mt-0.5 mb-2">Uploaded</div>
            <label className="text-xs text-brand hover:underline cursor-pointer">
              Replace &amp; re-extract
              <input type="file" accept=".pdf,.pptx" className="sr-only" onChange={(e) => e.target.files?.[0] && onDeckUpload(e.target.files[0])} />
            </label>
          </div>
        ) : (
          <label className="rounded-xl border-2 border-dashed border-border/80 bg-card p-5 text-center cursor-pointer hover:border-brand/50 hover:bg-accent/20 transition-colors block">
            <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
            <div className="text-sm font-medium mt-2">Upload pitch deck</div>
            <div className="text-xs text-muted-foreground mt-0.5">PDF or PPTX · Max 10MB</div>
            <div className="text-xs text-brand mt-2">AI will extract and pre-fill your profile</div>
            <input type="file" accept=".pdf,.pptx" className="sr-only" onChange={(e) => e.target.files?.[0] && onDeckUpload(e.target.files[0])} />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
        <div className="text-sm font-semibold mb-3">Overview</div>
        <div className="space-y-2.5">
          {([
            [Globe, "Stage", form.stage],
            [Users, "Team", form.team_size],
            [Building2, "Sector", form.sector],
          ] as [any, string, string][]).map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{label}</span>
              <span className="ml-auto font-medium text-sm">{val || "—"}</span>
            </div>
          ))}
          {form.growth_rate && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-muted-foreground text-xs">Growth</span>
              <span className="ml-auto font-medium text-sm text-success">{form.growth_rate}</span>
            </div>
          )}
          {form.customer_count && (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-muted-foreground text-xs">Customers</span>
              <span className="ml-auto font-medium text-sm">{form.customer_count}</span>
            </div>
          )}
        </div>
      </div>
      {showVisibility && sectionVisibility && onVisibilityChange && (
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="text-sm font-semibold mb-3">Section visibility</div>
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
                <div className="text-xs text-muted-foreground mb-2">{label}</div>
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

// ── Claim verification components ─────────────────────────────────

const STATUS_CONFIG: Record<ClaimStatus, { label: string; icon: React.ReactNode; style: React.CSSProperties }> = {
  unverified: {
    label: "Unverified",
    icon: <AlertTriangle className="h-3 w-3" />,
    style: { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B" },
  },
  pending_review: {
    label: "Proof attached",
    icon: <Clock className="h-3 w-3" />,
    style: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" },
  },
  ai_confirmed: {
    label: "AI confirmed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    style: { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" },
  },
  ai_mismatch: {
    label: "Claim mismatch",
    icon: <XCircle className="h-3 w-3" />,
    style: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444" },
  },
};

function ClaimBadge({ claim, onAttach }: { claim: StartupClaim | undefined; onAttach?: () => void }) {
  if (!claim) return null;
  const cfg = STATUS_CONFIG[claim.proof_status as ClaimStatus] ?? STATUS_CONFIG.unverified;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full text-[11px] font-medium px-2 py-0.5 cursor-default"
      style={cfg.style}
      title={claim.proof_status === "ai_mismatch"
        ? `Document does not match this claim. ${claim.ai_check_result?.explanation ?? ""}`
        : claim.proof_status === "ai_confirmed"
        ? `AI confirmed: ${claim.ai_check_result?.found_value ?? "value found in document"}`
        : undefined}
    >
      {cfg.icon}
      {cfg.label}
      {(claim.proof_status === "unverified" || claim.proof_status === "ai_mismatch") && onAttach && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAttach(); }}
          className="ml-1 underline underline-offset-2 hover:opacity-70"
          style={{ color: "inherit", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit" }}
        >
          Attach proof
        </button>
      )}
    </span>
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
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
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

  const handleVerify = async (row: CapRow) => {
    setVerifyingId(row.id);
    try {
      const { verifySocialUrls } = await import("@/lib/claims-fn");
      const r = await verifySocialUrls({
        data: { startup_id: startupId, cap_table_row_id: row.id, linkedin_url: row.linkedin_url, x_url: row.x_url, instagram_url: row.instagram_url },
      });
      qc.invalidateQueries({ queryKey: ["cap-table", startupId] });
      toast.success(r.social_verified ? "Social links verified" : "Links could not be reached — social_verified set to false");
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifyingId(null);
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

  const inputCls = "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50";

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold">Cap Table</div>
          <div className="text-xs text-muted-foreground mt-0.5">Visible only to you — not shared with investors by default.</div>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setEditingId(null); setForm(blank); }}
          className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border/60 px-3 py-1.5 hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add shareholder
        </button>
      </div>

      {overLimit && (
        <div className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Total ownership is {totalOwnership.toFixed(1)}% — exceeds 100%. This may be intentional if data is incomplete.
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2 mb-4">
          {rows.map((row) => (
            <div key={row.id}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 }}
              className="px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{row.shareholder_name}</span>
                    {row.shareholder_role && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#A855F7" }}>
                        {row.shareholder_role}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white/70">{row.ownership_percent}%</span>
                    {row.social_verified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", color: "#10B981" }}>
                        <CheckCircle2 className="h-3 w-3" /> Social verified
                      </span>
                    ) : (row.linkedin_url || row.x_url || row.instagram_url) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
                        <AlertTriangle className="h-3 w-3" /> Unverified links
                      </span>
                    ) : (
                      <span className="text-[11px] text-white/25">No social links</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {row.linkedin_url && <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition-colors"><Linkedin className="h-3.5 w-3.5" /></a>}
                    {row.x_url && <a href={row.x_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition-colors"><Twitter className="h-3.5 w-3.5" /></a>}
                    {row.instagram_url && <a href={row.instagram_url} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition-colors"><Instagram className="h-3.5 w-3.5" /></a>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(row.linkedin_url || row.x_url || row.instagram_url) && (
                    <button
                      onClick={() => handleVerify(row)}
                      disabled={verifyingId === row.id}
                      className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                      title="Re-run social link verification"
                    >
                      {verifyingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Verify
                    </button>
                  )}
                  <button onClick={() => startEdit(row)} className="text-white/30 hover:text-white/60 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(row.id)} className="text-white/30 hover:text-red-400 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-1 text-xs text-muted-foreground text-right">
            Total documented: <span className={overLimit ? "text-[#F59E0B] font-semibold" : "font-medium"}>{totalOwnership.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {rows.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">No shareholders added yet. Add shareholders to document your cap table.</p>
      )}

      {showForm && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }} className="p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Shareholder name *</label>
              <input value={form.shareholder_name} onChange={f("shareholder_name")} placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <select value={form.shareholder_role} onChange={f("shareholder_role")} className={inputCls}>
                {CAP_ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Ownership % *</label>
              <input type="number" min="0" max="100" step="0.01" value={form.ownership_percent} onChange={f("ownership_percent")} placeholder="25.0" className={inputCls} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-medium pt-1">Social links (at least one required for verification)</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn URL</label>
              <input value={form.linkedin_url} onChange={f("linkedin_url")} placeholder="https://linkedin.com/in/..." className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Twitter className="h-3 w-3" /> X (Twitter) URL</label>
              <input value={form.x_url} onChange={f("x_url")} placeholder="https://x.com/..." className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram URL</label>
              <input value={form.instagram_url} onChange={f("instagram_url")} placeholder="https://instagram.com/..." className={inputCls} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(blank); }} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-4 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingId ? "Update" : "Add shareholder"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable field components ──────────────────────────────────────

function FormSection({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-sm font-semibold">{title}</div>
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
        <label className="text-xs text-muted-foreground">{label}</label>
        {badge}
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        title={title}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
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
        <label className="text-xs text-muted-foreground">{label}</label>
        {badge}
      </div>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
      />
    </div>
  );
}

function VisibilitySelector({ visibility, onChange }: { visibility: SectionVisibility; onChange: (value: SectionVisibility) => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="font-semibold uppercase tracking-[0.24em]">Visibility</span>
      {[
        { value: "public" as SectionVisibility, label: "🌐 Public" },
        { value: "on_request" as SectionVisibility, label: "🔒 On request" },
        { value: "deal_room" as SectionVisibility, label: "🏛 Deal room only" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1 text-[11px] transition ${visibility === option.value ? "border-brand bg-brand/10 text-brand" : "border-border/70 bg-white/5 text-muted-foreground hover:border-white/30 hover:bg-white/10"}`}
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

  const blankMember = { full_name: "", role: "", email: "", linkedin_url: "", bio: "", tag: "Employee", photo_url: "" };
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

  const openEdit = (m: TeamMember) => {
    setMf({ full_name: m.name ?? "", role: m.title ?? "", email: "", linkedin_url: m.linkedin_url ?? "", bio: m.bio ?? "", tag: m.tag ?? "Employee", photo_url: m.photo_url ?? "" });
    setEditingId(m.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setMf(blankMember); };

  const setField = (k: keyof typeof blankMember) =>
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // team_members columns are name/title — full_name/role/email do not exist
      const payload = {
        name: mf.full_name, title: mf.role,
        linkedin_url: mf.linkedin_url || null, bio: mf.bio || null,
        tag: mf.tag || null, photo_url: mf.photo_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Team member updated");
      } else {
        const { error } = await supabase.from("team_members").insert({ ...payload, startup_id: startupId, display_order: members.length });
        if (error) throw error;
        toast.success("Team member added");
      }
      queryClient.invalidateQueries({ queryKey: ["team-members", startupId] });
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
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const tagColor: Record<string, string> = {
    Founder: "bg-violet/10 text-violet", "Co-Founder": "bg-violet/10 text-violet",
    Advisor: "bg-warning/10 text-warning", Employee: "bg-brand/10 text-brand",
    "Board Member": "bg-success/10 text-success",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Team members</h2>
        {!readOnly && (
          <button
            onClick={() => { closeForm(); setShowForm((v) => !v); }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" /> Add member
          </button>
        )}
      </div>

      {!readOnly && showForm && (
        <div className="mb-5 rounded-xl border border-brand/30 bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">{editingId ? "Edit team member" : "New team member"}</div>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-accent border border-border/60 overflow-hidden text-sm font-semibold text-muted-foreground shrink-0">
                  {photoUploading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : mf.photo_url
                    ? <img src={mf.photo_url} alt="" className="h-full w-full object-cover" />
                    : (mf.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?")}
                </div>
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
              </label>
              <span className="text-xs text-muted-foreground">Click avatar to upload photo</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Full name</label>
                <input value={mf.full_name} onChange={setField("full_name")} placeholder="Jane Smith" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role / title</label>
                <input value={mf.role} onChange={setField("role")} placeholder="CTO" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tag</label>
                <select value={mf.tag} onChange={setField("tag")} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50">
                  {MEMBER_TAGS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <input value={mf.email} onChange={setField("email")} placeholder="jane@company.com" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">LinkedIn URL</label>
                <input value={mf.linkedin_url} onChange={setField("linkedin_url")} placeholder="https://linkedin.com/in/janesmith" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground flex items-center justify-between">
                  Bio <span className="text-muted-foreground/60">{mf.bio.length}/200</span>
                </label>
                <textarea
                  value={mf.bio}
                  onChange={(e) => { if (e.target.value.length <= 200) setField("bio")(e); }}
                  placeholder="Brief background and expertise"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={closeForm} className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editingId ? "Save changes" : "Add member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="rounded-xl border border-border/60 bg-card p-4 h-24 animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <div className="text-sm font-medium">No team members yet</div>
          <div className="text-xs text-muted-foreground mt-1">Add your co-founders, advisors and key hires.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((m) => {
            const inits = (m.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={m.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent border border-border/60 overflow-hidden text-xs font-semibold shrink-0">
                    {m.photo_url ? <img src={m.photo_url} alt={m.name ?? ""} className="h-full w-full object-cover" /> : inits}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.title}</div>
                    {m.tag && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block", tagColor[m.tag] ?? "bg-muted text-muted-foreground")}>
                        {m.tag}
                      </span>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(m)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      >
                        {deletingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
                {m.bio && <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{m.bio}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState, useRef, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import {
  Loader2, Save, Plus, X, Pencil, Trash2,
  Globe, Users, Linkedin, UserCircle2, Mail, Upload,
  Paperclip, CheckCircle2, XCircle, Clock, Sparkles,
  ChevronDown, Link as LinkIcon, Copy, Eye, EyeOff,
  Trophy, Briefcase, Building2, FileText, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { sendInviteEmail } from "@/lib/invite-fn";
import { VerificationSection } from "@/components/app/VerificationSection";
import { FieldVerificationBadge, prewarmClassificationCache } from "@/components/app/FieldVerificationBadge";
import { logActivity } from "@/lib/activity-log-fn";
import type { InvestorClaim } from "@/lib/investor-claims-fn";
import { CapitalVerificationSection } from "./app.investor.profile.capital";
import { BadgeDisplay, useBadges } from "@/components/app/BadgeDisplay";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { useTimedAI, AITimeoutError, AI_TIMEOUT_MESSAGE } from "@/hooks/useTimedAI";
import { PageFrame, EmptyState } from "@/components/system";
import { color, font, space, radius } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/investor/profile")({
  component: InvestorProfilePage,
});

// ── Types ─────────────────────────────────────────────────────────

interface TrackRecordItem {
  label: string;
  detail: string;
  verified: boolean;
}

interface ProfileForm {
  fund_name: string;
  your_name: string;
  role: string;
  fund_size: string;
  social_links: Array<{ platform: string; url: string }>;
  thesis_statement: string;
  secret_sauce: string;
  thesis: string;
  sectors: string;
  stages: string[];
  check_size_min: string;
  check_size_max: string;
  geography: string;
  portfolio_companies: string;
  red_flags: string;
  key_metrics: string;
  thesis_bullets: string[];
  achievements: string[];
  track_record: TrackRecordItem[];
  profile_slug: string;
  profile_published: boolean;
  public_fields: string[];
}

interface TeamMember {
  id: string;
  investor_profile_id: string;
  name: string;
  role: string;
  designation?: string | null;
  is_admin?: boolean;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  bio?: string | null;
  created_at: string;
}

interface PortfolioEntry {
  id: string;
  investor_profile_id: string;
  company_name: string;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  display_order: number;
}

// ── Constants ─────────────────────────────────────────────────────

const ROLES = ["Partner", "General Partner", "Managing Partner", "Principal", "Associate", "Analyst", "Venture Partner", "EIR", "Other"];
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Growth"];
const SOCIAL_PLATFORMS = ["LinkedIn", "X / Twitter", "Website", "AngelList", "Crunchbase", "Other"];

const PUBLIC_FIELD_OPTIONS: { key: string; label: string }[] = [
  { key: "fund_name", label: "Fund name" },
  { key: "your_name", label: "Your name" },
  { key: "role", label: "Role" },
  { key: "fund_size", label: "Fund size" },
  { key: "thesis_statement", label: "Thesis statement" },
  { key: "sectors", label: "Sectors" },
  { key: "stages", label: "Stages" },
  { key: "geography", label: "Geography" },
  { key: "check_size_min", label: "Cheque size (min/max)" },
  { key: "verification_tier", label: "Verification tier" },
  { key: "achievements", label: "Achievements" },
  { key: "track_record", label: "Track record" },
  { key: "avatar_url", label: "Photo" },
  { key: "social_links", label: "Social links" },
];

const EMPTY_FORM: ProfileForm = {
  fund_name: "", your_name: "", role: "Partner", fund_size: "",
  social_links: [],
  thesis_statement: "", secret_sauce: "", thesis: "",
  sectors: "", stages: [], check_size_min: "",
  check_size_max: "", geography: "", portfolio_companies: "",
  red_flags: "", key_metrics: "",
  thesis_bullets: [], achievements: [], track_record: [],
  profile_slug: "", profile_published: false,
  public_fields: PUBLIC_FIELD_OPTIONS.map((f) => f.key).filter((k) => k !== "check_size_min"),
};

// ── Helpers ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: `1px solid ${color.border}`,
  borderRadius: radius.control,
  background: color.white,
  padding: "8px 12px",
  fontSize: 14,
  fontFamily: font.body,
  color: color.ink,
  outline: "none",
};

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function computeCompleteness(f: ProfileForm): number {
  const checks: boolean[] = [
    !!f.fund_name.trim(),
    !!f.your_name.trim(),
    !!f.thesis_statement.trim(),
    !!f.sectors.trim(),
    f.stages.length > 0,
    !!f.check_size_min.trim() || !!f.check_size_max.trim(),
    !!f.geography.trim(),
    f.achievements.length > 0,
    f.track_record.length > 0,
    f.social_links.length > 0,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        border: `1px solid ${color.border}`,
        borderRadius: radius.structural,
        background: color.white,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${color.border}` }}>
      <Icon style={{ width: 16, height: 16, color: color.inkTertiary, marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>{title}</div>
        <div style={{ fontFamily: font.body, fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>{description}</div>
      </div>
    </div>
  );
}

function Field({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontFamily: font.body, fontSize: 12, color: color.inkTertiary }}>{label}</label>
        {badge}
      </div>
      {children}
    </div>
  );
}

function BulletEditor({ bullets, onChange, placeholder }: { bullets: string[]; onChange: (b: string[]) => void; placeholder: string }) {
  const add = () => onChange([...bullets, ""]);
  const update = (i: number, v: string) => { const next = [...bullets]; next[i] = v; onChange(next); };
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {bullets.map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ marginTop: 12, width: 4, height: 4, borderRadius: "50%", background: color.inkTertiary, flexShrink: 0 }} />
          <input value={b} onChange={(e) => update(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder={placeholder} />
          <button type="button" onClick={() => remove(i)}
            style={{ marginTop: 4, display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: radius.control, color: color.inkTertiary, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: color.inkTertiary, border: `1px dashed ${color.border}`, borderRadius: radius.control, padding: "8px 12px", background: "transparent", cursor: "pointer" }}>
        <Plus style={{ width: 14, height: 14 }} /> Add bullet
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function InvestorProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = useSearch({ strict: false }) as { tour?: string };
  const { progress, markStep, setCurrentStep } = useOnboardingProgress();
  const { run: runAI, isWorking: aiWorking, stillWorking: aiStillWorking } = useTimedAI();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [attachingClaim, setAttachingClaim] = useState<{ type: string; label: string; value: string } | null>(null);
  const [previewTab, setPreviewTab] = useState<"public" | "dealroom">("public");
  const [deckExtracting, setDeckExtracting] = useState(false);
  const [deckDraft, setDeckDraft] = useState<Record<string, unknown> | null>(null);
  const [deckMissing, setDeckMissing] = useState<string[]>([]);

  useEffect(() => { prewarmClassificationCache(); }, []);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["investor-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: investorVerif } = useQuery({
    queryKey: ["investor-verification-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_verifications")
        .select("tier1_passed, verification_tier")
        .eq("investor_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const tier1Passed = investorVerif?.tier1_passed === true;

  const { data: investorClaims = [], refetch: refetchInvestorClaims } = useQuery<InvestorClaim[]>({
    queryKey: ["investor-claims", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_claims")
        .select("*")
        .eq("investor_id", user!.id);
      return (data ?? []) as InvestorClaim[];
    },
  });

  const claimByType = (type: string): InvestorClaim | undefined =>
    investorClaims.find((c) => c.claim_type === type);

  useEffect(() => {
    if (!existing) {
      if (user?.fullName) setForm((f) => ({ ...f, your_name: user.fullName }));
      return;
    }
    let tBullets: string[] = Array.isArray(existing.thesis_bullets) ? existing.thesis_bullets : [];
    if (tBullets.length === 0) {
      const defaults: string[] = [];
      if (existing.sectors) defaults.push(`Sectors: ${existing.sectors}`);
      if (existing.stages) defaults.push(`Stages: ${existing.stages}`);
      if (existing.check_size_min || existing.check_size_max) {
        defaults.push(`Check size: ${existing.check_size_min || ""}${existing.check_size_min && existing.check_size_max ? " – " : ""}${existing.check_size_max || ""}`);
      }
      if (existing.geography) defaults.push(`Geography: ${existing.geography}`);
      if (existing.red_flags) defaults.push(`Not investing in: ${existing.red_flags}`);
      tBullets = defaults;
    }

    let socialLinks: Array<{ platform: string; url: string }> = [];
    if (Array.isArray(existing.social_links)) {
      socialLinks = existing.social_links;
    } else {
      if (existing.linkedin_url) socialLinks.push({ platform: "LinkedIn", url: existing.linkedin_url });
      if (existing.website) socialLinks.push({ platform: "Website", url: existing.website });
    }

    setForm({
      fund_name: existing.fund_name ?? "",
      your_name: existing.your_name ?? user?.fullName ?? "",
      role: existing.role ?? "Partner",
      fund_size: existing.fund_size ?? "",
      social_links: socialLinks,
      thesis_statement: existing.thesis_statement ?? "",
      secret_sauce: existing.secret_sauce ?? "",
      thesis: existing.thesis ?? "",
      sectors: existing.sectors ?? "",
      stages: existing.stages ? String(existing.stages).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      check_size_min: existing.check_size_min ?? "",
      check_size_max: existing.check_size_max ?? "",
      geography: existing.geography ?? "",
      portfolio_companies: existing.portfolio_companies ?? "",
      red_flags: existing.red_flags ?? "",
      key_metrics: existing.key_metrics ?? "",
      thesis_bullets: tBullets,
      achievements: Array.isArray(existing.achievements) ? existing.achievements : [],
      track_record: Array.isArray(existing.track_record) ? existing.track_record : [],
      profile_slug: existing.profile_slug ?? slugify(existing.fund_name ?? ""),
      profile_published: existing.profile_published ?? false,
      public_fields: Array.isArray(existing.public_fields) && existing.public_fields.length > 0
        ? existing.public_fields
        : EMPTY_FORM.public_fields,
    });
    setAvatarUrl(existing.avatar_url ?? null);
  }, [existing, user?.fullName]);

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleStage = (stage: string) =>
    setForm((f) => ({
      ...f,
      stages: f.stages.includes(stage) ? f.stages.filter((s) => s !== stage) : [...f.stages, stage],
    }));

  const togglePublicField = (key: string) =>
    setForm((f) => ({
      ...f,
      public_fields: f.public_fields.includes(key) ? f.public_fields.filter((k) => k !== key) : [...f.public_fields, key],
    }));

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `investors/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
      const { error: avErr } = await supabase.from("investor_profiles").update({ avatar_url: url }).eq("user_id", user.id);
      if (avErr) throw avErr;
      qc.invalidateQueries({ queryKey: ["investor-profile", user.id] });
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const prevFundName = useRef("");
  useEffect(() => {
    if (form.fund_name !== prevFundName.current) {
      prevFundName.current = form.fund_name;
      if (!form.profile_slug || form.profile_slug === slugify(prevFundName.current)) {
        setForm((f) => ({ ...f, profile_slug: slugify(form.fund_name) }));
      }
    }
  }, [form.fund_name]);

  // ── AI fund-deck extraction → draft prefill (confirm-before-publish) ──
  const handleDeckUpload = async (file: File) => {
    if (!user?.id) return;
    setDeckExtracting(true);
    setDeckDraft(null);
    try {
      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);
      if (!text || text.length < 50) {
        toast.error("Could not extract readable text from this file.");
        return;
      }
      const { extractInvestorProfileFromDeck } = await import("@/lib/investor-profile-builder-fn");
      type DeckExtractResult = { data: Record<string, unknown> | null; missing_fields: string[]; error: string | null };
      const result = await runAI(() =>
        extractInvestorProfileFromDeck({ data: { userId: user.id, documentText: text, fileName: file.name } }) as Promise<DeckExtractResult>,
      );
      if (result.error) { toast.error(result.error); return; }
      if (!result.data) { toast.error("Extraction returned no data."); return; }
      setDeckDraft(result.data);
      setDeckMissing(result.missing_fields ?? []);
      toast.success("Draft extracted — review before applying");
    } catch (err) {
      toast.error(err instanceof AITimeoutError ? AI_TIMEOUT_MESSAGE : "Extraction failed");
    } finally {
      setDeckExtracting(false);
    }
  };

  const applyDeckDraft = () => {
    if (!deckDraft) return;
    setForm((f) => ({
      ...f,
      fund_name: (deckDraft.fund_name as string) || f.fund_name,
      your_name: (deckDraft.your_name as string) || f.your_name,
      role: (deckDraft.role as string) || f.role,
      fund_size: (deckDraft.fund_size as string) || f.fund_size,
      thesis_statement: (deckDraft.thesis_statement as string) || f.thesis_statement,
      sectors: (deckDraft.sectors as string) || f.sectors,
      stages: Array.isArray(deckDraft.stages) && deckDraft.stages.length > 0 ? deckDraft.stages as string[] : f.stages,
      check_size_min: (deckDraft.check_size_min as string) || f.check_size_min,
      check_size_max: (deckDraft.check_size_max as string) || f.check_size_max,
      geography: (deckDraft.geography as string) || f.geography,
      track_record: Array.isArray(deckDraft.track_record)
        ? [...f.track_record, ...(deckDraft.track_record as { label: string; detail: string }[]).map((t) => ({ ...t, verified: false }))]
        : f.track_record,
    }));
    setDeckDraft(null);
    toast.success("Draft applied — verify unverified claims below, then save");
  };

  const discardDeckDraft = () => setDeckDraft(null);

  // ── Track record item helpers ──
  const addTrackRecordItem = () =>
    set("track_record", [...form.track_record, { label: "", detail: "", verified: false }]);
  const updateTrackRecordItem = (i: number, patch: Partial<TrackRecordItem>) =>
    set("track_record", form.track_record.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeTrackRecordItem = (i: number) =>
    set("track_record", form.track_record.filter((_, idx) => idx !== i));

  const handleSave = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!user?.id) return;
    if (!form.fund_name.trim() || !form.your_name.trim()) {
      toast.error("Fund name and your name are required");
      return;
    }
    setSaving(true);
    try {
      const linkedinEntry = form.social_links.find((l) => l.platform === "LinkedIn");
      const websiteEntry = form.social_links.find((l) => l.platform === "Website");
      const completeness = computeCompleteness(form);

      const { error } = await supabase.from("investor_profiles").upsert({
        user_id: user.id,
        fund_name: form.fund_name.trim(),
        your_name: form.your_name.trim(),
        role: form.role,
        fund_size: form.fund_size,
        social_links: form.social_links,
        linkedin_url: linkedinEntry?.url ?? null,
        website: websiteEntry?.url ?? null,
        thesis_statement: form.thesis_statement,
        secret_sauce: form.secret_sauce,
        thesis: form.thesis,
        sectors: form.sectors,
        stages: form.stages.join(","),
        check_size_min: form.check_size_min,
        check_size_max: form.check_size_max,
        geography: form.geography,
        portfolio_companies: form.portfolio_companies,
        red_flags: form.red_flags,
        key_metrics: form.key_metrics,
        thesis_bullets: form.thesis_bullets,
        achievements: form.achievements,
        track_record: form.track_record,
        profile_slug: form.profile_slug || slugify(form.fund_name),
        profile_published: form.profile_published,
        public_fields: form.public_fields,
        profile_completeness: completeness,
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["investor-profile", user.id] });

      if (form.thesis_statement.trim()) {
        try {
          await markStep("thesis_set", true);
          await setCurrentStep("directory");
        } catch { /* best-effort */ }
      }

      if (existing?.id) {
        logActivity({
          account_type: "investor",
          account_id: existing.id,
          actor_user_id: user.id,
          actor_name: form.your_name || user.email || "Investor",
          action_type: "profile_edited",
          target_label: form.fund_name || "Fund profile",
          detail: "Updated fund profile",
        });
      }
      toast.success("Profile saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageFrame title="Investor profile">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ height: 96, border: `1px solid ${color.border}`, background: color.canvas }} />
          ))}
        </div>
      </PageFrame>
    );
  }

  const completeness = computeCompleteness(form);
  const profileUrl = `${import.meta.env.VITE_APP_URL || "https://hockystick.app"}/i/${form.profile_slug}`;

  const showThesisSpotlight =
    search.tour === "thesis" &&
    progress?.account_type === "investor" &&
    progress.current_step === "thesis";

  return (
    <PageFrame
      breadcrumb={[{ label: "Investor" }, { label: "Profile" }]}
      title="Investor profile"
      description="Your fund's digital profile — shown publicly and inside unlocked deal rooms."
      actions={
        <button type="button" onClick={handleSave} disabled={saving}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, height: 36,
            background: color.ink === "#0A0A0B" ? "#7C3AED" : "#7C3AED", color: "#fff",
            border: "none", borderRadius: radius.control, padding: "0 16px",
            fontSize: 13, fontWeight: 500, fontFamily: font.body, cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
          {saving ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Save style={{ width: 14, height: 14 }} />}
          {saved ? "Saved" : existing ? "Save changes" : "Save & continue"}
        </button>
      }
    >
      {showThesisSpotlight && (
        <OnboardingTour
          steps={[{
            id: "thesis-accordion",
            target: "thesis-accordion",
            title: "Your investment thesis",
            body: "Fill in your thesis statement, sectors, stages, and check size — this drives matching in the directory.",
          }]}
          activeIndex={0}
          onSkip={() => markStep("tour_viewed", true)}
          onNext={() => markStep("tour_viewed", true)}
          onFinish={() => markStep("tour_viewed", true)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: space.block, alignItems: "flex-start" }}>

        {/* ── LEFT: form sections ─────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: space.block, minWidth: 0 }}>

          {/* Identity & Fund */}
          <Card>
            <SectionHeader icon={Building2} title="Identity & fund" description="Fund name, your name, role, photo, and social links" />
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
                  <div style={{ height: 56, width: 56, borderRadius: "50%", overflow: "hidden", background: "#7C3AED", display: "grid", placeItems: "center", color: "#fff", fontSize: 20, fontWeight: 700 }}>
                    {avatarUploading
                      ? <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
                      : avatarUrl
                      ? <img src={avatarUrl} alt="avatar" style={{ height: "100%", width: "100%", objectFit: "cover" }} />
                      : <span>{(form.your_name || user?.fullName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                </label>
                <div style={{ fontSize: 12, color: color.inkTertiary }}>Photo, max 2MB</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Fund name *">
                  <input value={form.fund_name} onChange={(e) => set("fund_name", e.target.value)} required style={inputStyle} placeholder="Acme Ventures" />
                </Field>
                <Field label="Your name *">
                  <input value={form.your_name} onChange={(e) => set("your_name", e.target.value)} required style={inputStyle} placeholder="Jane Doe" />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Role">
                  <select value={form.role} onChange={(e) => set("role", e.target.value)} style={inputStyle}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Fund size" badge={<FieldVerificationBadge profileType="investor" fieldName="fund_size"
                    claimStatus={claimByType("fund_size")?.proof_status}
                    onAttachProof={user?.id ? () => setAttachingClaim({ type: "fund_size", label: "Fund size", value: form.fund_size }) : undefined} compact />}>
                  <input value={form.fund_size} onChange={(e) => set("fund_size", e.target.value)} style={inputStyle} placeholder="$50M" />
                </Field>
              </div>

              <div>
                <label style={{ fontSize: 12, color: color.inkTertiary, display: "block", marginBottom: 8 }}>Social links</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {form.social_links.map((link, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        value={link.platform}
                        onChange={(e) => {
                          const next = [...form.social_links];
                          next[i] = { ...next[i], platform: e.target.value };
                          set("social_links", next);
                        }}
                        style={{ ...inputStyle, width: 144, flexShrink: 0, fontSize: 12 }}
                      >
                        {SOCIAL_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                      </select>
                      <input
                        value={link.url}
                        onChange={(e) => {
                          const next = [...form.social_links];
                          next[i] = { ...next[i], url: e.target.value };
                          set("social_links", next);
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="https://…"
                      />
                      <button type="button" onClick={() => set("social_links", form.social_links.filter((_, idx) => idx !== i))}
                        style={{ display: "grid", placeItems: "center", height: 32, width: 32, borderRadius: radius.control, color: color.inkTertiary, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  ))}
                  <button type="button"
                    onClick={() => set("social_links", [...form.social_links, { platform: "LinkedIn", url: "" }])}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: color.inkTertiary, border: `1px dashed ${color.border}`, borderRadius: radius.control, padding: "8px 12px", background: "transparent", cursor: "pointer" }}>
                    <Plus style={{ width: 14, height: 14 }} /> Add link
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* AI: Upload fund deck */}
          <Card>
            <SectionHeader icon={Sparkles} title="Upload fund deck" description="AI drafts your profile from a deck — you confirm before anything is applied" />
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {!deckDraft ? (
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${color.border}`, borderRadius: radius.structural, padding: "28px 16px", cursor: deckExtracting ? "default" : "pointer", gap: 8 }}>
                  {deckExtracting
                    ? <Loader2 style={{ width: 18, height: 18, color: color.inkTertiary }} className="animate-spin" />
                    : <Upload style={{ width: 18, height: 18, color: color.inkTertiary }} />}
                  <span style={{ fontSize: 12, color: color.inkTertiary, textAlign: "center" }}>
                    {deckExtracting
                      ? (aiStillWorking ? "Still working — this may take a moment." : "Reading document…")
                      : "Click to select PDF, DOCX, or PPTX"}
                  </span>
                  <input type="file" accept=".pdf,.docx,.doc,.pptx,.ppt" style={{ display: "none" }} disabled={deckExtracting}
                    onChange={(e) => e.target.files?.[0] && handleDeckUpload(e.target.files[0])} />
                </label>
              ) : (
                <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: color.ink }}>Draft extracted — review before applying</div>
                  <div style={{ fontSize: 12, color: color.inkSecondary, lineHeight: 1.6 }}>
                    {["fund_name", "your_name", "thesis_statement", "sectors", "geography"].map((k) => {
                      const v = deckDraft[k];
                      if (!v) return null;
                      return <div key={k}><strong>{k.replace(/_/g, " ")}:</strong> {String(v).slice(0, 120)}</div>;
                    })}
                    {Array.isArray(deckDraft.track_record) && (deckDraft.track_record as any[]).length > 0 && (
                      <div><strong>Track record:</strong> {(deckDraft.track_record as any[]).length} item(s) found — will be added as unverified</div>
                    )}
                  </div>
                  {deckMissing.length > 0 && (
                    <div style={{ fontSize: 11, color: color.inkTertiary }}>Not found: {deckMissing.join(", ")}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={discardDeckDraft}
                      style={{ border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "6px 12px", fontSize: 12, background: "transparent", color: color.inkSecondary, cursor: "pointer" }}>
                      Discard
                    </button>
                    <button type="button" onClick={applyDeckDraft}
                      style={{ border: "none", borderRadius: radius.control, padding: "6px 12px", fontSize: 12, background: "#7C3AED", color: "#fff", cursor: "pointer" }}>
                      Apply to form
                    </button>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 11, color: color.inkTertiary, lineHeight: 1.5 }}>
                Extracted values are draft only — nothing is saved or published until you review and click Save changes. Track-record items always start Unverified until you attach evidence.
              </p>
            </div>
          </Card>

          {/* Thesis summary */}
          <Card data-tour="thesis-accordion">
            <SectionHeader icon={Sparkles} title="Thesis summary" description="Your one-sentence thesis, bullet points, sectors, stages, and cheque size" />
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#7C3AED" }}>Thesis statement</div>
                <p style={{ fontSize: 11, color: color.inkTertiary, lineHeight: 1.5, margin: 0 }}>
                  One sentence formula: <em>[Fund] is a [$ size] [stage] fund in [geography] backing [sector] companies with [edge].</em>
                </p>
                <textarea value={form.thesis_statement} onChange={(e) => set("thesis_statement", e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: "none" }}
                  placeholder="Acme Ventures is a $50M seed fund in North America backing developer-tools companies, leveraging our team's 20 years of engineering leadership at Google and Stripe." />
              </div>

              <Field label="Thesis bullets">
                <BulletEditor bullets={form.thesis_bullets} onChange={(b) => set("thesis_bullets", b)}
                  placeholder="e.g. Sectors: DevTools, AI/ML, B2B SaaS" />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Sectors">
                  <input value={form.sectors} onChange={(e) => set("sectors", e.target.value)} style={inputStyle} placeholder="DevTools, AI/ML, Fintech" />
                </Field>
                <Field label="Geography">
                  <input value={form.geography} onChange={(e) => set("geography", e.target.value)} style={inputStyle} placeholder="North America, Europe" />
                </Field>
              </div>
              <Field label="Stages">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {STAGES.map((s) => {
                    const active = form.stages.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleStage(s)}
                        style={{
                          padding: "6px 12px", borderRadius: radius.control, fontSize: 12,
                          border: active ? "1px solid #7C3AED" : `1px solid ${color.border}`,
                          background: active ? "#7C3AED" : color.white,
                          color: active ? "#fff" : color.ink,
                          cursor: "pointer",
                        }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Cheque min" badge={<FieldVerificationBadge profileType="investor" fieldName="check_size_min" claimStatus={claimByType("check_size_min")?.proof_status} onAttachProof={user?.id ? () => setAttachingClaim({ type: "check_size_min", label: "Min cheque", value: form.check_size_min }) : undefined} compact />}>
                  <input value={form.check_size_min} onChange={(e) => set("check_size_min", e.target.value)} style={inputStyle} placeholder="$250K" />
                </Field>
                <Field label="Cheque max" badge={<FieldVerificationBadge profileType="investor" fieldName="check_size_max" claimStatus={claimByType("check_size_max")?.proof_status} onAttachProof={user?.id ? () => setAttachingClaim({ type: "check_size_max", label: "Max cheque", value: form.check_size_max }) : undefined} compact />}>
                  <input value={form.check_size_max} onChange={(e) => set("check_size_max", e.target.value)} style={inputStyle} placeholder="$2M" />
                </Field>
              </div>
              <Field label="Exclusions">
                <textarea value={form.red_flags} onChange={(e) => set("red_flags", e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} placeholder="No crypto, no consumer apps…" />
              </Field>
              <Field label="Edge">
                <textarea value={form.secret_sauce} onChange={(e) => set("secret_sauce", e.target.value)}
                  rows={2} style={{ ...inputStyle, resize: "none" }}
                  placeholder="Deep engineering network at FAANG, 3 unicorn exits as an operator, active board seat pattern from day one." />
              </Field>
            </div>
          </Card>

          {/* Track record */}
          <Card>
            <SectionHeader icon={Trophy} title="Track record" description="Named investments and outcomes — unverified until you attach evidence" />
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {form.track_record.length === 0 && (
                <p style={{ fontSize: 13, color: color.inkTertiary }}>No track record items yet.</p>
              )}
              {form.track_record.map((item, i) => {
                const claimType = `track_record_${i}`;
                const claim = claimByType(claimType);
                return (
                  <div key={i} style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={item.label} onChange={(e) => updateTrackRecordItem(i, { label: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }} placeholder="Company or exit name" />
                      <button type="button" onClick={() => removeTrackRecordItem(i)}
                        style={{ display: "grid", placeItems: "center", height: 36, width: 36, borderRadius: radius.control, color: color.inkTertiary, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                    <input value={item.detail} onChange={(e) => updateTrackRecordItem(i, { detail: e.target.value })}
                      style={inputStyle} placeholder="Round led, outcome, return multiple…" />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {item.verified ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#10B981" }}>
                          <ShieldCheck style={{ width: 12, height: 12 }} /> Verified
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: color.inkTertiary }}>
                          {claim?.proof_status === "ai_confirmed" ? "AI confirmed — pending publish" : claim?.proof_status === "pending_review" ? "Pending review" : "Unverified"}
                        </span>
                      )}
                      <button type="button"
                        onClick={() => setAttachingClaim({ type: claimType, label: item.label || "Track record item", value: item.detail })}
                        style={{ fontSize: 11, color: "#7C3AED", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Attach proof
                      </button>
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addTrackRecordItem}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: color.inkTertiary, border: `1px dashed ${color.border}`, borderRadius: radius.control, padding: "8px 12px", background: "transparent", cursor: "pointer" }}>
                <Plus style={{ width: 14, height: 14 }} /> Add track record item
              </button>
            </div>
          </Card>

          {/* Achievements */}
          <Card>
            <SectionHeader icon={Trophy} title="Achievements" description="Recognitions and highlights shown on your public profile" />
            <div style={{ padding: 20 }}>
              <BulletEditor bullets={form.achievements} onChange={(b) => set("achievements", b)}
                placeholder="e.g. Led Series A in Stripe (2016), returned 12x" />
            </div>
          </Card>

          {/* Team */}
          <Card>
            <SectionHeader icon={Users} title="Team" description="Partners and associates visible to founders in your deal rooms" />
            <div style={{ padding: 20 }}>
              {existing?.id ? (
                <InvestorTeamSection
                  profileId={existing.id}
                  investorUserId={user?.id ?? ""}
                  investorName={form.your_name || user?.email || "Investor"}
                  fundName={form.fund_name}
                />
              ) : (
                <p style={{ fontSize: 13, color: color.inkTertiary, textAlign: "center", padding: "16px 0" }}>Save your profile first to add team members.</p>
              )}
            </div>
          </Card>

          {/* Documents / portfolio */}
          <Card>
            <SectionHeader icon={Briefcase} title="Portfolio showcase" description="Companies you've invested in — curated, separate from your active pipeline" />
            <div style={{ padding: 20 }}>
              {existing?.id ? (
                <SectionErrorBoundary>
                  <PortfolioSection profileId={existing.id} />
                </SectionErrorBoundary>
              ) : (
                <p style={{ fontSize: 13, color: color.inkTertiary, textAlign: "center", padding: "16px 0" }}>Save your profile first to add portfolio companies.</p>
              )}
            </div>
          </Card>

          {/* Public fields whitelist */}
          <Card>
            <SectionHeader icon={Eye} title="Public visibility" description="Choose which fields appear on your public profile at /i/:slug" />
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PUBLIC_FIELD_OPTIONS.map((opt) => {
                  const active = form.public_fields.includes(opt.key);
                  return (
                    <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" checked={active} onChange={() => togglePublicField(opt.key)} />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* ── RIGHT: sticky preview rail ──────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>

          {/* Completeness */}
          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: font.display }}>Profile completeness</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{completeness}%</div>
            </div>
            <div style={{ height: 4, background: color.canvas, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: 4, width: `${completeness}%`, background: "#7C3AED" }} />
            </div>
          </Card>

          {/* Preview tabs */}
          <Card>
            <div style={{ display: "flex", borderBottom: `1px solid ${color.border}` }}>
              {(["public", "dealroom"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setPreviewTab(tab)}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: "transparent", border: "none",
                    color: previewTab === tab ? color.ink : color.inkTertiary,
                    borderBottom: previewTab === tab ? "2px solid #7C3AED" : "2px solid transparent",
                  }}>
                  {tab === "public" ? "Public view" : "Deal room view"}
                </button>
              ))}
            </div>
            <div style={{ padding: 16, fontSize: 12, color: color.inkSecondary, lineHeight: 1.6 }}>
              {previewTab === "public" ? (
                <>
                  <div style={{ fontWeight: 600, color: color.ink }}>{form.your_name || "Your name"}</div>
                  <div>{form.role} {form.fund_name && `· ${form.fund_name}`}</div>
                  {form.public_fields.includes("thesis_statement") && form.thesis_statement && (
                    <p style={{ marginTop: 8 }}>{form.thesis_statement.slice(0, 140)}</p>
                  )}
                  <div style={{ marginTop: 8, fontSize: 11, color: color.inkTertiary }}>
                    {form.public_fields.length} of {PUBLIC_FIELD_OPTIONS.length} fields visible
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: color.ink }}>{form.your_name || "Your name"}</div>
                  <div>{form.role} {form.fund_name && `· ${form.fund_name}`}</div>
                  <p style={{ marginTop: 8 }}>Cheque: {form.check_size_min || "—"} – {form.check_size_max || "—"}</p>
                  <p>Track record: {form.track_record.length} item(s)</p>
                  <div style={{ marginTop: 8, fontSize: 11, color: color.inkTertiary }}>
                    Full profile — visible only once a deal room reaches the Information stage.
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Shareable profile card */}
          <Card style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe style={{ width: 14, height: 14, color: "#7C3AED" }} />
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: font.display }}>Shareable profile</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{form.profile_published ? "Public" : "Private"}</div>
                <div style={{ fontSize: 11, color: color.inkTertiary, marginTop: 2 }}>
                  {form.profile_published ? "Anyone with the link can view" : "Only in deal rooms you've unlocked"}
                </div>
              </div>
              <button type="button" onClick={() => set("profile_published", !form.profile_published)}
                style={{
                  height: 22, width: 40, borderRadius: 11, position: "relative", flexShrink: 0, border: "none", cursor: "pointer",
                  background: form.profile_published ? "#7C3AED" : color.border,
                }}>
                <div style={{
                  position: "absolute", top: 2, height: 18, width: 18, borderRadius: "50%", background: "#fff",
                  transition: "transform 0.15s", transform: form.profile_published ? "translateX(20px)" : "translateX(2px)",
                }} />
              </button>
            </div>
            <Field label="Profile URL slug">
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, color: color.inkTertiary, paddingLeft: 4 }}>/i/</span>
                <input value={form.profile_slug} onChange={(e) => set("profile_slug", slugify(e.target.value))} style={{ ...inputStyle, flex: 1 }} placeholder="acme-ventures" />
              </div>
            </Field>
            {form.profile_published && (
              <div style={{ border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <LinkIcon style={{ width: 14, height: 14, color: color.inkTertiary, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: color.inkTertiary, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileUrl}</span>
                <button type="button" onClick={() => { navigator.clipboard.writeText(profileUrl); toast.success("Link copied"); }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: color.inkTertiary, flexShrink: 0 }}>
                  <Copy style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}
            <a href={profileUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
                borderRadius: radius.control, padding: "8px 12px", fontSize: 12, fontWeight: 500, textDecoration: "none",
                background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED",
              }}>
              <Eye style={{ width: 14, height: 14 }} /> View public profile
            </a>
          </Card>

          {/* Verification tier */}
          {user?.id && (
            <Card style={{ padding: 20 }}>
              <VerificationSection
                entityType="investor"
                entityId={user.id}
                userId={user.id}
                userEmail={user?.email ?? ""}
                displayName={form.your_name || form.fund_name || "Investor"}
              />
            </Card>
          )}

          {user?.id && (
            <CapitalVerificationSection
              investorId={user.id}
              fundName={form.fund_name}
              userEmail={user.email ?? ""}
              displayName={form.your_name || form.fund_name || "Investor"}
            />
          )}

          {existing?.id && user?.id && (
            <InvestorBadgesCard profileId={existing.id} userId={user.id} />
          )}
        </div>
      </div>

      {attachingClaim && user?.id && (
        <AttachInvestorProofModal
          claim={attachingClaim}
          investorId={user.id}
          onClose={() => setAttachingClaim(null)}
          onDone={(status) => {
            refetchInvestorClaims();
            if (status === "ai_confirmed" && attachingClaim.type.startsWith("track_record_")) {
              const idx = parseInt(attachingClaim.type.replace("track_record_", ""), 10);
              if (!Number.isNaN(idx)) updateTrackRecordItem(idx, { verified: true });
            }
            setAttachingClaim(null);
          }}
        />
      )}
    </PageFrame>
  );
}

// ── Portfolio section ─────────────────────────────────────────────

function PortfolioSection({ profileId }: { profileId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const blank = { company_name: "", description: "", website_url: "", logo_url: "" };
  const [pf, setPf] = useState(blank);

  const { data: entries = [], isLoading, isError } = useQuery<PortfolioEntry[]>({
    queryKey: ["investor-portfolio", profileId],
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_portfolio_entries")
        .select("*")
        .eq("investor_profile_id", profileId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PortfolioEntry[];
    },
  });

  const closeForm = () => { setShowForm(false); setEditingId(null); setPf(blank); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pf.company_name.trim()) { toast.error("Company name required"); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("investor_portfolio_entries")
          .update({ company_name: pf.company_name.trim(), description: pf.description || null, website_url: pf.website_url || null, logo_url: pf.logo_url || null })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("investor_portfolio_entries")
          .insert({ investor_profile_id: profileId, company_name: pf.company_name.trim(), description: pf.description || null, website_url: pf.website_url || null, logo_url: pf.logo_url || null, display_order: entries.length });
        if (error) throw error;
        toast.success("Company added");
      }
      qc.invalidateQueries({ queryKey: ["investor-portfolio", profileId] });
      closeForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("investor_portfolio_entries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["investor-portfolio", profileId] });
    toast.success("Removed");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: color.inkTertiary }}>Companies you've invested in and want to showcase — separate from your active pipeline in Startups.</p>

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: radius.control, background: "#7C3AED", color: "#fff", padding: "8px 12px", fontSize: 12, border: "none", cursor: "pointer", width: "fit-content" }}>
          <Plus style={{ width: 14, height: 14 }} /> Add portfolio company
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{editingId ? "Edit company" : "New company"}</div>
            <button type="button" onClick={closeForm} style={{ background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}><X style={{ width: 16, height: 16 }} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: color.inkTertiary }}>Company name *</label>
              <input value={pf.company_name} onChange={(e) => setPf((f) => ({ ...f, company_name: e.target.value }))} required style={{ ...inputStyle, marginTop: 4 }} placeholder="Stripe" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: color.inkTertiary }}>Website</label>
              <input value={pf.website_url} onChange={(e) => setPf((f) => ({ ...f, website_url: e.target.value }))} style={{ ...inputStyle, marginTop: 4 }} placeholder="https://stripe.com" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: color.inkTertiary }}>Description</label>
            <textarea value={pf.description} onChange={(e) => setPf((f) => ({ ...f, description: e.target.value }))} rows={2} style={{ ...inputStyle, marginTop: 4, resize: "none" }} placeholder="Online payments infrastructure. Led seed round, 8x return at IPO." />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={closeForm} style={{ border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "6px 12px", fontSize: 12, background: "transparent", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: radius.control, background: "#7C3AED", color: "#fff", padding: "6px 12px", fontSize: 12, border: "none", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Save style={{ width: 12, height: 12 }} />}
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}><Loader2 style={{ width: 16, height: 16 }} className="animate-spin mx-auto" /></div>
      ) : isError ? (
        <div style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", borderRadius: radius.structural, padding: 16, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: color.inkTertiary }}>Couldn't load portfolio — try refreshing the page.</p>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState kind="empty" title="No portfolio companies yet" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {entries.map((e) => (
            <div key={e.id} style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ height: 40, width: 40, borderRadius: radius.control, overflow: "hidden", background: "#7C3AED", display: "grid", placeItems: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {e.logo_url ? <img src={e.logo_url} alt={e.company_name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : <span>{e.company_name.charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{e.company_name}</div>
                {e.description && <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 2 }}>{e.description}</div>}
                {e.website_url && (
                  <a href={e.website_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7C3AED", marginTop: 4, textDecoration: "none" }}>
                    <Globe style={{ width: 10, height: 10 }} /> Website
                  </a>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => { setPf({ company_name: e.company_name, description: e.description ?? "", website_url: e.website_url ?? "", logo_url: e.logo_url ?? "" }); setEditingId(e.id); setShowForm(true); }}
                  style={{ display: "grid", placeItems: "center", height: 24, width: 24, borderRadius: radius.control, background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}>
                  <Pencil style={{ width: 12, height: 12 }} />
                </button>
                <button onClick={() => handleDelete(e.id)}
                  style={{ display: "grid", placeItems: "center", height: 24, width: 24, borderRadius: radius.control, background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}>
                  <Trash2 style={{ width: 12, height: 12 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Investor proof modal ──────────────────────────────────────────

function AttachInvestorProofModal({ claim, investorId, onClose, onDone }: {
  claim: { type: string; label: string; value: string };
  investorId: string;
  onClose: () => void;
  onDone: (status: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ proof_status: string; ai_result: any } | null>(null);

  const handleAttach = async () => {
    if (!file || running) return;
    setRunning(true);
    try {
      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);
      const syntheticDocId = crypto.randomUUID();
      const { attachInvestorProofAndCheck } = await import("@/lib/investor-claims-fn");
      const r = await attachInvestorProofAndCheck({
        data: { investor_id: investorId, claim_type: claim.type, proof_document_id: syntheticDocId, document_text: text, claim_label: claim.label, claim_value: claim.value },
      });
      setResult(r);
    } catch {
      toast.error("Attach failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 24, maxWidth: 440, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: font.display }}>Attach proof for claim</div>
            <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4 }}>{claim.label}: {claim.value}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        {!result ? (
          <>
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: radius.control, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: color.inkSecondary, lineHeight: 1.5 }}>
              Upload a document containing evidence for this claim. AI will cross-check it.
            </div>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px dashed ${color.border}`, borderRadius: radius.structural, padding: "24px 16px", cursor: "pointer", gap: 8, marginBottom: 16 }}>
              <Paperclip style={{ width: 18, height: 18, color: color.inkTertiary }} />
              <span style={{ fontSize: 12, color: color.inkTertiary, textAlign: "center" }}>{file ? file.name : "Click to select PDF, DOCX, XLSX, CSV"}</span>
              <input type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "8px 16px", fontSize: 12, color: color.inkTertiary, background: "transparent", border: "none", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAttach} disabled={!file || running}
                style={{ background: !file || running ? "rgba(124,58,237,0.4)" : "#7C3AED", color: "#fff", border: "none", borderRadius: radius.control, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: !file || running ? "default" : "pointer" }}>
                {running ? <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> Checking…</span> : "Attach & verify"}
              </button>
            </div>
          </>
        ) : (
          <>
            {result.proof_status === "ai_confirmed" && (
              <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: radius.control, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10B981", fontSize: 13, fontWeight: 500, marginBottom: 4 }}><CheckCircle2 style={{ width: 16, height: 16 }} /> Claim confirmed</div>
                <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>{result.ai_result?.explanation}</p>
              </div>
            )}
            {result.proof_status === "ai_mismatch" && (
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: radius.control, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EF4444", fontSize: 13, fontWeight: 500, marginBottom: 4 }}><XCircle style={{ width: 16, height: 16 }} /> Claim doesn't match</div>
                <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>{result.ai_result?.explanation}</p>
              </div>
            )}
            {result.proof_status === "pending_review" && (
              <div style={{ background: color.canvas, border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: color.inkSecondary, fontSize: 13, fontWeight: 500, marginBottom: 4 }}><Clock style={{ width: 16, height: 16 }} /> Proof attached</div>
                <p style={{ fontSize: 12, color: color.inkTertiary, margin: 0 }}>AI check inconclusive — set to pending review.</p>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onDone(result.proof_status)} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: radius.control, padding: "8px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Team section ──────────────────────────────────────────────────

function InvestorTeamSection({ profileId, investorUserId, investorName, fundName }: {
  profileId: string; investorUserId: string; investorName: string; fundName: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const blank = { name: "", designation: "", role: "", linkedin_url: "", bio: "", email: "", is_admin: false, avatar_url: "" };
  const [mf, setMf] = useState(blank);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["investor-team", profileId],
    queryFn: async () => {
      const { data, error } = await supabase.from("investor_team_members").select("*").eq("investor_profile_id", profileId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const openEdit = (m: TeamMember) => {
    setMf({ name: m.name, designation: m.designation ?? "", role: m.role, linkedin_url: m.linkedin_url ?? "", bio: m.bio ?? "", email: "", is_admin: m.is_admin ?? false, avatar_url: m.avatar_url ?? "" });
    setEditingId(m.id); setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setMf(blank); };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const { error } = await supabase.storage.from("avatars").upload(`team/${profileId}/${Date.now()}.${ext}`, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(`team/${profileId}/${Date.now()}.${ext}`);
      setMf((f) => ({ ...f, avatar_url: `${data.publicUrl}?t=${Date.now()}` }));
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); } finally { setAvatarUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mf.name.trim() || !mf.role.trim()) { toast.error("Name and role are required"); return; }
    setSubmitting(true);
    const memberData = { name: mf.name.trim(), designation: mf.designation.trim() || null, role: mf.role.trim(), linkedin_url: mf.linkedin_url || null, bio: mf.bio || null, is_admin: mf.is_admin, avatar_url: mf.avatar_url || null };
    try {
      if (editingId) {
        const { error } = await supabase.from("investor_team_members").update(memberData).eq("id", editingId);
        if (error) throw error;
        toast.success("Updated");
      } else {
        const { error } = await supabase.from("investor_team_members").insert({ investor_profile_id: profileId, ...memberData });
        if (error) throw error;
        logActivity({ account_type: "investor", account_id: profileId, actor_user_id: investorUserId, actor_name: investorName, action_type: "team_member_added", target_label: mf.name.trim(), detail: `Added ${mf.name.trim()} as ${mf.designation || mf.role}` });
        if (mf.email.trim() && user?.id) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            await sendInviteEmail({ data: { dealRoomId: profileId, email: mf.email.trim(), role: "investor", invitedBy: user.id, userAccessToken: session?.access_token ?? "", supabaseUrl: import.meta.env.VITE_SUPABASE_URL, supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY, appUrl: import.meta.env.VITE_APP_URL, dealRoomName: fundName || "the fund", founderName: investorName || undefined } });
          } catch { /* ignore invite errors */ }
        }
        toast.success("Team member added");
      }
      qc.invalidateQueries({ queryKey: ["investor-team", profileId] });
      closeForm();
    } catch (err: any) { toast.error(err?.message || "Failed to save"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    const { error } = await supabase.from("investor_team_members").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["investor-team", profileId] });
    setDeletingId(null);
    toast.success("Removed");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!showForm && (
        <button onClick={() => setShowForm(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: radius.control, background: "#7C3AED", color: "#fff", padding: "8px 12px", fontSize: 12, border: "none", cursor: "pointer", width: "fit-content" }}>
          <Plus style={{ width: 14, height: 14 }} /> Add member
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: color.inkTertiary, textTransform: "uppercase", letterSpacing: "0.04em" }}>{editingId ? "Edit member" : "New member"}</div>
            <button type="button" onClick={closeForm} style={{ background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}><X style={{ width: 16, height: 16 }} /></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
              <div style={{ height: 40, width: 40, borderRadius: "50%", overflow: "hidden", background: "#7C3AED", display: "grid", placeItems: "center", color: "#fff", fontWeight: 700 }}>
                {avatarUploading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : mf.avatar_url ? <img src={mf.avatar_url} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : <span>{(mf.name || "?").charAt(0).toUpperCase()}</span>}
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </label>
            <div style={{ fontSize: 12, color: color.inkTertiary }}>Photo (optional, max 2MB)</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 12, color: color.inkTertiary }}>Full name *</label><input value={mf.name} onChange={(e) => setMf((f) => ({ ...f, name: e.target.value }))} required style={{ ...inputStyle, marginTop: 4 }} placeholder="Jane Doe" /></div>
            <div><label style={{ fontSize: 12, color: color.inkTertiary }}>Designation</label><input value={mf.designation} onChange={(e) => setMf((f) => ({ ...f, designation: e.target.value }))} style={{ ...inputStyle, marginTop: 4 }} placeholder="General Partner" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 12, color: color.inkTertiary }}>Role *</label><input value={mf.role} onChange={(e) => setMf((f) => ({ ...f, role: e.target.value }))} required style={{ ...inputStyle, marginTop: 4 }} placeholder="Partner" /></div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div style={{ height: 16, width: 32, borderRadius: 8, position: "relative", background: mf.is_admin ? "#7C3AED" : color.border }} onClick={() => setMf((f) => ({ ...f, is_admin: !f.is_admin }))}>
                  <div style={{ position: "absolute", top: 2, height: 12, width: 12, borderRadius: "50%", background: "#fff", transform: mf.is_admin ? "translateX(18px)" : "translateX(2px)", transition: "transform 0.15s" }} />
                </div>
                <span style={{ fontSize: 12, color: color.inkTertiary }}>Fund admin</span>
              </label>
            </div>
          </div>
          <div><label style={{ fontSize: 12, color: color.inkTertiary }}>LinkedIn URL</label><input value={mf.linkedin_url} onChange={(e) => setMf((f) => ({ ...f, linkedin_url: e.target.value }))} style={{ ...inputStyle, marginTop: 4 }} placeholder="https://linkedin.com/in/…" /></div>
          {!editingId && <div><label style={{ fontSize: 12, color: color.inkTertiary, display: "flex", alignItems: "center", gap: 4 }}><Mail style={{ width: 12, height: 12 }} /> Email (optional — sends invite)</label><input type="email" value={mf.email} onChange={(e) => setMf((f) => ({ ...f, email: e.target.value }))} style={{ ...inputStyle, marginTop: 4 }} placeholder="partner@fund.com" /></div>}
          <div><label style={{ fontSize: 12, color: color.inkTertiary }}>Short bio</label><textarea value={mf.bio} onChange={(e) => setMf((f) => ({ ...f, bio: e.target.value }))} rows={2} style={{ ...inputStyle, marginTop: 4, resize: "none" }} placeholder="Former operator turned investor." /></div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={closeForm} style={{ border: `1px solid ${color.border}`, borderRadius: radius.control, padding: "6px 12px", fontSize: 12, background: "transparent", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: radius.control, background: "#7C3AED", color: "#fff", padding: "6px 12px", fontSize: 12, border: "none", cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
              {submitting ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <Save style={{ width: 12, height: 12 }} />} {editingId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? <div style={{ textAlign: "center", padding: "24px 0" }}><Loader2 style={{ width: 16, height: 16 }} className="animate-spin mx-auto" /></div>
       : members.length === 0 && !showForm ? <EmptyState kind="empty" title="No team members yet" />
       : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${color.border}`, borderRadius: radius.structural, padding: 12 }}>
              <div style={{ height: 36, width: 36, borderRadius: "50%", overflow: "hidden", background: "#7C3AED", display: "grid", placeItems: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {m.avatar_url ? <img src={m.avatar_url} alt={m.name} style={{ height: "100%", width: "100%", objectFit: "cover" }} /> : <span>{m.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                  {m.designation && <span style={{ fontSize: 10, background: "rgba(124,58,237,0.08)", color: "#7C3AED", padding: "2px 6px", borderRadius: 2, fontWeight: 500 }}>{m.designation}</span>}
                  {m.role && m.role !== m.designation && <span style={{ fontSize: 10, background: color.canvas, color: color.inkTertiary, padding: "2px 6px", borderRadius: 2 }}>{m.role}</span>}
                  {m.is_admin && <span style={{ fontSize: 9, background: "rgba(16,185,129,0.1)", color: "#10B981", padding: "2px 6px", borderRadius: 2, fontWeight: 700, textTransform: "uppercase" }}>Admin</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => openEdit(m)} style={{ display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: radius.control, background: "transparent", border: "none", color: color.inkTertiary, cursor: "pointer" }}><Pencil style={{ width: 14, height: 14 }} /></button>
                <button onClick={() => handleDelete(m.id)} style={{ display: "grid", placeItems: "center", height: 28, width: 28, borderRadius: radius.control, background: deletingId === m.id ? "rgba(239,68,68,0.08)" : "transparent", border: "none", color: deletingId === m.id ? "#EF4444" : color.inkTertiary, cursor: "pointer" }}><Trash2 style={{ width: 14, height: 14 }} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section error boundary ────────────────────────────────────────

class SectionErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.error) {
      return (
        <div style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", borderRadius: radius.structural, padding: 16, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: color.inkTertiary }}>Couldn't load this section — try refreshing the page.</p>
          <button style={{ marginTop: 8, fontSize: 12, color: "#7C3AED", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
            onClick={() => this.setState({ error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Investor badges card ───────────────────────────────────────────

function InvestorBadgesCard({ profileId, userId }: { profileId: string; userId: string }) {
  const qc = useQueryClient();
  const [evaluating, setEvaluating] = useState(false);
  const { data: badges = [] } = useBadges({ investorProfileId: profileId });

  const runEvaluation = async () => {
    if (evaluating) return;
    setEvaluating(true);
    try {
      const { evaluateAndAwardBadges } = await import("@/lib/badge-award-engine");
      const result = await evaluateAndAwardBadges({
        data: { investor_profile_id: profileId, investor_user_id: userId },
      });
      qc.invalidateQueries({ queryKey: ["profile-badges", profileId] });
      if (result.awarded.length > 0) {
        toast.success(`Newly earned: ${result.awarded.join(", ").replace(/_/g, " ")}`);
      } else {
        toast.info("No new badges yet — badges reflect real deal activity and decision behavior.");
      }
    } catch {
      toast.error("Evaluation failed — try again.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: font.display }}>Your badges</div>
        <button onClick={runEvaluation} disabled={evaluating}
          style={{ fontSize: 12, color: color.inkTertiary, background: "transparent", border: "none", cursor: "pointer", opacity: evaluating ? 0.6 : 1 }}>
          {evaluating ? "Evaluating…" : "Re-check"}
        </button>
      </div>
      {badges.length > 0 ? (
        <BadgeDisplay badges={badges} size="md" context="profile" />
      ) : (
        <p style={{ fontSize: 12, color: color.inkTertiary, lineHeight: 1.5 }}>
          No badges yet. Investor badges are earned from real behavior founders care about —
          deciding quickly, never ghosting, and giving reasons on every pass.
        </p>
      )}
    </Card>
  );
}

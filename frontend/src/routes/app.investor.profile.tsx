import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState, useRef, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import {
  Loader2, Save, Plus, X, Pencil, Trash2,
  Globe, Users, Linkedin, UserCircle2, Mail, Upload,
  Paperclip, CheckCircle2, XCircle, Clock, Lightbulb, Sparkles,
  ChevronDown, Link as LinkIcon, Copy, Eye, EyeOff,
  Trophy, Briefcase, Settings2, Building2,
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

export const Route = createFileRoute("/app/investor/profile")({
  component: InvestorProfilePage,
});

// ── Types ─────────────────────────────────────────────────────────

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
  profile_slug: string;
  profile_published: boolean;
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

const EMPTY_FORM: ProfileForm = {
  fund_name: "", your_name: "", role: "Partner", fund_size: "",
  social_links: [],
  thesis_statement: "", secret_sauce: "", thesis: "",
  sectors: "", stages: [], check_size_min: "",
  check_size_max: "", geography: "", portfolio_companies: "",
  red_flags: "", key_metrics: "",
  thesis_bullets: [], achievements: [],
  profile_slug: "", profile_published: false,
};

// ── Helpers ───────────────────────────────────────────────────────

const input = "w-full rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function BulletEditor({ bullets, onChange, placeholder }: { bullets: string[]; onChange: (b: string[]) => void; placeholder: string }) {
  const add = () => onChange([...bullets, ""]);
  const update = (i: number, v: string) => { const next = [...bullets]; next[i] = v; onChange(next); };
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
          <input value={b} onChange={(e) => update(i, e.target.value)}
            className={cn(input, "flex-1")} placeholder={placeholder} />
          <button type="button" onClick={() => remove(i)}
            className="mt-1.5 grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 rounded-lg px-3 py-1.5 w-full justify-center hover:bg-accent transition-colors">
        <Plus className="h-3.5 w-3.5" /> Add bullet
      </button>
    </div>
  );
}

type AccordionSection = "setup" | "thesis" | "achievements" | "team" | "portfolio" | "sharing";

function AccordionBlock({
  id, open, onToggle, icon: Icon, title, description, children,
}: {
  id: AccordionSection;
  open: boolean;
  onToggle: (id: AccordionSection) => void;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div data-tour={id === "thesis" ? "thesis-accordion" : undefined} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-6 py-5 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-brand shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-1 border-t border-border/40 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export function InvestorProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const search = useSearch({ strict: false }) as { tour?: string };
  const { progress, markStep, setCurrentStep } = useOnboardingProgress();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [attachingClaim, setAttachingClaim] = useState<{ type: string; label: string; value: string } | null>(null);
  const [open, setOpen] = useState<Set<AccordionSection>>(new Set(["setup", "thesis", "achievements", "team", "portfolio"]));

  const toggleSection = (id: AccordionSection) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
    // Build default thesis_bullets from structured fields if none saved
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

    // Parse social_links from DB or build from legacy fields
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
      profile_slug: existing.profile_slug ?? slugify(existing.fund_name ?? ""),
      profile_published: existing.profile_published ?? false,
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

  // Auto-generate slug from fund name if slug is empty
  const prevFundName = useRef("");
  useEffect(() => {
    if (form.fund_name !== prevFundName.current) {
      prevFundName.current = form.fund_name;
      if (!form.profile_slug || form.profile_slug === slugify(prevFundName.current)) {
        setForm((f) => ({ ...f, profile_slug: slugify(form.fund_name) }));
      }
    }
  }, [form.fund_name]);

  const handleSave = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!user?.id) return;
    if (!form.fund_name.trim() || !form.your_name.trim()) {
      toast.error("Fund name and your name are required");
      return;
    }
    setSaving(true);
    try {
      // Derive linkedin_url and website from social_links for backwards compat
      const linkedinEntry = form.social_links.find((l) => l.platform === "LinkedIn");
      const websiteEntry = form.social_links.find((l) => l.platform === "Website");

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
        profile_slug: form.profile_slug || slugify(form.fund_name),
        profile_published: form.profile_published,
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["investor-profile", user.id] });

      if (form.thesis_statement.trim()) {
        try {
          await markStep("thesis_set", true);
          await setCurrentStep("directory");
        } catch {
          // Non-fatal — onboarding progress is best-effort, never blocks saving.
        }
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
      <div className="w-full p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        {[1, 2, 3].map((n) => <div key={n} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  const verificationScore = tier1Passed ? 75 : null;
  const profileUrl = `${import.meta.env.VITE_APP_URL || "https://hockystick.app"}/i/${form.profile_slug}`;

  const showThesisSpotlight =
    search.tour === "thesis" &&
    progress?.account_type === "investor" &&
    progress.current_step === "thesis";

  return (
    <div className="w-full p-6 lg:p-8 max-w-7xl mx-auto">
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

      {/* ── HERO CARD ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 mb-8">
        <div className="flex items-start gap-5">
          <label className="relative cursor-pointer group shrink-0">
            <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-brand flex items-center justify-center text-brand-foreground text-2xl font-bold">
              {avatarUploading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                : <span>{(form.your_name || user?.fullName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}</span>}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-4 w-4 text-foreground" />
            </div>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          </label>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">
              {form.your_name || "Your name"}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">
                {form.role || "Partner"}{form.fund_name ? ` · ${form.fund_name}` : ""}
              </span>
              {form.fund_size && (
                <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{form.fund_size} fund</span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {verificationScore !== null
                ? <span className="inline-flex items-center gap-1.5 text-[11px] bg-success/10 text-success border border-success/20 rounded-full px-2.5 py-1 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Hockystick Checked · {verificationScore}/100
                  </span>
                : <span className="inline-flex items-center gap-1.5 text-[11px] bg-muted text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
                    <Clock className="h-3 w-3" /> Not yet verified
                  </span>
              }
              {form.profile_published
                ? <span className="inline-flex items-center gap-1.5 text-[11px] bg-accent text-brand border border-brand/20 rounded-full px-2.5 py-1 font-medium">
                    <Eye className="h-3 w-3" /> Profile public
                  </span>
                : <span className="inline-flex items-center gap-1.5 text-[11px] bg-muted text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
                    <EyeOff className="h-3 w-3" /> Profile private
                  </span>
              }
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {form.social_links.map((l, i) => {
              const url = l.url.startsWith("http") ? l.url : `https://${l.url}`;
              return (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
                  title={l.platform}>
                  {l.platform === "LinkedIn" ? <Linkedin className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ──────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">

        {/* ── LEFT: accordion sections ─────────────────────────────── */}
        <div className="space-y-4">

          {/* 1. Quick setup */}
          <AccordionBlock id="setup" open={open.has("setup")} onToggle={toggleSection}
            icon={Settings2} title="Quick setup" description="Fund name, your name, role, and social links">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Fund name *">
                <input value={form.fund_name} onChange={(e) => set("fund_name", e.target.value)}
                  required className={input} placeholder="Acme Ventures" />
              </Field>
              <Field label="Your name *">
                <input value={form.your_name} onChange={(e) => set("your_name", e.target.value)}
                  required className={input} placeholder="Jane Doe" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Role">
                <select value={form.role} onChange={(e) => set("role", e.target.value)} className={input}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Fund size" badge={<FieldVerificationBadge profileType="investor" fieldName="fund_size"
                  claimStatus={claimByType("fund_size")?.proof_status}
                  onAttachProof={user?.id ? () => setAttachingClaim({ type: "fund_size", label: "Fund size", value: form.fund_size }) : undefined} compact />}>
                <input value={form.fund_size} onChange={(e) => set("fund_size", e.target.value)}
                  className={input} placeholder="$50M" />
              </Field>
            </div>

            {/* Flexible social links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Social links</label>
              </div>
              <div className="space-y-2">
                {form.social_links.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={link.platform}
                      onChange={(e) => {
                        const next = [...form.social_links];
                        next[i] = { ...next[i], platform: e.target.value };
                        set("social_links", next);
                      }}
                      className="rounded-[10px] border border-border/60 bg-background px-2 py-2 text-xs focus:outline-none focus:border-brand/50 w-36 shrink-0"
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
                      className={cn(input, "flex-1")}
                      placeholder="https://…"
                    />
                    <button type="button" onClick={() => set("social_links", form.social_links.filter((_, idx) => idx !== i))}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => set("social_links", [...form.social_links, { platform: "LinkedIn", url: "" }])}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/60 rounded-lg px-3 py-1.5 w-full justify-center hover:bg-accent transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add link
                </button>
              </div>
            </div>
          </AccordionBlock>

          {/* 2. Investment thesis */}
          <AccordionBlock id="thesis" open={open.has("thesis")} onToggle={toggleSection}
            icon={Lightbulb} title="Investment thesis" description="Your one-sentence thesis, bullet points, and what makes your conviction different">
            {/* Thesis statement — hero field */}
            <div className="rounded-lg border border-brand/20 bg-accent p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                <Lightbulb className="h-3.5 w-3.5" /> Thesis statement
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                One sentence formula: <em>[Fund] is a [$ size] [stage] fund in [geography] backing [sector] companies with [edge].</em>
              </p>
              <textarea value={form.thesis_statement} onChange={(e) => set("thesis_statement", e.target.value)}
                rows={3} className="w-full rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
                placeholder="Acme Ventures is a $50M seed fund in North America backing developer-tools companies, leveraging our team's 20 years of engineering leadership at Google and Stripe." />
            </div>

            {/* Thesis bullets */}
            <Field label="Thesis bullets — edit or add your investment parameters">
              <BulletEditor bullets={form.thesis_bullets} onChange={(b) => set("thesis_bullets", b)}
                placeholder="e.g. Sectors: DevTools, AI/ML, B2B SaaS" />
            </Field>

            {/* Underlying structured fields — hidden but saved, used by matching */}
            <details className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground list-none flex items-center gap-1">
                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                Advanced matching fields (used by AI scoring — edit if bullets don't capture them)
              </summary>
              <div className="mt-3 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Sectors">
                    <input value={form.sectors} onChange={(e) => set("sectors", e.target.value)} className={input} placeholder="DevTools, AI/ML, Fintech" />
                  </Field>
                  <Field label="Geography">
                    <input value={form.geography} onChange={(e) => set("geography", e.target.value)} className={input} placeholder="North America, Europe" />
                  </Field>
                </div>
                <Field label="Stages">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {STAGES.map((s) => {
                      const active = form.stages.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleStage(s)}
                          className={cn("px-3 py-1.5 rounded-full text-xs border transition-colors",
                            active ? "bg-gradient-brand text-brand-foreground border-transparent shadow-glow" : "border-border/60 bg-background hover:bg-accent")}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Check min" badge={<FieldVerificationBadge profileType="investor" fieldName="check_size_min" claimStatus={claimByType("check_size_min")?.proof_status} onAttachProof={user?.id ? () => setAttachingClaim({ type: "check_size_min", label: "Min check", value: form.check_size_min }) : undefined} compact />}>
                    <input value={form.check_size_min} onChange={(e) => set("check_size_min", e.target.value)} className={input} placeholder="$250K" />
                  </Field>
                  <Field label="Check max" badge={<FieldVerificationBadge profileType="investor" fieldName="check_size_max" claimStatus={claimByType("check_size_max")?.proof_status} onAttachProof={user?.id ? () => setAttachingClaim({ type: "check_size_max", label: "Max check", value: form.check_size_max }) : undefined} compact />}>
                    <input value={form.check_size_max} onChange={(e) => set("check_size_max", e.target.value)} className={input} placeholder="$2M" />
                  </Field>
                </div>
                <Field label="What you don't invest in">
                  <textarea value={form.red_flags} onChange={(e) => set("red_flags", e.target.value)} rows={2} className={cn(input, "resize-none")} placeholder="No crypto, no consumer apps…" />
                </Field>
              </div>
            </details>

            <Field label="Secret sauce — what makes your conviction different">
              <textarea value={form.secret_sauce} onChange={(e) => set("secret_sauce", e.target.value)}
                rows={2} className={cn(input, "resize-none")}
                placeholder="Deep engineering network at FAANG, 3 unicorn exits as an operator, active board seat pattern from day one." />
            </Field>
          </AccordionBlock>

          {/* 3. Achievements */}
          <AccordionBlock id="achievements" open={open.has("achievements")} onToggle={toggleSection}
            icon={Trophy} title="Achievements" description="Track record, exits, recognitions — bullet points shown on your public profile">
            <BulletEditor bullets={form.achievements} onChange={(b) => set("achievements", b)}
              placeholder="e.g. Led Series A in Stripe (2016), returned 12x" />
          </AccordionBlock>

          {/* 4. Team */}
          <AccordionBlock id="team" open={open.has("team")} onToggle={toggleSection}
            icon={Users} title="Team" description="Partners and associates visible to founders in your deal rooms">
            {existing?.id ? (
              <InvestorTeamSection
                profileId={existing.id}
                investorUserId={user?.id ?? ""}
                investorName={form.your_name || user?.email || "Investor"}
                fundName={form.fund_name}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Save your profile first to add team members.</p>
            )}
          </AccordionBlock>

          {/* 5. Portfolio */}
          <AccordionBlock id="portfolio" open={open.has("portfolio")} onToggle={toggleSection}
            icon={Briefcase} title="Portfolio showcase" description="Companies you've invested in — curated showcase, separate from your active pipeline">
            {existing?.id ? (
              <SectionErrorBoundary>
                <PortfolioSection profileId={existing.id} />
              </SectionErrorBoundary>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Save your profile first to add portfolio companies.</p>
            )}
          </AccordionBlock>

          {/* Save */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-glow disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Saved ✓" : existing ? "Save changes" : "Save & continue"}
            </button>
          </div>
        </div>

        {/* ── RIGHT: sidebar ──────────────────────────────────────── */}
        <div className="space-y-5 self-start lg:sticky lg:top-6">

          {/* Shareable profile card */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand" />
              <div className="text-sm font-semibold">Shareable profile</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium">{form.profile_published ? "Public" : "Private"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {form.profile_published
                    ? "Anyone with the link can view your profile"
                    : "Only founders you've connected with can see your profile"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => set("profile_published", !form.profile_published)}
                className={cn("h-6 w-11 rounded-full transition-colors relative shrink-0", form.profile_published ? "hs-gradient" : "bg-muted")}
              >
                <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform", form.profile_published ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </div>

            <Field label="Profile URL slug">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground shrink-0 pl-1">/i/</span>
                <input
                  value={form.profile_slug}
                  onChange={(e) => set("profile_slug", slugify(e.target.value))}
                  className={cn(input, "flex-1")}
                  placeholder="acme-ventures"
                />
              </div>
            </Field>

            {form.profile_published && (
              <div className="rounded-lg border border-border/60 bg-background px-3 py-2 flex items-center gap-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1">{profileUrl}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(profileUrl); toast.success("Link copied"); }}
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{
                background: "rgba(124,58,237,0.10)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "#A855F7",
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              View public profile ↗
            </a>
          </div>

          {/* Verification status */}
          {user?.id && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <VerificationSection
                entityType="investor"
                entityId={user.id}
                userId={user.id}
                userEmail={user?.email ?? ""}
                displayName={form.your_name || form.fund_name || "Investor"}
              />
            </div>
          )}

          {/* Capital verification — Tier 3 */}
          {user?.id && (
            <CapitalVerificationSection
              investorId={user.id}
              fundName={form.fund_name}
              userEmail={user.email ?? ""}
              displayName={form.your_name || form.fund_name || "Investor"}
            />
          )}

          {/* Investor badges — activity + founder-facing trust signals */}
          {existing?.id && user?.id && (
            <InvestorBadgesCard profileId={existing.id} userId={user.id} />
          )}

          {/* Fund at a glance */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card space-y-3">
            <div className="text-sm font-semibold">Fund at a glance</div>
            {[
              [Building2, "Fund", form.fund_name],
              [UserCircle2, "Role", form.role],
            ].map(([Icon, label, val]: any) => (
              <div key={label} className="flex items-start gap-2.5 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                  <div className="font-medium text-sm truncate">{val || "—"}</div>
                </div>
              </div>
            ))}
            {form.thesis_statement && (
              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1"><Sparkles className="h-3 w-3 text-brand" /> Thesis</div>
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-4">{form.thesis_statement}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proof modal */}
      {attachingClaim && user?.id && (
        <AttachInvestorProofModal
          claim={attachingClaim}
          investorId={user.id}
          onClose={() => setAttachingClaim(null)}
          onDone={() => { refetchInvestorClaims(); setAttachingClaim(null); }}
        />
      )}
    </div>
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
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Companies you've invested in and want to showcase — separate from your active pipeline in Startups.</p>

      {!showForm && (
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow">
          <Plus className="h-3.5 w-3.5" /> Add portfolio company
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-none border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{editingId ? "Edit company" : "New company"}</div>
            <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Company name *</label>
              <input value={pf.company_name} onChange={(e) => setPf((f) => ({ ...f, company_name: e.target.value }))} required className={cn(input, "mt-1")} placeholder="Stripe" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Website</label>
              <input value={pf.website_url} onChange={(e) => setPf((f) => ({ ...f, website_url: e.target.value }))} className={cn(input, "mt-1")} placeholder="https://stripe.com" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <textarea value={pf.description} onChange={(e) => setPf((f) => ({ ...f, description: e.target.value }))} rows={2} className={cn(input, "mt-1 resize-none")} placeholder="Online payments infrastructure. Led seed round, 8x return at IPO." />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={closeForm} className="rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow disabled:opacity-50">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">Couldn't load portfolio — try refreshing the page.</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No portfolio companies added yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {entries.map((e) => (
            <div key={e.id} className="rounded-none border border-border/60 bg-background p-4 flex items-start gap-3 group">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-gradient-brand flex items-center justify-center text-brand-foreground text-sm font-bold shrink-0">
                {e.logo_url ? <img src={e.logo_url} alt={e.company_name} className="h-full w-full object-cover" /> : <span>{e.company_name.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{e.company_name}</div>
                {e.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.description}</div>}
                {e.website_url && (
                  <a href={e.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline mt-1">
                    <Globe className="h-2.5 w-2.5" /> Website
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => { setPf({ company_name: e.company_name, description: e.description ?? "", website_url: e.website_url ?? "", logo_url: e.logo_url ?? "" }); setEditingId(e.id); setShowForm(true); }}
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-accent">
                  <Pencil className="h-3 w-3" />
                </button>
                <button onClick={() => handleDelete(e.id)} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3" />
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
  onDone: () => void;
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
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, maxWidth: 460, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Attach proof for claim</div>
            <div className="text-xs text-muted-foreground mt-1">{claim.label}: <span className="text-muted-foreground">{claim.value}</span></div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        {!result ? (
          <>
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }} className="text-xs text-muted-foreground leading-relaxed">
              Upload a document containing evidence for this claim. AI will cross-check it.
            </div>
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px dashed var(--border)", borderRadius: 10, padding: "24px 16px", cursor: "pointer", gap: 8, marginBottom: 16 }}>
              <Paperclip className="h-5 w-5 text-faint" />
              <span className="text-xs text-muted-foreground text-center">{file ? file.name : "Click to select PDF, DOCX, XLSX, CSV"}</span>
              <input type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-xs text-muted-foreground hover:text-muted-foreground">Cancel</button>
              <button onClick={handleAttach} disabled={!file || running}
                style={{ background: !file || running ? "rgba(124,58,237,0.3)" : "var(--gradient-brand)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: !file || running ? "not-allowed" : "pointer" }}>
                {running ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span> : "Attach & verify"}
              </button>
            </div>
          </>
        ) : (
          <>
            {result.proof_status === "ai_confirmed" && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-[#10B981] text-sm font-medium mb-1"><CheckCircle2 className="h-4 w-4" /> Claim confirmed</div>
                <p className="text-xs text-muted-foreground">{result.ai_result?.explanation}</p>
              </div>
            )}
            {result.proof_status === "ai_mismatch" && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-[#EF4444] text-sm font-medium mb-1"><XCircle className="h-4 w-4" /> Claim doesn't match</div>
                <p className="text-xs text-muted-foreground">{result.ai_result?.explanation}</p>
              </div>
            )}
            {result.proof_status === "pending_review" && (
              <div style={{ background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-1"><Clock className="h-4 w-4" /> Proof attached</div>
                <p className="text-xs text-muted-foreground">AI check inconclusive — set to pending review.</p>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onDone} style={{ background: "var(--gradient-brand)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Done</button>
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
    <div className="space-y-4">
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow">
          <Plus className="h-3.5 w-3.5" /> Add member
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-none border border-border/60 bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{editingId ? "Edit member" : "New member"}</div>
            <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer group shrink-0">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-brand flex items-center justify-center text-brand-foreground font-bold">
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : mf.avatar_url ? <img src={mf.avatar_url} alt="" className="h-full w-full object-cover" /> : <span>{(mf.name || "?").charAt(0).toUpperCase()}</span>}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="h-3 w-3 text-foreground" /></div>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </label>
            <div className="text-xs text-muted-foreground">Photo (optional, max 2MB)</div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Full name *</label><input value={mf.name} onChange={(e) => setMf((f) => ({ ...f, name: e.target.value }))} required className={cn(input, "mt-1")} placeholder="Jane Doe" /></div>
            <div><label className="text-xs text-muted-foreground">Designation</label><input value={mf.designation} onChange={(e) => setMf((f) => ({ ...f, designation: e.target.value }))} className={cn(input, "mt-1")} placeholder="General Partner" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Role *</label><input value={mf.role} onChange={(e) => setMf((f) => ({ ...f, role: e.target.value }))} required className={cn(input, "mt-1")} placeholder="Partner" /></div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div className={cn("h-4 w-8 rounded-full relative transition-colors", mf.is_admin ? "hs-gradient" : "bg-muted")} onClick={() => setMf((f) => ({ ...f, is_admin: !f.is_admin }))}>
                  <div className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform", mf.is_admin ? "translate-x-4" : "translate-x-0.5")} />
                </div>
                <span className="text-xs text-muted-foreground">Fund admin</span>
              </label>
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground">LinkedIn URL</label><input value={mf.linkedin_url} onChange={(e) => setMf((f) => ({ ...f, linkedin_url: e.target.value }))} className={cn(input, "mt-1")} placeholder="https://linkedin.com/in/…" /></div>
          {!editingId && <div><label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email (optional — sends invite)</label><input type="email" value={mf.email} onChange={(e) => setMf((f) => ({ ...f, email: e.target.value }))} className={cn(input, "mt-1")} placeholder="partner@fund.com" /></div>}
          <div><label className="text-xs text-muted-foreground">Short bio</label><textarea value={mf.bio} onChange={(e) => setMf((f) => ({ ...f, bio: e.target.value }))} rows={2} className={cn(input, "mt-1 resize-none")} placeholder="Former operator turned investor." /></div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={closeForm} className="rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent">Cancel</button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow disabled:opacity-50">
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} {editingId ? "Update" : "Add"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
       : members.length === 0 && !showForm ? <div className="py-8 text-center text-sm text-muted-foreground">No team members yet — add partners and associates visible to founders.</div>
       : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-none border border-border/60 bg-background p-3 hover:bg-accent/30 group">
              <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-brand flex items-center justify-center text-brand-foreground text-xs font-semibold shrink-0">
                {m.avatar_url ? <img src={m.avatar_url} alt={m.name} className="h-full w-full object-cover" /> : <span>{m.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.designation && <span className="text-[10px] bg-accent text-brand px-1.5 py-0.5 rounded-full font-medium">{m.designation}</span>}
                  {m.role && m.role !== m.designation && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{m.role}</span>}
                  {m.is_admin && <span className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded-full font-semibold uppercase">Admin</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                <button onClick={() => openEdit(m)} className="grid h-7 w-7 place-items-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(m.id)} className={cn("grid h-7 w-7 place-items-center rounded-md transition-colors", deletingId === m.id ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10")}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section error boundary ────────────────────────────────────────
// Prevents a failed section query from blanking the entire page.

class SectionErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-sm text-muted-foreground">Couldn't load this section — try refreshing the page.</p>
          <button
            className="mt-2 text-xs text-brand hover:underline"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Field helper ──────────────────────────────────────────────────

function Field({ label, badge, children }: { label: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs text-muted-foreground">{label}</label>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Investor badges card — earned badges + manual evaluation ─────────────────

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
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Your badges</div>
        <button
          onClick={runEvaluation}
          disabled={evaluating}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {evaluating ? "Evaluating…" : "Re-check"}
        </button>
      </div>
      {badges.length > 0 ? (
        <BadgeDisplay badges={badges} size="md" context="profile" />
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          No badges yet. Investor badges are earned from real behavior founders care about —
          deciding quickly, never ghosting, and giving reasons on every pass.
        </p>
      )}
    </div>
  );
}

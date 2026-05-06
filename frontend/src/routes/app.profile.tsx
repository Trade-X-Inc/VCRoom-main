import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Globe, Users, Upload, Pencil, Trash2, Plus, X, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profile")({
  component: Profile,
});

interface StartupRow {
  id: string;
  company_name: string;
  sector: string | null;
  stage: string | null;
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
  logo_url: string | null;
  pitch_deck_url: string | null;
}

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  linkedin_url: string | null;
  bio: string | null;
  photo_url: string | null;
  tag: string | null;
  display_order: number;
}

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth"];
const MEMBER_TAGS = ["Founder", "Co-Founder", "Advisor", "Employee", "Board Member"] as const;

type FormState = {
  company_name: string; sector: string; stage: string; country: string;
  funding_target: string; valuation: string; traction: string; revenue: string;
  team_size: string; description: string; website: string;
  problem: string; solution: string; business_model: string; use_of_funds: string;
};

const emptyForm: FormState = {
  company_name: "", sector: "", stage: "", country: "",
  funding_target: "", valuation: "", traction: "", revenue: "",
  team_size: "", description: "", website: "",
  problem: "", solution: "", business_model: "", use_of_funds: "",
};

function fromStartup(s: StartupRow): FormState {
  return {
    company_name: s.company_name ?? "",
    sector: s.sector ?? "",
    stage: s.stage ?? "",
    country: s.country ?? "",
    funding_target: s.funding_target ?? "",
    valuation: s.valuation ?? "",
    traction: s.traction ?? "",
    revenue: s.revenue ?? "",
    team_size: s.team_size?.toString() ?? "",
    description: s.description ?? "",
    website: s.website ?? "",
    problem: s.problem ?? "",
    solution: s.solution ?? "",
    business_model: s.business_model ?? "",
    use_of_funds: s.use_of_funds ?? "",
  };
}

function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: startup, isLoading } = useQuery<StartupRow | null>({
    queryKey: ["my-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("*")
        .eq("founder_id", user!.id)
        .limit(1)
        .maybeSingle();
      return data as StartupRow | null;
    },
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [deckName, setDeckName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [deckUploading, setDeckUploading] = useState(false);

  useEffect(() => {
    if (startup) {
      setForm(fromStartup(startup));
      setLogoUrl(startup.logo_url ?? null);
      if (startup.pitch_deck_url) {
        const parts = startup.pitch_deck_url.split("/");
        setDeckName(decodeURIComponent(parts[parts.length - 1] ?? "pitch-deck.pdf").replace(/^\d+-/, ""));
      }
    }
  }, [startup]);

  const field = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const payload = {
        company_name: form.company_name,
        sector: form.sector || null,
        stage: form.stage || null,
        country: form.country || null,
        funding_target: form.funding_target || null,
        valuation: form.valuation || null,
        traction: form.traction || null,
        revenue: form.revenue || null,
        team_size: form.team_size ? parseInt(form.team_size, 10) : null,
        description: form.description || null,
        website: form.website || null,
        problem: form.problem || null,
        solution: form.solution || null,
        business_model: form.business_model || null,
        use_of_funds: form.use_of_funds || null,
      };
      if (startup?.id) {
        const { error } = await supabase.from("startups").update(payload).eq("id", startup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("startups").insert({ ...payload, founder_id: user.id });
        if (error) throw error;
      }
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
      queryClient.invalidateQueries({ queryKey: ["my-startup-overview"] });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
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
        await supabase.from("startups").update({ logo_url: url }).eq("id", startup.id);
        queryClient.invalidateQueries({ queryKey: ["my-startup", user.id] });
      }
      toast.success("Logo updated");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setLogoUploading(false);
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
        await supabase.from("startups").update({ pitch_deck_url: path }).eq("id", startup.id);
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

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{startup ? "Company Profile" : "Create your profile"}</h1>
          <div className="text-sm text-muted-foreground">{startup ? "Edit your startup details, team, and pitch." : "Set up your startup profile so investors know who you are."}</div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save changes
        </button>
      </div>

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
              <div className="text-sm text-muted-foreground">{form.description || "Add a tagline below"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid lg:grid-cols-3 gap-4">
        {/* Left: form */}
        <div className="lg:col-span-2 space-y-4">
          <FormSection title="Company basics">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Company name" value={form.company_name} onChange={field("company_name")} placeholder="Atlas Robotics" />
              <Field label="Website" value={form.website} onChange={field("website")} placeholder="https://example.com" />
              <Field label="Sector" value={form.sector} onChange={field("sector")} placeholder="B2B SaaS, Fintech…" />
              <div>
                <label className="text-xs text-muted-foreground">Stage</label>
                <select value={form.stage} onChange={field("stage")} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50">
                  <option value="">Select stage</option>
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="Country / HQ" value={form.country} onChange={field("country")} placeholder="San Francisco, USA" />
              <Field label="Team size" value={form.team_size} onChange={field("team_size")} placeholder="12" type="number" />
            </div>
            <TextArea label="Tagline / description" value={form.description} onChange={field("description")} placeholder="One-line description of your company" rows={2} />
          </FormSection>

          <FormSection title="Fundraising">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Funding target" value={form.funding_target} onChange={field("funding_target")} placeholder="$5M" />
              <Field label="Pre-money valuation" value={form.valuation} onChange={field("valuation")} placeholder="$20M" />
            </div>
            <TextArea label="Use of funds" value={form.use_of_funds} onChange={field("use_of_funds")} placeholder="40% engineering, 30% sales, 30% ops" rows={2} />
          </FormSection>

          <FormSection title="Traction & metrics">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Revenue / ARR" value={form.revenue} onChange={field("revenue")} placeholder="$1.2M ARR" />
              <Field label="Traction highlight" value={form.traction} onChange={field("traction")} placeholder="500 customers, +15% MoM" />
            </div>
          </FormSection>

          <FormSection title="Pitch content">
            <TextArea label="Problem" value={form.problem} onChange={field("problem")} placeholder="What problem are you solving?" rows={3} />
            <TextArea label="Solution" value={form.solution} onChange={field("solution")} placeholder="How does your product solve it?" rows={3} />
            <TextArea label="Business model" value={form.business_model} onChange={field("business_model")} placeholder="How do you make money?" rows={2} />
          </FormSection>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Pitch deck */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Pitch deck</div>
            {deckName ? (
              <div className="rounded-lg border border-border/60 bg-accent/30 p-3">
                <div className="text-sm font-medium truncate">{deckName}</div>
                <div className="text-xs text-muted-foreground mt-0.5 mb-2">Uploaded</div>
                <label className="text-xs text-brand hover:underline cursor-pointer">
                  Replace
                  <input type="file" accept=".pdf,.pptx,.key" className="sr-only" onChange={(e) => e.target.files?.[0] && handleDeckUpload(e.target.files[0])} />
                </label>
              </div>
            ) : (
              <label className="rounded-xl border-2 border-dashed border-border/80 bg-card p-5 text-center cursor-pointer hover:border-brand/50 hover:bg-accent/20 transition-colors block">
                {deckUploading
                  ? <Loader2 className="h-5 w-5 text-muted-foreground mx-auto animate-spin" />
                  : <Upload className="h-5 w-5 text-muted-foreground mx-auto" />}
                <div className="text-sm font-medium mt-2">{deckUploading ? "Uploading…" : "Upload pitch deck"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">PDF, PPTX or Keynote</div>
                <input type="file" accept=".pdf,.pptx,.key" className="sr-only" onChange={(e) => e.target.files?.[0] && handleDeckUpload(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Stats preview */}
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="text-sm font-semibold mb-3">Overview preview</div>
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
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Team members - only after startup exists */}
      {startup?.id && <TeamMembersSection startupId={startup.id} />}

      {!startup?.id && !isLoading && (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          Save your profile first to add team members.
        </div>
      )}
    </div>
  );
}

// ── Reusable field components ──────────────────────────────────────────────
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
      <div className="text-sm font-semibold mb-4">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
      />
    </div>
  );
}

// ── Team Members Section ───────────────────────────────────────────────────
function TeamMembersSection({ startupId }: { startupId: string }) {
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
        .from("team_members")
        .select("*")
        .eq("startup_id", startupId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const openEdit = (m: TeamMember) => {
    setMf({
      full_name: m.full_name,
      role: m.role,
      email: m.email ?? "",
      linkedin_url: m.linkedin_url ?? "",
      bio: m.bio ?? "",
      tag: m.tag ?? "Employee",
      photo_url: m.photo_url ?? "",
    });
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
    } catch (e: any) {
      toast.error("Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!mf.full_name.trim() || !mf.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        full_name: mf.full_name,
        role: mf.role,
        email: mf.email || null,
        linkedin_url: mf.linkedin_url || null,
        bio: mf.bio || null,
        tag: mf.tag || null,
        photo_url: mf.photo_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("team_members").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Team member updated");
      } else {
        const { error } = await supabase
          .from("team_members")
          .insert({ ...payload, startup_id: startupId, display_order: members.length });
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
    Founder: "bg-violet/10 text-violet",
    "Co-Founder": "bg-violet/10 text-violet",
    Advisor: "bg-warning/10 text-warning",
    Employee: "bg-brand/10 text-brand",
    "Board Member": "bg-success/10 text-success",
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight">Team members</h2>
        <button
          onClick={() => { closeForm(); setShowForm((v) => !v); }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" /> Add member
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mb-5 rounded-xl border border-brand/30 bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">{editingId ? "Edit team member" : "New team member"}</div>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-3">
            {/* Photo */}
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
                <label className="text-xs text-muted-foreground">Full name *</label>
                <input value={mf.full_name} onChange={setField("full_name")} placeholder="Jane Smith" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role / title *</label>
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
                <input value={mf.email} onChange={setField("email")} type="email" placeholder="jane@company.com" className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
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

      {/* Members grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-4 h-24 animate-pulse" />
          ))}
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
            const initials = m.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={m.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent border border-border/60 overflow-hidden text-xs font-semibold shrink-0">
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover" />
                      : initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.role}</div>
                    {m.tag && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block", tagColor[m.tag] ?? "bg-muted text-muted-foreground")}>
                        {m.tag}
                      </span>
                    )}
                  </div>
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

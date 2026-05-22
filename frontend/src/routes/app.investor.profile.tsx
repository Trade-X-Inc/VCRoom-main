import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2, Loader2, Save, Plus, X, Pencil, Trash2,
  Globe, Users, Linkedin, ExternalLink, UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/investor/profile")({
  component: InvestorProfilePage,
});

// ── Types ─────────────────────────────────────────────────────────

interface ProfileForm {
  fund_name: string;
  your_name: string;
  role: string;
  fund_size: string;
  thesis: string;
  sectors: string;
  stages: string[];
  check_size_min: string;
  check_size_max: string;
  geography: string;
  portfolio_companies: string;
  linkedin_url: string;
  website: string;
  red_flags: string;
  key_metrics: string;
}

interface TeamMember {
  id: string;
  investor_profile_id: string;
  name: string;
  role: string;
  linkedin_url?: string | null;
  bio?: string | null;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────

const ROLES = ["Partner", "General Partner", "Managing Partner", "Principal", "Associate", "Analyst", "Venture Partner", "EIR", "Other"];
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C", "Growth"];

const EMPTY_FORM: ProfileForm = {
  fund_name: "", your_name: "", role: "Partner", fund_size: "",
  thesis: "", sectors: "", stages: [], check_size_min: "",
  check_size_max: "", geography: "", portfolio_companies: "",
  linkedin_url: "", website: "", red_flags: "", key_metrics: "",
};

// ── Main page ─────────────────────────────────────────────────────

function InvestorProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    if (existing) {
      setForm({
        fund_name: existing.fund_name ?? "",
        your_name: existing.your_name ?? user?.fullName ?? "",
        role: existing.role ?? "Partner",
        fund_size: existing.fund_size ?? "",
        thesis: existing.thesis ?? "",
        sectors: existing.sectors ?? "",
        stages: existing.stages ? String(existing.stages).split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        check_size_min: existing.check_size_min ?? "",
        check_size_max: existing.check_size_max ?? "",
        geography: existing.geography ?? "",
        portfolio_companies: existing.portfolio_companies ?? "",
        linkedin_url: existing.linkedin_url ?? "",
        website: existing.website ?? "",
        red_flags: existing.red_flags ?? "",
        key_metrics: existing.key_metrics ?? "",
      });
    } else if (user?.fullName) {
      setForm((f) => ({ ...f, your_name: user.fullName }));
    }
  }, [existing, user?.fullName]);

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleStage = (stage: string) =>
    setForm((f) => ({
      ...f,
      stages: f.stages.includes(stage)
        ? f.stages.filter((s) => s !== stage)
        : [...f.stages, stage],
    }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!form.fund_name.trim() || !form.your_name.trim()) {
      toast.error("Fund name and your name are required");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("investor_profiles").upsert({
        user_id: user.id,
        fund_name: form.fund_name.trim(),
        your_name: form.your_name.trim(),
        role: form.role,
        fund_size: form.fund_size,
        thesis: form.thesis,
        sectors: form.sectors,
        stages: form.stages.join(","),
        check_size_min: form.check_size_min,
        check_size_max: form.check_size_max,
        geography: form.geography,
        portfolio_companies: form.portfolio_companies,
        linkedin_url: form.linkedin_url,
        website: form.website,
        red_flags: form.red_flags,
        key_metrics: form.key_metrics,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["investor-profile", user.id] });
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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-32 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {existing ? "Fund profile" : "Set up your fund profile"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tell founders about your fund — thesis, check size, and team.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Left: form */}
        <form onSubmit={handleSave} className="space-y-5">

          {/* About */}
          <Section title="About you & your fund">
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
              <Field label="Fund size">
                <input value={form.fund_size} onChange={(e) => set("fund_size", e.target.value)}
                  className={input} placeholder="$50M" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="LinkedIn URL">
                <input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)}
                  className={input} placeholder="https://linkedin.com/in/…" />
              </Field>
              <Field label="Website">
                <input value={form.website} onChange={(e) => set("website", e.target.value)}
                  className={input} placeholder="https://acme.vc" />
              </Field>
            </div>
          </Section>

          {/* Thesis */}
          <Section title="Investment thesis">
            <Field label="Thesis — what you invest in">
              <textarea value={form.thesis} onChange={(e) => set("thesis", e.target.value)}
                rows={3} className={input}
                placeholder="We back technical founders building developer infrastructure at the seed stage." />
            </Field>
            <Field label="Sectors (comma separated)">
              <input value={form.sectors} onChange={(e) => set("sectors", e.target.value)}
                className={input} placeholder="DevTools, AI, Fintech" />
            </Field>
            <Field label="Stages">
              <div className="flex flex-wrap gap-2 mt-1">
                {STAGES.map((s) => {
                  const active = form.stages.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleStage(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs border transition-colors",
                        active
                          ? "bg-gradient-brand text-brand-foreground border-transparent shadow-glow"
                          : "border-border/60 bg-background hover:bg-accent",
                      )}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Check size — min">
                <input value={form.check_size_min} onChange={(e) => set("check_size_min", e.target.value)}
                  className={input} placeholder="$250K" />
              </Field>
              <Field label="Check size — max">
                <input value={form.check_size_max} onChange={(e) => set("check_size_max", e.target.value)}
                  className={input} placeholder="$2M" />
              </Field>
            </div>
            <Field label="Geography">
              <input value={form.geography} onChange={(e) => set("geography", e.target.value)}
                className={input} placeholder="North America, Europe" />
            </Field>
            <Field label="What you DON'T invest in (red flags)">
              <textarea
                value={form.red_flags}
                onChange={(e) => set("red_flags", e.target.value)}
                rows={2}
                className={cn(input, "resize-none")}
                placeholder="No crypto, no consumer apps, no pre-revenue hardware..."
              />
            </Field>
            <Field label="Key metrics you look for">
              <textarea
                value={form.key_metrics}
                onChange={(e) => set("key_metrics", e.target.value)}
                rows={2}
                className={cn(input, "resize-none")}
                placeholder="MoM growth >10%, ARR >$100K, NPS >50, <18mo runway..."
              />
            </Field>
          </Section>

          {/* Track record */}
          <Section title="Track record">
            <Field label="Notable portfolio companies">
              <textarea value={form.portfolio_companies} onChange={(e) => set("portfolio_companies", e.target.value)}
                rows={3} className={input} placeholder="Stripe, Linear, Vercel…" />
            </Field>
          </Section>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3">
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand px-5 py-2 text-sm font-medium text-brand-foreground shadow-glow disabled:opacity-60">
              {saving
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Save className="h-3.5 w-3.5" />}
              {saved ? "Saved ✓" : existing ? "Save changes" : "Save & continue"}
            </button>
          </div>
        </form>

        {/* Right: summary card */}
        <div className="space-y-4 self-start lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card space-y-3">
            <div className="text-sm font-semibold">Fund summary</div>
            {[
              [Building2, "Fund", form.fund_name],
              [UserCircle2, "Role", form.role],
              [Globe, "Geography", form.geography],
              [Users, "Stage focus", form.stages.join(", ")],
            ].map(([Icon, label, val]: any) => (
              <div key={label} className="flex items-start gap-2 text-sm">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-medium truncate">{val || "—"}</div>
                </div>
              </div>
            ))}
            {(form.check_size_min || form.check_size_max) && (
              <div className="flex items-start gap-2 text-sm">
                <div className="h-4 w-4 shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Check size</div>
                  <div className="font-medium">
                    {form.check_size_min}{form.check_size_min && form.check_size_max ? " – " : ""}{form.check_size_max}
                  </div>
                </div>
              </div>
            )}
            {form.linkedin_url && (
              <a href={form.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
                <Linkedin className="h-3 w-3" /> LinkedIn
              </a>
            )}
            {form.website && (
              <a href={form.website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline ml-3">
                <ExternalLink className="h-3 w-3" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Team section — only shown after profile is saved */}
      {existing?.id ? (
        <div className="mt-8">
          <InvestorTeamSection profileId={existing.id} />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          Save your profile first to add team members.
        </div>
      )}
    </div>
  );
}

// ── Team section ──────────────────────────────────────────────────

function InvestorTeamSection({ profileId }: { profileId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blank = { name: "", role: "", linkedin_url: "", bio: "" };
  const [mf, setMf] = useState(blank);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["investor-team", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_team_members")
        .select("*")
        .eq("investor_profile_id", profileId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  const openEdit = (m: TeamMember) => {
    setMf({ name: m.name, role: m.role, linkedin_url: m.linkedin_url ?? "", bio: m.bio ?? "" });
    setEditingId(m.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setMf(blank); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mf.name.trim() || !mf.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("investor_team_members")
          .update({ name: mf.name.trim(), role: mf.role.trim(), linkedin_url: mf.linkedin_url || null, bio: mf.bio || null })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Team member updated");
      } else {
        const { error } = await supabase.from("investor_team_members")
          .insert({ investor_profile_id: profileId, name: mf.name.trim(), role: mf.role.trim(), linkedin_url: mf.linkedin_url || null, bio: mf.bio || null });
        if (error) throw error;
        toast.success("Team member added");
      }
      qc.invalidateQueries({ queryKey: ["investor-team", profileId] });
      closeForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
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
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div>
          <div className="text-sm font-semibold">Fund team</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Add partners and team members visible to founders
          </div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow">
            <Plus className="h-3.5 w-3.5" /> Add member
          </button>
        )}
      </div>

      {/* Add/edit form */}
      {showForm && (
        <div className="px-5 py-4 border-b border-border/60 bg-accent/20">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {editingId ? "Edit member" : "New member"}
              </div>
              <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Full name *</label>
                <input value={mf.name} onChange={(e) => setMf((f) => ({ ...f, name: e.target.value }))}
                  required className={cn(input, "mt-1")} placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Role *</label>
                <input value={mf.role} onChange={(e) => setMf((f) => ({ ...f, role: e.target.value }))}
                  required className={cn(input, "mt-1")} placeholder="Partner" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">LinkedIn URL</label>
              <input value={mf.linkedin_url} onChange={(e) => setMf((f) => ({ ...f, linkedin_url: e.target.value }))}
                className={cn(input, "mt-1")} placeholder="https://linkedin.com/in/…" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Short bio</label>
              <textarea value={mf.bio} onChange={(e) => setMf((f) => ({ ...f, bio: e.target.value }))}
                rows={2} className={cn(input, "mt-1 resize-none")}
                placeholder="Former operator turned investor. Focused on B2B SaaS." />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={closeForm}
                className="rounded-md border border-border/60 px-3 py-1.5 text-xs hover:bg-accent">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow disabled:opacity-50">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        </div>
      ) : members.length === 0 && !showForm ? (
        <div className="p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted mx-auto mb-3">
            <Users className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">No team members yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add partners and associates visible to founders in your deal rooms.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {members.map((m) => (
            <div key={m.id} className="flex items-start gap-4 px-5 py-4 hover:bg-accent/30 transition-colors group">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-sm font-semibold shrink-0">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{m.name}</div>
                  <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {m.role}
                  </span>
                </div>
                {m.bio && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.bio}</div>
                )}
                {m.linkedin_url && (
                  <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-brand hover:underline mt-1">
                    <Linkedin className="h-2.5 w-2.5" /> LinkedIn
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(m)}
                  className="grid h-7 w-7 place-items-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(m.id)}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-md transition-colors",
                    deletingId === m.id
                      ? "text-destructive bg-destructive/10"
                      : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                  )}
                  title={deletingId === m.id ? "Click again to confirm" : "Remove"}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

const input = "w-full rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
      <div className="text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

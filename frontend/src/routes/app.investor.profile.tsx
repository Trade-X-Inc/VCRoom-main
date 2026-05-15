import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/profile")({
  component: InvestorProfilePage,
});

const ROLES = ["Partner", "Principal", "Associate", "Analyst", "Other"];
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"];

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
}

const EMPTY_FORM: ProfileForm = {
  fund_name: "",
  your_name: "",
  role: "Partner",
  fund_size: "",
  thesis: "",
  sectors: "",
  stages: [],
  check_size_min: "",
  check_size_max: "",
  geography: "",
  portfolio_companies: "",
  linkedin_url: "",
  website: "",
};

function InvestorProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
      });
    } else if (user?.fullName && !form.your_name) {
      setForm((f) => ({ ...f, your_name: user.fullName }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, user?.fullName]);

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleStage = (stage: string) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.includes(stage) ? f.stages.filter((s) => s !== stage) : [...f.stages, stage],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!form.fund_name.trim() || !form.your_name.trim()) {
      toast.error("Fund name and your name are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
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
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("investor_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Profile saved");
      navigate({ to: "/app/investor", search: {} });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="h-8 w-64 rounded bg-muted animate-pulse mb-2" />
        <div className="h-4 w-96 rounded bg-muted/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {existing ? "Edit your fund profile" : "Set up your fund profile"}
          </h1>
          <div className="text-sm text-muted-foreground">
            Tell us about your fund so we can tailor deal flow and AI insights.
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="text-sm font-semibold">About you & your fund</div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Fund name *">
              <input
                value={form.fund_name}
                onChange={(e) => set("fund_name", e.target.value)}
                required
                className="input"
                placeholder="Acme Ventures"
              />
            </Field>
            <Field label="Your name *">
              <input
                value={form.your_name}
                onChange={(e) => set("your_name", e.target.value)}
                required
                className="input"
                placeholder="Jane Doe"
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Role">
              <select value={form.role} onChange={(e) => set("role", e.target.value)} className="input">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Fund size">
              <input
                value={form.fund_size}
                onChange={(e) => set("fund_size", e.target.value)}
                className="input"
                placeholder="$50M"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="text-sm font-semibold">Investment thesis</div>

          <Field label="Thesis — what you invest in">
            <textarea
              value={form.thesis}
              onChange={(e) => set("thesis", e.target.value)}
              rows={3}
              className="input"
              placeholder="We back technical founders building developer infrastructure at the seed stage."
            />
          </Field>

          <Field label="Sectors (comma separated)">
            <input
              value={form.sectors}
              onChange={(e) => set("sectors", e.target.value)}
              className="input"
              placeholder="DevTools, AI, Fintech"
            />
          </Field>

          <Field label="Stages">
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s) => {
                const active = form.stages.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStage(s)}
                    className={
                      "px-3 py-1.5 rounded-full text-xs border transition-colors " +
                      (active
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent"
                        : "border-border/60 bg-background hover:bg-accent")
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Check size — min">
              <input value={form.check_size_min} onChange={(e) => set("check_size_min", e.target.value)} className="input" placeholder="$250K" />
            </Field>
            <Field label="Check size — max">
              <input value={form.check_size_max} onChange={(e) => set("check_size_max", e.target.value)} className="input" placeholder="$2M" />
            </Field>
          </div>

          <Field label="Geography">
            <input value={form.geography} onChange={(e) => set("geography", e.target.value)} className="input" placeholder="North America, Europe" />
          </Field>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="text-sm font-semibold">Track record & links</div>

          <Field label="Portfolio companies (notable investments)">
            <textarea
              value={form.portfolio_companies}
              onChange={(e) => set("portfolio_companies", e.target.value)}
              rows={3}
              className="input"
              placeholder="Stripe, Linear, Vercel…"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="LinkedIn URL">
              <input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} className="input" placeholder="https://linkedin.com/in/…" />
            </Field>
            <Field label="Website">
              <input value={form.website} onChange={(e) => set("website", e.target.value)} className="input" placeholder="https://acme.vc" />
            </Field>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-glow disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {existing ? "Save changes" : "Save & continue"}
          </button>
        </div>
      </form>

      <style>{`
        .input {
          width: 100%;
          border-radius: 10px;
          border: 1px solid hsl(var(--border) / 0.6);
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus { border-color: hsl(var(--brand) / 0.5); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ROLES = ["Partner", "Principal", "Associate", "VP", "Angel", "Family Office", "Other"];
const CHECK_MIN = ["$10K", "$25K", "$50K", "$100K", "$250K", "$500K", "$1M", "$2M", "$5M"];
const CHECK_MAX = ["$50K", "$100K", "$250K", "$500K", "$1M", "$2M", "$5M", "$10M", "$25M", "$50M+"];

const inputCls =
  "w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-white placeholder:text-faint focus:outline-none focus:border-brand/60 focus:ring-1 focus:ring-brand/30";
const selectCls = inputCls + " appearance-none";

interface FormData {
  your_name: string;
  fund_name: string;
  role: string;
  check_size_min: string;
  check_size_max: string;
  sectors: string;
  stages: string;
  geography: string;
  linkedin_url: string;
}

const emptyForm: FormData = {
  your_name: "", fund_name: "", role: "", check_size_min: "",
  check_size_max: "", sectors: "", stages: "", geography: "", linkedin_url: "",
};

export function InvestorOnboardingModal({
  isOpen,
  onComplete,
  onCancel,
  userId,
}: {
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
  userId: string;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.your_name.trim() || !form.fund_name.trim() || !form.role ||
        !form.check_size_min || !form.check_size_max ||
        !form.sectors.trim() || !form.stages.trim() || !form.geography.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upsertError } = await supabase
      .from("investor_profiles")
      .upsert({
        user_id: userId,
        your_name: form.your_name.trim(),
        fund_name: form.fund_name.trim(),
        role: form.role,
        check_size_min: form.check_size_min,
        check_size_max: form.check_size_max,
        sectors: form.sectors.trim(),
        stages: form.stages.trim(),
        geography: form.geography.trim(),
        linkedin_url: form.linkedin_url.trim() || null,
      }, { onConflict: "user_id" });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    toast.success("Profile saved");
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-[#111118] shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
              Complete your investor profile
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Required before connecting with founders.</p>
          </div>
          <button onClick={onCancel} className="text-faint hover:text-muted-foreground transition-colors ml-4 mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Your full name *</label>
              <input value={form.your_name} onChange={set("your_name")} placeholder="Jane Smith" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Fund / firm name *</label>
              <input value={form.fund_name} onChange={set("fund_name")} placeholder="Acme Ventures or Angel" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Role *</label>
            <select value={form.role} onChange={set("role")} className={selectCls}>
              <option value="">Select role…</option>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Min check size *</label>
              <select value={form.check_size_min} onChange={set("check_size_min")} className={selectCls}>
                <option value="">Select…</option>
                {CHECK_MIN.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Max check size *</label>
              <select value={form.check_size_max} onChange={set("check_size_max")} className={selectCls}>
                <option value="">Select…</option>
                {CHECK_MAX.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Sectors you invest in *</label>
            <input value={form.sectors} onChange={set("sectors")} placeholder="e.g. FinTech, HealthTech, Robotics" className={inputCls} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Stages you invest in *</label>
            <input value={form.stages} onChange={set("stages")} placeholder="e.g. Pre-seed, Seed, Series A" className={inputCls} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Geography focus *</label>
            <input value={form.geography} onChange={set("geography")} placeholder="e.g. GCC, MENA, Global" className={inputCls} />
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">LinkedIn profile URL</label>
            <input value={form.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/..." className={inputCls} />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="pt-2 flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg hs-gradient text-foreground px-4 py-2.5 text-sm font-semibold hover:bg-[#6d28d9] disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save and connect →
            </button>
            <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

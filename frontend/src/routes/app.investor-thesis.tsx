import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, CheckCircle2, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getFounderThesis, upsertFounderThesis } from "@/lib/founder-thesis-fn";

export const Route = createFileRoute("/app/investor-thesis")({
  component: InvestorThesisPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

interface ThesisForm {
  preferred_check_size_min: string;
  preferred_check_size_max: string;
  preferred_investor_type: string;
  board_preference: string;
  sector_expertise_wanted: string;
  geography_preference: string;
  exclusions: string;
  what_good_fit_looks_like: string;
}

const EMPTY: ThesisForm = {
  preferred_check_size_min: "",
  preferred_check_size_max: "",
  preferred_investor_type: "",
  board_preference: "",
  sector_expertise_wanted: "",
  geography_preference: "",
  exclusions: "",
  what_good_fit_looks_like: "",
};

// ── Component ──────────────────────────────────────────────────────────────────

function InvestorThesisPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch the startup for this founder
  const { data: startup } = useQuery({
    queryKey: ["founder-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Fetch existing thesis
  const { data: existing, isLoading } = useQuery({
    queryKey: ["founder-thesis", startup?.id],
    enabled: !!startup?.id,
    queryFn: () => getFounderThesis({ data: { startupId: startup!.id } }),
  });

  const [form, setForm] = useState<ThesisForm>(EMPTY);

  // Populate form from existing data when loaded
  const [initialized, setInitialized] = useState(false);
  if (existing !== undefined && !initialized) {
    setInitialized(true);
    if (existing) {
      setForm({
        preferred_check_size_min: existing.preferred_check_size_min ?? "",
        preferred_check_size_max: existing.preferred_check_size_max ?? "",
        preferred_investor_type: existing.preferred_investor_type ?? "",
        board_preference: existing.board_preference ?? "",
        sector_expertise_wanted: existing.sector_expertise_wanted ?? "",
        geography_preference: existing.geography_preference ?? "",
        exclusions: existing.exclusions ?? "",
        what_good_fit_looks_like: existing.what_good_fit_looks_like ?? "",
      });
    }
  }

  function set(key: keyof ThesisForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  const isComplete = !!(
    form.preferred_check_size_min &&
    form.preferred_investor_type &&
    form.board_preference &&
    form.what_good_fit_looks_like
  );

  async function handleSave(status: "draft" | "complete") {
    if (!startup?.id) return;
    setSaving(true);
    try {
      const result = await upsertFounderThesis({
        data: {
          startupId: startup.id,
          ...form,
          status,
        },
      });
      if (!result.ok) throw new Error(result.error ?? "Save failed");
      queryClient.invalidateQueries({ queryKey: ["founder-thesis", startup.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success(status === "complete" ? "Investor thesis saved" : "Draft saved");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAlreadyComplete = existing?.status === "complete";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
            Investor Fit Criteria
          </h1>
          {isAlreadyComplete && (
            <span className="ml-2 flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Complete
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground pl-10">
          Not what you have — what kind of investor actually helps{startup?.company_name ? ` ${startup.company_name}` : " you"}. This feeds directly into how Hockystick matches you with investors.
        </p>
      </div>

      {/* Callout */}
      <div className="rounded-lg border border-purple-500/20 bg-purple-600/5 px-4 py-3 text-sm text-muted-foreground">
        This is optional and separate from your profile. Filling it out improves how well investor matches reflect what you actually want, not just whether investors are interested in your sector.
      </div>

      {/* Form */}
      <div className="space-y-6">

        {/* Check size */}
        <div className="rounded-xl bg-card border border-border/60 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              What check size actually matters to you right now?
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              The range you'd genuinely consider — not aspirational, not a floor you'd waive.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Minimum</label>
                <input
                  type="text"
                  value={form.preferred_check_size_min}
                  onChange={set("preferred_check_size_min")}
                  placeholder="e.g. $250k"
                  className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <span className="text-muted-foreground text-sm mt-5">to</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Maximum</label>
                <input
                  type="text"
                  value={form.preferred_check_size_max}
                  onChange={set("preferred_check_size_max")}
                  placeholder="e.g. $2M"
                  className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Involvement */}
        <div className="rounded-xl bg-card border border-border/60 p-5 space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Do you want an investor who's actively involved, or mostly hands-off?
          </label>
          <p className="text-xs text-muted-foreground">
            Neither answer is better — it depends on where you are and what you need.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { val: "Hands-on (board seat, regular check-ins)", label: "Hands-on", sub: "Board seat, regular check-ins" },
              { val: "Collaborative (available but not directive)", label: "Collaborative", sub: "Available when needed" },
              { val: "Hands-off (capital only, minimal involvement)", label: "Hands-off", sub: "Capital only" },
            ].map(({ val, label, sub }) => (
              <button
                key={val}
                type="button"
                onClick={() => setForm((p) => ({ ...p, board_preference: val }))}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  form.board_preference === val
                    ? "border-purple-500/60 bg-purple-600/10 text-foreground"
                    : "border-border/60 bg-background text-muted-foreground hover:border-border"
                }`}
              >
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs mt-0.5 opacity-70">{sub}</div>
              </button>
            ))}
          </div>
          {/* Free text for nuance */}
          <input
            type="text"
            value={form.board_preference.startsWith("Hands-on") || form.board_preference.startsWith("Collaborative") || form.board_preference.startsWith("Hands-off") ? "" : form.board_preference}
            onChange={(e) => setForm((p) => ({ ...p, board_preference: e.target.value }))}
            placeholder="Or describe it in your own words..."
            className="w-full mt-1 rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Investor type + expertise */}
        <div className="rounded-xl bg-card border border-border/60 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Are you looking for pure capital, or someone with specific expertise or network in your sector?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              {[
                { val: "Capital only", sub: "Money, no strings" },
                { val: "Capital + sector expertise", sub: "Knows your space" },
                { val: "Capital + network access", sub: "Opens doors" },
              ].map(({ val, sub }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, preferred_investor_type: val }))}
                  className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                    form.preferred_investor_type === val
                      ? "border-purple-500/60 bg-purple-600/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="text-sm font-medium">{val}</div>
                  <div className="text-xs mt-0.5 opacity-70">{sub}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              If expertise matters — what specifically? (sector, function, geography, network)
            </label>
            <input
              type="text"
              value={form.sector_expertise_wanted}
              onChange={set("sector_expertise_wanted")}
              placeholder="e.g. Defence procurement, GCC enterprise sales, hardware manufacturing"
              className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
            />
          </div>
        </div>

        {/* Geography */}
        <div className="rounded-xl bg-card border border-border/60 p-5 space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Does geography matter to you?
          </label>
          <p className="text-xs text-muted-foreground">
            Leave blank if you'd take capital from anywhere. Otherwise, specify what you'd prefer or require.
          </p>
          <input
            type="text"
            value={form.geography_preference}
            onChange={set("geography_preference")}
            placeholder="e.g. GCC-based, UK/Europe, US West Coast — or 'No preference'"
            className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50"
          />
        </div>

        {/* Exclusions */}
        <div className="rounded-xl bg-card border border-border/60 p-5 space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Is there anything you specifically don't want in an investor?
          </label>
          <p className="text-xs text-muted-foreground">
            Red lines, past bad experiences, conflict-of-interest risks, investor types you'd decline regardless of terms.
          </p>
          <textarea
            rows={3}
            value={form.exclusions}
            onChange={set("exclusions")}
            placeholder="e.g. No investors with portfolio conflicts in defence, no micro-managers, no tourists who don't understand hardware timelines"
            className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </div>

        {/* Free text */}
        <div className="rounded-xl bg-card border border-border/60 p-5 space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Describe what a great-fit investor looks like for you.
          </label>
          <p className="text-xs text-muted-foreground">
            In your own words — what would make you say yes immediately? This is the most useful field for matching.
          </p>
          <textarea
            rows={4}
            value={form.what_good_fit_looks_like}
            onChange={set("what_good_fit_looks_like")}
            placeholder="e.g. Someone who has backed deep-tech defence companies before, understands long procurement cycles, won't push for a pivot after 3 months, and has relationships with government procurement offices in the GCC or NATO markets."
            className="w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-purple-500/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSave("complete")}
            disabled={saving || !isComplete || !startup?.id}
            className="flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved" : "Save investor criteria"}
          </button>
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={saving || !startup?.id}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Save as draft
          </button>
          {!isComplete && (
            <span className="text-xs text-muted-foreground">
              Fill in check size, involvement, investor type, and your ideal fit description to complete.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

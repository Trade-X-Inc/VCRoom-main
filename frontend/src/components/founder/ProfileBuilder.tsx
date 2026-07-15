import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, Sparkles, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────

const STANDARD_SECTIONS = [
  { key: "executive_summary", label: "Executive Summary", display_order: 0 },
  { key: "team", label: "Team", display_order: 1 },
  { key: "problem", label: "Problem", display_order: 2 },
  { key: "solution", label: "Solution", display_order: 3 },
  { key: "market", label: "Market", display_order: 4 },
  { key: "revenue_model", label: "Revenue Model", display_order: 5 },
  { key: "traction", label: "Traction", display_order: 6 },
  { key: "financials", label: "Financials", display_order: 7 },
  { key: "legal", label: "Legal", display_order: 8 },
  { key: "product", label: "Product", display_order: 9 },
  { key: "competitive_landscape", label: "Competitive Landscape", display_order: 10 },
];

// Sections that cannot be made public
const NO_PUBLIC_SECTIONS = new Set(["financials", "revenue_model", "legal"]);

const VISIBILITY_CYCLE: Record<string, string> = {
  private: "deal_room",
  deal_room: "public",
  public: "private",
};

const VISIBILITY_LABELS: Record<string, string> = {
  private: "Private 🔒",
  deal_room: "Deal Room 🔐",
  public: "Public 🌐",
};

const VISIBILITY_CLASSES: Record<string, string> = {
  private: "bg-gray-100 text-gray-600  ",
  deal_room: "bg-purple-50 text-purple-700  ",
  public: "bg-green-50 text-green-700  ",
};

// ── Input atoms ───────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand"
      />
    </div>
  );
}

// ── Section editors ───────────────────────────────────────────────

function ExecutiveSummaryEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <TextArea
      label="Company overview"
      value={content.text ?? ""}
      onChange={(v) => onChange({ text: v })}
      placeholder="One paragraph describing what you do, for whom, and why now"
      rows={4}
    />
  );
}

function TeamEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const members: any[] = content.members ?? [];
  const update = (idx: number, field: string, val: string) => {
    const updated = members.map((m, i) => i === idx ? { ...m, [field]: val } : m);
    onChange({ members: updated });
  };
  const add = () => onChange({ members: [...members, { name: "", title: "", linkedin: "", bio: "" }] });
  const remove = (idx: number) => onChange({ members: members.filter((_, i) => i !== idx) });

  return (
    <div className="space-y-4">
      {members.map((m, idx) => (
        <div key={idx} className="rounded-lg border border-[rgba(0,0,0,0.08)] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 ">Member {idx + 1}</span>
            <button onClick={() => remove(idx)} className="text-[#71717A] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Name" value={m.name ?? ""} onChange={(v) => update(idx, "name", v)} placeholder="Full name" />
            <Field label="Title" value={m.title ?? ""} onChange={(v) => update(idx, "title", v)} placeholder="Co-founder & CEO" />
            <Field label="LinkedIn URL" value={m.linkedin ?? ""} onChange={(v) => update(idx, "linkedin", v)} placeholder="https://linkedin.com/in/..." />
          </div>
          <TextArea label="Bio" value={m.bio ?? ""} onChange={(v) => update(idx, "bio", v)} placeholder="Brief background" rows={2} />
        </div>
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-brand hover:text-brand"
      >
        <Plus className="h-3.5 w-3.5" /> Add team member
      </button>
    </div>
  );
}

function ProblemSolutionEditor({ content, onChange, sectionKey }: { content: any; onChange: (c: any) => void; sectionKey: string }) {
  const isProblem = sectionKey === "problem";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <TextArea
        label="The problem"
        value={content.problem ?? ""}
        onChange={(v) => onChange({ ...content, problem: v })}
        placeholder="What specific pain are you solving?"
        rows={4}
      />
      <TextArea
        label="Your solution"
        value={content.solution ?? ""}
        onChange={(v) => onChange({ ...content, solution: v })}
        placeholder="How do you solve it?"
        rows={4}
      />
    </div>
  );
}

function MarketEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[["tam", "TAM"], ["sam", "SAM"], ["som", "SOM"]].map(([k, label]) => (
          <Field key={k} label={label} value={content[k] ?? ""} onChange={(v) => onChange({ ...content, [k]: v })} placeholder="$..." />
        ))}
      </div>
      <TextArea label="Market sizing methodology" value={content.methodology ?? ""} onChange={(v) => onChange({ ...content, methodology: v })} placeholder="How did you arrive at these numbers?" />
    </div>
  );
}

function RevenueModelEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Revenue type</label>
        <select
          value={content.type ?? "SaaS"}
          onChange={(e) => onChange({ ...content, type: e.target.value })}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
        >
          {["SaaS", "Marketplace", "Transactional", "Subscription", "Other"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <TextArea label="Revenue description" value={content.description ?? ""} onChange={(v) => onChange({ ...content, description: v })} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="MRR" value={content.mrr ?? ""} onChange={(v) => onChange({ ...content, mrr: v })} placeholder="$0" />
        <Field label="ARR" value={content.arr ?? ""} onChange={(v) => onChange({ ...content, arr: v })} placeholder="$0" />
        <Field label="Avg deal size" value={content.avg_deal_size ?? ""} onChange={(v) => onChange({ ...content, avg_deal_size: v })} placeholder="$0" />
        <Field label="Sales cycle" value={content.sales_cycle ?? ""} onChange={(v) => onChange({ ...content, sales_cycle: v })} placeholder="e.g. 30 days" />
      </div>
    </div>
  );
}

function TractionEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Customers" value={content.customers ?? ""} onChange={(v) => onChange({ ...content, customers: v })} placeholder="0" />
        <Field label="Growth rate (%)" value={content.growth_rate ?? ""} onChange={(v) => onChange({ ...content, growth_rate: v })} placeholder="0%" />
        <Field label="Revenue" value={content.revenue ?? ""} onChange={(v) => onChange({ ...content, revenue: v })} placeholder="$0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Key metric name" value={content.key_metric_name ?? ""} onChange={(v) => onChange({ ...content, key_metric_name: v })} placeholder="e.g. DAU" />
        <Field label="Key metric value" value={content.key_metric_value ?? ""} onChange={(v) => onChange({ ...content, key_metric_value: v })} placeholder="e.g. 10,000" />
      </div>
      <TextArea label="Traction narrative" value={content.narrative ?? ""} onChange={(v) => onChange({ ...content, narrative: v })} placeholder="Tell the story of your growth" />
    </div>
  );
}

function FinancialsEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Burn rate ($/mo)" value={content.burn_rate ?? ""} onChange={(v) => onChange({ ...content, burn_rate: v })} placeholder="$0" />
        <Field label="Runway (months)" value={content.runway_months ?? ""} onChange={(v) => onChange({ ...content, runway_months: v })} placeholder="0" />
        <Field label="Last 12mo revenue" value={content.revenue_l12m ?? ""} onChange={(v) => onChange({ ...content, revenue_l12m: v })} placeholder="$0" />
        <Field label="Projected 12mo revenue" value={content.revenue_p12m ?? ""} onChange={(v) => onChange({ ...content, revenue_p12m: v })} placeholder="$0" />
      </div>
      <TextArea label="Financial notes" value={content.notes ?? ""} onChange={(v) => onChange({ ...content, notes: v })} />
    </div>
  );
}

function LegalEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Entity type" value={content.entity_type ?? ""} onChange={(v) => onChange({ ...content, entity_type: v })} placeholder="LLC / Ltd" />
        <Field label="Jurisdiction" value={content.jurisdiction ?? ""} onChange={(v) => onChange({ ...content, jurisdiction: v })} placeholder="UAE / UK" />
        <Field label="Registration #" value={content.registration_number ?? ""} onChange={(v) => onChange({ ...content, registration_number: v })} />
        <Field label="Incorporation date" value={content.incorporation_date ?? ""} onChange={(v) => onChange({ ...content, incorporation_date: v })} type="date" />
      </div>
      <TextArea label="IP and ownership notes" value={content.ip_notes ?? ""} onChange={(v) => onChange({ ...content, ip_notes: v })} />
    </div>
  );
}

function ProductEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
        <select
          value={content.stage ?? "Idea"}
          onChange={(e) => onChange({ ...content, stage: e.target.value })}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
        >
          {["Idea", "Prototype", "MVP", "Beta", "Live", "Scaling"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </div>
      <TextArea label="Product description" value={content.description ?? ""} onChange={(v) => onChange({ ...content, description: v })} />
      <Field label="Tech stack (comma-separated)" value={content.tech_stack ?? ""} onChange={(v) => onChange({ ...content, tech_stack: v })} placeholder="React, Node.js, PostgreSQL" />
    </div>
  );
}

function CompetitiveLandscapeEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  const competitors: any[] = content.competitors ?? [];
  const addComp = () => onChange({ ...content, competitors: [...competitors, { name: "", differentiator: "" }] });
  const removeComp = (idx: number) => onChange({ ...content, competitors: competitors.filter((_, i) => i !== idx) });
  const updateComp = (idx: number, field: string, val: string) => {
    onChange({ ...content, competitors: competitors.map((c, i) => i === idx ? { ...c, [field]: val } : c) });
  };
  return (
    <div className="space-y-3">
      <TextArea label="Who are your main competitors and how are you different?" value={content.overview ?? ""} onChange={(v) => onChange({ ...content, overview: v })} rows={3} />
      {competitors.map((c, idx) => (
        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-[rgba(0,0,0,0.08)] p-3">
          <Field label="Competitor name" value={c.name ?? ""} onChange={(v) => updateComp(idx, "name", v)} />
          <div className="relative">
            <Field label="How you're different" value={c.differentiator ?? ""} onChange={(v) => updateComp(idx, "differentiator", v)} />
            <button onClick={() => removeComp(idx)} className="absolute top-0 right-0 text-[#71717A] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
      <button onClick={addComp} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-brand hover:text-brand">
        <Plus className="h-3.5 w-3.5" /> Add competitor
      </button>
    </div>
  );
}

function DefaultEditor({ content, onChange }: { content: any; onChange: (c: any) => void }) {
  return (
    <TextArea label="Content" value={content.text ?? ""} onChange={(v) => onChange({ text: v })} rows={4} />
  );
}

function SectionEditor({ sectionKey, content, onChange }: { sectionKey: string; content: any; onChange: (c: any) => void }) {
  switch (sectionKey) {
    case "executive_summary": return <ExecutiveSummaryEditor content={content} onChange={onChange} />;
    case "team": return <TeamEditor content={content} onChange={onChange} />;
    case "problem":
    case "solution": return <ProblemSolutionEditor content={content} onChange={onChange} sectionKey={sectionKey} />;
    case "market": return <MarketEditor content={content} onChange={onChange} />;
    case "revenue_model": return <RevenueModelEditor content={content} onChange={onChange} />;
    case "traction": return <TractionEditor content={content} onChange={onChange} />;
    case "financials": return <FinancialsEditor content={content} onChange={onChange} />;
    case "legal": return <LegalEditor content={content} onChange={onChange} />;
    case "product": return <ProductEditor content={content} onChange={onChange} />;
    case "competitive_landscape": return <CompetitiveLandscapeEditor content={content} onChange={onChange} />;
    default: return <DefaultEditor content={content} onChange={onChange} />;
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function isContentEmpty(content: any): boolean {
  if (!content || typeof content !== "object") return true;
  const vals = Object.values(content);
  if (vals.length === 0) return true;
  return vals.every((v) => {
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "string") return v.trim() === "";
    return !v;
  });
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

// ── Main component ─────────────────────────────────────────────────

export function ProfileBuilder({ startupId, userId }: { startupId: string; userId: string }) {
  const queryClient = useQueryClient();

  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [localContents, setLocalContents] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [visibilityWarning, setVisibilityWarning] = useState<string | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionVisibility, setNewSectionVisibility] = useState<"private" | "deal_room" | "public">("private");
  const [addingSec, setAddingSec] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const { data: sections = [], refetch } = useQuery({
    queryKey: ["profile-sections", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_profile_sections")
        .select("*")
        .eq("startup_id", startupId)
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  // Auto-seed standard sections on first load
  useEffect(() => {
    if (sections.length === 0 && startupId && !seeding) {
      setSeeding(true);
      (async () => {
        try {
          const rows = STANDARD_SECTIONS.map((s) => ({
            startup_id: startupId,
            section_key: s.key,
            section_label: s.label,
            content: {},
            visibility: "private",
            display_order: s.display_order,
            is_custom: false,
            ai_generated: false,
            last_edited_by: userId,
          }));
          const { error } = await supabase.from("startup_profile_sections").insert(rows);
          if (error) throw error;
          await refetch();
        } catch {
          // Sections likely already exist — refetch
          await refetch();
        } finally {
          setSeeding(false);
        }
      })();
    }
  }, [sections, startupId, seeding]);

  // Sync local content state when sections load
  useEffect(() => {
    if ((sections as any[]).length > 0) {
      setLocalContents((prev) => {
        const next = { ...prev };
        (sections as any[]).forEach((s: any) => {
          if (!(s.section_key in next)) {
            next[s.section_key] = s.content ?? {};
          }
        });
        return next;
      });
    }
  }, [sections]);

  const allSections = sections as any[];
  const completedCount = allSections.filter((s: any) => !isContentEmpty(s.content)).length;

  const cycleVisibility = async (section: any) => {
    const next = VISIBILITY_CYCLE[section.visibility] ?? "private";
    if (next === "public" && NO_PUBLIC_SECTIONS.has(section.section_key)) {
      setVisibilityWarning(section.section_key);
      // Snap to deal_room instead
      const { error: snapErr } = await supabase
        .from("startup_profile_sections")
        .update({ visibility: "deal_room" })
        .eq("id", section.id);
      if (snapErr) { console.error("[profile-sections] visibility snap failed:", snapErr); toast.error("Could not update visibility."); return; }
      await refetch();
      setTimeout(() => setVisibilityWarning(null), 3000);
      return;
    }
    const { error: visErr } = await supabase
      .from("startup_profile_sections")
      .update({ visibility: next })
      .eq("id", section.id);
    if (visErr) { console.error("[profile-sections] visibility update failed:", visErr); toast.error("Could not update visibility."); return; }
    await refetch();
  };

  const saveSection = async (section: any) => {
    const key = section.section_key;
    setSavingKey(key);
    try {
      const { error } = await supabase
        .from("startup_profile_sections")
        .update({
          content: localContents[key] ?? section.content,
          updated_at: new Date().toISOString(),
          last_edited_by: userId,
        })
        .eq("id", section.id);
      if (error) throw error;
      await refetch();
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      toast.error("Could not save section");
    } finally {
      setSavingKey(null);
    }
  };

  const addCustomSection = async () => {
    if (!newSectionName.trim()) return;
    setAddingSec(true);
    try {
      const maxOrder = allSections.length > 0 ? Math.max(...allSections.map((s: any) => s.display_order ?? 0)) : 10;
      const { error } = await supabase.from("startup_profile_sections").insert({
        startup_id: startupId,
        section_key: slugify(newSectionName),
        section_label: newSectionName.trim(),
        content: {},
        visibility: newSectionVisibility,
        display_order: maxOrder + 1,
        is_custom: true,
        ai_generated: false,
        last_edited_by: userId,
      });
      if (error) throw error;
      await refetch();
      setNewSectionName("");
      setAddSectionOpen(false);
      toast.success("Section added");
    } catch {
      toast.error("Could not add section");
    } finally {
      setAddingSec(false);
    }
  };

  return (
    <div className="mb-6 bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setPanelOpen((v) => !v)}
        data-testid="profile-builder-header"
      >
        <div>
          <div className="text-sm font-bold text-gray-900 " style={{ fontFamily: "Syne, sans-serif" }}>Digital Profile</div>
          <div className="text-xs text-gray-500 mt-0.5">Build your investor-ready profile</div>
        </div>
        <div className="flex items-center gap-3 shrink-0 mt-0.5">
          {allSections.length > 0 && (
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
              completedCount === allSections.length
                ? "bg-green-50 text-green-700  "
                : "bg-gray-100 text-gray-600  ",
            )}>
              {completedCount} / {allSections.length} sections complete
            </span>
          )}
          {panelOpen ? <ChevronUp className="h-4 w-4 text-[#71717A]" /> : <ChevronDown className="h-4 w-4 text-[#71717A]" />}
        </div>
      </button>

      {panelOpen && (
        <div className="border-t border-[rgba(0,0,0,0.08)] ">
          {seeding ? (
            <div className="px-5 py-8 text-center text-sm text-[#71717A]">Setting up your profile sections…</div>
          ) : (
            <div className="divide-y divide-gray-100 ">
              {allSections.map((section: any) => {
                const key = section.section_key;
                const isExpanded = expandedKey === key;
                const content = localContents[key] ?? section.content ?? {};
                const empty = isContentEmpty(section.content);
                const showVisibilityWarning = visibilityWarning === key;

                return (
                  <div key={section.id}>
                    {/* Section header row */}
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ">
                      <GripVertical className="h-4 w-4 text-[#71717A] shrink-0" />

                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                      >
                        <span className="text-sm font-medium text-gray-900 truncate">{section.section_label}</span>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Visibility badge */}
                        <div className="relative">
                          <button
                            onClick={() => cycleVisibility(section)}
                            title={NO_PUBLIC_SECTIONS.has(key) ? "Cannot be made public — financial data" : undefined}
                            className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80", VISIBILITY_CLASSES[section.visibility] ?? VISIBILITY_CLASSES.private)}
                          >
                            {VISIBILITY_LABELS[section.visibility] ?? VISIBILITY_LABELS.private}
                          </button>
                          {showVisibilityWarning && (
                            <div className="absolute top-full left-0 mt-1 z-10 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 whitespace-nowrap flex items-center gap-1.5">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Cannot be made public — financial data
                            </div>
                          )}
                        </div>

                        {/* Content status */}
                        <span className={cn("text-[10px] font-medium", empty ? "text-[#71717A] " : "text-green-600 ")}>
                          {empty ? "Empty" : "✓ Complete"}
                        </span>

                        <button onClick={() => setExpandedKey(isExpanded ? null : key)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-[#71717A]" /> : <ChevronDown className="h-4 w-4 text-[#71717A]" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded editor */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 bg-gray-50/50 ">
                        <SectionEditor
                          sectionKey={key}
                          content={content}
                          onChange={(newContent) => setLocalContents((prev) => ({ ...prev, [key]: newContent }))}
                        />

                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => saveSection(section)}
                            disabled={savingKey === key}
                            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                            style={{ background: "var(--gradient-brand)" }}
                            data-testid={`save-section-${key}`}
                          >
                            {savedKey === key ? (
                              <><Check className="h-3.5 w-3.5" /> Saved ✓</>
                            ) : savingKey === key ? (
                              "Saving…"
                            ) : (
                              "Save"
                            )}
                          </button>

                          <button
                            onClick={() => console.log(`AI extraction from document — Claude Code will wire to edge function [section: ${key}]`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 px-3 py-2 text-xs font-medium text-brand hover:bg-accent"
                            title="Upload a document above and AI will extract relevant data into this section"
                            data-testid={`extract-section-${key}`}
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Extract from document
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add custom section */}
              <div className="px-4 py-4">
                {addSectionOpen ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="Section name"
                        className="col-span-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand"
                        onKeyDown={(e) => { if (e.key === "Enter") addCustomSection(); }}
                      />
                      <select
                        value={newSectionVisibility}
                        onChange={(e) => setNewSectionVisibility(e.target.value as any)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                      >
                        <option value="private">Private</option>
                        <option value="deal_room">Deal Room</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAddSectionOpen(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                      <button
                        onClick={addCustomSection}
                        disabled={!newSectionName.trim() || addingSec}
                        className="rounded-lg px-4 py-1.5 text-xs font-semibold text-foreground disabled:opacity-50"
                        style={{ background: "var(--gradient-brand)" }}
                        data-testid="add-custom-section-btn"
                      >
                        {addingSec ? "Adding…" : "Add section"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddSectionOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand "
                    data-testid="add-custom-section-open-btn"
                  >
                    <Plus className="h-4 w-4" /> Add custom section
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";
import { PermissionGate } from "@/components/app/PermissionGate";

// R9 (c) — Prepare › Profile Builder › Achievements. Per user decision: an
// editor for individual/team/company achievements, distinct from
// app.wall.tsx (Achievement Wall, unlisted). Writes to the same
// startup_profile_sections table the deal room's Digital Profiles section
// already reads (section_key = "achievements"), with the same
// private/deal_room/public visibility model used by ProfileBuilder.tsx.
export const Route = createFileRoute("/app/prepare/profile-builder/achievements")({
  component: () => (
    <PermissionGate permission="edit_profile">
      <AchievementsEditor />
    </PermissionGate>
  ),
});

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
const SCOPES = ["individual", "team", "company"] as const;
type Scope = (typeof SCOPES)[number];

interface Achievement {
  title: string;
  description: string;
  scope: Scope;
  date: string;
}

function AchievementsEditor() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [items, setItems] = useState<Achievement[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: startup } = useQuery({
    queryKey: ["achievements-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: section, isLoading } = useQuery({
    queryKey: ["achievements-section", startup?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_profile_sections")
        .select("*")
        .eq("startup_id", startup!.id)
        .eq("section_key", "achievements")
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (section) setItems((section.content?.items as Achievement[]) ?? []);
  }, [section?.id]);

  const visibility = section?.visibility ?? "private";

  const persist = async (nextItems: Achievement[]) => {
    if (!startup?.id || !user?.id) return;
    setSaving(true);
    try {
      if (section?.id) {
        const { error } = await supabase
          .from("startup_profile_sections")
          .update({ content: { items: nextItems }, updated_at: new Date().toISOString(), last_edited_by: user.id })
          .eq("id", section.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("startup_profile_sections").insert({
          startup_id: startup.id,
          section_key: "achievements",
          section_label: "Achievements",
          content: { items: nextItems },
          visibility: "private",
          is_custom: true,
          ai_generated: false,
          last_edited_by: user.id,
        });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["achievements-section", startup.id] });
      qc.invalidateQueries({ queryKey: ["startup-profile-sections", startup.id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const next = [...items, { title: "", description: "", scope: "individual" as Scope, date: "" }];
    setItems(next);
  };

  const updateItem = (i: number, patch: Partial<Achievement>) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    setItems(next);
  };

  const removeItem = (i: number) => {
    const next = items.filter((_, idx) => idx !== i);
    setItems(next);
    persist(next);
  };

  const cycleVisibility = async () => {
    if (!section?.id) {
      // First save creates the row as private — cycle after that.
      await persist(items);
      return;
    }
    const next = VISIBILITY_CYCLE[visibility] ?? "private";
    const { error } = await supabase.from("startup_profile_sections").update({ visibility: next }).eq("id", section.id);
    if (error) {
      toast.error("Could not update visibility.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["achievements-section", startup?.id] });
  };

  return (
    <PageFrame
      breadcrumb={[{ label: "Prepare" }, { label: "Profile Builder" }, { label: "Achievements" }]}
      title="Achievements"
      description="Individual, team, and company achievements — shown on your digital profile and in deal rooms."
      actions={
        startup?.id ? (
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <button
              onClick={cycleVisibility}
              className="rounded-md border border-border/60 px-3 py-2 text-xs font-medium hover:bg-accent"
            >
              {VISIBILITY_LABELS[visibility]}
            </button>
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1.5 rounded-md hs-gradient text-brand-foreground px-3 py-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" /> Add achievement
            </button>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : !startup?.id ? (
        <EmptyState kind="empty" title="Build your profile first" />
      ) : items.length === 0 ? (
        <EmptyState kind="empty" title="No achievements yet" action={{ label: "Add achievement", onClick: addItem }} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-none border border-border/60 bg-card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Trophy className="h-4 w-4 text-brand mt-2 shrink-0" />
                <div className="flex-1 grid gap-3 sm:grid-cols-[1fr_140px_140px]">
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(i, { title: e.target.value })}
                    onBlur={() => persist(items)}
                    placeholder="e.g. Named to Forbes 30 Under 30"
                    className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-brand/50"
                  />
                  <select
                    value={item.scope}
                    onChange={(e) => {
                      updateItem(i, { scope: e.target.value as Scope });
                      persist(items.map((it, idx) => (idx === i ? { ...it, scope: e.target.value as Scope } : it)));
                    }}
                    className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none"
                  >
                    {SCOPES.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={item.date}
                    onChange={(e) => {
                      updateItem(i, { date: e.target.value });
                      persist(items.map((it, idx) => (idx === i ? { ...it, date: e.target.value } : it)));
                    }}
                    className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
                <button onClick={() => removeItem(i)} className="p-2 rounded-md hover:bg-accent shrink-0" title="Remove">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <textarea
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                onBlur={() => persist(items)}
                rows={2}
                placeholder="Brief context — what happened and why it matters."
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none resize-none focus:border-brand/50"
              />
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

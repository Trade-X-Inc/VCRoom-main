import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TaskStatus = "todo" | "in_progress" | "done" | "blocked";

const statusMeta: Record<TaskStatus, { label: string; icon: any; tint: string; next: TaskStatus }> = {
  todo:        { label: "To do",       icon: Circle,        tint: "text-muted-foreground", next: "in_progress" },
  in_progress: { label: "In progress", icon: Clock,         tint: "text-brand",            next: "done" },
  done:        { label: "Done",        icon: CheckCircle2,  tint: "text-success",           next: "todo" },
  blocked:     { label: "Blocked",     icon: AlertTriangle, tint: "text-warning",           next: "todo" },
};

export function DDChecklist({ dealRoomId, userId }: { dealRoomId: string; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ["deal-tasks-checklist", dealRoomId],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_tasks")
        .select("id, title, assignee_id, due_date, completed, created_by, created_at")
        .eq("deal_room_id", dealRoomId)
        .order("completed", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("deal_tasks").insert({
        deal_room_id: dealRoomId,
        title: title.trim(),
        created_by: userId,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["deal-tasks-checklist", dealRoomId] });
      queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealRoomId] });
      setTitle("");
      setShowForm(false);
    } catch {
      toast.error("Failed to save checklist item");
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (task: any) => {
    if (!userId) return;
    const next = statusMeta[task.completed ? "done" : "todo"].next;
    const completed = next === "done";
    const { error } = await supabase.from("deal_tasks").update({ completed }).eq("id", task.id);
    if (error) { console.error("[dd-checklist] toggle failed:", error); toast.error("Could not update task."); return; }
    queryClient.invalidateQueries({ queryKey: ["deal-tasks-checklist", dealRoomId] });
    queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealRoomId] });
  };

  const total = tasks.length;
  const done = tasks.filter((t: any) => t.completed).length;
  const overall = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Due Diligence Checklist</h2>
          <p className="text-sm text-muted-foreground mt-1">{done} of {total} items complete · {overall}%</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-gradient-brand transition-all" style={{ width: `${overall}%` }} />
      </div>

      {showForm && (
        <form onSubmit={addTask} className="mt-5 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New checklist item…"
            className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            autoFocus
          />
          <button
            type="button"
            onClick={() => { setShowForm(false); setTitle(""); }}
            className="rounded-md border border-border/60 px-3 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Add
          </button>
        </form>
      )}

      {isError && <p className="mt-4 text-sm text-destructive">Could not load checklist. Please refresh.</p>}
      {isLoading && <div className="mt-4 text-sm text-muted-foreground animate-pulse">Loading…</div>}

      {!isLoading && tasks.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">No checklist items yet. Add your first due diligence task.</p>
      )}

      {tasks.length > 0 && (
        <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="divide-y divide-border/60">
            {(tasks as any[]).map((task) => {
              const status: TaskStatus = task.completed ? "done" : "todo";
              const M = statusMeta[status];
              return (
                <div key={task.id} className="grid grid-cols-12 items-center px-5 py-3 hover:bg-accent/30 gap-3">
                  <button
                    onClick={() => cycleStatus(task)}
                    className={cn("col-span-1", M.tint)}
                    title={M.label}
                  >
                    <M.icon className="h-5 w-5" />
                  </button>
                  <div className="col-span-7 min-w-0">
                    <div className={cn("text-sm font-medium truncate", task.completed && "text-muted-foreground line-through")}>
                      {task.title}
                    </div>
                    <div className={cn("text-[11px] mt-0.5", M.tint)}>{M.label}</div>
                  </div>
                  <div className="col-span-4 text-right text-xs text-muted-foreground">
                    {task.due_date && new Date(task.due_date).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

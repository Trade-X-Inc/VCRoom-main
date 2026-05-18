import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, FileText, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/investor/diligence")({
  component: DiligencePage,
});

function DiligencePage() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // Fetch deal rooms the investor belongs to
  const { data: rooms = [] } = useQuery({
    queryKey: ["investor-diligence-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(id, startups(company_name))")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: any) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name ?? r.deal_room_id,
      }));
    },
  });

  // Fetch deal tasks as checklist
  const { data: tasks = [] } = useQuery({
    queryKey: ["investor-tasks", selectedRoomId],
    enabled: !!selectedRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_tasks")
        .select("id, title, completed")
        .eq("deal_room_id", selectedRoomId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  // Fetch documents for the deal room
  const { data: docs = [] } = useQuery({
    queryKey: ["investor-docs", selectedRoomId],
    enabled: !!selectedRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("id, name, category, created_at, deal_room_id")
        .eq("deal_room_id", selectedRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const total = tasks.length;
  const doneCount = tasks.filter((t: any) => t.completed).length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Due Diligence</h1>
        <div className="text-sm text-muted-foreground">Track diligence progress across your active deals</div>
      </div>

      <div className="mt-5">
        <select
          value={selectedRoomId}
          onChange={(e) => setSelectedRoomId(e.target.value)}
          className="rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
        >
          <option value="">Select a company…</option>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {!selectedRoomId ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Select a company to view due diligence</h3>
          <p className="mt-1 text-sm text-muted-foreground">Companies in your active deal flow appear in the dropdown above.</p>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-5">
          {/* Left: Task checklist */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Diligence checklist</div>
                <div className="text-sm tabular-nums text-muted-foreground">{doneCount}/{total} · {progress}%</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
                No checklist items yet. Tasks added by the founder will appear here.
              </div>
            ) : (
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <div className="divide-y divide-border/60">
                  {tasks.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                      {task.completed
                        ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className={`text-sm ${task.completed ? "text-muted-foreground line-through" : ""}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              to="/app/deal-room/$id"
              params={{ id: selectedRoomId }}
              className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
            >
              Open full deal room <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Right: Document review */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden self-start">
            <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
              <div className="text-sm font-semibold">Document review</div>
              <span className="text-xs text-muted-foreground">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
            </div>
            {docs.length === 0 ? (
              <div className="p-8 text-sm text-muted-foreground text-center">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-center gap-3 px-5 py-3">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{doc.name}</div>
                      {doc.category && (
                        <div className="text-xs text-muted-foreground">{doc.category}</div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">
                      {doc.created_at
                        ? formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })
                        : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Circle, ClipboardCheck, FileUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/diligence")({
  component: DiligencePage,
});

function DiligencePage() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  // Fetch deal rooms the investor belongs to (with company names)
  const { data: rooms = [] } = useQuery({
    queryKey: ["investor-diligence-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(id, name, startups(company_name))")
        .eq("user_id", user!.id);
      return (data ?? []).map((r: any) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name ?? r.deal_rooms?.name ?? r.deal_room_id,
      }));
    },
  });

  // Fetch due diligence items for selected room
  const { data: items = [] } = useQuery({
    queryKey: ["due-diligence", selectedRoomId],
    enabled: !!selectedRoomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("due_diligence_items")
        .select("id, section, label, status")
        .eq("deal_room_id", selectedRoomId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const sections = Object.entries(
    items.reduce<Record<string, { id: string; label: string; done: boolean }[]>>((acc, item: any) => {
      const key = item.section || "General";
      if (!acc[key]) acc[key] = [];
      acc[key].push({
        id: item.id,
        label: item.label || item.section || "Item",
        done: String(item.status).toLowerCase().includes("done"),
      });
      return acc;
    }, {}),
  ).map(([t, list]) => ({ t, items: list }));

  const total = items.length;
  const doneCount = items.filter((i: any) => String(i.status).toLowerCase().includes("done")).length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;

  const sectionKeys = ["Legal", "Financial", "Technical", "Commercial", "Team"];

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
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Overall progress</div>
                <div className="text-sm tabular-nums">{progress}%</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] text-muted-foreground">
                {sectionKeys.map((sk) => {
                  const sec = sections.find((s) => s.t.toLowerCase() === sk.toLowerCase());
                  const done = sec?.items.filter((i) => i.done).length ?? 0;
                  const tot = sec?.items.length ?? 0;
                  return (
                    <div key={sk} className="rounded-md border border-border/60 px-2 py-1.5 text-center">
                      {sk} {done}/{tot}
                    </div>
                  );
                })}
              </div>
            </div>

            {sections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
                No checklist items yet.
              </div>
            ) : (
              sections.map((s) => {
                const done = s.items.filter((i) => i.done).length;
                return (
                  <div key={s.t} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                      <div className="text-sm font-semibold">{s.t}</div>
                      <div className="text-xs text-muted-foreground">{done}/{s.items.length}</div>
                    </div>
                    <div className="divide-y divide-border/60">
                      {s.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                          {item.done
                            ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <span className={`text-sm ${item.done ? "text-muted-foreground line-through" : ""}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div>
            <div className="rounded-2xl border border-border/60 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Document requests</div>
                <button className="inline-flex items-center gap-1 text-xs rounded-[10px] border border-border/60 px-2 py-1 hover:bg-accent">
                  <FileUp className="h-3.5 w-3.5" /> Request
                </button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground text-center py-6">No requests yet.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Pause } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/investor/decisions")({
  component: DecisionsPage,
});

function DecisionsPage() {
  const { user } = useAuth();

  // Get room IDs this investor belongs to
  const { data: memberData } = useQuery({
    queryKey: ["my-room-ids-decisions", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id")
        .eq("user_id", user!.id);
      return data ?? [];
    },
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];

  // Fetch decisions scoped to investor's rooms
  const { data: decisions = [] } = useQuery({
    queryKey: ["decisions", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decisions")
        .select("id, status, notes, deal_room_id")
        .in("deal_room_id", roomIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cols = {
    invest: decisions.filter((d) => ["accept", "invest"].includes(String(d.status).toLowerCase())),
    hold: decisions.filter((d) => String(d.status).toLowerCase() === "hold"),
    pass: decisions.filter((d) => String(d.status).toLowerCase() === "pass"),
  };

  const thisMonth = decisions.filter((d) => {
    const created = (d as any).created_at;
    if (!created) return false;
    const now = new Date();
    const dt = new Date(created);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Decision Board</h1>
        <div className="text-sm text-muted-foreground">Partnership-wide decisions, in one view</div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          ["Invested this quarter", cols.invest.length > 0 ? `${cols.invest.length}` : "$0"],
          ["Total deployed", "$0"],
          ["Avg check", "—"],
          ["Pass rate", decisions.length > 0 ? `${Math.round((cols.pass.length / decisions.length) * 100)}%` : "—"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {[
          { t: "Invest", c: "success", i: Check, items: cols.invest },
          { t: "Hold", c: "warning", i: Pause, items: cols.hold },
          { t: "Pass", c: "destructive", i: X, items: cols.pass },
        ].map((col) => (
          <div key={col.t} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className={`px-5 py-3 border-b border-border/60 flex items-center gap-2 bg-${col.c}/5`}>
              <col.i className={`h-4 w-4 text-${col.c}`} />
              <span className="text-sm font-semibold">{col.t}</span>
              <span className="text-xs text-muted-foreground ml-auto">{col.items.length}</span>
            </div>
            <div className="p-3 space-y-2">
              {col.items.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground text-center">
                  No {col.t.toLowerCase()} decisions yet
                </div>
              ) : (
                col.items.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-sm font-medium">Decision {item.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">{item.notes || "No notes"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

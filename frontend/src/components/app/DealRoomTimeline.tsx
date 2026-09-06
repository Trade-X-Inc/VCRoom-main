import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LcsEmptyState } from "@/components/lcs";

export function Timeline({ dealRoomId }: { dealRoomId: string }) {
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ["activities", dealRoomId],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("id, actor_name, action_type, target_label, detail, created_at")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isError) return <p className="p-6 text-sm" style={{ color: "var(--lcs-attention)", fontFamily: "var(--font-lcs-ui)" }}>Could not load data. Please refresh.</p>;
  if (isLoading)
    return (
      <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  if (events.length === 0)
    return <LcsEmptyState title="No activity" text="Activity in this deal room appears here." />;

  return (
    <div className="p-6 relative pl-8">
      <div className="absolute left-4 top-6 bottom-6 w-px" style={{ background: "var(--lcs-line)" }} />
      {(events as any[]).map((e) => (
        <div key={e.id} className="relative pb-6 last:pb-0">
          <div
            className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full"
            style={{ background: "var(--lcs-accent)", boxShadow: "0 0 0 4px var(--lcs-white)" }}
          />
          <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{e.action_type ?? e.target_label ?? "Activity"}</div>
          <div className="text-xs inline-flex items-center gap-1 mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
            <Clock className="h-3 w-3" />
            {e.actor_name ? `${e.actor_name} · ` : ""}
            {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  );
}

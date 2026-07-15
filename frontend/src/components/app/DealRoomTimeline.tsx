import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/system";

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

  if (isError) return <p className="p-6 text-sm text-destructive">Could not load data. Please refresh.</p>;
  if (isLoading) return <EmptyState kind="loading" title="Loading" />;
  if (events.length === 0) return <EmptyState kind="empty" title="No activity" />;

  return (
    <div className="p-6 relative pl-8">
      <div className="absolute left-4 top-6 bottom-6 w-px bg-border" />
      {(events as any[]).map((e) => (
        <div key={e.id} className="relative pb-6 last:pb-0">
          <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full hs-gradient ring-4 ring-white" />
          <div className="text-sm font-medium text-gray-900">{e.action_type ?? e.target_label ?? "Activity"}</div>
          <div className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            {e.actor_name ? `${e.actor_name} · ` : ""}
            {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
          </div>
        </div>
      ))}
    </div>
  );
}

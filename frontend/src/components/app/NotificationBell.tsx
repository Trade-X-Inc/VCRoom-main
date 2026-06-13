import { Link } from "@tanstack/react-router";
import { Bell, MessageSquare, Briefcase, Sparkles, UserPlus, Settings, CheckCheck, Eye } from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

type NotifKind = "decision" | "deal" | "message" | "invite" | "system" | "match" | "view" | string;

interface NotifRow {
  id: string;
  title: string;
  body: string;
  kind: NotifKind;
  read: boolean;
  action_url: string | null;
  meta: Record<string, any> | null;
  created_at: string;
}

const iconFor = (kind: NotifKind) => {
  if (kind === "decision" || kind === "deal") return Briefcase;
  if (kind === "message") return MessageSquare;
  if (kind === "invite") return UserPlus;
  if (kind === "ai") return Sparkles;
  if (kind === "view") return Eye;
  return Settings;
};

const tintFor = (kind: NotifKind) => {
  if (kind === "decision" || kind === "deal") return "bg-success/10 text-success";
  if (kind === "message") return "bg-brand/10 text-brand";
  if (kind === "invite") return "bg-warning/10 text-warning";
  if (kind === "ai") return "bg-violet/10 text-violet";
  if (kind === "match") return "bg-[#7C3AED]/10 text-[#7C3AED]";
  if (kind === "view") return "bg-blue-500/10 text-blue-400";
  return "bg-muted text-muted-foreground";
};

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery<NotifRow[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, kind, read, action_url, meta, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as NotifRow[];
    },
    refetchInterval: 30_000,
  });

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    if (!user?.id || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand ring-2 ring-background" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[380px] rounded-xl border border-border/60 bg-popover shadow-elev z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">Notifications</div>
                {unread > 0 && <span className="text-[10px] rounded-full bg-brand/10 text-brand px-1.5 py-0.5 font-medium">{unread} new</span>}
              </div>
              <button onClick={markAll} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
              {items.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">No notifications yet.</div>
              )}
              {items.slice(0, 10).map((n) => {
                const isMatch = n.kind === "match";
                const isView = n.kind === "view";
                const Icon = iconFor(n.kind);
                const content = (
                  <div className={`flex gap-3 p-3.5 hover:bg-accent/50 transition-colors cursor-pointer ${!n.read ? "bg-brand/[0.02]" : ""}`}>
                    <div className={`grid h-8 w-8 place-items-center rounded-md shrink-0 text-sm font-bold ${tintFor(n.kind)}`}>
                      {isMatch ? "✦" : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="text-sm font-medium leading-tight">{n.title}</div>
                          {isMatch && n.meta?.match_score && (
                            <span className="text-xs bg-[#7C3AED]/20 text-[#7C3AED] px-1.5 py-0.5 rounded font-semibold shrink-0">
                              {n.meta.match_score}%
                            </span>
                          )}
                        </div>
                        {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" />}
                      </div>
                      {isView && n.meta?.viewer_name ? (
                        <div className="mt-0.5 text-xs text-white/50">
                          👁 {n.meta.viewer_name} opened a document
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                      )}
                      <div className="mt-1 text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
                return n.action_url ? (
                  <Link key={n.id} to={n.action_url as any} onClick={() => setOpen(false)}>{content}</Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })}
            </div>

            <Link
              to="/app/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium py-2.5 border-t border-border/60 hover:bg-accent text-foreground"
            >
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

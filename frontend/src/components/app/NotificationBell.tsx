import { Link } from "@tanstack/react-router";
import {
  Bell, MessageSquare, Briefcase, Sparkles, UserPlus, Settings,
  CheckCheck, Eye, Star, CheckCircle, XCircle, DoorOpen, FileText
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

type NotifKind =
  | "decision" | "deal" | "message" | "invite" | "system"
  | "match" | "thesis_match" | "view" | "ai"
  | "access_approved" | "access_declined"
  | "deal_room_invite" | "deal_activity"
  | string;

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
  if (kind === "thesis_match" || kind === "match") return Star;
  if (kind === "access_approved") return CheckCircle;
  if (kind === "access_declined") return XCircle;
  if (kind === "deal_room_invite") return DoorOpen;
  if (kind === "deal_activity") return FileText;
  if (kind === "decision" || kind === "deal") return Briefcase;
  if (kind === "message") return MessageSquare;
  if (kind === "invite") return UserPlus;
  if (kind === "ai") return Sparkles;
  if (kind === "view") return Eye;
  return Settings;
};

const tintFor = (kind: NotifKind) => {
  if (kind === "thesis_match" || kind === "match") return "bg-amber-500/10 text-amber-400";
  if (kind === "access_approved") return "bg-success/10 text-success";
  if (kind === "access_declined") return "bg-destructive/10 text-destructive";
  if (kind === "deal_room_invite") return "bg-accent text-brand";
  if (kind === "deal_activity") return "bg-muted text-muted-foreground";
  if (kind === "decision" || kind === "deal") return "bg-success/10 text-success";
  if (kind === "message") return "bg-accent text-brand";
  if (kind === "invite") return "bg-warning/10 text-warning";
  if (kind === "ai") return "bg-violet/10 text-violet";
  if (kind === "view") return "bg-blue-500/10 text-blue-400";
  return "bg-muted text-muted-foreground";
};

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: items = [], refetch } = useQuery<NotifRow[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, kind, read, action_url, meta, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as NotifRow[];
    },
    refetchInterval: 30_000,
  });

  // Realtime: prepend new notification rows without full refetch
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { refetch(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refetch]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    if (!user?.id || unread === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (error) console.error("[notifications] mark all read failed:", error);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const markOneRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) console.error("[notifications] mark read failed:", error);
    queryClient.setQueryData<NotifRow[]>(["notifications", user?.id], (old) =>
      (old ?? []).map((n) => n.id === id ? { ...n, read: true } : n)
    );
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-md border border-border/60 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground relative"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full hs-gradient ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] rounded-xl border border-border/60 bg-popover shadow-elev z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Notifications</div>
              {unread > 0 && (
                <span className="text-[10px] rounded-full bg-accent text-brand px-1.5 py-0.5 font-medium">
                  {unread > 9 ? "9+" : unread} new
                </span>
              )}
            </div>
            <button onClick={markAll} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-border/60">
            {items.length === 0 && (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <div className="text-xs text-muted-foreground">No notifications yet.</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1">Thesis matches and deal activity will appear here.</div>
              </div>
            )}
            {items.slice(0, 30).map((n) => {
              const isMatchKind = n.kind === "match" || n.kind === "thesis_match";
              const isView = n.kind === "view";
              const Icon = iconFor(n.kind);
              const handleClick = async () => {
                if (!n.read) await markOneRead(n.id);
                setOpen(false);
              };
              const content = (
                <div
                  className={`flex gap-3 p-3.5 hover:bg-accent/50 transition-colors cursor-pointer ${!n.read ? "hs-gradient/[0.03]" : ""}`}
                  onClick={!n.action_url ? handleClick : undefined}
                >
                  <div className={`grid h-8 w-8 place-items-center rounded-md shrink-0 text-sm font-bold ${tintFor(n.kind)}`}>
                    {isMatchKind ? "✦" : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className={`text-sm font-medium leading-tight ${n.read ? "text-muted-foreground" : ""}`}>
                          {n.title}
                        </div>
                        {isMatchKind && n.meta?.match_score && (
                          <span className="text-xs bg-accent text-brand px-1.5 py-0.5 rounded font-semibold shrink-0">
                            {n.meta.match_score}%
                          </span>
                        )}
                      </div>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full hs-gradient mt-1.5 shrink-0" />}
                    </div>
                    {isView && n.meta?.viewer_name ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        👁 {n.meta.viewer_name} opened a document
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
              // Absolute URLs (e.g. invite links) can't go through the router
              return n.action_url ? (
                n.action_url.startsWith("http") ? (
                  <a key={n.id} href={n.action_url} onClick={handleClick}>{content}</a>
                ) : (
                  <Link key={n.id} to={n.action_url as any} onClick={handleClick}>{content}</Link>
                )
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
      )}
    </div>
  );
}

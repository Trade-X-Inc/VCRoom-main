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
import { V2EmptyState } from "@/components/v2";

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

// Colour maps to the semantic vocabulary (DESIGN.md §7.2), not a decorative
// per-kind palette — kinds that are genuinely positive/negative/waiting use
// the matching semantic token; everything else is neutral ink.
const tintFor = (kind: NotifKind): { bg: string; fg: string } => {
  if (kind === "access_approved" || kind === "decision" || kind === "deal") {
    return { bg: "var(--v2-satisfied-wash)", fg: "var(--v2-satisfied)" };
  }
  if (kind === "access_declined") {
    return { bg: "var(--v2-adverse-wash)", fg: "var(--v2-adverse)" };
  }
  if (kind === "invite" || kind === "thesis_match" || kind === "match") {
    return { bg: "var(--v2-attention-wash)", fg: "var(--v2-attention)" };
  }
  if (kind === "deal_room_invite" || kind === "message" || kind === "ai") {
    return { bg: "var(--v2-accent-wash)", fg: "var(--v2-accent)" };
  }
  return { bg: "var(--v2-surface)", fg: "var(--v2-ink-muted)" };
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
    // R12B: realtime subscription below is now confirmed working (table
    // added to supabase_realtime, live-tested at ~600ms latency) — this
    // interval is a safety-net fallback for a dropped WebSocket, not the
    // primary delivery mechanism, so it no longer needs to be tight.
    refetchInterval: 5 * 60 * 1000,
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
    <div className="relative font-v2-ui" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center transition-colors relative"
        style={{ borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-rule)", color: "var(--v2-ink-muted)" }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 h-2 w-2"
            style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-accent)", boxShadow: "0 0 0 2px var(--v2-surface)" }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[380px] overflow-hidden z-40"
          style={{ borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-rule)", background: "var(--v2-panel)" }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--v2-rule)" }}>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold" style={{ color: "var(--v2-ink)" }}>Notifications</div>
              {unread > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 font-medium"
                  style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-accent-wash)", color: "var(--v2-accent)" }}
                >
                  {unread > 9 ? "9+" : unread} new
                </span>
              )}
            </div>
            <button onClick={markAll} className="text-xs inline-flex items-center gap-1 transition-colors" style={{ color: "var(--v2-ink-muted)" }}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 && (
              <V2EmptyState text="No notifications." />
            )}
            {items.slice(0, 30).map((n, i) => {
              const isView = n.kind === "view";
              const Icon = iconFor(n.kind);
              const tint = tintFor(n.kind);
              const handleClick = async () => {
                if (!n.read) await markOneRead(n.id);
                setOpen(false);
              };
              const content = (
                <div
                  className="flex gap-3 p-3.5 transition-colors cursor-pointer"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--v2-rule-light)",
                    borderInlineStart: !n.read ? "3px solid var(--v2-accent)" : "3px solid transparent",
                  }}
                  onClick={!n.action_url ? handleClick : undefined}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--v2-accent-wash)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="grid h-8 w-8 place-items-center shrink-0"
                    style={{ borderRadius: "var(--v2-radius)", background: tint.bg, color: tint.fg }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div
                          className="text-sm font-medium leading-tight"
                          style={{ color: n.read ? "var(--v2-ink-muted)" : "var(--v2-ink)" }}
                        >
                          {n.title}
                        </div>
                      </div>
                    </div>
                    <div className="mt-0.5 text-xs line-clamp-2" style={{ color: "var(--v2-ink-muted)" }}>
                      {isView && n.meta?.viewer_name ? `${n.meta.viewer_name} opened a document` : n.body}
                    </div>
                    <div className="mt-1 text-[10px] font-v2-data" style={{ color: "var(--v2-ink-muted)", opacity: 0.75 }}>
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
            className="block text-center text-xs font-medium py-2.5 transition-colors"
            style={{ borderTop: "1px solid var(--v2-rule)", color: "var(--v2-ink)" }}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

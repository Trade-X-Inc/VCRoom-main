import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell, MessageSquare, Briefcase, Sparkles, UserPlus,
  Settings, CheckCheck, Search, Loader2, ClipboardList,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/system";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

// ─── types ───────────────────────────────────────────────────────────────────

interface NotifRow {
  id: string;
  title: string;
  body: string;
  kind: string;
  type: string | null;
  read: boolean;
  action_url: string | null;
  meta: Record<string, any> | null;
  created_at: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const iconFor = (kind: string) => {
  if (kind === "deal")             return Briefcase;
  if (kind === "message")          return MessageSquare;
  if (kind === "invite")           return UserPlus;
  if (kind === "ai")               return Sparkles;
  if (kind === "document_request") return ClipboardList;
  if (kind === "dd_update")        return ClipboardList;
  return Settings;
};

const tintFor = (kind: string) => {
  if (kind === "deal")             return "bg-success/10 text-success";
  if (kind === "message")          return "bg-accent text-brand";
  if (kind === "invite")           return "bg-warning/10 text-warning";
  if (kind === "ai")               return "bg-violet/10 text-violet";
  if (kind === "document_request") return "bg-accent text-brand";
  if (kind === "dd_update")        return "bg-success/10 text-success";
  return "bg-muted text-muted-foreground";
};

const filters = [
  { k: "all",              l: "All" },
  { k: "unread",           l: "Unread" },
  { k: "document_request", l: "Doc Requests" },
  { k: "dd_update",        l: "Due Diligence" },
  { k: "deal",             l: "Deals" },
  { k: "message",          l: "Messages" },
  { k: "invite",           l: "Invites" },
  { k: "ai",               l: "AI" },
];

// ─── component ───────────────────────────────────────────────────────────────

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  // ── fetch from real DB
  const { data: items = [], isLoading } = useQuery<NotifRow[]>({
    queryKey: ["notifications-page", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, kind, type, read, action_url, meta, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as NotifRow[];
    },
    refetchInterval: 30_000,
  });

  const unread = items.filter((n) => !n.read).length;

  // ── mark all read
  const markAll = async () => {
    if (!user?.id || unread === 0) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (error) console.error("[notifications] mark all read failed:", error);
    qc.invalidateQueries({ queryKey: ["notifications-page", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] }); // also refresh bell
  };

  // ── mark single read
  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) console.error("[notifications] mark read failed:", error);
    qc.invalidateQueries({ queryKey: ["notifications-page", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  // ── filter + search
  const list = useMemo(() => {
    let xs = items;
    if (filter === "unread") xs = xs.filter((n) => !n.read);
    else if (filter !== "all") xs = xs.filter((n) => n.kind === filter);
    if (q) xs = xs.filter((n) =>
      (n.title + n.body).toLowerCase().includes(q.toLowerCase()),
    );
    return xs;
  }, [items, filter, q]);

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand" />
            <h1 className="text-lg font-bold tracking-tight">Notifications</h1>
            {unread > 0 && (
              <span className="text-[10px] rounded-full bg-accent text-brand px-1.5 py-0.5 font-medium">
                {unread} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Investor activity, document requests, due diligence updates, and more.
          </p>
        </div>
        <button
          onClick={markAll}
          disabled={unread === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {/* Search + filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notifications…"
            className="w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                filter === f.k
                  ? "bg-foreground text-background"
                  : "border border-border/60 hover:bg-accent",
              )}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-5 rounded-none border border-border/60 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <EmptyState kind="loading" title="Loading" />
        ) : list.length === 0 ? (
          <EmptyState
            kind={filter === "all" && !q ? "empty" : "no-results"}
            title={filter === "all" && !q ? "No notifications" : "No matches"}
          />
        ) : (
          <div className="divide-y divide-border/60">
            {list.map((n) => {
              const Icon = iconFor(n.kind);
              const row = (
                <div
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className={cn(
                    "flex gap-4 px-5 py-4 hover:bg-accent/40 transition-colors cursor-pointer",
                    !n.read ? "hs-gradient/[0.02]" : "",
                  )}
                >
                  <div className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg shrink-0",
                    tintFor(n.kind),
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full hs-gradient" />
                        )}
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {n.created_at
                            ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );

              return n.action_url ? (
                <a key={n.id} href={n.action_url} onClick={() => { if (!n.read) markRead(n.id); }}>
                  {row}
                </a>
              ) : (
                <div key={n.id}>{row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

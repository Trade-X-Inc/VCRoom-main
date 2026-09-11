import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell, MessageSquare, Briefcase, Sparkles, UserPlus,
  Settings, CheckCheck, Search, ClipboardList,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { LcsButton, LcsEmptyState } from "@/components/lcs";

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

// Single semantic accent per kind rather than the old mixed decorative
// palette (success/warning/violet/muted) — matching LCS's "exactly four
// status colours" discipline. Every notification kind here is either a
// neutral system event or an accent-worthy one; none of them are
// error/attention states, so --lcs-accent/--lcs-ink-muted is the
// complete real vocabulary needed.
const toneFor = (kind: string) => {
  if (kind === "deal" || kind === "dd_update" || kind === "document_request" || kind === "message" || kind === "invite" || kind === "ai") {
    return "var(--lcs-accent)";
  }
  return "var(--lcs-ink-muted)";
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
            <Bell className="h-5 w-5" style={{ color: "var(--lcs-accent)" }} />
            <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Notifications</h1>
            {unread > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 font-medium"
                style={{ background: "var(--lcs-progress-wash)", color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-ui)" }}
              >
                {unread} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            Investor activity, document requests, due diligence updates, and more.
          </p>
        </div>
        <LcsButton variant="secondary" onClick={markAll} disabled={unread === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </LcsButton>
      </div>

      {/* Search + filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "var(--lcs-ink-muted)" }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notifications…"
            className="w-full pl-8 pr-3 py-2 text-sm focus:outline-none"
            style={{ fontFamily: "var(--font-lcs-ui)", border: "1px solid var(--lcs-line)", background: "var(--lcs-white)", color: "var(--lcs-ink)" }}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className="px-3 py-1.5 text-xs transition-colors"
              style={{
                fontFamily: "var(--font-lcs-ui)",
                background: filter === f.k ? "var(--lcs-accent)" : "transparent",
                color: filter === f.k ? "var(--lcs-white)" : "var(--lcs-ink-muted)",
                border: filter === f.k ? "1px solid var(--lcs-accent)" : "1px solid var(--lcs-line)",
              }}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-5 border" style={{ borderColor: "var(--lcs-line)" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>Loading…</div>
        ) : list.length === 0 ? (
          <LcsEmptyState
            title={filter === "all" && !q ? "No notifications" : "No matches"}
            text={filter === "all" && !q ? "Investor activity, document requests, and updates will appear here." : "No notifications match the selected filter."}
          />
        ) : (
          <div className="flex flex-col">
            {list.map((n, i) => {
              const Icon = iconFor(n.kind);
              const tone = toneFor(n.kind);
              const row = (
                <div
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className="flex gap-4 px-5 py-4 cursor-pointer"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--lcs-line)" : undefined,
                    background: !n.read ? "var(--lcs-progress-wash)" : "transparent",
                  }}
                >
                  <div className="grid h-10 w-10 place-items-center shrink-0" style={{ background: "var(--lcs-surface)", color: tone }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{n.title}</div>
                        <div className="mt-0.5 text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{n.body}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--lcs-accent)" }} />
                        )}
                        <span className="text-xs tabular-nums" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
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

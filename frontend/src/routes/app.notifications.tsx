import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

interface Notification {
  id: string;
  kind: "deal" | "message" | "invite" | "system" | "ai";
  title: string;
  body: string;
  time: string;
  unread?: boolean;
  actor?: string;
}

const notifications: Notification[] = [];
import { Bell, MessageSquare, Briefcase, Sparkles, UserPlus, Settings, CheckCheck, Search } from "lucide-react";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
});

const iconFor = (k: Notification["kind"]) => ({ deal: Briefcase, message: MessageSquare, ai: Sparkles, invite: UserPlus, system: Settings }[k]);
const tintFor = (k: Notification["kind"]) => ({
  deal: "bg-success/10 text-success",
  message: "bg-brand/10 text-brand",
  ai: "bg-violet/10 text-violet",
  invite: "bg-warning/10 text-warning",
  system: "bg-muted text-muted-foreground",
}[k]);

const filters = [
  { k: "all", l: "All" },
  { k: "unread", l: "Unread" },
  { k: "deal", l: "Deals" },
  { k: "message", l: "Messages" },
  { k: "ai", l: "AI" },
  { k: "invite", l: "Invites" },
];

function NotificationsPage() {
  const [items, setItems] = useState(notifications);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    let xs = items;
    if (filter === "unread") xs = xs.filter((n) => n.unread);
    else if (filter !== "all") xs = xs.filter((n) => n.kind === filter);
    if (q) xs = xs.filter((n) => (n.title + n.body).toLowerCase().includes(q.toLowerCase()));
    return xs;
  }, [items, filter, q]);

  const unread = items.filter((n) => n.unread).length;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            {unread > 0 && <span className="text-[10px] rounded-full bg-brand/10 text-brand px-1.5 py-0.5 font-medium">{unread} unread</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Everything happening across your raise — investor activity, documents, and AI insights.</p>
        </div>
        <button onClick={() => setItems((xs) => xs.map((n) => ({ ...n, unread: false })))} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notifications…" className="w-full rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-full px-3 py-1.5 text-xs transition-colors ${filter === f.k ? "bg-foreground text-background" : "border border-border/60 hover:bg-accent"}`}>{f.l}</button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60 overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No notifications match.</div>
        ) : (
          list.map((n) => {
            const Icon = iconFor(n.kind);
            return (
              <div key={n.id} className={`flex gap-4 px-5 py-4 hover:bg-accent/40 transition-colors ${n.unread ? "bg-brand/[0.02]" : ""}`}>
                <div className={`grid h-10 w-10 place-items-center rounded-lg shrink-0 ${tintFor(n.kind)}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {n.unread && <span className="h-2 w-2 rounded-full bg-brand" />}
                      <span className="text-xs text-muted-foreground tabular-nums">{n.time}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

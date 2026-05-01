import { Link } from "@tanstack/react-router";
import { notifications, type Notification } from "@/lib/mock";
import { Bell, MessageSquare, Briefcase, Sparkles, UserPlus, Settings, CheckCheck } from "lucide-react";
import { useState } from "react";

const iconFor = (k: Notification["kind"]) => {
  switch (k) {
    case "deal": return Briefcase;
    case "message": return MessageSquare;
    case "ai": return Sparkles;
    case "invite": return UserPlus;
    case "system": return Settings;
  }
};

const tintFor = (k: Notification["kind"]) => {
  switch (k) {
    case "deal": return "bg-success/10 text-success";
    case "message": return "bg-brand/10 text-brand";
    case "ai": return "bg-violet/10 text-violet";
    case "invite": return "bg-warning/10 text-warning";
    case "system": return "bg-muted text-muted-foreground";
  }
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const unread = items.filter((n) => n.unread).length;

  const markAll = () => setItems((xs) => xs.map((n) => ({ ...n, unread: false })));

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
              {items.slice(0, 6).map((n) => {
                const Icon = iconFor(n.kind);
                return (
                  <div key={n.id} className={`flex gap-3 p-3.5 hover:bg-accent/50 transition-colors cursor-pointer ${n.unread ? "bg-brand/[0.02]" : ""}`}>
                    <div className={`grid h-8 w-8 place-items-center rounded-md shrink-0 ${tintFor(n.kind)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-tight">{n.title}</div>
                        {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-brand mt-1.5 shrink-0" />}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                      <div className="mt-1 text-[10px] text-muted-foreground/70">{n.time}</div>
                    </div>
                  </div>
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

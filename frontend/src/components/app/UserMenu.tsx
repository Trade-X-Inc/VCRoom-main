import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { LogOut, Settings, User, Users, Activity } from "lucide-react";
import { useAccountContext } from "@/hooks/useAccountContext";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const ctx = useAccountContext();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const isInvestor = user.role === "investor";

  const initials = user.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  // "Team" appoints/removes members and assigns roles — admin-only surface
  // (CLAUDE.md R12 step 3). Hidden here rather than disabled-with-tooltip
  // because it's a whole page, not a single action.
  const menuItems = isInvestor
    ? [
        { icon: User, label: "Account", to: "/app/investor/profile" as const },
        ...(ctx.canManageTeam ? [{ icon: Users, label: "Team", to: "/app/investor/team" as const }] : []),
        { icon: Settings, label: "Settings", to: "/app/investor/settings" as const },
      ]
    : [
        { icon: User, label: "Account", to: "/app/profile" as const },
        ...(ctx.canManageTeam ? [{ icon: Users, label: "Team & users", to: "/app/users" as const }] : []),
        { icon: Settings, label: "Settings", to: "/app/settings" as const },
      ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold ring-2 ring-transparent hover:ring-brand/20 transition-all"
        aria-label="Account menu"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[260px] rounded-xl border border-border/60 bg-popover shadow-elev z-40 overflow-hidden">
            <div className="p-3.5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-sm font-semibold">{initials}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user.fullName || user.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-muted-foreground font-medium">{user.role}</span>
              </div>
            </div>

            <div className="p-1">
              {menuItems.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground/80 hover:bg-accent hover:text-foreground"
                >
                  <m.icon className="h-4 w-4 text-muted-foreground" /> {m.label}
                </Link>
              ))}
              {/* Audit log — page exists, data is placeholder (activity tracking coming soon) */}
              <Link
                to="/app/audit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground/80 hover:bg-accent hover:text-foreground"
              >
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>Activity log</span>
                <span className="ml-auto text-[9px] text-muted-foreground border border-border/60 rounded px-1 py-0.5">soon</span>
              </Link>
            </div>

            <div className="p-1 border-t border-border/60">
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { LogOut, Settings, User, Users, ShieldCheck } from "lucide-react";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold ring-2 ring-transparent hover:ring-brand/20 transition-all"
        aria-label="Account menu"
      >
        {user.initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[260px] rounded-xl border border-border/60 bg-popover shadow-elev z-40 overflow-hidden">
            <div className="p-3.5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-sm font-semibold">{user.initials}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-muted-foreground font-medium">{user.role}</span>
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-muted-foreground">{user.workspace}</span>
              </div>
            </div>

            <div className="p-1">
              {[
                { icon: User, label: "Account", to: "/app/profile" as const },
                { icon: Users, label: "Team & users", to: "/app/users" as const },
                { icon: ShieldCheck, label: "Audit log", to: "/app/audit" as const },
                { icon: Settings, label: "Settings", to: "/app/profile" as const },
              ].map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground/80 hover:bg-accent hover:text-foreground"
                >
                  <m.icon className="h-4 w-4 text-muted-foreground" /> {m.label}
                </Link>
              ))}
            </div>

            <div className="p-1 border-t border-border/60">
              <button
                onClick={() => { signOut(); setOpen(false); nav({ to: "/sign-in", search: { redirect: "/app" } }); }}
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

import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { LogOut, Settings, User, Users, Activity } from "lucide-react";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useFounderAvatarUrl } from "@/hooks/useFounderAvatarUrl";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const ctx = useAccountContext();
  const avatarUrl = useFounderAvatarUrl(ctx.startupId);
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
    <div className="relative font-v2-ui">
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center overflow-hidden text-white text-xs font-semibold transition-colors"
        style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-accent)" }}
        aria-label="Account menu"
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-[260px] overflow-hidden z-40"
            style={{ borderRadius: "var(--v2-radius)", border: "1px solid var(--v2-rule)", background: "var(--v2-panel)" }}
          >
            <div className="p-3.5" style={{ borderBottom: "1px solid var(--v2-rule)" }}>
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center text-white text-sm font-semibold"
                  style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-accent)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--v2-ink)" }}>{user.fullName || user.email}</div>
                  <div className="text-xs truncate" style={{ color: "var(--v2-ink-muted)" }}>{user.email}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                <span
                  className="px-1.5 py-0.5 font-medium"
                  style={{ borderRadius: "var(--v2-radius)", background: "var(--v2-accent-wash)", color: "var(--v2-accent)" }}
                >
                  {user.role}
                </span>
              </div>
            </div>

            <div className="p-1">
              {menuItems.map((m) => (
                <Link
                  key={m.label}
                  to={m.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 text-sm transition-colors"
                  style={{ borderRadius: "var(--v2-radius)", padding: "8px 10px", color: "var(--v2-ink)" }}
                >
                  <m.icon className="h-4 w-4" style={{ color: "var(--v2-ink-muted)" }} /> {m.label}
                </Link>
              ))}
              {/* Audit log — page exists and reads a real table (activity_log),
                  not placeholder data; the "soon" label is stale copy left
                  over from before that table was wired (CLAUDE.md §7.5
                  second-copy-of-truth pattern) and belongs to that page's own
                  audit, not this shell rebuild. Left as-is. */}
              <Link
                to="/app/audit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 text-sm transition-colors"
                style={{ borderRadius: "var(--v2-radius)", padding: "8px 10px", color: "var(--v2-ink)" }}
              >
                <Activity className="h-4 w-4" style={{ color: "var(--v2-ink-muted)" }} />
                <span>Activity log</span>
                <span
                  className="ml-auto text-[9px] px-1 py-0.5"
                  style={{ color: "var(--v2-ink-muted)", border: "1px solid var(--v2-rule)", borderRadius: "var(--v2-radius)" }}
                >
                  soon
                </span>
              </Link>
            </div>

            <div className="p-1" style={{ borderTop: "1px solid var(--v2-rule)" }}>
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="w-full flex items-center gap-2.5 text-sm transition-colors"
                style={{ borderRadius: "var(--v2-radius)", padding: "8px 10px", color: "var(--v2-adverse)" }}
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

import { createFileRoute } from "@tanstack/react-router";
import { members, invites, type Role, type MemberStatus } from "@/lib/mock";
import { useMemo, useState } from "react";
import { Users, UserPlus, Search, MoreHorizontal, Mail, Copy, Check, X } from "lucide-react";

export const Route = createFileRoute("/app/users")({
  component: UsersPage,
});

const roleColor: Record<Role, string> = {
  Owner: "bg-violet/10 text-violet border-violet/20",
  Admin: "bg-brand/10 text-brand border-brand/20",
  Member: "bg-accent text-foreground border-border/60",
  Viewer: "bg-muted text-muted-foreground border-border/60",
};
const statusDot = (s: MemberStatus) => s === "Active" ? "bg-success" : s === "Pending" ? "bg-warning" : "bg-muted-foreground/40";

function UsersPage() {
  const [tab, setTab] = useState<"team" | "invites">("team");
  const [q, setQ] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const filteredMembers = useMemo(
    () => members.filter((m) => !q || (m.name + m.email).toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  const filteredInvites = useMemo(
    () => invites.filter((i) => !q || i.email.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">Team & users</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Manage who can access your workspace and deal rooms.</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm font-medium shadow-glow">
          <UserPlus className="h-4 w-4" /> Invite people
        </button>
      </div>

      <div className="mt-6 flex items-center gap-2 border-b border-border/60">
        {[
          { k: "team", l: "Team", count: members.length },
          { k: "invites", l: "Invites", count: invites.filter((i) => i.status === "Pending").length },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`relative px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.l} <span className="ml-1 text-xs text-muted-foreground tabular-nums">{t.count}</span>
            {tab === t.k && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
        ))}

        <div className="ml-auto relative pb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-64 rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
        </div>
      </div>

      {tab === "team" && (
        <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-[1.6fr_1fr_120px_140px_60px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div>Member</div><div>Role</div><div>Status</div><div>Last active</div><div></div>
          </div>
          <div className="divide-y divide-border/60">
            {filteredMembers.map((m) => (
              <div key={m.id} className="grid grid-cols-[1.6fr_1fr_120px_140px_60px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0">{m.initials}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium border ${roleColor[m.role]}`}>{m.role}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDot(m.status)}`} />
                  {m.status}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">{m.lastActive}</div>
                <button className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "invites" && (
        <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-[1.6fr_1fr_1fr_120px_60px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div>Email</div><div>Scope</div><div>Sent by</div><div>Status</div><div></div>
          </div>
          <div className="divide-y divide-border/60">
            {filteredInvites.map((i) => (
              <div key={i.id} className="grid grid-cols-[1.6fr_1fr_1fr_120px_60px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{i.email}</span>
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${roleColor[i.role]}`}>{i.role}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{i.scope}</div>
                <div className="text-xs">
                  <div className="font-medium">{i.sentBy}</div>
                  <div className="text-muted-foreground">{i.sentAt}</div>
                </div>
                <div>
                  <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium border ${
                    i.status === "Pending" ? "bg-warning/10 text-warning border-warning/20"
                    : i.status === "Accepted" ? "bg-success/10 text-success border-success/20"
                    : i.status === "Expired" ? "bg-muted text-muted-foreground border-border/60"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}>{i.status}</span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button title="Copy invite link" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                  {i.status === "Pending" && (
                    <button title="Revoke" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<Role>("Member");
  const [scope, setScope] = useState("Workspace");
  const [sent, setSent] = useState(false);
  const link = "https://app.ventureroom.com/join/vr_invite_a8f3k2x";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border/60 bg-popover shadow-elev overflow-hidden">
        <div className="px-6 py-5 border-b border-border/60">
          <div className="text-sm font-semibold">Invite people to Atlas Robotics</div>
          <div className="mt-0.5 text-xs text-muted-foreground">They'll receive an email with a secure invite link.</div>
        </div>

        {sent ? (
          <div className="p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success"><Check className="h-6 w-6" /></div>
            <div className="mt-4 text-sm font-medium">Invites sent</div>
            <div className="mt-1 text-xs text-muted-foreground">Pending invites will appear in the Invites tab.</div>
            <button onClick={onClose} className="mt-5 w-full rounded-md bg-foreground text-background py-2 text-sm font-medium">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium">Emails</label>
              <textarea value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="alice@firm.com, bob@firm.com" className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:border-brand/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50">
                  {(["Admin", "Member", "Viewer"] as Role[]).map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Scope</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)} className="mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50">
                  <option>Workspace</option>
                  <option>Atlas · Deal Room</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border/60 bg-accent/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Or share a link</div>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background border border-border/60 px-2 py-1.5 text-[11px]">{link}</code>
                <button onClick={() => navigator.clipboard?.writeText(link)} className="grid h-8 w-8 place-items-center rounded-md border border-border/60 hover:bg-accent"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">Cancel</button>
              <button onClick={() => setSent(true)} className="rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm font-medium shadow-glow">Send invites</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

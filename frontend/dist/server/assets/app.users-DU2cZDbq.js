import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Search, Mail, Copy, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { u as useAuth, s as supabase } from "./router-DZsyhUH_.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "clsx";
const roleColor = {
  Owner: "bg-violet/10 text-violet border-violet/20",
  Admin: "bg-brand/10 text-brand border-brand/20",
  Member: "bg-accent text-foreground border-border/60",
  Viewer: "bg-muted text-muted-foreground border-border/60",
  investor: "bg-success/10 text-success border-success/20",
  founder: "bg-brand/10 text-brand border-brand/20"
};
function UsersPage() {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("team");
  const [q, setQ] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const {
    data: members = [],
    isLoading: membersLoading
  } = useQuery({
    queryKey: ["org-members", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase.from("organization_members").select("user_id, role, created_at, users(full_name)").order("created_at", {
          ascending: true
        });
        if (error) return [];
        return data ?? [];
      } catch {
        return [];
      }
    }
  });
  const {
    data: invites = [],
    isLoading: invitesLoading
  } = useQuery({
    queryKey: ["my-invites", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("invites").select("id, email, role, deal_room_id, invited_by, accepted_at, expires_at, created_at, token").eq("invited_by", user.id).is("deal_room_id", null).order("created_at", {
        ascending: false
      });
      if (error) return [];
      return data ?? [];
    }
  });
  const pendingInvites = invites.filter((i) => !i.accepted_at && (!i.expires_at || new Date(i.expires_at) > /* @__PURE__ */ new Date()));
  const filteredMembers = members.filter((m) => {
    if (!q) return true;
    const name = m.users?.full_name ?? "";
    return name.toLowerCase().includes(q.toLowerCase());
  });
  const filteredInvites = invites.filter((i) => !q || i.email.toLowerCase().includes(q.toLowerCase()));
  const handleRevoke = async (id) => {
    if (!confirm("Revoke this invite?")) return;
    const {
      error
    } = await supabase.from("invites").delete().eq("id", id);
    if (error) {
      toast.error("Could not revoke invite");
    } else {
      toast.success("Invite revoked");
      queryClient.invalidateQueries({
        queryKey: ["my-invites", user?.id]
      });
    }
  };
  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/join/${token}`;
    navigator.clipboard?.writeText(link);
    toast.success("Link copied");
  };
  const selfRow = {
    user_id: user?.id ?? "",
    role: "Owner",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    users: {
      full_name: user?.name ?? "You"
    }
  };
  const allMembers = [selfRow, ...filteredMembers.filter((m) => m.user_id !== user?.id)];
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-6xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Users, { className: "h-5 w-5 text-brand" }),
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Team & users" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Manage who can access your workspace and deal rooms." })
      ] }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setShowInvite(true), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm font-medium shadow-glow", children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "h-4 w-4" }),
        " Invite people"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center gap-2 border-b border-border/60", children: [
      [{
        k: "team",
        l: "Team",
        count: allMembers.length
      }, {
        k: "invites",
        l: "Invites",
        count: pendingInvites.length
      }].map((t) => /* @__PURE__ */ jsxs("button", { onClick: () => setTab(t.k), className: `relative px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`, children: [
        t.l,
        " ",
        /* @__PURE__ */ jsx("span", { className: "ml-1 text-xs text-muted-foreground tabular-nums", children: t.count }),
        tab === t.k && /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" })
      ] }, t.k)),
      /* @__PURE__ */ jsxs("div", { className: "ml-auto relative pb-2", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search…", className: "w-64 rounded-md border border-border/60 bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] })
    ] }),
    tab === "team" && /* @__PURE__ */ jsxs(Fragment, { children: [
      membersLoading ? /* @__PURE__ */ jsx("div", { className: "mt-5 space-y-3", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "h-14 rounded-xl bg-muted animate-pulse" }, i)) }) : /* @__PURE__ */ jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_1fr_60px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
          /* @__PURE__ */ jsx("div", { children: "Member" }),
          /* @__PURE__ */ jsx("div", { children: "Role" }),
          /* @__PURE__ */ jsx("div", { children: "Joined" }),
          /* @__PURE__ */ jsx("div", {})
        ] }),
        /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: allMembers.map((m) => {
          const name = m.users?.full_name ?? "Unknown";
          const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";
          const isSelf = m.user_id === user?.id;
          return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_1fr_60px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0", children: initials }),
              /* @__PURE__ */ jsx("div", { className: "min-w-0", children: /* @__PURE__ */ jsxs("div", { className: "text-sm font-medium truncate", children: [
                name,
                isSelf && /* @__PURE__ */ jsx("span", { className: "ml-1 text-xs text-muted-foreground", children: "(you)" })
              ] }) })
            ] }),
            /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("span", { className: `text-[10px] rounded-full px-2 py-0.5 font-medium border ${roleColor[m.role] ?? roleColor.Member}`, children: m.role }) }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: isSelf ? "Owner" : formatDistanceToNow(new Date(m.created_at), {
              addSuffix: true
            }) }),
            /* @__PURE__ */ jsx("div", {})
          ] }, m.user_id);
        }) })
      ] }),
      allMembers.length <= 1 && !membersLoading && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-xl border border-dashed border-border/60 bg-card p-8 text-center", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-8 w-8 text-muted-foreground/40 mx-auto mb-2" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "Just you for now" }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Invite your first team member to get started." }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setShowInvite(true), className: "mt-3 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(UserPlus, { className: "h-3.5 w-3.5" }),
          " Invite someone"
        ] })
      ] })
    ] }),
    tab === "invites" && /* @__PURE__ */ jsx(Fragment, { children: invitesLoading ? /* @__PURE__ */ jsx("div", { className: "mt-5 space-y-3", children: [1, 2].map((i) => /* @__PURE__ */ jsx("div", { className: "h-14 rounded-xl bg-muted animate-pulse" }, i)) }) : filteredInvites.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-5 rounded-xl border border-dashed border-border/60 bg-card p-8 text-center", children: [
      /* @__PURE__ */ jsx(Mail, { className: "h-8 w-8 text-muted-foreground/40 mx-auto mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "No pending invites" }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Invited people will appear here." })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "mt-5 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_1fr_80px] gap-4 px-5 py-2.5 border-b border-border/60 bg-accent/30 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold", children: [
        /* @__PURE__ */ jsx("div", { children: "Email" }),
        /* @__PURE__ */ jsx("div", { children: "Role" }),
        /* @__PURE__ */ jsx("div", { children: "Sent" }),
        /* @__PURE__ */ jsx("div", {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: filteredInvites.map((inv) => {
        const expired = inv.expires_at ? new Date(inv.expires_at) < /* @__PURE__ */ new Date() : false;
        const accepted = !!inv.accepted_at;
        const status = accepted ? "Accepted" : expired ? "Expired" : "Pending";
        const statusCls = accepted ? "bg-success/10 text-success border-success/20" : expired ? "bg-muted text-muted-foreground border-border/60" : "bg-warning/10 text-warning border-warning/20";
        return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[1.6fr_1fr_1fr_80px] gap-4 px-5 py-3.5 items-center hover:bg-accent/40", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [
            /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium truncate", children: inv.email })
          ] }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("span", { className: `text-[10px] rounded-full px-2 py-0.5 font-medium border ${roleColor[inv.role] ?? roleColor.Member}`, children: inv.role }) }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            formatDistanceToNow(new Date(inv.created_at), {
              addSuffix: true
            }),
            /* @__PURE__ */ jsx("div", { className: "mt-0.5", children: /* @__PURE__ */ jsx("span", { className: `text-[10px] rounded-full px-1.5 py-0.5 font-medium border ${statusCls}`, children: status }) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end gap-1", children: !accepted && !expired && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("button", { title: "Copy invite link", onClick: () => copyInviteLink(inv.token), className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }) }),
            /* @__PURE__ */ jsx("button", { title: "Revoke", onClick: () => handleRevoke(inv.id), className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) })
          ] }) })
        ] }, inv.id);
      }) })
    ] }) }),
    showInvite && /* @__PURE__ */ jsx(InviteModal, { userId: user?.id ?? "", onClose: () => setShowInvite(false), onSent: () => queryClient.invalidateQueries({
      queryKey: ["my-invites", user?.id]
    }) })
  ] });
}
function InviteModal({
  userId,
  onClose,
  onSent
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [sending, setSending] = useState(false);
  const [sentToken, setSentToken] = useState(null);
  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }
    setSending(true);
    try {
      const {
        data,
        error
      } = await supabase.from("invites").insert({
        email: email.trim().toLowerCase(),
        role: role.toLowerCase(),
        invited_by: userId,
        deal_room_id: null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
      }).select("token").single();
      if (error) throw error;
      setSentToken(data?.token ?? null);
      toast.success("Invite created");
      onSent();
    } catch (e) {
      toast.error(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };
  const inviteLink = sentToken ? `${window.location.origin}/join/${sentToken}` : null;
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-md rounded-2xl border border-border/60 bg-popover shadow-elev overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-5 border-b border-border/60", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Invite people to your workspace" }),
      /* @__PURE__ */ jsx("div", { className: "mt-0.5 text-xs text-muted-foreground", children: "They'll receive a secure invite link." })
    ] }),
    sentToken ? /* @__PURE__ */ jsxs("div", { className: "p-6", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success mb-4", children: /* @__PURE__ */ jsx(Check, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-center", children: "Invite created" }),
      /* @__PURE__ */ jsxs("div", { className: "mt-1 text-xs text-muted-foreground text-center mb-4", children: [
        "Share this link with ",
        email
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-border/60 bg-accent/30 p-2", children: [
        /* @__PURE__ */ jsx("code", { className: "flex-1 truncate text-[11px] px-1", children: inviteLink }),
        /* @__PURE__ */ jsx("button", { onClick: () => {
          navigator.clipboard?.writeText(inviteLink);
          toast.success("Copied");
        }, className: "grid h-8 w-8 place-items-center rounded-md border border-border/60 hover:bg-accent shrink-0", children: /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "mt-4 w-full rounded-md bg-foreground text-background py-2 text-sm font-medium", children: "Done" })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "p-6 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Email address" }),
        /* @__PURE__ */ jsx("input", { value: email, onChange: (e) => setEmail(e.target.value), type: "email", placeholder: "alice@firm.com", className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Role" }),
        /* @__PURE__ */ jsx("select", { value: role, onChange: (e) => setRole(e.target.value), className: "mt-1.5 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: ["Admin", "Member", "Viewer"].map((r) => /* @__PURE__ */ jsx("option", { children: r }, r)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
        /* @__PURE__ */ jsx("button", { onClick: onClose, className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxs("button", { onClick: handleSend, disabled: sending, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm font-medium shadow-glow disabled:opacity-60", children: [
          sending ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(UserPlus, { className: "h-3.5 w-3.5" }),
          "Send invite"
        ] })
      ] })
    ] })
  ] }) });
}
export {
  UsersPage as component
};

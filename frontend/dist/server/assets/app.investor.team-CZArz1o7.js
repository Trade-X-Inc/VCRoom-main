import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { UserPlus, X, Mail, Loader2, Users, Clock } from "lucide-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-Rpa7zDhF.js";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "clsx";
function TeamPage() {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const {
    data: invites = [],
    isLoading: invitesLoading
  } = useQuery({
    queryKey: ["investor-invites", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("invites").select("id, email, role, created_at, accepted_at").eq("invited_by", user.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const pending = invites.filter((i) => !i.accepted_at);
  const accepted = invites.filter((i) => !!i.accepted_at);
  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user?.id) return;
    setSending(true);
    try {
      const token = crypto.randomUUID();
      const {
        error
      } = await supabase.from("invites").insert({
        email: inviteEmail.trim().toLowerCase(),
        role: "investor",
        invited_by: user.id,
        token,
        workspace_name: user.fullName || user.email
      });
      if (error) throw error;
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
      queryClient.invalidateQueries({
        queryKey: ["investor-invites", user.id]
      });
    } catch (e) {
      toast.error(e.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };
  const handleCancelInvite = async (id) => {
    const {
      error
    } = await supabase.from("invites").delete().eq("id", id);
    if (error) {
      toast.error("Failed to cancel invite");
      return;
    }
    toast.success("Invite cancelled");
    queryClient.invalidateQueries({
      queryKey: ["investor-invites", user?.id]
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Team" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Invite analysts and partners to collaborate on deals" })
      ] }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setShowInvite((v) => !v), className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(UserPlus, { className: "h-4 w-4" }),
        " Invite analyst"
      ] })
    ] }),
    showInvite && /* @__PURE__ */ jsxs("div", { className: "mt-5 rounded-2xl border border-brand/30 bg-card p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Send an invite" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setShowInvite(false), className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
          /* @__PURE__ */ jsx(Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsx("input", { type: "email", value: inviteEmail, onChange: (e) => setInviteEmail(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleInvite(), placeholder: "colleague@fund.com", className: "w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: handleInvite, disabled: sending || !inviteEmail.trim(), className: "inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-60", children: [
          sending && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
          "Send"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-muted-foreground", children: "They'll receive a link to join as an investor collaborator." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-3", children: "Members" }),
      /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-full bg-gradient-brand text-brand-foreground font-semibold text-sm", children: user?.fullName?.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?" }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: user?.fullName || "You" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: user?.email })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium rounded-full bg-brand/10 text-brand px-2 py-0.5", children: "Owner" })
      ] }) }),
      accepted.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-2 space-y-2", children: accepted.map((inv) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-semibold text-muted-foreground", children: inv.email[0].toUpperCase() }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: inv.email }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            "Joined ",
            formatDistanceToNow(new Date(inv.accepted_at), {
              addSuffix: true
            })
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium rounded-full bg-success/10 text-success px-2 py-0.5", children: "Analyst" })
      ] }, inv.id)) }),
      accepted.length === 0 && !showInvite && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3", children: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "Just you so far" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: "Invite analysts and partners to collaborate on deals together." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-8", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-3", children: "Pending invites" }),
      invitesLoading ? /* @__PURE__ */ jsx("div", { className: "h-20 rounded-2xl border border-border/60 bg-card animate-pulse" }) : pending.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground text-center", children: "No pending invites." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: pending.map((inv) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-4 flex items-center gap-3", children: [
        /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium truncate", children: inv.email }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
            "Sent ",
            formatDistanceToNow(new Date(inv.created_at), {
              addSuffix: true
            })
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] rounded-full bg-warning/10 text-warning px-2 py-0.5", children: "Pending" }),
        /* @__PURE__ */ jsx("button", { onClick: () => handleCancelInvite(inv.id), className: "text-muted-foreground hover:text-destructive transition-colors", title: "Cancel invite", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }, inv.id)) })
    ] })
  ] });
}
export {
  TeamPage as component
};

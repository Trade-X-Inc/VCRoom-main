import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Building2, Mail, ExternalLink } from "lucide-react";
import { u as useAuth, s as supabase } from "./router-CteB-ixO.js";
import { c as cn } from "./utils-H80jjgLf.js";
import { L as LeadDrawer } from "./LeadDrawer-BJUyhyHt.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
import "./createSsrRpc-l1y8KE69.js";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
function isPast(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < /* @__PURE__ */ new Date();
}
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = /* @__PURE__ */ new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function Meetings() {
  const {
    user
  } = useAuth();
  const [selectedLead, setSelectedLead] = useState(null);
  const {
    data: leads = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey: ["meeting-leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("vc_leads").select("*").eq("founder_id", user.id).eq("status", "Meeting Booked").order("follow_up_date", {
        ascending: true,
        nullsFirst: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const upcoming = leads.filter((l) => !isPast(l.follow_up_date));
  const past = leads.filter((l) => isPast(l.follow_up_date));
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-72 rounded bg-muted/60 animate-pulse mb-6" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "h-24 rounded-xl bg-muted/40 animate-pulse" }, i)) })
    ] });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4 mb-6", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Meetings" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Investor meetings from your VC pipeline." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
          leads.length,
          " meeting",
          leads.length !== 1 ? "s" : "",
          " booked"
        ] })
      ] }),
      leads.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card p-10 flex flex-col items-center justify-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 place-items-center rounded-full bg-accent", children: /* @__PURE__ */ jsx(Calendar, { className: "h-5 w-5 text-muted-foreground" }) }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "No meetings booked yet" }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground text-center max-w-xs", children: `Set a lead's status to "Meeting Booked" in your VC Leads tracker to see it here.` })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        upcoming.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: [
            "Upcoming (",
            upcoming.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-3", children: upcoming.map((lead) => /* @__PURE__ */ jsx(MeetingCard, { lead, onClick: () => setSelectedLead(lead) }, lead.id)) })
        ] }),
        past.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: [
            "Past (",
            past.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-3 opacity-70", children: past.map((lead) => /* @__PURE__ */ jsx(MeetingCard, { lead, onClick: () => setSelectedLead(lead) }, lead.id)) })
        ] }),
        leads.filter((l) => !l.follow_up_date).length > 0 && /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: "No date set" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-3", children: leads.filter((l) => !l.follow_up_date).map((lead) => /* @__PURE__ */ jsx(MeetingCard, { lead, onClick: () => setSelectedLead(lead) }, lead.id)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx(LeadDrawer, { open: !!selectedLead, lead: selectedLead, onClose: () => setSelectedLead(null), onSaved: () => {
      setSelectedLead(null);
      refetch();
    } })
  ] });
}
function MeetingCard({
  lead,
  onClick
}) {
  const dateStr = formatDate(lead.follow_up_date);
  const today = isToday(lead.follow_up_date);
  const past = isPast(lead.follow_up_date) && !today;
  return /* @__PURE__ */ jsx("button", { onClick, className: "w-full text-left rounded-xl border border-border/60 bg-card shadow-card p-4 hover:border-brand/40 hover:bg-accent/30 transition-colors", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
    /* @__PURE__ */ jsx("div", { className: cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", today ? "bg-gradient-brand text-brand-foreground" : past ? "bg-muted/60 text-muted-foreground" : "bg-brand/10 text-brand"), children: /* @__PURE__ */ jsx(Calendar, { className: "h-5 w-5" }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: lead.investor_name }),
        lead.firm_name && /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
          "· ",
          lead.firm_name
        ] }),
        today && /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand/10 text-brand", children: "Today" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mt-1 flex-wrap", children: [
        dateStr && /* @__PURE__ */ jsxs("span", { className: cn("flex items-center gap-1 text-xs", today ? "text-brand font-medium" : "text-muted-foreground"), children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
          " ",
          dateStr
        ] }),
        lead.sector && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Building2, { className: "h-3 w-3" }),
          " ",
          lead.sector
        ] }),
        lead.email && /* @__PURE__ */ jsxs("a", { href: `mailto:${lead.email}`, onClick: (e) => e.stopPropagation(), className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-brand", children: [
          /* @__PURE__ */ jsx(Mail, { className: "h-3 w-3" }),
          " ",
          lead.email
        ] }),
        lead.linkedin_url && /* @__PURE__ */ jsxs("a", { href: lead.linkedin_url, target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation(), className: "flex items-center gap-1 text-xs text-muted-foreground hover:text-brand", children: [
          /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3" }),
          " LinkedIn"
        ] })
      ] }),
      lead.notes && /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-xs text-muted-foreground line-clamp-2", children: lead.notes })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "shrink-0 flex flex-col items-end gap-1", children: [
      lead.stage && /* @__PURE__ */ jsx("span", { className: "text-[10px] rounded-full bg-accent px-2 py-0.5 text-muted-foreground", children: lead.stage }),
      lead.ticket_size && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground", children: lead.ticket_size })
    ] })
  ] }) });
}
export {
  Meetings as component
};

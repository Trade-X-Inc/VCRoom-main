import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { isToday, isFuture, isPast, isThisWeek, addWeeks, startOfWeek, format } from "date-fns";
import { toast } from "sonner";
import { Plus, Loader2, Calendar, ChevronDown, ChevronRight, Clock, Video, Building2, ExternalLink } from "lucide-react";
import { u as useAuth, s as supabase } from "./router-C9QH749P.js";
import { c as cn } from "./utils-H80jjgLf.js";
import "@supabase/supabase-js";
import "clsx";
import "tailwind-merge";
function isNextWeek(date) {
  const nextWeekStart = addWeeks(startOfWeek(/* @__PURE__ */ new Date(), {
    weekStartsOn: 1
  }), 1);
  const nextWeekEnd = addWeeks(nextWeekStart, 1);
  return date >= nextWeekStart && date < nextWeekEnd;
}
function Meetings() {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [expandedPrep, setExpandedPrep] = useState(/* @__PURE__ */ new Set());
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: "",
    scheduledAt: "",
    meetingLink: "",
    platform: "",
    prepNotes: "",
    vcLeadId: ""
  });
  const set = (k, v) => setF((s) => ({
    ...s,
    [k]: v
  }));
  const {
    data: meetings = [],
    isLoading
  } = useQuery({
    queryKey: ["my-meetings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("meetings").select("*, vc_leads(investor_name, firm_name, email)").eq("created_by", user.id).order("scheduled_at", {
        ascending: true
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const {
    data: vcLeads = []
  } = useQuery({
    queryKey: ["vc-leads-select", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("vc_leads").select("id, investor_name, firm_name").eq("founder_id", user.id).order("investor_name", {
        ascending: true
      });
      return data ?? [];
    }
  });
  const todayMeetings = meetings.filter((m) => isToday(new Date(m.scheduled_at)));
  const upcomingMeetings = meetings.filter((m) => isFuture(new Date(m.scheduled_at)) && !isToday(new Date(m.scheduled_at)));
  const pastMeetings = meetings.filter((m) => isPast(new Date(m.scheduled_at)) && !isToday(new Date(m.scheduled_at)));
  const thisWeek = upcomingMeetings.filter((m) => isThisWeek(new Date(m.scheduled_at), {
    weekStartsOn: 1
  }));
  const nextWeek = upcomingMeetings.filter((m) => isNextWeek(new Date(m.scheduled_at)));
  const later = upcomingMeetings.filter((m) => !isThisWeek(new Date(m.scheduled_at), {
    weekStartsOn: 1
  }) && !isNextWeek(new Date(m.scheduled_at)));
  const togglePrep = (id) => setExpandedPrep((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.title || !f.scheduledAt || !user?.id) return;
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("meetings").insert({
        title: f.title,
        scheduled_at: new Date(f.scheduledAt).toISOString(),
        meeting_link: f.meetingLink || null,
        platform: f.platform || null,
        prep_notes: f.prepNotes || null,
        vc_lead_id: f.vcLeadId || null,
        created_by: user.id
      });
      if (error) throw error;
      toast.success("Meeting scheduled");
      queryClient.invalidateQueries({
        queryKey: ["my-meetings", user.id]
      });
      setF({
        title: "",
        scheduledAt: "",
        meetingLink: "",
        platform: "",
        prepNotes: "",
        vcLeadId: ""
      });
      setShowForm(false);
    } catch {
      toast.error("Failed to schedule meeting");
    } finally {
      setSaving(false);
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-4xl mx-auto", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-72 rounded bg-muted/60 animate-pulse mb-6" }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "h-24 rounded-xl bg-muted/40 animate-pulse" }, i)) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-4xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4 mb-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Meetings" }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground mt-0.5", children: [
          meetings.length,
          " meeting",
          meetings.length !== 1 ? "s" : "",
          " scheduled"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setShowForm((v) => !v), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
        " Schedule meeting"
      ] })
    ] }),
    showForm && /* @__PURE__ */ jsxs("form", { onSubmit: submit, className: "mb-6 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-1", children: "New meeting" }),
      /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Title *" }),
          /* @__PURE__ */ jsx("input", { required: true, value: f.title, onChange: (e) => set("title", e.target.value), placeholder: "Intro call / Partner meeting…", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Date & Time *" }),
          /* @__PURE__ */ jsx("input", { type: "datetime-local", required: true, value: f.scheduledAt, onChange: (e) => set("scheduledAt", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "VC lead" }),
          /* @__PURE__ */ jsxs("select", { value: f.vcLeadId, onChange: (e) => set("vcLeadId", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "— None —" }),
            vcLeads.map((l) => /* @__PURE__ */ jsxs("option", { value: l.id, children: [
              l.investor_name,
              l.firm_name ? ` · ${l.firm_name}` : ""
            ] }, l.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Platform" }),
          /* @__PURE__ */ jsxs("select", { value: f.platform, onChange: (e) => set("platform", e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "— Select —" }),
            ["Zoom", "Google Meet", "Microsoft Teams", "Phone", "In-person", "Other"].map((p) => /* @__PURE__ */ jsx("option", { value: p, children: p }, p))
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Meeting link" }),
          /* @__PURE__ */ jsx("input", { type: "url", value: f.meetingLink, onChange: (e) => set("meetingLink", e.target.value), placeholder: "https://zoom.us/j/…", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sm:col-span-2", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Prep notes" }),
          /* @__PURE__ */ jsx("textarea", { value: f.prepNotes, onChange: (e) => set("prepNotes", e.target.value), rows: 2, placeholder: "Key points to cover, questions to ask…", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowForm(false), className: "rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Cancel" }),
        /* @__PURE__ */ jsxs("button", { type: "submit", disabled: !f.title || !f.scheduledAt || saving, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50", children: [
          saving && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
          "Save meeting"
        ] })
      ] })
    ] }),
    meetings.length === 0 && !showForm && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card shadow-card p-12 flex flex-col items-center gap-3 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "grid h-12 w-12 place-items-center rounded-full bg-accent", children: /* @__PURE__ */ jsx(Calendar, { className: "h-5 w-5 text-muted-foreground" }) }),
      /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "No meetings scheduled yet" }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground max-w-xs", children: "Schedule meetings directly here or set a lead's status to trigger a meeting." }),
      /* @__PURE__ */ jsx(Link, { to: "/app/leads", className: "mt-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "Go to VC Leads" })
    ] }),
    todayMeetings.length > 0 && /* @__PURE__ */ jsxs("section", { className: "mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: [
        "Today (",
        todayMeetings.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: todayMeetings.map((m) => /* @__PURE__ */ jsx(MeetingRow, { m, variant: "today", prepOpen: expandedPrep.has(m.id), onTogglePrep: () => togglePrep(m.id) }, m.id)) })
    ] }),
    upcomingMeetings.length > 0 && /* @__PURE__ */ jsxs("section", { className: "mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: [
        "Upcoming (",
        upcomingMeetings.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
        thisWeek.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground mb-2 pl-1", children: "This week" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-2", children: thisWeek.map((m) => /* @__PURE__ */ jsx(MeetingRow, { m, variant: "upcoming", prepOpen: expandedPrep.has(m.id), onTogglePrep: () => togglePrep(m.id) }, m.id)) })
        ] }),
        nextWeek.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground mb-2 pl-1", children: "Next week" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-2", children: nextWeek.map((m) => /* @__PURE__ */ jsx(MeetingRow, { m, variant: "upcoming", prepOpen: expandedPrep.has(m.id), onTogglePrep: () => togglePrep(m.id) }, m.id)) })
        ] }),
        later.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] text-muted-foreground mb-2 pl-1", children: "Later" }),
          /* @__PURE__ */ jsx("div", { className: "space-y-2", children: later.map((m) => /* @__PURE__ */ jsx(MeetingRow, { m, variant: "upcoming", prepOpen: expandedPrep.has(m.id), onTogglePrep: () => togglePrep(m.id) }, m.id)) })
        ] })
      ] })
    ] }),
    pastMeetings.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
      /* @__PURE__ */ jsxs("button", { onClick: () => setPastOpen((v) => !v), className: "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3", children: [
        pastOpen ? /* @__PURE__ */ jsx(ChevronDown, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(ChevronRight, { className: "h-3.5 w-3.5" }),
        "Past (",
        pastMeetings.length,
        ")"
      ] }),
      pastOpen && /* @__PURE__ */ jsx("div", { className: "space-y-2 opacity-60", children: pastMeetings.map((m) => /* @__PURE__ */ jsx(MeetingRow, { m, variant: "past", prepOpen: false, onTogglePrep: () => {
      } }, m.id)) })
    ] })
  ] });
}
function MeetingRow({
  m,
  variant,
  prepOpen,
  onTogglePrep
}) {
  const d = new Date(m.scheduled_at);
  const investorName = m.vc_leads?.investor_name;
  const firmName = m.vc_leads?.firm_name;
  return /* @__PURE__ */ jsx("div", { className: cn("rounded-xl border border-border/60 bg-card shadow-card p-4", variant === "today" && "border-l-4 border-l-warning"), children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
    /* @__PURE__ */ jsxs("div", { className: cn("shrink-0 grid place-items-center rounded-lg w-12 h-12 text-center", variant === "today" ? "bg-gradient-brand text-brand-foreground" : variant === "past" ? "bg-muted/60 text-muted-foreground" : "bg-brand/10 text-brand"), children: [
      /* @__PURE__ */ jsx("div", { className: "text-[10px] font-semibold uppercase", children: format(d, "MMM") }),
      /* @__PURE__ */ jsx("div", { className: "text-lg font-bold leading-none", children: format(d, "d") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: m.title }),
        variant === "today" && /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning", children: "Today" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mt-1 flex-wrap", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
          " ",
          format(d, "h:mm a")
        ] }),
        m.platform && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Video, { className: "h-3 w-3" }),
          " ",
          m.platform
        ] }),
        investorName && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Building2, { className: "h-3 w-3" }),
          investorName,
          firmName ? ` · ${firmName}` : ""
        ] })
      ] }),
      (m.prep_notes || m.notes) && /* @__PURE__ */ jsxs("button", { onClick: onTogglePrep, className: "mt-1.5 text-xs text-brand hover:underline inline-flex items-center gap-1", children: [
        prepOpen ? /* @__PURE__ */ jsx(ChevronDown, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(ChevronRight, { className: "h-3 w-3" }),
        prepOpen ? "Hide" : "Show",
        " prep notes"
      ] }),
      prepOpen && (m.prep_notes || m.notes) && /* @__PURE__ */ jsx("div", { className: "mt-2 rounded-md bg-accent/50 p-3 text-xs text-muted-foreground", children: m.prep_notes || m.notes })
    ] }),
    m.meeting_link && variant !== "past" && /* @__PURE__ */ jsxs("a", { href: m.meeting_link, target: "_blank", rel: "noopener noreferrer", className: "shrink-0 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs hover:bg-brand/10", children: [
      /* @__PURE__ */ jsx(ExternalLink, { className: "h-3 w-3" }),
      " Join"
    ] })
  ] }) });
}
export {
  Meetings as component
};

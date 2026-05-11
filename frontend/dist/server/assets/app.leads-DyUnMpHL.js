import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import { X, User, MessageSquare, Calendar, GitBranch, Loader2, Copy, Plus, Check, Clock, Trash2, ChevronDown, ChevronRight, Download, Upload, TrendingUp, Users, Zap, Briefcase, Flame, AlertCircle } from "lucide-react";
import { u as useAuth, s as supabase } from "./router-B5AOfxDk.js";
import { c as cn } from "./utils-H80jjgLf.js";
import { c as createSsrRpc } from "./createSsrRpc-l1y8KE69.js";
import { c as createServerFn } from "../server.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "clsx";
import "tailwind-merge";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const generateOutreachEmail = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("1d719b02e5cbb8bfb1f5fdbf08bea97cdac2cfff952491ca07a2d91de6f74c81"));
const generateLinkedInMessage = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("272077c9c144c7cbae7da95efd3b0536517866897833aab391e7e9e60debb102"));
const generateReply = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("08b07e340aa3dd2c22b3ea45b5ff6e1a1e3844f3dadeb4cfd75858793e9c8fb3"));
const ALL_STATUSES = [
  "New",
  "Shortlisted",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Interested",
  "Deal Room Created",
  "Follow Up",
  "Rejected"
];
const PIPELINE_MAIN = [
  "New",
  "Shortlisted",
  "Contacted",
  "Replied",
  "Meeting Booked",
  "Interested",
  "Deal Room Created"
];
const STATUS_COLOR = {
  "New": "bg-muted-foreground/20 text-muted-foreground",
  "Shortlisted": "bg-foreground/10 text-foreground",
  "Contacted": "bg-brand/15 text-brand",
  "Replied": "bg-violet/15 text-violet",
  "Meeting Booked": "bg-warning/15 text-warning",
  "Interested": "bg-warning/20 text-warning",
  "Deal Room Created": "bg-success/15 text-success",
  "Follow Up": "bg-brand/10 text-brand",
  "Rejected": "bg-destructive/15 text-destructive"
};
const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"];
const REL_STRENGTHS = ["Cold", "Warm", "Hot", "Intro"];
const MEETING_TYPES = ["Intro", "Deep Dive", "Partner", "Follow-up"];
const PLATFORMS = ["Zoom", "Google Meet", "Phone", "In Person"];
const inputCls = "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
function Field({ label, children }) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: label }),
    children
  ] });
}
function CollapsibleSection({
  title,
  defaultOpen = false,
  children
}) {
  const [open, setOpen] = useState(defaultOpen);
  return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-card overflow-hidden", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setOpen((v) => !v),
        className: "w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/30 transition-colors",
        children: [
          title,
          open ? /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 text-muted-foreground" }) : /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-muted-foreground" })
        ]
      }
    ),
    open && /* @__PURE__ */ jsx("div", { className: "px-4 pb-4 pt-1 space-y-3", children })
  ] });
}
function MeetingCard({ meeting, past = false }) {
  return /* @__PURE__ */ jsxs("div", { className: cn("rounded-lg border border-border/60 bg-card p-3", past && "opacity-60"), children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: meeting.title }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : "—" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5 shrink-0", children: [
        meeting.meeting_type && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground", children: meeting.meeting_type }),
        meeting.platform && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground", children: meeting.platform })
      ] })
    ] }),
    meeting.meeting_link && /* @__PURE__ */ jsx(
      "a",
      {
        href: meeting.meeting_link,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "mt-2 block text-xs text-brand hover:underline truncate",
        children: meeting.meeting_link
      }
    ),
    meeting.notes && /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-muted-foreground", children: meeting.notes })
  ] });
}
const emptyForm = {
  investor_name: "",
  firm_name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  twitter_url: "",
  website: "",
  sector: "",
  stage: "",
  geography: "",
  ticket_size: "",
  status: "New",
  follow_up_date: "",
  notes: "",
  source: "",
  relationship_strength: "",
  last_contacted: "",
  next_action: ""
};
function LeadDrawer({ open, lead, onClose, onSaved }) {
  const isEdit = !!lead;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [f, setF] = useState(emptyForm);
  const [emailType, setEmailType] = useState("cold");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [generatingLinkedIn, setGeneratingLinkedIn] = useState(false);
  const [generatedLinkedIn, setGeneratedLinkedIn] = useState("");
  const [investorReply, setInvestorReply] = useState("");
  const [generatingReply, setGeneratingReply] = useState(false);
  const [generatedReply, setGeneratedReply] = useState("");
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [mf, setMf] = useState({
    title: "",
    scheduled_at: "",
    meeting_type: "Intro",
    platform: "Zoom",
    meeting_link: "",
    notes: ""
  });
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  useEffect(() => {
    if (!open) return;
    setActiveTab("profile");
    setGeneratedEmail("");
    setGeneratedLinkedIn("");
    setGeneratedReply("");
    setInvestorReply("");
    setShowMeetingForm(false);
    setNewNote("");
    if (lead) {
      setF({
        investor_name: lead.investor_name ?? "",
        firm_name: lead.firm_name ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        linkedin_url: lead.linkedin_url ?? "",
        twitter_url: lead.twitter_url ?? "",
        website: lead.website ?? "",
        sector: lead.sector ?? "",
        stage: lead.stage ?? "",
        geography: lead.geography ?? "",
        ticket_size: lead.ticket_size ?? "",
        status: lead.status,
        follow_up_date: lead.follow_up_date ?? "",
        notes: lead.notes ?? "",
        source: lead.source ?? "",
        relationship_strength: lead.relationship_strength ?? "",
        last_contacted: lead.last_contacted ?? "",
        next_action: lead.next_action ?? ""
      });
    } else {
      setF(emptyForm);
    }
  }, [open, lead]);
  const { data: meetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["lead-meetings", lead?.id],
    enabled: !!lead?.id && open,
    queryFn: async () => {
      const { data } = await supabase.from("meetings").select("*").eq("vc_lead_id", lead.id).order("scheduled_at", { ascending: true });
      return data ?? [];
    }
  });
  if (!open) return null;
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const handleSave = async (e) => {
    e.preventDefault();
    if (!f.investor_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        investor_name: f.investor_name.trim(),
        firm_name: f.firm_name || null,
        email: f.email || null,
        phone: f.phone || null,
        linkedin_url: f.linkedin_url || null,
        twitter_url: f.twitter_url || null,
        website: f.website || null,
        sector: f.sector || null,
        stage: f.stage || null,
        geography: f.geography || null,
        ticket_size: f.ticket_size || null,
        status: f.status,
        follow_up_date: f.follow_up_date || null,
        notes: f.notes || null,
        source: f.source || null,
        relationship_strength: f.relationship_strength || null,
        last_contacted: f.last_contacted || null,
        next_action: f.next_action || null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (isEdit) {
        const { error } = await supabase.from("vc_leads").update(payload).eq("id", lead.id).eq("founder_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vc_leads").insert({ ...payload, founder_id: user.id });
        if (error) throw error;
      }
      toast.success("Lead saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("vc_leads").delete().eq("id", lead.id).eq("founder_id", user.id);
      if (error) throw error;
      toast.success("Lead deleted");
      onSaved();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };
  const handleGenerateEmail = async (type) => {
    if (!user?.id || !lead) return;
    setEmailType(type);
    setGeneratingEmail(true);
    setGeneratedEmail("");
    try {
      const result = await generateOutreachEmail({ data: { userId: user.id, leadId: lead.id, type } });
      setGeneratedEmail(`Subject: ${result.subject}

${result.body}`);
    } catch (err) {
      toast.error(err.message || "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  };
  const handleGenerateLinkedIn = async () => {
    if (!user?.id || !lead) return;
    setGeneratingLinkedIn(true);
    setGeneratedLinkedIn("");
    try {
      const result = await generateLinkedInMessage({ data: { userId: user.id, leadId: lead.id } });
      setGeneratedLinkedIn(result.message);
    } catch (err) {
      toast.error(err.message || "Failed to generate LinkedIn message");
    } finally {
      setGeneratingLinkedIn(false);
    }
  };
  const handleGenerateReply = async () => {
    if (!user?.id || !lead || !investorReply.trim()) return;
    setGeneratingReply(true);
    setGeneratedReply("");
    try {
      const result = await generateReply({ data: { userId: user.id, leadId: lead.id, investorReply: investorReply.trim() } });
      setGeneratedReply(result.reply);
    } catch (err) {
      toast.error(err.message || "Failed to generate reply");
    } finally {
      setGeneratingReply(false);
    }
  };
  const handleSaveEmailToNotes = async () => {
    if (!lead || !generatedEmail) return;
    const tag = emailType === "cold" ? "Cold Email" : "Follow-up Email";
    const entry = `**${tag} (${(/* @__PURE__ */ new Date()).toLocaleDateString()}):**
${generatedEmail}`;
    const appended = [f.notes, entry].filter(Boolean).join("\n\n---\n\n");
    await supabase.from("vc_leads").update({ notes: appended, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", lead.id);
    setF((s) => ({ ...s, notes: appended }));
    queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
    toast.success("Saved to notes");
  };
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!lead?.id) return;
    setSchedulingMeeting(true);
    try {
      const { error } = await supabase.from("meetings").insert({
        vc_lead_id: lead.id,
        title: mf.title,
        scheduled_at: mf.scheduled_at,
        meeting_type: mf.meeting_type,
        platform: mf.platform,
        meeting_link: mf.meeting_link || null,
        notes: mf.notes || null
      });
      if (error) throw error;
      toast.success("Meeting scheduled");
      setShowMeetingForm(false);
      setMf({ title: "", scheduled_at: "", meeting_type: "Intro", platform: "Zoom", meeting_link: "", notes: "" });
      refetchMeetings();
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      toast.error(err.message || "Failed to schedule");
    } finally {
      setSchedulingMeeting(false);
    }
  };
  const handleUpdateStatus = async (newStatus) => {
    if (!lead?.id || !user?.id) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase.from("vc_leads").update({ status: newStatus, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", lead.id).eq("founder_id", user.id);
      if (error) throw error;
      setF((s) => ({ ...s, status: newStatus }));
      queryClient.invalidateQueries({ queryKey: ["leads", user.id] });
      toast.success(`Status → ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };
  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    setAddingNote(true);
    const entry = `${newNote.trim()}
_${(/* @__PURE__ */ new Date()).toLocaleString()}_`;
    const appended = [f.notes, entry].filter(Boolean).join("\n\n---\n\n");
    try {
      const { error } = await supabase.from("vc_leads").update({ notes: appended, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", lead.id);
      if (error) throw error;
      setF((s) => ({ ...s, notes: appended }));
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };
  const notesList = f.notes ? f.notes.split("\n\n---\n\n").filter(Boolean).reverse() : [];
  const now = /* @__PURE__ */ new Date();
  const upcomingMeetings = meetings.filter((m) => new Date(m.scheduled_at) >= now);
  const pastMeetings = meetings.filter((m) => new Date(m.scheduled_at) < now);
  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "outreach", label: "Outreach", icon: MessageSquare },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "pipeline", label: "Pipeline", icon: GitBranch }
  ];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxs("aside", { className: "fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[600px] lg:w-[660px] border-l border-border/60 bg-background shadow-elev flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "h-14 border-b border-border/60 flex items-center justify-between px-5 shrink-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold text-sm shrink-0", children: (f.investor_name || "?")[0].toUpperCase() }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold truncate", children: isEdit ? f.investor_name || "Edit lead" : "New lead" }),
            f.firm_name && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate", children: f.firm_name })
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onClose,
            className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground shrink-0",
            children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "border-b border-border/60 flex shrink-0", children: TABS.map((tab) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setActiveTab(tab.id),
          className: cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors",
            activeTab === tab.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          ),
          children: [
            /* @__PURE__ */ jsx(tab.icon, { className: "h-3.5 w-3.5" }),
            tab.label
          ]
        },
        tab.id
      )) }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSave, className: "flex flex-col flex-1 min-h-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4", children: [
          activeTab === "profile" && /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsx(Field, { label: "Investor name *", children: /* @__PURE__ */ jsx(
              "input",
              {
                required: true,
                value: f.investor_name,
                onChange: (e) => set("investor_name", e.target.value),
                placeholder: "Sarah Johnson",
                className: inputCls
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsx(Field, { label: "Firm name", children: /* @__PURE__ */ jsx("input", { value: f.firm_name, onChange: (e) => set("firm_name", e.target.value), placeholder: "Sequoia Capital", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Email", children: /* @__PURE__ */ jsx("input", { type: "email", value: f.email, onChange: (e) => set("email", e.target.value), placeholder: "sarah@sequoia.com", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Phone", children: /* @__PURE__ */ jsx("input", { value: f.phone, onChange: (e) => set("phone", e.target.value), placeholder: "+1 555 0100", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "LinkedIn URL", children: /* @__PURE__ */ jsx("input", { value: f.linkedin_url, onChange: (e) => set("linkedin_url", e.target.value), placeholder: "linkedin.com/in/...", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Twitter / X", children: /* @__PURE__ */ jsx("input", { value: f.twitter_url, onChange: (e) => set("twitter_url", e.target.value), placeholder: "@username", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Website", children: /* @__PURE__ */ jsx("input", { value: f.website, onChange: (e) => set("website", e.target.value), placeholder: "sequoiacap.com", className: inputCls }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsx(Field, { label: "Sector", children: /* @__PURE__ */ jsx("input", { value: f.sector, onChange: (e) => set("sector", e.target.value), placeholder: "SaaS, FinTech…", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Stage", children: /* @__PURE__ */ jsxs("select", { value: f.stage, onChange: (e) => set("stage", e.target.value), className: inputCls, children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select…" }),
                STAGES.map((s) => /* @__PURE__ */ jsx("option", { children: s }, s))
              ] }) }),
              /* @__PURE__ */ jsx(Field, { label: "Geography", children: /* @__PURE__ */ jsx("input", { value: f.geography, onChange: (e) => set("geography", e.target.value), placeholder: "US, Europe…", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Ticket size", children: /* @__PURE__ */ jsx("input", { value: f.ticket_size, onChange: (e) => set("ticket_size", e.target.value), placeholder: "$500K–$2M", className: inputCls }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsx(Field, { label: "Relationship", children: /* @__PURE__ */ jsxs("select", { value: f.relationship_strength, onChange: (e) => set("relationship_strength", e.target.value), className: inputCls, children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select…" }),
                REL_STRENGTHS.map((r) => /* @__PURE__ */ jsx("option", { children: r }, r))
              ] }) }),
              /* @__PURE__ */ jsx(Field, { label: "Follow-up date", children: /* @__PURE__ */ jsx("input", { type: "date", value: f.follow_up_date, onChange: (e) => set("follow_up_date", e.target.value), className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Last contacted", children: /* @__PURE__ */ jsx("input", { type: "date", value: f.last_contacted, onChange: (e) => set("last_contacted", e.target.value), className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Source", children: /* @__PURE__ */ jsx("input", { value: f.source, onChange: (e) => set("source", e.target.value), placeholder: "LinkedIn, intro…", className: inputCls }) })
            ] }),
            /* @__PURE__ */ jsx(Field, { label: "Next action", children: /* @__PURE__ */ jsx("input", { value: f.next_action, onChange: (e) => set("next_action", e.target.value), placeholder: "Send deck, follow up…", className: inputCls }) }),
            /* @__PURE__ */ jsx(Field, { label: "Notes", children: /* @__PURE__ */ jsx(
              "textarea",
              {
                value: f.notes,
                onChange: (e) => set("notes", e.target.value),
                rows: 4,
                placeholder: "Context, thesis fit, intro source…",
                className: cn(inputCls, "resize-none")
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-2", children: "Status" }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: ALL_STATUSES.map((s) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => set("status", s),
                  className: cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-all border",
                    f.status === s ? `${STATUS_COLOR[s]} border-current` : "bg-muted/40 text-muted-foreground border-transparent hover:border-border/60"
                  ),
                  children: s
                },
                s
              )) })
            ] })
          ] }),
          activeTab === "outreach" && /* @__PURE__ */ jsx("div", { className: "space-y-3", children: !isEdit ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border/60 bg-accent/30 p-4 text-sm text-muted-foreground text-center", children: "Save this lead first to generate outreach content." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(CollapsibleSection, { title: "AI Email Generator", defaultOpen: true, children: [
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                "Personalised email for ",
                /* @__PURE__ */ jsx("strong", { children: f.investor_name }),
                f.firm_name ? ` at ${f.firm_name}` : "",
                "."
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleGenerateEmail("cold"),
                    disabled: generatingEmail,
                    className: "flex-1 rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5",
                    children: [
                      generatingEmail && emailType === "cold" && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                      "Cold email"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleGenerateEmail("followup"),
                    disabled: generatingEmail,
                    className: "flex-1 rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5",
                    children: [
                      generatingEmail && emailType === "followup" && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                      "Follow-up"
                    ]
                  }
                )
              ] }),
              generatingEmail && !generatedEmail && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground", children: [
                /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }),
                " Generating…"
              ] }),
              generatedEmail && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-brand/30 bg-background p-3 space-y-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-brand uppercase tracking-wide", children: emailType === "cold" ? "Cold Email" : "Follow-up" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          navigator.clipboard.writeText(generatedEmail);
                          toast.success("Copied!");
                        },
                        className: "flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs hover:bg-accent",
                        children: [
                          /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }),
                          " Copy"
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: handleSaveEmailToNotes,
                        className: "flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs hover:bg-accent",
                        children: "Save"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    value: generatedEmail,
                    onChange: (e) => setGeneratedEmail(e.target.value),
                    rows: 10,
                    className: cn(inputCls, "resize-none text-xs font-mono")
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs(CollapsibleSection, { title: "LinkedIn Message", children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Generate a short connection request (<300 chars)." }),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleGenerateLinkedIn,
                  disabled: generatingLinkedIn,
                  className: "w-full rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5",
                  children: [
                    generatingLinkedIn && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                    "Generate LinkedIn message"
                  ]
                }
              ),
              generatedLinkedIn && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background p-3 space-y-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
                    generatedLinkedIn.length,
                    "/300 chars"
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          navigator.clipboard.writeText(generatedLinkedIn);
                          toast.success("Copied!");
                        },
                        className: "flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs hover:bg-accent",
                        children: [
                          /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }),
                          " Copy"
                        ]
                      }
                    ),
                    f.linkedin_url && /* @__PURE__ */ jsx(
                      "a",
                      {
                        href: f.linkedin_url.startsWith("http") ? f.linkedin_url : `https://${f.linkedin_url}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs hover:bg-accent text-brand",
                        children: "Open ↗"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    value: generatedLinkedIn,
                    onChange: (e) => setGeneratedLinkedIn(e.target.value),
                    rows: 4,
                    className: cn(inputCls, "resize-none text-xs")
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs(CollapsibleSection, { title: "Reply Handler", children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Paste the investor's reply and generate your follow-up." }),
              /* @__PURE__ */ jsx(Field, { label: "Investor's reply", children: /* @__PURE__ */ jsx(
                "textarea",
                {
                  value: investorReply,
                  onChange: (e) => setInvestorReply(e.target.value),
                  rows: 3,
                  placeholder: "Paste the investor's email or message here…",
                  className: cn(inputCls, "resize-none text-xs")
                }
              ) }),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleGenerateReply,
                  disabled: generatingReply || !investorReply.trim(),
                  className: "w-full rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5",
                  children: [
                    generatingReply && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                    "Generate reply"
                  ]
                }
              ),
              generatedReply && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-background p-3 space-y-2", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide", children: "Your reply" }),
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        navigator.clipboard.writeText(generatedReply);
                        toast.success("Copied!");
                      },
                      className: "flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs hover:bg-accent",
                      children: [
                        /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }),
                        " Copy"
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    value: generatedReply,
                    onChange: (e) => setGeneratedReply(e.target.value),
                    rows: 6,
                    className: cn(inputCls, "resize-none text-xs")
                  }
                )
              ] })
            ] })
          ] }) }),
          activeTab === "meetings" && /* @__PURE__ */ jsx("div", { className: "space-y-4", children: !isEdit ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border/60 bg-accent/30 p-4 text-sm text-muted-foreground text-center", children: "Save this lead first to schedule meetings." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setShowMeetingForm((v) => !v),
                className: "w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                children: [
                  /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
                  " Schedule meeting"
                ]
              }
            ),
            showMeetingForm && /* @__PURE__ */ jsxs("form", { onSubmit: handleScheduleMeeting, className: "rounded-lg border border-border/60 bg-card p-4 space-y-3", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "New meeting" }),
              /* @__PURE__ */ jsx(Field, { label: "Title", children: /* @__PURE__ */ jsx("input", { required: true, value: mf.title, onChange: (e) => setMf((s) => ({ ...s, title: e.target.value })), placeholder: "Intro call with Sarah", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Date & Time", children: /* @__PURE__ */ jsx("input", { required: true, type: "datetime-local", value: mf.scheduled_at, onChange: (e) => setMf((s) => ({ ...s, scheduled_at: e.target.value })), className: inputCls }) }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ jsx(Field, { label: "Type", children: /* @__PURE__ */ jsx("select", { value: mf.meeting_type, onChange: (e) => setMf((s) => ({ ...s, meeting_type: e.target.value })), className: inputCls, children: MEETING_TYPES.map((t) => /* @__PURE__ */ jsx("option", { children: t }, t)) }) }),
                /* @__PURE__ */ jsx(Field, { label: "Platform", children: /* @__PURE__ */ jsx("select", { value: mf.platform, onChange: (e) => setMf((s) => ({ ...s, platform: e.target.value })), className: inputCls, children: PLATFORMS.map((p) => /* @__PURE__ */ jsx("option", { children: p }, p)) }) })
              ] }),
              /* @__PURE__ */ jsx(Field, { label: "Meeting link", children: /* @__PURE__ */ jsx("input", { value: mf.meeting_link, onChange: (e) => setMf((s) => ({ ...s, meeting_link: e.target.value })), placeholder: "https://zoom.us/j/...", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Prep notes", children: /* @__PURE__ */ jsx("textarea", { value: mf.notes, onChange: (e) => setMf((s) => ({ ...s, notes: e.target.value })), rows: 2, placeholder: "Questions to ask, talking points…", className: cn(inputCls, "resize-none") }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-1", children: [
                /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowMeetingForm(false), className: "flex-1 rounded-md border border-border/60 py-2 text-xs hover:bg-accent", children: "Cancel" }),
                /* @__PURE__ */ jsxs("button", { type: "submit", disabled: schedulingMeeting, className: "flex-1 rounded-md bg-gradient-brand text-brand-foreground py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5", children: [
                  schedulingMeeting && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                  "Schedule"
                ] })
              ] })
            ] }),
            upcomingMeetings.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "Upcoming" }),
              /* @__PURE__ */ jsx("div", { className: "space-y-2", children: upcomingMeetings.map((m) => /* @__PURE__ */ jsx(MeetingCard, { meeting: m }, m.id)) })
            ] }),
            pastMeetings.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "Past" }),
              /* @__PURE__ */ jsx("div", { className: "space-y-2", children: pastMeetings.map((m) => /* @__PURE__ */ jsx(MeetingCard, { meeting: m, past: true }, m.id)) })
            ] }),
            meetings.length === 0 && !showMeetingForm && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground", children: "No meetings yet" })
          ] }) }),
          activeTab === "pipeline" && /* @__PURE__ */ jsx("div", { className: "space-y-5", children: !isEdit ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border/60 bg-accent/30 p-4 text-sm text-muted-foreground text-center", children: "Save this lead first to track pipeline progress." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-4", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3", children: "Pipeline stage" }),
              /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5 mb-2", children: PIPELINE_MAIN.map((s, i) => {
                const isActive = f.status === s;
                const mainIdx = PIPELINE_MAIN.findIndex((x) => x === f.status);
                const isPast = mainIdx > i;
                return /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: () => handleUpdateStatus(s),
                    disabled: updatingStatus,
                    className: cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border disabled:opacity-60",
                      isActive ? "bg-brand text-brand-foreground border-brand shadow-glow" : isPast ? "bg-brand/10 text-brand border-brand/30" : "bg-muted/40 text-muted-foreground border-transparent hover:border-border/60"
                    ),
                    children: [
                      isActive && /* @__PURE__ */ jsx(Check, { className: "h-3 w-3 shrink-0" }),
                      s
                    ]
                  },
                  s
                );
              }) }),
              /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 pt-1 border-t border-border/40", children: ["Follow Up", "Rejected"].map((s) => /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => handleUpdateStatus(s),
                  disabled: updatingStatus,
                  className: cn(
                    "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border disabled:opacity-60",
                    f.status === s ? `${STATUS_COLOR[s]} border-current` : "bg-muted/40 text-muted-foreground border-transparent hover:border-border/60"
                  ),
                  children: [
                    f.status === s && /* @__PURE__ */ jsx(Check, { className: "h-3 w-3 shrink-0" }),
                    s
                  ]
                },
                s
              )) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2", children: "Activity log" }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    value: newNote,
                    onChange: (e) => setNewNote(e.target.value),
                    rows: 2,
                    placeholder: "Add update, meeting note, or status change reason…",
                    className: cn(inputCls, "resize-none text-xs")
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    onClick: handleAddNote,
                    disabled: addingNote || !newNote.trim(),
                    className: "w-full rounded-md bg-gradient-brand text-brand-foreground py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5",
                    children: [
                      addingNote && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                      "Add to log"
                    ]
                  }
                )
              ] })
            ] }),
            notesList.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground", children: "No activity logged yet" }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: notesList.map((note, i) => /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border/60 bg-card p-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-2", children: [
              /* @__PURE__ */ jsx(Clock, { className: "h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" }),
              /* @__PURE__ */ jsx("pre", { className: "text-xs whitespace-pre-wrap font-sans text-muted-foreground", children: note })
            ] }) }, i)) })
          ] }) })
        ] }),
        activeTab === "profile" && /* @__PURE__ */ jsxs("div", { className: "shrink-0 border-t border-border/60 px-5 py-3 flex items-center justify-between gap-2", children: [
          isEdit ? /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: handleDelete,
              disabled: deleting,
              className: "inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/10 disabled:opacity-50",
              children: [
                deleting ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }),
                "Delete"
              ]
            }
          ) : /* @__PURE__ */ jsx("div", {}),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                className: "rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "submit",
                disabled: saving || !f.investor_name.trim(),
                className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50",
                children: [
                  saving && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                  isEdit ? "Save changes" : "Add lead"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}
const STATUS_DOT = {
  "New": "bg-muted-foreground/50",
  "Shortlisted": "bg-foreground",
  "Contacted": "bg-brand",
  "Replied": "bg-violet",
  "Meeting Booked": "bg-warning",
  "Interested": "bg-warning",
  "Deal Room Created": "bg-success",
  "Follow Up": "bg-brand",
  "Rejected": "bg-destructive"
};
function normKey(k) {
  return k.toLowerCase().replace(/[\s\-]+/g, "_");
}
function mapCsvRow(raw) {
  const n = {};
  Object.keys(raw).forEach((k) => {
    n[normKey(k)] = raw[k] ?? "";
  });
  const email = (n["email"] || n["email_address"] || "").trim();
  if (!email) return null;
  const raw_name = n["investor_name"] || n["investor"] || n["name"] || n["contact_name"] || "";
  const investor_name = raw_name.trim() || email.split("@")[0];
  return {
    investor_name,
    firm_name: n["firm_name"] || n["firm"] || n["company"] || n["fund"] || void 0,
    email,
    linkedin_url: n["linkedin_url"] || n["linkedin"] || void 0,
    sector: n["sector"] || n["focus"] || void 0,
    stage: n["stage"] || n["investment_stage"] || void 0,
    geography: n["geography"] || n["region"] || n["location"] || void 0,
    ticket_size: n["ticket_size"] || n["check_size"] || n["check"] || n["ticket"] || void 0
  };
}
function Leads() {
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const {
    data: leads = [],
    isLoading
  } = useQuery({
    queryKey: ["leads", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const {
        data,
        error
      } = await supabase.from("vc_leads").select("*").eq("founder_id", user.id).order("updated_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const grouped = useMemo(() => {
    const map = {};
    ALL_STATUSES.forEach((s) => {
      map[s] = [];
    });
    leads.forEach((l) => {
      (map[l.status] ?? map["New"]).push(l);
    });
    return map;
  }, [leads]);
  const handleDrop = async (leadId, newStatus) => {
    if (!user?.id) return;
    await supabase.from("vc_leads").update({
      status: newStatus,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", leadId).eq("founder_id", user.id);
    queryClient.invalidateQueries({
      queryKey: ["leads", user.id]
    });
  };
  const openAdd = () => {
    setEditLead(null);
    setDrawerOpen(true);
  };
  const downloadSampleCsv = () => {
    const csv = ["investor_name,firm_name,email,linkedin_url,sector,stage,geography,ticket_size", "Sarah Chen,Sequoia Capital,sarah@sequoia.com,https://linkedin.com/in/sarahchen,SaaS,Seed,US,$250K-$1M", "Marcus Rivera,Accel Partners,marcus@accel.com,https://linkedin.com/in/marcusrivera,Fintech,Series A,Europe,$1M-$5M"].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const openEdit = (lead) => {
    setEditLead(lead);
    setDrawerOpen(true);
  };
  const total = leads.length;
  const contacted = leads.filter((l) => ["Contacted", "Replied", "Meeting Booked"].includes(l.status)).length;
  const hot = leads.filter((l) => ["Interested", "Meeting Booked"].includes(l.status)).length;
  const dealRooms = leads.filter((l) => l.status === "Deal Room Created").length;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col", style: {
    height: "calc(100vh - 4rem)"
  }, children: [
    /* @__PURE__ */ jsxs("div", { className: "px-8 py-5 border-b border-border/60 flex items-center justify-between gap-4 shrink-0", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "VC Leads" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-0.5", children: isLoading ? "Loading…" : `${total} investors in pipeline` })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("button", { onClick: downloadSampleCsv, className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }),
          " Sample CSV"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setCsvOpen(true), className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
          " Import CSV"
        ] }),
        /* @__PURE__ */ jsxs("button", { onClick: openAdd, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
          " Add Lead"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0", children: [["Total leads", total, TrendingUp, "brand"], ["Contacted", contacted, Users, "violet"], ["Hot leads", hot, Zap, "warning"], ["Deal rooms", dealRooms, Briefcase, "success"]].map(([label, value, Icon, color]) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-4 shadow-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { children: label }),
        /* @__PURE__ */ jsx(Icon, { className: `h-3.5 w-3.5 text-${color}` })
      ] }),
      /* @__PURE__ */ jsx("div", { className: `mt-2 text-2xl font-semibold text-${color}`, children: value })
    ] }, label)) }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto px-8 pb-6 min-h-0", children: /* @__PURE__ */ jsx("div", { className: "flex gap-3 h-full", style: {
      minWidth: "max-content"
    }, children: ALL_STATUSES.map((status) => /* @__PURE__ */ jsx(KanbanColumn, { status, leads: grouped[status] ?? [], isLoading, onDrop: handleDrop, onCardClick: openEdit }, status)) }) }),
    /* @__PURE__ */ jsx(LeadDrawer, { open: drawerOpen, lead: editLead, onClose: () => {
      setDrawerOpen(false);
      setEditLead(null);
    }, onSaved: () => {
      queryClient.invalidateQueries({
        queryKey: ["leads", user?.id]
      });
      setDrawerOpen(false);
      setEditLead(null);
    } }),
    csvOpen && /* @__PURE__ */ jsx(CsvImportModal, { userId: user?.id ?? "", onClose: () => setCsvOpen(false), onImported: () => {
      queryClient.invalidateQueries({
        queryKey: ["leads", user?.id]
      });
      setCsvOpen(false);
    } })
  ] });
}
function KanbanColumn({
  status,
  leads,
  isLoading,
  onDrop,
  onCardClick
}) {
  const [dragOver, setDragOver] = useState(false);
  const isFirst = status === ALL_STATUSES[0];
  return /* @__PURE__ */ jsxs("div", { className: "w-[240px] flex-shrink-0 flex flex-col", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-1 mb-2.5 shrink-0", children: [
      /* @__PURE__ */ jsx("span", { className: cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[status]) }),
      /* @__PURE__ */ jsx("span", { className: "text-sm font-medium", children: status }),
      /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: isLoading ? "…" : leads.length })
    ] }),
    /* @__PURE__ */ jsx("div", { onDragOver: (e) => {
      e.preventDefault();
      setDragOver(true);
    }, onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
    }, onDrop: (e) => {
      e.preventDefault();
      setDragOver(false);
      const leadId = e.dataTransfer.getData("leadId");
      if (leadId) onDrop(leadId, status);
    }, className: cn("flex-1 rounded-xl border border-border/60 p-2 space-y-2 transition-colors overflow-y-auto min-h-[400px]", "max-h-[calc(100vh-280px)]", dragOver ? "bg-brand/5 border-brand/40" : "bg-muted/30"), children: isLoading ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "h-20 rounded-lg bg-muted/60 animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "h-20 rounded-lg bg-muted/60 animate-pulse" })
    ] }) : leads.length === 0 && isFirst ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-32 gap-2 text-center", children: [
      /* @__PURE__ */ jsx(Users, { className: "h-7 w-7 text-muted-foreground/30" }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground/60", children: [
        "No leads yet.",
        /* @__PURE__ */ jsx("br", {}),
        "Add one or import a CSV."
      ] })
    ] }) : leads.map((l) => /* @__PURE__ */ jsx(LeadCard, { lead: l, onClick: () => onCardClick(l) }, l.id)) })
  ] });
}
function LeadCard({
  lead,
  onClick
}) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(12, 0, 0, 0);
  const followUp = lead.follow_up_date ? /* @__PURE__ */ new Date(lead.follow_up_date + "T12:00:00") : null;
  const isOverdue = followUp !== null && followUp <= today;
  const isHot = lead.status === "Interested";
  return /* @__PURE__ */ jsxs("div", { draggable: true, onDragStart: (e) => {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.effectAllowed = "move";
  }, onClick, className: "rounded-lg border border-border/60 bg-card p-3 shadow-xs hover:shadow-card cursor-grab active:cursor-grabbing transition-all select-none", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold truncate leading-snug", children: lead.investor_name }),
          isHot && /* @__PURE__ */ jsx(Flame, { className: "h-3 w-3 text-warning shrink-0" })
        ] }),
        lead.firm_name && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate mt-0.5", children: lead.firm_name })
      ] }),
      lead.ticket_size && /* @__PURE__ */ jsx("span", { className: "text-[11px] text-muted-foreground shrink-0 tabular-nums", children: lead.ticket_size })
    ] }),
    followUp && /* @__PURE__ */ jsxs("div", { className: cn("mt-2 text-[11px] inline-flex items-center gap-1", isOverdue ? "text-warning" : "text-muted-foreground"), children: [
      isOverdue && /* @__PURE__ */ jsx(AlertCircle, { className: "h-3 w-3" }),
      followUp.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      })
    ] })
  ] });
}
const PREVIEW_COLS = ["investor_name", "firm_name", "email", "sector", "stage", "geography", "ticket_size"];
function CsvImportModal({
  userId,
  onClose,
  onImported
}) {
  const fileRef = useRef(null);
  const [mapped, setMapped] = useState(null);
  const [skipped, setSkipped] = useState(0);
  const [importing, setImporting] = useState(false);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        const valid = [];
        let skip = 0;
        rows.forEach((r) => {
          const m = mapCsvRow(r);
          if (m) valid.push(m);
          else skip++;
        });
        setMapped(valid);
        setSkipped(skip);
      }
    });
  };
  const doImport = async () => {
    if (!mapped || mapped.length === 0 || !userId) return;
    setImporting(true);
    try {
      const rows = mapped.map((r) => ({
        ...r,
        founder_id: userId,
        status: "New"
      }));
      const {
        error
      } = await supabase.from("vc_leads").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} leads imported`);
      onImported();
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-2xl rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-b border-border/60 flex items-center justify-between", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold", children: "Import CSV" }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-5 space-y-5", children: [
      !mapped && /* @__PURE__ */ jsxs("div", { onClick: () => fileRef.current?.click(), className: "rounded-xl border-2 border-dashed border-border/60 bg-muted/30 hover:bg-accent/40 hover:border-brand/50 p-8 text-center cursor-pointer transition-all", children: [
        /* @__PURE__ */ jsx(Upload, { className: "h-8 w-8 mx-auto text-muted-foreground mb-3" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Click to select a CSV file" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Expected columns: investor_name, firm_name, email, sector, stage…" }),
        /* @__PURE__ */ jsx("input", { ref: fileRef, type: "file", accept: ".csv", className: "hidden", onChange: handleFile })
      ] }),
      mapped && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-medium", children: [
            mapped.length,
            " leads found",
            skipped > 0 && /* @__PURE__ */ jsxs("span", { className: "ml-2 text-xs text-warning", children: [
              "(",
              skipped,
              " skipped — no email)"
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => {
            setMapped(null);
            setSkipped(0);
          }, className: "text-xs text-muted-foreground hover:text-foreground underline", children: "Choose different file" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 overflow-hidden", children: [
          /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-xs", children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { className: "bg-muted/30 border-b border-border/60", children: PREVIEW_COLS.map((col) => /* @__PURE__ */ jsx("th", { className: "px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap", children: col.replace(/_/g, " ") }, col)) }) }),
            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-border/60", children: mapped.slice(0, 5).map((row, i) => /* @__PURE__ */ jsx("tr", { className: "hover:bg-accent/30", children: PREVIEW_COLS.map((col) => /* @__PURE__ */ jsx("td", { className: "px-3 py-2 truncate max-w-[160px]", children: row[col] || /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/50", children: "—" }) }, col)) }, i)) })
          ] }) }),
          mapped.length > 5 && /* @__PURE__ */ jsxs("div", { className: "px-3 py-2 bg-muted/20 border-t border-border/60 text-xs text-muted-foreground", children: [
            "+ ",
            mapped.length - 5,
            " more rows"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2", children: [
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { onClick: doImport, disabled: !mapped || mapped.length === 0 || importing, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50", children: importing ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
        " Importing…"
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        "Import ",
        mapped ? `${mapped.length} leads` : "all"
      ] }) })
    ] })
  ] }) });
}
export {
  Leads as component
};

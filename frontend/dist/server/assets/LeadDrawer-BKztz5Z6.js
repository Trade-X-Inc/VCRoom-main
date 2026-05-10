import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { X, User, MessageSquare, Calendar, Plus, Loader2, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, s as supabase } from "./router-DvYvv7LG.js";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { c as cn } from "./utils-H80jjgLf.js";
import { c as createSsrRpc } from "./createSsrRpc-l1y8KE69.js";
import { c as createServerFn } from "../server.js";
const generateOutreachEmail = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("1d719b02e5cbb8bfb1f5fdbf08bea97cdac2cfff952491ca07a2d91de6f74c81"));
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
  useEffect(() => {
    if (!open) return;
    setActiveTab("profile");
    setGeneratedEmail("");
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
      const result = await generateOutreachEmail({
        data: { userId: user.id, leadId: lead.id, type }
      });
      setGeneratedEmail(`Subject: ${result.subject}

${result.body}`);
    } catch (err) {
      toast.error(err.message || "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
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
  const TABS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "outreach", label: "Outreach", icon: MessageSquare },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "notes", label: "Notes", icon: Plus }
  ];
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm", onClick: onClose }),
    /* @__PURE__ */ jsxs("aside", { className: "fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[480px] border-l border-border/60 bg-background shadow-elev flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "h-14 border-b border-border/60 flex items-center justify-between px-5 shrink-0", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold", children: isEdit ? f.investor_name || "Edit lead" : "Add lead" }),
        /* @__PURE__ */ jsx("button", { onClick: onClose, className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
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
            /* @__PURE__ */ jsx(Field, { label: "Investor name *", children: /* @__PURE__ */ jsx("input", { required: true, value: f.investor_name, onChange: (e) => set("investor_name", e.target.value), placeholder: "Sarah Johnson", className: inputCls }) }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsx(Field, { label: "Firm name", children: /* @__PURE__ */ jsx("input", { value: f.firm_name, onChange: (e) => set("firm_name", e.target.value), placeholder: "Sequoia Capital", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Email *", children: /* @__PURE__ */ jsx("input", { type: "email", required: true, value: f.email, onChange: (e) => set("email", e.target.value), placeholder: "sarah@sequoia.com", className: inputCls }) }),
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
              /* @__PURE__ */ jsx(Field, { label: "Status", children: /* @__PURE__ */ jsx("select", { value: f.status, onChange: (e) => set("status", e.target.value), className: inputCls, children: ALL_STATUSES.map((s) => /* @__PURE__ */ jsx("option", { children: s }, s)) }) }),
              /* @__PURE__ */ jsx(Field, { label: "Relationship", children: /* @__PURE__ */ jsxs("select", { value: f.relationship_strength, onChange: (e) => set("relationship_strength", e.target.value), className: inputCls, children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Select…" }),
                REL_STRENGTHS.map((r) => /* @__PURE__ */ jsx("option", { children: r }, r))
              ] }) }),
              /* @__PURE__ */ jsx(Field, { label: "Follow-up date", children: /* @__PURE__ */ jsx("input", { type: "date", value: f.follow_up_date, onChange: (e) => set("follow_up_date", e.target.value), className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Last contacted", children: /* @__PURE__ */ jsx("input", { type: "date", value: f.last_contacted, onChange: (e) => set("last_contacted", e.target.value), className: inputCls }) })
            ] }),
            /* @__PURE__ */ jsx(Field, { label: "Source (how you found them)", children: /* @__PURE__ */ jsx("input", { value: f.source, onChange: (e) => set("source", e.target.value), placeholder: "LinkedIn, intro from John, conference…", className: inputCls }) }),
            /* @__PURE__ */ jsx(Field, { label: "Next action", children: /* @__PURE__ */ jsx("input", { value: f.next_action, onChange: (e) => set("next_action", e.target.value), placeholder: "Send deck, follow up on meeting…", className: inputCls }) }),
            /* @__PURE__ */ jsx(Field, { label: "Notes", children: /* @__PURE__ */ jsx("textarea", { value: f.notes, onChange: (e) => set("notes", e.target.value), rows: 4, placeholder: "Context, intro source, thesis fit…", className: cn(inputCls, "resize-none") }) })
          ] }),
          activeTab === "outreach" && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            !isEdit && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border/60 bg-accent/30 p-4 text-sm text-muted-foreground text-center", children: "Save this lead first to generate outreach emails." }),
            isEdit && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-4", children: [
                /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-3", children: "AI Email Generator" }),
                /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mb-3", children: [
                  "Generate a personalised email for",
                  " ",
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
                        generatingEmail && emailType === "cold" ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : null,
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
                        generatingEmail && emailType === "followup" ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : null,
                        "Follow-up"
                      ]
                    }
                  )
                ] })
              ] }),
              generatingEmail && !generatedEmail && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-6 flex items-center justify-center gap-3 text-sm text-muted-foreground", children: [
                /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }),
                "Generating email…"
              ] }),
              generatedEmail && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-brand/30 bg-card p-4 space-y-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-brand uppercase tracking-wide", children: emailType === "cold" ? "Cold Email" : "Follow-up Email" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          navigator.clipboard.writeText(generatedEmail);
                          toast.success("Copied!");
                        },
                        className: "flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-accent",
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
                        className: "flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-accent",
                        children: "Save to notes"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsx(
                  "textarea",
                  {
                    value: generatedEmail,
                    onChange: (e) => setGeneratedEmail(e.target.value),
                    rows: 12,
                    className: cn(inputCls, "resize-none text-xs font-mono")
                  }
                )
              ] })
            ] })
          ] }),
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
              /* @__PURE__ */ jsx(Field, { label: "Meeting link (optional)", children: /* @__PURE__ */ jsx("input", { value: mf.meeting_link, onChange: (e) => setMf((s) => ({ ...s, meeting_link: e.target.value })), placeholder: "https://zoom.us/j/...", className: inputCls }) }),
              /* @__PURE__ */ jsx(Field, { label: "Prep notes", children: /* @__PURE__ */ jsx("textarea", { value: mf.notes, onChange: (e) => setMf((s) => ({ ...s, notes: e.target.value })), rows: 2, placeholder: "Questions to ask, talking points…", className: cn(inputCls, "resize-none") }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-1", children: [
                /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowMeetingForm(false), className: "flex-1 rounded-md border border-border/60 py-2 text-xs hover:bg-accent", children: "Cancel" }),
                /* @__PURE__ */ jsxs("button", { type: "submit", disabled: schedulingMeeting, className: "flex-1 rounded-md bg-gradient-brand text-brand-foreground py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5", children: [
                  schedulingMeeting && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                  "Schedule"
                ] })
              ] })
            ] }),
            meetings.length === 0 && !showMeetingForm && /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground", children: "No meetings yet" }),
            meetings.map((m) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border/60 bg-card p-4", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: m.title }),
                  /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "—" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
                  m.meeting_type && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground", children: m.meeting_type }),
                  m.platform && /* @__PURE__ */ jsx("span", { className: "rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground", children: m.platform })
                ] })
              ] }),
              m.meeting_link && /* @__PURE__ */ jsx("a", { href: m.meeting_link, target: "_blank", rel: "noopener noreferrer", className: "mt-2 block text-xs text-brand hover:underline truncate", children: m.meeting_link }),
              m.notes && /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-muted-foreground", children: m.notes })
            ] }, m.id))
          ] }) }),
          activeTab === "notes" && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            isEdit && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  value: newNote,
                  onChange: (e) => setNewNote(e.target.value),
                  rows: 3,
                  placeholder: "Add a note, update, or observation…",
                  className: cn(inputCls, "resize-none")
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleAddNote,
                  disabled: addingNote || !newNote.trim(),
                  className: "w-full rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5",
                  children: [
                    addingNote && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
                    "Add note"
                  ]
                }
              )
            ] }),
            notesList.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground", children: "No notes yet" }) : notesList.map((note, i) => /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border/60 bg-card p-4", children: /* @__PURE__ */ jsx("pre", { className: "text-sm whitespace-pre-wrap font-sans", children: note }) }, i))
          ] })
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
            /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: "Cancel" }),
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
export {
  ALL_STATUSES as A,
  LeadDrawer as L
};

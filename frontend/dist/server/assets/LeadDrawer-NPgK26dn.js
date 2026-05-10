import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Sparkles, Loader2, Check, Copy, BookOpen, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth, s as supabase } from "./router-DLzDuQL7.js";
import { useQueryClient } from "@tanstack/react-query";
import { c as cn } from "./utils-H80jjgLf.js";
import { c as createSsrRpc } from "./createSsrRpc-l1y8KE69.js";
import { c as createServerFn } from "../server.js";
const generateOutreachEmail = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("1d719b02e5cbb8bfb1f5fdbf08bea97cdac2cfff952491ca07a2d91de6f74c81"));
function AIEmailComposer({ lead, onSaveToNotes }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const generate = async (type) => {
    if (!user) return;
    setLoading(type);
    setRateLimited(false);
    setResult(null);
    try {
      const res = await generateOutreachEmail({ data: { leadId: lead.id, type, userId: user.id } });
      setSubject(res.subject);
      setBody(res.body);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Rate limit exceeded") {
        setRateLimited(true);
      } else {
        toast.error("Failed to generate — try again");
      }
    } finally {
      setLoading(null);
    }
  };
  const copyEmail = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}

${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2e3);
  };
  const saveToNotes = () => {
    onSaveToNotes(`Subject: ${subject}

${body}`);
    toast.success("Saved to notes");
  };
  const isLoading = loading !== null;
  return /* @__PURE__ */ jsxs("div", { className: "border-t border-border/60 pt-4 mt-1", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mb-3", children: [
      /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand" }),
      /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-brand uppercase tracking-wide", children: "AI Email Generator" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => generate("cold"),
          disabled: isLoading,
          className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50 flex-1 justify-center",
          children: [
            loading === "cold" ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : null,
            "Cold email"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => generate("followup"),
          disabled: isLoading,
          className: cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 flex-1 justify-center"
          ),
          children: [
            loading === "followup" ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : null,
            "Follow-up"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground mt-2", children: "AI-generated · Review before sending" }),
    rateLimited && /* @__PURE__ */ jsx("p", { className: "mt-3 text-xs text-warning bg-warning/10 rounded-md px-3 py-2", children: "Daily limit reached (10 emails). Resets in 1 hour." }),
    result && /* @__PURE__ */ jsxs("div", { className: "mt-4 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Subject" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: subject,
            onChange: (e) => setSubject(e.target.value),
            className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: "Body" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            value: body,
            onChange: (e) => setBody(e.target.value),
            rows: 6,
            className: "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10 resize-none"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: copyEmail,
            className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent flex-1 justify-center",
            children: copied ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-success" }),
              " Copied!"
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }),
              " Copy email"
            ] })
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: saveToNotes,
            className: "inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent flex-1 justify-center",
            children: [
              /* @__PURE__ */ jsx(BookOpen, { className: "h-3.5 w-3.5" }),
              " Save to notes"
            ]
          }
        )
      ] })
    ] })
  ] });
}
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
const inputCls = "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
function Field({ label, children }) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("label", { className: "block text-xs text-muted-foreground mb-1", children: label }),
    children
  ] });
}
function LeadDrawer({ open, lead, onClose, onSaved }) {
  const isEdit = !!lead;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [f, setF] = useState({
    investor_name: "",
    firm_name: "",
    email: "",
    linkedin_url: "",
    sector: "",
    stage: "",
    geography: "",
    ticket_size: "",
    status: "New",
    follow_up_date: "",
    notes: ""
  });
  useEffect(() => {
    if (!open) return;
    if (lead) {
      setF({
        investor_name: lead.investor_name ?? "",
        firm_name: lead.firm_name ?? "",
        email: lead.email ?? "",
        linkedin_url: lead.linkedin_url ?? "",
        sector: lead.sector ?? "",
        stage: lead.stage ?? "",
        geography: lead.geography ?? "",
        ticket_size: lead.ticket_size ?? "",
        status: lead.status,
        follow_up_date: lead.follow_up_date ?? "",
        notes: lead.notes ?? ""
      });
    } else {
      setF({
        investor_name: "",
        firm_name: "",
        email: "",
        linkedin_url: "",
        sector: "",
        stage: "",
        geography: "",
        ticket_size: "",
        status: "New",
        follow_up_date: "",
        notes: ""
      });
    }
  }, [open, lead]);
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
        linkedin_url: f.linkedin_url || null,
        sector: f.sector || null,
        stage: f.stage || null,
        geography: f.geography || null,
        ticket_size: f.ticket_size || null,
        status: f.status,
        follow_up_date: f.follow_up_date || null,
        notes: f.notes || null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (isEdit) {
        const { error } = await supabase.from("vc_leads").update(payload).eq("id", lead.id).eq("founder_id", user.id);
        console.log("[LeadDrawer] Update result:", { error });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("vc_leads").insert({ ...payload, founder_id: user.id }).select().single();
        console.log("[LeadDrawer] Insert result:", { data, error });
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
  const handleSaveToNotes = async (text) => {
    if (!lead) return;
    const appended = [f.notes, text].filter(Boolean).join("\n\n---\n\n");
    await supabase.from("vc_leads").update({ notes: appended, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", lead.id).eq("founder_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        className: "fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm",
        onClick: onClose
      }
    ),
    /* @__PURE__ */ jsxs("aside", { className: "fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[400px] border-l border-border/60 bg-background shadow-elev flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "h-14 border-b border-border/60 flex items-center justify-between px-5 shrink-0", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold", children: isEdit ? "Edit lead" : "Add lead" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onClose,
            className: "grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground",
            children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("form", { onSubmit: handleSave, className: "flex flex-col flex-1 min-h-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4 space-y-3", children: [
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
            /* @__PURE__ */ jsx(Field, { label: "Firm name", children: /* @__PURE__ */ jsx(
              "input",
              {
                value: f.firm_name,
                onChange: (e) => set("firm_name", e.target.value),
                placeholder: "Sequoia Capital",
                className: inputCls
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Email *", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "email",
                required: true,
                value: f.email,
                onChange: (e) => set("email", e.target.value),
                placeholder: "sarah@sequoia.com",
                className: inputCls
              }
            ) })
          ] }),
          /* @__PURE__ */ jsx(Field, { label: "LinkedIn URL", children: /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: f.linkedin_url,
              onChange: (e) => set("linkedin_url", e.target.value),
              placeholder: "https://linkedin.com/in/...",
              className: inputCls
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsx(Field, { label: "Sector", children: /* @__PURE__ */ jsx(
              "input",
              {
                value: f.sector,
                onChange: (e) => set("sector", e.target.value),
                placeholder: "SaaS, FinTech…",
                className: inputCls
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Stage", children: /* @__PURE__ */ jsxs(
              "select",
              {
                value: f.stage,
                onChange: (e) => set("stage", e.target.value),
                className: inputCls,
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", children: "Select…" }),
                  STAGES.map((s) => /* @__PURE__ */ jsx("option", { value: s, children: s }, s))
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Geography", children: /* @__PURE__ */ jsx(
              "input",
              {
                value: f.geography,
                onChange: (e) => set("geography", e.target.value),
                placeholder: "US, Europe…",
                className: inputCls
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Ticket size", children: /* @__PURE__ */ jsx(
              "input",
              {
                value: f.ticket_size,
                onChange: (e) => set("ticket_size", e.target.value),
                placeholder: "$500K–$2M",
                className: inputCls
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Status", children: /* @__PURE__ */ jsx(
              "select",
              {
                value: f.status,
                onChange: (e) => set("status", e.target.value),
                className: inputCls,
                children: ALL_STATUSES.map((s) => /* @__PURE__ */ jsx("option", { value: s, children: s }, s))
              }
            ) }),
            /* @__PURE__ */ jsx(Field, { label: "Follow-up date", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "date",
                value: f.follow_up_date,
                onChange: (e) => set("follow_up_date", e.target.value),
                className: inputCls
              }
            ) })
          ] }),
          /* @__PURE__ */ jsx(Field, { label: "Notes", children: /* @__PURE__ */ jsx(
            "textarea",
            {
              value: f.notes,
              onChange: (e) => set("notes", e.target.value),
              rows: 3,
              placeholder: "Context, intro source, thesis fit…",
              className: cn(inputCls, "resize-none")
            }
          ) }),
          isEdit && lead?.email && /* @__PURE__ */ jsx(AIEmailComposer, { lead, onSaveToNotes: handleSaveToNotes })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "shrink-0 border-t border-border/60 px-5 py-3 flex items-center justify-between gap-2", children: [
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
                disabled: saving || !f.investor_name.trim() || !f.email.trim(),
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

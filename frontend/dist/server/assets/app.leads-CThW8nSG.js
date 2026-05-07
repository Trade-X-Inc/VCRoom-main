import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, Copy, BookOpen, X, Trash2, Download, Upload, Plus, TrendingUp, Users, Zap, Briefcase, Flame, AlertCircle } from "lucide-react";
import { u as useAuth, s as supabase } from "./router-Bc1fEXNe.js";
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
  if (!open) return null;
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
  }, [lead]);
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
            /* @__PURE__ */ jsx(Field, { label: "Email", children: /* @__PURE__ */ jsx(
              "input",
              {
                type: "email",
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
              type: "url",
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
  const investor_name = n["investor_name"] || n["investor"] || n["name"] || n["contact_name"] || "";
  if (!investor_name.trim()) return null;
  return {
    investor_name: investor_name.trim(),
    firm_name: n["firm_name"] || n["firm"] || n["company"] || n["fund"] || void 0,
    email: n["email"] || n["email_address"] || void 0,
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
              " rows skipped — investor_name is required)"
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

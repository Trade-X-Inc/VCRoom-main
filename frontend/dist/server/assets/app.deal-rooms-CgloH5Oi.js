import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, ArrowUpRight, Briefcase, X, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-C9QH749P.js";
import { formatDistanceToNow } from "date-fns";
import { c as cn } from "./utils-H80jjgLf.js";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
const STATUS_COLOR = {
  new: "bg-brand/15 text-brand",
  active: "bg-success/15 text-success",
  closed: "bg-muted/60 text-muted-foreground",
  rejected: "bg-destructive/15 text-destructive"
};
function statusLabel(s) {
  if (!s) return "New";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function DealRooms() {
  const [open, setOpen] = useState(false);
  const {
    user
  } = useAuth();
  const {
    data: startup
  } = useQuery({
    queryKey: ["dr-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("id, company_name").eq("founder_id", user.id).limit(1).maybeSingle();
      return data;
    }
  });
  const {
    data: rooms = [],
    isLoading
  } = useQuery({
    queryKey: ["deal-rooms", user?.id],
    enabled: !!startup?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_rooms").select(`
          id, status, created_at, updated_at,
          deal_room_members(user_id, role, users(full_name, email)),
          deal_room_documents(id)
        `).eq("startup_id", startup.id).order("updated_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "p-8 flex items-center justify-center min-h-64", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-muted-foreground" }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Rooms" }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
          rooms.length,
          " room",
          rooms.length !== 1 ? "s" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setOpen(true), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
        " Create new deal room"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [
      rooms.map((r) => {
        const members = r.deal_room_members ?? [];
        const investorMember = members.find((m) => m.role !== "founder");
        const investorName = investorMember?.users?.full_name ?? investorMember?.users?.email ?? "Investor pending";
        const docsCount = (r.deal_room_documents ?? []).length;
        const daysOpen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 864e5);
        const lastActivity = r.updated_at ? formatDistanceToNow(new Date(r.updated_at), {
          addSuffix: true
        }) : "—";
        const status = r.status ?? "new";
        const initials = investorName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
        return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow flex flex-col gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-xs font-semibold shrink-0", children: initials || "DR" }),
              /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsx("div", { className: "font-semibold truncate", children: investorName }),
                /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate", children: startup?.company_name ?? "Deal Room" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("span", { className: cn("rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0", STATUS_COLOR[status] ?? "bg-muted/60 text-muted-foreground"), children: statusLabel(status) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 text-center", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-muted/30 p-2", children: [
              /* @__PURE__ */ jsx("div", { className: "text-base font-semibold tabular-nums", children: docsCount }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: "docs" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-muted/30 p-2", children: [
              /* @__PURE__ */ jsx("div", { className: "text-base font-semibold tabular-nums", children: daysOpen }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: "days open" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-muted/30 p-2", children: [
              /* @__PURE__ */ jsx("div", { className: "text-base font-semibold tabular-nums", children: members.length }),
              /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: "members" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground", children: [
              "Last activity ",
              lastActivity
            ] }),
            /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
              id: r.id
            }, className: "inline-flex items-center gap-1 rounded-md bg-gradient-brand text-brand-foreground px-2.5 py-1.5 text-xs shadow-glow hover:opacity-90 transition-opacity", children: [
              "Open ",
              /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3 w-3" })
            ] })
          ] })
        ] }, r.id);
      }),
      rooms.length === 0 && /* @__PURE__ */ jsxs("div", { className: "col-span-2 rounded-xl border border-dashed border-border/60 p-12 text-center", children: [
        /* @__PURE__ */ jsx(Briefcase, { className: "h-8 w-8 text-muted-foreground mx-auto mb-3" }),
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: "No deal rooms yet" }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Create your first deal room to start a structured investor review." }),
        /* @__PURE__ */ jsxs("button", { onClick: () => setOpen(true), className: "mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
          " Create deal room"
        ] })
      ] })
    ] }),
    open && /* @__PURE__ */ jsx(CreateRoomForm, { userId: user?.id ?? "", onClose: () => setOpen(false) })
  ] });
}
const DEAL_TYPES = ["Equity", "SAFE", "Convertible Note", "Other"];
function CreateRoomForm({
  userId,
  onClose
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [investorName, setInvestorName] = useState("");
  const [investorFirm, setInvestorFirm] = useState("");
  const [dealType, setDealType] = useState("Equity");
  const [fundingTarget, setFundingTarget] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [startupId, setStartupId] = useState("");
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const dropdownRef = useRef(null);
  const {
    data: vcLeads = []
  } = useQuery({
    queryKey: ["leads-search", userId],
    enabled: !!userId,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("vc_leads").select("id, investor_name, firm_name, email").eq("founder_id", userId).order("investor_name");
      return data ?? [];
    }
  });
  const filtered = vcLeads.filter((l) => l.investor_name?.toLowerCase().includes(search.toLowerCase()) || (l.firm_name?.toLowerCase() ?? "").includes(search.toLowerCase())).slice(0, 8);
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const {
    data: startups = [],
    isLoading: startupsLoading
  } = useQuery({
    queryKey: ["my-startups", userId],
    enabled: !!userId,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("id, company_name").eq("founder_id", userId);
      return data ?? [];
    }
  });
  useEffect(() => {
    if (startups.length === 1 && !startupId) {
      setStartupId(startups[0].id);
    }
  }, [startups, startupId]);
  const submit = async (e) => {
    e.preventDefault();
    if (!investorName.trim() || !startupId || !userId) return;
    setSaving(true);
    setError("");
    try {
      const {
        data: newRoom,
        error: roomErr
      } = await supabase.from("deal_rooms").insert({
        startup_id: startupId,
        status: "new"
      }).select("id").single();
      if (roomErr) throw roomErr;
      if (!newRoom?.id) throw new Error("No room ID returned");
      await supabase.from("deal_room_members").insert({
        deal_room_id: newRoom.id,
        user_id: userId,
        role: "founder",
        accepted_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: userId,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` (${investorFirm.trim()})` : ""} · ${dealType}${fundingTarget ? ` · $${fundingTarget}` : ""}`
      });
      if (inviteEmail.trim()) {
        await supabase.from("invites").insert({
          email: inviteEmail.trim(),
          role: "investor",
          invited_by: userId,
          deal_room_id: newRoom.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["deal-rooms", userId]
      });
      onClose();
      navigate({
        to: "/app/deal-room/$id",
        params: {
          id: newRoom.id
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal room.");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("form", { onClick: (e) => e.stopPropagation(), onSubmit: submit, className: "w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev p-6 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Briefcase, { className: "h-5 w-5 text-brand" }),
        " Create new deal room"
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: dropdownRef, children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Investor name *" }),
      /* @__PURE__ */ jsxs("div", { className: "relative mt-1", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" }),
        /* @__PURE__ */ jsx("input", { required: true, value: investorName, onChange: (e) => {
          const val = e.target.value;
          setInvestorName(val);
          setSearch(val);
          setSelectedLead(null);
          setShowDropdown(val.length > 0);
        }, onFocus: () => {
          if (investorName.length > 0 && !selectedLead) setShowDropdown(true);
        }, placeholder: "Search VC leads or type a name…", className: "w-full rounded-md border border-border/60 bg-background pl-9 pr-8 py-2 text-sm focus:outline-none focus:border-brand/50" }),
        selectedLead && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
          setSelectedLead(null);
          setSearch("");
          setInvestorName("");
          setInviteEmail("");
        }, className: "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) }),
        showDropdown && /* @__PURE__ */ jsx("div", { className: "absolute z-20 w-full mt-1 rounded-lg border border-border/60 bg-card shadow-elev overflow-hidden", children: filtered.length > 0 ? filtered.map((l) => /* @__PURE__ */ jsxs("button", { type: "button", onMouseDown: (e) => {
          e.preventDefault();
          setSelectedLead(l);
          setInvestorName(l.investor_name);
          setSearch(l.investor_name);
          setInvestorFirm(l.firm_name ?? "");
          setInviteEmail(l.email ?? "");
          setShowDropdown(false);
        }, className: "flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-accent", children: [
          /* @__PURE__ */ jsx("div", { className: "grid h-6 w-6 place-items-center rounded-md bg-gradient-brand text-brand-foreground text-[10px] font-semibold shrink-0", children: l.investor_name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium truncate", children: l.investor_name }),
            l.firm_name && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground truncate", children: l.firm_name })
          ] })
        ] }, l.id)) : /* @__PURE__ */ jsx("div", { className: "px-3 py-2.5 text-xs text-muted-foreground", children: "No matching leads — type an email below to invite manually." }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Investor firm" }),
      /* @__PURE__ */ jsx("input", { value: investorFirm, onChange: (e) => setInvestorFirm(e.target.value), placeholder: "Sequoia Capital", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Deal type" }),
        /* @__PURE__ */ jsx("select", { value: dealType, onChange: (e) => setDealType(e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: DEAL_TYPES.map((t) => /* @__PURE__ */ jsx("option", { value: t, children: t }, t)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Funding target ($)" }),
        /* @__PURE__ */ jsx("input", { type: "number", value: fundingTarget, onChange: (e) => setFundingTarget(e.target.value), placeholder: "500000", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Description (optional)" }),
      /* @__PURE__ */ jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), rows: 2, placeholder: "Brief notes on this investor relationship…", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Invite investor email (optional)" }),
      /* @__PURE__ */ jsx("input", { type: "email", value: inviteEmail, onChange: (e) => setInviteEmail(e.target.value), placeholder: "investor@sequoia.com", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "We'll create an invite link you can share with them." })
    ] }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { className: "text-xs text-muted-foreground", children: "Select startup *" }),
      startupsLoading ? /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex items-center gap-2 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
        " Loading…"
      ] }) : startups.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground", children: [
        "Set up your company profile first.",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/app/profile", className: "text-brand hover:underline", onClick: onClose, children: "Go to profile →" })
      ] }) : /* @__PURE__ */ jsxs("select", { required: true, value: startupId, onChange: (e) => setStartupId(e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "Select a startup…" }),
        startups.map((s) => /* @__PURE__ */ jsx("option", { value: s.id, children: s.company_name }, s.id))
      ] })
    ] }),
    error && /* @__PURE__ */ jsx("p", { className: "text-xs text-destructive", children: error }),
    /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-border/60", children: [
      /* @__PURE__ */ jsx("button", { type: "button", onClick: onClose, className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "Cancel" }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: saving || !investorName.trim() || !startupId || startups.length === 0, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm disabled:opacity-60", children: saving ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
        " Creating…"
      ] }) : "Create deal room" })
    ] })
  ] }) });
}
export {
  DealRooms as component
};

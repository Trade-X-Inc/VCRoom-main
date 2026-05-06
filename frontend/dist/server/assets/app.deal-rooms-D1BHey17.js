import { r as reactExports, U as jsxRuntimeExports } from "./worker-entry-Cmmw-2kk.js";
import { s as supabase, L as Link, u as useAuth, a as useNavigate, c as useQueryClient } from "./router-DUHyCcO4.js";
import { u as useQuery } from "./useQuery-CqUX3-7B.js";
import { P as Plus } from "./plus-B_EMNwAw.js";
import { A as ArrowUpRight } from "./arrow-up-right-Bu3C3T_X.js";
import { B as Briefcase } from "./briefcase-Z_tlIkyK.js";
import { X } from "./x-DEg4i2kq.js";
import { L as LoaderCircle } from "./loader-circle-BfzWBVMa.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./index-DYJmQpRE.js";
import "./createLucideIcon-ByQ9CEis.js";
function DealRooms() {
  const [open, setOpen] = reactExports.useState(false);
  const {
    data: rooms = []
  } = useQuery({
    queryKey: ["deal-rooms"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_rooms").select("id, status, created_at, startups(company_name), organizations(name)").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 lg:p-8 max-w-7xl mx-auto", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-end justify-between flex-wrap gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Rooms" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-sm text-muted-foreground", children: [
          rooms.length,
          " active rooms"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setOpen(true), className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
        " Create new deal room"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [
      rooms.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/deal-room/$id", params: {
        id: r.id
      }, className: "rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-soft border border-border/60 text-xs font-semibold", children: (r.organizations?.name || r.startups?.company_name || "DR").split(" ").map((s) => s[0]).join("").slice(0, 2) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: r.organizations?.name ?? r.startups?.company_name ?? "Deal Room" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: r.startups?.company_name ? `Startup: ${r.startups.company_name}` : "No startup linked" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-4 w-4 text-muted-foreground group-hover:text-foreground" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center gap-2 text-xs", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-2 py-0.5 ${r.status === "closed" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`, children: r.status ?? "new" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "Deal room" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: "·" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-muted-foreground", children: [
            "ID: ",
            r.id.slice(0, 8)
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between text-[11px] text-muted-foreground mb-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Progress" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: r.status === "new" ? "15%" : "65%" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-full bg-gradient-brand", style: {
            width: r.status === "new" ? "15%" : "65%"
          } }) })
        ] })
      ] }, r.id)),
      rooms.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2 rounded-xl border border-dashed border-border/60 p-12 text-center", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { className: "h-8 w-8 text-muted-foreground mx-auto mb-3" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-sm font-medium", children: "No deal rooms yet" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Create your first deal room to start a structured investor review." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setOpen(true), className: "mt-4 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "h-4 w-4" }),
          " Create deal room"
        ] })
      ] })
    ] }),
    open && /* @__PURE__ */ jsxRuntimeExports.jsx(CreateRoomForm, { onClose: () => setOpen(false) })
  ] });
}
const DEAL_TYPES = ["Equity", "SAFE", "Convertible Note", "Other"];
function CreateRoomForm({
  onClose
}) {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const [investorName, setInvestorName] = reactExports.useState("");
  const [investorFirm, setInvestorFirm] = reactExports.useState("");
  const [dealType, setDealType] = reactExports.useState("Equity");
  const [fundingTarget, setFundingTarget] = reactExports.useState("");
  const [description, setDescription] = reactExports.useState("");
  const [inviteEmail, setInviteEmail] = reactExports.useState("");
  const [startupId, setStartupId] = reactExports.useState("");
  const {
    data: startups = [],
    isLoading: startupsLoading
  } = useQuery({
    queryKey: ["my-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("startups").select("id, company_name").eq("founder_id", user.id);
      return data ?? [];
    }
  });
  reactExports.useEffect(() => {
    if (startups.length === 1 && !startupId) {
      setStartupId(startups[0].id);
    }
  }, [startups, startupId]);
  const submit = async (e) => {
    e.preventDefault();
    if (!investorName.trim() || !startupId || !user?.id) return;
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
        user_id: user.id,
        role: "founder",
        accepted_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      await supabase.from("activities").insert({
        deal_room_id: newRoom.id,
        actor_id: user.id,
        action: `Deal room created for ${investorName.trim()}${investorFirm.trim() ? ` (${investorFirm.trim()})` : ""} · ${dealType}${fundingTarget ? ` · $${fundingTarget}` : ""}`
      });
      if (inviteEmail.trim()) {
        await supabase.from("invites").insert({
          email: inviteEmail.trim(),
          role: "investor",
          invited_by: user.id,
          deal_room_id: newRoom.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString()
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["deal-rooms"]
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
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4", onClick: onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onClick: (e) => e.stopPropagation(), onSubmit: submit, className: "w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-elev p-6 space-y-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "text-lg font-semibold inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { className: "h-5 w-5 text-brand" }),
        " Create new deal room"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "text-muted-foreground hover:text-foreground", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "h-4 w-4" }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Investor name *" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { required: true, value: investorName, onChange: (e) => setInvestorName(e.target.value), placeholder: "Sarah Johnson", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Investor firm" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: investorFirm, onChange: (e) => setInvestorFirm(e.target.value), placeholder: "Sequoia Capital", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Deal type" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: dealType, onChange: (e) => setDealType(e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: DEAL_TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, children: t }, t)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Funding target ($)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: fundingTarget, onChange: (e) => setFundingTarget(e.target.value), placeholder: "500000", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Description (optional)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), rows: 2, placeholder: "Brief notes on this investor relationship…", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Invite investor email (optional)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "email", value: inviteEmail, onChange: (e) => setInviteEmail(e.target.value), placeholder: "investor@sequoia.com", className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "We'll create an invite link you can share with them." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs text-muted-foreground", children: "Select startup *" }),
      startupsLoading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 flex items-center gap-2 text-sm text-muted-foreground", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
        " Loading…"
      ] }) : startups.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-1.5 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground", children: [
        "Set up your company profile first.",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(Link, { to: "/app/profile", className: "text-brand hover:underline", onClick: onClose, children: "Go to profile →" })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { required: true, value: startupId, onChange: (e) => setStartupId(e.target.value), className: "mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select a startup…" }),
        startups.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.company_name }, s.id))
      ] })
    ] }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-destructive", children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-end gap-2 pt-2 border-t border-border/60", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: onClose, className: "rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent", children: "Cancel" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: saving || !investorName.trim() || !startupId || startups.length === 0, className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm disabled:opacity-60", children: saving ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
        " Creating…"
      ] }) : "Create deal room" })
    ] })
  ] }) });
}
export {
  DealRooms as component
};

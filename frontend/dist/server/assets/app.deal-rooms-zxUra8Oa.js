import { T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { L as Link, s as supabase } from "./router-BGpvLWsf.js";
import { a as useQuery } from "./useQuery-Bt6hPAr8.js";
import { B as Briefcase } from "./briefcase-BOwxSwyG.js";
import { A as ArrowUpRight } from "./arrow-up-right-Dc9hXNh8.js";
import "node:events";
import "node:async_hooks";
import "node:stream/web";
import "node:stream";
import "./createLucideIcon-3NIsAiHL.js";
function DealRooms() {
  const {
    data: rooms = []
  } = useQuery({
    queryKey: ["deal-rooms"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_rooms").select("id, status, startups(company_name), organizations(name)").order("created_at", {
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Briefcase, { className: "h-4 w-4" }),
        " New deal room"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: rooms.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs(Link, { to: "/app/deal-room/$id", params: {
      id: r.id
    }, className: "rounded-xl border border-border/60 bg-card p-5 shadow-card hover:shadow-elev transition-shadow group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-soft border border-border/60 text-xs font-semibold", children: (r.organizations?.name || "VC").split(" ").map((s) => s[0]).join("").slice(0, 2) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "font-semibold", children: r.organizations?.name || "Investor org" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-xs text-muted-foreground", children: r.startups?.company_name || "Startup" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ArrowUpRight, { className: "h-4 w-4 text-muted-foreground group-hover:text-foreground" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-4 flex items-center gap-2 text-xs", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `rounded-full px-2 py-0.5 ${r.status === "closed" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`, children: r.status }),
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
    ] }, r.id)) })
  ] });
}
export {
  DealRooms as component
};

import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Inbox, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-BRauOI85.js";
import { formatDistanceToNow } from "date-fns";
import "@supabase/supabase-js";
import "sonner";
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
function DealFlowPage() {
  const {
    user
  } = useAuth();
  const [q, setQ] = useState("");
  const {
    data: rooms = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["investor-deal-flow", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_room_members").select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(company_name, sector, stage, funding_target, description, tagline)
          )
        `).eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.deal_room_id,
        updatedAt: r.deal_rooms?.updated_at,
        status: r.deal_rooms?.status,
        company: r.deal_rooms?.startups?.company_name ?? "Unnamed",
        sector: r.deal_rooms?.startups?.sector,
        stage: r.deal_rooms?.startups?.stage,
        fundingTarget: r.deal_rooms?.startups?.funding_target,
        blurb: r.deal_rooms?.startups?.tagline || r.deal_rooms?.startups?.description
      })).filter((r) => !!r.id).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }
  });
  const filtered = q ? rooms.filter((r) => r.company.toLowerCase().includes(q.toLowerCase()) || (r.sector ?? "").toLowerCase().includes(q.toLowerCase())) : rooms;
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1600px] mx-auto", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-end justify-between flex-wrap gap-3", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Flow" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        rooms.length,
        " deal",
        rooms.length !== 1 ? "s" : "",
        " in your pipeline"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "mt-5 flex items-center gap-2", children: /* @__PURE__ */ jsxs("div", { className: "relative flex-1 max-w-md", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsx("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search by company or sector…", className: "w-full rounded-[10px] border border-border/60 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand/50" })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "mt-5", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card h-44 animate-pulse" }, i)) }) : isError ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not load data. Please refresh." }) : filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Inbox, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No deals yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: q ? "No deals match your search." : "Deal rooms will appear here when founders invite you to their data room." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: filtered.map((room) => /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
      id: room.id
    }, className: "block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground text-sm font-semibold shrink-0", children: room.company[0] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold truncate group-hover:text-brand transition-colors", children: room.company }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            room.sector || "General",
            " · ",
            room.stage || "Stage TBD"
          ] })
        ] })
      ] }),
      room.blurb && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground line-clamp-2", children: room.blurb }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center justify-between pt-4 border-t border-border/60", children: [
        /* @__PURE__ */ jsx("span", { className: "text-xs font-medium text-brand", children: room.fundingTarget || "Target TBD" }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
          room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), {
            addSuffix: true
          }) : "—"
        ] })
      ] })
    ] }, room.id)) }) })
  ] });
}
export {
  DealFlowPage as component
};

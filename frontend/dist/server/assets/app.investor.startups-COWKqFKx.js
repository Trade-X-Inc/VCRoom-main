import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Building2, ExternalLink, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-ZDeKAwyq.js";
import { formatDistanceToNow } from "date-fns";
import "react";
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
function StartupsPage() {
  const {
    user
  } = useAuth();
  const {
    data: startups = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["investor-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_room_members").select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, status,
            startups(id, company_name, stage, sector, funding_target, revenue, team_size, tagline)
          )
        `).eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        dealRoomId: r.deal_room_id,
        dealStatus: r.deal_rooms?.status,
        updatedAt: r.deal_rooms?.updated_at,
        ...r.deal_rooms?.startups ?? {}
      })).filter((s) => !!s.id).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }
  });
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
      /* @__PURE__ */ jsx("div", { className: "h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-64 rounded bg-muted/60 animate-pulse" }),
      /* @__PURE__ */ jsx("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card h-44 animate-pulse" }, i)) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Startups" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        startups.length,
        " compan",
        startups.length !== 1 ? "ies" : "y",
        " in your deal flow"
      ] })
    ] }),
    isError ? /* @__PURE__ */ jsx("div", { className: "mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not load data. Please refresh." }) : startups.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Building2, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No startups yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "You'll see companies here when founders invite you to their deal room." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: startups.map((c) => /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
      id: c.dealRoomId
    }, className: "block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0", children: (c.company_name || "S")[0] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold truncate group-hover:text-brand transition-colors", children: c.company_name }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            c.sector || "General",
            " · ",
            c.stage || "Stage unknown"
          ] })
        ] }),
        /* @__PURE__ */ jsx(ExternalLink, { className: "h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" })
      ] }),
      c.tagline && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground line-clamp-1", children: c.tagline }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Revenue" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: c.revenue || "—" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Ask" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: c.funding_target || "—" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Team" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: c.team_size || "—" })
        ] })
      ] }),
      c.updatedAt && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-1 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
        formatDistanceToNow(new Date(c.updatedAt), {
          addSuffix: true
        })
      ] })
    ] }, c.id)) })
  ] });
}
export {
  StartupsPage as component
};

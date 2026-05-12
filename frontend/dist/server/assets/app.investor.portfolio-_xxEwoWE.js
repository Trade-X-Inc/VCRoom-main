import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { PieChart, TrendingUp, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-BRauOI85.js";
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
function PortfolioPage() {
  const {
    user
  } = useAuth();
  const {
    data: memberData
  } = useQuery({
    queryKey: ["my-room-ids-portfolio", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("deal_room_id").eq("user_id", user.id);
      return data ?? [];
    }
  });
  const roomIds = memberData?.map((r) => r.deal_room_id) ?? [];
  const {
    data: invested = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["portfolio-rooms", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("decisions").select(`
          id, status, created_at, deal_room_id, notes,
          deal_rooms(
            id, updated_at,
            startups(company_name, sector, stage, funding_target, revenue, traction)
          )
        `).in("deal_room_id", roomIds).in("status", ["accept", "invest", "term_sheet"]).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      const seen = /* @__PURE__ */ new Set();
      return (data ?? []).filter((d) => {
        if (seen.has(d.deal_room_id)) return false;
        seen.add(d.deal_room_id);
        return true;
      }).map((d) => ({
        id: d.deal_room_id,
        decisionId: d.id,
        status: d.status,
        notes: d.notes,
        decisionAt: d.created_at,
        updatedAt: d.deal_rooms?.updated_at,
        company: d.deal_rooms?.startups?.company_name ?? "Unnamed",
        sector: d.deal_rooms?.startups?.sector,
        stage: d.deal_rooms?.startups?.stage,
        fundingTarget: d.deal_rooms?.startups?.funding_target,
        revenue: d.deal_rooms?.startups?.revenue,
        traction: d.deal_rooms?.startups?.traction
      }));
    }
  });
  const statusLabel = {
    accept: "Invested",
    invest: "Invested",
    term_sheet: "Term Sheet"
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Portfolio" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Companies you've committed to invest in" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6", children: [["Portfolio companies", `${invested.length}`], ["Term sheets signed", `${invested.filter((i) => i.status === "term_sheet").length}`], ["Investments closed", `${invested.filter((i) => ["accept", "invest"].includes(i.status)).length}`], ["Avg ticket", "—"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: l }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card h-48 animate-pulse" }, i)) }) : isError ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not load data. Please refresh." }) : invested.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(PieChart, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No portfolio companies yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "Companies appear here after you mark a deal as Invested in the Decision Board." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: invested.map((c) => /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
      id: c.id
    }, className: "block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold shrink-0", children: c.company[0] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold truncate group-hover:text-brand transition-colors", children: c.company }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            c.sector || "—",
            " · ",
            c.stage || "—"
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium rounded-full bg-success/10 text-success px-2 py-0.5 shrink-0", children: statusLabel[c.status] ?? c.status })
      ] }),
      (c.revenue || c.traction) && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-1.5 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsx(TrendingUp, { className: "h-3.5 w-3.5 text-success" }),
        c.revenue || c.traction
      ] }),
      c.fundingTarget && /* @__PURE__ */ jsx("div", { className: "mt-1 text-xs text-brand font-medium", children: c.fundingTarget }),
      c.notes && /* @__PURE__ */ jsx("p", { className: "mt-2 text-xs text-muted-foreground line-clamp-2", children: c.notes }),
      c.decisionAt && /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-center gap-1 text-[10px] text-muted-foreground border-t border-border/60 pt-3", children: [
        /* @__PURE__ */ jsx(Clock, { className: "h-2.5 w-2.5" }),
        "Decision ",
        formatDistanceToNow(new Date(c.decisionAt), {
          addSuffix: true
        })
      ] })
    ] }, c.id)) }) })
  ] });
}
export {
  PortfolioPage as component
};

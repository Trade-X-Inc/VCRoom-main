import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Check, Pause, X, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-Rpa7zDhF.js";
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
function DecisionsPage() {
  const {
    user
  } = useAuth();
  const {
    data: memberData
  } = useQuery({
    queryKey: ["my-room-ids-decisions", user?.id],
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
    data: decisions = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["decisions-board", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("decisions").select(`
          id, status, notes, deal_room_id, created_at,
          deal_rooms(startups(company_name, sector))
        `).in("deal_room_id", roomIds).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return (data ?? []).map((d) => ({
        ...d,
        company: d.deal_rooms?.startups?.company_name ?? "Deal",
        sector: d.deal_rooms?.startups?.sector
      }));
    }
  });
  const cols = {
    invest: decisions.filter((d) => ["accept", "invest"].includes(String(d.status).toLowerCase())),
    hold: decisions.filter((d) => String(d.status).toLowerCase() === "hold"),
    pass: decisions.filter((d) => ["pass", "rejected"].includes(String(d.status).toLowerCase()))
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1500px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Decision Board" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Investment decisions across your active deals" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6", children: [["Total decisions", `${decisions.length}`], ["Invest", `${cols.invest.length}`], ["Hold", `${cols.hold.length}`], ["Pass rate", decisions.length > 0 ? `${Math.round(cols.pass.length / decisions.length * 100)}%` : "—"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: l }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: v })
    ] }, l)) }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "mt-6 grid md:grid-cols-3 gap-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card h-64 animate-pulse" }, i)) }) : isError ? /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not load data. Please refresh." }) : /* @__PURE__ */ jsx("div", { className: "mt-6 grid md:grid-cols-3 gap-4", children: [{
      t: "Invest",
      c: "success",
      Icon: Check,
      items: cols.invest
    }, {
      t: "Hold",
      c: "warning",
      Icon: Pause,
      items: cols.hold
    }, {
      t: "Pass",
      c: "destructive",
      Icon: X,
      items: cols.pass
    }].map((col) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: `px-5 py-3 border-b border-border/60 flex items-center gap-2`, children: [
        /* @__PURE__ */ jsx(col.Icon, { className: `h-4 w-4 text-${col.c}` }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: col.t }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground ml-auto", children: col.items.length })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-3 space-y-2", children: col.items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-8 text-sm text-muted-foreground text-center", children: [
        "No ",
        col.t.toLowerCase(),
        " decisions yet"
      ] }) : col.items.map((item) => /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
        id: item.deal_room_id
      }, className: "block rounded-xl border border-border/60 bg-background/40 p-3 hover:shadow-card transition-shadow", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: item.company }),
        item.sector && /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: item.sector }),
        item.notes && /* @__PURE__ */ jsx("div", { className: "mt-1 text-xs text-muted-foreground line-clamp-2", children: item.notes }),
        item.created_at && /* @__PURE__ */ jsxs("div", { className: "mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/70", children: [
          /* @__PURE__ */ jsx(Clock, { className: "h-2.5 w-2.5" }),
          formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true
          })
        ] })
      ] }, item.id)) })
    ] }, col.t)) }),
    !isLoading && memberData?.length === 0 && /* @__PURE__ */ jsxs("div", { className: "mt-6 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold", children: "No decisions yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Decisions appear here once you've been invited to deal rooms." })
    ] })
  ] });
}
export {
  DecisionsPage as component
};

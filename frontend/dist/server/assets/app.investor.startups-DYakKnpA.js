import { jsxs, jsx } from "react/jsx-runtime";
import { Building2, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-CMUL11Nw.js";
import "@tanstack/react-router";
import "react";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function StartupsPage() {
  const {
    user
  } = useAuth();
  const {
    data: startups = []
  } = useQuery({
    queryKey: ["investor-startups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_room_members").select("deal_room_id, deal_rooms(id, updated_at, status, startups(id, company_name, stage, sector, revenue, team_size))").eq("user_id", user.id).order("deal_rooms.updated_at", {
        ascending: false
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        dealRoomId: r.deal_room_id,
        dealStatus: r.deal_rooms?.status,
        ...r.deal_rooms?.startups ?? {}
      })).filter((s) => !!s.id);
    }
  });
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Startups" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Companies in your deal flow" })
    ] }),
    startups.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Building2, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No startups yet" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "You'll see companies here when founders invite you to their deal room." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "mt-6 grid md:grid-cols-2 gap-4", children: startups.map((c) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold", children: (c.company_name || "S")[0] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold", children: c.company_name }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
            c.sector || "General",
            " · ",
            c.stage || "Stage unknown"
          ] })
        ] }),
        /* @__PURE__ */ jsx(ExternalLink, { className: "h-4 w-4 text-muted-foreground" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-border/60", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Revenue" }),
          /* @__PURE__ */ jsxs("div", { className: "text-sm font-medium", children: [
            "$",
            Number(c.revenue || 0).toLocaleString()
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Stage" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: c.stage || "—" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Team" }),
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium", children: c.team_size || 0 })
        ] })
      ] })
    ] }, c.id)) })
  ] });
}
export {
  StartupsPage as component
};

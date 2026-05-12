import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { Briefcase, Shield, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-3WmBSyta.js";
import { formatDistanceToNow } from "date-fns";
import { c as cn } from "./utils-H80jjgLf.js";
import "react";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
import "tailwind-merge";
const STATUS_TO_LABEL = {
  under_review: {
    label: "Reviewing",
    cls: "bg-brand/10 text-brand"
  },
  info_requested: {
    label: "Diligence",
    cls: "bg-warning/10 text-warning"
  },
  partner_review: {
    label: "Partner",
    cls: "bg-violet/10 text-violet"
  },
  term_sheet: {
    label: "Term Sheet",
    cls: "bg-success/10 text-success"
  },
  rejected: {
    label: "Rejected",
    cls: "bg-destructive/10 text-destructive"
  },
  exited: {
    label: "Exited",
    cls: "bg-muted text-muted-foreground"
  }
};
function DealRoomsPage() {
  const {
    user
  } = useAuth();
  const {
    data: rooms = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ["investor-deal-rooms-list", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_room_members").select(`
          deal_room_id,
          deal_rooms(
            id, updated_at, created_at, status,
            startups(company_name, sector, stage, funding_target, tagline)
          )
        `).eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.deal_room_id,
        updatedAt: r.deal_rooms?.updated_at,
        createdAt: r.deal_rooms?.created_at,
        status: r.deal_rooms?.status,
        company: r.deal_rooms?.startups?.company_name ?? "Unnamed",
        sector: r.deal_rooms?.startups?.sector,
        stage: r.deal_rooms?.startups?.stage,
        fundingTarget: r.deal_rooms?.startups?.funding_target,
        tagline: r.deal_rooms?.startups?.tagline
      })).filter((r) => !!r.id).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }
  });
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Deal Rooms" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        rooms.length,
        " active data room",
        rooms.length !== 1 ? "s" : "",
        " you've been invited to"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border/60 bg-card h-48 animate-pulse" }, i)) }) : isError ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not load data. Please refresh." }) : rooms.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Briefcase, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "No active deal rooms" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "Founders' deal room invitations appear here once you've been accepted." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-4", children: rooms.map((room) => {
      const statusInfo = STATUS_TO_LABEL[room.status ?? ""] ?? {
        label: "New",
        cls: "bg-muted text-muted-foreground"
      };
      const daysSinceActivity = room.updatedAt ? Math.floor((Date.now() - new Date(room.updatedAt).getTime()) / (1e3 * 60 * 60 * 24)) : null;
      const isStale = daysSinceActivity !== null && daysSinceActivity > 7;
      return /* @__PURE__ */ jsxs(Link, { to: "/app/deal-room/$id", params: {
        id: room.id
      }, className: "block rounded-2xl border border-border/60 bg-card p-5 hover:shadow-card transition-shadow group", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsx("div", { className: "grid h-10 w-10 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold text-sm shrink-0", children: room.company[0] }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold truncate group-hover:text-brand transition-colors", children: room.company }),
              /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
                room.sector || "—",
                " · ",
                room.stage || "Stage TBD"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { className: cn("shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5", statusInfo.cls), children: statusInfo.label })
        ] }),
        room.tagline && /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm text-muted-foreground line-clamp-2", children: room.tagline }),
        /* @__PURE__ */ jsxs("div", { className: "mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Shield, { className: "h-3 w-3 text-muted-foreground" }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: room.fundingTarget || "Target TBD" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: cn("flex items-center gap-1 text-xs", isStale ? "text-warning" : "text-muted-foreground"), children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
            room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), {
              addSuffix: true
            }) : "—"
          ] })
        ] })
      ] }, room.id);
    }) }) })
  ] });
}
export {
  DealRoomsPage as component
};

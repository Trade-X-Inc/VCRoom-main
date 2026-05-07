import { jsxs, jsx } from "react/jsx-runtime";
import { Check, Pause, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-C0llBC3B.js";
import "@tanstack/react-router";
import "react";
import "@supabase/supabase-js";
import "sonner";
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
    data: decisions = []
  } = useQuery({
    queryKey: ["decisions", roomIds.join(",")],
    enabled: roomIds.length > 0,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("decisions").select("id, status, notes, deal_room_id").in("deal_room_id", roomIds).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const cols = {
    invest: decisions.filter((d) => ["accept", "invest"].includes(String(d.status).toLowerCase())),
    hold: decisions.filter((d) => String(d.status).toLowerCase() === "hold"),
    pass: decisions.filter((d) => String(d.status).toLowerCase() === "pass")
  };
  decisions.filter((d) => {
    const created = d.created_at;
    if (!created) return false;
    const now = /* @__PURE__ */ new Date();
    const dt = new Date(created);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1500px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Decision Board" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Partnership-wide decisions, in one view" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 rounded-2xl border border-border/60 bg-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6", children: [["Invested this quarter", cols.invest.length > 0 ? `${cols.invest.length}` : "$0"], ["Total deployed", "$0"], ["Avg check", "—"], ["Pass rate", decisions.length > 0 ? `${Math.round(cols.pass.length / decisions.length * 100)}%` : "—"]].map(([l, v]) => /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: l }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold tabular-nums", children: v })
    ] }, l)) }),
    /* @__PURE__ */ jsx("div", { className: "mt-6 grid md:grid-cols-3 gap-4", children: [{
      t: "Invest",
      c: "success",
      i: Check,
      items: cols.invest
    }, {
      t: "Hold",
      c: "warning",
      i: Pause,
      items: cols.hold
    }, {
      t: "Pass",
      c: "destructive",
      i: X,
      items: cols.pass
    }].map((col) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: `px-5 py-3 border-b border-border/60 flex items-center gap-2 bg-${col.c}/5`, children: [
        /* @__PURE__ */ jsx(col.i, { className: `h-4 w-4 text-${col.c}` }),
        /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold", children: col.t }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground ml-auto", children: col.items.length })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-3 space-y-2", children: col.items.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "py-6 text-sm text-muted-foreground text-center", children: [
        "No ",
        col.t.toLowerCase(),
        " decisions yet"
      ] }) : col.items.map((item) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border/60 bg-background/40 p-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm font-medium", children: [
          "Decision ",
          item.id.slice(0, 8)
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: item.notes || "No notes" })
      ] }, item.id)) })
    ] }, col.t)) })
  ] });
}
export {
  DecisionsPage as component
};

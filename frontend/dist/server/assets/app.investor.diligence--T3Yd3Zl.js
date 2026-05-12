import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { ClipboardCheck, CheckCircle2, Circle, FileUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-3WmBSyta.js";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function DiligencePage() {
  const {
    user
  } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const {
    data: rooms = []
  } = useQuery({
    queryKey: ["investor-diligence-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_room_members").select("deal_room_id, deal_rooms(id, name, startups(company_name))").eq("user_id", user.id);
      return (data ?? []).map((r) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name ?? r.deal_rooms?.name ?? r.deal_room_id
      }));
    }
  });
  const {
    data: items = []
  } = useQuery({
    queryKey: ["due-diligence", selectedRoomId],
    enabled: !!selectedRoomId,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("due_diligence_items").select("id, section, label, status").eq("deal_room_id", selectedRoomId).order("created_at", {
        ascending: true
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const sections = Object.entries(items.reduce((acc, item) => {
    const key = item.section || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      id: item.id,
      label: item.label || item.section || "Item",
      done: String(item.status).toLowerCase().includes("done")
    });
    return acc;
  }, {})).map(([t, list]) => ({
    t,
    items: list
  }));
  const total = items.length;
  const doneCount = items.filter((i) => String(i.status).toLowerCase().includes("done")).length;
  const progress = total ? Math.round(doneCount / total * 100) : 0;
  const sectionKeys = ["Legal", "Financial", "Technical", "Commercial", "Team"];
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Due Diligence" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Track diligence progress across your active deals" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsxs("select", { value: selectedRoomId, onChange: (e) => setSelectedRoomId(e.target.value), className: "rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
      /* @__PURE__ */ jsx("option", { value: "", children: "Select a company…" }),
      rooms.map((r) => /* @__PURE__ */ jsx("option", { value: r.id, children: r.name }, r.id))
    ] }) }),
    !selectedRoomId ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(ClipboardCheck, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "Select a company to view due diligence" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Companies in your active deal flow appear in the dropdown above." })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "mt-6 grid lg:grid-cols-[1fr_360px] gap-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Overall progress" }),
            /* @__PURE__ */ jsxs("div", { className: "text-sm tabular-nums", children: [
              progress,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand transition-all", style: {
            width: `${progress}%`
          } }) }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 grid grid-cols-5 gap-2 text-[11px] text-muted-foreground", children: sectionKeys.map((sk) => {
            const sec = sections.find((s) => s.t.toLowerCase() === sk.toLowerCase());
            const done = sec?.items.filter((i) => i.done).length ?? 0;
            const tot = sec?.items.length ?? 0;
            return /* @__PURE__ */ jsxs("div", { className: "rounded-md border border-border/60 px-2 py-1.5 text-center", children: [
              sk,
              " ",
              done,
              "/",
              tot
            ] }, sk);
          }) })
        ] }),
        sections.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground", children: "No checklist items yet." }) : sections.map((s) => {
          const done = s.items.filter((i) => i.done).length;
          return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card overflow-hidden", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-5 py-3 border-b border-border/60", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: s.t }),
              /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
                done,
                "/",
                s.items.length
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/60", children: s.items.map((item) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-5 py-3", children: [
              item.done ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-success shrink-0" }) : /* @__PURE__ */ jsx(Circle, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
              /* @__PURE__ */ jsx("span", { className: `text-sm ${item.done ? "text-muted-foreground line-through" : ""}`, children: item.label })
            ] }, item.id)) })
          ] }, s.t);
        })
      ] }),
      /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Document requests" }),
          /* @__PURE__ */ jsxs("button", { className: "inline-flex items-center gap-1 text-xs rounded-[10px] border border-border/60 px-2 py-1 hover:bg-accent", children: [
            /* @__PURE__ */ jsx(FileUp, { className: "h-3.5 w-3.5" }),
            " Request"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "mt-4 text-sm text-muted-foreground text-center py-6", children: "No requests yet." })
      ] }) })
    ] })
  ] });
}
export {
  DiligencePage as component
};

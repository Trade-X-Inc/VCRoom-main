import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Brain, Loader2, CheckCircle2, AlertTriangle, Lightbulb, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { u as useAuth, s as supabase } from "./router-BRauOI85.js";
import { g as generateDealBrief } from "./deal-brief-fn-CDNrHnKG.js";
import "@tanstack/react-router";
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
function AnalysisPage() {
  const {
    user
  } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const {
    data: rooms = [],
    isLoading: roomsLoading
  } = useQuery({
    queryKey: ["investor-analysis-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("deal_room_members").select("deal_room_id, deal_rooms(id, startups(company_name))").eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name ?? r.deal_room_id
      })).filter((r) => !!r.id);
    }
  });
  const {
    data: brief,
    isLoading: briefLoading,
    isError: briefError
  } = useQuery({
    queryKey: ["ai-brief-analysis", selectedRoomId, user?.id],
    enabled: !!selectedRoomId && !!user?.id,
    staleTime: 30 * 60 * 1e3,
    queryFn: async () => generateDealBrief({
      data: {
        dealRoomId: selectedRoomId,
        userId: user.id
      }
    })
  });
  const selectedName = rooms.find((r) => r.id === selectedRoomId)?.name ?? "Company";
  const downloadMemo = () => {
    if (!brief) return;
    const text = [`Investment Memo — ${selectedName}`, `Thesis Match: ${brief.matchScore ?? "—"}/100`, "", "STRENGTHS", ...(brief.strengths ?? []).map((s) => `• ${s}`), "", "RISKS", ...(brief.risks ?? []).map((r) => `• ${r}`), "", "MITIGANTS", ...(brief.mitigants ?? []).map((m) => `• ${m}`), "", "NEXT ACTION", brief.nextAction ?? "—"].join("\n");
    const blob = new Blob([text], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-memo-${selectedName.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "AI Analysis" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Thesis fit, risks, and investment memo — generated from deal room data" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-5", children: roomsLoading ? /* @__PURE__ */ jsx("div", { className: "h-9 w-48 rounded-[10px] bg-muted animate-pulse" }) : /* @__PURE__ */ jsxs("select", { value: selectedRoomId, onChange: (e) => setSelectedRoomId(e.target.value), className: "rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
      /* @__PURE__ */ jsx("option", { value: "", children: "Select a company to analyse…" }),
      rooms.map((r) => /* @__PURE__ */ jsx("option", { value: r.id, children: r.name }, r.id))
    ] }) }),
    !selectedRoomId ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Brain, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "Select a company to generate AI analysis" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground max-w-sm mx-auto", children: "Analysis is generated from data inside the deal room — pitch deck, documents, and company profile." })
    ] }) : briefLoading ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-border/60 bg-card p-12 flex flex-col items-center gap-4", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-muted-foreground", children: [
        "Generating AI analysis for ",
        selectedName,
        "…"
      ] })
    ] }) : briefError ? /* @__PURE__ */ jsx("div", { className: "mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-muted-foreground", children: "Could not generate analysis. Please try again." }) : brief ? /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 relative overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-[0.06]" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Investment thesis match" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-baseline gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: "text-5xl font-semibold tabular-nums", children: brief.matchScore ?? "—" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "/ 100" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-brand transition-all", style: {
            width: `${Math.min(100, brief.matchScore ?? 0)}%`
          } }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-success text-sm font-semibold mb-3", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
            " Strengths"
          ] }),
          (brief.strengths ?? []).length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No data." }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: brief.strengths.map((s, i) => /* @__PURE__ */ jsxs("li", { className: "text-sm text-muted-foreground flex gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-success shrink-0", children: "·" }),
            s
          ] }, i)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-destructive text-sm font-semibold mb-3", children: [
            /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4" }),
            " Risks"
          ] }),
          (brief.risks ?? []).length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No data." }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: brief.risks.map((r, i) => /* @__PURE__ */ jsxs("li", { className: "text-sm text-muted-foreground flex gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-destructive shrink-0", children: "·" }),
            r
          ] }, i)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-brand text-sm font-semibold mb-3", children: [
            /* @__PURE__ */ jsx(Lightbulb, { className: "h-4 w-4" }),
            " Mitigants"
          ] }),
          (brief.mitigants ?? []).length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No data." }) : /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: brief.mitigants.map((m, i) => /* @__PURE__ */ jsxs("li", { className: "text-sm text-muted-foreground flex gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-brand shrink-0", children: "·" }),
            m
          ] }, i)) })
        ] })
      ] }),
      brief.nextAction && /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold mb-2", children: "Recommended next action" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: brief.nextAction })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs("button", { onClick: downloadMemo, className: "inline-flex items-center gap-1.5 rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent", children: [
        /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }),
        " Download memo"
      ] }) })
    ] }) : null
  ] });
}
export {
  AnalysisPage as component
};

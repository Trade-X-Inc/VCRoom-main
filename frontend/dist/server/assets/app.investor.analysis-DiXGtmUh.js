import { jsxs, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { Brain, FileText, Download } from "lucide-react";
function AnalysisPage() {
  const [company, setCompany] = useState("");
  const [memo, setMemo] = useState(null);
  const [generating, setGenerating] = useState(false);
  const companies = [];
  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      setMemo({
        sections: [{
          k: "Executive Summary",
          body: "Connect a deal room to populate this section automatically."
        }, {
          k: "Team",
          body: "—"
        }, {
          k: "Product",
          body: "—"
        }, {
          k: "Market",
          body: "—"
        }, {
          k: "Traction",
          body: "—"
        }, {
          k: "Ask",
          body: "—"
        }, {
          k: "Risks",
          body: "—"
        }]
      });
      setGenerating(false);
    }, 900);
  };
  const downloadPdf = () => {
    if (!memo) return;
    const blob = new Blob([memo.sections.map((s) => `# ${s.k}

${s.body}
`).join("\n")], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-memo-${company || "company"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-[1400px] mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "AI Analysis" }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "Automated thesis fit, risks, and investment memo" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-5", children: /* @__PURE__ */ jsxs("select", { value: company, onChange: (e) => setCompany(e.target.value), className: "rounded-[10px] border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50", children: [
      /* @__PURE__ */ jsx("option", { value: "", children: "Select a company…" }),
      companies.map((c) => /* @__PURE__ */ jsx("option", { value: c.id, children: c.name }, c.id))
    ] }) }),
    !company ? /* @__PURE__ */ jsxs("div", { className: "mt-8 rounded-2xl border border-dashed border-border/60 bg-card p-12 text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground", children: /* @__PURE__ */ jsx(Brain, { className: "h-6 w-6" }) }),
      /* @__PURE__ */ jsx("h3", { className: "mt-4 text-lg font-semibold", children: "Select a company to generate AI analysis" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Analysis is generated from data inside the deal room." })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-6 relative overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-mesh opacity-[0.06]" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-wider text-brand font-medium", children: "Investment thesis match" }),
          /* @__PURE__ */ jsxs("div", { className: "mt-3 flex items-baseline gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: "text-5xl font-semibold tabular-nums", children: "—" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "/ 100 · awaiting deal room data" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 h-2 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full w-0 bg-gradient-brand" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid md:grid-cols-3 gap-4", children: [{
        t: "Strengths",
        c: "text-success"
      }, {
        t: "Risks",
        c: "text-destructive"
      }, {
        t: "Mitigants",
        c: "text-brand"
      }].map((b) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
        /* @__PURE__ */ jsx("div", { className: `text-sm font-semibold ${b.c}`, children: b.t }),
        /* @__PURE__ */ jsx("div", { className: "mt-3 text-sm text-muted-foreground", children: "No data yet." })
      ] }, b.t)) }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Diligence gaps" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 grid md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Missing from data room" }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No gaps identified." })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Unanswered questions" }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: "No open questions." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border/60 bg-card p-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-sm font-semibold inline-flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-brand" }),
            " Investment memo"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsx("button", { onClick: generate, disabled: generating, className: "rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow disabled:opacity-60", children: generating ? "Generating…" : memo ? "Regenerate" : "Generate" }),
            memo && /* @__PURE__ */ jsxs("button", { onClick: downloadPdf, className: "inline-flex items-center gap-1 rounded-[10px] border border-border/60 px-3 py-1.5 text-xs hover:bg-accent", children: [
              /* @__PURE__ */ jsx(Download, { className: "h-3.5 w-3.5" }),
              " Download"
            ] })
          ] })
        ] }),
        memo ? /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-3", children: memo.sections.map((s) => /* @__PURE__ */ jsxs("details", { className: "rounded-[10px] border border-border/60 bg-background/40", children: [
          /* @__PURE__ */ jsx("summary", { className: "cursor-pointer list-none px-4 py-2.5 text-sm font-medium", children: s.k }),
          /* @__PURE__ */ jsx("div", { className: "px-4 pb-3 text-sm text-muted-foreground", children: s.body })
        ] }, s.k)) }) : /* @__PURE__ */ jsx("div", { className: "mt-4 text-sm text-muted-foreground", children: "Click Generate to draft an investment memo from deal room data." })
      ] })
    ] })
  ] });
}
export {
  AnalysisPage as component
};

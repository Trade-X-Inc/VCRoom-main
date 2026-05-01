import { r as reactExports, T as jsxRuntimeExports } from "./worker-entry-Cd_qZNvB.js";
import { S as Send, p as postJson } from "./backend-DBVD7Jg1.js";
import { U as User } from "./user-b_Q8iwAJ.js";
import { S as Sparkles } from "./sparkles-D9nEshzh.js";
import { L as LoaderCircle } from "./loader-circle-D99H4vV_.js";
function AIChat({ scope, starters, initialAssistant, className = "", compact = false }) {
  const [msgs, setMsgs] = reactExports.useState(() => [
    {
      id: "m0",
      role: "assistant",
      content: initialAssistant ?? `I'm your AI advisor${scope ? ` for ${scope}` : ""}. Ask me anything about your raise — investors, term sheets, diligence, outreach.`,
      ts: Date.now()
    }
  ]);
  const [input, setInput] = reactExports.useState("");
  const [thinking, setThinking] = reactExports.useState(false);
  const endRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);
  const send = async (text) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput("");
    setMsgs((xs) => [...xs, { id: `u${Date.now()}`, role: "user", content: t, ts: Date.now() }]);
    setThinking(true);
    const endpoint = scope?.toLowerCase().includes("deal room") ? "/api/ai/memo" : "/api/ai/summary";
    try {
      const response = await postJson(endpoint, { context: `${scope ?? "workspace"}

User prompt: ${t}` });
      const reply = response.memo || response.summary || "No AI response generated.";
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: reply, ts: Date.now() }]);
    } catch (error) {
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: `AI request failed: ${error instanceof Error ? error.message : "unknown error"}`, ts: Date.now() }]);
    }
    setThinking(false);
  };
  const showStarters = msgs.length <= 1 && starters && starters.length > 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex flex-col h-full bg-background ${className}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-6 space-y-5`, children: [
      msgs.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`, children: m.role === "user" ? /* @__PURE__ */ jsxRuntimeExports.jsx(User, { className: "h-4 w-4" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-brand" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`, children: m.content })
      ] }, m.id)),
      thinking && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent border border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-4 w-4 text-brand animate-pulse" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-4 py-3 bg-card border border-border/60 shadow-card inline-flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(LoaderCircle, { className: "h-3.5 w-3.5 animate-spin" }),
          " Thinking…"
        ] })
      ] }),
      showStarters && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid sm:grid-cols-2 gap-2 pt-2", children: starters.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => send(s), className: "text-left rounded-xl border border-border/60 bg-card p-3 text-sm hover:border-brand/40 hover:bg-accent transition-colors shadow-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand mb-1.5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: s })
      ] }, s)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: endRef })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60 bg-background/80 backdrop-blur-xl", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-3.5`, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "form",
        {
          onSubmit: (e) => {
            e.preventDefault();
            send(input);
          },
          className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: input,
                onChange: (e) => setInput(e.target.value),
                onKeyDown: (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                },
                rows: 1,
                placeholder: `Ask the AI advisor${scope ? ` about ${scope}` : ""}…`,
                className: "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-32"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", disabled: !input.trim() || thinking, className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow disabled:opacity-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { className: "h-3.5 w-3.5" }) })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-1.5 text-[10px] text-muted-foreground text-center", children: "AI may be inaccurate — verify with your legal & finance team." })
    ] }) })
  ] });
}
export {
  AIChat as A
};

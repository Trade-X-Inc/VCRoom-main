import { jsxs, jsx } from "react/jsx-runtime";
import { useRef, useState, useEffect } from "react";
import { Sparkles, User, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { u as useAuth } from "./router-C9QH749P.js";
import { c as createSsrRpc } from "./createSsrRpc-l1y8KE69.js";
import { c as createServerFn } from "../server.js";
import "@tanstack/react-router";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "clsx";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const getAIAdvice = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("397b3f65700da6e488c63bfeb016aac33e5f67ff2f57bcca85b9c84f5eace701"));
const STARTERS = ["Summarize my pipeline status", "Which investors need follow-up?", "Draft a weekly investor update", "What should my next step be?", "How is my reply rate vs benchmark?"];
function Advisor() {
  const {
    user
  } = useAuth();
  const endRef = useRef(null);
  const [msgs, setMsgs] = useState([{
    id: "m0",
    role: "assistant",
    content: "I'm your AI fundraising advisor. I have live context on your pipeline, leads, and deal rooms. Ask me anything about your raise."
  }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [msgs, thinking]);
  const send = async (text) => {
    const t = text.trim();
    if (!t || thinking || !user?.id) return;
    setInput("");
    setErrorBanner(null);
    const userMsg = {
      id: `u${Date.now()}`,
      role: "user",
      content: t
    };
    setMsgs((xs) => [...xs, userMsg]);
    setThinking(true);
    try {
      const history = msgs.slice(1).map((m) => ({
        role: m.role,
        content: m.content
      }));
      const result = await getAIAdvice({
        data: {
          userId: user.id,
          message: t,
          history
        }
      });
      setMsgs((xs) => [...xs, {
        id: `a${Date.now()}`,
        role: "assistant",
        content: result.reply
      }]);
      if (result.error === "missing_key") {
        setErrorBanner("OpenAI API key not configured. Contact your admin.");
      }
    } catch (e) {
      toast.error("Request failed. Please try again.");
      setMsgs((xs) => [...xs, {
        id: `a${Date.now()}`,
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again."
      }]);
    } finally {
      setThinking(false);
    }
  };
  const showStarters = msgs.length <= 1;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-[calc(100vh-4rem)]", children: [
    /* @__PURE__ */ jsx("div", { className: "border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 lg:px-8 py-4 shrink-0", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow shrink-0", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-lg font-semibold tracking-tight", children: "AI Advisor" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground", children: "Personalized fundraising advice based on your live pipeline." })
        ] })
      ] }),
      errorBanner && /* @__PURE__ */ jsx("div", { className: "text-[11px] text-destructive shrink-0 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1", children: errorBanner })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto px-6 py-6 space-y-5", children: [
      msgs.map((m) => /* @__PURE__ */ jsxs("div", { className: `flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`, children: [
        /* @__PURE__ */ jsx("div", { className: `grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`, children: m.role === "user" ? /* @__PURE__ */ jsx(User, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-brand" }) }),
        /* @__PURE__ */ jsx("div", { className: `max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`, children: m.content })
      ] }, m.id)),
      thinking && /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "grid h-8 w-8 place-items-center rounded-full bg-accent border border-border/60 shrink-0", children: /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-brand animate-pulse" }) }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl px-4 py-3 bg-card border border-border/60 shadow-card inline-flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
          " Thinking…"
        ] })
      ] }),
      showStarters && /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 gap-2 pt-2", children: STARTERS.map((s) => /* @__PURE__ */ jsxs("button", { onClick: () => send(s), className: "text-left rounded-xl border border-border/60 bg-card p-3 text-sm hover:border-brand/40 hover:bg-accent transition-colors shadow-card", children: [
        /* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5 text-brand mb-1.5" }),
        /* @__PURE__ */ jsx("div", { children: s })
      ] }, s)) }),
      /* @__PURE__ */ jsx("div", { ref: endRef })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "border-t border-border/60 bg-background/80 backdrop-blur-xl shrink-0", children: /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto px-6 py-3.5", children: [
      /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
        e.preventDefault();
        send(input);
      }, className: "flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10", children: [
        /* @__PURE__ */ jsx("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send(input);
          }
        }, rows: 1, placeholder: "Ask about your raise…", className: "flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-32" }),
        /* @__PURE__ */ jsx("button", { type: "submit", disabled: !input.trim() || thinking, className: "grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow disabled:opacity-40", children: /* @__PURE__ */ jsx(Send, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-1.5 text-[10px] text-muted-foreground text-center", children: "AI may be inaccurate — verify with your legal & finance team." })
    ] }) })
  ] });
}
export {
  Advisor as component
};

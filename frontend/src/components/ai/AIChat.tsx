import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2, User } from "lucide-react";
import { postJson } from "@/lib/backend";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

interface Props {
  scope?: string;          // e.g. "Atlas Robotics deal room"
  starters?: string[];
  initialAssistant?: string;
  className?: string;
  compact?: boolean;
}

export function AIChat({ scope, starters, initialAssistant, className = "", compact = false }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [
    {
      id: "m0",
      role: "assistant",
      content: initialAssistant ?? `I'm your AI advisor${scope ? ` for ${scope}` : ""}. Ask me anything about your raise — investors, term sheets, diligence, outreach.`,
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput("");
    setMsgs((xs) => [...xs, { id: `u${Date.now()}`, role: "user", content: t, ts: Date.now() }]);
    setThinking(true);
    const endpoint = scope?.toLowerCase().includes("deal room") ? "/api/ai/memo" : "/api/ai/summary";
    try {
      const response = await postJson<{ summary?: string; memo?: string }>(endpoint, { context: `${scope ?? "workspace"}\n\nUser prompt: ${t}` });
      const reply = response.memo || response.summary || "No AI response generated.";
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: reply, ts: Date.now() }]);
    } catch (error) {
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: `AI request failed: ${error instanceof Error ? error.message : "unknown error"}`, ts: Date.now() }]);
    }
    setThinking(false);
  };

  const showStarters = msgs.length <= 1 && starters && starters.length > 0;

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-6 space-y-5`}>
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-brand" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`}>
                {m.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent border border-border/60"><Sparkles className="h-4 w-4 text-brand animate-pulse" /></div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border/60 shadow-card inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}

          {showStarters && (
            <div className="grid sm:grid-cols-2 gap-2 pt-2">
              {starters!.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-left rounded-xl border border-border/60 bg-card p-3 text-sm hover:border-brand/40 hover:bg-accent transition-colors shadow-card">
                  <Sparkles className="h-3.5 w-3.5 text-brand mb-1.5" />
                  <div>{s}</div>
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 backdrop-blur-xl">
        <div className={`mx-auto ${compact ? "max-w-full px-4" : "max-w-3xl px-6"} py-3.5`}>
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder={`Ask the AI advisor${scope ? ` about ${scope}` : ""}…`}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-32"
            />
            <button type="submit" disabled={!input.trim() || thinking} className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="mt-1.5 text-[10px] text-muted-foreground text-center">AI may be inaccurate — verify with your legal & finance team.</div>
        </div>
      </div>
    </div>
  );
}

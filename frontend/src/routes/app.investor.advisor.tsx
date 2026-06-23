import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getInvestorAdvice } from "@/lib/investor-advisor-fn";
import {
  getInvestorCompleteness,
  getResumeMessage,
  isToolRequest,
  type InvestorProfile,
} from "@/lib/profileCompleteness";

export const Route = createFileRoute("/app/investor/advisor")({
  beforeLoad: () => { throw redirect({ to: "/app/investor" }); },
  component: InvestorAdvisor,
});

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  isGateBlock?: boolean;
}

const STARTERS = [
  "Score the companies on my watchlist against my thesis",
  "Build me a diligence checklist for an AI startup",
  "How should I think about this term sheet?",
  "What's a good portfolio construction at my fund size?",
  "Summarize recent moves in my target sectors",
];

function InvestorAdvisor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Investor profile (for completeness gate) ──────────────────────────────
  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-completeness", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("fund_name, your_name, thesis, sectors, stages, check_size_min, check_size_max, geography")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as InvestorProfile | null;
    },
  });

  const completeness = getInvestorCompleteness(investorProfile ?? null);

  // ── Chat state ────────────────────────────────────────────────────────────
  const WELCOME: ChatMsg = {
    id: "m0",
    role: "assistant",
    content: "I'm your AI investment analyst. I have context on your fund thesis and current pipeline. Ask me anything — sourcing, diligence, term sheets, or portfolio strategy.",
  };

  const [msgs, setMsgs] = useState<ChatMsg[]>([WELCOME]);
  const [input, setInput] = useState("");

  // Auto-expand textarea — must be after [input] useState so the dependency is initialized
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const [thinking, setThinking] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking || !user?.id) return;

    setInput("");
    setErrorBanner(null);
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: "user", content: t };
    setMsgs((xs) => [...xs, userMsg]);
    setThinking(true);

    try {
      // ── Completeness gate ──
      if (!completeness.isComplete && isToolRequest(t)) {
        const resumeMsg = getResumeMessage(completeness, "investor", investorProfile ?? null);
        setMsgs((xs) => [...xs, {
          id: `gate${Date.now()}`,
          role: "assistant",
          content: resumeMsg,
          isGateBlock: true,
        }]);
        return;
      }

      const history = msgs.slice(1).map((m) => ({ role: m.role as string, content: m.content }));
      const result = await getInvestorAdvice({ data: { userId: user.id, message: t, history } });

      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: result.reply }]);
      if (result.error === "no_key" || result.error === "missing_key") {
        setErrorBanner("OpenAI API key not configured. Contact your admin.");
      }
    } catch {
      toast.error("Request failed. Please try again.");
      setMsgs((xs) => [
        ...xs,
        { id: `a${Date.now()}`, role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const showStarters = msgs.length <= 1;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 lg:px-8 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">AI Advisor</h1>
              <div className="text-xs text-muted-foreground">
                Personalized investment guidance from your fund thesis and pipeline.
              </div>
            </div>
          </div>
          {errorBanner && (
            <div className="text-[11px] text-destructive shrink-0 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1">
              {errorBanner}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-brand" />}
              </div>
              <div className="flex flex-col gap-2 max-w-[80%]">
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`}>
                  {m.role === "user" ? m.content : (
                    <div className="[&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {m.isGateBlock && (
                  <button
                    onClick={() => navigate({ to: "/app/investor/profile" as any })}
                    style={{
                      alignSelf: "flex-start",
                      background: "#7C3AED",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Complete my profile →
                  </button>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent border border-border/60 shrink-0">
                <Sparkles className="h-4 w-4 text-brand animate-pulse" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border/60 shadow-card inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}

          {showStarters && (
            <div className="grid sm:grid-cols-2 gap-2 pt-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left rounded-xl border border-border/60 bg-card p-3 text-sm hover:border-brand/40 hover:bg-accent transition-colors shadow-card"
                >
                  <Sparkles className="h-3.5 w-3.5 text-brand mb-1.5" />
                  <div>{s}</div>
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-3.5">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask about a deal, thesis fit, or diligence…"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none overflow-y-auto"
              style={{ maxHeight: 160 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="grid h-8 w-8 place-items-center rounded-md bg-gradient-brand text-brand-foreground shadow-glow disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          <div className="mt-1.5 text-[10px] text-muted-foreground text-center">
            AI may be inaccurate — verify with your legal & finance team.
          </div>
        </div>
      </div>
    </div>
  );
}

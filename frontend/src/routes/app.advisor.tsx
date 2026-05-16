import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getAIAdvice } from "@/lib/advisor-fn";

export const Route = createFileRoute("/app/advisor")({
  component: Advisor,
});

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Summarize my pipeline status",
  "Which investors need follow-up?",
  "Draft a weekly investor update",
  "What should my next step be?",
  "How is my reply rate vs benchmark?",
];

function Advisor() {
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  const { data: startupCtx } = useQuery({
    queryKey: ["advisor-ctx", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: startup }, { count: leadCount }, { count: meetingCount }] = await Promise.all([
        supabase.from("startups")
          .select("company_name, stage, sector, funding_target, revenue, traction")
          .eq("founder_id", user!.id)
          .maybeSingle(),
        supabase.from("vc_leads")
          .select("*", { count: "exact", head: true })
          .eq("founder_id", user!.id),
        supabase.from("meetings")
          .select("*", { count: "exact", head: true })
          .eq("created_by", user!.id)
          .gte("scheduled_at", new Date().toISOString()),
      ]);
      if (!startup) return null;
      return {
        companyName: startup.company_name ?? undefined,
        stage: startup.stage ?? undefined,
        sector: startup.sector ?? undefined,
        fundingTarget: startup.funding_target ?? undefined,
        revenue: startup.revenue ?? undefined,
        traction: startup.traction ?? undefined,
        leadCount: leadCount ?? 0,
        meetingCount: meetingCount ?? 0,
      };
    },
  });

  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: "m0",
      role: "assistant",
      content: "I'm your AI fundraising advisor. I have live context on your pipeline, leads, and deal rooms. Ask me anything about your raise.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Load persisted messages on mount
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("advisor_messages")
      .select("id, role, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMsgs((current) => [
            current[0], // keep welcome message
            ...data.map((m: any) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ]);
        }
      });
  }, [user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking || !user?.id) return;

    setInput("");
    setErrorBanner(null);
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: "user", content: t };
    setMsgs((xs) => [...xs, userMsg]);
    setThinking(true);

    try {
      const openAIKey = import.meta.env.VITE_OPENAI_API_KEY || "";
      const history = msgs.slice(1).map((m) => ({ role: m.role as string, content: m.content }));
      const result = await getAIAdvice({
        data: { userId: user.id, message: t, history, openAIKey, startupContext: startupCtx ?? undefined },
      });

      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: result.reply }]);
      if (result.error === "missing_key") {
        setErrorBanner("OpenAI API key not configured. Contact your admin.");
      } else if (user?.id && !result.error) {
        // Persist both turns — fire and forget
        supabase.from("advisor_messages").insert([
          { user_id: user.id, role: "user", content: t },
          { user_id: user.id, role: "assistant", content: result.reply },
        ]);
      }
    } catch (e: any) {
      toast.error("Request failed. Please try again.");
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setThinking(false);
    }
  };

  const showStarters = msgs.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 lg:px-8 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">AI Advisor</h1>
              <div className="text-xs text-muted-foreground">Personalized fundraising advice based on your live pipeline.</div>
            </div>
          </div>
          {errorBanner && (
            <div className="text-[11px] text-destructive shrink-0 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1">
              {errorBanner}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
          {msgs.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-accent text-foreground border border-border/60"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-brand" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-brand text-brand-foreground" : "bg-card border border-border/60 shadow-card"}`}>
                {m.role === "user" ? m.content : (
                  <div className="[&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
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

      {/* Input */}
      <div className="border-t border-border/60 bg-background/80 backdrop-blur-xl shrink-0">
        <div className="max-w-3xl mx-auto px-6 py-3.5">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 rounded-xl border border-border/60 bg-card p-2 shadow-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask about your raise…"
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none max-h-32"
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

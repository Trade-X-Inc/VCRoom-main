import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { askOnboardingAI } from "@/lib/onboarding-chat-fn";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────

type Phase =
  | "role"
  | "f-stage"
  | "f-challenge"
  | "i-size"
  | "i-need"
  | "freetext";

interface Msg {
  id: number;
  role: "ai" | "user";
  text: string;
  cta?: { label: string; href: string };
}

// ── Content ────────────────────────────────────────────────────────

const STARTER_QUESTIONS: Record<"founder" | "investor", string[]> = {
  founder: [
    "How does Hockystick help me raise funding?",
    "What documents do I need to prepare?",
    "How does investor matching work?",
    "What is the Hockystick Verified badge?",
    "How is this different from sending pitch decks?",
  ],
  investor: [
    "How do I find deal flow on Hockystick?",
    "What does Hockystick Checked mean?",
    "How does due diligence work here?",
    "What stages and sectors are on the platform?",
    "How do I open a deal room?",
  ],
};

const MAX_USER_MESSAGES = 10;

const QUICK_REPLIES: Partial<Record<Phase, string[]>> = {
  role: ["I'm a Founder", "I'm an Investor"],
  "f-stage": ["Pre-seed", "Seed", "Series A+", "Just exploring"],
  "f-challenge": ["Finding investors", "Managing the process", "Due diligence prep", "Closing deals"],
  "i-size": ["Just starting", "1-10 deals", "10-50 deals", "50+ deals"],
  "i-need": ["Deal flow management", "Due diligence tools", "AI analysis", "Team collaboration"],
};

const F_CTA: Record<string, string> = {
  "Finding investors":
    "Our investor pipeline tracks every VC contact and auto-generates personalized cold emails — structured deal flow instead of scattered outreach.",
  "Managing the process":
    "One place for deal rooms, docs, Q&A, and investor decisions. No more spreadsheet chaos — your entire raise in one workspace.",
  "Due diligence prep":
    "Our DD Workstation has 22 pre-loaded checklist items across 6 categories. Upload once, let investors review in an audit-logged workspace.",
  "Closing deals":
    "Deal rooms with NDA-gated access, document watermarking, and a one-click decision workflow. Investors can commit without leaving the platform.",
};

const I_CTA: Record<string, string> = {
  "Deal flow management":
    "A live pipeline with thesis-fit scoring for every deal. Track decisions, filter by stage, and never lose a promising startup again.",
  "Due diligence tools":
    "A 6-category DD tracker, per-document AI summaries, and a 5-dimension investment scorecard — all structured and shareable with your team.",
  "AI analysis":
    "Our AI reads every document against your thesis and generates a full investment memo in one click. Thesis alignment scored 0–100 per deal.",
  "Team collaboration":
    "Invite partners, assign deals, share notes, and make decisions together — all inside a shared deal room workspace.",
};

// ── Helpers ────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => ++_uid;

function saveConv(
  role: "founder" | "investor" | null,
  stage: string | null,
  challenge: string | null,
  converted: boolean,
) {
  supabase
    .from("onboarding_conversations")
    .insert({ visitor_role: role, stage, challenge, messages: [], converted })
    .then(() => {});
}

// ── Component ──────────────────────────────────────────────────────

export function OnboardingChat({
  variant,
  triggerMessage,
  darkMode = false,
}: {
  variant: "embedded" | "floating";
  triggerMessage?: string | null;
  darkMode?: boolean;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [shown, setShown] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<Phase>("role");
  const [convRole, setConvRole] = useState<"founder" | "investor" | null>(null);
  const [convStage, setConvStage] = useState<string | null>(null);
  const [convChallenge, setConvChallenge] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const savedRef = useRef(false);
  const triggeredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter for AI messages
  useEffect(() => {
    const last = msgs[msgs.length - 1];
    if (!last || last.role !== "ai") return;
    if (shown[last.id] === last.text) return;

    let i = shown[last.id]?.length ?? 0;
    const iv = setInterval(() => {
      i++;
      setShown((p) => ({ ...p, [last.id]: last.text.slice(0, i) }));
      if (i >= last.text.length) clearInterval(iv);
    }, 22);
    return () => clearInterval(iv);
  }, [msgs.length]); // eslint-disable-line

  // Unread badge (floating only)
  useEffect(() => {
    if (variant === "floating" && !isExpanded && msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      if (last.role === "ai") setHasUnread(true);
    }
  }, [msgs.length]); // eslint-disable-line

  function addAI(text: string, cta?: { label: string; href: string }) {
    const id = uid();
    setMsgs((p) => [...p, { id, role: "ai", text, cta }]);
    setShown((p) => ({ ...p, [id]: "" }));
  }

  function addUser(text: string) {
    const id = uid();
    setMsgs((p) => [...p, { id, role: "user", text }]);
    setShown((p) => ({ ...p, [id]: text }));
  }

  // Opening message
  useEffect(() => {
    addAI(
      "Hey 👋 I'm the Hockystick AI. Are you a founder raising capital, or an investor managing deal flow?",
    );
  }, []); // eslint-disable-line

  // Auto-trigger from conversation starters
  useEffect(() => {
    if (!triggerMessage || triggeredRef.current || msgs.length === 0) return;
    triggeredRef.current = true;
    const clean = triggerMessage.replace(/\s*→\s*$/, "").trim();
    const t = clean.toLowerCase();
    setTimeout(() => {
      if (t.includes("founder") || t.includes("raising") || t.includes("seed")) {
        handleQuickReply("I'm a Founder");
      } else if (t.includes("vc") || t.includes("investor") || t.includes("50") || t.includes("deal")) {
        handleQuickReply("I'm an Investor");
      } else {
        addUser(clean);
        setPhase("freetext");
        setIsLoading(true);
        askOnboardingAI({ data: { message: clean, history: [] } })
          .then((r) => addAI(r.reply || "Sign up to explore Hockystick!"))
          .catch(() => addAI("Great question! Sign up to explore the platform directly."))
          .finally(() => setIsLoading(false));
      }
    }, 1000);
  }, [msgs.length, triggerMessage]); // eslint-disable-line

  function handleQuickReply(reply: string) {
    addUser(reply);

    if (phase === "role") {
      const isFounder = reply.includes("Founder");
      setConvRole(isFounder ? "founder" : "investor");
      setPhase(isFounder ? "f-stage" : "i-size");
      setTimeout(
        () => addAI(isFounder ? "Nice! What stage are you at?" : "Great! How many deals are you tracking right now?"),
        550,
      );
    } else if (phase === "f-stage") {
      setConvStage(reply);
      setPhase("f-challenge");
      setTimeout(() => addAI("What's your biggest challenge right now?"), 550);
    } else if (phase === "f-challenge") {
      setConvChallenge(reply);
      const ctaMsg = F_CTA[reply] ?? "Hockystick is built for exactly this challenge.";
      setTimeout(
        () => addAI(ctaMsg, { label: "Start for free →", href: "/sign-up?role=founder" }),
        550,
      );
      setTimeout(() => {
        addAI("Have a question? Ask me anything about Hockystick.");
        setPhase("freetext");
      }, 1900);
      if (!savedRef.current) {
        savedRef.current = true;
        setTimeout(() => saveConv("founder", convStage, reply, false), 2100);
      }
    } else if (phase === "i-size") {
      setConvStage(reply);
      setPhase("i-need");
      setTimeout(() => addAI("What would help you most?"), 550);
    } else if (phase === "i-need") {
      setConvChallenge(reply);
      const ctaMsg = I_CTA[reply] ?? "Hockystick is built for investors like you.";
      setTimeout(
        () => addAI(ctaMsg, { label: "Get started free →", href: "/sign-up?role=investor" }),
        550,
      );
      setTimeout(() => {
        addAI("Have a question? Ask me anything about Hockystick.");
        setPhase("freetext");
      }, 1900);
      if (!savedRef.current) {
        savedRef.current = true;
        setTimeout(() => saveConv("investor", convStage, reply, false), 2100);
      }
    }
  }

  async function sendMessage(text: string) {
    if (!text || isLoading) return;
    setPhase("freetext");
    addUser(text);
    setIsLoading(true);
    const history = msgs.slice(-6).map((m) => ({
      role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
      content: m.text,
    }));
    try {
      const result = await askOnboardingAI({ data: { message: text, history } });
      addAI(result.reply || "Try signing up to explore the full platform!");
    } catch {
      addAI("Sorry, I hit a snag. Sign up to explore Hockystick directly!");
    } finally {
      setIsLoading(false);
    }
  }

  // Keep ref pointing to latest sendMessage to avoid stale closure in event listener
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Listen for quick-question clicks from the parent ChatSection
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail) sendMessageRef.current(e.detail);
    };
    window.addEventListener("hs-chat-send", handler as EventListener);
    return () => window.removeEventListener("hs-chat-send", handler as EventListener);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
  }

  const quickReplies = phase !== "freetext" ? (QUICK_REPLIES[phase] ?? []) : [];
  const userMessageCount = msgs.filter((m) => m.role === "user").length;
  const questionsRemaining = Math.max(0, MAX_USER_MESSAGES - userMessageCount);
  const limitReached = userMessageCount >= MAX_USER_MESSAGES;

  // ── Derived dark-mode classes ─────────────────────────────────────

  const aiBubble = darkMode
    ? "bg-gray-800 text-white rounded-tl-sm"
    : "bg-muted text-foreground rounded-tl-sm";
  const userBubble = darkMode
    ? "bg-violet-600 text-white rounded-tr-sm"
    : "bg-gradient-brand text-brand-foreground rounded-tr-sm";
  const dotColor = darkMode ? "bg-gray-400/50" : "bg-muted-foreground/50";
  const qrBtn = darkMode
    ? "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500 hover:text-white"
    : "border-brand/40 bg-brand/5 text-brand hover:bg-brand hover:text-brand-foreground";
  const inputWrap = darkMode
    ? "border-white/20 bg-gray-800/80 focus-within:border-violet-500/50"
    : "border-border/60 bg-background/80 focus-within:border-brand/50";
  const inputText = darkMode ? "text-white placeholder:text-gray-500" : "placeholder:text-muted-foreground";
  const sendBtn = darkMode ? "bg-violet-600" : "bg-gradient-brand";
  const ctaBtn = darkMode
    ? "bg-violet-500 text-white hover:bg-violet-400"
    : "bg-brand text-brand-foreground shadow-glow hover:opacity-90";

  // ── Chat UI ────────────────────────────────────────────────────────

  const chatUI = (
    <div className="flex flex-col h-full">
      {/* Header — shown only in light mode (dark mode provides its own) */}
      {!darkMode && (
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 shrink-0">
          <div className="relative shrink-0">
            <div className="h-8 w-8 rounded-full bg-gradient-brand grid place-items-center shadow-glow">
              <MessageCircle className="h-4 w-4 text-brand-foreground" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card animate-pulse-glow" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-none">Talk to Hockystick AI</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Usually replies instantly</div>
          </div>
          {variant === "floating" && (
            <button
              onClick={() => setIsExpanded(false)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {msgs.map((msg) => {
          const text = shown[msg.id] ?? "";
          const isAI = msg.role === "ai";
          const fullyTyped = text === msg.text;
          return (
            <div key={msg.id} className={cn("flex", isAI ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap", isAI ? aiBubble : userBubble)}>
                {text}
                {msg.cta && fullyTyped && (
                  <div className="mt-3">
                    <a
                      href={msg.cta.href}
                      onClick={() => saveConv(convRole, convStage, convChallenge, true)}
                      className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-opacity", ctaBtn)}
                    >
                      {msg.cta.label} <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className={cn("rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1.5 items-center", darkMode ? "bg-gray-800" : "bg-muted")}>
              <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:0ms]", dotColor)} />
              <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:150ms]", dotColor)} />
              <span className={cn("h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:300ms]", dotColor)} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 shrink-0">
          {quickReplies.map((r) => (
            <button
              key={r}
              onClick={() => handleQuickReply(r)}
              className={cn("rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors", qrBtn)}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Starter questions — shown when in freetext phase with no user messages yet */}
      {phase === "freetext" && userMessageCount === 0 && convRole && (
        <div className="px-4 pb-3 shrink-0">
          <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">Quick questions</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS[convRole]?.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border text-left transition-colors",
                  darkMode
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-white"
                    : "border-brand/30 bg-brand/5 text-brand hover:bg-brand hover:text-brand-foreground",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Free text input */}
      {phase === "freetext" && (
        <div className="px-4 pb-4 shrink-0">
          {questionsRemaining <= 5 && questionsRemaining > 0 && (
            <p className="text-[11px] text-white/30 text-center mb-2">
              {questionsRemaining} question{questionsRemaining !== 1 ? "s" : ""} remaining
            </p>
          )}
          {limitReached ? (
            <div className="text-center p-4 rounded-xl border border-white/8 bg-white/3">
              <p className="text-sm text-white/60 mb-3">You've used all 10 questions.</p>
              <a
                href="/sign-up"
                className="inline-block px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm font-medium hover:bg-[#6d28d9] transition-colors"
              >
                Create your free account →
              </a>
            </div>
          ) : (
            <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors", inputWrap)}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask me anything..."
                className={cn("flex-1 text-sm bg-transparent outline-none", inputText)}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || limitReached}
                className={cn("grid h-7 w-7 place-items-center rounded-lg text-white disabled:opacity-40 transition-opacity shrink-0", sendBtn)}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Embedded ───────────────────────────────────────────────────────

  if (variant === "embedded") {
    if (darkMode) {
      return (
        <div className="flex flex-col h-[360px]">
          {chatUI}
        </div>
      );
    }
    return (
      <div className="w-full rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden flex flex-col h-[480px]">
        {chatUI}
      </div>
    );
  }

  // ── Floating ───────────────────────────────────────────────────────

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isExpanded && (
        <div className="w-80 sm:w-[380px] h-[500px] rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden flex flex-col">
          {chatUI}
        </div>
      )}

      <div className="relative group">
        {!isExpanded && (
          <div className="absolute bottom-16 right-0 bg-foreground text-background text-[12px] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-card">
            Ask anything 💬
          </div>
        )}
        <button
          onClick={() => {
            setIsExpanded((v) => !v);
            setHasUnread(false);
            if (!isExpanded) setTimeout(() => inputRef.current?.focus(), 300);
          }}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-brand-foreground shadow-glow hover:scale-105 active:scale-95 transition-transform"
          aria-label="Talk to Hockystick AI"
        >
          {isExpanded ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          {hasUnread && !isExpanded && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive border-2 border-background animate-pulse-glow" />
          )}
        </button>
      </div>
    </div>
  );
}

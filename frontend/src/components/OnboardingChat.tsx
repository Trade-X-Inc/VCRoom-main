import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, ArrowRight, Loader2 } from "lucide-react";
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
}: {
  variant: "embedded" | "floating";
  triggerMessage?: string | null;
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

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs.length, shown]);

  // Unread badge
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

  // Auto-trigger from conversation starters (fires once after opening message appears)
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

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
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

  const quickReplies = phase !== "freetext" ? (QUICK_REPLIES[phase] ?? []) : [];

  // ── Chat UI ────────────────────────────────────────────────────────

  const chatUI = (
    <div className="flex flex-col h-full">
      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {msgs.map((msg) => {
          const text = shown[msg.id] ?? "";
          const isAI = msg.role === "ai";
          const fullyTyped = text === msg.text;
          return (
            <div key={msg.id} className={cn("flex", isAI ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  isAI
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-gradient-brand text-brand-foreground rounded-tr-sm",
                )}
              >
                {text}
                {msg.cta && fullyTyped && (
                  <div className="mt-3">
                    <a
                      href={msg.cta.href}
                      onClick={() => saveConv(convRole, convStage, convChallenge, true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-brand-foreground shadow-glow hover:opacity-90 transition-opacity"
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
            <div className="bg-muted rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1.5 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
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
              className="rounded-full border border-brand/40 bg-brand/5 text-brand hover:bg-brand hover:text-brand-foreground px-3 py-1.5 text-[13px] font-medium transition-colors"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Free text input */}
      {phase === "freetext" && (
        <div className="px-4 pb-4 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2 focus-within:border-brand/50 transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ask me anything..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground disabled:opacity-40 transition-opacity shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Embedded ───────────────────────────────────────────────────────

  if (variant === "embedded") {
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
        {/* Tooltip */}
        {!isExpanded && (
          <div className="absolute bottom-16 right-0 bg-foreground text-background text-[12px] font-medium rounded-lg px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-card">
            Ask anything 💬
          </div>
        )}

        <button
          onClick={() => {
            setIsExpanded((v) => !v);
            setHasUnread(false);
            if (!isExpanded) {
              setTimeout(() => inputRef.current?.focus(), 300);
            }
          }}
          className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-brand-foreground shadow-glow hover:scale-105 active:scale-95 transition-transform"
          aria-label="Talk to Hockystick AI"
        >
          {isExpanded ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
          {hasUnread && !isExpanded && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive border-2 border-background animate-pulse-glow" />
          )}
        </button>
      </div>
    </div>
  );
}

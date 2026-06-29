import { useState, useEffect, useRef, useCallback } from "react";
import { X, ArrowUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouterState } from "@tanstack/react-router";

export type PageContext = {
  route: string;
  pageName: string;
  entityId?: string;
  relevantData?: Record<string, unknown>;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type ConfirmCard = {
  action: string;
  description: string;
};

const SUPABASE_URL = "https://ldimninnjlvxozubheib.supabase.co";
const AI_ROUTER_URL = `${SUPABASE_URL}/functions/v1/ai-router`;
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkaW1uaW5uamx2eG96dWJoZWliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTgzNjgsImV4cCI6MjA5Mjk3NDM2OH0.l57v3deTN8WraFeQM6HG_qMCYfo89R08wHa7L31T_wI";

const THINKING_LABELS = [
  "Thinking...",
  "Analysing your data...",
  "Checking deal activity...",
  "Preparing response...",
];

const FOUNDER_PROMPTS = ["What should I fix first?", "How is my profile?", "Explain my score"];
const INVESTOR_PROMPTS = ["Summarise my pipeline", "Any stale deals?", "What matches my thesis?"];

function parseConfirmCard(content: string): ConfirmCard | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.confirm_action === true && parsed?.action) return parsed as ConfirmCard;
  } catch {}
  return null;
}

function buildSystemPrompt(pageContext: PageContext, userRole: string): string {
  const { pageName, entityId, relevantData } = pageContext;
  return [
    "You are the Hockystick AI — a fundraising advisor built into this platform.",
    "You give direct, specific advice. You never use markdown formatting.",
    "Write in plain sentences. No asterisks, no hashtags, no bullet dashes.",
    "Keep responses under 150 words unless the user specifically asks for detail.",
    "Use numbered lists (1. 2. 3.) only when listing steps.",
    "",
    "What you can do:",
    "- Answer questions about fundraising strategy, investor relations, and startup preparation",
    "- Explain what each platform feature does and how to use it",
    "- Give specific feedback based on the data shown on this page",
    "- Help founders prepare for investor conversations",
    "",
    "What you cannot do:",
    "- Make changes to the platform on the user's behalf",
    "- Access other users' data",
    "- Guarantee investment outcomes",
    "",
    "When you don't know something: say so in one sentence and suggest where to find it.",
    "When giving advice: be direct. Say what to do, not what to consider.",
    "",
    `Current page: ${pageName}`,
    `User role: ${userRole}`,
    entityId ? `Entity in view: ${entityId}` : "",
    relevantData ? `Page data: ${JSON.stringify(relevantData)}` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

function ThinkingAnimation() {
  const [labelIdx, setLabelIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLabelIdx((i) => (i + 1) % THINKING_LABELS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex justify-start">
      <div
        className="max-w-[85%] rounded-[0_12px_12px_12px] px-3 py-2.5"
        style={{ background: "var(--ai-bubble-bg, #f3f4f6)" }}
        data-testid="ai-thinking"
      >
        {/* Neural bars */}
        <div className="flex gap-1 mb-2">
          {[0, 0.2, 0.4].map((delay, i) => (
            <div
              key={i}
              className="w-4 h-1 rounded-full"
              style={{
                background: i === 0 ? "#7C3AED" : i === 1 ? "#A855F7" : "#6B21A8",
                animation: `hs-bar${i + 1} ${1.2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </div>
        {/* Dot pulse */}
        <div className="flex gap-1 items-center mb-1.5">
          {[0, 0.15, 0.3].map((delay, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: "#7C3AED",
                animation: "hs-dot-pulse 1.2s ease-in-out infinite",
                animationDelay: `${delay}s`,
              }}
            />
          ))}
        </div>
        <div className="text-[11px]" style={{ color: "rgba(168,85,247,0.7)" }}>
          {THINKING_LABELS[labelIdx]}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MessageBubble({
  msg,
  onConfirm,
  onCancel,
}: {
  msg: Message;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div
          className="max-w-[80%] rounded-[12px_12px_0_12px] px-3 py-2.5 text-sm text-white leading-relaxed"
          style={{ background: "#7C3AED" }}
          data-testid="ai-message"
        >
          {msg.content}
        </div>
        <span className="text-[11px] pr-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    );
  }

  const card = parseConfirmCard(msg.content);
  if (card) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div
          className="rounded-xl p-3 mt-1 text-sm max-w-[85%]"
          style={{ background: "var(--ai-bubble-bg, #f3f4f6)", border: "1px solid rgba(124,58,237,0.4)" }}
          data-testid="ai-message"
        >
          <div className="font-semibold mb-1 text-gray-900 dark:text-white">About to: {card.action}</div>
          <div className="text-xs mb-3 text-gray-500 dark:text-gray-400">{card.description}</div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded px-3 py-1 text-sm border border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded px-3 py-1 text-sm text-white transition-opacity hover:opacity-90"
              style={{ background: "#7C3AED" }}
            >
              Confirm
            </button>
          </div>
        </div>
        <span className="text-[11px] pl-1 text-gray-400 dark:text-gray-500">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className="max-w-[85%] rounded-[0_12px_12px_12px] px-3 py-2.5 text-sm leading-relaxed text-gray-900 dark:text-white"
        style={{ background: "var(--ai-bubble-bg, #f3f4f6)" }}
        data-testid="ai-message"
      >
        {msg.content}
      </div>
      <span className="text-[11px] pl-1 text-gray-400 dark:text-gray-500">
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
}

function pageNameFromPath(path: string): string {
  const segments = path.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (!segments.length) return "Dashboard";
  const last = segments[segments.length - 1];
  if (!last || last === "app") return "Dashboard";
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Panel sizes: S = 30vw (min 320), L = 50vw (min 480)
const SIZE_S = () => Math.max(320, Math.min(Math.round(window.innerWidth * 0.3), 480));
const SIZE_L = () => Math.max(480, Math.min(Math.round(window.innerWidth * 0.5), 640));

export function AIOperatorPanel({
  userRole,
  userId,
  pageContext: _pageContextProp,
}: {
  userRole: "founder" | "investor";
  userId: string;
  pageContext?: PageContext;
}) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const pageContext: PageContext = {
    route: currentPath,
    pageName: pageNameFromPath(currentPath),
  };

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hs_ai_panel_open") === "true";
    }
    return false;
  });

  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hs_ai_panel_width");
      return saved ? parseInt(saved, 10) : SIZE_S();
    }
    return 360;
  });

  const [activeSize, setActiveSize] = useState<"S" | "L">("S");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    localStorage.setItem("hs_ai_panel_open", String(isOpen));
  }, [isOpen]);

  // Load conversation + unread count — all errors caught, never throws
  useEffect(() => {
    if (!userId) return;

    const loadConversation = async () => {
      try {
        const { data, error } = await supabase
          .from("agent_conversations")
          .select("id, messages")
          .eq("user_id", userId)
          .eq("route", pageContext.route)
          .is("entity_id", null)
          .maybeSingle();
        if (error) { console.warn("[AI panel] load conv:", error.message); return; }
        if (data) {
          setConversationId(data.id);
          setMessages((data.messages as Message[]) ?? []);
        }
      } catch (e: any) {
        console.warn("[AI panel] load conv exception:", e?.message);
      }
    };

    const loadUnread = async () => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("kind", "ai_operator")
          .eq("read", false);
        if (error) { console.warn("[AI panel] load unread:", error.message); return; }
        setUnreadCount(count ?? 0);
      } catch (e: any) {
        console.warn("[AI panel] load unread exception:", e?.message);
      }
    };

    loadConversation();
    loadUnread();
  }, [userId, currentPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
      setUnreadCount(0);
    }
  }, [isOpen]);

  const autoResizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

  const startResize = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
    e.preventDefault();

    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = resizeStartX.current - ev.clientX;
      const next = Math.max(280, Math.min(640, resizeStartWidth.current + delta));
      setPanelWidth(next);
      localStorage.setItem("hs_ai_panel_width", String(next));
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  const saveConversation = async (updatedMessages: Message[]) => {
    if (!userId) return;
    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !sessionData?.session?.access_token) {
        console.warn("[AI panel] no session for save:", sessErr?.message);
        return;
      }
      const { data, error } = await supabase
        .from("agent_conversations")
        .upsert(
          {
            user_id: userId,
            route: pageContext.route,
            entity_id: null,
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,route,entity_id_key" }
        )
        .select("id")
        .maybeSingle();
      if (error) { console.warn("[AI panel] save error:", error.message); return; }
      if (data?.id && data.id !== conversationId) setConversationId(data.id);
    } catch (e: any) {
      console.warn("[AI panel] save exception:", e?.message);
    }
  };

  const handleConfirm = async () => {
    const stub: Message = { role: "assistant", content: "[Stub] Action would execute here.", timestamp: new Date().toISOString() };
    const updated = [...messages, stub];
    setMessages(updated);
    await saveConversation(updated);
  };

  const handleCancel = async () => {
    const cancelled: Message = { role: "assistant", content: "Cancelled.", timestamp: new Date().toISOString() };
    const updated = [...messages, cancelled];
    setMessages(updated);
    await saveConversation(updated);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue("");
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    setIsLoading(true);

    try {
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) { console.warn("[AI panel] session error:", sessErr.message); }
      const jwt = sessionData?.session?.access_token ?? "";

      const res = await fetch(AI_ROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          task_type: "chat",
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          system_prompt: buildSystemPrompt(pageContext, userRole),
          user_id: userId,
        }),
      });

      let json: any = {};
      try { json = await res.json(); } catch { json = { error: "Invalid response" }; }

      if (res.status === 429) {
        const limitMsg: Message = { role: "assistant", content: "You've reached your daily AI limit. Try again tomorrow.", timestamp: new Date().toISOString() };
        const updated = [...nextMessages, limitMsg];
        setMessages(updated);
        await saveConversation(updated);
        return;
      }

      if (!res.ok) {
        console.warn("[AI panel] edge error:", json.error);
      }
      const assistantMsg: Message = {
        role: "assistant",
        content: json.content ?? "Something went wrong. Please try again.",
        timestamp: new Date().toISOString(),
      };
      const updated = [...nextMessages, assistantMsg];
      setMessages(updated);
      await saveConversation(updated);
    } catch (e: any) {
      console.warn("[AI panel] send error:", e?.message);
      const errMsg: Message = { role: "assistant", content: "Something went wrong. Please try again.", timestamp: new Date().toISOString() };
      const updated = [...nextMessages, errMsg];
      setMessages(updated);
      await saveConversation(updated);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const setSize = (size: "S" | "L") => {
    setActiveSize(size);
    const next = size === "S" ? SIZE_S() : SIZE_L();
    setPanelWidth(next);
    localStorage.setItem("hs_ai_panel_width", String(next));
  };

  const suggestedPrompts = userRole === "investor" ? INVESTOR_PROMPTS : FOUNDER_PROMPTS;

  // ── Pull tab (closed) ──────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2"
        data-testid="ai-panel-tab"
        style={{ width: 24 }}
      >
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI panel"
          data-testid="ai-panel-toggle"
          className="relative flex flex-col items-center justify-center transition-colors"
          style={{
            width: 24,
            height: 72,
            background: "#7C3AED",
            borderRadius: "8px 0 0 8px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#6D28D9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#7C3AED"; }}
        >
          <span
            className="text-white font-bold text-[10px] select-none"
            style={{ writingMode: "vertical-rl", transform: "rotate(-90deg)", letterSpacing: "0.05em" }}
          >
            AI
          </span>
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full"
              style={{ background: "#EF4444" }}
              data-testid="ai-panel-badge"
            />
          )}
        </button>
      </div>
    );
  }

  // ── Open panel ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Inject keyframe animations once */}
      <style>{`
        :root { --ai-bubble-bg: #f3f4f6; }
        .dark { --ai-bubble-bg: #27272a; }
        @keyframes hs-bar1 { 0%,100%{width:30%} 50%{width:90%} }
        @keyframes hs-bar2 { 0%,100%{width:60%} 50%{width:40%} }
        @keyframes hs-bar3 { 0%,100%{width:80%} 50%{width:20%} }
        @keyframes hs-dot-pulse { 0%,100%{opacity:0.3;transform:scale(0.85)} 50%{opacity:1;transform:scale(1)} }
      `}</style>

      <div
        data-testid="ai-panel"
        className="relative flex shrink-0 flex-col max-md:fixed max-md:inset-0 max-md:z-50 max-md:w-full max-md:max-w-none max-md:min-w-0 bg-white dark:bg-[#111113]"
        style={{
          width: panelWidth,
          minWidth: 280,
          maxWidth: 640,
          borderLeft: "1px solid",
          borderColor: "rgba(229,231,235,1)",
          transition: "width 250ms ease",
        }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="absolute left-0 top-0 h-full z-10 transition-colors"
          style={{ width: 4, cursor: "col-resize", background: "rgba(124,58,237,0.08)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.3)"; }}
          onMouseLeave={(e) => { if (!isResizing.current) (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)"; }}
        />

        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between pl-5 pr-2 bg-gray-50 dark:bg-zinc-900"
          style={{ height: 56, borderBottom: "1px solid", borderColor: "rgba(229,231,235,1)" }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base leading-none" style={{ color: "#7C3AED" }}>✦</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">AI</span>
            <span className="text-sm text-gray-400">·</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{pageContext.pageName}</span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* S / L size buttons */}
            {(["S", "L"] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setSize(sz)}
                title={sz === "S" ? "Narrow" : "Wide"}
                className="grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: activeSize === sz ? "rgba(124,58,237,0.1)" : "transparent",
                  color: activeSize === sz ? "#7C3AED" : "#6B7280",
                }}
              >
                {sz}
              </button>
            ))}
            <button
              onClick={() => setIsOpen(false)}
              data-testid="ai-panel-close"
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-lg leading-none"
              aria-label="Close AI panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-5 pb-8 select-none">
              <div>
                <div className="text-4xl text-center mb-3" style={{ color: "#7C3AED" }}>✦</div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white text-center">AI Advisor</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  Ask about your raise, profile, or next steps.
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="rounded-full px-3 py-1.5 text-sm border transition-colors"
                    style={{ borderColor: "rgba(209,213,219,1)", color: "#6B7280" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "#7C3AED";
                      (e.currentTarget as HTMLElement).style.color = "#7C3AED";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(209,213,219,1)";
                      (e.currentTarget as HTMLElement).style.color = "#6B7280";
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            ))
          )}
          {isLoading && <ThinkingAnimation />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div
          className="shrink-0 px-3 py-3 bg-white dark:bg-[#111113]"
          style={{ borderTop: "1px solid rgba(229,231,235,1)" }}
        >
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); autoResizeTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={isLoading}
              rows={1}
              data-testid="ai-panel-input"
              className="w-full resize-none rounded-xl pr-12 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 transition-colors"
              style={{
                minHeight: 40,
                maxHeight: 96,
                lineHeight: "20px",
                background: "rgba(243,244,246,1)",
                border: "1px solid rgba(229,231,235,1)",
              }}
              onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "#7C3AED"; }}
              onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(229,231,235,1)"; }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              data-testid="ai-panel-send"
              aria-label="Send"
              className="absolute right-2 bottom-2 grid h-8 w-8 place-items-center rounded-lg text-white transition-opacity"
              style={{
                background: "#7C3AED",
                opacity: (isLoading || !inputValue.trim()) ? 0.4 : 1,
                cursor: (isLoading || !inputValue.trim()) ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isLoading && inputValue.trim()) (e.currentTarget as HTMLElement).style.background = "#6D28D9";
              }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#7C3AED"; }}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

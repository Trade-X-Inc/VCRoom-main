import { useState, useEffect, useRef } from "react";
import { type ChatMessage } from "@/lib/mock";
import { Send, Paperclip, Smile, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DealRoomChat() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((xs) => [...xs, { id: crypto.randomUUID(), author: "You", initials: "ME", role: "Founder", text, time: now, me: true }]);
    setDraft("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm font-semibold">Team Chat</div>
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> Deal room team channel
            </div>
          </div>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev && prev.author === m.author;
          return (
            <div key={m.id} className={cn("flex gap-3", m.me ? "flex-row-reverse" : "")}>
              <div className={cn("h-8 w-8 shrink-0", grouped && "invisible")}>
                <div className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent")}>
                  {m.initials}
                </div>
              </div>
              <div className={cn("max-w-[72%]", m.me && "items-end flex flex-col")}>
                {!grouped && (
                  <div className={cn("flex items-center gap-2 mb-1 text-[11px]", m.me && "flex-row-reverse")}>
                    <span className="font-medium">{m.author}</span>
                    <span className={cn(
                      "text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                      m.role === "Investor" ? "bg-brand/10 text-brand" : m.role === "Founder" ? "bg-success/10 text-success" : "bg-violet/10 text-violet"
                    )}>{m.role}</span>
                    <span className="text-muted-foreground">{m.time}</span>
                  </div>
                )}
                <div className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm",
                  m.me ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm"
                )}>
                  {m.text}
                </div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="text-sm text-muted-foreground">No messages yet. Start the team conversation.</div>
        )}
      </div>

      {/* composer */}
      <div className="px-4 py-3 border-t border-border/60 bg-background">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition">
          <button className="text-muted-foreground hover:text-foreground p-1"><Paperclip className="h-4 w-4" /></button>
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t("chat.placeholder")}
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1"
          />
          <button className="text-muted-foreground hover:text-foreground p-1"><Smile className="h-4 w-4" /></button>
          <button onClick={send} disabled={!draft.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> {t("chat.send")}
          </button>
        </div>
      </div>
    </div>
  );
}

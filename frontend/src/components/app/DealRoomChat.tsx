import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Users, Lock, Smile, MoreHorizontal, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";

interface Props {
  dealRoomId: string;
  userId: string | undefined;
  userName: string;
}

interface Msg {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  users?: { full_name: string | null; avatar_url?: string | null } | null;
}

// Quick emoji reactions (local only for now, no DB persistence needed yet)
const QUICK_REACTIONS = ["👍", "🎉", "💡", "🤝", "✅"];

function DateSeparator({ date }: { date: Date }) {
  const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

function Avatar({ name, avatarUrl, isMe, size = "md" }: { name: string; avatarUrl?: string | null; isMe: boolean; size?: "sm" | "md" }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const sz = size === "sm" ? "h-6 w-6 text-[8px]" : "h-8 w-8 text-[10px]";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={cn(sz, "rounded-full object-cover border-2", isMe ? "border-brand/30" : "border-border/60")} />;
  }
  return (
    <div className={cn("grid place-items-center rounded-full font-semibold shrink-0", sz, isMe ? "hs-gradient text-brand-foreground" : "bg-accent text-muted-foreground")}>
      {initials}
    </div>
  );
}

export function DealRoomChat({ dealRoomId, userId, userName }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "instant" });
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at, users(full_name, avatar_url)")
      .eq("deal_room_id", dealRoomId)
      .eq("private_to_org", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMsgs((data as Msg[]) ?? []);
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
      });

    const channel = supabase
      .channel("team-chat-" + dealRoomId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `deal_room_id=eq.${dealRoomId}` }, (payload) => {
        const row = payload.new as Msg;
        if (!row.private_to_org) return;
        // Fetch sender name for real-time messages
        supabase.from("users").select("full_name, avatar_url").eq("id", row.sender_id).maybeSingle().then(({ data }) => {
          setMsgs((xs) => [...xs.filter((m) => m.id !== row.id), { ...row, users: data ?? null }]);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId, userId, scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [msgs.length, scrollToBottom]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setDraft("");
    inputRef.current?.focus();
    const optId = crypto.randomUUID();
    setMsgs((xs) => [...xs, { id: optId, sender_id: userId, body: text, created_at: new Date().toISOString(), users: { full_name: userName } }]);
    const { error } = await supabase.from("messages").insert({ deal_room_id: dealRoomId, sender_id: userId, body: text, private_to_org: true, is_qa: false });
    if (error) { setMsgs((xs) => xs.filter((m) => m.id !== optId)); setDraft(text); }
    setSending(false);
  };

  const addReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => {
      const cur = prev[msgId] ?? [];
      return { ...prev, [msgId]: cur.includes(emoji) ? cur.filter((e) => e !== emoji) : [...cur, emoji] };
    });
  };

  // Group messages — insert date separators
  const renderItems: Array<{ type: "date"; date: Date } | { type: "msg"; msg: Msg; isMe: boolean; grouped: boolean }> = [];
  msgs.forEach((m, i) => {
    const prev = msgs[i - 1];
    const date = new Date(m.created_at);
    if (!prev || !isSameDay(new Date(prev.created_at), date)) {
      renderItems.push({ type: "date", date });
    }
    const grouped = !!prev && prev.sender_id === m.sender_id && isSameDay(new Date(prev.created_at), date)
      && (date.getTime() - new Date(prev.created_at).getTime()) < 5 * 60 * 1000; // group if < 5min apart
    renderItems.push({ type: "msg", msg: m, isMe: m.sender_id === userId, grouped });
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/60 bg-card/50 flex items-center gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            Team Chat
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-brand">
              <Lock className="h-2.5 w-2.5" /> Private
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Users className="h-3 w-3" /> Visible only to your team — not shared with the other party
          </div>
        </div>
        <button className="grid h-7 w-7 place-items-center rounded-md hover:bg-accent text-muted-foreground" title="Channel info">
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Privacy notice — shown once at top of empty chat */}
      {!loading && msgs.length === 0 && (
        <div className="mx-5 mt-5 rounded-lg border border-brand/20 bg-accent p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent">
              <Lock className="h-4 w-4 text-brand" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground mb-1">This is your team's private channel</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Messages here are only visible to members on your side of the deal. Use this to discuss strategy, share notes, and coordinate before responding to the other party.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse py-4">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        {renderItems.map((item, idx) => {
          if (item.type === "date") return <DateSeparator key={`date-${idx}`} date={item.date} />;
          const { msg: m, isMe, grouped } = item;
          const name = isMe ? userName : (m.users?.full_name ?? "Team member");
          const msgReactions = reactions[m.id] ?? [];

          return (
            <div
              key={m.id}
              className={cn("group flex items-end gap-2.5 py-0.5", grouped ? "mt-0.5" : "mt-3", isMe && "flex-row-reverse")}
              onMouseEnter={() => setHoveredId(m.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Avatar — hidden when grouped */}
              <div className={cn("shrink-0", grouped && "invisible")}>
                <Avatar name={name} avatarUrl={m.users?.avatar_url} isMe={isMe} />
              </div>

              <div className={cn("flex flex-col max-w-[72%]", isMe && "items-end")}>
                {/* Name + time — hidden when grouped */}
                {!grouped && (
                  <div className={cn("flex items-baseline gap-2 mb-1", isMe && "flex-row-reverse")}>
                    <span className="text-[11px] font-semibold">{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )}

                {/* Bubble */}
                <div className="relative">
                  <div className={cn(
                    "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
                    isMe
                      ? "hs-gradient text-brand-foreground rounded-tr-[4px]"
                      : "bg-accent text-foreground rounded-tl-[4px]",
                  )}>
                    {m.body}
                  </div>

                  {/* Reaction picker — shows on hover */}
                  {hoveredId === m.id && (
                    <div className={cn(
                      "absolute -top-7 flex items-center gap-0.5 rounded-full border border-border/60 bg-card shadow-md px-1.5 py-1 z-10",
                      isMe ? "right-0" : "left-0"
                    )}>
                      {QUICK_REACTIONS.map((e) => (
                        <button key={e} onClick={() => addReaction(m.id, e)}
                          className="text-sm hover:scale-125 transition-transform px-0.5 rounded"
                          title={`React with ${e}`}
                        >{e}</button>
                      ))}
                      <button className="text-muted-foreground hover:text-foreground ml-0.5">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {msgReactions.length > 0 && (
                  <div className={cn("flex flex-wrap gap-1 mt-1", isMe && "justify-end")}>
                    {msgReactions.map((e) => (
                      <button key={e} onClick={() => addReaction(m.id, e)}
                        className="inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs hover:bg-accent transition-colors"
                      >{e}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="px-4 pb-4 pt-2 border-t border-border/60 bg-card/50 shrink-0">
        <div className={cn(
          "flex items-end gap-2 rounded-lg border bg-background px-3 py-2 transition-all",
          draft ? "border-brand/50 ring-2 ring-brand/10" : "border-border/60"
        )}>
          <button className="text-muted-foreground hover:text-foreground shrink-0 mb-1" title="Emoji">
            <Smile className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // Auto-resize
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Message the team…  (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-transparent text-sm resize-none outline-none py-1 min-h-[22px] max-h-[120px] placeholder:text-muted-foreground/60"
          />
          <button
            onClick={() => void send()}
            disabled={!draft.trim() || !userId || sending}
            className={cn(
              "inline-flex items-center justify-center rounded-lg p-2 transition-all shrink-0 mb-0.5",
              draft.trim() && !sending
                ? "hs-gradient text-brand-foreground shadow-glow hover:opacity-90"
                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            )}
          >
            {sending ? <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground/50 text-center">
          🔒 Private to your team · {msgs.length} message{msgs.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
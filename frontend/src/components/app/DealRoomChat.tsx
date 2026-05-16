import { useState, useEffect, useRef } from "react";
import { Send, Users, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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
  users?: { full_name: string | null } | null;
}

export function DealRoomChat({ dealRoomId, userId, userName }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at, users(full_name)")
      .eq("deal_room_id", dealRoomId)
      .eq("private_to_org", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMsgs((data as Msg[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel("team-chat-" + dealRoomId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `deal_room_id=eq.${dealRoomId}`,
      }, (payload) => {
        const row = payload.new as Msg;
        if (!row.private_to_org) return;
        setMsgs((xs) => [...xs, row]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setDraft("");
    const optId = crypto.randomUUID();
    const optimistic: Msg = {
      id: optId,
      sender_id: userId,
      body: text,
      created_at: new Date().toISOString(),
      users: { full_name: userName },
    };
    setMsgs((xs) => [...xs, optimistic]);
    const { error } = await supabase
      .from("messages")
      .insert({ deal_room_id: dealRoomId, sender_id: userId, body: text, private_to_org: true, is_qa: false });
    if (error) {
      setMsgs((xs) => xs.filter((m) => m.id !== optId));
      setDraft(text);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="px-5 py-3 border-b border-border/60 flex items-center gap-2">
        <div>
          <div className="text-sm font-semibold">Team Chat</div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> Deal room team channel
          </div>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading && <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>}
        {!loading && msgs.length === 0 && (
          <div className="text-sm text-muted-foreground">No messages yet. Start the team conversation.</div>
        )}
        {msgs.map((m, i) => {
          const isMe = m.sender_id === userId;
          const name = isMe ? userName : (m.users?.full_name ?? "Team member");
          const prev = msgs[i - 1];
          const grouped = prev && prev.sender_id === m.sender_id;
          const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
          return (
            <div key={m.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "")}>
              <div className={cn("h-8 w-8 shrink-0", grouped && "invisible")}>
                <div className={cn("grid h-8 w-8 place-items-center rounded-full text-[10px] font-semibold", isMe ? "bg-gradient-brand text-brand-foreground" : "bg-accent")}>
                  {initials}
                </div>
              </div>
              <div className={cn("max-w-[72%]", isMe && "items-end flex flex-col")}>
                {!grouped && (
                  <div className={cn("flex items-center gap-2 mb-1 text-[11px]", isMe && "flex-row-reverse")}>
                    <span className="font-medium">{name}</span>
                  </div>
                )}
                <div className={cn("rounded-2xl px-3.5 py-2 text-sm", isMe ? "bg-gradient-brand text-brand-foreground rounded-tr-sm" : "bg-accent rounded-tl-sm")}>
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div className="px-4 py-3 border-t border-border/60 bg-background">
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 focus-within:border-brand/50 focus-within:ring-2 focus-within:ring-brand/10 transition">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message the team…"
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-1"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || !userId || sending}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

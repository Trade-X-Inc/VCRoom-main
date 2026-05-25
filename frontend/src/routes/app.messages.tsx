import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Users, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  // All deal rooms the user is a member of
  const { data: rooms = [] } = useQuery({
    queryKey: ["chat-rooms", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("deal_room_id, deal_rooms(id, name, startups(company_name))")
        .eq("user_id", user!.id)
        .order("deal_room_id");
      return (data ?? []).map((r: any) => ({
        id: r.deal_room_id,
        name: r.deal_rooms?.startups?.company_name || r.deal_rooms?.name || "Deal Room",
      }));
    },
  });

  // Auto-select first room
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  // Messages for selected room
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", selectedRoomId],
    enabled: !!selectedRoomId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at, private, users(full_name, avatar_url, email)")
        .eq("deal_room_id", selectedRoomId!)
        .order("created_at", { ascending: true })
        .limit(100);
      return data ?? [];
    },
  });

  // Room members with profiles
  const { data: members = [] } = useQuery({
    queryKey: ["chat-members", selectedRoomId],
    enabled: !!selectedRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_members")
        .select("user_id, role, users(full_name, avatar_url, email)")
        .eq("deal_room_id", selectedRoomId!);
      return data ?? [];
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!draft.trim() || !selectedRoomId || !user?.id) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        deal_room_id: selectedRoomId,
        sender_id: user.id,
        body: draft.trim(),
        private: false,
      });
      if (error) throw error;
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat-messages", selectedRoomId] });
    } catch (e: any) {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Group messages by sender + time window (5min)
  const grouped: { messages: any[]; sender: any; isOwn: boolean }[] = [];
  messages.forEach((msg: any) => {
    const last = grouped[grouped.length - 1];
    const isOwn = msg.sender_id === user?.id;
    const withinWindow = last && last.sender.id === msg.sender_id &&
      (new Date(msg.created_at).getTime() - new Date(last.messages[last.messages.length - 1].created_at).getTime()) < 5 * 60 * 1000;
    if (withinWindow) { last.messages.push(msg); }
    else { grouped.push({ messages: [msg], sender: { id: msg.sender_id, ...msg.users }, isOwn }); }
  });

  const initials = (name: string) => (name || "?").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar: room list + members */}
      <div className="w-64 shrink-0 border-r border-border/60 flex flex-col bg-card">
        <div className="px-4 py-4 border-b border-border/60">
          <h2 className="text-sm font-semibold">Team Chat</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Across all deal rooms</p>
        </div>
        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold px-1 mb-1">Deal rooms</p>
            {rooms.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-4 text-center">No deal rooms yet</p>
            )}
            {rooms.map((room: any) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={cn(
                  "w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors mb-0.5",
                  selectedRoomId === room.id ? "bg-brand/10 text-brand font-medium" : "hover:bg-accent text-foreground"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{room.name}</span>
                {selectedRoomId === room.id && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
          {/* Participants */}
          {members.length > 0 && (
            <div className="px-3 py-2 border-t border-border/60 mt-2">
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold px-1 mb-2">
                <Users className="inline h-3 w-3 mr-1" />Participants · {members.length}
              </p>
              {members.map((m: any) => (
                <div key={m.user_id} className="flex items-center gap-2 px-1 py-1.5">
                  {m.users?.avatar_url
                    ? <img src={m.users.avatar_url} className="h-7 w-7 rounded-full object-cover border border-border/60 shrink-0" alt="" />
                    : <div className={cn(
                        "h-7 w-7 rounded-full grid place-items-center text-[9px] font-bold shrink-0 border",
                        m.role === "investor" ? "bg-success/15 text-success border-success/20" : "bg-brand/15 text-brand border-brand/20"
                      )}>
                        {initials(m.users?.full_name || m.users?.email || "?")}
                      </div>
                  }
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate">{m.users?.full_name || m.users?.email || "User"}</div>
                    <div className={cn("text-[9px] capitalize", m.role === "investor" ? "text-success" : "text-muted-foreground")}>{m.role}</div>
                  </div>
                  {m.user_id === user?.id && <div className="h-1.5 w-1.5 rounded-full bg-success shrink-0" title="You" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-border/60 flex items-center gap-3 bg-card shrink-0">
          <MessageSquare className="h-4 w-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold">{rooms.find((r: any) => r.id === selectedRoomId)?.name || "Select a deal room"}</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Encrypted · Watermarked</p>
          </div>
          <div className="ml-auto flex items-center -space-x-2">
            {members.slice(0, 5).map((m: any) => (
              <div key={m.user_id} title={m.users?.full_name || ""} className={cn(
                "h-7 w-7 rounded-full grid place-items-center text-[9px] font-bold border-2 border-background",
                m.role === "investor" ? "bg-success/20 text-success" : "bg-brand/20 text-brand"
              )}>
                {initials(m.users?.full_name || m.users?.email || "?")}
              </div>
            ))}
            {members.length > 5 && <div className="h-7 w-7 rounded-full bg-muted text-[9px] font-bold grid place-items-center border-2 border-background text-muted-foreground">+{members.length - 5}</div>}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!selectedRoomId && (
            <div className="h-full grid place-items-center text-center">
              <div>
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a deal room to start chatting</p>
              </div>
            </div>
          )}
          {selectedRoomId && messages.length === 0 && (
            <div className="h-full grid place-items-center text-center">
              <div>
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start the conversation below</p>
              </div>
            </div>
          )}
          {grouped.map((group, gi) => (
            <div key={gi} className={cn("flex gap-3", group.isOwn && "flex-row-reverse")}>
              {/* Avatar */}
              {group.sender?.avatar_url
                ? <img src={group.sender.avatar_url} className="h-8 w-8 rounded-full object-cover border border-border/60 shrink-0 mt-0.5" alt="" />
                : <div className={cn(
                    "h-8 w-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 mt-0.5 border",
                    group.isOwn ? "bg-brand/15 text-brand border-brand/20" : "bg-muted text-muted-foreground border-border/60"
                  )}>
                    {initials(group.sender?.full_name || group.sender?.email || "?")}
                  </div>
              }
              <div className={cn("flex flex-col gap-1 max-w-[70%]", group.isOwn && "items-end")}>
                <div className={cn("flex items-baseline gap-2", group.isOwn && "flex-row-reverse")}>
                  <span className="text-[11px] font-semibold">{group.isOwn ? "You" : (group.sender?.full_name || group.sender?.email || "User")}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(group.messages[0].created_at), { addSuffix: true })}</span>
                </div>
                {group.messages.map((msg: any) => (
                  <div key={msg.id} className={cn(
                    "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full",
                    group.isOwn
                      ? "bg-brand text-white rounded-tr-sm"
                      : "bg-muted/60 text-foreground rounded-tl-sm border border-border/50"
                  )}>
                    {msg.body}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-border/60 bg-card shrink-0">
          <div className="flex items-end gap-3">
            <div className="flex-1 rounded-xl border border-border/60 bg-background px-4 py-2.5 focus-within:border-brand/50 transition-colors">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder={selectedRoomId ? "Write a message… (Enter to send)" : "Select a deal room first"}
                disabled={!selectedRoomId}
                rows={1}
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-h-[20px] max-h-[120px]"
                style={{ height: 'auto' }}
                onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || !selectedRoomId || sending}
              className="h-10 w-10 rounded-xl bg-brand text-white grid place-items-center shrink-0 disabled:opacity-40 hover:bg-brand/90 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center"><Lock className="inline h-2.5 w-2.5 mr-0.5" />All messages are encrypted and watermarked</p>
        </div>
      </div>
    </div>
  );
}
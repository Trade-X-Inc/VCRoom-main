import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { Send, MessageSquare, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const isInvestor = user?.role === "investor";

  // Resolve workspace channel ID:
  // Founders → their startup_id; Investors → their user_id
  const { data: workspaceChannel, isLoading: channelLoading } = useQuery({
    queryKey: ["workspace-channel", user?.id, isInvestor],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isInvestor) return user!.id;
      const { data } = await supabase
        .from("startups")
        .select("id")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data?.id ?? user!.id;
    },
  });

  // Messages for this workspace channel
  const { data: messages = [] } = useQuery({
    queryKey: ["team-messages", workspaceChannel],
    enabled: !!workspaceChannel,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at, users:sender_id(full_name, avatar_url)")
        .eq("workspace_channel", workspaceChannel!)
        .order("created_at", { ascending: true })
        .limit(200);
      return data ?? [];
    },
  });

  // Derive unique team members from message senders
  const teamMembers = Object.values(
    (messages as any[]).reduce((acc: Record<string, any>, msg: any) => {
      if (!acc[msg.sender_id]) acc[msg.sender_id] = { id: msg.sender_id, ...msg.users };
      return acc;
    }, {})
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    console.log("workspaceChannel:", workspaceChannel);
    if (!draft.trim() || !workspaceChannel || !user?.id) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        body: draft.trim(),
        workspace_channel: workspaceChannel,
        private: false,
      });
      if (error) throw error;
      setDraft("");
      qc.invalidateQueries({ queryKey: ["team-messages", workspaceChannel] });
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group consecutive messages from same sender within a 5-minute window
  const grouped: { messages: any[]; sender: any; isOwn: boolean }[] = [];
  (messages as any[]).forEach((msg: any) => {
    const last = grouped[grouped.length - 1];
    const isOwn = msg.sender_id === user?.id;
    const withinWindow =
      last &&
      last.sender.id === msg.sender_id &&
      new Date(msg.created_at).getTime() -
        new Date(last.messages[last.messages.length - 1].created_at).getTime() <
        5 * 60 * 1000;
    if (withinWindow) {
      last.messages.push(msg);
    } else {
      grouped.push({ messages: [msg], sender: { id: msg.sender_id, ...msg.users }, isOwn });
    }
  });

  const initials = (name: string) =>
    (name || "?")
      .split(" ")
      .map((s: string) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const channelReady = !!workspaceChannel && !channelLoading;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-border/60 flex items-center gap-3 bg-card shrink-0">
          <MessageSquare className="h-4 w-4 text-brand" />
          <div>
            <h3 className="text-sm font-semibold">Team Chat</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Private workspace channel
            </p>
          </div>
          {/* Active team member avatars */}
          <div className="ml-auto flex items-center -space-x-2">
            {(teamMembers as any[]).slice(0, 5).map((m: any) => (
              <div
                key={m.id}
                title={m.full_name || ""}
                className="h-7 w-7 rounded-full grid place-items-center text-[9px] font-bold border-2 border-background bg-brand/20 text-brand overflow-hidden"
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} className="h-full w-full object-cover" alt="" />
                ) : (
                  initials(m.full_name || "?")
                )}
              </div>
            ))}
            {teamMembers.length > 5 && (
              <div className="h-7 w-7 rounded-full bg-muted text-[9px] font-bold grid place-items-center border-2 border-background text-muted-foreground">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {channelLoading && (
            <div className="h-full grid place-items-center">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}

          {channelReady && (messages as any[]).length === 0 && (
            <div className="h-full grid place-items-center text-center">
              <div>
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Invite team members to start chatting
                </p>
              </div>
            </div>
          )}

          {grouped.map((group, gi) => (
            <div key={gi} className={cn("flex gap-3", group.isOwn && "flex-row-reverse")}>
              {/* Avatar */}
              <div
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center text-[10px] font-bold shrink-0 mt-0.5 border overflow-hidden",
                  group.isOwn
                    ? "bg-brand/15 text-brand border-brand/20"
                    : "bg-muted text-muted-foreground border-border/60"
                )}
              >
                {group.sender?.avatar_url ? (
                  <img
                    src={group.sender.avatar_url}
                    className="h-full w-full object-cover"
                    alt=""
                  />
                ) : (
                  initials(group.sender?.full_name || "?")
                )}
              </div>

              {/* Bubbles */}
              <div className={cn("flex flex-col gap-1 max-w-[70%]", group.isOwn && "items-end")}>
                <div className={cn("flex items-baseline gap-2", group.isOwn && "flex-row-reverse")}>
                  <span className="text-[11px] font-semibold">
                    {group.isOwn ? "You" : group.sender?.full_name || "Team member"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(group.messages[0].created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {group.messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full",
                      group.isOwn
                        ? "bg-brand text-white rounded-tr-sm"
                        : "bg-muted/60 text-foreground rounded-tl-sm border border-border/50"
                    )}
                  >
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
                placeholder={channelReady ? "Write a message… (Enter to send)" : "Loading…"}
                disabled={!channelReady}
                rows={1}
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-h-[20px] max-h-[120px]"
                style={{ height: "auto" }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!draft.trim() || !channelReady || sending}
              className="h-10 w-10 rounded-xl bg-brand text-white grid place-items-center shrink-0 disabled:opacity-40 hover:bg-brand/90 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            <Lock className="inline h-2.5 w-2.5 mr-0.5" />
            Team messages are private to your workspace
          </p>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const { data: room } = useQuery({
    queryKey: ["messages-room"],
    queryFn: async () => {
      const { data } = await supabase.from("deal_rooms").select("id").limit(1).maybeSingle();
      return data;
    },
  });
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", room?.id],
    enabled: !!room?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at")
        .eq("deal_room_id", room!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const send = async () => {
    if (!draft.trim() || !room?.id || !user?.id) return;
    const { error } = await supabase.from("messages").insert({
      deal_room_id: room.id,
      sender_id: user.id,
      body: draft.trim(),
    });
    if (!error) {
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["messages", room.id] });
    }
  };

  return <Placeholder title="Messages" sub="Threaded conversations with every investor in one inbox." messages={messages} meId={user?.id} draft={draft} onDraft={setDraft} onSend={send} />;
}

function Placeholder({ title, sub, messages, meId, draft, onDraft, onSend }: { title: string; sub: string; messages: any[]; meId?: string; draft: string; onDraft: (v: string) => void; onSend: () => void }) {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="text-sm text-muted-foreground">{sub}</div>
      <div className="mt-6 grid grid-cols-[280px_1fr] gap-0 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden min-h-[500px]">
        <div className="border-r border-border/60 flex flex-col">
          <div className="px-4 py-3 border-b border-border/60 text-xs text-muted-foreground">Conversations</div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-xs text-muted-foreground text-center">No conversations yet.<br />Messages from investors appear here.</div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex-1 p-6 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_id === meId ? "justify-end" : ""}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${m.sender_id === meId ? "bg-gradient-brand text-brand-foreground" : "bg-accent"}`}>{m.body}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 p-3 flex gap-2">
            <input value={draft} onChange={(e) => onDraft(e.target.value)} placeholder="Message…" className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
            <button onClick={onSend} className="rounded-md bg-gradient-brand text-brand-foreground px-4 text-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

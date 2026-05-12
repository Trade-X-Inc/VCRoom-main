import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { u as useAuth, s as supabase } from "./router-D87oKCVm.js";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "sonner";
import "clsx";
function MessagesPage() {
  const {
    user
  } = useAuth();
  const [draft, setDraft] = useState("");
  const queryClient = useQueryClient();
  const {
    data: room
  } = useQuery({
    queryKey: ["messages-room"],
    queryFn: async () => {
      const {
        data
      } = await supabase.from("deal_rooms").select("id").limit(1).maybeSingle();
      return data;
    }
  });
  const {
    data: messages = []
  } = useQuery({
    queryKey: ["messages", room?.id],
    enabled: !!room?.id,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("messages").select("id, body, sender_id, created_at").eq("deal_room_id", room.id).order("created_at", {
        ascending: true
      });
      if (error) throw error;
      return data ?? [];
    }
  });
  const send = async () => {
    if (!draft.trim() || !room?.id || !user?.id) return;
    const {
      error
    } = await supabase.from("messages").insert({
      deal_room_id: room.id,
      sender_id: user.id,
      body: draft.trim()
    });
    if (!error) {
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: ["messages", room.id]
      });
    }
  };
  return /* @__PURE__ */ jsx(Placeholder, { title: "Messages", sub: "Threaded conversations with every investor in one inbox.", messages, meId: user?.id, draft, onDraft: setDraft, onSend: send });
}
function Placeholder({
  title,
  sub,
  messages,
  meId,
  draft,
  onDraft,
  onSend
}) {
  return /* @__PURE__ */ jsxs("div", { className: "p-6 lg:p-8 max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: title }),
    /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: sub }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 grid grid-cols-[280px_1fr] gap-0 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden min-h-[500px]", children: [
      /* @__PURE__ */ jsxs("div", { className: "border-r border-border/60 flex flex-col", children: [
        /* @__PURE__ */ jsx("div", { className: "px-4 py-3 border-b border-border/60 text-xs text-muted-foreground", children: "Conversations" }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 flex items-center justify-center p-4", children: /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground text-center", children: [
          "No conversations yet.",
          /* @__PURE__ */ jsx("br", {}),
          "Messages from investors appear here."
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
        /* @__PURE__ */ jsx("div", { className: "flex-1 p-6 space-y-4", children: messages.map((m) => /* @__PURE__ */ jsx("div", { className: `flex ${m.sender_id === meId ? "justify-end" : ""}`, children: /* @__PURE__ */ jsx("div", { className: `max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${m.sender_id === meId ? "bg-gradient-brand text-brand-foreground" : "bg-accent"}`, children: m.body }) }, m.id)) }),
        /* @__PURE__ */ jsxs("div", { className: "border-t border-border/60 p-3 flex gap-2", children: [
          /* @__PURE__ */ jsx("input", { value: draft, onChange: (e) => onDraft(e.target.value), placeholder: "Message…", className: "flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" }),
          /* @__PURE__ */ jsx("button", { onClick: onSend, className: "rounded-md bg-gradient-brand text-brand-foreground px-4 text-sm", children: "Send" })
        ] })
      ] })
    ] })
  ] });
}
export {
  MessagesPage as component
};

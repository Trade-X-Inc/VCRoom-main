import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  Send, Hash, CheckSquare, FileText, Activity, Plus,
  Loader2, Pin, MessageSquare, X, ChevronDown, ChevronRight,
  Trash2, Calendar, User, Flag, LayoutList, Columns3,
  Clock, Circle, AlertCircle, Users, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LcsButton, LcsEmptyState, LcsModal, LcsTextField, LcsSelectField, LcsTextareaField } from "@/components/lcs";

export const Route = createFileRoute("/app/messages")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/team-chat" as any, replace: true });
  },
  component: WorkspacePage,
});

// ── Types ─────────────────────────────────────────────────────────────────

type Section = "chat" | "tasks" | "notes" | "activity";

interface Channel {
  id: string;
  startup_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface Message {
  id: string;
  channel_id: string;
  startup_id: string;
  user_id: string;
  sender_name: string;
  content: string;
  thread_of: string | null;
  pinned: boolean;
  created_at: string;
}

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

interface Task {
  id: string;
  startup_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  deal_room_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  startup_id: string;
  title: string;
  content: string | null;
  created_by: string;
  author_name: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  user_id: string;
  display_name: string | null;
  role: string;
}

interface ActivityEntry {
  id: string;
  actor_name: string | null;
  action_type: string;
  target_label: string | null;
  detail: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function colorFromId(id: string) {
  const COLORS = ["var(--lcs-accent)", "#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#14B8A6", "#8B5CF6", "#F97316"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

function relTime(date: string) {
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "d MMM h:mm a");
}

function groupByDate(entries: ActivityEntry[]) {
  const groups: Map<string, ActivityEntry[]> = new Map();
  for (const e of entries) {
    const d = new Date(e.created_at);
    const key = isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : format(d, "EEEE d MMM");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return groups;
}

// Status-color mapping, reported and approved before building (see the
// Group-4b color-mapping report): a real 4-way ordinal severity, not a
// decorative palette. urgent = attention (the one alarm-worthy state);
// high = accent (elevated, not urgent); medium/low share the neutral
// muted tone, differentiated only by label — LCS has no 5th tone and
// low-vs-medium isn't a state distinction worth a dedicated color.
const PRIORITY_CFG: Record<TaskPriority, { label: string; bg: string; text: string }> = {
  urgent: { label: "Urgent", bg: "var(--lcs-attention-wash)", text: "var(--lcs-attention)" },
  high:   { label: "High",   bg: "var(--lcs-progress-wash)",  text: "var(--lcs-accent)" },
  medium: { label: "Medium", bg: "var(--lcs-surface)",        text: "var(--lcs-ink-muted)" },
  low:    { label: "Low",    bg: "var(--lcs-surface)",        text: "var(--lcs-ink-muted)" },
};

// Maps onto LCS's 4-status vocabulary almost by name: todo=pending
// (muted), in_progress=accent, review=attention (here "attention" means
// "needs a human's eyes," the same underlying signal as its usual
// error/blocker meaning), done=satisfied.
const STATUS_COLS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo",        label: "Todo",        color: "var(--lcs-ink-muted)" },
  { key: "in_progress", label: "In Progress", color: "var(--lcs-accent)" },
  { key: "review",      label: "Review",      color: "var(--lcs-attention)" },
  { key: "done",        label: "Done",        color: "var(--lcs-satisfied)" },
];

// Collapsed from 8 decorative hues to LCS's 4-status vocabulary: these
// event types don't represent different *states*, just different event
// *kinds* — all equally "something happened, neutral-to-positive" except
// rejected (the one genuine negative outcome) and approved (reuses
// satisfied, consistent with task `done` elsewhere in this file).
const ACTION_COLORS: Record<string, string> = {
  rejected: "var(--lcs-attention)",
  approved: "var(--lcs-satisfied)",
  upload: "var(--lcs-accent)", decision: "var(--lcs-accent)", connect: "var(--lcs-accent)",
  invite: "var(--lcs-accent)",
  message: "var(--lcs-ink-muted)", profile_update: "var(--lcs-ink-muted)", default: "var(--lcs-ink-muted)",
};

function actionColor(type: string) {
  for (const [k, v] of Object.entries(ACTION_COLORS)) {
    if (type.includes(k)) return v;
  }
  return ACTION_COLORS.default;
}

// ── Avatar ────────────────────────────────────────────────────────────────
// colorFromId's rainbow palette is NOT a status-color violation — it's a
// hash-based per-person visual identifier (so distinct people are
// distinguishable in a chat/mention list), not a communicator of state.
// Left as-is per the color-mapping report; collapsing to 4 tones would
// make people harder to tell apart for zero LCS-compliance benefit.

function Avatar({ name, userId, size = 28 }: { name: string; userId: string; size?: number }) {
  const bg = colorFromId(userId);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color: "#fff", fontFamily: "var(--font-lcs-ui)" }}>
      {initials(name || "?")}
    </div>
  );
}

// ── Chat Section ──────────────────────────────────────────────────────────

function ChatSection({ startupId, userId, userName, channels, onChannelCreated }: {
  startupId: string; userId: string; userName: string;
  channels: Channel[]; onChannelCreated: () => void;
}) {
  const qc = useQueryClient();
  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showPinned, setShowPinned] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set active channel to general on load
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0].id);
    }
  }, [channels, activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["workspace-messages", activeChannelId],
    enabled: !!activeChannelId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_messages")
        .select("*")
        .eq("channel_id", activeChannelId)
        .order("created_at", { ascending: true })
        .limit(50);
      return (data ?? []) as Message[];
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Realtime subscription
  useEffect(() => {
    if (!activeChannelId) return;
    const sub = supabase
      .channel(`team-messages-${activeChannelId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "team_messages",
        filter: `channel_id=eq.${activeChannelId}`,
      }, () => {
        refetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeChannelId, refetchMessages]);

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    const { error } = await supabase.from("team_messages").insert({
      channel_id: activeChannelId,
      startup_id: startupId,
      user_id: userId,
      sender_name: userName,
      content,
      pinned: false,
    });
    setSending(false);
    if (error) { console.error("[workspace] message send error:", error.code, error.message, error.details); toast.error("Failed to send"); return; }
    setDraft("");
    refetchMessages();
  };

  const pinMessage = async (msg: Message) => {
    const { error } = await supabase.from("team_messages").update({ pinned: !msg.pinned }).eq("id", msg.id);
    if (error) { console.error("[messages] pin failed:", error); toast.error("Could not pin message."); return; }
    refetchMessages();
  };

  const addChannel = async () => {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    const { error } = await supabase.from("team_channels").insert({
      startup_id: startupId, name, entity_type: "general", description: null, created_by: userId,
    });
    if (error) { toast.error("Failed to create channel"); return; }
    setNewChannelName(""); setShowAddChannel(false);
    onChannelCreated();
    toast.success(`#${name} created`);
  };

  const topMessages = messages.filter((m) => !m.thread_of);
  const threadReplies = (parentId: string) => messages.filter((m) => m.thread_of === parentId);
  const pinnedMessages = messages.filter((m) => m.pinned && !m.thread_of);

  return (
    <div className="flex flex-col h-full">
      {/* Channel subheader */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
        <Hash className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
        <span className="font-semibold text-sm" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{activeChannel?.name ?? "general"}</span>
        {activeChannel?.description && (
          <span className="text-xs ml-2" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>— {activeChannel.description}</span>
        )}
      </div>

      {/* Pinned messages collapse */}
      {pinnedMessages.length > 0 && (
        <button
          onClick={() => setShowPinned((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 text-xs transition-colors"
          style={{ borderBottom: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)", background: "var(--lcs-surface)", fontFamily: "var(--font-lcs-ui)" }}
        >
          <Pin className="h-3 w-3" />
          {pinnedMessages.length} pinned message{pinnedMessages.length !== 1 ? "s" : ""}
          {showPinned ? <ChevronDown className="h-3 w-3 ml-auto" /> : <ChevronRight className="h-3 w-3 ml-auto" />}
        </button>
      )}
      {showPinned && (
        <div className="px-4 py-2 space-y-1" style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-progress-wash)" }}>
          {pinnedMessages.map((m) => (
            <div key={m.id} className="px-3 py-2" style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)" }}>
              <span className="text-xs font-medium" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{m.sender_name}: </span>
              <span className="text-xs" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{m.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "var(--lcs-white)" }} data-testid="message-list">
        {topMessages.length === 0 && (
          <LcsEmptyState title="No messages" text="Start the conversation with your team." />
        )}
        {topMessages.map((msg) => {
          const replies = threadReplies(msg.id);
          const expanded = expandedThreads.has(msg.id);
          return (
            <div key={msg.id} className="group">
              <div className="flex items-start gap-2.5">
                <Avatar name={msg.sender_name} userId={msg.user_id} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{msg.sender_name}</span>
                    <span className="text-[11px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>{relTime(msg.created_at)}</span>
                    {msg.pinned && <Pin className="h-3 w-3" style={{ color: "var(--lcs-accent)" }} />}
                  </div>
                  <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{msg.content}</div>
                  {replies.length > 0 && (
                    <button
                      onClick={() => setExpandedThreads((s) => { const n = new Set(s); n.has(msg.id) ? n.delete(msg.id) : n.add(msg.id); return n; })}
                      className="flex items-center gap-1.5 mt-1.5 text-[11px] hover:underline"
                      style={{ color: "var(--lcs-accent)", fontFamily: "var(--font-lcs-ui)" }}
                    >
                      {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {replies.length} {replies.length === 1 ? "reply" : "replies"}
                    </button>
                  )}
                  {expanded && (
                    <div className="ml-4 mt-2 space-y-2 pl-3" style={{ borderLeft: "2px solid var(--lcs-line)" }}>
                      {replies.map((r) => (
                        <div key={r.id} className="flex items-start gap-2">
                          <Avatar name={r.sender_name} userId={r.user_id} size={20} />
                          <div>
                            <span className="text-xs font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{r.sender_name}</span>
                            <span className="text-[10px] ml-2" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>{relTime(r.created_at)}</span>
                            <div className="text-xs" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{r.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Hover actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button
                    onClick={() => pinMessage(msg)}
                    className="p-1 transition-colors"
                    title={msg.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3 w-3" style={{ color: msg.pinned ? "var(--lcs-accent)" : "var(--lcs-ink-muted)" }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Add channel dialog */}
      {showAddChannel && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--lcs-ink-muted)" }} />
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addChannel(); if (e.key === "Escape") setShowAddChannel(false); }}
              placeholder="channel-name"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
            />
            <LcsButton variant="primary" onClick={addChannel} className="text-xs px-2 py-1">Create</LcsButton>
            <button onClick={() => setShowAddChannel(false)}><X className="h-3.5 w-3.5" style={{ color: "var(--lcs-ink-muted)" }} /></button>
          </div>
        </div>
      )}

      {/* Send bar */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
        <div className="flex items-end gap-2 px-3 py-2" style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)" }}>
          <textarea
            ref={textareaRef}
            data-testid="message-input"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={`Message #${activeChannel?.name ?? "general"}…`}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none"
            style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)", maxHeight: 96, lineHeight: "1.5" }}
          />
          <button
            onClick={sendMessage}
            disabled={!draft.trim() || sending}
            data-testid="send-message-btn"
            className="flex-shrink-0 p-1.5 transition-colors"
            style={{ background: draft.trim() ? "var(--lcs-accent)" : "var(--lcs-surface)", color: draft.trim() ? "var(--lcs-white)" : "var(--lcs-ink-muted)" }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────

function TaskCard({ task, onDragStart, onClick }: {
  task: Task; onDragStart: () => void; onClick: () => void;
}) {
  const p = PRIORITY_CFG[task.priority];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  const isDueToday = task.due_date && isToday(new Date(task.due_date + "T00:00:00"));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-3 cursor-grab active:cursor-grabbing transition-colors"
      style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)" }}
    >
      <div className="text-sm font-medium mb-2" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{task.title}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span style={{ background: p.bg, color: p.text, padding: "1px 8px", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-lcs-ui)" }}>{p.label}</span>
        {task.assignee_name && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>
            <Avatar name={task.assignee_name} userId={task.assignee_id ?? "x"} size={14} />
          </span>
        )}
        {task.due_date && (
          <span className="text-[10px] flex items-center gap-0.5" style={{ color: isOverdue ? "var(--lcs-attention)" : isDueToday ? "var(--lcs-accent)" : "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
            <Calendar className="h-2.5 w-2.5" />
            {format(new Date(task.due_date + "T00:00:00"), "d MMM")}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Task Slide-Over ───────────────────────────────────────────────────────

function TaskSlideOver({ startupId, userId, task, teamMembers, dealRooms, onClose, onSaved }: {
  startupId: string; userId: string; task: Task | null; teamMembers: TeamMember[];
  dealRooms: { id: string; company_name: string }[];
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: (task?.status ?? "todo") as TaskStatus,
    priority: (task?.priority ?? "medium") as TaskPriority,
    assignee_id: task?.assignee_id ?? "",
    assignee_name: task?.assignee_name ?? "",
    due_date: task?.due_date ?? "",
    deal_room_id: task?.deal_room_id ?? "",
    tags: (task?.tags ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const assignee = teamMembers.find((m) => m.user_id === form.assignee_id);
    const payload = {
      startup_id: startupId,
      title: form.title.trim(),
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id || null,
      assignee_name: (assignee?.display_name ?? form.assignee_name) || null,
      due_date: form.due_date || null,
      deal_room_id: form.deal_room_id || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      created_by: userId,
      updated_at: new Date().toISOString(),
    };
    const { error } = isEdit
      ? await supabase.from("team_tasks").update(payload).eq("id", task!.id)
      : await supabase.from("team_tasks").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isEdit ? "Task updated" : "Task created");
    onSaved(); onClose();
  };

  return (
    <div data-testid="task-slideover">
      <LcsModal
        title={isEdit ? "Edit task" : "New task"}
        variant="slide-over"
        onClose={onClose}
        footer={
          <>
            <LcsButton variant="secondary" onClick={onClose}>Cancel</LcsButton>
            <LcsButton variant="primary" onClick={handleSave} disabled={saving} data-testid="save-task-btn">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : isEdit ? "Update" : "Create task"}
            </LcsButton>
          </>
        }
      >
        <LcsTextField label="Title *" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Task title" data-testid="task-title-input" />
        <LcsTextareaField label="Description" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What needs to be done…" rows={3} />
        <div className="grid grid-cols-2 gap-3">
          <LcsSelectField label="Status" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </LcsSelectField>
          <LcsSelectField label="Priority" value={form.priority} onChange={(e) => set("priority", e.target.value)} data-testid="task-priority-select">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </LcsSelectField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LcsSelectField label="Assignee" value={form.assignee_id} onChange={(e) => set("assignee_id", e.target.value)}>
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.display_name ?? m.user_id.slice(0, 8)}</option>
            ))}
          </LcsSelectField>
          <LcsTextField label="Due date" type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
        </div>
        {dealRooms.length > 0 && (
          <LcsSelectField label="Deal room (optional)" value={form.deal_room_id} onChange={(e) => set("deal_room_id", e.target.value)}>
            <option value="">None</option>
            {dealRooms.map((d) => <option key={d.id} value={d.id}>{d.company_name}</option>)}
          </LcsSelectField>
        )}
        <LcsTextField label="Tags (comma separated)" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="fundraising, q2, urgent" />
      </LcsModal>
    </div>
  );
}

// ── Tasks Section ─────────────────────────────────────────────────────────

function TasksSection({ startupId, userId, teamMembers }: { startupId: string; userId: string; teamMembers: TeamMember[] }) {
  const qc = useQueryClient();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data: tasks = [], refetch } = useQuery<Task[]>({
    queryKey: ["workspace-tasks", startupId],
    enabled: !!startupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_tasks")
        .select("*")
        .eq("startup_id", startupId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Task[];
    },
  });

  const { data: dealRooms = [] } = useQuery<{ id: string; company_name: string }[]>({
    queryKey: ["deal-rooms-list", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_rooms").select("id, company_name").eq("startup_id", startupId);
      return (data ?? []) as { id: string; company_name: string }[];
    },
  });

  const handleDrop = async (newStatus: TaskStatus) => {
    if (!draggingId) return;
    const { error } = await supabase.from("team_tasks").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", draggingId);
    if (error) { console.error("[tasks] drop failed:", error); toast.error("Could not move task."); setDraggingId(null); return; }
    qc.setQueryData<Task[]>(["workspace-tasks", startupId], (prev) =>
      prev?.map((t) => t.id === draggingId ? { ...t, status: newStatus } : t) ?? []
    );
    setDraggingId(null);
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await supabase.from("team_tasks").delete().eq("id", id);
    if (error) { console.error("[tasks] delete failed:", error); toast.error("Could not delete task."); return; }
    refetch();
  };

  const markDone = async (id: string) => {
    const { error } = await supabase.from("team_tasks").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("[tasks] mark done failed:", error); toast.error("Could not update task."); return; }
    refetch();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
          <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>Tasks</span>
          <span className="text-xs px-2 py-0.5 font-medium" style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>{tasks.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden" style={{ border: "1px solid var(--lcs-line)" }}>
            <button onClick={() => setView("kanban")} className="px-2.5 py-1.5 text-xs" style={{ background: view === "kanban" ? "var(--lcs-accent)" : "var(--lcs-white)", color: view === "kanban" ? "var(--lcs-white)" : "var(--lcs-ink-muted)" }}>
              <Columns3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setView("list")} className="px-2.5 py-1.5 text-xs" style={{ background: view === "list" ? "var(--lcs-accent)" : "var(--lcs-white)", color: view === "list" ? "var(--lcs-white)" : "var(--lcs-ink-muted)", borderLeft: "1px solid var(--lcs-line)" }}>
              <LayoutList className="h-3.5 w-3.5" />
            </button>
          </div>
          <LcsButton
            variant="primary"
            onClick={() => { setEditingTask(null); setShowSlideOver(true); }}
            data-testid="add-task-btn"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </LcsButton>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 p-4 overflow-x-auto flex-1" style={{ background: "var(--lcs-white)" }} data-testid="kanban-board">
          {STATUS_COLS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className="flex flex-col"
                style={{ minWidth: 240, flex: "0 0 240px" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
                data-testid={`kanban-col-${col.key}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Circle className="h-2 w-2" style={{ fill: col.color, color: col.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: col.color, fontFamily: "var(--font-lcs-ui)" }}>{col.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 ml-auto font-medium" style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>{colTasks.length}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onDragStart={() => setDraggingId(t.id)}
                      onClick={() => { setEditingTask(t); setShowSlideOver(true); }}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="py-6 text-center" style={{ border: "1px dashed var(--lcs-line)" }}>
                      <p className="text-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ background: "var(--lcs-white)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
                {["Title", "Status", "Priority", "Assignee", "Due date", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const p = PRIORITY_CFG[t.priority];
                const col = STATUS_COLS.find((c) => c.key === t.status);
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
                return (
                  <tr key={t.id} className="transition-colors" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{t.title}</td>
                    <td className="px-4 py-2.5">
                      <span style={{ color: col?.color ?? "var(--lcs-ink-muted)", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-lcs-ui)" }}>{col?.label ?? t.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span style={{ background: p.bg, color: p.text, padding: "2px 8px", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-lcs-ui)" }}>{p.label}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {t.assignee_name ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={t.assignee_name} userId={t.assignee_id ?? "x"} size={18} />
                          <span className="text-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{t.assignee_name}</span>
                        </div>
                      ) : <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {t.due_date ? <span className="text-xs" style={{ color: isOverdue ? "var(--lcs-attention)" : "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>{format(new Date(t.due_date + "T00:00:00"), "d MMM yyyy")}</span> : <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setEditingTask(t); setShowSlideOver(true); }} className="text-xs transition-colors" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Edit</button>
                        {t.status !== "done" && <button onClick={() => markDone(t.id)} className="text-xs" style={{ color: "var(--lcs-satisfied)", fontFamily: "var(--font-lcs-ui)" }}>Done</button>}
                        <button onClick={() => deleteTask(t.id)} className="text-xs" style={{ color: "var(--lcs-attention)", fontFamily: "var(--font-lcs-ui)" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>No tasks</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showSlideOver && (
        <TaskSlideOver
          startupId={startupId}
          userId={userId}
          task={editingTask}
          teamMembers={teamMembers}
          dealRooms={dealRooms}
          onClose={() => { setShowSlideOver(false); setEditingTask(null); }}
          onSaved={refetch}
        />
      )}
    </div>
  );
}

// ── Notes Section ─────────────────────────────────────────────────────────

function NotesSection({ startupId, userId, userName }: { startupId: string; userId: string; userName: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const { data: notes = [], refetch } = useQuery<Note[]>({
    queryKey: ["workspace-notes", startupId],
    enabled: !!startupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_notes")
        .select("*")
        .eq("startup_id", startupId)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      return (data ?? []) as Note[];
    },
  });

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  useEffect(() => {
    if (activeNote) { setEditTitle(activeNote.title); setEditContent(activeNote.content ?? ""); }
  }, [activeNoteId]);

  const autoSave = useCallback(async (id: string, title: string, content: string) => {
    setSaving(true);
    const { error } = await supabase.from("team_notes").update({ title: title || "Untitled", content, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("[notes] autosave failed:", error); toast.error("Note not saved — check your connection."); setSaving(false); return; }
    setSaving(false);
    qc.setQueryData<Note[]>(["workspace-notes", startupId], (prev) =>
      prev?.map((n) => n.id === id ? { ...n, title: title || "Untitled", content, updated_at: new Date().toISOString() } : n) ?? []
    );
  }, [startupId, qc]);

  const scheduleAutoSave = (id: string, title: string, content: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(id, title, content), 1000);
  };

  const newNote = async () => {
    const { data, error } = await supabase.from("team_notes").insert({
      startup_id: startupId, title: "Untitled", content: "", created_by: userId, author_name: userName, pinned: false,
    }).select().maybeSingle();
    if (error) { toast.error("Failed to create note"); return; }
    await refetch();
    if (data) { setActiveNoteId(data.id); setEditTitle("Untitled"); setEditContent(""); }
  };

  const togglePin = async (note: Note) => {
    const { error } = await supabase.from("team_notes").update({ pinned: !note.pinned }).eq("id", note.id);
    if (error) { console.error("[notes] pin failed:", error); toast.error("Could not pin note."); return; }
    refetch();
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("team_notes").delete().eq("id", id);
    if (error) { console.error("[notes] delete failed:", error); toast.error("Could not delete note."); return; }
    if (activeNoteId === id) setActiveNoteId(null);
    refetch();
  };

  const filteredNotes = notes.filter((n) =>
    !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.content ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full" data-testid="notes-section">
      {/* Notes list */}
      <div className="flex flex-col" style={{ width: 260, flexShrink: 0, borderRight: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
        <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full px-3 py-1.5 text-xs outline-none"
            style={{ background: "var(--lcs-white)", border: "1px solid var(--lcs-line)", color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveNoteId(n.id)}
              className="w-full text-left px-3 py-3 transition-colors"
              style={{ borderBottom: "1px solid var(--lcs-line)", background: activeNoteId === n.id ? "var(--lcs-progress-wash)" : "transparent" }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {n.pinned && <Pin className="h-2.5 w-2.5 flex-shrink-0" style={{ color: "var(--lcs-accent)" }} />}
                <span className="text-xs font-semibold truncate" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{n.title}</span>
              </div>
              <div className="text-[10px] flex items-center justify-between" style={{ fontFamily: "var(--font-lcs-data)" }}>
                <span style={{ color: "var(--lcs-ink-muted)" }}>{n.author_name ?? "You"}</span>
                <span style={{ color: "var(--lcs-ink-muted)" }}>{formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}</span>
              </div>
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <div className="px-4 py-8 text-center text-xs" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>No notes</div>
          )}
        </div>
        <div className="px-3 py-3" style={{ borderTop: "1px solid var(--lcs-line)" }}>
          <LcsButton variant="primary" onClick={newNote} className="w-full justify-center" data-testid="new-note-btn">
            <Plus className="h-3 w-3" /> New note
          </LcsButton>
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col" style={{ background: "var(--lcs-white)" }}>
        {activeNote ? (
          <>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
              <input
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); scheduleAutoSave(activeNote.id, e.target.value, editContent); }}
                className="text-base font-semibold bg-transparent outline-none flex-1 mr-4"
                style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}
                placeholder="Note title"
                data-testid="note-title-input"
              />
              <div className="flex items-center gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--lcs-ink-muted)" }} />}
                <button onClick={() => togglePin(activeNote)} title={activeNote.pinned ? "Unpin" : "Pin"}>
                  <Pin className="h-4 w-4" style={{ color: activeNote.pinned ? "var(--lcs-accent)" : "var(--lcs-ink-muted)" }} />
                </button>
                <button onClick={() => deleteNote(activeNote.id)}>
                  <Trash2 className="h-4 w-4" style={{ color: "var(--lcs-attention)" }} />
                </button>
              </div>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => { setEditContent(e.target.value); scheduleAutoSave(activeNote.id, editTitle, e.target.value); }}
              className="flex-1 p-5 text-sm bg-transparent outline-none resize-none"
              style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}
              placeholder="Start writing…"
              data-testid="note-content-input"
            />
            <div className="px-5 py-2 text-[10px]" style={{ color: "var(--lcs-ink-muted)", borderTop: "1px solid var(--lcs-line)", fontFamily: "var(--font-lcs-data)" }}>
              Last updated {formatDistanceToNow(new Date(activeNote.updated_at), { addSuffix: true })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <FileText className="h-8 w-8" style={{ color: "var(--lcs-ink-muted)" }} />
            <div className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Select a note or create a new one</div>
            <LcsButton variant="primary" onClick={newNote} data-testid="empty-state-new-note-btn">
              <Plus className="h-3.5 w-3.5" /> New note
            </LcsButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Activity Section ──────────────────────────────────────────────────────

function ActivitySection({ startupId, userId, isInvestor }: { startupId: string; userId: string; isInvestor: boolean }) {
  const { data: entries = [], isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ["workspace-activity", startupId, userId, isInvestor],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("activity_log")
        .select("id, actor_name, action_type, target_label, detail, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (isInvestor) {
        q = q.eq("actor_user_id", userId);
      } else {
        q = q.eq("account_id", startupId);
      }
      const { data } = await q;
      return (data ?? []) as ActivityEntry[];
    },
  });

  const grouped = groupByDate(entries);

  return (
    <div className="flex-1 overflow-y-auto p-5" style={{ background: "var(--lcs-white)" }} data-testid="activity-feed">
      {isLoading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <LcsEmptyState title="No activity" text="Actions taken across your workspace will appear here." />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{dateLabel}</div>
              <div className="space-y-3">
                {items.map((entry) => {
                  const dot = actionColor(entry.action_type);
                  return (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full" style={{ background: dot }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{entry.actor_name ?? "Someone"}</span>
                        {" "}
                        <span className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                          {entry.action_type.replace(/_/g, " ")}
                          {entry.target_label ? ` — ${entry.target_label}` : ""}
                        </span>
                        {entry.detail && <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{entry.detail}</div>}
                      </div>
                      <div className="text-[10px] flex-shrink-0 mt-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Investor Placeholder ──────────────────────────────────────────────────

function InvestorWorkspaceContent({ userId, section }: { userId: string; section: Section }) {
  if (section === "activity") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
          <Activity className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
          <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>Activity</span>
        </div>
        <ActivitySection startupId="" userId={userId} isInvestor />
      </div>
    );
  }
  const icons: Record<Section, any> = { chat: MessageSquare, tasks: CheckSquare, notes: FileText, activity: Activity };
  const Icon = icons[section];
  const labels: Record<Section, string> = {
    chat: "Team Chat",
    tasks: "Task Board",
    notes: "Shared Notes",
    activity: "Activity",
  };
  const descriptions: Record<Section, string> = {
    chat: "Real-time messaging with your analysts and associates. Add your team first to get started.",
    tasks: "Kanban board for tracking diligence tasks, follow-ups, and deal milestones across your team.",
    notes: "Shared deal notes and research memos. Available once you have team members.",
    activity: "Activity timeline",
  };
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 p-8" style={{ background: "var(--lcs-white)" }}>
      <div style={{ width: 52, height: 52, background: "var(--lcs-progress-wash)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--lcs-line)" }}>
        <Icon className="h-6 w-6" style={{ color: "var(--lcs-accent)" }} />
      </div>
      <div className="text-center max-w-xs">
        <div className="text-sm font-semibold mb-1.5" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{labels[section]}</div>
        <div className="text-xs leading-relaxed" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
          {descriptions[section]}
        </div>
      </div>
      <a href="/app/investor/team" className="inline-block">
        <LcsButton variant="secondary">
          <Users className="h-3.5 w-3.5" />
          Manage team
        </LcsButton>
      </a>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export function WorkspacePage() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("chat");

  const isInvestor = user?.role === "investor";

  // Founder startup ID
  const { data: startupId, isLoading: startupLoading } = useQuery<string | null>({
    queryKey: ["my-startup-id", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data?.id ?? null;
    },
  });

  // Ensure general channel exists for founders
  const { data: channels = [], refetch: refetchChannels } = useQuery<Channel[]>({
    queryKey: ["workspace-channels", startupId],
    enabled: !!startupId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: existing } = await supabase
        .from("team_channels")
        .select("*")
        .eq("startup_id", startupId!)
        .order("created_at", { ascending: true });
      if (existing && existing.length > 0) return existing as Channel[];
      // No channels — create general
      const { data: created, error: chErr } = await supabase.from("team_channels").insert({
        startup_id: startupId!, name: "general", entity_type: "general",
        description: "General team discussion", created_by: user!.id,
      }).select().maybeSingle();
      if (chErr) console.error("[workspace] channel create error:", chErr.code, chErr.message, chErr.details);
      if (created) return [created as Channel];
      return [];
    },
  });

  // Team members for assignee dropdown
  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["workspace-team-members", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_team_accounts")
        .select("user_id, display_name, role")
        .eq("startup_id", startupId!);
      return (data ?? []) as TeamMember[];
    },
  });

  const userName = user?.fullName || user?.email?.split("@")[0] || "You";

  const NAV: { key: Section; label: string; icon: any; badge?: number }[] = [
    { key: "chat",     label: "Chat",     icon: MessageSquare },
    { key: "tasks",    label: "Tasks",    icon: CheckSquare },
    { key: "notes",    label: "Notes",    icon: FileText },
    { key: "activity", label: "Activity", icon: Activity },
  ];

  if (!isInvestor && startupLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--lcs-ink-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ background: "var(--lcs-white)" }}>
      {/* ── Channel / Section list ──────────────────────────────────────── */}
      {/* This 220px internal nav rail is the same structural-fit case as
          subsystem 2's L2/L3 nav and app.settings.tsx's settings tab rail —
          a page with its own internally-navigated sub-sections, which LCS's
          10 primitives have no dedicated pattern for (see PRIMITIVES.md's
          "Nested nav" section). Restyle-only per that precedent — no logic
          change, no new primitive invented. */}
      <div className="flex flex-col" style={{ width: 220, flexShrink: 0, background: "var(--lcs-surface)", borderRight: "1px solid var(--lcs-line)" }}>
        {/* Header */}
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--lcs-line)" }}>
          <div className="font-bold text-sm" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>Workspace</div>
          {!isInvestor && (
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="h-3 w-3" style={{ color: "var(--lcs-ink-muted)" }} />
              <span className="text-[11px]" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
                {teamMembers.length + 1} member{teamMembers.length !== 0 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Navigation sections */}
        <div className="flex-1 overflow-y-auto py-3">
          {/* CHANNELS — only for founders with workspace */}
          {!isInvestor && channels.length > 0 && (
            <div className="mb-4">
              <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Channels</div>
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSection("chat")}
                  className="w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors"
                  style={{
                    background: section === "chat" ? "var(--lcs-progress-wash)" : "transparent",
                    color: section === "chat" ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                    fontFamily: "var(--font-lcs-ui)",
                  }}
                  data-testid={`channel-${ch.name}`}
                >
                  <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Sections */}
          <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>Sections</div>
          {NAV.filter((n) => n.key !== "chat" || isInvestor).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className="w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors"
              style={{
                background: section === key ? "var(--lcs-progress-wash)" : "transparent",
                color: section === key ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                fontFamily: "var(--font-lcs-ui)",
              }}
              data-testid={`nav-${key}`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              {label}
            </button>
          ))}
          {/* Investor chat nav item */}
          {isInvestor && (
            <button
              onClick={() => setSection("chat")}
              className="w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors"
              style={{
                background: section === "chat" ? "var(--lcs-progress-wash)" : "transparent",
                color: section === "chat" ? "var(--lcs-accent)" : "var(--lcs-ink-muted)",
                fontFamily: "var(--font-lcs-ui)",
              }}
              data-testid="nav-chat"
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
              Chat
            </button>
          )}
        </div>
      </div>

      {/* ── Main panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isInvestor ? (
          <InvestorWorkspaceContent userId={user?.id ?? ""} section={section} />
        ) : !startupId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>No startup found. Complete your profile to access the workspace.</div>
          </div>
        ) : section === "chat" ? (
          <ChatSection
            startupId={startupId}
            userId={user?.id ?? ""}
            userName={userName}
            channels={channels}
            onChannelCreated={refetchChannels}
          />
        ) : section === "tasks" ? (
          <TasksSection
            startupId={startupId}
            userId={user?.id ?? ""}
            teamMembers={teamMembers}
          />
        ) : section === "notes" ? (
          <NotesSection
            startupId={startupId}
            userId={user?.id ?? ""}
            userName={userName}
          />
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--lcs-line)", background: "var(--lcs-surface)" }}>
              <Activity className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />
              <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-lcs-ui)", color: "var(--lcs-ink)" }}>Activity</span>
            </div>
            <ActivitySection startupId={startupId} userId={user?.id ?? ""} isInvestor={false} />
          </div>
        )}
      </div>
    </div>
  );
}

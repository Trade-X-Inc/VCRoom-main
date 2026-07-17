import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, Pin, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageFrame, EmptyState } from "@/components/system";
import { cn } from "@/lib/utils";

// R9 (c) — Deal Rooms › Deal Prep Notes. Team-authored notes for tracking
// multiple deals, taken OUTSIDE any specific room — distinct from
// deal_room_notes (room-scoped, §9.6-restricted content). Reuses the
// existing team_notes table/RLS (same shape as Team Chat's Notes section)
// with startup_id or investor_profile_id set, never both, never a
// deal_room_id (that's a different, room-scoped note).
export const Route = createFileRoute("/app/deal-rooms/prep-notes")({
  component: FounderPrepNotes,
});

interface Note {
  id: string;
  title: string;
  content: string | null;
  created_by: string;
  author_name: string | null;
  pinned: boolean;
  updated_at: string;
}

function FounderPrepNotes() {
  const { user } = useAuth();
  const { data: startup } = useQuery({
    queryKey: ["prep-notes-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("id").eq("founder_id", user!.id).maybeSingle();
      return data;
    },
  });

  return (
    <PrepNotesBase
      ownerKey="startup_id"
      ownerId={startup?.id ?? null}
      breadcrumb={[{ label: "Deal Rooms" }, { label: "Deal Prep Notes" }]}
    />
  );
}

export function PrepNotesBase({
  ownerKey,
  ownerId,
  breadcrumb,
}: {
  ownerKey: "startup_id" | "investor_profile_id";
  ownerId: string | null;
  breadcrumb: { label: string }[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: notes = [], isLoading, refetch } = useQuery<Note[]>({
    queryKey: ["deal-prep-notes", ownerKey, ownerId],
    enabled: !!ownerId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("team_notes")
        .select("id, title, content, created_by, author_name, pinned, updated_at")
        .eq(ownerKey, ownerId!)
        .is("deal_room_id", null)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      return (data ?? []) as Note[];
    },
  });

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title);
      setEditContent(activeNote.content ?? "");
    }
  }, [activeNoteId]);

  const autoSave = useCallback(async (id: string, title: string, content: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("team_notes")
      .update({ title: title || "Untitled", content, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[prep-notes] autosave failed:", error);
      toast.error("Note not saved — check your connection.");
      setSaving(false);
      return;
    }
    setSaving(false);
    qc.setQueryData<Note[]>(["deal-prep-notes", ownerKey, ownerId], (prev) =>
      prev?.map((n) => (n.id === id ? { ...n, title: title || "Untitled", content, updated_at: new Date().toISOString() } : n)) ?? [],
    );
  }, [ownerKey, ownerId, qc]);

  const scheduleAutoSave = (id: string, title: string, content: string) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => autoSave(id, title, content), 1000);
  };

  const newNote = async () => {
    if (!ownerId || !user?.id) return;
    const { data, error } = await supabase
      .from("team_notes")
      .insert({
        [ownerKey]: ownerId,
        title: "Untitled",
        content: "",
        created_by: user.id,
        author_name: user.fullName || user.email || "You",
        pinned: false,
      })
      .select()
      .maybeSingle();
    if (error) {
      toast.error("Failed to create note");
      return;
    }
    await refetch();
    if (data) {
      setActiveNoteId(data.id);
      setEditTitle("Untitled");
      setEditContent("");
    }
  };

  const togglePin = async (note: Note) => {
    const { error } = await supabase.from("team_notes").update({ pinned: !note.pinned }).eq("id", note.id);
    if (error) {
      toast.error("Could not pin note.");
      return;
    }
    refetch();
  };

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await supabase.from("team_notes").delete().eq("id", id);
    if (error) {
      toast.error("Could not delete note.");
      return;
    }
    if (activeNoteId === id) setActiveNoteId(null);
    refetch();
  };

  const summarize = async () => {
    if (!activeNote || !editContent.trim() || !user?.id) return;
    setSummarizing(true);
    try {
      const { secureAICall } = await import("@/lib/ai-secure-fn");
      const result = await secureAICall({
        data: {
          userId: user.id,
          systemPrompt: "Summarize these deal-prep notes into 3-5 concise bullet points covering the key facts and open questions. Plain text, no markdown headers.",
          userMessage: editContent,
          maxTokens: 300,
        },
      });
      if (result.error) {
        toast.error(result.reply);
        return;
      }
      const next = `${editContent}\n\n— AI summary —\n${result.reply}`;
      setEditContent(next);
      scheduleAutoSave(activeNote.id, editTitle, next);
    } catch {
      toast.error("Summary failed — try again.");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <PageFrame
      breadcrumb={breadcrumb}
      title="Deal Prep Notes"
      description="Your own notes for tracking multiple deals — visible to your team, separate from any single deal room."
      actions={
        ownerId ? (
          <button
            onClick={newNote}
            className="inline-flex items-center gap-1.5 rounded-md hs-gradient text-brand-foreground px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New note
          </button>
        ) : undefined
      }
    >
      {isLoading ? (
        <EmptyState kind="loading" title="Loading" />
      ) : !ownerId ? (
        <EmptyState kind="empty" title="Set up your profile first" />
      ) : notes.length === 0 ? (
        <EmptyState kind="empty" title="No notes yet" action={{ label: "New note", onClick: newNote }} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-none border border-border/60 bg-card divide-y divide-border/60 overflow-hidden">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveNoteId(n.id)}
                className={cn(
                  "w-full text-left px-4 py-3 transition-colors",
                  activeNoteId === n.id ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {n.pinned && <Pin className="h-3 w-3 text-brand shrink-0" />}
                  <span className="text-sm font-medium truncate">{n.title}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {n.author_name ?? "Unknown"} · {new Date(n.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-none border border-border/60 bg-card p-5">
            {!activeNote ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <StickyNote className="h-4 w-4" /> Select a note to edit.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    value={editTitle}
                    onChange={(e) => {
                      setEditTitle(e.target.value);
                      scheduleAutoSave(activeNote.id, e.target.value, editContent);
                    }}
                    className="flex-1 bg-transparent text-sm font-semibold outline-none"
                    placeholder="Untitled"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    <button onClick={() => togglePin(activeNote)} className="p-1.5 rounded-md hover:bg-accent" title="Pin">
                      <Pin className={cn("h-3.5 w-3.5", activeNote.pinned ? "text-brand" : "text-muted-foreground")} />
                    </button>
                    <button onClick={summarize} disabled={summarizing} className="p-1.5 rounded-md hover:bg-accent disabled:opacity-50" title="AI summarize">
                      {summarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-brand" />}
                    </button>
                    <button onClick={() => deleteNote(activeNote.id)} className="p-1.5 rounded-md hover:bg-accent" title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    scheduleAutoSave(activeNote.id, editTitle, e.target.value);
                  }}
                  rows={16}
                  className="w-full bg-transparent text-sm outline-none resize-none"
                  placeholder="Start typing…"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </PageFrame>
  );
}

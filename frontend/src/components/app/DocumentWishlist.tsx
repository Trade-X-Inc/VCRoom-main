import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Plus, X, CheckCircle2, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  dealRoomId: string;
  isInvestor: boolean;
  isFounder: boolean;
  userId: string | undefined;
}

export function DocumentWishlist({ dealRoomId, isInvestor, isFounder, userId }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["doc-wishlist", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_requests")
        .select("id, title, description, status, created_at, requested_by")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const handleAdd = async () => {
    if (!title.trim() || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("document_requests").insert({
        deal_room_id: dealRoomId,
        requested_by: userId,
        for_user_id: userId,
        title: title.trim(),
        status: "pending",
      });
      if (error) throw error;
      toast.success("Document added to wishlist");
      setTitle("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleFulfill = async (id: string) => {
    const { error } = await supabase
      .from("document_requests")
      .update({ status: "fulfilled" })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as uploaded");
    qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("document_requests")
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
  };

  const pending = requests.filter((r: any) => r.status === "pending");
  const fulfilled = requests.filter((r: any) => r.status === "fulfilled");

  if (requests.length === 0 && !isInvestor) return null;

  return (
    <div className="mb-4 rounded-xl border border-brand/20 bg-brand/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand/10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold">Documents needed</span>
          {pending.length > 0 && (
            <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">
              {pending.length} pending
            </span>
          )}
        </div>
        {isInvestor && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add request
          </button>
        )}
      </div>

      {adding && (
        <div className="px-4 py-3 border-b border-brand/10 bg-background/50 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Audited financials 2024, Cap table, Customer contracts…"
            autoFocus
            className="flex-1 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-brand/50"
          />
          <button
            onClick={handleAdd}
            disabled={!title.trim() || saving}
            className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => { setAdding(false); setTitle(""); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          No documents requested yet. Click "Add request" to specify what you need.
        </div>
      ) : (
        <div className="divide-y divide-brand/10">
          {pending.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <Clock className="h-3.5 w-3.5 text-warning shrink-0" />
              <span className="flex-1 text-sm">{r.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
              </span>
              {isFounder && (
                <button
                  onClick={() => handleFulfill(r.id)}
                  className="text-[10px] text-success hover:underline"
                >
                  Mark uploaded
                </button>
              )}
              {isInvestor && (
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {fulfilled.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 opacity-60">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="flex-1 text-sm line-through text-muted-foreground">{r.title}</span>
              <span className="text-[10px] text-success">Uploaded</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

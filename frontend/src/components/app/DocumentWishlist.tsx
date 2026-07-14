import { useState, useRef } from "react";

const ALLOWED_EXTENSIONS = new Set(["pdf","pptx","ppt","xlsx","xls","docx","doc","csv","png","jpg","jpeg"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Plus, X, CheckCircle2, ClipboardList, ChevronDown, ChevronUp,
  AlertTriangle, Link2, Upload, Loader2, Flag
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  dealRoomId: string;
  isInvestor: boolean;
  isFounder: boolean;
  userId: string | undefined;
}

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "text-destructive bg-destructive/10 border-destructive/30" },
  medium: { label: "Medium", color: "text-warning bg-warning/10 border-warning/30" },
  low:    { label: "Low",    color: "text-muted-foreground bg-muted border-border/60" },
} as const;

const SUGGESTED_REQUESTS = [
  { title: "Audited financials (last 2 years)", priority: "high" },
  { title: "Cap table (current + fully diluted)", priority: "high" },
  { title: "Revenue projections (3-year model)", priority: "high" },
  { title: "Pitch deck (latest version)", priority: "medium" },
  { title: "Product roadmap", priority: "medium" },
  { title: "Customer references / case studies", priority: "medium" },
  { title: "Founder CVs / LinkedIn profiles", priority: "low" },
  { title: "TAM/SAM/SOM market analysis", priority: "low" },
  { title: "Certificate of incorporation", priority: "low" },
] as const;

export function DocumentWishlist({ dealRoomId, isInvestor, isFounder, userId }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Per-request link response state (founder can respond with a link)
  const [linkInputId, setLinkInputId] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [savingLink, setSavingLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ["doc-wishlist", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("document_requests")
        .select("id, title, description, status, priority, response_link, created_at, requested_by")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const handleAdd = async (t?: string, p?: string) => {
    const finalTitle = (t ?? title).trim();
    const finalPriority = (p ?? priority) as "high" | "medium" | "low";
    if (!finalTitle || !userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("document_requests").insert({
        deal_room_id: dealRoomId,
        requested_by: userId,
        for_user_id: userId,
        title: finalTitle,
        description: description.trim() || null,
        priority: finalPriority,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Document requested");
      setTitle(""); setDescription(""); setAdding(false); setShowSuggested(false);
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const handleFulfill = async (id: string) => {
    const { error } = await supabase.from("document_requests").update({ status: "fulfilled" }).eq("id", id);
    if (error) { console.error("[wishlist] fulfill failed:", error); toast.error("Could not update request."); return; }
    toast.success("Marked as uploaded");
    qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
  };

  const handleSaveLink = async (id: string) => {
    if (!linkValue.trim()) return;
    setSavingLink(true);
    const { error } = await supabase.from("document_requests")
      .update({ response_link: linkValue.trim(), status: "fulfilled" })
      .eq("id", id);
    if (error) { toast.error(error.message); } else {
      toast.success("Link saved and request marked fulfilled");
      setLinkInputId(null); setLinkValue("");
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
    }
    setSavingLink(false);
  };

  const handleUploadForRequest = async (id: string, file: File) => {
    if (!userId) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) { toast.error(`${file.name}: file type not allowed`); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name}: exceeds 50 MB limit`); return; }
    setUploadingId(id);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${dealRoomId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const req = (requests as any[]).find((r) => r.id === id);
      const { error: docErr } = await supabase.from("documents").insert({
        deal_room_id: dealRoomId,
        uploader_id: userId,
        category: "Other",
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
      });
      if (docErr) throw docErr;
      const { error: reqErr } = await supabase.from("document_requests").update({ status: "fulfilled" }).eq("id", id);
      if (reqErr) throw reqErr;
      qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["documents", dealRoomId] });
      toast.success(`${file.name} uploaded and request fulfilled`);
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploadingId(null); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("document_requests").delete().eq("id", id);
    if (error) { console.error("[wishlist] delete failed:", error); toast.error("Could not delete request."); return; }
    qc.invalidateQueries({ queryKey: ["doc-wishlist", dealRoomId] });
  };

  const pending   = (requests as any[]).filter((r) => r.status === "pending");
  const fulfilled = (requests as any[]).filter((r) => r.status === "fulfilled");

  if (requests.length === 0 && !isInvestor) return null;

  return (
    <div className="mb-5 rounded-xl border border-brand/25 bg-accent overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand/15">
        <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setCollapsed((v) => !v)}>
          <ClipboardList className="h-4 w-4 text-brand shrink-0" />
          <span className="text-sm font-semibold">Documents needed</span>
          {pending.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/20 text-warning px-2 py-0.5 text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-warning inline-block animate-pulse" />
              {pending.length} pending
            </span>
          )}
          {fulfilled.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">{fulfilled.length} fulfilled</span>
          )}
          {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />}
        </button>
        {isInvestor && !adding && !collapsed && (
          <div className="flex items-center gap-1.5 ml-3">
            <button
              onClick={() => setShowSuggested((v) => !v)}
              className="text-[10px] text-muted-foreground hover:text-brand border border-border/60 rounded-md px-2 py-1"
            >
              Quick add
            </button>
            <button
              onClick={() => { setAdding(true); setShowSuggested(false); }}
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Custom
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Quick add suggestions */}
          {showSuggested && isInvestor && (
            <div className="px-4 py-3 border-b border-brand/15 bg-background/50">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Common requests — click to add</div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_REQUESTS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleAdd(s.title, s.priority)}
                    disabled={saving}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:opacity-80 transition-opacity disabled:opacity-40",
                      PRIORITY_CONFIG[s.priority].color
                    )}
                  >
                    <Flag className="h-2.5 w-2.5" /> {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom add form */}
          {adding && (
            <div className="px-4 py-3 border-b border-brand/15 bg-background/60 space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
                placeholder="Document name (e.g. Audited financials 2024)"
                autoFocus
                className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-brand/50"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note for the founder…"
                className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:border-brand/50"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Priority:</span>
                {(["high", "medium", "low"] as const).map((p) => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all", priority === p ? PRIORITY_CONFIG[p].color : "border-border/60 text-muted-foreground hover:bg-accent")}
                  >
                    {PRIORITY_CONFIG[p].label}
                  </button>
                ))}
                <div className="flex-1" />
                <button onClick={() => { setAdding(false); setTitle(""); setDescription(""); }}
                  className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                <button onClick={() => handleAdd()} disabled={!title.trim() || saving}
                  className="rounded-md hs-gradient text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50 inline-flex items-center gap-1">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {requests.length === 0 && (
            <div className="px-4 py-4 text-xs text-muted-foreground">
              {isInvestor
                ? "Request specific documents from the founder. They'll be notified and can upload files or share links directly in response."
                : "The investor hasn't requested any specific documents yet."}
            </div>
          )}

          {/* Hidden file input for upload-per-request */}
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && uploadingId) handleUploadForRequest(uploadingId, file);
              e.target.value = "";
            }}
          />

          {/* Pending requests */}
          {pending.length > 0 && (
            <div className="divide-y divide-brand/10">
              {pending.map((r: any) => (
                <div key={r.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="relative flex h-2 w-2 shrink-0 mt-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{r.title}</span>
                        {r.priority && (
                          <span className={cn("text-[9px] rounded-full border px-1.5 py-0.5 font-semibold", PRIORITY_CONFIG[r.priority as keyof typeof PRIORITY_CONFIG]?.color ?? "")}>
                            {PRIORITY_CONFIG[r.priority as keyof typeof PRIORITY_CONFIG]?.label ?? r.priority}
                          </span>
                        )}
                      </div>
                      {r.description && <p className="text-[11px] text-muted-foreground mt-0.5">{r.description}</p>}
                    </div>
                    {isInvestor && (
                      <button onClick={() => handleDelete(r.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Founder response options */}
                  {isFounder && (
                    <div className="ml-5 flex items-center gap-2 flex-wrap">
                      {linkInputId === r.id ? (
                        <div className="flex-1 flex gap-2">
                          <input
                            value={linkValue}
                            onChange={(e) => setLinkValue(e.target.value)}
                            placeholder="Paste Google Drive / DocSend / Dropbox link…"
                            autoFocus
                            className="flex-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs focus:outline-none focus:border-brand/50"
                            onKeyDown={(e) => e.key === "Enter" && handleSaveLink(r.id)}
                          />
                          <button onClick={() => handleSaveLink(r.id)} disabled={!linkValue.trim() || savingLink}
                            className="rounded-md hs-gradient text-brand-foreground px-2.5 py-1 text-[10px] disabled:opacity-50">
                            {savingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                          </button>
                          <button onClick={() => { setLinkInputId(null); setLinkValue(""); }}
                            className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => { setLinkInputId(r.id); setLinkValue(""); }}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-[10px] hover:bg-accent"
                          >
                            <Link2 className="h-3 w-3" /> Share link
                          </button>
                          <button
                            onClick={() => { setUploadingId(r.id); fileRef.current?.click(); }}
                            disabled={uploadingId === r.id}
                            className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-[10px] hover:bg-accent disabled:opacity-50"
                          >
                            {uploadingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Upload file
                          </button>
                          <button onClick={() => handleFulfill(r.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-success hover:underline">
                            <CheckCircle2 className="h-3 w-3" /> Mark uploaded
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fulfilled requests */}
          {fulfilled.length > 0 && (
            <div className="divide-y divide-brand/10">
              {fulfilled.map((r: any) => (
                <div key={r.id} className="flex items-start gap-3 px-4 py-2.5 opacity-60">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm line-through text-muted-foreground">{r.title}</span>
                    {r.response_link && (
                      <a href={r.response_link} target="_blank" rel="noopener noreferrer"
                        className="block text-[10px] text-brand hover:underline truncate mt-0.5">
                        ↗ {r.response_link}
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] text-success shrink-0">Fulfilled</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
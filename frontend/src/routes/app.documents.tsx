import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, Upload, CheckCircle2, AlertTriangle,
  Download, Trash2, Loader2, LayoutGrid, List,
  File, Table2, Image, Video, X, Plus,
} from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/documents")({
  component: Documents,
});

const CATEGORIES = [
  "Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Product", "Other",
] as const;
type DocCategory = (typeof CATEGORIES)[number];

const TAB_LABELS = ["All", ...CATEGORIES] as const;

type ViewMode = "list" | "grid";

const CAT_COLOR: Record<string, string> = {
  "Pitch Deck":      "bg-brand/10 text-brand",
  "Financials":      "bg-success/10 text-success",
  "Legal":           "bg-destructive/10 text-destructive",
  "Market Research": "bg-violet/10 text-violet",
  "Team":            "bg-warning/10 text-warning",
  "Product":         "bg-brand/15 text-brand",
  "Other":           "bg-muted text-muted-foreground",
};

function getFileIconProps(fileName: string): { Icon: any; colorCls: string } {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return { Icon: FileText, colorCls: "text-red-500" };
  if (["pptx", "ppt", "key"].includes(ext)) return { Icon: FileText, colorCls: "text-orange-500" };
  if (["xlsx", "xls", "csv"].includes(ext)) return { Icon: Table2, colorCls: "text-green-600" };
  if (["doc", "docx"].includes(ext)) return { Icon: FileText, colorCls: "text-blue-500" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return { Icon: Image, colorCls: "text-purple-500" };
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return { Icon: Video, colorCls: "text-pink-500" };
  return { Icon: File, colorCls: "text-muted-foreground" };
}

function DocIcon({ fileName, size = "md" }: { fileName: string; size?: "sm" | "md" | "lg" }) {
  const { Icon, colorCls } = getFileIconProps(fileName);
  const cls = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  return <Icon className={cn(cls, colorCls, "shrink-0")} />;
}

function Documents() {
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addRoomDocId, setAddRoomDocId] = useState<string | null>(null);
  const [addRoomId, setAddRoomId] = useState("");
  const [addingRoom, setAddingRoom] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, category, status, storage_path, file_name, file_size, created_at, deal_room_id")
        .eq("uploader_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dealRooms = [] } = useQuery({
    queryKey: ["founder-deal-rooms-docs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("id, startups(company_name)")
        .eq("founder_id", user!.id)
        .limit(20);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.startups?.company_name ?? r.id,
      }));
    },
  });

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: docs.length };
    for (const d of docs) {
      const key = (d.category as string) || "Other";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [docs]);

  const filtered = activeTab === "All"
    ? docs
    : docs.filter((d) => ((d.category as string) || "Other") === activeTab);

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) {
      toast.error(error?.message || "Unable to create download link.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (deletingId !== id) { setDeletingId(id); return; }
    setDeletingId(null);
    await supabase.storage.from("documents").remove([storagePath]);
    const { error } = await supabase.from("documents").delete().eq("id", id).eq("uploader_id", user!.id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["documents", user?.id] });
    toast.success("Document deleted");
  };

  const handleAddToRoom = async () => {
    if (!addRoomDocId || !addRoomId) return;
    setAddingRoom(true);
    const { error } = await supabase
      .from("documents")
      .update({ deal_room_id: addRoomId })
      .eq("id", addRoomDocId);
    if (error) toast.error(error.message);
    else {
      toast.success("Added to deal room");
      queryClient.invalidateQueries({ queryKey: ["documents", user?.id] });
    }
    setAddRoomDocId(null);
    setAddRoomId("");
    setAddingRoom(false);
  };

  const preSelectCategory = (activeTab === "All" ? "Pitch Deck" : activeTab) as DocCategory;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <div className="text-sm text-muted-foreground">
            {docs.length} file{docs.length !== 1 ? "s" : ""} · access controlled
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border/60 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={cn("grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors", viewMode === "list" && "bg-accent text-foreground")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn("grid h-7 w-7 place-items-center rounded text-muted-foreground transition-colors", viewMode === "grid" && "bg-accent text-foreground")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Upload className="h-4 w-4" /> Upload document
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-0.5 border-b border-border/60">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab
                ? "border-brand text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
            {tabCounts[tab] !== undefined && (
              <span className={cn("ml-1.5 text-xs", activeTab === tab ? "text-brand" : "text-muted-foreground/60")}>
                {tabCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
                <div className="h-9 w-9 rounded-md bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-card py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <div className="text-sm font-medium">
              {activeTab === "All" ? "No documents yet" : `No files in ${activeTab}`}
            </div>
            <div className="text-xs text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
              {activeTab === "All"
                ? "Upload your pitch deck and data room documents to share with investors"
                : `Upload your ${activeTab.toLowerCase()} documents here.`}
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
            >
              <Upload className="h-4 w-4" /> Upload now
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((d) => {
              const fname = (d.file_name as string) || "";
              return (
                <div key={d.id} className="group rounded-xl border border-border/60 bg-card p-4 hover:shadow-card transition-shadow flex flex-col gap-3">
                  <div className="flex items-center justify-center h-16">
                    <DocIcon fileName={fname} size="lg" />
                  </div>
                  <div>
                    <div className="text-sm font-medium truncate" title={fname}>
                      {fname.length > 24 ? fname.slice(0, 24) + "…" : fname || "Untitled"}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", CAT_COLOR[(d.category as string) || "Other"])}>
                        {(d.category as string) || "Other"}
                      </span>
                      {d.status === "uploaded"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 flex items-center justify-between">
                    <span>{d.created_at ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true }) : "—"}</span>
                    <span>{Math.max(1, Math.round((Number(d.file_size) || 0) / 1024))} KB</span>
                  </div>
                  <div className="flex gap-1 pt-1 border-t border-border/40">
                    <button
                      onClick={() => handleDownload(d.storage_path as string)}
                      title="Download"
                      className="flex-1 grid place-items-center h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {dealRooms.length > 0 && (
                      <button
                        onClick={() => { setAddRoomDocId(d.id as string); setAddRoomId(""); }}
                        title="Add to deal room"
                        className="flex-1 grid place-items-center h-7 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                      title={deletingId === d.id ? "Click again to confirm" : "Delete"}
                      className={cn(
                        "flex-1 grid place-items-center h-7 rounded-md transition-colors",
                        deletingId === d.id
                          ? "text-destructive bg-destructive/10"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="col-span-5">Name</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Uploaded</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {filtered.map((d) => {
              const fname = (d.file_name as string) || "";
              return (
                <div
                  key={d.id}
                  className="grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group"
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <DocIcon fileName={fname} size="sm" />
                    <div className="min-w-0">
                      <div className="font-medium truncate" title={fname}>{fname || "Untitled"}</div>
                      {d.status === "uploaded"
                        ? <span className="text-[10px] text-success flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" />Uploaded</span>
                        : <span className="text-[10px] text-warning flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />Review needed</span>}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", CAT_COLOR[(d.category as string) || "Other"])}>
                      {(d.category as string) || "Other"}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {Math.max(1, Math.round((Number(d.file_size) || 0) / 1024))} KB
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {d.created_at ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true }) : "—"}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleDownload(d.storage_path as string)}
                      title="Download"
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {dealRooms.length > 0 && (
                      <button
                        onClick={() => { setAddRoomDocId(d.id as string); setAddRoomId(""); }}
                        title="Add to deal room"
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                      title={deletingId === d.id ? "Click again to confirm delete" : "Delete"}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                        deletingId === d.id
                          ? "text-destructive"
                          : "text-muted-foreground hover:text-destructive",
                      )}
                    >
                      {deletingId === d.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          userId={user!.id}
          initialCategory={preSelectCategory}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            queryClient.invalidateQueries({ queryKey: ["documents", user?.id] });
            setShowUpload(false);
          }}
        />
      )}

      {/* Add to deal room modal */}
      {addRoomDocId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
          onClick={() => setAddRoomDocId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-elev p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Add to deal room</h3>
              <button onClick={() => setAddRoomDocId(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <select
              value={addRoomId}
              onChange={(e) => setAddRoomId(e.target.value)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 mb-4"
            >
              <option value="">Select deal room…</option>
              {dealRooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setAddRoomDocId(null)}
                className="flex-1 rounded-md border border-border/60 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToRoom}
                disabled={!addRoomId || addingRoom}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm shadow-glow disabled:opacity-50"
              >
                {addingRoom && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add to room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadModal({
  userId,
  initialCategory,
  onClose,
  onUploaded,
}: {
  userId: string;
  initialCategory: DocCategory;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<DocCategory>(initialCategory);
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB.");
      return;
    }
    setFile(f);
    if (!docName) setDocName(f.name);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `personal/${userId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from("documents").insert({
        uploader_id: userId,
        category,
        status: "uploaded",
        storage_path: path,
        file_name: docName || file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        description: description || null,
        deal_room_id: null,
      });
      if (insertErr) throw insertErr;
      toast.success("Document uploaded");
      onUploaded();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-elev overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="text-base font-semibold">Upload document</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocCategory)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* File input */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">File *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                "rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
                file
                  ? "border-brand/50 bg-brand/5"
                  : "border-border/60 bg-muted/20 hover:border-brand/40 hover:bg-accent/20",
              )}
            >
              {file ? (
                <div>
                  <CheckCircle2 className="h-6 w-6 text-success mx-auto mb-2" />
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {Math.round(file.size / 1024)} KB
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setDocName(""); }}
                    className="mt-2 text-xs text-muted-foreground hover:text-destructive underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <div className="text-sm font-medium">Click to select file</div>
                  <div className="text-xs text-muted-foreground mt-0.5">All file types · max 50MB</div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Document name */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Document name</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Auto-filled from filename"
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document"
              className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Upload</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

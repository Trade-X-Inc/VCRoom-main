import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, Upload, CheckCircle2, AlertTriangle,
  Download, Trash2, Loader2, LayoutGrid, List,
} from "lucide-react";
import { Dropzone, type UploadedFile } from "@/components/app/Dropzone";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/documents")({
  component: Documents,
});

const CATEGORIES = ["Pitch Deck", "Financials", "Legal", "Market Research", "Team", "Other"] as const;
type DocCategory = (typeof CATEGORIES)[number];

type ViewMode = "list" | "grid";

function fileInfo(fileName: string): { label: string; bg: string; text: string } {
  const ext = (fileName.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return { label: "PDF", bg: "bg-red-500/10", text: "text-red-500" };
  if (["pptx", "ppt", "key"].includes(ext)) return { label: "PPT", bg: "bg-orange-500/10", text: "text-orange-500" };
  if (["xlsx", "xls", "csv"].includes(ext)) return { label: "XLS", bg: "bg-green-600/10", text: "text-green-600" };
  if (["doc", "docx"].includes(ext)) return { label: "DOC", bg: "bg-blue-500/10", text: "text-blue-500" };
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return { label: "IMG", bg: "bg-purple-500/10", text: "text-purple-500" };
  if (["zip", "tar", "gz"].includes(ext)) return { label: "ZIP", bg: "bg-yellow-600/10", text: "text-yellow-600" };
  return { label: (ext.toUpperCase() || "FILE"), bg: "bg-muted", text: "text-muted-foreground" };
}

function FileIcon({ fileName, size = "md" }: { fileName: string; size?: "sm" | "md" | "lg" }) {
  const { label, bg, text } = fileInfo(fileName);
  const cls = size === "sm" ? "h-8 w-8 text-[9px]" : size === "lg" ? "h-14 w-14 text-xs" : "h-9 w-9 text-[10px]";
  return (
    <div className={cn("grid place-items-center rounded-md font-bold shrink-0", cls, bg, text)}>
      {label}
    </div>
  );
}

const TAB_LABELS = ["All", ...CATEGORIES] as const;

function Documents() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>("Pitch Deck");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, category, status, storage_path, file_name, file_size, created_at")
        .eq("uploader_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
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

  const onFiles = async (incoming: UploadedFile[]) => {
    if (!user) return;
    for (const f of incoming) {
      const file = (f as UploadedFile & { rawFile?: File }).rawFile;
      if (!file) continue;
      const path = `personal/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true });
      if (uploadErr) { toast.error(uploadErr.message); return; }
      const { error: insertErr } = await supabase.from("documents").insert({
        uploader_id: user.id,
        category: selectedCategory,
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
        deal_room_id: null,
      });
      if (insertErr) { toast.error(insertErr.message); return; }
    }
    queryClient.invalidateQueries({ queryKey: ["documents", user.id] });
    toast.success("Document uploaded");
    setShowUpload(false);
  };

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600);
    if (error || !data?.signedUrl) { toast.error(error?.message || "Unable to create download link."); return; }
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("app.documents")}</h1>
          <div className="text-sm text-muted-foreground">{docs.length} file{docs.length !== 1 ? "s" : ""} · access controlled</div>
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
            onClick={() => setShowUpload((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Upload className="h-4 w-4" /> {t("docs.upload")}
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="mt-5 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs border transition-colors",
                  selectedCategory === cat
                    ? "bg-brand text-brand-foreground border-brand"
                    : "border-border/60 text-muted-foreground hover:bg-accent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <Dropzone title={t("docs.dragOr")} hint={t("docs.maxSize")} onFiles={onFiles} />
        </div>
      )}

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
                : "border-transparent text-muted-foreground hover:text-foreground"
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
            <div className="text-xs text-muted-foreground mt-1 mb-4">
              {activeTab === "All"
                ? "Upload pitch decks, financials, legal docs and more."
                : `Upload your ${activeTab.toLowerCase()} documents here.`}
            </div>
            <button
              onClick={() => { setSelectedCategory(activeTab === "All" ? "Pitch Deck" : activeTab as DocCategory); setShowUpload(true); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
            >
              <Upload className="h-4 w-4" /> Upload now
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((d) => (
              <div key={d.id} className="group rounded-xl border border-border/60 bg-card p-4 hover:shadow-card transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <FileIcon fileName={(d.file_name as string) || ""} size="lg" />
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(d.storage_path as string)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                      title={deletingId === d.id ? "Click again to confirm" : "Delete"}
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-md transition-colors",
                        deletingId === d.id
                          ? "text-destructive bg-destructive/10"
                          : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-sm font-medium truncate" title={(d.file_name as string) || "Untitled"}>
                  {(d.file_name as string) || "Untitled"}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {Math.max(1, Math.round((Number(d.file_size) || 0) / 1024))} KB
                  </span>
                  {d.status === "uploaded"
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground/60">
                  {d.created_at ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true }) : "—"}
                </div>
              </div>
            ))}
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
            {filtered.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <FileIcon fileName={(d.file_name as string) || ""} size="sm" />
                  <div className="min-w-0">
                    <div className="font-medium truncate" title={(d.file_name as string) || "Untitled"}>
                      {(d.file_name as string) || "Untitled"}
                    </div>
                    {d.status === "uploaded"
                      ? <span className="text-[10px] text-success flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" />Uploaded</span>
                      : <span className="text-[10px] text-warning flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />Review needed</span>}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                    {(d.category as string) || "Other"}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {Math.max(1, Math.round((Number(d.file_size) || 0) / 1024))} KB
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {d.created_at
                    ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true })
                    : "—"}
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleDownload(d.storage_path as string)}
                    title="Download"
                    className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                    title={deletingId === d.id ? "Click again to confirm delete" : "Delete"}
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity",
                      deletingId === d.id
                        ? "text-destructive"
                        : "text-muted-foreground hover:text-destructive"
                    )}
                  >
                    {deletingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

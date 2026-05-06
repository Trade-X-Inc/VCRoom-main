import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, FolderOpen, Upload, CheckCircle2, AlertTriangle,
  Eye, Download, Trash2, Loader2,
} from "lucide-react";
import { Dropzone, type UploadedFile } from "@/components/app/Dropzone";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/documents")({
  component: Documents,
});

const CATEGORIES = ["Pitch", "Financial", "Legal", "Technical", "Market", "Other"] as const;
type DocCategory = (typeof CATEGORIES)[number];

function Documents() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>("Pitch");
  const [activeFolder, setActiveFolder] = useState("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const folders = useMemo(() => {
    const counts = docs.reduce<Record<string, number>>((acc, d) => {
      const key = (d.category as string) || "Other";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return [["All", docs.length], ...Object.entries(counts)] as [string, number][];
  }, [docs]);

  const filtered = activeFolder === "All"
    ? docs
    : docs.filter((d) => ((d.category as string) || "Other") === activeFolder);

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
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("app.documents")}</h1>
          <div className="text-sm text-muted-foreground">{docs.length} files · access controlled</div>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
        >
          <Upload className="h-4 w-4" /> {t("docs.upload")}
        </button>
      </div>

      {showUpload && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Category:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                  selectedCategory === cat
                    ? "bg-brand text-brand-foreground border-brand"
                    : "border-border/60 text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <Dropzone title={t("docs.dragOr")} hint={t("docs.maxSize")} onFiles={onFiles} />
        </div>
      )}

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-5">
        <aside className="space-y-1">
          {folders.map(([n, c], i) => (
            <button
              key={n}
              onClick={() => setActiveFolder(n)}
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                activeFolder === n
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> {n}
              </span>
              <span className="text-xs text-muted-foreground">{c}</span>
            </button>
          ))}
        </aside>

        <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div className="col-span-5">Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Uploaded</div>
            <div className="col-span-2">Views</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {isLoading ? (
            <div className="space-y-0">
              {[1, 2, 3].map((n) => (
                <div key={n} className="grid grid-cols-12 px-5 py-3 border-b border-border/60 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="col-span-7 h-4 w-24 rounded bg-muted/60 animate-pulse" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <div className="text-sm text-muted-foreground">
                {activeFolder === "All" ? "No documents yet — upload your first file." : `No files in ${activeFolder}.`}
              </div>
            </div>
          ) : (
            filtered.map((d) => (
              <div
                key={d.id}
                className="grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0">
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{(d.file_name as string) || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.max(1, Math.round((Number(d.file_size) || 0) / 1024))} KB
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                    {(d.category as string) || "Other"}
                  </span>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {d.created_at
                    ? formatDistanceToNow(new Date(d.created_at as string), { addSuffix: true })
                    : "—"}
                </div>
                <div className="col-span-2 text-muted-foreground inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> —
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1.5">
                  {d.status === "uploaded" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" title="Uploaded" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" title="Review needed" />
                  )}
                  <button
                    onClick={() => handleDownload(d.storage_path as string)}
                    title="Download"
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id as string, d.storage_path as string)}
                    title={deletingId === d.id ? "Click again to confirm delete" : "Delete"}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                      deletingId === d.id
                        ? "text-destructive"
                        : "text-muted-foreground hover:text-destructive"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

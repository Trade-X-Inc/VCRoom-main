import { createFileRoute } from "@tanstack/react-router";
import { FileText, FolderOpen, Upload, MoreHorizontal, CheckCircle2, AlertTriangle, Eye, Download } from "lucide-react";
import { Dropzone, type UploadedFile } from "@/components/app/Dropzone";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/documents")({
  component: Documents,
});

function Documents() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const queryClient = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, category, status, storage_path, file_name, file_size")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const folders = useMemo(() => {
    const counts = docs.reduce<Record<string, number>>((acc, d) => {
      const key = d.category || "Uncategorized";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return [["All", docs.length], ...Object.entries(counts)] as [string, number][];
  }, [docs]);

  const onFiles = async (incoming: UploadedFile[]) => {
    if (!user) return;
    setUploadError("");
    const { data: room } = await supabase.from("deal_rooms").select("id").limit(1).maybeSingle();
    if (!room?.id) {
      setUploadError("Create a deal room before uploading documents.");
      return;
    }
    for (const f of incoming) {
      const file = (f as UploadedFile & { rawFile?: File }).rawFile;
      if (!file) continue;
      const path = `${room.id}/${Date.now()}-${file.name}`;
      const upload = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (upload.error) {
        setUploadError(upload.error.message);
        return;
      }
      const insert = await supabase.from("documents").insert({
        deal_room_id: room.id,
        uploader_id: user.id,
        category: "General",
        status: "uploaded",
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/octet-stream",
      });
      if (insert.error) {
        setUploadError(insert.error.message);
        return;
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      setUploadError(error?.message || "Unable to create download URL.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("app.documents")}</h1>
          <div className="text-sm text-muted-foreground">{docs.length} files · watermarked · access controlled</div>
        </div>
        <button onClick={() => setShowUpload((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Upload className="h-4 w-4" /> {t("docs.upload")}</button>
      </div>

      {showUpload && (
        <div className="mt-5">
          <Dropzone title={t("docs.dragOr")} hint={t("docs.maxSize")} onFiles={onFiles} />
        </div>
      )}
      {uploadError && <p className="mt-3 text-xs text-destructive">{uploadError}</p>}

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-5">
        <aside className="space-y-1">
          {folders.map(([n, c], i) => (
            <button key={n} className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${i === 0 ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`}>
              <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> {n}</span>
              <span className="text-xs text-muted-foreground">{c}</span>
            </button>
          ))}
        </aside>

        <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Views</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {docs.map((d) => (
            <div key={d.id} className="grid grid-cols-12 px-5 py-3 border-b border-border/60 last:border-0 hover:bg-accent/40 items-center text-sm group">
              <div className="col-span-6 flex items-center gap-3 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0"><FileText className="h-4 w-4 text-brand" /></div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.file_name || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">{Math.max(1, Math.round((Number(d.file_size) || 0) / 1024))} KB</div>
                </div>
              </div>
              <div className="col-span-2 text-muted-foreground">{d.category || "General"}</div>
              <div className="col-span-2 text-muted-foreground inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> -</div>
              <div className="col-span-2 flex items-center justify-end gap-2">
                {d.status === "uploaded" ? (
                  <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Review</span>
                )}
                <button onClick={() => handleDownload(d.storage_path)} className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"><Download className="h-4 w-4" /></button>
                <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

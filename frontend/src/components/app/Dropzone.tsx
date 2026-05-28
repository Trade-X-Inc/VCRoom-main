import { useState, useRef, type DragEvent } from "react";
import { Upload, FileText, X, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { uploadDocument, supabase, logActivity } from "@/lib/supabase";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  error?: boolean;
  rawFile?: File;
}

export function Dropzone({
  onFiles,
  title = "Drag & drop or click to upload",
  hint = "Up to 50 MB · PDF, DOCX, XLSX, PPTX, PNG, JPG, CSV, TXT, MP4",
  dealRoomId,
  uploadedByRole,
  onUploadComplete,
}: {
  onFiles?: (files: UploadedFile[]) => void;
  title?: string;
  hint?: string;
  dealRoomId?: string;
  uploadedByRole?: string;
  onUploadComplete?: (fileName?: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const next: UploadedFile[] = Array.from(list).map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      type: f.type || "application/octet-stream",
      progress: 0,
      rawFile: f,
    }));
    setFiles((xs) => [...next, ...xs]);
    onFiles?.(next);

    if (dealRoomId && user?.id) {
      next.forEach(async (nf) => {
        setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 10 } : x));
        try {
          const result = await uploadDocument(nf.rawFile!, dealRoomId, user.id);
          if (!result) throw new Error("Storage upload returned null");

          const { error: insertError } = await supabase.from("documents").insert({
            deal_room_id: dealRoomId,
            uploader_id: user.id,
            storage_path: result.path,
            category: "Other",
            status: "uploaded",
            ...(uploadedByRole ? { uploaded_by_role: uploadedByRole } : {}),
          });
          if (insertError) throw insertError;

          await logActivity(dealRoomId, user.id, "Uploaded a document", { filename: nf.name });
          setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 100 } : x));
          toast.success(`${nf.name} uploaded`);
          onUploadComplete?.(nf.name);
        } catch (err) {
          console.error("Document upload failed:", err);
          toast.error(`Failed to upload ${nf.name}`);
          setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, error: true } : x));
        }
      });
    } else {
      next.forEach((nf) => {
        let p = 0;
        const id = setInterval(() => {
          p += Math.random() * 22 + 8;
          if (p >= 100) {
            p = 100;
            clearInterval(id);
          }
          setFiles((xs) => xs.map((x) => (x.id === nf.id ? { ...x, progress: Math.min(100, Math.round(p)) } : x)));
        }, 220);
      });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
          isOver ? "border-brand bg-brand/5" : "border-border bg-muted/30 hover:border-brand/50 hover:bg-accent/40"
        )}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-brand text-brand-foreground mx-auto shadow-glow">
          <Upload className="h-5 w-5" />
        </div>
        <div className="mt-3 text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.txt,.csv,.mp4"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60 overflow-hidden">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-accent shrink-0">
                <FileText className="h-4 w-4 text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums shrink-0">{(f.size / 1024).toFixed(0)} KB</div>
                </div>
                {f.error ? (
                  <div className="mt-1.5 text-xs text-destructive">Upload failed — try again</div>
                ) : (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-brand transition-all" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
              </div>
              {f.error ? (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              ) : f.progress === 100 ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setFiles((xs) => xs.filter((x) => x.id !== f.id)); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

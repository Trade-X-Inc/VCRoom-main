import { useState, useRef, type DragEvent } from "react";
import { Upload, FileText, X, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_EXTENSIONS = new Set(["pdf","pptx","ppt","xlsx","xls","docx","doc","csv","png","jpg","jpeg","mp4","txt"]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.has(ext)) return `${file.name}: file type not allowed`;
  if (file.size > MAX_FILE_SIZE) return `${file.name}: exceeds 50 MB limit`;
  return null;
}
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

// Mismatch dialog — shown when AI classification differs from the active tab
function MismatchDialog({
  fileName,
  detectedCategory,
  activeTab,
  onContinue,
  onCancel,
}: {
  fileName: string;
  detectedCategory: string;
  activeTab: string;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onCancel}
    >
      <div
        className="bg-card border border-border/60 rounded-xl p-6 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.12)" }}>
            <AlertTriangle className="h-4 w-4" style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Category mismatch</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              This looks like a <strong className="text-foreground">{detectedCategory}</strong> document, but you're uploading to the <strong className="text-foreground">{activeTab}</strong> section.
            </div>
          </div>
        </div>
        <div
          className="rounded-lg text-xs text-muted-foreground leading-relaxed mb-5 px-3 py-2.5"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <strong className="text-foreground">{fileName}</strong> — AI classified this as <em>{detectedCategory}</em>. It will be filed under {activeTab} unless you cancel and switch tabs.
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs rounded-lg border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel — pick the right tab
          </button>
          <button
            onClick={onContinue}
            className="px-4 py-2 text-xs font-medium rounded-lg text-foreground transition-colors"
            style={{ background: "var(--gradient-brand)" }}
          >
            Upload to {activeTab} anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export function Dropzone({
  onFiles,
  title = "Drag & drop or click to upload",
  hint = "Up to 50 MB · PDF, DOCX, XLSX, PPTX, PNG, JPG, CSV, TXT, MP4",
  dealRoomId,
  uploadedByRole,
  onUploadComplete,
  activeDocTab,
}: {
  onFiles?: (files: UploadedFile[]) => void;
  title?: string;
  hint?: string;
  dealRoomId?: string;
  uploadedByRole?: string;
  onUploadComplete?: (fileName?: string) => void;
  activeDocTab?: string;
}) {
  const [isOver, setIsOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Mismatch dialog state — one pending upload waiting for user decision
  const [pendingMismatch, setPendingMismatch] = useState<{
    nf: UploadedFile;
    detectedCategory: string;
    result: { path: string };
  } | null>(null);

  const doInsert = async (
    nf: UploadedFile,
    storagePath: string,
    category: string,
  ) => {
    const { error: insertError } = await supabase.from("documents").insert({
      deal_room_id: dealRoomId,
      uploader_id: user!.id,
      storage_path: storagePath,
      category,
      status: "uploaded",
      ...(uploadedByRole ? { uploaded_by_role: uploadedByRole } : {}),
    });
    if (insertError) throw insertError;

    await logActivity(dealRoomId!, user!.id, "Uploaded a document", { filename: nf.name });
    setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 100 } : x));
    toast.success(`${nf.name} uploaded`);
    onUploadComplete?.(nf.name);
  };

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const validFiles: File[] = [];
    for (const f of Array.from(list)) {
      const err = validateFile(f);
      if (err) { toast.error(err); continue; }
      validFiles.push(f);
    }
    if (validFiles.length === 0) return;
    const next: UploadedFile[] = validFiles.map((f) => ({
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

          setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 50 } : x));

          // AI classification — only when activeDocTab is set (non-All, section-specific context)
          const shouldClassify = !!activeDocTab && activeDocTab !== "All";
          let detectedCategory = activeDocTab ?? "Other";

          if (shouldClassify) {
            try {
              const { extractDocumentText } = await import("@/lib/document-extractor");
              const textSample = await extractDocumentText(nf.rawFile!, nf.name);
              const { classifyDocument } = await import("@/lib/ai-secure-fn");
              const classification = await classifyDocument({
                data: { fileName: nf.name, textSample },
              });
              detectedCategory = classification.category;
            } catch {
              // If classification fails, fall back to activeDocTab — no block
              detectedCategory = activeDocTab ?? "Other";
            }

            // Mismatch: AI says something different than the active tab
            if (detectedCategory !== activeDocTab) {
              setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, progress: 80 } : x));
              setPendingMismatch({ nf, detectedCategory, result });
              return; // wait for user decision
            }
          }

          await doInsert(nf, result.path, activeDocTab ?? "Other");
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
    <>
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
          onDragLeave={() => setIsOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
            isOver ? "border-brand bg-accent" : "border-border bg-muted/30 hover:border-brand/50 hover:bg-accent/40"
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

      {/* Mismatch warning dialog — confirm-first per CLAUDE.md §3 */}
      {pendingMismatch && (
        <MismatchDialog
          fileName={pendingMismatch.nf.name}
          detectedCategory={pendingMismatch.detectedCategory}
          activeTab={activeDocTab!}
          onContinue={async () => {
            const { nf, result } = pendingMismatch;
            setPendingMismatch(null);
            try {
              await doInsert(nf, result.path, activeDocTab ?? "Other");
            } catch (err) {
              console.error("Insert after mismatch override failed:", err);
              toast.error(`Failed to save ${nf.name}`);
              setFiles((xs) => xs.map((x) => x.id === nf.id ? { ...x, error: true } : x));
            }
          }}
          onCancel={() => {
            // Remove the file from the list — user will re-upload under the right tab
            setPendingMismatch(null);
            setFiles((xs) => xs.filter((x) => x.id !== pendingMismatch.nf.id));
            toast.info("Upload cancelled — switch to the correct section tab and try again.");
          }}
        />
      )}
    </>
  );
}

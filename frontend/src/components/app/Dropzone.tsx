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
import { useAuth } from "@/lib/auth";
import { uploadDocument, supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-fn";
import { LcsButton, LcsModal } from "@/components/lcs";

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
    <LcsModal
      title="Category mismatch"
      onClose={onCancel}
      footer={
        <>
          <LcsButton variant="secondary" onClick={onCancel}>
            Cancel — pick the right tab
          </LcsButton>
          <LcsButton variant="primary" onClick={onContinue}>
            Upload to {activeTab} anyway
          </LcsButton>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ background: "var(--lcs-attention-wash)" }}>
          <AlertTriangle className="h-4 w-4" style={{ color: "var(--lcs-attention)" }} />
        </div>
        <div
          className="text-[13px] leading-relaxed"
          style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
        >
          This looks like a <strong style={{ color: "var(--lcs-ink)" }}>{detectedCategory}</strong> document, but you're uploading to the <strong style={{ color: "var(--lcs-ink)" }}>{activeTab}</strong> section.
        </div>
      </div>
      <div
        className="text-[12px] leading-relaxed px-3 py-2.5"
        style={{ background: "var(--lcs-attention-wash)", border: "1px solid var(--lcs-attention)", color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}
      >
        <strong style={{ color: "var(--lcs-ink)" }}>{fileName}</strong> — AI classified this as <em>{detectedCategory}</em>. It will be filed under {activeTab} unless you cancel and switch tabs.
      </div>
    </LcsModal>
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
          className="relative border border-dashed p-8 text-center cursor-pointer transition-colors"
          style={{
            borderColor: isOver ? "var(--lcs-accent)" : "var(--lcs-line)",
            background: isOver ? "var(--lcs-progress-wash)" : "var(--lcs-surface)",
          }}
        >
          <div
            className="grid h-12 w-12 place-items-center mx-auto"
            style={{ background: "var(--lcs-accent)", color: "var(--lcs-white)" }}
          >
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-3 text-[14px] font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
            {title}
          </div>
          <div className="text-[12px] mt-1" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>
            {hint}
          </div>
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
          <div style={{ border: "1px solid var(--lcs-line)", background: "var(--lcs-white)" }}>
            {files.map((f, i) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? undefined : "1px solid var(--lcs-line)" }}
              >
                <div className="grid h-8 w-8 place-items-center shrink-0" style={{ background: "var(--lcs-surface)" }}>
                  <FileText className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>
                      {f.name}
                    </div>
                    <div className="text-[11px] tabular-nums shrink-0" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-data)" }}>
                      {(f.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  {f.error ? (
                    <div className="mt-1.5 text-[12px]" style={{ color: "var(--lcs-attention)", fontFamily: "var(--font-lcs-ui)" }}>
                      Upload failed — try again
                    </div>
                  ) : (
                    <div className="mt-1.5 h-1 overflow-hidden" style={{ background: "var(--lcs-line)" }}>
                      <div className="h-full transition-all" style={{ width: `${f.progress}%`, background: "var(--lcs-accent)" }} />
                    </div>
                  )}
                </div>
                {f.error ? (
                  <XCircle className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-attention)" }} />
                ) : f.progress === 100 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-satisfied)" }} />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFiles((xs) => xs.filter((x) => x.id !== f.id)); }}
                    className="shrink-0"
                    style={{ color: "var(--lcs-ink-muted)" }}
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

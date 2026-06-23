import { useState } from "react";
import { Paperclip, CheckCircle2, XCircle, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { ClaimStatus } from "@/lib/claims-fn";

interface AttachProofModalProps {
  claim: { type: string; label: string; value: string };
  startupId: string;
  onClose: () => void;
  onDone: () => void;
}

export function AttachProofModal({ claim, startupId, onClose, onDone }: AttachProofModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ proof_status: ClaimStatus; ai_result: any } | null>(null);

  const handleAttach = async () => {
    if (!file || running) return;
    setRunning(true);
    try {
      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);
      const syntheticDocId = crypto.randomUUID();
      const { attachProofAndCheck } = await import("@/lib/claims-fn");
      const r = await attachProofAndCheck({
        data: {
          startup_id: startupId,
          claim_type: claim.type,
          proof_document_id: syntheticDocId,
          document_text: text,
          claim_label: claim.label,
          claim_value: claim.value,
          user_id: "",
        },
      });
      setResult(r);
      const { logActivity } = await import("@/lib/activity-log-fn");
      const { supabase } = await import("@/lib/supabase");
      const { data: { user: authUser } } = await supabase.auth.getUser();
      logActivity({
        account_type: "founder",
        account_id: startupId,
        actor_user_id: authUser?.id ?? "",
        actor_name: authUser?.user_metadata?.full_name || authUser?.email || "Founder",
        action_type: "claim_proof_attached",
        target_label: claim.label,
        detail: `Attached proof for ${claim.label}: ${claim.value}`,
      });
    } catch {
      toast.error("Attach failed. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#111114", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
          padding: 28, maxWidth: 460, width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
              Attach proof for claim
            </div>
            <div className="text-xs text-white/40 mt-1">
              {claim.label}: <span className="text-white/60">{claim.value}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!result ? (
          <>
            <div
              style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}
              className="text-xs text-white/40 leading-relaxed"
            >
              Upload a document that contains evidence for this claim — a financial statement,
              contract, or bank statement. The AI will check if the document supports the claimed value.
            </div>

            <label
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 10, padding: "24px 16px",
                cursor: "pointer", gap: 8, marginBottom: 16,
              }}
            >
              <Paperclip className="h-5 w-5 text-white/30" />
              <span className="text-xs text-white/40 text-center">
                {file ? file.name : "Click to select PDF, DOCX, XLSX, CSV"}
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAttach}
                disabled={!file || running}
                style={{
                  background: !file || running ? "rgba(124,58,237,0.3)" : "#7C3AED",
                  color: "#fff", border: "none", borderRadius: 8,
                  padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: !file || running ? "not-allowed" : "pointer",
                }}
              >
                {running ? (
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Running AI check…</span>
                ) : "Attach & verify"}
              </button>
            </div>
          </>
        ) : (
          <>
            {result.proof_status === "ai_confirmed" && (
              <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-[#10B981] text-sm font-medium mb-1">
                  <CheckCircle2 className="h-4 w-4" /> Claim confirmed
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{result.ai_result?.explanation}</p>
              </div>
            )}
            {result.proof_status === "ai_mismatch" && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-[#EF4444] text-sm font-medium mb-1">
                  <XCircle className="h-4 w-4" /> Claim doesn't match document
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{result.ai_result?.explanation}</p>
                {result.ai_result?.found_value && (
                  <p className="text-xs text-white/40 mt-1">Found in document: <span className="text-white/60">{result.ai_result.found_value}</span></p>
                )}
              </div>
            )}
            {result.proof_status === "pending_review" && (
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-white/50 text-sm font-medium mb-1">
                  <Clock className="h-4 w-4" /> Proof attached
                </div>
                <p className="text-xs text-white/40">Document saved. AI check was inconclusive — status set to pending review.</p>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => { onDone(); onClose(); }}
                style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

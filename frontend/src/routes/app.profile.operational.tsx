/**
 * Operational Verification — Tier 3 (founder-only)
 * Three document slots: bank/revenue statement, customer/contract evidence, team evidence.
 * Same stepper + actionable hint pattern as Capital Verified (investor side).
 */
import { useState } from "react";
import {
  Upload, CheckCircle2, AlertTriangle, Clock, FileText,
  ChevronDown, ChevronUp, Circle, Lightbulb, Send,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  OperationalSlot, OperationalVerificationData, OpSlotAiResult,
} from "@/lib/operational-verification-fn";

// ── Slot metadata ─────────────────────────────────────────────────────────────

const OP_SLOTS: Array<{
  key: OperationalSlot;
  title: string;
  shortLabel: string;
  requirement: string;
  testId: string;
}> = [
  {
    key: "operational_bank",
    title: "Bank or revenue statement",
    shortLabel: "Financial",
    requirement:
      "Must be a bank statement or revenue record for your company. AI confirms: your company name is present, the document shows real financial activity (not just an opening balance), and it is dated within the last 6 months.",
    testId: "op-slot-bank",
  },
  {
    key: "operational_contract",
    title: "Customer or contract evidence",
    shortLabel: "Contract",
    requirement:
      "Must be a contract, agreement, purchase order, or letter of intent with a named external party. AI confirms: at least one named customer or counterparty distinct from your company is identified, and the document is not purely internal.",
    testId: "op-slot-contract",
  },
  {
    key: "operational_team",
    title: "Payroll or employment document",
    shortLabel: "Team",
    requirement:
      "Must be a payroll record, employment contract, offer letter, or org chart. AI confirms: at least one named individual with a specific role or title is present, and the document is a formal employment record — not a founder bio or pitch deck slide.",
    testId: "op-slot-team",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOpSlotState(data: OperationalVerificationData | null, slot: OperationalSlot) {
  return {
    docPath: (data?.[`${slot}_doc_path` as keyof OperationalVerificationData] as string | null) ?? null,
    uploadedAt: (data?.[`${slot}_doc_uploaded_at` as keyof OperationalVerificationData] as string | null) ?? null,
    aiExtracted: (data?.[`${slot}_ai_extracted` as keyof OperationalVerificationData] as OpSlotAiResult | null) ?? null,
    verified: (data?.[`${slot}_verified` as keyof OperationalVerificationData] as boolean | null) ?? null,
  };
}

function opSlotStatus(state: ReturnType<typeof getOpSlotState>): "verified" | "rejected" | "uploaded" | "empty" {
  if (state.verified === true) return "verified";
  if (state.docPath && state.verified === false) return "rejected";
  if (state.docPath) return "uploaded";
  return "empty";
}

// ── Progress stepper ──────────────────────────────────────────────────────────

function OpProgressStepper({ verifData }: { verifData: OperationalVerificationData | null }) {
  return (
    <div
      data-testid="op-stepper"
      style={{ display: "flex", gap: 8, alignItems: "stretch" }}
    >
      {OP_SLOTS.map((slot) => {
        const state = getOpSlotState(verifData, slot.key);
        const status = opSlotStatus(state);

        let dotColor = "rgba(255,255,255,0.15)";
        let dotBorder = "rgba(255,255,255,0.12)";
        let labelColor = "rgba(255,255,255,0.3)";
        let DotIcon: React.ElementType = Circle;

        if (status === "verified") {
          dotColor = "rgba(16,185,129,0.15)";
          dotBorder = "rgba(16,185,129,0.4)";
          labelColor = "#10B981";
          DotIcon = CheckCircle2;
        } else if (status === "rejected") {
          dotColor = "rgba(239,68,68,0.10)";
          dotBorder = "rgba(239,68,68,0.35)";
          labelColor = "#EF4444";
          DotIcon = AlertTriangle;
        } else if (status === "uploaded") {
          dotColor = "rgba(245,158,11,0.10)";
          dotBorder = "rgba(245,158,11,0.35)";
          labelColor = "#F59E0B";
          DotIcon = Clock;
        }

        return (
          <div key={slot.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: dotColor, border: `1.5px solid ${dotBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <DotIcon style={{ width: 14, height: 14, color: labelColor }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: labelColor }}>{slot.shortLabel}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>
                {status === "verified" ? "Verified"
                  : status === "rejected" ? "Not confirmed"
                  : status === "uploaded" ? "Pending"
                  : "No document"}
              </div>
              {status === "rejected" && state.aiExtracted?.issues && (
                <div style={{ fontSize: 10, color: "#EF4444", marginTop: 3, lineHeight: 1.4, maxWidth: 90 }}>
                  {state.aiExtracted.issues}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Single slot card ──────────────────────────────────────────────────────────

function OpSlotCard({
  slot, startupId, companyName, verifData, onDone,
}: {
  slot: typeof OP_SLOTS[number];
  startupId: string;
  companyName: string;
  verifData: OperationalVerificationData | null;
  onDone: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<File | null>(null);

  const state = getOpSlotState(verifData, slot.key);
  const status = opSlotStatus(state);

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") { toast.error("Only PDF files are accepted."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File exceeds 20 MB limit."); return; }
    setPendingConfirm(file);
  };

  const handleConfirm = async () => {
    if (!pendingConfirm || uploading) return;
    const file = pendingConfirm;
    setPendingConfirm(null);
    setUploading(true);
    try {
      const ts = Date.now();
      const storagePath = `verification-docs/${startupId}/operational/${slot.key}_${ts}.pdf`;
      const { error: storageErr } = await supabase.storage
        .from("documents").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (storageErr) throw new Error(`Storage: ${storageErr.message}`);

      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);

      const { checkOperationalDoc } = await import("@/lib/operational-verification-fn");
      const result = await checkOperationalDoc({
        data: { startup_id: startupId, slot: slot.key, doc_path: storagePath, document_text: text, company_name: companyName },
      });

      if (!result.ok) {
        toast.error("Verification check failed. Document path saved — try again.");
      } else if (result.verified) {
        toast.success("Document verified.");
      } else {
        toast.error(
          result.ai_result?.issues ?? result.ai_result?.explanation ?? "Document did not meet the requirements for this slot.",
          { duration: 8000 },
        );
      }
      onDone();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const statusBadge = status === "verified" ? (
    <span data-testid={`${slot.testId}-verified`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>
      <CheckCircle2 style={{ width: 11, height: 11 }} /> Verified
    </span>
  ) : status === "rejected" ? (
    <span data-testid={`${slot.testId}-failed`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(239,68,68,0.10)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
      <AlertTriangle style={{ width: 11, height: 11 }} /> Not confirmed
    </span>
  ) : status === "uploaded" ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.10)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
      <Clock style={{ width: 11, height: 11 }} /> Pending check
    </span>
  ) : (
    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>No document uploaded</span>
  );

  const borderColor = status === "verified"
    ? "rgba(16,185,129,0.25)"
    : status === "rejected"
    ? "rgba(239,68,68,0.18)"
    : "rgba(255,255,255,0.08)";

  return (
    <div
      data-testid={slot.testId}
      style={{ background: "#111114", border: `1px solid ${borderColor}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText style={{ width: 14, height: 14, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>{slot.title}</span>
        </div>
        {statusBadge}
      </div>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: 0 }}>
        {slot.requirement}
      </p>

      {/* Actionable hint */}
      {state.aiExtracted && state.docPath && (
        <div
          data-testid={`${slot.testId}-hint`}
          style={{
            background: status === "verified" ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
            border: `1px solid ${status === "verified" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.18)"}`,
            borderRadius: 8,
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {status !== "verified" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <Lightbulb style={{ width: 11, height: 11, color: "#F59E0B", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B" }}>What's missing</span>
            </div>
          )}
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: 0 }}>
            {state.aiExtracted.explanation}
          </p>
          {state.aiExtracted.issues && status !== "verified" && (
            <p
              data-testid={`${slot.testId}-issue-text`}
              style={{ fontSize: 12, color: "#F59E0B", margin: 0, lineHeight: 1.5 }}
            >
              {state.aiExtracted.issues}
            </p>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {pendingConfirm && (
        <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Upload <strong style={{ color: "#fff" }}>{pendingConfirm.name}</strong> for AI verification? This will replace any existing document for this slot.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid={`${slot.testId}-confirm`}
              onClick={handleConfirm}
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: "#7C3AED", color: "#fff" }}
            >
              Confirm upload
            </button>
            <button
              onClick={() => setPendingConfirm(null)}
              style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.5)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!pendingConfirm && (
        <label
          data-testid={`${slot.testId}-upload`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, width: "fit-content",
            fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8,
            cursor: uploading ? "not-allowed" : "pointer",
            background: "rgba(124,58,237,0.10)", color: uploading ? "rgba(124,58,237,0.4)" : "#A855F7",
            border: "1px solid rgba(124,58,237,0.25)", opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? (
            <><span style={{ width: 12, height: 12, border: "1.5px solid rgba(168,85,247,0.4)", borderTopColor: "#A855F7", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Checking…</>
          ) : (
            <><Upload style={{ width: 12, height: 12 }} />{state.docPath ? "Replace document" : "Upload PDF"}</>
          )}
          <input type="file" accept="application/pdf" style={{ display: "none" }} disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
          />
        </label>
      )}
    </div>
  );
}

// ── Human review button ───────────────────────────────────────────────────────

function OpHumanReviewButton({
  startupId, companyName, userEmail, displayName, allVerified, reviewRequestedAt, onRequested,
}: {
  startupId: string; companyName: string; userEmail: string; displayName: string;
  allVerified: boolean; reviewRequestedAt: string | null; onRequested: () => void;
}) {
  const [requesting, setRequesting] = useState(false);

  if (!allVerified) return null;

  if (reviewRequestedAt) {
    return (
      <div
        data-testid="op-review-requested"
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
      >
        <CheckCircle2 style={{ width: 14, height: 14, color: "#10B981", flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>Review requested</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", display: "block", marginTop: 1 }}>
            Submitted {new Date(reviewRequestedAt).toLocaleDateString()} — you will be notified when reviewed.
          </span>
        </div>
      </div>
    );
  }

  const handleRequest = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const { requestHumanReview } = await import("@/lib/verification-fn");
      const r = await requestHumanReview({
        data: { user_id: startupId, entity_id: startupId, entity_type: "founder", user_email: userEmail, display_name: displayName },
      });
      if (r.ok) {
        const { markOperationalReviewRequested } = await import("@/lib/operational-verification-fn");
        await markOperationalReviewRequested({ data: { startup_id: startupId } });
        toast.success("Review request sent.");
        onRequested();
      } else {
        toast.error("Could not send request — try again.");
      }
    } catch {
      toast.error("Request failed. Please try again.");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <button
      data-testid="op-request-review"
      onClick={handleRequest}
      disabled={requesting}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
        cursor: requesting ? "not-allowed" : "pointer",
        background: "#7C3AED", color: "#fff", border: "none",
        opacity: requesting ? 0.6 : 1,
      }}
    >
      {requesting
        ? <><span style={{ width: 12, height: 12, border: "1.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Sending…</>
        : <><Send style={{ width: 12, height: 12 }} />Request human review</>
      }
    </button>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export function OperationalVerificationSection({
  startupId, companyName, userEmail, displayName,
}: {
  startupId: string; companyName: string; userEmail?: string; displayName?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: verifData, isLoading } = useQuery<OperationalVerificationData | null>({
    queryKey: ["op-verification", startupId],
    enabled: !!startupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { getOperationalVerification } = await import("@/lib/operational-verification-fn");
      const r = await getOperationalVerification({ data: { startup_id: startupId } });
      return r.data ?? null;
    },
  });

  const verifiedCount = verifData ? OP_SLOTS.filter((s) => getOpSlotState(verifData, s.key).verified === true).length : 0;
  const allVerified = verifiedCount === 3;
  const reviewRequestedAt = verifData?.operational_human_review_requested_at ?? null;

  const refresh = () => qc.invalidateQueries({ queryKey: ["op-verification", startupId] });

  return (
    <div data-testid="op-verification-section" className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
      {/* Accordion header */}
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", background: "transparent", border: "none", cursor: "pointer", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            background: allVerified ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.10)",
            border: allVerified ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(245,158,11,0.2)",
          }}>
            {allVerified
              ? <CheckCircle2 style={{ width: 15, height: 15, color: "#10B981" }} />
              : <span style={{ fontSize: 11, fontWeight: 700, color: "#F59E0B" }}>T3</span>}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>Operationally Verified — Tier 3</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
              {isLoading ? "Loading…" : `${verifiedCount} of 3 documents verified`}
            </div>
          </div>
        </div>
        {open ? <ChevronUp style={{ width: 15, height: 15, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
               : <ChevronDown style={{ width: 15, height: 15, color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stepper */}
          <OpProgressStepper verifData={verifData ?? null} />

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, margin: 0 }}>
            Upload three independent operational documents. Each is AI-checked for the specific evidence it claims to contain.
            One document cannot satisfy multiple slots.
          </p>

          {/* Slot cards */}
          {OP_SLOTS.map((slot) => (
            <OpSlotCard key={slot.key} slot={slot} startupId={startupId} companyName={companyName} verifData={verifData ?? null} onDone={refresh} />
          ))}

          {/* Human review */}
          <OpHumanReviewButton
            startupId={startupId}
            companyName={companyName}
            userEmail={userEmail ?? ""}
            displayName={displayName ?? "Founder"}
            allVerified={allVerified}
            reviewRequestedAt={reviewRequestedAt}
            onRequested={refresh}
          />

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>
            Accepted: Bank statements, revenue records, signed contracts, purchase orders, letters of intent, payroll records, employment contracts, org charts
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

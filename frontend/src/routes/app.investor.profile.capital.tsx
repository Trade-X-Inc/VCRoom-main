/**
 * Capital Verification — Tier 3 (investor-only)
 * Parts 1a, 1b, 1c: stepper, actionable hints, human review state.
 */
import { useState } from "react";
import {
  Upload, CheckCircle2, AlertTriangle, Clock, FileText,
  ChevronDown, ChevronUp, Circle, Lightbulb, Send,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CapitalSlot, CapitalVerificationData, SlotAiResult } from "@/lib/capital-verification-fn";

// ── Slot metadata ─────────────────────────────────────────────────────────────

const SLOTS: Array<{
  key: CapitalSlot;
  title: string;
  shortLabel: string;
  requirement: string;
  testId: string;
}> = [
  {
    key: "fund_formation",
    title: "Fund formation document",
    shortLabel: "Formation",
    requirement:
      "Must be a Limited Partnership Agreement, Articles of Association, Operating Agreement, or equivalent founding instrument. AI confirms: the fund name matches your profile, and a signing party with apparent authority (General Partner, Director, or equivalent) is identified.",
    testId: "capital-slot-fund-formation",
  },
  {
    key: "capital_commitment",
    title: "Capital commitment letter / board resolution",
    shortLabel: "Commitment",
    requirement:
      "Must be a signed capital commitment letter, subscription agreement, or board resolution on organizational letterhead. AI confirms: a specific committed capital amount is stated, the entity name matches your fund, and a named signatory is present.",
    testId: "capital-slot-capital-commitment",
  },
  {
    key: "aum_confirmation",
    title: "AUM confirmation",
    shortLabel: "AUM",
    requirement:
      "Must be a bank statement, audited financial statement, or custodian letter — not a pitch deck or internally-generated summary. AI confirms: a financial balance or AUM figure is present, and the document is dated within the last 12 months.",
    testId: "capital-slot-aum-confirmation",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSlotState(data: CapitalVerificationData | null, slot: CapitalSlot) {
  return {
    docPath: (data?.[`${slot}_doc_path` as keyof CapitalVerificationData] as string | null) ?? null,
    uploadedAt: (data?.[`${slot}_doc_uploaded_at` as keyof CapitalVerificationData] as string | null) ?? null,
    aiExtracted: (data?.[`${slot}_ai_extracted` as keyof CapitalVerificationData] as SlotAiResult | null) ?? null,
    verified: (data?.[`${slot}_verified` as keyof CapitalVerificationData] as boolean | null) ?? null,
  };
}

function slotStatus(state: ReturnType<typeof getSlotState>): "verified" | "rejected" | "uploaded" | "empty" {
  if (state.verified === true) return "verified";
  if (state.docPath && state.verified === false) return "rejected";
  if (state.docPath) return "uploaded";
  return "empty";
}

// ── Part 1a: Visual progress stepper ─────────────────────────────────────────

function ProgressStepper({ verifData }: { verifData: CapitalVerificationData | null }) {
  return (
    <div
      data-testid="capital-stepper"
      style={{ display: "flex", gap: 8, alignItems: "stretch" }}
    >
      {SLOTS.map((slot, i) => {
        const state = getSlotState(verifData, slot.key);
        const status = slotStatus(state);

        let dotColor = "var(--faint)";
        let dotBorder = "var(--border)";
        let labelColor = "var(--faint)";
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
            {/* Step dot */}
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: dotColor, border: `1.5px solid ${dotBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <DotIcon style={{ width: 14, height: 14, color: labelColor }} />
            </div>
            {/* Connector line (except last) */}
            {i < SLOTS.length - 1 && (
              <div style={{ position: "absolute", display: "none" }} />
            )}
            {/* Label */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: labelColor }}>{slot.shortLabel}</div>
              <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 1 }}>
                {status === "verified" ? "Verified"
                  : status === "rejected" ? "Not confirmed"
                  : status === "uploaded" ? "Pending"
                  : "No document"}
              </div>
              {/* Part 1b: show specific issue inline in stepper if rejected */}
              {status === "rejected" && state.aiExtracted?.issues && (
                <div
                  data-testid={`${slot.testId}-stepper-issue`}
                  style={{ fontSize: 10, color: "#EF4444", marginTop: 3, lineHeight: 1.4, maxWidth: 90 }}
                >
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

function SlotCard({
  slot, investorId, fundName, verifData, onDone,
}: {
  slot: typeof SLOTS[number];
  investorId: string;
  fundName: string;
  verifData: CapitalVerificationData | null;
  onDone: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<File | null>(null);

  const state = getSlotState(verifData, slot.key);
  const status = slotStatus(state);

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
      const storagePath = `verification-docs/${investorId}/capital/${slot.key}_${ts}.pdf`;
      const { error: storageErr } = await supabase.storage
        .from("documents").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (storageErr) throw new Error(`Storage: ${storageErr.message}`);

      const { extractDocumentText } = await import("@/lib/document-extractor");
      const text = await extractDocumentText(file, file.name);

      const { checkCapitalDoc } = await import("@/lib/capital-verification-fn");
      const result = await checkCapitalDoc({
        data: { investor_id: investorId, slot: slot.key, doc_path: storagePath, document_text: text, fund_name: fundName },
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

  // Status badge
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
    <span style={{ fontSize: 11, color: "var(--faint)" }}>No document uploaded</span>
  );

  const borderColor = status === "verified"
    ? "rgba(16,185,129,0.25)"
    : status === "rejected"
    ? "rgba(239,68,68,0.18)"
    : "var(--accent)";

  return (
    <div
      data-testid={slot.testId}
      style={{ background: "var(--card)", border: `1px solid ${borderColor}`, borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText style={{ width: 14, height: 14, color: "var(--faint)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "Syne, sans-serif" }}>{slot.title}</span>
        </div>
        {statusBadge}
      </div>

      <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
        {slot.requirement}
      </p>

      {/* Part 1b: Actionable hint — explanation + specific issue */}
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
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.55, margin: 0 }}>
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
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>
            Upload <strong style={{ color: "var(--foreground)" }}>{pendingConfirm.name}</strong> for AI verification? This will replace any existing document for this slot.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid={`${slot.testId}-confirm`}
              onClick={handleConfirm}
              style={{ fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: "var(--gradient-brand)", color: "#fff" }}
            >
              Confirm upload
            </button>
            <button
              onClick={() => setPendingConfirm(null)}
              style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", background: "transparent", color: "var(--muted-foreground)" }}
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

// ── Part 1c: Human review button with persistent state ────────────────────────

function HumanReviewButton({
  investorId, fundName, userEmail, displayName, allVerified, reviewRequestedAt, onRequested,
}: {
  investorId: string; fundName: string; userEmail: string; displayName: string;
  allVerified: boolean; reviewRequestedAt: string | null; onRequested: () => void;
}) {
  const [requesting, setRequesting] = useState(false);

  if (!allVerified) return null;

  if (reviewRequestedAt) {
    return (
      <div
        data-testid="capital-review-requested"
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
      >
        <CheckCircle2 style={{ width: 14, height: 14, color: "#10B981", flexShrink: 0 }} />
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>Review requested</span>
          <span style={{ fontSize: 11, color: "var(--faint)", display: "block", marginTop: 1 }}>
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
        data: { user_id: investorId, entity_id: investorId, entity_type: "investor", user_email: userEmail, display_name: displayName },
      });
      if (r.ok) {
        // Persist the timestamp in investor_verifications via server fn
        const { markCapitalReviewRequested } = await import("@/lib/capital-verification-fn");
        await markCapitalReviewRequested({ data: { investor_id: investorId } });
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
      data-testid="capital-request-review"
      onClick={handleRequest}
      disabled={requesting}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8,
        cursor: requesting ? "not-allowed" : "pointer",
        background: "var(--gradient-brand)", color: "#fff", border: "none",
        opacity: requesting ? 0.6 : 1,
      }}
    >
      {requesting
        ? <><span style={{ width: 12, height: 12, border: "1.5px solid var(--border)", borderTopColor: "var(--foreground)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />Sending…</>
        : <><Send style={{ width: 12, height: 12 }} />Request human review</>
      }
    </button>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export function CapitalVerificationSection({
  investorId, fundName, userEmail, displayName,
}: {
  investorId: string; fundName: string; userEmail?: string; displayName?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: verifData, isLoading } = useQuery<CapitalVerificationData | null>({
    queryKey: ["capital-verification", investorId],
    enabled: !!investorId,
    staleTime: 30_000,
    queryFn: async () => {
      const { getCapitalVerification } = await import("@/lib/capital-verification-fn");
      const r = await getCapitalVerification({ data: { investor_id: investorId } });
      return r.data ?? null;
    },
  });

  const verifiedCount = verifData ? SLOTS.filter((s) => getSlotState(verifData, s.key).verified === true).length : 0;
  const allVerified = verifiedCount === 3;
  const reviewRequestedAt = (verifData as any)?.capital_tier_human_review_requested_at ?? null;

  const refresh = () => qc.invalidateQueries({ queryKey: ["capital-verification", investorId] });

  return (
    <div data-testid="capital-verification-section" className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
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
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", fontFamily: "Syne, sans-serif" }}>Capital Verified — Tier 3</div>
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 1 }}>
              {isLoading ? "Loading…" : `${verifiedCount} of 3 documents verified`}
            </div>
          </div>
        </div>
        {open ? <ChevronUp style={{ width: 15, height: 15, color: "var(--faint)", flexShrink: 0 }} />
               : <ChevronDown style={{ width: 15, height: 15, color: "var(--faint)", flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Part 1a: stepper */}
          <ProgressStepper verifData={verifData ?? null} />

          <p style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.6, margin: 0 }}>
            Upload three independent documents. Each is AI-checked against your stated fund details.
            One document cannot satisfy multiple slots — each slot requires distinct content.
          </p>

          {/* Slot cards */}
          {SLOTS.map((slot) => (
            <SlotCard key={slot.key} slot={slot} investorId={investorId} fundName={fundName} verifData={verifData ?? null} onDone={refresh} />
          ))}

          {/* Part 1c: human review */}
          <HumanReviewButton
            investorId={investorId}
            fundName={fundName}
            userEmail={userEmail ?? ""}
            displayName={displayName ?? "Investor"}
            allVerified={allVerified}
            reviewRequestedAt={reviewRequestedAt}
            onRequested={refresh}
          />

          <p style={{ fontSize: 11, color: "var(--faint)", margin: 0 }}>
            Accepted: Limited Partnership Agreement, Articles of Association, Board Resolution with capital commitment, Bank statement or custodian letter (dated within 12 months)
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/**
 * Deal Room Workflow — stage stepper + stage-aware overview panels.
 * Founder and investor see genuinely different content at each stage.
 */
import { useState } from "react";
import {
  CheckCircle2, Circle, Clock, AlertTriangle, ChevronRight,
  Upload, FileText, Send, Check, X, Lightbulb, Calendar,
  DollarSign, Percent, ArrowRight, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WorkflowStage, WorkflowState } from "@/lib/deal-room-workflow-fn";
import {
  WORKFLOW_STAGES, STAGE_LABELS,
  advanceWorkflowStage, sendTermSheet, respondToTermSheet,
  upsertDealRoomMeeting, getDealRoomWorkflow,
} from "@/lib/deal-room-workflow-fn";

// ── Stage stepper ─────────────────────────────────────────────────────────────

export function WorkflowStepper({
  currentStage,
  stageEnteredAt,
}: {
  currentStage: WorkflowStage | null;
  stageEnteredAt: string | null;
}) {
  const stage = currentStage ?? "nda_signed";
  const currentIdx = WORKFLOW_STAGES.indexOf(stage);
  const daysInStage = stageEnteredAt
    ? Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86400000)
    : null;

  return (
    <div data-testid="workflow-stepper" style={{
      background: "#111114",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: "16px 20px",
    }}>
      {/* Stage row */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {WORKFLOW_STAGES.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const future = i > currentIdx;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < WORKFLOW_STAGES.length - 1 ? "1" : "0" }}>
              {/* Node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1.5px solid ${done ? "rgba(16,185,129,0.5)" : active ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)"}`,
                }}>
                  {done
                    ? <CheckCircle2 style={{ width: 13, height: 13, color: "#10B981" }} />
                    : active
                    ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }} />
                    : <Circle style={{ width: 10, height: 10, color: "rgba(255,255,255,0.15)" }} />
                  }
                </div>
                <span style={{
                  fontSize: 9,
                  fontWeight: active ? 700 : 500,
                  color: done ? "#10B981" : active ? "#A855F7" : "rgba(255,255,255,0.2)",
                  letterSpacing: "0.04em",
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  maxWidth: 64,
                }}>
                  {STAGE_LABELS[s]}
                </span>
              </div>
              {/* Connector */}
              {i < WORKFLOW_STAGES.length - 1 && (
                <div style={{
                  flex: 1, height: 1.5, marginBottom: 18,
                  background: done ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.06)",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Days in stage */}
      {daysInStage !== null && stage !== "closed" && (
        <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          <Clock style={{ width: 10, height: 10, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
          Day {daysInStage + 1} in {STAGE_LABELS[stage]}
        </div>
      )}
    </div>
  );
}

// ── Next action callout ───────────────────────────────────────────────────────

export function NextActionCallout({
  stage,
  isInvestor,
  workflow,
  founderName,
  onTabChange,
}: {
  stage: WorkflowStage | null;
  isInvestor: boolean;
  workflow: WorkflowState | null;
  founderName?: string;
  onTabChange: (tab: string) => void;
}) {
  const s = stage ?? "nda_signed";
  let text = "";
  let cta: { label: string; tab?: string; action?: () => void } | null = null;

  if (s === "nda_signed") {
    if (isInvestor) {
      text = `${founderName ?? "The founder"} has signed the NDA. Waiting for their Stage 1 data pack.`;
    } else {
      text = "NDA confirmed. Share your Stage 1 data pack to move forward.";
      cta = { label: "Go to Document Vault", tab: "documents" };
    }
  } else if (s === "stage1_review") {
    if (isInvestor) {
      text = "Review Stage 1 documents. Advance to Meetings or Pass.";
      cta = { label: "View documents", tab: "documents" };
    } else {
      text = "Documents uploaded. The investor is reviewing your Stage 1 pack.";
    }
  } else if (s === "meetings") {
    if (isInvestor) {
      text = "Schedule and complete your meetings. After at least 1 meeting you can advance to Full Diligence or pass.";
      cta = { label: "Meetings", tab: "meetings" };
    } else {
      const completed = workflow?.meetings_completed ?? 0;
      text = `Meetings in progress — ${completed} of 3 completed. Participate in scheduled sessions and review shared action items.`;
      cta = { label: "Meetings", tab: "meetings" };
    }
  } else if (s === "stage2_diligence") {
    if (isInvestor) {
      text = "Term sheet sent. Review Stage 2 documents and run full due diligence.";
      cta = { label: "DD Workstation", tab: "checklist" };
    } else {
      text = "A term sheet has been received. Review the terms and upload your Stage 2 full diligence documents.";
      cta = { label: "Document Vault", tab: "documents" };
    }
  } else if (s === "term_sheet") {
    if (isInvestor) {
      text = "Prepare and send your term sheet. Fill in the structured form or upload a PDF.";
    } else {
      if (workflow?.term_sheet_status === "sent") {
        text = "A term sheet has been received. Review the terms and accept, counter, or decline.";
      } else {
        text = "Awaiting term sheet from the investor.";
      }
    }
  } else if (s === "closed") {
    text = isInvestor
      ? "Deal closed. This deal room is now archived."
      : "Round closed. Congratulations — this deal room is archived.";
  }

  if (!text) return null;

  return (
    <div
      data-testid="next-action-callout"
      style={{
        background: "rgba(124,58,237,0.06)",
        border: "1px solid rgba(124,58,237,0.18)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Lightbulb style={{ width: 14, height: 14, color: "#A855F7", flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{text}</span>
      </div>
      {cta && (
        <button
          onClick={() => cta!.tab && onTabChange(cta!.tab)}
          style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 6,
            background: "#7C3AED", color: "#fff", border: "none", cursor: "pointer",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {cta.label} <ArrowRight style={{ width: 10, height: 10, display: "inline", marginLeft: 2 }} />
        </button>
      )}
    </div>
  );
}

// ── Stage 1 panel: NDA Signed ─────────────────────────────────────────────────

function Stage1Panel({ isInvestor, founderName, onTabChange }: {
  isInvestor: boolean; founderName?: string; onTabChange: (t: string) => void;
}) {
  if (isInvestor) {
    return (
      <div style={{ padding: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Clock style={{ width: 16, height: 16, color: "#F59E0B" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
            Waiting for Stage 1 data pack
          </span>
        </div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
          {founderName ?? "The founder"} has signed the NDA. You will be notified when they share their Stage 1 documents
          (pitch deck, financials, company overview).
        </p>
      </div>
    );
  }
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <CheckCircle2 style={{ width: 16, height: 16, color: "#10B981" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
          NDA confirmed — share your Stage 1 data pack
        </span>
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 16 }}>
        Upload your pitch deck, one-pager, and any initial financial summary as <strong style={{ color: "rgba(255,255,255,0.6)" }}>Stage 1 documents</strong>.
        These will be visible to the investor once they advance to Stage 1 Review.
      </p>
      <button
        onClick={() => onTabChange("documents")}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, background: "#7C3AED", color: "#fff", border: "none", cursor: "pointer" }}
      >
        <Upload style={{ width: 12, height: 12 }} /> Go to Document Vault
      </button>
    </div>
  );
}

// ── Stage 2 panel: Stage 1 Review ────────────────────────────────────────────

function Stage2Panel({ isInvestor, dealRoomId, userId, founderName, workflow, onTabChange, onStageChange }: {
  isInvestor: boolean; dealRoomId: string; userId?: string; founderName?: string;
  workflow: WorkflowState | null; onTabChange: (t: string) => void; onStageChange: () => void;
}) {
  const [passing, setPassing] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["workflow-stage1-docs-count", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("founder_documents")
        .select("id, title, deal_room_stage, updated_at")
        .eq("deal_room_stage", 1)
        .eq("visibility", "deal_room")
        .in("status", ["complete", "ai_extracted", "needs_review"]);
      return data ?? [];
    },
  });

  const advance = async () => {
    if (!userId || advancing) return;
    setAdvancing(true);
    try {
      const r = await advanceWorkflowStage({ data: { deal_room_id: dealRoomId, to_stage: "meetings", actor_user_id: userId } });
      if (r.ok) { toast.success("Advanced to Meetings"); onStageChange(); }
      else toast.error("Failed to advance stage");
    } catch { toast.error("Failed to advance stage"); }
    finally { setAdvancing(false); }
  };

  const pass = async () => {
    if (!userId || passing) return;
    setPassing(true);
    try {
      const r = await advanceWorkflowStage({ data: { deal_room_id: dealRoomId, to_stage: "closed", actor_user_id: userId } });
      if (r.ok) { toast.success("Deal passed"); onStageChange(); }
      else toast.error("Failed");
    } catch { toast.error("Failed"); }
    finally { setPassing(false); }
  };

  if (!isInvestor) {
    return (
      <div style={{ padding: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Clock style={{ width: 16, height: 16, color: "#F59E0B" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
            Under review — {docs.length} Stage 1 document{docs.length !== 1 ? "s" : ""} shared
          </span>
        </div>
        {docs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(docs as any[]).map((d: any) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                <FileText style={{ width: 12, height: 12, flexShrink: 0 }} />
                {d.title}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No Stage 1 documents uploaded yet.</p>
        )}
        <button onClick={() => onTabChange("documents")} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, background: "rgba(124,58,237,0.12)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.25)", cursor: "pointer" }}>
          <Upload style={{ width: 11, height: 11 }} /> Add more documents
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <FileText style={{ width: 16, height: 16, color: "#A855F7" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
          Stage 1 documents — {docs.length} file{docs.length !== 1 ? "s" : ""} from {founderName ?? "founder"}
        </span>
      </div>
      {docs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {(docs as any[]).map((d: any) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              <FileText style={{ width: 12, height: 12, flexShrink: 0, color: "#A855F7" }} />
              {d.title}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>No Stage 1 documents shared yet.</p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => onTabChange("documents")} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, background: "rgba(124,58,237,0.10)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.25)", cursor: "pointer" }}>
          View documents
        </button>
        <button
          data-testid="advance-to-meetings"
          onClick={advance}
          disabled={advancing}
          style={{ fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, background: "#7C3AED", color: "#fff", border: "none", cursor: advancing ? "not-allowed" : "pointer", opacity: advancing ? 0.6 : 1 }}
        >
          {advancing ? "Advancing…" : "Advance to Meetings"}
        </button>
        <button
          onClick={pass}
          disabled={passing}
          style={{ fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", cursor: passing ? "not-allowed" : "pointer" }}
        >
          Pass
        </button>
      </div>
    </div>
  );
}

// ── Stage 3 panel: Meetings ───────────────────────────────────────────────────

function Stage3Panel({ isInvestor, dealRoomId, userId, workflow, onTabChange, onStageChange }: {
  isInvestor: boolean; dealRoomId: string; userId?: string;
  workflow: WorkflowState | null; onTabChange: (t: string) => void; onStageChange: () => void;
}) {
  const [advancing, setAdvancing] = useState(false);
  const [passing, setPassing] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState<number | null>(null);
  const [meetingDates, setMeetingDates] = useState<Record<number, string>>({});

  const meetings = workflow?.meetings ?? [];
  const completed = workflow?.meetings_completed ?? 0;
  const canAdvance = completed >= 1;

  const scheduleMeeting = async (num: 1 | 2 | 3) => {
    const date = meetingDates[num];
    if (!date || !userId) return;
    setSavingMeeting(num);
    try {
      const r = await upsertDealRoomMeeting({
        data: {
          deal_room_id: dealRoomId,
          meeting_number: num,
          scheduled_at: new Date(date).toISOString(),
          actor_user_id: userId,
        },
      });
      if (r.ok) { toast.success(`Meeting ${num} scheduled`); onStageChange(); }
      else toast.error("Failed to schedule");
    } catch { toast.error("Failed to schedule"); }
    finally { setSavingMeeting(null); }
  };

  const completeMeeting = async (num: 1 | 2 | 3) => {
    if (!userId) return;
    setSavingMeeting(num);
    try {
      const r = await upsertDealRoomMeeting({
        data: {
          deal_room_id: dealRoomId,
          meeting_number: num,
          completed_at: new Date().toISOString(),
          actor_user_id: userId,
        },
      });
      if (r.ok) { toast.success(`Meeting ${num} marked complete`); onStageChange(); }
    } catch { toast.error("Failed"); }
    finally { setSavingMeeting(null); }
  };

  const advance = async () => {
    if (!userId || advancing) return;
    setAdvancing(true);
    try {
      const r = await sendTermSheet({ data: { deal_room_id: dealRoomId, actor_user_id: userId } });
      if (r.ok) { toast.success("Advanced to Full Diligence — term sheet stage unlocked"); onStageChange(); }
      else toast.error("Failed");
    } catch { toast.error("Failed"); }
    finally { setAdvancing(false); }
  };

  const pass = async () => {
    if (!userId || passing) return;
    setPassing(true);
    try {
      const r = await advanceWorkflowStage({ data: { deal_room_id: dealRoomId, to_stage: "closed", actor_user_id: userId } });
      if (r.ok) { toast.success("Deal passed"); onStageChange(); }
    } catch { toast.error("Failed"); }
    finally { setPassing(false); }
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Calendar style={{ width: 16, height: 16, color: "#A855F7" }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
          Meetings — {completed} of 3 completed
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {([1, 2, 3] as const).map((num) => {
          const m = meetings.find((x) => x.meeting_number === num);
          const isCompleted = !!m?.completed_at;
          const isScheduled = !!m?.scheduled_at && !isCompleted;

          return (
            <div
              key={num}
              data-testid={`meeting-slot-${num}`}
              style={{
                background: isCompleted ? "rgba(16,185,129,0.06)" : isScheduled ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isCompleted ? "rgba(16,185,129,0.2)" : isScheduled ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isCompleted ? "rgba(16,185,129,0.15)" : isScheduled ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isCompleted ? "rgba(16,185,129,0.3)" : isScheduled ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    {isCompleted
                      ? <CheckCircle2 style={{ width: 12, height: 12, color: "#10B981" }} />
                      : <span style={{ fontSize: 10, fontWeight: 700, color: isScheduled ? "#F59E0B" : "rgba(255,255,255,0.3)" }}>{num}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isCompleted ? "#10B981" : "#fff" }}>
                      Meeting {num}
                    </div>
                    {m?.scheduled_at && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                        {new Date(m.scheduled_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                        {isCompleted ? " — Completed" : " — Scheduled"}
                      </div>
                    )}
                    {m?.notes_shared && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3, maxWidth: 280 }}>
                        Notes: {m.notes_shared}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {isInvestor && !isCompleted && isScheduled && (
                    <button
                      onClick={() => completeMeeting(num)}
                      disabled={savingMeeting === num}
                      style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)", cursor: "pointer" }}
                    >
                      Mark complete
                    </button>
                  )}
                  {isInvestor && !isScheduled && !isCompleted && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="date"
                        value={meetingDates[num] ?? ""}
                        onChange={(e) => setMeetingDates((p) => ({ ...p, [num]: e.target.value }))}
                        style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "#18181C", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}
                      />
                      <button
                        data-testid={`schedule-meeting-${num}`}
                        onClick={() => scheduleMeeting(num)}
                        disabled={!meetingDates[num] || savingMeeting === num}
                        style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, background: "#7C3AED", color: "#fff", border: "none", cursor: !meetingDates[num] ? "not-allowed" : "pointer", opacity: !meetingDates[num] ? 0.5 : 1 }}
                      >
                        {savingMeeting === num ? "…" : "Schedule"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isInvestor && (
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            data-testid="advance-to-diligence"
            onClick={advance}
            disabled={!canAdvance || advancing}
            style={{
              fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8,
              background: canAdvance ? "#7C3AED" : "rgba(124,58,237,0.2)",
              color: canAdvance ? "#fff" : "rgba(124,58,237,0.4)",
              border: "none", cursor: !canAdvance ? "not-allowed" : "pointer",
            }}
            title={!canAdvance ? "Complete at least 1 meeting first" : ""}
          >
            {advancing ? "Sending term sheet…" : "Send term sheet & advance →"}
          </button>
          <button
            onClick={pass}
            disabled={passing}
            style={{ fontSize: 12, fontWeight: 500, padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}
          >
            Pass on deal
          </button>
          {!canAdvance && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", alignSelf: "center" }}>
              Complete at least 1 meeting to advance
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stage 4 panel: Full Diligence ─────────────────────────────────────────────

function Stage4Panel({ isInvestor, workflow, onTabChange }: {
  isInvestor: boolean; workflow: WorkflowState | null; onTabChange: (t: string) => void;
}) {
  const ts = workflow;
  return (
    <div style={{ padding: "24px 0" }}>
      {/* Term sheet summary */}
      {ts?.term_sheet_sent_at && (
        <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10B981", marginBottom: 8, fontFamily: "Syne, sans-serif" }}>
            Term sheet {isInvestor ? "sent" : "received"} — {new Date(ts.term_sheet_sent_at).toLocaleDateString()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ts.term_sheet_investment_amount && <TermField label="Investment" value={`$${Number(ts.term_sheet_investment_amount).toLocaleString()}`} />}
            {ts.term_sheet_valuation && <TermField label="Pre-money valuation" value={`$${Number(ts.term_sheet_valuation).toLocaleString()}`} />}
            {ts.term_sheet_equity_pct && <TermField label="Equity" value={`${ts.term_sheet_equity_pct}%`} />}
            {ts.term_sheet_type && <TermField label="Instrument" value={ts.term_sheet_type} />}
            {ts.term_sheet_pro_rata !== null && <TermField label="Pro-rata" value={ts.term_sheet_pro_rata ? "Yes" : "No"} />}
            {ts.term_sheet_board_seat !== null && <TermField label="Board seat" value={ts.term_sheet_board_seat ? "Yes" : "No"} />}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <FileText style={{ width: 15, height: 15, color: "#A855F7" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
          {isInvestor ? "Full diligence documents unlocked" : "Upload Stage 2 — full diligence documents"}
        </span>
      </div>

      {!isInvestor && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 14 }}>
          Stage 2 documents are now visible to the investor. Upload: P&L, cap table, legal documents,
          customer contracts, team/employment records, technical architecture docs.
        </p>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => onTabChange("documents")} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, background: "rgba(124,58,237,0.10)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.25)", cursor: "pointer" }}>
          {isInvestor ? "View Stage 2 documents" : "Upload Stage 2 documents"}
        </button>
        {isInvestor && (
          <button onClick={() => onTabChange("checklist")} style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, background: "rgba(124,58,237,0.10)", color: "#A855F7", border: "1px solid rgba(124,58,237,0.25)", cursor: "pointer" }}>
            DD Workstation
          </button>
        )}
      </div>
    </div>
  );
}

function TermField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ── Stage 5 panel: Term Sheet ─────────────────────────────────────────────────

function Stage5Panel({ isInvestor, dealRoomId, userId, workflow, onStageChange }: {
  isInvestor: boolean; dealRoomId: string; userId?: string;
  workflow: WorkflowState | null; onStageChange: () => void;
}) {
  const [form, setForm] = useState({
    valuation: "", investment: "", equity: "", instrument: "SAFE", pro_rata: false, board_seat: false,
  });
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState<"accepted" | "countered" | "rejected" | null>(null);

  const tsStatus = workflow?.term_sheet_status;
  const tsSent = !!workflow?.term_sheet_sent_at;

  const handleSend = async () => {
    if (!userId || sending) return;
    setSending(true);
    try {
      const r = await sendTermSheet({
        data: {
          deal_room_id: dealRoomId,
          actor_user_id: userId,
          valuation: form.valuation ? Number(form.valuation) : null,
          investment_amount: form.investment ? Number(form.investment) : null,
          equity_pct: form.equity ? Number(form.equity) : null,
          instrument_type: form.instrument || null,
          pro_rata: form.pro_rata,
          board_seat: form.board_seat,
        },
      });
      if (r.ok) { toast.success("Term sheet sent"); onStageChange(); }
      else toast.error("Failed to send term sheet");
    } catch { toast.error("Failed to send term sheet"); }
    finally { setSending(false); }
  };

  const handleRespond = async (response: "accepted" | "countered" | "rejected") => {
    if (!userId || responding) return;
    setResponding(response);
    try {
      const r = await respondToTermSheet({ data: { deal_room_id: dealRoomId, actor_user_id: userId, response } });
      if (r.ok) {
        toast.success(response === "accepted" ? "Term sheet accepted — deal closed!" : response === "countered" ? "Counter request noted" : "Term sheet declined");
        onStageChange();
      }
    } catch { toast.error("Failed"); }
    finally { setResponding(null); }
  };

  if (isInvestor && !tsSent) {
    return (
      <div style={{ padding: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Send style={{ width: 15, height: 15, color: "#A855F7" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>Send term sheet</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <TsField label="Pre-money valuation ($)" value={form.valuation} onChange={(v) => setForm((f) => ({ ...f, valuation: v }))} placeholder="e.g. 5000000" type="number" />
          <TsField label="Investment amount ($)" value={form.investment} onChange={(v) => setForm((f) => ({ ...f, investment: v }))} placeholder="e.g. 500000" type="number" />
          <TsField label="Equity (%)" value={form.equity} onChange={(v) => setForm((f) => ({ ...f, equity: v }))} placeholder="e.g. 9" type="number" />
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Instrument</label>
            <select
              value={form.instrument}
              onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
              style={{ width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "#18181C", color: "#fff" }}
            >
              <option>SAFE</option>
              <option>Priced Equity</option>
              <option>Convertible Note</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.pro_rata} onChange={(e) => setForm((f) => ({ ...f, pro_rata: e.target.checked }))} /> Pro-rata rights
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.board_seat} onChange={(e) => setForm((f) => ({ ...f, board_seat: e.target.checked }))} /> Board seat
          </label>
        </div>
        <button
          data-testid="send-term-sheet"
          onClick={handleSend}
          disabled={sending}
          style={{ fontSize: 12, fontWeight: 600, padding: "9px 20px", borderRadius: 8, background: "#7C3AED", color: "#fff", border: "none", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.6 : 1 }}
        >
          {sending ? "Sending…" : "Send term sheet"}
        </button>
      </div>
    );
  }

  if (!isInvestor && tsSent) {
    return (
      <div style={{ padding: "24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <FileText style={{ width: 15, height: 15, color: "#10B981" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Syne, sans-serif" }}>
            Term sheet received
          </span>
        </div>
        {/* Summary */}
        {workflow && (
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {workflow.term_sheet_investment_amount && <TermField label="Investment" value={`$${Number(workflow.term_sheet_investment_amount).toLocaleString()}`} />}
            {workflow.term_sheet_valuation && <TermField label="Pre-money" value={`$${Number(workflow.term_sheet_valuation).toLocaleString()}`} />}
            {workflow.term_sheet_equity_pct && <TermField label="Equity" value={`${workflow.term_sheet_equity_pct}%`} />}
            {workflow.term_sheet_type && <TermField label="Instrument" value={workflow.term_sheet_type} />}
          </div>
        )}
        {tsStatus === "sent" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              data-testid="accept-term-sheet"
              onClick={() => handleRespond("accepted")}
              disabled={!!responding}
              style={{ fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, background: "#10B981", color: "#fff", border: "none", cursor: "pointer" }}
            >
              <Check style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              Accept
            </button>
            <button
              onClick={() => handleRespond("countered")}
              disabled={!!responding}
              style={{ fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8, background: "rgba(245,158,11,0.10)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer" }}
            >
              Counter
            </button>
            <button
              onClick={() => handleRespond("rejected")}
              disabled={!!responding}
              style={{ fontSize: 12, fontWeight: 500, padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer" }}
            >
              Decline
            </button>
          </div>
        )}
        {tsStatus && tsStatus !== "sent" && (
          <div style={{ fontSize: 12, fontWeight: 600, color: tsStatus === "accepted" ? "#10B981" : tsStatus === "rejected" ? "#EF4444" : "#F59E0B" }}>
            Status: {tsStatus.charAt(0).toUpperCase() + tsStatus.slice(1)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
      {isInvestor ? "Term sheet already sent." : "Awaiting term sheet from the investor."}
    </div>
  );
}

function TsField({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "#18181C", color: "#fff", boxSizing: "border-box" }}
      />
    </div>
  );
}

// ── Stage 6 panel: Closed ─────────────────────────────────────────────────────

function Stage6Panel({ isInvestor, workflow }: { isInvestor: boolean; workflow: WorkflowState | null }) {
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
        <CheckCircle2 style={{ width: 28, height: 28, color: "#10B981", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: "#10B981", marginBottom: 6, fontFamily: "Syne, sans-serif" }}>Deal Closed</div>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          {isInvestor
            ? `Investment of ${workflow?.term_sheet_investment_amount ? `$${Number(workflow.term_sheet_investment_amount).toLocaleString()}` : "an agreed amount"} closed. This company has been added to your portfolio.`
            : `Congratulations — your round with this investor is closed. This deal room is now archived and read-only.`}
        </p>
        {workflow?.term_sheet_accepted_at && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
            Accepted {new Date(workflow.term_sheet_accepted_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stage 2 document gate (for investor viewing Stage 2 docs before unlock) ───

export function Stage2Gate({ stage2Unlocked }: { stage2Unlocked: boolean }) {
  if (stage2Unlocked) return null;
  return (
    <div
      data-testid="stage2-gate"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)",
        borderRadius: 10, padding: "12px 16px", marginBottom: 12,
      }}
    >
      <Lock style={{ width: 14, height: 14, color: "#F59E0B", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
        Full diligence documents unlock after a term sheet is sent.
      </span>
    </div>
  );
}

// ── Main stage-aware overview panel ──────────────────────────────────────────

export function StageAwareOverviewPanel({
  dealRoomId,
  isInvestor,
  founderName,
  onTabChange,
}: {
  dealRoomId: string;
  isInvestor: boolean;
  founderName?: string;
  onTabChange: (tab: string) => void;
}) {
  const qc = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ["auth-user-for-workflow"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 60_000,
  });
  const userId = authData?.id;

  const { data: workflow, isLoading } = useQuery<WorkflowState | null>({
    queryKey: ["deal-room-workflow", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 15_000,
    queryFn: async () => {
      const r = await getDealRoomWorkflow({ data: { deal_room_id: dealRoomId } });
      return r.data ?? null;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["deal-room-workflow", dealRoomId] });

  const stage = workflow?.workflow_stage ?? null;

  if (isLoading) {
    return <div style={{ padding: "24px 0", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Loading workflow…</div>;
  }

  return (
    <div data-testid="stage-aware-overview" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stepper */}
      <WorkflowStepper
        currentStage={stage}
        stageEnteredAt={workflow?.stage_entered_at ?? null}
      />

      {/* Next action */}
      <NextActionCallout
        stage={stage}
        isInvestor={isInvestor}
        workflow={workflow ?? null}
        founderName={founderName}
        onTabChange={onTabChange}
      />

      {/* Stage content */}
      <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "4px 20px 20px" }}>
        {(!stage || stage === "nda_signed") && (
          <Stage1Panel isInvestor={isInvestor} founderName={founderName} onTabChange={onTabChange} />
        )}
        {stage === "stage1_review" && (
          <Stage2Panel isInvestor={isInvestor} dealRoomId={dealRoomId} userId={userId} founderName={founderName} workflow={workflow ?? null} onTabChange={onTabChange} onStageChange={refresh} />
        )}
        {stage === "meetings" && (
          <Stage3Panel isInvestor={isInvestor} dealRoomId={dealRoomId} userId={userId} workflow={workflow ?? null} onTabChange={onTabChange} onStageChange={refresh} />
        )}
        {stage === "stage2_diligence" && (
          <Stage4Panel isInvestor={isInvestor} workflow={workflow ?? null} onTabChange={onTabChange} />
        )}
        {stage === "term_sheet" && (
          <Stage5Panel isInvestor={isInvestor} dealRoomId={dealRoomId} userId={userId} workflow={workflow ?? null} onStageChange={refresh} />
        )}
        {stage === "closed" && (
          <Stage6Panel isInvestor={isInvestor} workflow={workflow ?? null} />
        )}
      </div>

      {/* Archived banner */}
      {stage === "closed" && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 16px", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          This deal room is archived — read-only.
        </div>
      )}
    </div>
  );
}

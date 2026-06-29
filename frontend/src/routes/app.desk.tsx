import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp,
  Loader2, X, MoreHorizontal, RotateCcw,
  Bell, BellOff, Check, ExternalLink, Copy, Lock,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  getDeskTasks, updateDeskTask, updateDeskTaskDraft,
  completeCheckpointTask, type DeskTask, type ChainPhase,
} from "@/lib/desk-fn";

export const Route = createFileRoute("/app/desk")({
  beforeLoad: () => { throw redirect({ to: "/app/overview" }); },
  component: FounderDesk,
});

// ── Phase badge ────────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: ChainPhase }) {
  if (phase === "autonomous_done") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.10)", color: "#10B981", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
        <CheckCircle2 size={10} /> Already done
      </span>
    );
  }
  if (phase === "awaiting_checkpoint") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.12)", color: "#F59E0B", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
        <AlertTriangle size={10} /> Needs your decision
      </span>
    );
  }
  return null;
}

// ── Priority dot ───────────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  const color = priority === "high" ? "#EF4444" : priority === "normal" ? "#F59E0B" : "rgba(255,255,255,0.2)";
  return <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block", marginRight: 2 }} />;
}

// ── Checkpoint email send dialog ───────────────────────────────────────────────

interface SendDialogProps {
  task: DeskTask;
  onSent: () => void;
  onCancel: () => void;
  userId: string;
  senderName: string;
}

function SendDialog({ task, onSent, onCancel, userId, senderName }: SendDialogProps) {
  const [draft, setDraft] = useState(task.draftContent ?? "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail.trim()) { toast.error("Enter the recipient's email address"); return; }
    setSending(true);
    try {
      const result = await completeCheckpointTask({
        data: {
          taskId: task.id,
          userId,
          taskType: task.taskType,
          draftContent: draft,
          recipientEmail: recipientEmail.trim(),
          recipientName: recipientName.trim() || "there",
          senderName,
        },
      });
      if (result.ok) {
        toast.success("Email sent");
        onSent();
      } else {
        toast.error(result.error ?? "Send failed");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}
    >
      <div
        style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 28, maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Review &amp; send</div>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 4 }}><X size={16} /></button>
        </div>

        {task.checkpointReason && (
          <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Why this needs you</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{task.checkpointReason}</div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Recipient email *</label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="investor@fund.com"
            style={{ width: "100%", background: "#0A0A0B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Recipient name</label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Dr Henry"
            style={{ width: "100%", background: "#0A0A0B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Message — edit before sending</label>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            style={{ width: "100%", background: "#0A0A0B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || !recipientEmail.trim()}
            style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: sending || !recipientEmail.trim() ? 0.6 : 1 }}
          >
            {sending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Playbook: visibility card (profile_done_no_visibility) ───────────────────

interface PlaybookVisibilityCardProps {
  task: DeskTask;
  userId: string;
  onRefresh: () => void;
}

function PlaybookVisibilityCard({ task, userId, onRefresh }: PlaybookVisibilityCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeOption, setActiveOption] = useState<"A" | "B" | null>(null);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [acting, setActing] = useState(false);

  let subOptions: any = null;
  try { subOptions = task.draftContent ? JSON.parse(task.draftContent) : null; } catch {}

  const optionA = subOptions?.optionA;
  const optionB = subOptions?.optionB;
  const optionC = subOptions?.optionC;

  const copyPost = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    });
  };

  const dismiss = async () => {
    setActing(true);
    try {
      await updateDeskTask({ data: { taskId: task.id, userId, action: "dismiss" } });
      toast.success("Dismissed");
      onRefresh();
    } catch { toast.error("Action failed"); } finally { setActing(false); }
  };

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }} onClick={() => setExpanded((v) => !v)}>
        <PriorityDot priority={task.priority} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(124,58,237,0.12)", color: "#A855F7", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
              <Sparkles size={10} /> Playbook move
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{task.title}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Pick one option to get started — you can come back to the others later.</div>
        </div>
        {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>

          {/* OPTION A */}
          <div style={{ marginBottom: 10, border: `1px solid ${activeOption === "A" ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: activeOption === "A" ? "rgba(124,58,237,0.06)" : "transparent" }}
              onClick={() => setActiveOption(activeOption === "A" ? null : "A")}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>Option A — {optionA?.label ?? "7 days of content, drafted"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  <span style={{ background: "rgba(16,185,129,0.10)", color: "#10B981", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>Already done</span>
                  {" "}{optionA?.posts?.length ?? 0} posts generated · Copy each to LinkedIn or X
                </div>
              </div>
              {activeOption === "A" ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
            </div>
            {activeOption === "A" && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
                {optionA?.actionNote && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, fontStyle: "italic" }}>{optionA.actionNote}</div>
                )}
                {(optionA?.posts ?? []).map((post: string, i: number) => (
                  <div key={i} style={{ marginBottom: 8, background: "#0A0A0B", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div
                        style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, flex: 1, cursor: "pointer", maxHeight: expandedPost === i ? "none" : 48, overflow: "hidden" }}
                        onClick={() => setExpandedPost(expandedPost === i ? null : i)}
                      >
                        {post}
                      </div>
                      <button
                        onClick={() => copyPost(post, i)}
                        style={{ flexShrink: 0, background: copiedIdx === i ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)", color: copiedIdx === i ? "#10B981" : "rgba(255,255,255,0.5)", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        {copiedIdx === i ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                      </button>
                    </div>
                    {expandedPost !== i && (
                      <button onClick={() => setExpandedPost(i)} style={{ background: "none", border: "none", color: "rgba(124,58,237,0.7)", fontSize: 11, cursor: "pointer", padding: 0, marginTop: 4 }}>Show full post</button>
                    )}
                  </div>
                ))}
                {!optionA?.posts?.length && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Post drafts could not be generated. Try again tomorrow.</div>
                )}
              </div>
            )}
          </div>

          {/* OPTION B */}
          <div style={{ marginBottom: 10, border: `1px solid ${activeOption === "B" ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, overflow: "hidden" }}>
            <div
              style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: activeOption === "B" ? "rgba(245,158,11,0.04)" : "transparent" }}
              onClick={() => setActiveOption(activeOption === "B" ? null : "B")}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>Option B — {optionB?.label ?? "A cold outreach draft"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  <span style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>Needs your review</span>
                  {" "}Personalized to your profile · Edit then use outside the platform
                </div>
              </div>
              {activeOption === "B" ? <ChevronUp size={13} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={13} color="rgba(255,255,255,0.3)" />}
            </div>
            {activeOption === "B" && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px" }}>
                <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#A855F7", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Draft outreach — edit before using</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{optionB?.draft ?? "Draft unavailable."}</div>
                </div>
                {optionB?.draft && (
                  <button
                    onClick={() => { navigator.clipboard.writeText(optionB.draft); toast.success("Draft copied"); }}
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Copy size={11} /> Copy draft
                  </button>
                )}
              </div>
            )}
          </div>

          {/* OPTION C — coming soon */}
          <div style={{ marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, opacity: 0.6 }}>
            <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={11} /> Option C — {optionC?.label ?? "Set up your verification Roast"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {optionC?.comingSoonNote ?? "Coming soon — a short AI-led interview that earns your profile a verified badge. Not yet available."}
                </div>
              </div>
            </div>
          </div>

          <button onClick={dismiss} disabled={acting} style={{ background: "transparent", color: "rgba(255,255,255,0.3)", border: "none", fontSize: 12, cursor: "pointer", padding: "4px 0" }}>
            Dismiss this suggestion
          </button>
        </div>
      )}
    </div>
  );
}

// ── Playbook: traction gap card (getting_seen_no_traction) ────────────────────

interface PlaybookTractionGapCardProps {
  task: DeskTask;
  userId: string;
  onRefresh: () => void;
}

function PlaybookTractionGapCard({ task, userId, onRefresh }: PlaybookTractionGapCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [acting, setActing] = useState(false);

  const dismiss = async () => {
    setActing(true);
    try {
      await updateDeskTask({ data: { taskId: task.id, userId, action: "dismiss" } });
      toast.success("Dismissed");
      onRefresh();
    } catch { toast.error("Action failed"); } finally { setActing(false); }
  };

  // autonomous_summary contains numbered analysis — render with line breaks
  const lines = (task.autonomousSummary ?? "").split("\n").filter(Boolean);

  return (
    <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }} onClick={() => setExpanded((v) => !v)}>
        <PriorityDot priority={task.priority} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(124,58,237,0.12)", color: "#A855F7", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
              <Sparkles size={10} /> Playbook move
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.10)", color: "#10B981", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
              <CheckCircle2 size={10} /> Already done
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{task.title}</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
          {lines.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {lines.map((line, i) => (
                <div key={i} style={{ fontSize: 13, color: i === 0 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.75)", lineHeight: 1.65, marginBottom: i === 0 ? 10 : 8 }}>
                  {line}
                </div>
              ))}
            </div>
          )}
          <button onClick={dismiss} disabled={acting} style={{ background: "transparent", color: "rgba(255,255,255,0.3)", border: "none", fontSize: 12, cursor: "pointer", padding: "4px 0" }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ── Task card (generic) ────────────────────────────────────────────────────────

// ── Task card ──────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: DeskTask;
  userId: string;
  senderName: string;
  onRefresh: () => void;
}

function TaskCard({ task, userId, senderName, onRefresh }: TaskCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [acting, setActing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doAction = async (action: "dismiss" | "done" | "snooze") => {
    setActing(true);
    try {
      await updateDeskTask({ data: { taskId: task.id, userId, action } });
      toast.success(action === "dismiss" ? "Dismissed" : action === "snooze" ? "Snoozed for 24h" : "Marked done");
      onRefresh();
    } catch {
      toast.error("Action failed");
    } finally {
      setActing(false);
      setMenuOpen(false);
    }
  };

  const isCheckpoint = task.chainPhase === "awaiting_checkpoint";
  const isAutonomous = task.chainPhase === "autonomous_done";
  const isSingle = task.chainPhase === "single";

  return (
    <>
      <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
        {/* Card header */}
        <div
          style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}
          onClick={() => setExpanded((v) => !v)}
        >
          <PriorityDot priority={task.priority} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              {!isSingle && <PhaseBadge phase={task.chainPhase} />}
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{task.title}</span>
            </div>
            {task.description && !expanded && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.4, marginTop: 2 }}>{task.description}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {/* Three-dot menu */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                style={{ width: 28, height: 28, borderRadius: 7, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.35)" }}
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", top: 32, right: 0, background: "#18181C", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "5px 4px", minWidth: 160, zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                  <button onClick={() => doAction("done")} style={menuItemStyle}><Check size={12} /> Mark done</button>
                  <button onClick={() => doAction("snooze")} style={menuItemStyle}><BellOff size={12} /> Snooze 24h</button>
                  <button onClick={() => doAction("dismiss")} style={{ ...menuItemStyle, color: "rgba(239,68,68,0.8)" }}><X size={12} /> Dismiss</button>
                </div>
              )}
            </div>
            {expanded ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />}
          </div>
        </div>

        {/* Expanded body */}
        {expanded && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>

            {/* autonomous_done: show what AI did */}
            {(isAutonomous || isSingle) && task.autonomousSummary && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 14 }}>
                {task.autonomousSummary}
              </div>
            )}

            {/* awaiting_checkpoint: show summary + draft */}
            {isCheckpoint && (
              <>
                {task.autonomousSummary && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 12 }}>
                    {task.autonomousSummary}
                  </div>
                )}
                {task.draftContent && (
                  <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#A855F7", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Drafted message — ready to send</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.draftContent}</div>
                  </div>
                )}
                {task.checkpointReason && (
                  <div style={{ fontSize: 11, color: "rgba(245,158,11,0.7)", marginBottom: 14, display: "flex", gap: 5, alignItems: "flex-start" }}>
                    <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Why this needs you: {task.checkpointReason}</span>
                  </div>
                )}
              </>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isCheckpoint && task.taskType === "follow_up_investor" && (
                <button
                  onClick={() => setShowSendDialog(true)}
                  style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Send size={13} /> {task.actionLabel ?? "Send follow-up"}
                </button>
              )}
              {isCheckpoint && task.taskType === "review_access_request" && task.actionUrl && (
                <a
                  href={task.actionUrl}
                  style={{ background: "#7C3AED", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <ExternalLink size={13} /> {task.actionLabel ?? "Review request"}
                </a>
              )}
              {(isAutonomous || isSingle) && task.actionUrl && (
                <a
                  href={task.actionUrl}
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 14px", fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {task.actionLabel ?? "View details"} <ExternalLink size={11} />
                </a>
              )}
              <button
                onClick={() => doAction("dismiss")}
                disabled={acting}
                style={{ background: "transparent", color: "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {showSendDialog && (
        <SendDialog
          task={task}
          userId={userId}
          senderName={senderName}
          onSent={() => { setShowSendDialog(false); onRefresh(); }}
          onCancel={() => setShowSendDialog(false)}
        />
      )}
    </>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  background: "none", border: "none", padding: "7px 12px", borderRadius: 7,
  color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left",
};

// ── Sidebar advisor chat ───────────────────────────────────────────────────────

interface SidebarAdvisorProps {
  userId: string;
  startupId: string | null;
  contextBlock: string;
}

function SidebarAdvisor({ userId, startupId, contextBlock }: SidebarAdvisorProps) {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; content: string; id: string }>>([
    { id: "m0", role: "assistant", content: "Ask me anything about your tasks, follow-ups, or deal strategy." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    setInput("");
    setMsgs((xs) => [...xs, { id: `u${Date.now()}`, role: "user", content: t }]);
    setThinking(true);
    try {
      const history = msgs.slice(-6).map((m) => ({ role: m.role as string, content: m.content }));
      const result = await getAIAdvice({ data: { userId, message: t, history, liveContextBlock: contextBlock } });
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: result.reply }]);
    } catch {
      setMsgs((xs) => [...xs, { id: `a${Date.now()}`, role: "assistant", content: "Request failed. Try again." }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0D0D10", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #7C3AED, #A855F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={13} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>AI Advisor</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Context-aware</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {msgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 10, display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 6 }}>
            <div style={{ maxWidth: "85%", borderRadius: m.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", padding: "8px 11px", background: m.role === "user" ? "linear-gradient(135deg,#7C3AED,#A855F7)" : "#18181C", fontSize: 12, color: "#FAFAFA", lineHeight: 1.55 }}>
              <div className="[&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-3">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <div style={{ padding: "8px 11px", background: "#18181C", borderRadius: "4px 14px 14px 14px", fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} style={{ display: "flex", gap: 6, background: "#111114", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "6px 8px 6px 12px" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder="Ask a question…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", resize: "none", fontSize: 12, color: "#FAFAFA", lineHeight: 1.5, maxHeight: 80 }}
          />
          <button type="submit" disabled={!input.trim() || thinking} style={{ width: 28, height: 28, borderRadius: 7, background: input.trim() && !thinking ? "#7C3AED" : "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Send size={12} color={input.trim() && !thinking ? "#fff" : "rgba(255,255,255,0.3)"} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Task router ────────────────────────────────────────────────────────────────

function renderTask(t: DeskTask, userId: string, senderName: string, onRefresh: () => void) {
  if (t.taskType === "playbook_visibility") {
    return <PlaybookVisibilityCard key={t.id} task={t} userId={userId} onRefresh={onRefresh} />;
  }
  if (t.taskType === "playbook_traction_gap") {
    return <PlaybookTractionGapCard key={t.id} task={t} userId={userId} onRefresh={onRefresh} />;
  }
  return <TaskCard key={t.id} task={t} userId={userId} senderName={senderName} onRefresh={onRefresh} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

function FounderDesk() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ["desk-tasks", user?.id, "founder"],
    enabled: !!user?.id,
    queryFn: () => getDeskTasks({ data: { userId: user!.id, role: "founder" } }),
  });

  const { data: resolvedTasks = [] } = useQuery({
    queryKey: ["desk-tasks-resolved", user?.id, "founder"],
    enabled: !!user?.id,
    queryFn: async () => {
      // Client-side query for resolved tasks (anon key is fine — RLS is user-scoped)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("desk_tasks")
        .select("*")
        .eq("user_id", user!.id)
        .eq("role", "founder")
        .eq("status", "done")
        .gte("completed_at", sevenDaysAgo)
        .order("completed_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const senderName = user?.fullName ?? user?.email?.split("@")[0] ?? "Founder";
  const onRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["desk-tasks", user?.id, "founder"] });
    queryClient.invalidateQueries({ queryKey: ["desk-tasks-resolved", user?.id, "founder"] });
  };

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const highPriority = tasks.filter((t) => t.priority === "high");
  const normalPriority = tasks.filter((t) => t.priority !== "high");

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, background: "#0A0A0B", overflow: "hidden" }}>
      {/* Main desk panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {/* Header */}
        <div style={{ maxWidth: 680, marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Daily Desk</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif", marginBottom: 2 }}>{today}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            {isLoading ? "Loading…" : tasks.length === 0 ? "All clear — no tasks right now." : `${tasks.length} task${tasks.length !== 1 ? "s" : ""} need${tasks.length === 1 ? "s" : ""} your attention`}
          </div>
        </div>

        {isLoading ? (
          <div style={{ maxWidth: 680 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ background: "#111114", borderRadius: 12, height: 80, marginBottom: 12, opacity: 0.5, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState resolvedCount={resolvedTasks.length} />
        ) : (
          <div style={{ maxWidth: 680 }}>
            {highPriority.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>High priority</div>
                {highPriority.map((t) => renderTask(t, user!.id, senderName, onRefresh))}
                {normalPriority.length > 0 && <div style={{ height: 8 }} />}
              </>
            )}
            {normalPriority.length > 0 && (
              <>
                {highPriority.length > 0 && <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Other tasks</div>}
                {normalPriority.map((t) => renderTask(t, user!.id, senderName, onRefresh))}
              </>
            )}
          </div>
        )}

        {/* Recently resolved */}
        {resolvedTasks.length > 0 && (
          <div style={{ maxWidth: 680, marginTop: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Recently resolved</div>
            {resolvedTasks.map((t: any) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, marginBottom: 6 }}>
                <CheckCircle2 size={13} color="rgba(16,185,129,0.5)" />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flex: 1 }}>{t.title}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  {t.completed_at ? new Date(t.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function EmptyState({ resolvedCount }: { resolvedCount: number }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ background: "#111114", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle2 size={22} color="#10B981" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>All clear</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 16 }}>
          No tasks right now. The AI advisor runs nightly and will surface new items when there's something worth your attention.
        </div>
        {resolvedCount > 0 && (
          <div style={{ fontSize: 12, color: "rgba(16,185,129,0.6)" }}>{resolvedCount} task{resolvedCount !== 1 ? "s" : ""} resolved this week</div>
        )}
      </div>
    </div>
  );
}

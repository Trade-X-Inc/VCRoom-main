import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2, Download, X, MessagesSquare, Eye, Building2,
  ChevronUp, ChevronDown, Pencil, Plus, Loader2, Upload, Sparkles, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useDealRoom } from "@/hooks/useDealRoom";
import { MutualDisclosure } from "@/components/app/MutualDisclosure";
import { LcsEmptyState, LcsButton, LcsStatusPill, type LcsStatus } from "@/components/lcs";

export const Route = createFileRoute("/app/deal-rooms/$id/information")({
  component: InformationPage,
});

const DEFAULT_PROFILE_SECTIONS = [
  { key: "executive_summary", label: "Executive Summary" },
  { key: "team", label: "Team" },
  { key: "problem_solution", label: "Problem & Solution" },
  { key: "market", label: "Market (TAM/SAM/SOM)" },
  { key: "revenue_traction", label: "Revenue & Traction" },
  { key: "legal", label: "Legal & Registration" },
];

function InformationPage() {
  const { dealRoomId, startupId, isInvestor, isFounder, userId, investorUserId, room, doRequestNextStage: onRequestNextStage, stageRequesting } = useDealRoom();
  const queryClient = useQueryClient();
  const startup = room?.startups;

  // NDA document/signer queries removed 13 Aug 2026 alongside this page's
  // duplicate NDA panel — the room overview holds the canonical copy and
  // its own queries. See the removal note further down and CLAUDE.md §20.9.

  // ── Pinned Q&A Reports ──
  const [qaReportModalOpen, setQaReportModalOpen] = useState<string | null>(null);
  const { data: vaultQaReports = [] } = useQuery({
    queryKey: ["vault-documents", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .eq("category", "qa_report")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // ── Section 1: Digital Profiles ──
  const [profilesOpen, setProfilesOpen] = useState(true);

  const { data: profileSections = [] } = useQuery({
    queryKey: ["startup-profile-sections", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase
        .from("startup_profile_sections")
        .select("*")
        .eq("startup_id", startupId!)
        .in("visibility", ["deal_room", "public"])
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  // ── Section 2: Document Requests ──
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqDesc, setReqDesc] = useState("");
  const [reqCategory, setReqCategory] = useState("Financial");
  const [reqCreating, setReqCreating] = useState(false);
  const [respondingReqId, setRespondingReqId] = useState<string | null>(null);
  const [declineMode, setDeclineMode] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data: docRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["iv-doc-requests", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_document_requests")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: startupRow } = useQuery({
    queryKey: ["startup-founder-id", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data } = await supabase.from("startups").select("founder_id").eq("id", startupId!).maybeSingle();
      return data;
    },
  });
  const startupFounderId = startupRow?.founder_id ?? null;

  const submitDocRequest = async () => {
    if (!reqName.trim() || !userId) return;
    setReqCreating(true);
    try {
      const requestedFrom = isInvestor ? startupFounderId : investorUserId;
      const { error } = await supabase.from("deal_room_document_requests").insert({
        deal_room_id: dealRoomId,
        requested_by: userId,
        requested_from: requestedFrom,
        document_name: reqName.trim(),
        document_description: reqDesc.trim() || null,
        category: reqCategory,
        status: "pending",
      });
      if (error) throw error;
      setReqName(""); setReqDesc(""); setReqCategory("Financial");
      setShowReqForm(false);
      await refetchRequests();
      toast.success("Document requested");
    } catch {
      toast.error("Could not create request");
    } finally {
      setReqCreating(false);
    }
  };

  const declineRequest = async (reqId: string) => {
    if (!declineReason.trim()) return;
    setRespondingReqId(reqId);
    try {
      const { error } = await supabase.from("deal_room_document_requests").update({
        status: "declined",
        decline_reason: declineReason.trim(),
        responded_at: new Date().toISOString(),
      }).eq("id", reqId);
      if (error) throw error;
      setDeclineMode(null);
      setDeclineReason("");
      await refetchRequests();
      toast.success("Declined");
    } finally {
      setRespondingReqId(null);
    }
  };

  // ── Section 4: Notes ──
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"private" | "shared">("private");
  const [noteSaving, setNoteSaving] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["iv-notes", dealRoomId, userId, isInvestor],
    enabled: !!dealRoomId && !!userId,
    queryFn: async () => {
      let q = supabase
        .from("deal_room_notes")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false });
      if (isInvestor) q = q.eq("user_id", userId);
      else q = (q as any).eq("visibility", "shared");
      const { data } = await q;
      return data ?? [];
    },
  });

  const saveNote = async () => {
    if (!noteContent.trim() || !userId) return;
    setNoteSaving(true);
    try {
      const { error } = await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId,
        user_id: userId,
        title: noteTitle.trim() || null,
        content: noteContent.trim(),
        visibility: noteVisibility,
        ai_generated: false,
      });
      if (error) throw error;
      setNoteTitle(""); setNoteContent(""); setNoteVisibility("private");
      setShowNoteForm(false);
      await refetchNotes();
      toast.success("Note saved");
    } catch {
      toast.error("Could not save note");
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("deal_room_notes").delete().eq("id", noteId);
    if (error) { console.error("[information] delete note failed:", error); toast.error("Could not delete note."); return; }
    await refetchNotes();
  };

  // ── Roast record ──
  const { data: roastRecord = [] } = useQuery({
    queryKey: ["deal-room-roast-record", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_sessions")
        .select("id, level, status, badge_awarded, scheduled_at")
        .eq("startup_id", startupId!)
        .in("status", ["completed", "expired"])
        .order("scheduled_at", { ascending: false });
      if (error) { console.error("[information] roast record fetch failed:", error); return []; }
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6" style={{ fontFamily: "var(--font-lcs-ui)" }}>
      <MutualDisclosure />

      {roastRecord.length > 0 && (
        <div className="border p-5" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <div className="text-sm font-semibold mb-2" style={{ color: "var(--lcs-ink)" }}>
            Roast record
          </div>
          <div className="space-y-2">
            {roastRecord.map((r: any) => {
              // Genuine 2-state signal (completed = good, expired = bad) —
              // mapped onto satisfied/attention, no forced adverse tone, per
              // Group 6 Phase-0 decision 5's palette-collapse rule.
              const isDone = r.status === "completed";
              return (
                <a
                  key={r.id}
                  href={`/roast/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm border transition-opacity hover:opacity-80"
                  style={{ borderRadius: "var(--radius-lcs-control)", background: isDone ? "var(--lcs-satisfied-wash)" : "var(--lcs-attention-wash)", borderColor: isDone ? "var(--lcs-satisfied)" : "var(--lcs-attention)" }}
                >
                  <span style={{ color: "var(--lcs-ink)" }}>
                    {isDone
                      ? `Completed a Level ${r.level} Roast — every public question answered on the record`
                      : `Level ${r.level} Roast expired incomplete — public questions left unanswered`}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: "var(--lcs-ink-muted)" }}>
                    {new Date(r.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · view →
                  </span>
                </a>
              );
            })}
          </div>
          {isInvestor && (
            <p className="text-xs mt-2" style={{ color: "var(--lcs-ink-muted)" }}>
              The Roast report's credibility flags feed the confrontational DD analysis automatically.
            </p>
          )}
        </div>
      )}

      {/* NDA panel removed 13 Aug 2026 — it duplicated the room overview's
          NDA & confidentiality panel exactly (same fetchNdaDocument call,
          same nda_acceptances read, same signer list, same view/print
          affordances) across two permanently-adjacent, always-unlocked
          tabs. Overview is canonical: it holds the only .nda-print-content
          block in the codebase, so its Download PDF actually prints. This
          copy's two print buttons called window.print() against a print
          stylesheet that hides everything except a target this page never
          rendered — producing a blank page. Removing the duplicate also
          removes that live defect. See CLAUDE.md §20.9. */}

      {(vaultQaReports as any[]).map((report) => {
        const reportDate = new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const headerMatch = (report.report_text ?? "").match(/Questions:\s*(\d+)\s*\|\s*Answered:\s*(\d+)/);
        const totalQs = headerMatch ? headerMatch[1] : "—";
        const answeredQs = headerMatch ? headerMatch[2] : "—";
        const isOpen = qaReportModalOpen === report.id;

        return (
          <div key={report.id} className="border overflow-hidden" style={{ borderColor: "var(--lcs-satisfied)", background: "var(--lcs-white)" }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 flex items-center justify-center shrink-0" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-satisfied-wash)" }}>
                  <MessagesSquare className="h-4 w-4" style={{ color: "var(--lcs-satisfied)" }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Q&amp;A Report</span>
                    <LcsStatusPill status="satisfied" label="Complete" />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>
                    {reportDate} · {totalQs} questions · {answeredQs} answered
                  </div>
                </div>
              </div>
              <LcsButton variant="secondary" onClick={() => setQaReportModalOpen(isOpen ? null : report.id)}>
                <Eye className="h-3.5 w-3.5" /> View report
              </LcsButton>
            </div>

            {isOpen && report.report_text && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={() => setQaReportModalOpen(null)}
              >
                <div
                  className="w-full max-w-2xl max-h-[85vh] border flex flex-col"
                  style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--lcs-line)" }}>
                    <div className="flex items-center gap-3">
                      <MessagesSquare className="h-5 w-5" style={{ color: "var(--lcs-satisfied)" }} />
                      <div>
                        <div className="font-semibold text-sm" style={{ color: "var(--lcs-ink)" }}>Q&amp;A Report</div>
                        <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{reportDate} · {totalQs} questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <LcsButton variant="secondary" onClick={() => window.print()} className="qa-report-print-trigger">
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </LcsButton>
                      <LcsButton variant="text-link" onClick={() => setQaReportModalOpen(null)}>
                        <X className="h-4 w-4" />
                      </LcsButton>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans qa-report-content" style={{ color: "var(--lcs-ink-muted)" }}>
                      {report.report_text}
                    </pre>
                  </div>
                </div>
                <div className="qa-report-print-content hidden print:block">
                  <pre className="whitespace-pre-wrap">{report.report_text}</pre>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
        <button
          onClick={() => setProfilesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--lcs-progress-wash)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center" style={{ borderRadius: "var(--radius-lcs-control)", background: "var(--lcs-progress-wash)" }}>
              <Building2 className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Digital Profiles</div>
              {!profilesOpen && (
                <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>
                  {startup?.company_name ?? "—"} {startup?.tagline ? `· ${startup.tagline}` : ""}
                </div>
              )}
            </div>
          </div>
          {profilesOpen ? <ChevronUp className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "var(--lcs-ink-muted)" }} />}
        </button>

        {profilesOpen && (
          <div className="px-6 pb-6 border-t" style={{ borderColor: "var(--lcs-line)" }}>
            {(profileSections as any[]).length === 0 ? (
              <div className="mt-4 space-y-2">
                {DEFAULT_PROFILE_SECTIONS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between border px-4 py-3" style={{ borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}>
                    <span className="text-sm font-medium" style={{ color: "var(--lcs-ink-muted)" }}>{s.label}</span>
                    <span className="text-xs italic" style={{ color: "var(--lcs-ink-muted)" }}>Not added</span>
                  </div>
                ))}
                {isFounder && (
                  <p className="text-xs mt-3" style={{ color: "var(--lcs-ink-muted)" }}>
                    Add profile sections in your <Link to="/app/documents" className="hover:underline" style={{ color: "var(--lcs-accent)" }}>Documents page</Link>.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(profileSections as any[]).map((sec: any) => (
                  <div key={sec.id} className="border px-4 py-3" style={{ borderColor: "var(--lcs-line)", borderRadius: "var(--radius-lcs-control)" }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{sec.section_label}</span>
                      <div className="flex items-center gap-2">
                        {/* Genuine 2-state visibility signal, mapped onto
                            satisfied/in-progress — public is the "done, live"
                            state, deal-room-only is the narrower in-progress
                            state, no forced adverse tone. */}
                        <LcsStatusPill
                          status={sec.visibility === "public" ? "satisfied" : "in-progress"}
                          label={sec.visibility === "public" ? "Public" : "Deal Room"}
                          dot={false}
                        />
                        {isFounder && (
                          <button className="grid h-6 w-6 place-items-center" style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }} onClick={() => console.log("edit section — Claude Code will wire")}>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {sec.content && (
                      <div className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
                        {typeof sec.content === "object" && sec.content !== null
                          ? (sec.content.text
                            ? <p>{sec.content.text}</p>
                            : Object.entries(sec.content).map(([k, v]) => (
                              <div key={k} className="flex gap-1.5 text-xs">
                                <span className="font-medium shrink-0" style={{ color: "var(--lcs-ink-muted)" }}>{k}:</span>
                                <span>{String(v)}</span>
                              </div>
                            ))
                          )
                          : <p>{String(sec.content)}</p>
                        }
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--lcs-line)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Document Requests</span>
            {(docRequests as any[]).length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium" style={{ borderRadius: "9999px", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}>
                {(docRequests as any[]).length}
              </span>
            )}
          </div>
          {isInvestor && (
            <LcsButton variant="primary" onClick={() => setShowReqForm((v) => !v)} data-testid="iv-new-request-btn">
              <Plus className="h-3.5 w-3.5" /> New request
            </LcsButton>
          )}
        </div>

        {showReqForm && (
          <div className="px-6 py-4 border-b space-y-3" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)" }}>
            <input
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              placeholder="Document name (e.g. Cap table, Bank statement)"
              className="w-full border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
              data-testid="iv-req-name"
            />
            <textarea
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              rows={2}
              placeholder="Why you need this document (optional)"
              className="w-full border px-3 py-2.5 text-sm outline-none resize-none"
              style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
            />
            <select
              value={reqCategory}
              onChange={(e) => setReqCategory(e.target.value)}
              className="w-full border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
              data-testid="iv-req-category"
            >
              {["Financial", "Legal", "Team", "Product", "Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <LcsButton variant="secondary" onClick={() => { setShowReqForm(false); setReqName(""); setReqDesc(""); }}>
                Cancel
              </LcsButton>
              <LcsButton variant="primary" onClick={submitDocRequest} disabled={!reqName.trim() || reqCreating} data-testid="iv-req-submit">
                {reqCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
              </LcsButton>
            </div>
          </div>
        )}

        <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
          {(docRequests as any[]).length === 0 ? (
            <LcsEmptyState text="No document requests yet." />
          ) : (
            (docRequests as any[]).map((req: any) => {
              // Genuine 3-state vocabulary (pending/fulfilled/declined) —
              // direct 1:1 mapping onto pending/satisfied/attention, no
              // forced adverse tone, per Group 6 Phase-0 decision 5.
              // "provided" is a legacy synonym for "fulfilled" (same status
              // family, not a 4th state).
              const statusMap: Record<string, { label: string; status: LcsStatus }> = {
                pending: { label: "Pending", status: "pending" },
                fulfilled: { label: "Fulfilled", status: "satisfied" },
                provided: { label: "Fulfilled", status: "satisfied" },
                declined: { label: "Declined", status: "attention" },
              };
              const pill = statusMap[req.status] ?? statusMap.pending;
              const canFounderRespond = isFounder && req.status === "pending" && req.requested_from === userId;

              return (
                <div key={req.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>{req.document_name}</span>
                        {req.category && (
                          <span className="px-2 py-0.5 text-[10px] font-medium" style={{ borderRadius: "9999px", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}>
                            {req.category}
                          </span>
                        )}
                      </div>
                      {req.document_description && (
                        <p className="mt-0.5 text-xs line-clamp-1" style={{ color: "var(--lcs-ink-muted)" }}>{req.document_description}</p>
                      )}
                      {req.decline_reason && (
                        <p className="mt-1 text-xs" style={{ color: "var(--lcs-attention)" }}>Declined: {req.decline_reason}</p>
                      )}
                    </div>
                    <LcsStatusPill status={pill.status} label={pill.label} />
                  </div>

                  {canFounderRespond && declineMode !== req.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--lcs-progress-wash)]" style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}>
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                        <input type="file" className="sr-only" onChange={() => console.log("upload — Claude Code will wire")} />
                      </label>
                      <LcsButton variant="destructive" onClick={() => { setDeclineMode(req.id); setDeclineReason(""); }}>
                        Decline
                      </LcsButton>
                    </div>
                  )}

                  {declineMode === req.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        rows={2}
                        placeholder="Reason for declining"
                        className="w-full border px-3 py-2 text-xs outline-none resize-none"
                        style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                      />
                      <div className="flex gap-2">
                        <LcsButton variant="secondary" onClick={() => setDeclineMode(null)}>Cancel</LcsButton>
                        <LcsButton
                          variant="destructive"
                          onClick={() => declineRequest(req.id)}
                          disabled={!declineReason.trim() || respondingReqId === req.id}
                        >
                          {respondingReqId === req.id ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Submit"}
                        </LcsButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="border px-6 py-4 flex items-center justify-between" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
        <span className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>Documents & links have moved to their own tab.</span>
        <Link
          to={"/app/deal-rooms/$id/documents" as any}
          params={{ id: dealRoomId }}
          className="inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--lcs-progress-wash)]"
          style={{ borderColor: "var(--lcs-line)", color: "var(--lcs-accent)", borderRadius: "var(--radius-lcs-control)" }}
        >
          Open Documents →
        </Link>
      </div>

      {isInvestor && (
        <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--lcs-line)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>My Notes</span>
            <LcsButton variant="primary" onClick={() => setShowNoteForm((v) => !v)} data-testid="iv-add-note-btn">
              <Plus className="h-3.5 w-3.5" /> Add note
            </LcsButton>
          </div>

          {showNoteForm && (
            <div className="px-6 py-4 border-b space-y-3" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)" }}>
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title"
                className="w-full border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                placeholder="Write your notes here..."
                className="w-full border px-3 py-2.5 text-sm outline-none resize-none"
                style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={noteVisibility}
                  onChange={(e) => setNoteVisibility(e.target.value as "private" | "shared")}
                  className="border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                >
                  <option value="private">Private (only me)</option>
                  <option value="shared">Share with founder</option>
                </select>
                <LcsButton variant="secondary" onClick={() => console.log("AI note generation — Claude Code will wire")}>
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </LcsButton>
                <div className="ml-auto flex items-center gap-2">
                  <LcsButton variant="secondary" onClick={() => setShowNoteForm(false)}>Cancel</LcsButton>
                  <LcsButton variant="primary" onClick={saveNote} disabled={!noteContent.trim() || noteSaving} data-testid="iv-save-note-btn">
                    {noteSaving ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </LcsButton>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
            {(notes as any[]).length === 0 ? (
              <LcsEmptyState text="No notes yet." />
            ) : (
              (notes as any[]).map((note: any) => (
                <div key={note.id} className="px-6 py-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {note.title && <div className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)" }}>{note.title}</div>}
                      <p className={cn("text-sm whitespace-pre-wrap", expandedNoteId !== note.id && "line-clamp-2")} style={{ color: "var(--lcs-ink-muted)" }}>
                        {note.content}
                      </p>
                      {note.content?.length > 120 && (
                        <button
                          onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                          className="text-xs mt-1 hover:underline"
                          style={{ color: "var(--lcs-accent)" }}
                        >
                          {expandedNoteId === note.id ? "Show less" : "Show more"}
                        </button>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        {/* Genuine 2-state visibility signal — shared/private —
                            mapped onto satisfied/pending, no forced adverse. */}
                        <LcsStatusPill
                          status={note.visibility === "shared" ? "satisfied" : "pending"}
                          label={note.visibility === "shared" ? "Shared" : "Private"}
                          dot={false}
                        />
                        <span className="text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="hidden group-hover:grid h-7 w-7 place-items-center"
                      style={{ borderRadius: "var(--radius-lcs-control)", color: "var(--lcs-ink-muted)" }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isFounder && (
        <div className="border overflow-hidden" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--lcs-line)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Notes from investor</span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--lcs-line)" }}>
            {(notes as any[]).length === 0 ? (
              <LcsEmptyState text="No shared notes yet." />
            ) : (
              (notes as any[]).map((note: any) => (
                <div key={note.id} className="px-6 py-4">
                  {note.title && <div className="text-sm font-semibold mb-1" style={{ color: "var(--lcs-ink)" }}>{note.title}</div>}
                  <p className="text-sm line-clamp-2 whitespace-pre-wrap" style={{ color: "var(--lcs-ink-muted)" }}>{note.content}</p>
                  <div className="mt-2 text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* The "Decision" control (Pass/Withdraw/Pause + reason) was removed
          13 Aug 2026. Its submit handler was a console.log — it wrote
          nothing, anywhere, and nothing read a decision it could have
          produced. A control that looks functional and silently does
          nothing is the same class of defect as the 0-row silent write
          already fixed in this group (§7.4), just at the UI layer.
          Removed rather than wired, per the standing preference for
          deleting an unused control over keeping it against unclear
          future intent (the triggerDeskCron precedent, §7.4). The real
          decision path is /app/investor/decisions, which writes the
          decisions table properly. The product gap this leaves — no
          in-room decline path with a recorded reason — is logged in
          CLAUDE.md §20.2, and is the same gap §20.1's open item (5)
          already tracks for passDeal. "Request next stage" below is
          untouched: it is a real, authorized action. */}
      <div className="border px-6 py-5" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
        <div className="flex items-center justify-end gap-4 flex-wrap">
          <LcsButton
            variant="primary"
            onClick={onRequestNextStage}
            disabled={stageRequesting}
            data-testid="info-vault-next-stage"
          >
            {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Request next stage →
          </LcsButton>
        </div>
      </div>
    </div>
  );
}

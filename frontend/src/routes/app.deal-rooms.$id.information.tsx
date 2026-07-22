import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Shield, CheckCircle2, Clock, Download, X, MessagesSquare, Eye, Building2,
  ChevronUp, ChevronDown, Pencil, Plus, Loader2, Upload, Sparkles, Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchNdaDocument, type NdaDocument } from "@/lib/nda-fn";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { EmptyState } from "@/components/system";
import { useDealRoom } from "@/hooks/useDealRoom";
import { MutualDisclosure } from "@/components/app/MutualDisclosure";

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

  // ── Pinned NDA document ──
  const [vaultNdaModalOpen, setVaultNdaModalOpen] = useState(false);

  const { data: vaultNdaDoc } = useQuery<NdaDocument | null>({
    queryKey: ["nda-document", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => fetchNdaDocument({ data: { dealRoomId } }),
  });

  const { data: vaultNdaSigners = [] } = useQuery({
    queryKey: ["nda-acceptances-vault", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("nda_acceptances")
        .select("signer_full_name, signer_company, role, accepted_at")
        .eq("deal_room_id", dealRoomId)
        .order("accepted_at", { ascending: true });
      return data ?? [];
    },
  });

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

  // ── Section 5: Decision state ──
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionOutcome, setDecisionOutcome] = useState("Pass");
  const [decisionReason, setDecisionReason] = useState("");

  const submitDecision = () => {
    console.log("submitDecision — information:", decisionOutcome, decisionReason);
    setShowDecisionForm(false);
    setDecisionReason("");
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
    <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6">
      <MutualDisclosure />

      {roastRecord.length > 0 && (
        <div className="rounded-none border border-border/60 bg-card p-5">
          <div className="text-sm font-semibold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>
            🔥 Roast record
          </div>
          <div className="space-y-2">
            {roastRecord.map((r: any) => (
              <a
                key={r.id}
                href={`/roast/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm border transition-opacity hover:opacity-80"
                style={r.status === "completed"
                  ? { background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.25)" }
                  : { background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }}
              >
                <span>
                  {r.status === "completed"
                    ? `Completed a Level ${r.level} Roast — every public question answered on the record`
                    : `Level ${r.level} Roast expired incomplete — public questions left unanswered`}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(r.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · view →
                </span>
              </a>
            ))}
          </div>
          {isInvestor && (
            <p className="text-xs text-muted-foreground mt-2">
              The Roast report's credibility flags feed the confrontational DD analysis automatically.
            </p>
          )}
        </div>
      )}

      <div
        className={cn(
          "rounded-none border overflow-hidden",
          vaultNdaDoc
            ? "bg-white border-[rgba(16,185,129,0.3)]"
            : "bg-white border-[rgba(0,0,0,0.08)]",
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              vaultNdaDoc
                ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)]"
                : "bg-gray-100 border border-[rgba(0,0,0,0.08)]",
            )}>
              <Shield className={cn("h-4 w-4", vaultNdaDoc ? "text-[#10B981]" : "text-[#71717A]")} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Non-Disclosure Agreement</span>
                {vaultNdaDoc ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.12)] text-[#10B981] text-[10px] font-semibold px-2 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Signed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent text-muted-foreground text-[10px] font-semibold px-2 py-0.5">
                    <Clock className="h-3 w-3" /> Pending
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {vaultNdaDoc
                  ? `${vaultNdaSigners.length} ${vaultNdaSigners.length === 1 ? "party" : "parties"} bound · v${vaultNdaDoc.version} · System generated`
                  : "Auto-generated once all parties sign"}
              </div>
            </div>
          </div>
          {vaultNdaDoc && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setVaultNdaModalOpen(true)}
                className="text-xs text-gray-500 hover:text-gray-900 border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-1.5 transition-colors"
              >
                View NDA
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-xs border border-[rgba(0,0,0,0.08)] rounded-lg px-3 py-1.5 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          )}
        </div>
        {vaultNdaDoc && vaultNdaSigners.length > 0 && (
          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {(vaultNdaSigners as any[]).map((s, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-[rgba(0,0,0,0.08)] px-3 py-1 text-xs">
                <CheckCircle2 className="h-3 w-3 text-[#10B981] shrink-0" />
                <span className="font-medium text-gray-900">{s.signer_full_name}</span>
                <span className="text-[#71717A]">· {s.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {vaultNdaModalOpen && vaultNdaDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden"
          onClick={() => setVaultNdaModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-card border border-border/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[#10B981]" />
                <div>
                  <div className="font-semibold text-sm text-foreground">Non-Disclosure Agreement</div>
                  <div className="text-xs text-muted-foreground">
                    v{vaultNdaDoc.version} · {vaultNdaSigners.length} {vaultNdaSigners.length === 1 ? "party" : "parties"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 text-xs bg-accent hover:bg-accent text-brand border border-brand/20 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => setVaultNdaModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans">
                {vaultNdaDoc.nda_text}
              </pre>
            </div>
          </div>
        </div>
      )}

      {(vaultQaReports as any[]).map((report) => {
        const reportDate = new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const headerMatch = (report.report_text ?? "").match(/Questions:\s*(\d+)\s*\|\s*Answered:\s*(\d+)/);
        const totalQs = headerMatch ? headerMatch[1] : "—";
        const answeredQs = headerMatch ? headerMatch[2] : "—";
        const isOpen = qaReportModalOpen === report.id;

        return (
          <div key={report.id} className="rounded-none border border-[rgba(16,185,129,0.3)] bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] flex items-center justify-center shrink-0">
                  <MessagesSquare className="h-4 w-4 text-[#10B981]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Q&amp;A Report</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(16,185,129,0.12)] text-[#10B981] text-[10px] font-semibold px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {reportDate} · {totalQs} questions · {answeredQs} answered
                  </div>
                </div>
              </div>
              <button
                onClick={() => setQaReportModalOpen(isOpen ? null : report.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5" /> View report
              </button>
            </div>

            {isOpen && report.report_text && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                onClick={() => setQaReportModalOpen(null)}
              >
                <div
                  className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border/60 bg-card shadow-elev flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
                    <div className="flex items-center gap-3">
                      <MessagesSquare className="h-5 w-5 text-[#10B981]" />
                      <div>
                        <div className="font-semibold text-sm text-foreground">Q&amp;A Report</div>
                        <div className="text-xs text-muted-foreground">{reportDate} · {totalQs} questions</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 text-xs bg-accent hover:bg-accent text-brand border border-brand/20 rounded-lg px-3 py-1.5 transition-colors qa-report-print-trigger"
                      >
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </button>
                      <button
                        onClick={() => setQaReportModalOpen(null)}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <pre className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap font-sans qa-report-content">
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

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
        <button
          onClick={() => setProfilesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <Building2 className="h-4 w-4 text-brand" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Digital Profiles</div>
              {!profilesOpen && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {startup?.company_name ?? "—"} {startup?.tagline ? `· ${startup.tagline}` : ""}
                </div>
              )}
            </div>
          </div>
          {profilesOpen ? <ChevronUp className="h-4 w-4 text-[#71717A]" /> : <ChevronDown className="h-4 w-4 text-[#71717A]" />}
        </button>

        {profilesOpen && (
          <div className="px-6 pb-6 border-t border-[rgba(0,0,0,0.08)]">
            {(profileSections as any[]).length === 0 ? (
              <div className="mt-4 space-y-2">
                {DEFAULT_PROFILE_SECTIONS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-3">
                    <span className="text-sm font-medium text-[#71717A]">{s.label}</span>
                    <span className="text-xs text-[#71717A] italic">Not added</span>
                  </div>
                ))}
                {isFounder && (
                  <p className="text-xs text-[#71717A] mt-3">
                    Add profile sections in your <Link to="/app/documents" className="text-brand hover:underline">Documents page</Link>.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {(profileSections as any[]).map((sec: any) => (
                  <div key={sec.id} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-900">{sec.section_label}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-medium rounded-full px-2 py-0.5",
                          sec.visibility === "public"
                            ? "bg-green-50 text-green-700"
                            : "bg-accent text-brand"
                        )}>
                          {sec.visibility === "public" ? "Public" : "Deal Room"}
                        </span>
                        {isFounder && (
                          <button className="grid h-6 w-6 place-items-center rounded text-[#71717A] hover:text-gray-600" onClick={() => console.log("edit section — Claude Code will wire")}>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {sec.content && (
                      <div className="text-sm text-gray-600">
                        {typeof sec.content === "object" && sec.content !== null
                          ? (sec.content.text
                            ? <p>{sec.content.text}</p>
                            : Object.entries(sec.content).map(([k, v]) => (
                              <div key={k} className="flex gap-1.5 text-xs">
                                <span className="font-medium text-gray-500 shrink-0">{k}:</span>
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

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Document Requests</span>
            {(docRequests as any[]).length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {(docRequests as any[]).length}
              </span>
            )}
          </div>
          {isInvestor && (
            <button
              onClick={() => setShowReqForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground"
              style={{ background: "var(--gradient-brand)" }}
              data-testid="iv-new-request-btn"
            >
              <Plus className="h-3.5 w-3.5" /> New request
            </button>
          )}
        </div>

        {showReqForm && (
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.08)] bg-gray-50 space-y-3">
            <input
              value={reqName}
              onChange={(e) => setReqName(e.target.value)}
              placeholder="Document name (e.g. Cap table, Bank statement)"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
              data-testid="iv-req-name"
            />
            <textarea
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              rows={2}
              placeholder="Why you need this document (optional)"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none resize-none focus:border-brand"
            />
            <select
              value={reqCategory}
              onChange={(e) => setReqCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
              data-testid="iv-req-category"
            >
              {["Financial", "Legal", "Team", "Product", "Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setShowReqForm(false); setReqName(""); setReqDesc(""); }} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-[rgba(0,0,0,0.08)]">
                Cancel
              </button>
              <button
                onClick={submitDocRequest}
                disabled={!reqName.trim() || reqCreating}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-brand)" }}
                data-testid="iv-req-submit"
              >
                {reqCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {(docRequests as any[]).length === 0 ? (
            <EmptyState kind="empty" title="No requests" />
          ) : (
            (docRequests as any[]).map((req: any) => {
              const statusMap: Record<string, { label: string; cls: string }> = {
                pending: { label: "Pending", cls: "bg-amber-50 text-amber-700" },
                fulfilled: { label: "Fulfilled", cls: "bg-green-50 text-green-700" },
                provided: { label: "Fulfilled", cls: "bg-green-50 text-green-700" },
                declined: { label: "Declined", cls: "bg-red-50 text-red-700" },
              };
              const pill = statusMap[req.status] ?? statusMap.pending;
              const canFounderRespond = isFounder && req.status === "pending" && req.requested_from === userId;

              return (
                <div key={req.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{req.document_name}</span>
                        {req.category && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            {req.category}
                          </span>
                        )}
                      </div>
                      {req.document_description && (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{req.document_description}</p>
                      )}
                      {req.decline_reason && (
                        <p className="mt-1 text-xs text-red-600">Declined: {req.decline_reason}</p>
                      )}
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", pill.cls)}>
                      {pill.label}
                    </span>
                  </div>

                  {canFounderRespond && declineMode !== req.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <Upload className="h-3.5 w-3.5" />
                        Upload
                        <input type="file" className="sr-only" onChange={() => console.log("upload — Claude Code will wire")} />
                      </label>
                      <button
                        onClick={() => { setDeclineMode(req.id); setDeclineReason(""); }}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {declineMode === req.id && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        rows={2}
                        placeholder="Reason for declining"
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder:text-[#71717A] outline-none resize-none"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setDeclineMode(null)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                        <button
                          onClick={() => declineRequest(req.id)}
                          disabled={!declineReason.trim() || respondingReqId === req.id}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
                          style={{ background: "#EF4444" }}
                        >
                          {respondingReqId === req.id ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Submit"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">Documents & links have moved to their own tab.</span>
        <Link
          to={"/app/deal-rooms/$id/documents" as any}
          params={{ id: dealRoomId }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-1.5 text-xs font-medium text-brand hover:bg-accent"
        >
          Open Documents →
        </Link>
      </div>

      {isInvestor && (
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <span className="text-sm font-semibold text-gray-900">My Notes</span>
            <button
              onClick={() => setShowNoteForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-foreground"
              style={{ background: "var(--gradient-brand)" }}
              data-testid="iv-add-note-btn"
            >
              <Plus className="h-3.5 w-3.5" /> Add note
            </button>
          </div>

          {showNoteForm && (
            <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.08)] bg-gray-50 space-y-3">
              <input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none focus:border-brand"
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                placeholder="Write your notes here..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none resize-none focus:border-brand"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={noteVisibility}
                  onChange={(e) => setNoteVisibility(e.target.value as "private" | "shared")}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none"
                >
                  <option value="private">Private (only me)</option>
                  <option value="shared">Share with founder</option>
                </select>
                <button
                  onClick={() => console.log("AI note generation — Claude Code will wire")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 px-3 py-2 text-xs font-medium text-brand hover:bg-accent"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Generate with AI
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setShowNoteForm(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-2 text-xs text-gray-500">Cancel</button>
                  <button
                    onClick={saveNote}
                    disabled={!noteContent.trim() || noteSaving}
                    className="rounded-lg px-4 py-2 text-xs font-medium text-foreground disabled:opacity-50"
                    style={{ background: "var(--gradient-brand)" }}
                    data-testid="iv-save-note-btn"
                  >
                    {noteSaving ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {(notes as any[]).length === 0 ? (
              <EmptyState kind="empty" title="No notes" />
            ) : (
              (notes as any[]).map((note: any) => (
                <div key={note.id} className="px-6 py-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {note.title && <div className="text-sm font-semibold text-gray-900 mb-1">{note.title}</div>}
                      <p className={cn("text-sm text-gray-600 whitespace-pre-wrap", expandedNoteId !== note.id && "line-clamp-2")}>
                        {note.content}
                      </p>
                      {note.content?.length > 120 && (
                        <button
                          onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                          className="text-xs text-brand mt-1 hover:underline"
                        >
                          {expandedNoteId === note.id ? "Show less" : "Show more"}
                        </button>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium",
                          note.visibility === "shared"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        )}>
                          {note.visibility === "shared" ? "Shared" : "Private"}
                        </span>
                        <span className="text-[10px] text-[#71717A]">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="hidden group-hover:grid h-7 w-7 place-items-center rounded text-[#71717A] hover:text-red-500"
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
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(0,0,0,0.08)]">
            <span className="text-sm font-semibold text-gray-900">Notes from investor</span>
          </div>
          <div className="divide-y divide-gray-100">
            {(notes as any[]).length === 0 ? (
              <EmptyState kind="empty" title="No shared notes" />
            ) : (
              (notes as any[]).map((note: any) => (
                <div key={note.id} className="px-6 py-4">
                  {note.title && <div className="text-sm font-semibold text-gray-900 mb-1">{note.title}</div>}
                  <p className="text-sm text-gray-600 line-clamp-2 whitespace-pre-wrap">{note.content}</p>
                  <div className="mt-2 text-[10px] text-[#71717A]">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-none px-6 py-5">
        {showDecisionForm ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-900">Submit a decision</div>
            <select
              value={decisionOutcome}
              onChange={(e) => setDecisionOutcome(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none"
            >
              {["Pass", "Withdraw", "Pause"].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <textarea
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-[#71717A] outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setShowDecisionForm(false)} className="rounded-lg border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-gray-500">Cancel</button>
              <button
                onClick={submitDecision}
                disabled={!decisionReason.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
                style={{ background: "#EF4444" }}
              >
                Submit decision
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setShowDecisionForm(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 bg-white hover:bg-red-50"
            >
              Decision
            </button>
            <button
              onClick={onRequestNextStage}
              disabled={stageRequesting}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
              data-testid="info-vault-next-stage"
            >
              {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Request next stage →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

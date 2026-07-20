import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { FileText, Upload, Check, MessageSquare, RotateCcw, Lock, Loader2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatTermValue, type TermValueType } from "@/lib/term-templates";
import {
  uploadAgreement, requestAgreementChanges, acceptAgreement,
  requestReopen, resolveReopen,
} from "@/lib/agreement-fn";
import { regenerateSummary } from "@/lib/summary-fn";
import { downloadAgreement } from "@/lib/closing-fn";

// R15B — post-lock closing panel: summary (Gate 2) + agreement upload/review
// (Gate 3) + re-open flow. Rendered inside the deal room for founder, investor,
// and lawyer. R15A term-negotiation history is NOT shown here (lawyer-blocked).

const BORDER = "#E4E4E7", INK = "#0A0A0B", INK2 = "#52525B", INK3 = "#71717A", BRAND = "#7C3AED";

const AGR_CHIP: Record<string, { bg: string; fg: string; label: string }> = {
  pending:            { bg: "#EDE9FE", fg: "#6D28D9", label: "Awaiting review" },
  changes_requested:  { bg: "#FEF3C7", fg: "#92400E", label: "Changes requested" },
  accepted:           { bg: "#DCFCE7", fg: "#166534", label: "Accepted" },
  superseded:         { bg: "#F4F4F5", fg: "#52525B", label: "Superseded" },
};

async function token() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export function TermClosingPanel({
  dealRoomId, role, userId, isClosed = false,
}: {
  dealRoomId: string;
  role: "founder" | "investor" | "lawyer";
  userId: string;
  // R15C: when the deal is closed the whole room is a read-only archive — every
  // editable action here (upload agreement, accept, request changes, re-open) is
  // hidden. RLS also blocks the writes (dr_is_open), so this is the UI half of
  // belt-and-suspenders read-only.
  isClosed?: boolean;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [changesFor, setChangesFor] = useState<string | null>(null);
  const [changeText, setChangeText] = useState("");
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const { data: summary } = useQuery({
    queryKey: ["dr-summary", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_summaries")
        .select("*").eq("deal_room_id", dealRoomId).eq("status", "active").maybeSingle();
      return data;
    },
  });

  // Config carries the summary-generation error marker (honest failure state).
  const { data: cfg } = useQuery({
    queryKey: ["dr-term-config-summary", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_term_config")
        .select("locked_at, summary_error, summary_error_at").eq("deal_room_id", dealRoomId).maybeSingle();
      return data;
    },
  });

  const { data: agreements = [] } = useQuery({
    queryKey: ["dr-agreements", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_agreements")
        .select("*").eq("deal_room_id", dealRoomId).order("version", { ascending: false });
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["dr-agreement-comments", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_agreement_comments")
        .select("*").eq("deal_room_id", dealRoomId).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: reopenReq } = useQuery({
    queryKey: ["dr-reopen", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_term_reopen_requests")
        .select("*").eq("deal_room_id", dealRoomId).eq("status", "pending")
        .order("created_at", { ascending: false }).maybeSingle();
      return data;
    },
  });

  // The designated uploader is the lawyer if a lawyer is a room MEMBER, else the
  // investor — determined by membership, not by whether an agreement exists yet
  // (chicken-and-egg: the first upload can't depend on a prior upload).
  const { data: lawyerPresent } = useQuery({
    queryKey: ["dr-has-lawyer", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase.from("deal_room_members")
        .select("user_id").eq("deal_room_id", dealRoomId).eq("role", "lawyer").limit(1).maybeSingle();
      return !!data;
    },
  });

  // Realtime — summary/agreement/comment/reopen changes land live.
  useEffect(() => {
    if (!dealRoomId) return;
    const inv = () => {
      qc.invalidateQueries({ queryKey: ["dr-summary", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["dr-agreements", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["dr-agreement-comments", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["dr-reopen", dealRoomId] });
      qc.invalidateQueries({ queryKey: ["dr-term-config-summary", dealRoomId] });
    };
    const ch = supabase.channel(`dr-closing-${dealRoomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_term_config", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_summaries", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_agreements", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_agreement_comments", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_room_term_reopen_requests", filter: `deal_room_id=eq.${dealRoomId}` }, inv)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [dealRoomId, qc]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dr-summary", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["dr-agreements", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["dr-agreement-comments", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["dr-reopen", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["term-config", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["terms", dealRoomId] });
  };

  const allAgreements = agreements as any[];
  const uploaderRole: "lawyer" | "investor" = lawyerPresent ? "lawyer" : "investor";
  const currentVersion = allAgreements.find((a) => a.status !== "superseded") ?? allAgreements[0];
  const finalized = allAgreements.some((a) => a.status === "accepted");
  const content = (summary?.content ?? null) as any;

  // ── file upload ────────────────────────────────────────────────────────────
  const onUpload = async (file: File) => {
    setBusy("upload");
    try {
      const path = `${dealRoomId}/agreements/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) { toast.error("Upload failed"); return; }
      const r = await uploadAgreement({ data: { dealRoomId, accessToken: await token(), storagePath: path, fileName: file.name, fileSize: file.size } });
      if (!r.ok) { toast.error(r.error === "not_uploader" ? "Only the designated party can upload" : r.error === "already_finalized" ? "Agreement is finalized" : "Could not record agreement"); return; }
      toast.success(`Agreement v${r.version} uploaded`);
      refresh();
    } catch { toast.error("Upload failed"); }
    finally { setBusy(null); }
  };

  // Agreement files live under the fee-gated agreements/ path (client storage RLS
  // excludes it — R15C), so downloads go through the server fn: in-review versions
  // are free for members; the finalized version is served only once the fee is
  // confirmed.
  const download = async (agreementId: string) => {
    const r = await downloadAgreement({ data: { dealRoomId, accessToken: await token(), agreementId } });
    if (r.ok && r.url) window.open(r.url, "_blank");
    else toast.error(r.error === "fee_not_confirmed" ? "Available after the platform fee is confirmed" : "Could not download");
  };

  const doAccept = async (agreementId: string) => {
    setBusy(agreementId);
    try {
      const r = await acceptAgreement({ data: { dealRoomId, accessToken: await token(), agreementId } });
      if (!r.ok) { toast.error("Could not accept"); return; }
      if (r.finalized) toast.success("Agreement finalized — accepted by both parties");
      refresh();
    } catch { toast.error("Could not accept"); }
    finally { setBusy(null); }
  };

  const doRequestChanges = async (agreementId: string) => {
    if (!changeText.trim()) return;
    setBusy(agreementId);
    try {
      const r = await requestAgreementChanges({ data: { dealRoomId, accessToken: await token(), agreementId, comment: changeText.trim() } });
      if (!r.ok) { toast.error(r.error === "comment_required" ? "A comment is required" : "Could not submit"); return; }
      setChangesFor(null); setChangeText("");
      refresh();
    } catch { toast.error("Could not submit"); }
    finally { setBusy(null); }
  };

  const doRequestReopen = async () => {
    setBusy("reopen");
    try {
      const r = await requestReopen({ data: { dealRoomId, accessToken: await token(), reason: reopenReason.trim() || undefined } });
      if (!r.ok) { toast.error("Could not request re-open"); return; }
      setReopenOpen(false); setReopenReason("");
      toast.success("Re-open requested — awaiting counterparty approval");
      refresh();
    } catch { toast.error("Could not request re-open"); }
    finally { setBusy(null); }
  };

  const doResolveReopen = async (requestId: string, approve: boolean) => {
    setBusy("reopen-resolve");
    try {
      const r = await resolveReopen({ data: { dealRoomId, accessToken: await token(), requestId, approve } });
      if (!r.ok) { toast.error(r.error === "self_approval" ? "You can't approve your own request" : "Could not resolve"); return; }
      toast.success(approve ? "Terms re-opened for renegotiation" : "Re-open declined");
      refresh();
    } catch { toast.error("Could not resolve"); }
    finally { setBusy(null); }
  };

  const isPrincipal = role === "founder" || role === "investor";
  const commentsFor = (agreementId: string) => (comments as any[]).filter((c) => c.agreement_id === agreementId);

  // Honest summary state: locked but no active summary. If an error is recorded
  // it's a genuine failure (show error + retry for principals); otherwise it's a
  // brief transient during generation.
  const summaryError = (cfg as any)?.summary_error as string | null | undefined;
  const summaryFailed = !content && !!summaryError;

  const doRetrySummary = async () => {
    setBusy("retry-summary");
    try {
      const r = await regenerateSummary({ data: { dealRoomId, accessToken: await token() } });
      if (!r.ok) { toast.error(r.error === "not_authorized" ? "Only a deal party can retry" : "Retry failed — contact support"); return; }
      toast.success("Summary generated");
      refresh();
    } catch { toast.error("Retry failed — contact support"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {/* ── Gate 2: Summary ─────────────────────────────────────────────── */}
      {content ? (
        <div className="border bg-white" style={{ borderColor: BORDER, borderRadius: 0 }}>
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: BRAND }} />
              <h2 className="text-sm font-semibold" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>
                Agreed terms summary — {content.instrument_label}
              </h2>
            </div>
            <span className="text-[12px]" style={{ color: INK3 }}>
              Generated {summary?.generated_at ? formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true }) : ""}
            </span>
          </div>

          <div className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: INK3 }}>Founder</div>
              <div className="text-[13px]" style={{ color: INK }}>{content.parties?.founder?.name}{content.parties?.founder?.entity ? ` · ${content.parties.founder.entity}` : ""}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide" style={{ color: INK3 }}>Investor</div>
              <div className="text-[13px]" style={{ color: INK }}>{content.parties?.investor?.name}</div>
            </div>
          </div>

          <div className="border-t" style={{ borderColor: BORDER }}>
            {(content.terms ?? []).map((t: any) => (
              <div key={t.term_key} className="flex items-center justify-between border-b px-5 last:border-b-0" style={{ borderColor: BORDER, minHeight: 44 }}>
                <span className="text-[13px]" style={{ color: INK2 }}>{t.term_label}{t.is_custom ? <span className="ml-2 text-[10px] uppercase" style={{ color: INK3 }}>Custom</span> : null}</span>
                <span className="text-[13px] font-medium tabular-nums" style={{ color: INK }}>{formatTermValue(t.value, t.value_type as TermValueType)}</span>
              </div>
            ))}
          </div>

          <div className="border-t px-5 py-3" style={{ borderColor: BORDER, background: "#FAFAFA" }}>
            <p className="text-[12px] leading-relaxed" style={{ color: INK2 }}>
              <strong style={{ color: INK }}>Disclaimer.</strong> {content.disclaimer}
            </p>
          </div>
        </div>
      ) : summaryFailed ? (
        <div className="border bg-white px-5 py-5" style={{ borderColor: "#DC2626", borderRadius: 0 }}>
          <div className="text-sm font-semibold" style={{ color: "#991B1B" }}>Summary generation failed</div>
          <div className="mt-1 text-[13px]" style={{ color: INK2 }}>
            The terms are locked, but the agreed-terms summary could not be generated. This does not affect the locked terms.
            {isPrincipal ? " Retry below, or contact support if it keeps failing." : " A deal party can retry, or contact support."}
          </div>
          {isPrincipal && (
            <button onClick={doRetrySummary} disabled={busy === "retry-summary"}
              className="mt-3 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 32, borderRadius: 2 }}>
              {busy === "retry-summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry generation
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 border bg-white px-5 py-6 text-sm" style={{ borderColor: BORDER, borderRadius: 0, color: INK2 }}>
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: INK3 }} />
          Generating the agreed-terms summary from the locked terms…
        </div>
      )}

      {/* Re-open request banner (pending) */}
      {reopenReq && (
        <div className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3" style={{ borderColor: "#F59E0B", background: "#FFFBEB", borderRadius: 0 }}>
          <div className="text-sm" style={{ color: "#92400E" }}>
            {reopenReq.requested_by === userId
              ? <>You requested to re-open the terms — awaiting counterparty approval.{reopenReq.reason ? ` Reason: "${reopenReq.reason}"` : ""}</>
              : <><strong className="capitalize">{reopenReq.requested_role}</strong> requested to re-open the terms for renegotiation.{reopenReq.reason ? ` Reason: "${reopenReq.reason}"` : ""} Approving unlocks the terms and archives this summary.</>}
          </div>
          {!isClosed && isPrincipal && reopenReq.requested_by !== userId && (
            <div className="flex items-center gap-2">
              <button onClick={() => doResolveReopen(reopenReq.id, false)} disabled={busy === "reopen-resolve"} className="border px-3 text-xs font-medium" style={{ borderColor: BORDER, color: INK2, height: 32, borderRadius: 2 }}>Decline</button>
              <button onClick={() => doResolveReopen(reopenReq.id, true)} disabled={busy === "reopen-resolve"} className="px-3 text-xs font-medium text-white" style={{ background: "#D97706", height: 32, borderRadius: 2 }}>Approve re-open</button>
            </div>
          )}
        </div>
      )}

      {/* ── Gate 3: Agreement upload + review ────────────────────────────── */}
      {content && (
        <div className="border bg-white" style={{ borderColor: BORDER, borderRadius: 0 }}>
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
            <h2 className="text-sm font-semibold" style={{ color: INK, fontFamily: "Syne, sans-serif" }}>Agreement</h2>
            {finalized ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "#166534" }}><Lock className="h-3.5 w-3.5" /> Finalized</span>
            ) : !isClosed && role === uploaderRole && !reopenReq ? (
              <label className="inline-flex cursor-pointer items-center gap-1.5 px-3 text-xs font-medium text-white" style={{ background: BRAND, height: 32, borderRadius: 2 }}>
                {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload {allAgreements.length > 0 ? "new version" : "agreement"}
                <input type="file" className="sr-only" accept=".pdf,.docx,.doc" disabled={busy === "upload"}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
              </label>
            ) : (
              <span className="text-[12px]" style={{ color: INK3 }}>
                {role === "founder" ? `Awaiting ${uploaderRole} to upload` : "Awaiting upload"}
              </span>
            )}
          </div>

          {allAgreements.length === 0 ? (
            <div className="px-5 py-6 text-sm" style={{ color: INK2 }}>
              No agreement uploaded yet. The {uploaderRole} prepares the agreement from the summary above and uploads it here for review.
            </div>
          ) : (
            <div>
              {allAgreements.map((a) => {
                const chip = AGR_CHIP[a.status] ?? AGR_CHIP.pending;
                const isCurrent = a.id === currentVersion?.id;
                const mineAccepted = role === "founder" ? a.accepted_by_founder : role === "investor" ? a.accepted_by_investor : false;
                const canReview = !isClosed && isPrincipal && isCurrent && a.status !== "accepted" && a.status !== "superseded" && a.uploaded_by !== userId;
                const cs = commentsFor(a.id);
                return (
                  <div key={a.id} className="border-b last:border-b-0" style={{ borderColor: BORDER }}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                      <div className="min-w-[220px] flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium" style={{ color: INK }}>v{a.version} · {a.file_name}</span>
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium" style={{ background: chip.bg, color: chip.fg, borderRadius: 2 }}>{chip.label}</span>
                        </div>
                        <div className="mt-0.5 text-[12px]" style={{ color: INK3 }}>
                          Uploaded by {a.uploader_role} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          {a.accepted_by_founder ? " · founder accepted" : ""}{a.accepted_by_investor ? " · investor accepted" : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button onClick={() => download(a.id)} className="inline-flex items-center gap-1 border px-3 text-xs font-medium" style={{ borderColor: BORDER, color: INK2, height: 32, borderRadius: 2 }}>
                          <Download className="h-3 w-3" /> Download
                        </button>
                        {canReview && !mineAccepted && (
                          <>
                            <button onClick={() => doAccept(a.id)} disabled={busy === a.id} className="inline-flex items-center gap-1 px-3 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 32, borderRadius: 2 }}>
                              {busy === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Accept
                            </button>
                            <button onClick={() => { setChangesFor(a.id); setChangeText(""); }} className="border px-3 text-xs font-medium" style={{ borderColor: "#FCD34D", color: "#92400E", height: 32, borderRadius: 2 }}>
                              Request changes
                            </button>
                          </>
                        )}
                        {canReview && mineAccepted && <span className="text-[12px]" style={{ color: INK3 }}>You accepted · awaiting counterparty</span>}
                      </div>
                    </div>

                    {changesFor === a.id && (
                      <div className="border-t bg-[#FAFAFA] px-5 py-3" style={{ borderColor: BORDER }}>
                        <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Describe the changes needed (required)</label>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <input value={changeText} onChange={(e) => setChangeText(e.target.value)} autoFocus placeholder="What needs to change in this agreement?"
                            className="min-w-[260px] flex-1 border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: 2 }} />
                          <button onClick={() => doRequestChanges(a.id)} disabled={!changeText.trim() || busy === a.id} className="px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: "#D97706", height: 36, borderRadius: 2 }}>Send request</button>
                          <button onClick={() => { setChangesFor(null); setChangeText(""); }} className="border px-3 text-xs" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {cs.length > 0 && (
                      <div className="border-t bg-[#FAFAFA] px-5 py-3" style={{ borderColor: BORDER }}>
                        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: INK3 }}><MessageSquare className="h-3 w-3" /> Change requests</div>
                        <div className="space-y-1.5">
                          {cs.map((c) => (
                            <div key={c.id} className="flex items-baseline gap-2 text-[12px]" style={{ color: INK2 }}>
                              <span className="font-medium capitalize" style={{ color: INK }}>{c.author_role}</span>
                              <span>{c.comment}</span>
                              <span className="ml-auto shrink-0" style={{ color: INK3 }}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Re-open action (principals only; not while a request is pending or finalized-and-locked) */}
      {!isClosed && content && isPrincipal && !reopenReq && !finalized && (
        <div>
          {reopenOpen ? (
            <div className="border bg-white p-4" style={{ borderColor: BORDER, borderRadius: 0 }}>
              <label className="block text-[12px] font-medium" style={{ color: INK2 }}>Re-open terms for renegotiation — reason (optional)</label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="Why re-open?" className="min-w-[260px] flex-1 border px-3 text-sm outline-none" style={{ borderColor: BORDER, color: INK, height: 36, borderRadius: 2 }} />
                <button onClick={doRequestReopen} disabled={busy === "reopen"} className="px-4 text-xs font-medium text-white disabled:opacity-50" style={{ background: BRAND, height: 36, borderRadius: 2 }}>Request re-open</button>
                <button onClick={() => setReopenOpen(false)} className="border px-3 text-xs" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>Cancel</button>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: INK3 }}>Re-opening requires counterparty approval. It unlocks the terms, archives this summary, and cancels any in-progress agreement review.</p>
            </div>
          ) : (
            <button onClick={() => setReopenOpen(true)} className="inline-flex items-center gap-1.5 border px-3 text-xs font-medium" style={{ borderColor: BORDER, color: INK2, height: 36, borderRadius: 2 }}>
              <RotateCcw className="h-3.5 w-3.5" /> Re-open terms
            </button>
          )}
        </div>
      )}
    </div>
  );
}

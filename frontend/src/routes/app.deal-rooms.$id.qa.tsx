import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles, Send, ChevronDown, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { callAction } from "@/lib/actions/call";
import { roomGetWorkflowState } from "@/lib/actions/deal-room-core";
import { cn } from "@/lib/utils";
import { getQASuggestions } from "@/lib/qa-suggestions-fn";
import { completeQaAndGenerateReport } from "@/lib/qa-report-fn";
import { LcsEmptyState, LcsButton, LcsStatusPill, LcsModal } from "@/components/lcs";
import { useDealRoom } from "@/hooks/useDealRoom";

export const Route = createFileRoute("/app/deal-rooms/$id/qa")({
  component: QAPage,
});

function QAPage() {
  const {
    dealRoomId, isInvestor, isFounder, userId, userName, companyName, room,
    doRequestNextStage: onRequestNextStage, stageRequesting,
  } = useDealRoom();
  const queryClient = useQueryClient();
  const MAX_QUESTIONS = 10;

  const [rows, setRows] = useState<any[]>([]);
  const [rowsLoaded, setRowsLoaded] = useState(false);

  const [askText, setAskText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestionInput, setSuggestionInput] = useState("");

  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerSending, setAnswerSending] = useState<Record<string, boolean>>({});
  const [expandedAnswers, setExpandedAnswers] = useState<Record<string, boolean>>({});

  const [suggestions, setSuggestions] = useState<{ text: string; source: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [completingQA, setCompletingQA] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [summarising, setSummarising] = useState(false);

  const { data: initialRows = [] } = useQuery({
    queryKey: ["qa-messages", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_room_qa")
        .select("*")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!rowsLoaded && initialRows.length > 0) {
      setRows(initialRows as any[]);
      setRowsLoaded(true);
    }
  }, [initialRows, rowsLoaded]);

  // This route only mounts inside DealRoomCtx, which the layout already
  // intercepts for the lawyer (renders LawyerRoomView instead) — so the
  // room_get_workflow_state lawyer-null on qa_completed_at/by is
  // unreachable here in practice, but handled anyway for defense in depth.
  // Also adds staleTime (was unset — React Query default 0, refetching on
  // every mount/remount of this tab route) to avoid a fresh gateway call
  // and record_entry append on every Q&A tab revisit (CLAUDE.md §20.1
  // record-volume finding).
  const { data: roomData, refetch: refetchRoom } = useQuery({
    queryKey: ["qa-room-status", dealRoomId],
    enabled: !!dealRoomId,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const res = await callAction<{ workflow: { qa_completed_at: string | null; qa_completed_by: string | null } }>(
          roomGetWorkflowState, dealRoomId, { dealRoomId },
        );
        return res.workflow;
      } catch (err) {
        if (err instanceof Error && err.message === "forbidden") return null;
        throw err;
      }
    },
  });

  useEffect(() => {
    if (!dealRoomId) return;
    const channel = supabase
      .channel(`qa-v2-${dealRoomId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "deal_room_qa", filter: `deal_room_id=eq.${dealRoomId}` },
        (payload: any) => {
          setRows((prev) =>
            prev.some((r) => r.id === payload.new.id) ? prev : [...prev, payload.new],
          );
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealRoomId]);

  const questions = rows
    .filter((r) => r.is_question === true && r.parent_id === null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const answerFor = (qId: string) =>
    rows.find((r) => r.parent_id === qId) ?? null;

  const openQuestions = questions.filter((q) => !answerFor(q.id));
  const answeredQuestions = questions.filter((q) => !!answerFor(q.id));
  const orderedQuestions = [...openQuestions, ...answeredQuestions.slice().reverse()];

  const questionCount = questions.length;
  const answeredCount = answeredQuestions.length;
  const isAtLimit = questionCount >= MAX_QUESTIONS;
  const isCompleted = !!roomData?.qa_completed_at;

  const avgResponseHours = (() => {
    const pairs = answeredQuestions
      .map((q) => {
        const ans = answerFor(q.id);
        if (!ans?.answered_at) return null;
        return (new Date(ans.answered_at).getTime() - new Date(q.created_at).getTime()) / 3600000;
      })
      .filter((h): h is number => h !== null);
    if (!pairs.length) return null;
    return (pairs.reduce((a, b) => a + b, 0) / pairs.length).toFixed(1);
  })();

  const sendQuestion = async (text: string) => {
    const content = text.trim();
    if (!content || !userId || isAtLimit || isCompleted) return;
    setSending(true);
    try {
      const { data: inserted } = await supabase
        .from("deal_room_qa")
        .insert({
          deal_room_id: dealRoomId,
          user_id: userId,
          sender_role: "investor",
          sender_name: userName,
          content,
          is_question: true,
          ai_suggested: text !== askText,
        })
        .select()
        .single();
      if (inserted) {
        setRows((prev) => prev.some((r) => r.id === inserted.id) ? prev : [...prev, inserted]);
      }
      setAskText("");
      setSuggestionInput("");
    } catch {
      toast.error("Could not send question");
    } finally {
      setSending(false);
    }
  };

  const sendAnswer = async (questionId: string) => {
    const content = (answerDrafts[questionId] ?? "").trim();
    if (!content || !userId || content.length > 500) return;
    setAnswerSending((prev) => ({ ...prev, [questionId]: true }));
    try {
      const now = new Date().toISOString();
      const { data: inserted } = await supabase
        .from("deal_room_qa")
        .insert({
          deal_room_id: dealRoomId,
          user_id: userId,
          sender_role: "founder",
          sender_name: userName,
          content,
          is_question: false,
          parent_id: questionId,
          answered_at: now,
        })
        .select()
        .single();
      if (inserted) {
        setRows((prev) => prev.some((r) => r.id === inserted.id) ? prev : [...prev, inserted]);
        setAnswerDrafts((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
        setExpandedAnswers((prev) => ({ ...prev, [questionId]: true }));
      }
      if (questionCount >= MAX_QUESTIONS && answeredCount + 1 >= MAX_QUESTIONS) {
        triggerCompletion();
      }
    } catch {
      toast.error("Could not send answer");
    } finally {
      setAnswerSending((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const sector = room?.startups?.sector ?? "technology";
      const prevQs = questions.map((q) => q.content);
      const result = await getQASuggestions({
        data: {
          question: `Suggest 3 due diligence questions for ${companyName}`,
          startupName: companyName,
          sector,
          previousQuestions: prevQs,
        },
      });
      setSuggestions(
        (result.suggestions ?? []).slice(0, 3).map((s: string) => ({
          text: s,
          source: companyName + " documents",
        })),
      );
    } catch {
      toast.error("Could not load suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const generateSummary = async () => {
    if (!userId || rows.length === 0) return;
    setSummarising(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error("Not authenticated"); return; }
      const threadText = questions.map((q, i) => {
        const ans = answerFor(q.id);
        return `Q${i + 1}: ${q.content}\nA: ${ans ? ans.content : "(unanswered)"}`;
      }).join("\n\n");
      const resp = await fetch(
        `https://ldimninnjlvxozubheib.supabase.co/functions/v1/ai-router`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            task_type: "dd_report",
            user_id: userId,
            system_prompt: "You are summarizing a structured Q&A between a startup founder and an investor. Be concise and factual.",
            messages: [{ role: "user", content: `Summarize this Q&A:\n\n${threadText}` }],
          }),
        },
      );
      const result = await resp.json();
      const content = result?.content ?? result?.reply ?? result?.message ?? "No summary generated.";
      const { error: sumNoteErr } = await supabase.from("deal_room_notes").insert({
        deal_room_id: dealRoomId, user_id: userId,
        title: "AI Q&A Summary", content, visibility: "private", ai_generated: true,
      });
      if (sumNoteErr) throw sumNoteErr;
      toast.success("Summary saved to your notes");
    } catch {
      toast.error("Could not generate summary");
    } finally {
      setSummarising(false);
    }
  };

  const triggerCompletion = async () => {
    if (!userId || completingQA) return;
    setCompletingQA(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await completeQaAndGenerateReport({ data: { dealRoomId, accessToken: session?.access_token ?? "" } });
      await refetchRoom();
      queryClient.invalidateQueries({ queryKey: ["vault-documents", dealRoomId] });
      toast.success("Q&A complete. Report saved to Information Vault.");
    } catch {
      toast.error("Could not complete Q&A");
    } finally {
      setCompletingQA(false);
      setShowCompleteConfirm(false);
    }
  };

  const unansweredCount = openQuestions.length;

  return (
    <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6" style={{ fontFamily: "var(--font-lcs-ui)" }}>
      {isCompleted && (
        <div className="flex items-center gap-3 border px-5 py-3" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--lcs-satisfied)" }} />
          <span className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
            Q&A marked complete on {new Date(roomData!.qa_completed_at!).toLocaleDateString()}. Report saved to Information Vault.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">

        <div className="flex flex-col gap-4 sm:order-2 sm:w-72 shrink-0">

          <div className="border px-5 py-4 space-y-4" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Status</span>
              {isInvestor && !isCompleted && (
                <LcsButton
                  variant="primary"
                  onClick={() => setShowCompleteConfirm(true)}
                  disabled={completingQA}
                  data-testid="qa-mark-complete-btn"
                >
                  {completingQA ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Mark complete
                </LcsButton>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>{questionCount} of {MAX_QUESTIONS} questions used</span>
                {isAtLimit && <span className="text-[10px] font-semibold" style={{ color: "var(--lcs-attention)" }}>Limit reached</span>}
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "var(--lcs-line)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(questionCount / MAX_QUESTIONS) * 100}%`, background: "var(--lcs-accent)" }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border px-3 py-2" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}>
                <div className="mb-0.5" style={{ color: "var(--lcs-ink-muted)" }}>Answered</div>
                <div className="font-semibold" style={{ color: "var(--lcs-ink)" }}>{answeredCount}</div>
              </div>
              <div className="border px-3 py-2" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}>
                <div className="mb-0.5" style={{ color: "var(--lcs-ink-muted)" }}>Open</div>
                <div className="font-semibold" style={{ color: "var(--lcs-ink)" }}>{unansweredCount}</div>
              </div>
            </div>

            {avgResponseHours !== null && (
              <div className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>
                Avg response time: <span className="font-medium" style={{ color: "var(--lcs-ink)" }}>{avgResponseHours}h</span>
              </div>
            )}
          </div>

          {isInvestor && (
            <div className="border px-5 py-4 space-y-3" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--lcs-ink)" }}>Suggested questions</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)" }}>Generated from {companyName}'s documents</div>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--lcs-ink-muted)" }}>Click "Generate" to get AI-suggested due diligence questions.</p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSuggestionInput(s.text)}
                      className="w-full text-left border px-3 py-2.5 transition-colors hover:border-[var(--lcs-accent)]"
                      style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", borderRadius: "var(--radius-lcs-control)" }}
                    >
                      <div className="text-xs leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{s.text}</div>
                      <div className="text-[10px] mt-1" style={{ color: "var(--lcs-ink-muted)" }}>Source: {s.source}</div>
                    </button>
                  ))}
                </div>
              )}

              <LcsButton
                variant="text-link"
                onClick={fetchSuggestions}
                disabled={loadingSuggestions || isAtLimit || isCompleted}
              >
                {loadingSuggestions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {suggestions.length === 0 ? "Generate suggestions" : "Generate more"}
              </LcsButton>
            </div>
          )}

          {isInvestor && (
            <LcsButton
              variant="secondary"
              onClick={generateSummary}
              disabled={summarising || rows.length === 0}
              className="justify-center"
              data-testid="qa-ai-summary-btn"
            >
              {summarising ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate AI summary
            </LcsButton>
          )}
        </div>

        <div className="flex-1 sm:order-1 space-y-4" data-testid="qa-thread">

          {isInvestor && !isCompleted && (
            <div className="border px-4 py-3 space-y-2" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-white)" }}>
              <textarea
                value={suggestionInput || askText}
                onChange={(e) => {
                  if (suggestionInput) setSuggestionInput(e.target.value);
                  else setAskText(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendQuestion(suggestionInput || askText);
                  }
                }}
                rows={2}
                placeholder={isAtLimit ? "Question limit reached (10/10)" : "Ask a question…"}
                disabled={isAtLimit}
                className="w-full resize-none border px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                style={{ maxHeight: 96, borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                data-testid="qa-ask-input"
              />
              <div className="flex items-center justify-end">
                <LcsButton
                  variant="primary"
                  onClick={() => sendQuestion(suggestionInput || askText)}
                  disabled={!(suggestionInput || askText).trim() || sending || isAtLimit}
                  data-testid="qa-send-btn"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Ask
                </LcsButton>
              </div>
            </div>
          )}

          {orderedQuestions.length === 0 ? (
            <LcsEmptyState title="No questions" text="Questions asked in this deal room appear here." />
          ) : (
            orderedQuestions.map((q) => {
              const qNum = questions.indexOf(q) + 1;
              const ans = answerFor(q.id);
              const isAnswered = !!ans;
              const draft = answerDrafts[q.id] ?? "";
              const charsLeft = 500 - draft.length;
              const expanded = expandedAnswers[q.id] ?? false;

              return (
                <div
                  key={q.id}
                  className="border"
                  // Open questions keep the full-strength line; answered ones
                  // dim to 60% — preserves the original v1 prominence signal
                  // (an open question visually recedes less than an answered
                  // one) independent of the "Open"/"Answered" LcsStatusPill
                  // text, which conveys the same fact but not the same visual
                  // weight. Confirmed against --border's two literal opacities
                  // in the pre-restyle source before restoring this.
                  style={{ borderColor: isAnswered ? "color-mix(in srgb, var(--lcs-line) 60%, transparent)" : "var(--lcs-line)", background: "var(--lcs-white)" }}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--lcs-progress-wash)", color: "var(--lcs-accent)" }}>
                      {(q.sender_name ?? "I").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: "var(--lcs-ink)" }}>{q.sender_name}</span>
                        <span className="text-[10px] rounded-full border px-1.5 py-px font-medium capitalize" style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink-muted)" }}>{q.sender_role}</span>
                        <span className="text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>
                          {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                        </span>
                        <span className="ml-auto text-[10px] font-semibold" style={{ color: "var(--lcs-ink-muted)" }}>#{qNum}</span>
                        <LcsStatusPill status={isAnswered ? "satisfied" : "pending"} label={isAnswered ? "Answered" : "Open"} dot={false} />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{q.content}</p>
                    </div>
                  </div>

                  {isAnswered ? (
                    <div className="border-t" style={{ borderColor: "var(--lcs-line)" }}>
                      <button
                        onClick={() => setExpandedAnswers((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors"
                        style={{ color: "var(--lcs-ink-muted)" }}
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                        {expanded ? "Hide answer" : "View answer"}
                        <span className="ml-auto text-[10px]">{ans.sender_name} · {formatDistanceToNow(new Date(ans.answered_at ?? ans.created_at), { addSuffix: true })}</span>
                      </button>
                      {expanded && (
                        <div className="px-4 pb-3 pt-1">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--lcs-line)", color: "var(--lcs-ink-muted)" }}>
                              {(ans.sender_name ?? "F").charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: "var(--lcs-ink)" }}>{ans.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isFounder ? (
                    <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "var(--lcs-line)" }}>
                      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--lcs-ink-muted)" }}>
                        <Lock className="h-3 w-3" />
                        Type your answer — no paste
                      </div>
                      <textarea
                        value={draft}
                        onChange={(e) => {
                          if (e.target.value.length <= 500)
                            setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }));
                        }}
                        onPaste={(e) => e.preventDefault()}
                        maxLength={500}
                        rows={3}
                        placeholder="Type your answer here…"
                        className="w-full resize-none border px-3 py-2.5 text-sm outline-none"
                        style={{ borderColor: "var(--lcs-line)", background: "var(--lcs-surface)", color: "var(--lcs-ink)", borderRadius: "var(--radius-lcs-control)" }}
                        data-testid={`qa-answer-input-${q.id}`}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: charsLeft < 50 ? "var(--lcs-attention)" : "var(--lcs-ink-muted)", fontWeight: charsLeft < 50 ? 600 : 400 }}>
                          {charsLeft} characters remaining
                        </span>
                        <LcsButton
                          variant="primary"
                          onClick={() => sendAnswer(q.id)}
                          disabled={!draft.trim() || answerSending[q.id]}
                        >
                          {answerSending[q.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send answer
                        </LcsButton>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t px-4 py-2.5" style={{ borderColor: "var(--lcs-line)" }}>
                      <span className="text-xs italic" style={{ color: "var(--lcs-ink-muted)" }}>Awaiting answer…</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showCompleteConfirm && (
        <LcsModal
          title="Mark Q&A as complete?"
          onClose={() => setShowCompleteConfirm(false)}
          footer={
            <>
              <LcsButton variant="secondary" onClick={() => setShowCompleteConfirm(false)}>Cancel</LcsButton>
              <LcsButton variant="primary" onClick={triggerCompletion} disabled={completingQA}>
                {completingQA ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm
              </LcsButton>
            </>
          }
        >
          {unansweredCount > 0 && (
            <div className="border px-4 py-3 text-sm" style={{ borderColor: "var(--lcs-attention)", background: "var(--lcs-attention-wash)", color: "var(--lcs-attention)" }}>
              {unansweredCount} question{unansweredCount !== 1 ? "s are" : " is"} still unanswered. The report will include all answered questions only.
            </div>
          )}
          <p className="text-sm" style={{ color: "var(--lcs-ink-muted)" }}>
            This will generate the Q&amp;A report and save it to the Information Vault. Both parties will see it.
          </p>
        </LcsModal>
      )}

      <div className="flex items-center justify-end">
        <LcsButton
          variant="primary"
          onClick={onRequestNextStage}
          disabled={stageRequesting}
          data-testid="qa-next-stage"
        >
          {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Request next stage →
        </LcsButton>
      </div>
    </div>
  );
}

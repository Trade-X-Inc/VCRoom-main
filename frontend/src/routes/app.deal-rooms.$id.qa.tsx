import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles, Send, ChevronDown, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getQASuggestions } from "@/lib/qa-suggestions-fn";
import { completeQaAndGenerateReport } from "@/lib/qa-report-fn";
import { EmptyState } from "@/components/system";
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

  const { data: roomData, refetch: refetchRoom } = useQuery({
    queryKey: ["qa-room-status", dealRoomId],
    enabled: !!dealRoomId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_rooms")
        .select("qa_completed_at, qa_completed_by")
        .eq("id", dealRoomId)
        .single();
      return data;
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
        import("@/lib/badge-award-engine").then((m) => m.evaluateAndAwardBadges({ data: { deal_room_id: dealRoomId } })).catch(() => {});
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
      await completeQaAndGenerateReport({ data: { dealRoomId, userId } });
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
    <div className="mx-auto max-w-[1360px] px-8 py-8 space-y-6">
      {isCompleted && (
        <div className="flex items-center gap-3 rounded-none border border-border/60 bg-card px-5 py-3">
          <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
          <span className="text-sm text-muted-foreground">
            Q&A marked complete on {new Date(roomData!.qa_completed_at!).toLocaleDateString()}. Report saved to Information Vault.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">

        <div className="flex flex-col gap-4 sm:order-2 sm:w-72 shrink-0">

          <div className="rounded-none border border-border/60 bg-card px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Status</span>
              {isInvestor && !isCompleted && (
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  disabled={completingQA}
                  className="inline-flex items-center gap-1.5 rounded-lg hs-gradient px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  data-testid="qa-mark-complete-btn"
                >
                  {completingQA ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  Mark complete
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{questionCount} of {MAX_QUESTIONS} questions used</span>
                {isAtLimit && <span className="text-[10px] font-semibold text-[#F59E0B]">Limit reached</span>}
              </div>
              <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                <div
                  className="h-full rounded-full hs-gradient transition-all"
                  style={{ width: `${(questionCount / MAX_QUESTIONS) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/40 bg-background px-3 py-2">
                <div className="text-muted-foreground mb-0.5">Answered</div>
                <div className="font-semibold text-foreground">{answeredCount}</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-background px-3 py-2">
                <div className="text-muted-foreground mb-0.5">Open</div>
                <div className="font-semibold text-foreground">{unansweredCount}</div>
              </div>
            </div>

            {avgResponseHours !== null && (
              <div className="text-xs text-muted-foreground">
                Avg response time: <span className="font-medium text-foreground">{avgResponseHours}h</span>
              </div>
            )}
          </div>

          {isInvestor && (
            <div className="rounded-none border border-border/60 bg-card px-5 py-4 space-y-3">
              <div>
                <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>Suggested questions</div>
                <div className="text-xs text-muted-foreground mt-0.5">Generated from {companyName}'s documents</div>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Click "Generate" to get AI-suggested due diligence questions.</p>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSuggestionInput(s.text)}
                      className="w-full text-left rounded-lg border border-border/40 bg-background px-3 py-2.5 hover:border-brand/40 transition-colors"
                    >
                      <div className="text-xs text-foreground leading-relaxed">{s.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Source: {s.source}</div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={fetchSuggestions}
                disabled={loadingSuggestions || isAtLimit || isCompleted}
                className="inline-flex items-center gap-1.5 text-xs text-brand hover:opacity-80 disabled:opacity-40"
              >
                {loadingSuggestions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {suggestions.length === 0 ? "Generate suggestions" : "Generate more"}
              </button>
            </div>
          )}

          {isInvestor && (
            <button
              onClick={generateSummary}
              disabled={summarising || rows.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-none border border-border/60 bg-card px-4 py-3 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-40"
              data-testid="qa-ai-summary-btn"
            >
              {summarising ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate AI summary
            </button>
          )}
        </div>

        <div className="flex-1 sm:order-1 space-y-4" data-testid="qa-thread">

          {isInvestor && !isCompleted && (
            <div className="rounded-none border border-border/60 bg-card px-4 py-3 space-y-2">
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
                className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand disabled:opacity-50"
                style={{ maxHeight: 96 }}
                data-testid="qa-ask-input"
              />
              <div className="flex items-center justify-end">
                <button
                  onClick={() => sendQuestion(suggestionInput || askText)}
                  disabled={!(suggestionInput || askText).trim() || sending || isAtLimit}
                  className="inline-flex items-center gap-1.5 rounded-lg hs-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  data-testid="qa-send-btn"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Ask
                </button>
              </div>
            </div>
          )}

          {orderedQuestions.length === 0 ? (
            <EmptyState kind="empty" title="No questions" />
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
                  className={cn(
                    "rounded-none border bg-card",
                    isAnswered
                      ? "border-border/60"
                      : "border-border",
                  )}
                >
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent border border-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                      {(q.sender_name ?? "I").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{q.sender_name}</span>
                        <span className="text-[10px] rounded-full bg-background border border-border/60 px-1.5 py-px text-muted-foreground font-medium capitalize">{q.sender_role}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                        </span>
                        <span className="ml-auto text-[10px] font-semibold text-muted-foreground">#{qNum}</span>
                        <span className={cn(
                          "text-[10px] font-semibold rounded-full px-2 py-px",
                          isAnswered
                            ? "bg-[#10B981]/10 text-[#10B981]"
                            : "bg-border/40 text-muted-foreground",
                        )}>
                          {isAnswered ? "Answered" : "Open"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground leading-relaxed">{q.content}</p>
                    </div>
                  </div>

                  {isAnswered ? (
                    <div className="border-t border-border/40">
                      <button
                        onClick={() => setExpandedAnswers((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                        {expanded ? "Hide answer" : "View answer"}
                        <span className="ml-auto text-[10px]">{ans.sender_name} · {formatDistanceToNow(new Date(ans.answered_at ?? ans.created_at), { addSuffix: true })}</span>
                      </button>
                      {expanded && (
                        <div className="px-4 pb-3 pt-1">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-full bg-border/40 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                              {(ans.sender_name ?? "F").charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{ans.content}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : isFounder ? (
                    <div className="border-t border-border/40 px-4 py-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
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
                        className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand"
                        data-testid={`qa-answer-input-${q.id}`}
                      />
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[10px]", charsLeft < 50 ? "text-[#EF4444] font-semibold" : "text-muted-foreground")}>
                          {charsLeft} characters remaining
                        </span>
                        <button
                          onClick={() => sendAnswer(q.id)}
                          disabled={!draft.trim() || answerSending[q.id]}
                          className="inline-flex items-center gap-1.5 rounded-lg hs-gradient px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          {answerSending[q.id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send answer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border/40 px-4 py-2.5">
                      <span className="text-xs text-muted-foreground italic">Awaiting answer…</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-elev space-y-4">
            <h3 className="text-base font-semibold text-foreground" style={{ fontFamily: "Syne, sans-serif" }}>
              Mark Q&amp;A as complete?
            </h3>
            {unansweredCount > 0 && (
              <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/5 px-4 py-3 text-sm text-[#F59E0B]">
                {unansweredCount} question{unansweredCount !== 1 ? "s are" : " is"} still unanswered. The report will include all answered questions only.
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This will generate the Q&amp;A report and save it to the Information Vault. Both parties will see it.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={triggerCompletion}
                disabled={completingQA}
                className="inline-flex items-center gap-2 rounded-lg hs-gradient px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {completingQA ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={onRequestNextStage}
          disabled={stageRequesting}
          className="inline-flex items-center gap-1.5 rounded-lg hs-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          data-testid="qa-next-stage"
        >
          {stageRequesting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Request next stage →
        </button>
      </div>
    </div>
  );
}

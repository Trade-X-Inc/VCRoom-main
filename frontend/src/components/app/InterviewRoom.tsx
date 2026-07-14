import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Edit2, Save, AlertTriangle, Shield, Sparkles, Download } from "lucide-react";
import { qaStore, useQA, type QAQuestion, id } from "@/lib/store";
import { cn } from "@/lib/utils";

const MAX_QUESTIONS = 10;
const MAX_WORDS = 500;

interface Props {
  dealRoomId: string;
  isInvestor: boolean;
  userName: string;
  onAddQuestion?: (q: QAQuestion) => Promise<string | undefined>;
  onSaveAnswer?: (questionId: string, answer: string) => Promise<void>;
}

export function InterviewRoom({ dealRoomId, isInvestor, userName, onAddQuestion, onSaveAnswer }: Props) {
  const all = useQA();
  const items = all.filter((q) => q.dealRoomId === dealRoomId);
  const investorSide = items.filter((q) => q.side === "investor-to-founder");
  const founderSide = items.filter((q) => q.side === "founder-to-investor");
  const [side, setSide] = useState<"investor-to-founder" | "founder-to-investor">(isInvestor ? "investor-to-founder" : "founder-to-investor");

  const downloadReport = () => {
    const fmt = (q: QAQuestion) =>
      `Q (${q.authorName}, ${q.authorRole}): ${q.question}\nA: ${q.answer ?? "[unanswered]"}\n— edited: ${q.editedAt ?? q.createdAt}\n\n`;
    const txt =
      `INTERVIEW ROOM Q&A REPORT\nDeal Room: ${dealRoomId}\nGenerated: ${new Date().toISOString()}\n\n` +
      `=== Investor → Founder ===\n\n${investorSide.map(fmt).join("")}\n` +
      `=== Founder → Investor ===\n\n${founderSide.map(fmt).join("")}`;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `qa-report-${dealRoomId}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight inline-flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand" /> Interview Room
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Structured Q&A between founder and investor.</p>
        </div>
        <button onClick={downloadReport} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-accent">
          <Download className="h-4 w-4" /> Download Q&A report
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-warning/40 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div className="text-xs text-foreground/80 leading-relaxed">
            <div className="font-semibold mb-1">Interview Room Rules</div>
            All answers must be typed manually. Copy-paste is not allowed. AI-generated answers may be detected. Please provide honest, direct, and original responses. This Q&A report may be used as part of the investment review process.
          </div>
        </div>
      </div>

      <div className="mt-6 inline-flex rounded-md border border-border/60 p-0.5 bg-card">
        <button onClick={() => setSide("investor-to-founder")} className={cn("px-3 py-1.5 text-xs rounded-[5px]", side === "investor-to-founder" ? "bg-accent text-foreground" : "text-muted-foreground")}>
          Investor → Founder ({investorSide.length})
        </button>
        <button onClick={() => setSide("founder-to-investor")} className={cn("px-3 py-1.5 text-xs rounded-[5px]", side === "founder-to-investor" ? "bg-accent text-foreground" : "text-muted-foreground")}>
          Founder → Investor ({founderSide.length})
        </button>
      </div>

      <SidePanel
        dealRoomId={dealRoomId}
        side={side}
        questions={side === "investor-to-founder" ? investorSide : founderSide}
        isInvestor={isInvestor}
        userName={userName}
        onAddQuestion={onAddQuestion}
        onSaveAnswer={onSaveAnswer}
      />
    </div>
  );
}

function SidePanel({
  dealRoomId, side, questions, isInvestor, userName, onAddQuestion, onSaveAnswer,
}: {
  dealRoomId: string;
  side: "investor-to-founder" | "founder-to-investor";
  questions: QAQuestion[];
  isInvestor: boolean;
  userName: string;
  onAddQuestion?: (q: QAQuestion) => Promise<string | undefined>;
  onSaveAnswer?: (questionId: string, answer: string) => Promise<void>;
}) {
  const askerRole: "Investor" | "Founder" = side === "investor-to-founder" ? "Investor" : "Founder";
  const userIsAsker = (isInvestor && askerRole === "Investor") || (!isInvestor && askerRole === "Founder");
  const userIsAnswerer = !userIsAsker;

  const [draft, setDraft] = useState("");
  const remaining = MAX_QUESTIONS - questions.length;

  const submit = async () => {
    if (!draft.trim() || remaining <= 0 || !userIsAsker) return;
    const tempId = id();
    const newQ: QAQuestion = {
      id: tempId,
      dealRoomId,
      side,
      authorRole: askerRole,
      authorName: userName,
      question: draft.trim(),
      createdAt: new Date().toISOString(),
    };
    qaStore.set((xs) => [...xs, newQ]);
    setDraft("");
    if (onAddQuestion) {
      const realId = await onAddQuestion(newQ);
      if (realId && realId !== tempId) {
        qaStore.set((xs) => xs.map((x) => x.id === tempId ? { ...x, id: realId } : x));
      }
    }
  };

  const blockPaste = (e: React.ClipboardEvent) => { e.preventDefault(); };

  return (
    <div className="mt-5 space-y-3">
      {questions.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-card p-8 text-center text-sm text-muted-foreground">
          No questions yet. {userIsAsker ? "Start the interview below." : "Waiting for questions."}
        </div>
      )}

      {questions.map((q) => (
        <QACard key={q.id} q={q} userIsAnswerer={userIsAnswerer} userIsAsker={userIsAsker} userName={userName} blockPaste={blockPaste} onSaveAnswer={onSaveAnswer} />
      ))}

      {userIsAsker && (
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Add a new question ({askerRole})</div>
            <div className="text-xs text-muted-foreground">{remaining} of {MAX_QUESTIONS} remaining</div>
          </div>
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={blockPaste}
            disabled={remaining <= 0}
            placeholder={remaining > 0 ? "Type your question. Copy-paste disabled." : "Question limit reached."}
            className="mt-3 w-full rounded-md border border-border/60 bg-background p-3 text-sm focus:outline-none focus:border-brand/50 disabled:opacity-50"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[11px] text-muted-foreground inline-flex items-center gap-2">
              <Shield className="h-3 w-3" /> Copy-paste disabled · <Sparkles className="h-3 w-3" /> AI detection: monitoring
            </div>
            <button onClick={submit} disabled={!draft.trim() || remaining <= 0} className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50 disabled:shadow-none">
              Submit question
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QACard({
  q, userIsAnswerer, userIsAsker, userName, blockPaste, onSaveAnswer,
}: {
  q: QAQuestion;
  userIsAnswerer: boolean;
  userIsAsker: boolean;
  userName: string;
  blockPaste: (e: React.ClipboardEvent) => void;
  onSaveAnswer?: (questionId: string, answer: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [editingQ, setEditingQ] = useState(false);
  const [editingA, setEditingA] = useState(false);
  const [qDraft, setQDraft] = useState(q.question);
  const [aDraft, setADraft] = useState(q.answer ?? "");

  const aWords = useMemo(() => aDraft.trim().split(/\s+/).filter(Boolean).length, [aDraft]);
  const overLimit = aWords > MAX_WORDS;

  const saveQuestion = () => {
    if (!qDraft.trim()) return;
    qaStore.set((xs) => xs.map((x) => x.id === q.id ? { ...x, question: qDraft.trim(), editedAt: new Date().toISOString() } : x));
    setEditingQ(false);
  };

  const saveAnswer = async () => {
    if (!aDraft.trim() || overLimit) return;
    const now = new Date().toISOString();
    qaStore.set((xs) => xs.map((x) => x.id === q.id ? { ...x, answer: aDraft.trim(), answeredAt: now, editedAt: now } : x));
    setEditingA(false);
    if (onSaveAnswer) {
      await onSaveAnswer(q.id, aDraft.trim());
    }
  };

  const isOwnQuestion = q.authorName === userName && userIsAsker;

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-accent/30">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold shrink-0">{q.authorName.split(" ").map((s) => s[0]).slice(0, 2).join("")}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">{q.authorName}</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-brand">{q.authorRole}</span>
            {q.answer && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/10 text-success">Answered</span>}
            {!q.answer && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/10 text-warning">Open</span>}
            {q.editedAt && <span className="text-[10px] text-muted-foreground">edited {new Date(q.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <div className="mt-1 text-sm font-medium truncate">{q.question}</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border/60">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>Question</span>
              {isOwnQuestion && !editingQ && (
                <button onClick={() => setEditingQ(true)} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Edit2 className="h-3 w-3" /> Edit</button>
              )}
            </div>
            {editingQ ? (
              <>
                <textarea value={qDraft} onChange={(e) => setQDraft(e.target.value)} onPaste={blockPaste} rows={3} className="mt-2 w-full rounded-md border border-border/60 bg-background p-3 text-sm" />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => { setEditingQ(false); setQDraft(q.question); }} className="rounded-md border border-border/60 px-3 py-1.5 text-xs">Cancel</button>
                  <button onClick={saveQuestion} className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs"><Save className="inline h-3 w-3 mr-1" /> Save</button>
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm">{q.question}</div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border/60 bg-success/5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>Answer</span>
              {q.answer && userIsAnswerer && !editingA && (
                <button onClick={() => setEditingA(true)} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Edit2 className="h-3 w-3" /> Edit</button>
              )}
            </div>

            {q.answer && !editingA ? (
              <div className="mt-2 text-sm whitespace-pre-wrap">{q.answer}</div>
            ) : userIsAnswerer ? (
              <>
                <textarea value={aDraft} onChange={(e) => setADraft(e.target.value)} onPaste={blockPaste} rows={5} placeholder="Type your answer manually. Max 500 words." className="mt-2 w-full rounded-md border border-border/60 bg-background p-3 text-sm" />
                <div className="mt-2 flex items-center justify-between">
                  <div className={cn("text-[11px] inline-flex items-center gap-3", overLimit ? "text-destructive" : "text-muted-foreground")}>
                    <span>{aWords} / {MAX_WORDS} words</span>
                    <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Paste blocked</span>
                    <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI detection: monitoring</span>
                  </div>
                  <div className="flex gap-2">
                    {editingA && <button onClick={() => { setEditingA(false); setADraft(q.answer ?? ""); }} className="rounded-md border border-border/60 px-3 py-1.5 text-xs">Cancel</button>}
                    <button onClick={saveAnswer} disabled={!aDraft.trim() || overLimit} className="rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs disabled:opacity-50">{q.answer ? "Save" : "Submit answer"}</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground italic">Awaiting answer…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

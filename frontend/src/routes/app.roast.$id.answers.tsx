import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { submitFounderAnswer } from "@/lib/roast-fn";

export const Route = createFileRoute("/app/roast/$id/answers")({
  component: RoastAnswersQueue,
});

interface SessionRow {
  id: string;
  founder_id: string;
  status: string;
  level: number;
  written_deadline_at: string | null;
  badge_awarded: boolean;
}

interface QuestionRow {
  id: string;
  asker_name: string | null;
  question_text: string;
  phase: string;
  is_answered: boolean;
  answer_text: string | null;
  answer_flag: "too_short" | "non_answer" | null;
  flag_acknowledged: boolean;
  submitted_at: string;
}

const FLAG_LABEL: Record<string, string> = {
  too_short: "Flagged: under 50 characters",
  non_answer: "Flagged: reads as a non-answer",
};

function useDeadlineCountdown(deadline: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function AnswerCard({
  q,
  sessionId,
  onSaved,
}: {
  q: QuestionRow;
  sessionId: string;
  onSaved: () => void;
}) {
  const [text, setText] = useState(q.answer_text ?? "");
  const [saving, setSaving] = useState(false);
  const [pendingFlag, setPendingFlag] = useState<
    "too_short" | "non_answer" | null
  >(q.is_answered ? null : q.answer_flag);
  const [flagNote, setFlagNote] = useState("");

  const needsWork =
    !q.is_answered || (q.answer_flag !== null && !q.flag_acknowledged);

  const save = async (confirmFlag: boolean) => {
    if (saving) return;
    if (!text.trim()) {
      toast.error("Write an answer first.");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { session: auth },
      } = await supabase.auth.getSession();
      if (!auth) {
        toast.error("Session expired — sign in again");
        return;
      }
      const r = await submitFounderAnswer({
        data: {
          userAccessToken: auth.access_token,
          sessionId,
          questionId: q.id,
          answerText: text,
          confirmFlag,
          flagNote:
            confirmFlag && flagNote.trim() ? flagNote.trim() : undefined,
        },
      });
      if (!r.ok) {
        if (r.error === "deadline_passed") {
          toast.error("The 48-hour deadline has passed.");
        } else if (r.error === "not_in_written_phase") {
          toast.error("The written round is over.");
        } else {
          toast.error("Could not save the answer.");
        }
        return;
      }
      if (r.flagged && !confirmFlag) {
        setPendingFlag(r.flagged);
        toast.warning(
          r.flagged === "too_short"
            ? "Saved, but flagged — under 50 characters. Improve it or confirm it as final."
            : "Saved, but flagged as a non-answer. Improve it or confirm it as final.",
        );
      } else {
        setPendingFlag(null);
        toast.success(
          r.allAnswered
            ? "All questions answered — badge unlocked."
            : "Answer published.",
        );
      }
      onSaved();
    } catch (e) {
      console.error("[roast] answer save failed:", e);
      toast.error("Could not save the answer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl border bg-card p-5"
      style={{
        borderColor: needsWork
          ? "rgba(245,158,11,0.35)"
          : "var(--accent)",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            {q.asker_name ?? "Challenger"}
            {q.phase === "live" && " · asked live"}
          </div>
          <div className="text-sm font-medium leading-relaxed">
            {q.question_text}
          </div>
        </div>
        {q.is_answered && !needsWork && (
          <CheckCircle2
            className="h-5 w-5 shrink-0"
            style={{ color: "#10B981" }}
          />
        )}
      </div>

      {q.is_answered && !needsWork ? (
        <div className="rounded-lg bg-accent/40 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
          {q.answer_text}
          {q.answer_flag && (
            <div
              className="mt-2 text-xs inline-flex items-center gap-1.5"
              style={{ color: "#F59E0B" }}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {FLAG_LABEL[q.answer_flag]} — confirmed as final, flag stays
              visible publicly.
            </div>
          )}
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Write your answer. Specifics beat spin — the audience already heard the pitch."
            className="w-full rounded-lg border border-border/60 bg-background px-3.5 py-3 text-sm leading-relaxed focus:outline-none focus:border-brand/50 resize-y"
            data-testid={`answer-input-${q.id}`}
          />
          <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {text.trim().length} characters
              {text.trim().length > 0 && text.trim().length < 50 && (
                <span style={{ color: "#F59E0B" }}>
                  {" "}
                  — under 50 will be flagged
                </span>
              )}
            </span>
            <button
              onClick={() => save(false)}
              disabled={saving || !text.trim()}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
              data-testid={`answer-submit-${q.id}`}
            >
              {saving ? "Saving…" : "Publish answer"}
            </button>
          </div>

          {pendingFlag && (
            <div
              className="mt-3 rounded-lg p-4"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <div
                className="text-xs font-semibold mb-1.5 inline-flex items-center gap-1.5"
                style={{ color: "#F59E0B" }}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {FLAG_LABEL[pendingFlag]}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                This answer doesn't count toward your badge yet. Improve it
                above and publish again — or confirm it as final. A confirmed
                flag stays publicly visible on the record.
              </p>
              <input
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                placeholder="Optional note, e.g. 'Short by design — the number speaks for itself.'"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-xs mb-2 focus:outline-none focus:border-brand/50"
              />
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="rounded-lg border px-3.5 py-2 text-xs font-semibold disabled:opacity-50"
                style={{
                  borderColor: "rgba(245,158,11,0.5)",
                  color: "#F59E0B",
                }}
                data-testid={`answer-confirm-flag-${q.id}`}
              >
                Confirm as final — keep the flag
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RoastAnswersQueue() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ["roast-answers-session", id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_sessions")
        .select(
          "id, founder_id, status, level, written_deadline_at, badge_awarded",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.error("[roast] session load failed:", error);
        return null;
      }
      return data as SessionRow | null;
    },
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["roast-answers-questions", id],
    enabled: !!user?.id && !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_questions")
        .select(
          "id, asker_name, question_text, phase, is_answered, answer_text, answer_flag, flag_acknowledged, submitted_at",
        )
        .eq("session_id", id)
        .is("removed_at", null)
        .order("submitted_at", { ascending: true });
      if (error) {
        console.error("[roast] questions load failed:", error);
        return [];
      }
      return (data ?? []) as QuestionRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["roast-answers-questions", id] });
    qc.invalidateQueries({ queryKey: ["roast-answers-session", id] });
  };

  const countdown = useDeadlineCountdown(session?.written_deadline_at ?? null);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!session || (user?.id && session.founder_id !== user.id)) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          This Roast doesn't exist or you're not its founder.{" "}
          <Link to="/app/roast" className="text-brand hover:underline">
            Back to your Roasts
          </Link>
        </div>
      </div>
    );
  }

  const done = questions.filter(
    (q) => q.is_answered && (q.answer_flag === null || q.flag_acknowledged),
  );
  const open = questions.filter(
    (q) => !q.is_answered || (q.answer_flag !== null && !q.flag_acknowledged),
  );
  const total = questions.length;
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0;

  return (
    <div className="p-6 lg:p-12 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1
          className="text-xl font-semibold flex items-center gap-2"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          <Flame className="h-5 w-5" style={{ color: "#EF4444" }} />
          Written round — answer everything
        </h1>
        <a
          href={`/roast/${session.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Preview public view <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Every question below is public. Answer all of them to earn the Roast
        Survivor badge — skip any and the session is permanently marked
        incomplete.
      </p>

      {/* Progress */}
      <div className="rounded-xl border border-border/60 bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">
            {done.length} of {total} answered
            {total > 0 && done.length === total ? (
              <span className="ml-2" style={{ color: "#10B981" }}>
                — badge unlocked
              </span>
            ) : (
              <span className="text-muted-foreground font-normal">
                {" "}
                — badge unlocks at {total}/{total}
              </span>
            )}
          </div>
          {session.status === "written_phase" &&
            countdown &&
            countdown !== "expired" && (
              <div
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(245,158,11,0.12)",
                  color: "#F59E0B",
                }}
              >
                {countdown} left
              </div>
            )}
          {session.status === "expired" && (
            <div
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
            >
              Deadline missed — marked incomplete
            </div>
          )}
        </div>
        <div className="h-2 rounded-full bg-accent overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "#10B981" : "var(--gradient-brand)",
            }}
          />
        </div>
        {(session.status === "completed" || session.badge_awarded) && (
          <div
            className="mt-3 text-sm inline-flex items-center gap-2 font-semibold"
            style={{ color: "#10B981" }}
          >
            <Award className="h-4 w-4" /> Roast Survivor — Level {session.level}{" "}
            badge awarded. It's on your public profile.
          </div>
        )}
      </div>

      {/* Open questions first */}
      <div className="space-y-4">
        {open.map((q) => (
          <AnswerCard key={q.id} q={q} sessionId={id} onSaved={refresh} />
        ))}
        {done.length > 0 && (
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
            Answered
          </div>
        )}
        {done.map((q) => (
          <AnswerCard key={q.id} q={q} sessionId={id} onSaved={refresh} />
        ))}
        {total === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
            No questions yet.
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Loader2,
  Users,
  Radio,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  controlRoast,
  autoAdvanceRoast,
  markLiveQuestionAnswered,
} from "@/lib/roast-fn";

export const Route = createFileRoute("/app/roast/$id/live")({
  component: RoastLiveControl,
});

const PHASE_LABEL: Record<string, string> = {
  scheduled: "Scheduled — not started",
  lobby: "Lobby — challengers arriving",
  pitch_phase: "PITCH — 60 seconds on camera",
  question_writing: "QUESTION WRITING — audience is typing",
  qa_phase: "Q&A — race rounds running",
  closing: "CLOSING STATEMENT",
  written_phase: "Written round — 48h clock running",
  completed: "Completed",
  expired: "Expired — incomplete",
  cancelled: "Cancelled",
};

const LIVE_STATUSES = [
  "lobby",
  "pitch_phase",
  "question_writing",
  "qa_phase",
  "closing",
];

interface SessionRow {
  id: string;
  founder_id: string;
  status: string;
  level: number;
  scheduled_at: string;
  phase_deadline: string | null;
  current_race_round: number;
  daily_room_url: string | null;
  max_audience: number;
  written_deadline_at: string | null;
  race_winners_per_round: number;
}

interface QuestionRow {
  id: string;
  asker_name: string | null;
  question_text: string;
  phase: string;
  race_round: number | null;
  is_answered: boolean;
}

function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function FounderVideo({ roomUrl }: { roomUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || frameRef.current) return;
      const { default: DailyIframe } = await import("@daily-co/daily-js");
      if (cancelled || !containerRef.current) return;
      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "12px",
        },
        showLeaveButton: false,
        showFullscreenButton: true,
      });
      frameRef.current = frame;
      frame
        .join({ url: roomUrl, startVideoOff: false, startAudioOff: false })
        .catch((e: unknown) =>
          console.error("[roast] founder daily join failed:", e),
        );
    })();
    return () => {
      cancelled = true;
      try {
        frameRef.current?.destroy();
      } catch {
        /* already gone */
      }
      frameRef.current = null;
    };
  }, [roomUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl bg-black"
      style={{ height: 380 }}
    />
  );
}

function RoastLiveControl() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);
  const advanceLock = useRef(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ["roast-live-session", id],
    enabled: !!user?.id,
    refetchInterval: 7_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_sessions")
        .select("*")
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
    queryKey: ["roast-live-questions", id],
    enabled: !!user?.id && !!session,
    refetchInterval: 7_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roast_questions")
        .select("id, asker_name, question_text, phase, race_round, is_answered")
        .eq("session_id", id)
        .is("removed_at", null);
      if (error) {
        console.error("[roast] questions load failed:", error);
        return [];
      }
      return (data ?? []) as QuestionRow[];
    },
  });

  // RLS hides written-question text from the founder until the written round;
  // the pool size comes from a SECURITY DEFINER counter instead.
  const { data: poolCount = 0 } = useQuery({
    queryKey: ["roast-live-pool", id],
    enabled: !!session,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("roast_question_pool_count", {
        p_session_id: id,
      });
      if (error) {
        console.error("[roast] pool count failed:", error);
        return 0;
      }
      return (data as number) ?? 0;
    },
  });

  const { data: audienceCount = 0 } = useQuery({
    queryKey: ["roast-live-audience", id],
    enabled: !!session,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("roast_audience")
        .select("id", { count: "exact", head: true })
        .eq("session_id", id);
      if (error) {
        console.error("[roast] audience count failed:", error);
        return 0;
      }
      return count ?? 0;
    },
  });

  // Realtime: refetch on any session/question change
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`roast-control-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roast_sessions",
          filter: `id=eq.${id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["roast-live-session", id] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roast_questions",
          filter: `session_id=eq.${id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["roast-live-questions", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, qc]);

  // Deadline watchdog — the machine advances itself even if only this tab is open
  useEffect(() => {
    if (!session?.phase_deadline || !LIVE_STATUSES.includes(session.status))
      return;
    const t = setInterval(async () => {
      if (advanceLock.current) return;
      if (new Date(session.phase_deadline!).getTime() <= Date.now()) {
        advanceLock.current = true;
        try {
          await autoAdvanceRoast({ data: { sessionId: id } });
          qc.invalidateQueries({ queryKey: ["roast-live-session", id] });
        } catch (e) {
          console.error("[roast] auto-advance failed:", e);
        } finally {
          advanceLock.current = false;
        }
      }
    }, 1_500);
    return () => clearInterval(t);
  }, [session?.phase_deadline, session?.status, id, qc]);

  const countdown = useCountdown(session?.phase_deadline ?? null);

  const act = async (action: "start" | "end_qa" | "cancel") => {
    if (acting) return;
    if (
      action === "cancel" &&
      !confirm("Cancel this Roast? This cannot be undone.")
    )
      return;
    setActing(action);
    try {
      const {
        data: { session: auth },
      } = await supabase.auth.getSession();
      if (!auth) {
        toast.error("Session expired — sign in again");
        return;
      }
      const r = await controlRoast({
        data: { userAccessToken: auth.access_token, sessionId: id, action },
      });
      if (r.ok) {
        qc.invalidateQueries({ queryKey: ["roast-live-session", id] });
        if (action === "start") toast.success("You're live. 60 seconds — go.");
        if (action === "end_qa")
          toast.success("Q&A ended — closing statement.");
        if (action === "cancel") toast.success("Roast cancelled");
      } else {
        toast.error(`Could not ${action.replace("_", " ")} — wrong state.`);
      }
    } catch (e) {
      console.error("[roast] control failed:", e);
      toast.error("Action failed. Try again.");
    } finally {
      setActing(null);
    }
  };

  const markAnswered = async (questionId: string) => {
    try {
      const {
        data: { session: auth },
      } = await supabase.auth.getSession();
      if (!auth) {
        toast.error("Session expired");
        return;
      }
      const r = await markLiveQuestionAnswered({
        data: { userAccessToken: auth.access_token, sessionId: id, questionId },
      });
      if (r.ok) {
        toast.success("Marked answered");
        qc.invalidateQueries({ queryKey: ["roast-live-questions", id] });
      } else {
        toast.error("Could not mark answered");
      }
    } catch (e) {
      console.error("[roast] mark answered failed:", e);
      toast.error("Could not mark answered");
    }
  };

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

  const isLive = LIVE_STATUSES.includes(session.status);
  const liveQuestions = questions.filter(
    (q) => q.phase === "live" && !q.is_answered,
  );
  const answeredLive = questions.filter(
    (q) => q.phase === "live" && q.is_answered,
  );
  // During live phases the direct query only returns live-promoted rows;
  // in the written round it returns everything, so prefer the larger signal.
  const writtenCount = Math.max(
    poolCount,
    questions.filter((q) => q.phase === "written").length,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Flame className="h-6 w-6" style={{ color: "#EF4444" }} />
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              Roast control — Level {session.level}
            </h1>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Radio
                  className="h-3 w-3"
                  style={{ color: isLive ? "#EF4444" : undefined }}
                />
                {PHASE_LABEL[session.status] ?? session.status}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {audienceCount}/{session.max_audience}
              </span>
              {session.status === "qa_phase" && (
                <span>Race round {session.current_race_round}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {countdown && isLive && (
            <div
              className="rounded-lg px-4 py-2 text-lg font-bold tabular-nums"
              style={{
                fontFamily: "Syne, sans-serif",
                background: "rgba(239,68,68,0.1)",
                color: "#EF4444",
              }}
            >
              {countdown}
            </div>
          )}
          <a
            href={`/roast/${session.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Public view <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Primary control */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {["scheduled", "lobby"].includes(session.status) && (
          <>
            <button
              onClick={() => act("start")}
              disabled={!!acting}
              className="rounded-lg px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "#EF4444" }}
              data-testid="start-roast"
            >
              {acting === "start" ? "Starting…" : "▶ Start the Roast"}
            </button>
            <button
              onClick={() => act("cancel")}
              disabled={!!acting}
              className="rounded-lg border border-border/60 px-4 py-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel session
            </button>
            <span className="text-xs text-muted-foreground">
              Starting begins your 60-second pitch immediately. The rest runs on
              the clock — you can't pause it.
            </span>
          </>
        )}
        {session.status === "qa_phase" && (
          <button
            onClick={() => act("end_qa")}
            disabled={!!acting}
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: "rgba(239,68,68,0.4)", color: "#EF4444" }}
          >
            {acting === "end_qa" ? "Ending…" : "End Q&A early"}
          </button>
        )}
        {["pitch_phase", "question_writing", "closing"].includes(
          session.status,
        ) && (
          <span className="text-xs text-muted-foreground">
            This phase advances automatically when the clock hits zero.
          </span>
        )}
        {session.status === "written_phase" && (
          <a
            href={`/app/roast/${session.id}/answers`}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "#F59E0B" }}
          >
            Go to the answers queue ({writtenCount} written questions) →
          </a>
        )}
      </div>

      {/* Video */}
      {(isLive || session.status === "scheduled") && session.daily_room_url && (
        <div className="mb-6">
          <FounderVideo roomUrl={session.daily_room_url} />
          <div className="text-xs text-muted-foreground mt-2">
            You join with camera and microphone on. The audience is hard-muted
            by the room.
          </div>
        </div>
      )}

      {/* Q&A phase: current live questions */}
      {session.status === "qa_phase" && (
        <div className="rounded-xl border border-border/60 bg-card p-5 mb-5">
          <div
            className="text-sm font-semibold mb-3"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            On the floor now — answer each, then mark it done
          </div>
          {liveQuestions.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              No open questions this round. The next race arms automatically.
            </div>
          ) : (
            <div className="space-y-3">
              {liveQuestions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-lg p-4 flex items-start justify-between gap-4"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {q.asker_name ?? "Challenger"} · round {q.race_round}
                    </div>
                    <div className="text-sm font-medium leading-relaxed">
                      {q.question_text}
                    </div>
                  </div>
                  <button
                    onClick={() => markAnswered(q.id)}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    style={{ background: "#10B981" }}
                  >
                    Mark answered
                  </button>
                </div>
              ))}
            </div>
          )}
          {answeredLive.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {answeredLive.map((q) => (
                <div
                  key={q.id}
                  className="text-xs text-muted-foreground flex items-center gap-2"
                >
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "#10B981" }}
                  />
                  <span className="line-clamp-1">{q.question_text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Written-question counter during live phases — count only, no peeking */}
      {isLive && (
        <div className="rounded-xl border border-border/60 bg-card p-4 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">
            {writtenCount} written question{writtenCount === 1 ? "" : "s"}
          </span>{" "}
          waiting in the pool. You'll see the text when one wins a race — or in
          the written round after the session. No previews: that's the point.
        </div>
      )}
    </div>
  );
}

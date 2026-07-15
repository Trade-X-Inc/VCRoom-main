import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  getRoastPublicState, joinRoastAudience, submitWrittenQuestion,
  submitRaceClick, autoAdvanceRoast, ROAST_LEVELS,
} from "@/lib/roast-fn";

// ─────────────────────────────────────────────────────────────────────────────
// /roast/[id] — the public Roast page. Light theme (institutional public
// surface). All countdowns run on server time via clock_offset; phase changes
// arrive over realtime on roast_sessions and are re-fetched through the
// redacting server loader (questions have no public RLS by design).
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/roast/$id")({
  head: () => ({
    meta: [
      { title: "Founder Roast — Hockystick" },
      { name: "description", content: "A live public pitch challenge: 1-minute pitch, competitive Q&A, every question answered on the record." },
    ],
  }),
  component: RoastPage,
});

type PublicState = Extract<Awaited<ReturnType<typeof getRoastPublicState>>, { ok: true }>;

const SYNE = "Syne, sans-serif";
const DM = "DM Sans, sans-serif";

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtLong(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return fmtClock(ms);
}

/** Ticking hook on server-corrected time. */
function useServerNow(clockOffset: number) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  return Date.now() + clockOffset;
}

// ── Race button — the heart of the feature ──────────────────────────────────
// STATE 1 waiting (muted, subtle pulse, live countdown)
// STATE 2 active (full red, glow, haptic, exactly one click)
// STATE 3 result (winner green + question shown / missed → fast reset)

function RaceButton({
  raceOpensAt, round, sessionId, myQuestion, hasClickedRound, onResult,
}: {
  raceOpensAt: number; // server-time ms when this round's button goes hot
  round: number;
  sessionId: string;
  myQuestion: { text: string } | null;
  hasClickedRound: number | null;
  onResult: (r: { rank: number; madeIt: boolean; round: number }) => void;
}) {
  const [state, setState] = useState<"waiting" | "active" | "submitting" | "won" | "missed">("waiting");
  const [result, setResult] = useState<{ rank: number; madeIt: boolean } | null>(null);
  const clickedRef = useRef(false);
  const vibrated = useRef<number | null>(null);
  const serverNow = useServerNow(0); // offset applied by parent via raceOpensAt

  const msToOpen = raceOpensAt - serverNow;
  const isOpen = msToOpen <= 0;

  // Starting gun: haptic the instant the button arms (once per round)
  useEffect(() => {
    if (isOpen && vibrated.current !== round && state === "waiting") {
      vibrated.current = round;
      try { navigator.vibrate?.([50]); } catch { /* unsupported */ }
      setState("active");
    }
    if (!isOpen && (state === "active" || state === "won" || state === "missed")) {
      // New round pending — fast reset
      setState("waiting");
      setResult(null);
      clickedRef.current = false;
    }
  }, [isOpen, round, state]);

  const click = useCallback(async () => {
    if (clickedRef.current || state !== "active") return;
    clickedRef.current = true; // exactly one click
    setState("submitting");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Sign in to race"); setState("active"); clickedRef.current = false; return; }
      const r = await submitRaceClick({ data: { userAccessToken: session.access_token, sessionId, round } });
      if (r.ok && r.rank != null) {
        setResult({ rank: r.rank, madeIt: !!r.madeIt });
        setState(r.madeIt ? "won" : "missed");
        onResult({ rank: r.rank, madeIt: !!r.madeIt, round });
      } else if (r.error === "already_clicked") {
        setState("missed");
      } else if (r.error === "no_eligible_question") {
        toast.error("Write your question first — it races for you.");
        setState("active");
        clickedRef.current = false;
      } else {
        setState("active");
        clickedRef.current = false;
      }
    } catch {
      setState("active");
      clickedRef.current = false;
    }
  }, [state, sessionId, round, onResult]);

  const alreadyRaced = hasClickedRound === round && state === "waiting";

  if (!myQuestion) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        Write a question below to enter the race.
      </div>
    );
  }

  // STATE 3 — winner
  if (state === "won" && result) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "#059669" }}>
        <div className="text-2xl font-extrabold text-foreground" style={{ fontFamily: SYNE }}>
          ⚡ You're in — Rank {result.rank}!
        </div>
        <div className="mt-3 rounded-lg bg-accent px-4 py-3 text-sm text-muted-foreground">"{myQuestion.text}"</div>
        <div className="mt-2 text-xs text-muted-foreground">Your question is live. The founder answers it on camera.</div>
      </div>
    );
  }

  // STATE 3 — missed (fast reset back into the countdown)
  if ((state === "missed" && result) || alreadyRaced) {
    return (
      <div className="rounded-2xl border-2 border-gray-200 bg-gray-100 p-6 text-center">
        <div className="text-lg font-bold text-gray-500" style={{ fontFamily: SYNE }}>
          {result ? `#${result.rank} — just missed it` : "You raced this round"}
        </div>
        <div className="mt-1 text-sm text-[#71717A]">Next race in {fmtClock(msToOpen > 0 ? msToOpen : 0)}</div>
      </div>
    );
  }

  // STATE 2 — active
  if (state === "active" || state === "submitting") {
    return (
      <button
        onClick={click}
        disabled={state === "submitting"}
        data-testid="race-button-active"
        className="w-full rounded-2xl py-8 text-3xl font-extrabold text-foreground transition-transform active:scale-95"
        style={{
          fontFamily: SYNE,
          background: "#EF4444",
          boxShadow: "0 0 0 4px rgba(239,68,68,0.25), 0 0 48px rgba(239,68,68,0.55)",
          animation: "roast-glow 0.9s ease-in-out infinite",
        }}
      >
        {state === "submitting" ? "…" : "SUBMIT NOW"}
      </button>
    );
  }

  // STATE 1 — waiting
  return (
    <button
      disabled
      data-testid="race-button-waiting"
      className="w-full cursor-not-allowed rounded-2xl border-2 border-gray-300 bg-gray-200 py-8 text-2xl font-bold text-gray-500"
      style={{ fontFamily: SYNE, animation: "roast-pulse 2s ease-in-out infinite" }}
    >
      Next race in {fmtClock(msToOpen)}
    </button>
  );
}

// ── Video embed (Daily) ──────────────────────────────────────────────────────

function RoastVideo({ roomUrl, isFounder, compact }: { roomUrl: string; isFounder: boolean; compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || frameRef.current) return;
      const { default: DailyIframe } = await import("@daily-co/daily-js");
      if (cancelled || !containerRef.current) return;
      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "12px" },
        showLeaveButton: false,
        showFullscreenButton: true,
      });
      frameRef.current = frame;
      frame.join({
        url: roomUrl,
        // Audience is hard-muted by room config; the founder turns on locally
        startVideoOff: !isFounder,
        startAudioOff: !isFounder,
      }).catch((e: any) => console.error("[roast] daily join failed:", e));
    })();
    return () => {
      cancelled = true;
      try { frameRef.current?.destroy(); } catch { /* already gone */ }
      frameRef.current = null;
    };
  }, [roomUrl, isFounder]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl bg-black"
      style={{ height: compact ? 240 : 420 }}
    />
  );
}

// ── Q&A record (used by written/completed/expired states) ───────────────────

function QARecord({ state }: { state: PublicState }) {
  const answered = state.questions.filter((q) => q.is_answered);
  const unanswered = state.questions.filter((q) => !q.is_answered);
  return (
    <div className="space-y-6">
      {answered.length > 0 && (
        <div className="space-y-3">
          {answered.map((q, i) => (
            <div key={q.id} id={`q-${i + 1}`} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-gray-900">{q.question_text}</div>
                <span className="shrink-0 text-[11px] text-[#71717A]">Q{i + 1}{q.phase === "live" ? " · live" : ""}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Asked by {q.asker_name}
                {q.asker_is_investor && (
                  <span className="ml-1.5 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">Verified investor</span>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{q.answer_text}</p>
              {q.answer_flag && (
                <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Minimal answer — the founder confirmed this as final{q.flag_note ? `: "${q.flag_note}"` : "."}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {unanswered.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#71717A]">
            Awaiting written answers ({unanswered.length})
          </div>
          <div className="space-y-1.5">
            {unanswered.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 px-4 py-2.5 text-sm">
                <span className="text-gray-500">Question from {q.asker_name}</span>
                <span className="text-[11px] text-[#71717A]">hidden until answered</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {state.removedCount > 0 && (
        <div className="text-xs text-[#71717A]">
          {state.removedCount} question{state.removedCount !== 1 ? "s" : ""} removed by platform moderation. Founders cannot remove questions.
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function RoastPage() {
  const { id: sessionId } = Route.useParams();
  const [state, setState] = useState<PublicState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [myQuestionText, setMyQuestionText] = useState("");
  const [savedQuestion, setSavedQuestion] = useState<{ text: string; live: boolean } | null>(null);
  const [joining, setJoining] = useState(false);
  const [lastRace, setLastRace] = useState<{ round: number; rank: number; madeIt: boolean } | null>(null);
  const advanceLock = useRef(false);

  // Public pages force light theme (same pattern as pricing/landing)
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    return () => {
      if (hadDark) {
        root.classList.add("dark");
        root.setAttribute("data-theme", "dark");
        root.style.colorScheme = "dark";
      }
    };
  }, []);

  const refetch = useCallback(async () => {
    const result = await getRoastPublicState({ data: { sessionId } }).catch(() => null);
    if (!result || !result.ok) { setNotFound(true); return; }
    setState(result);
    // clock_offset: serverNow − clientNow; applied to every countdown so a
    // fast local clock can't fire the race gun early.
    setClockOffset(new Date(result.serverNow).getTime() - Date.now());
  }, [sessionId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Who am I (for founder view / my question)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setMe({ id: session.user.id });
    });
  }, []);

  // My own question (asker RLS lets me read it)
  useEffect(() => {
    if (!me || !state) return;
    supabase.from("roast_questions")
      .select("question_text, phase")
      .eq("session_id", sessionId).eq("asker_id", me.id).maybeSingle()
      .then(({ data }) => {
        if (data) setSavedQuestion({ text: data.question_text, live: data.phase === "live" });
      });
  }, [me, sessionId, state?.session?.status]);

  // Realtime: phase + race events drive refetches. Poll as fallback.
  useEffect(() => {
    const channel = supabase
      .channel(`roast:${sessionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "roast_sessions", filter: `id=eq.${sessionId}` }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "roast_race_events", filter: `session_id=eq.${sessionId}` }, () => refetch())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "roast_audience", filter: `session_id=eq.${sessionId}` }, () => refetch())
      .subscribe();
    const poll = setInterval(refetch, 7000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [sessionId, refetch]);

  const serverNow = useServerNow(clockOffset);

  // Deadline watchdog: any client may trigger the idempotent auto-advance.
  useEffect(() => {
    if (!state?.session?.phase_deadline) return;
    const deadline = new Date(state.session.phase_deadline).getTime();
    if (serverNow > deadline + 400 && !advanceLock.current) {
      advanceLock.current = true;
      autoAdvanceRoast({ data: { sessionId } })
        .then(() => refetch())
        .finally(() => { setTimeout(() => { advanceLock.current = false; }, 2000); });
    }
  }, [serverNow, state?.session?.phase_deadline, sessionId, refetch]);

  // Race round sync during qa_phase (round boundaries also need the nudge)
  const raceInfo = useMemo(() => {
    const s = state?.session;
    if (!s || s.status !== "qa_phase" || !s.phase_deadline) return null;
    const qaEnd = new Date(s.phase_deadline).getTime();
    const qaStart = qaEnd - s.qa_duration_minutes * 60_000;
    const interval = s.race_interval_seconds * 1000;
    const elapsed = serverNow - qaStart;
    const currentRound = Math.max(1, Math.floor(elapsed / interval) + 1);
    const roundOpensAt = qaStart + (currentRound - 1) * interval;
    return { qaEnd, currentRound, roundOpensAt };
  }, [state?.session, serverNow]);

  useEffect(() => {
    if (!raceInfo || !state) return;
    if (raceInfo.currentRound !== state.session.current_race_round && !advanceLock.current) {
      advanceLock.current = true;
      autoAdvanceRoast({ data: { sessionId } })
        .then(() => refetch())
        .finally(() => { setTimeout(() => { advanceLock.current = false; }, 1500); });
    }
  }, [raceInfo?.currentRound, state?.session?.current_race_round, sessionId, refetch]);

  const join = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = `/sign-up?role=challenger&redirect=/roast/${sessionId}`;
      return;
    }
    setJoining(true);
    try {
      const r = await joinRoastAudience({ data: { userAccessToken: session.access_token, sessionId } });
      if (r.ok) { toast.success("You're in — write a sharp question."); refetch(); }
      else if (r.error === "session_full") toast.error("This Roast is full.");
      else toast.error("Could not join — try again.");
    } finally {
      setJoining(false);
    }
  };

  const saveQuestion = async () => {
    const text = myQuestionText.trim();
    if (text.length < 10) { toast.error("Ask something specific — at least 10 characters."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sign in first"); return; }
    const r = await submitWrittenQuestion({ data: { userAccessToken: session.access_token, sessionId, questionText: text } });
    if (r.ok) {
      setSavedQuestion({ text, live: false });
      toast.success("Question locked in — race to get it asked live.");
    } else if (r.error === "join_first") {
      toast.error("Join as a challenger first.");
    } else if (r.error === "question_already_live") {
      toast.error("Your question already went live — it can't be changed.");
    } else {
      toast.error("Could not save your question.");
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-6 py-32 text-center">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: SYNE }}>Roast not found</h1>
          <p className="mt-2 text-sm text-gray-600">This session doesn't exist or isn't public.</p>
          <Link to="/" className="mt-6 inline-block rounded-lg hs-gradient px-5 py-2.5 text-sm font-semibold text-white">Back to Hockystick</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-6 py-32 text-center text-sm text-gray-500">Loading the Roast…</div>
      </div>
    );
  }

  const s = state.session;
  const st = state.startup;
  const isFounder = !!me && me.id === s.founder_id;
  const iAmIn = !!me && state.audience.some((a) => a.user_id === me.id);
  const levelCfg = ROAST_LEVELS[s.level as 1 | 2 | 3];
  const deadlineMs = s.phase_deadline ? new Date(s.phase_deadline).getTime() - serverNow : null;
  const liveQuestions = state.questions.filter((q) => q.phase === "live");
  const currentLive = liveQuestions.filter((q) => q.race_round === s.current_race_round);
  const answeredCount = state.questions.filter((q) => q.is_answered).length;
  const isLivePhase = ["pitch_phase", "question_writing", "qa_phase", "closing"].includes(s.status);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Race button keyframes */}
      <style>{`
        @keyframes roast-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.75 } }
        @keyframes roast-glow {
          0%,100% { box-shadow: 0 0 0 4px rgba(239,68,68,0.25), 0 0 48px rgba(239,68,68,0.55); transform: scale(1); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0.35), 0 0 72px rgba(239,68,68,0.8); transform: scale(1.015); }
        }
      `}</style>
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        {/* Header — always visible */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl hs-gradient text-lg font-bold text-white" style={{ fontFamily: SYNE }}>
              {(st?.company_name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: SYNE }}>{st?.company_name}</h1>
              <div className="text-sm text-gray-500">{st?.one_liner ?? st?.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
              🔥 Level {s.level} Roast
            </span>
            {isLivePhase && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white" style={{ animation: "roast-pulse 1.5s infinite" }}>LIVE</span>}
          </div>
        </div>

        {/* ── SCHEDULED / LOBBY ── */}
        {["scheduled", "lobby"].includes(s.status) && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-8 text-center">
              <div className="text-xs font-semibold uppercase tracking-widest text-purple-700">
                {s.status === "lobby" ? "Starting any moment" : "Starts in"}
              </div>
              <div className="mt-2 text-5xl font-extrabold text-gray-900" style={{ fontFamily: SYNE }}>
                {s.status === "lobby" ? "🔴" : fmtLong(new Date(s.scheduled_at).getTime() - serverNow)}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {new Date(s.scheduled_at).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!iAmIn && !isFounder && (
                  <button
                    onClick={join}
                    disabled={joining}
                    className="rounded-xl hs-gradient px-6 py-3 text-sm font-bold text-white hover:hs-gradient disabled:opacity-60"
                  >
                    {joining ? "Joining…" : "Join as challenger"}
                  </button>
                )}
                {iAmIn && <span className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">✓ You have a challenger seat</span>}
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
                  className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Share this Roast
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-500">
                {state.audienceCount} of {levelCfg.maxAudience} challenger seats taken
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["1", "60-second pitch", "The founder pitches. Mic cuts at exactly 0:00."],
                ["2", "Write your question", "Everyone writes one question in 60 seconds. Nobody sees it yet."],
                ["3", "Race to ask", `Every ${Math.round(s.race_interval_seconds / 60)} minutes a red button arms. First ${s.race_winners_per_round} clicks put their questions to the founder live. Everything unasked must be answered in writing within 48 hours — or the badge is lost.`],
              ].map(([n, title, body]) => (
                <div key={n as string} className="rounded-xl border border-gray-200 p-5">
                  <div className="grid h-8 w-8 place-items-center rounded-full hs-gradient text-sm font-bold text-white">{n}</div>
                  <div className="mt-3 text-sm font-semibold" style={{ fontFamily: SYNE }}>{title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-gray-500">{body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LIVE PHASES ── */}
        {isLivePhase && s.daily_room_url && (
          <div className="space-y-5">
            <RoastVideo roomUrl={s.daily_room_url} isFounder={isFounder} compact={s.status !== "pitch_phase"} />

            {/* PITCH */}
            {s.status === "pitch_phase" && (
              <div className="rounded-2xl bg-gray-900 p-8 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-red-400">The pitch — mic cuts at zero</div>
                <div className="mt-2 text-7xl font-extrabold text-foreground tabular-nums" style={{ fontFamily: SYNE }}>
                  {deadlineMs != null ? fmtClock(deadlineMs) : "1:00"}
                </div>
                {!isFounder && <div className="mt-3 text-sm text-gray-400">Listen carefully — question writing opens the moment this hits 0:00.</div>}
                {isFounder && <div className="mt-3 text-sm text-gray-400">You're live. Make the minute count.</div>}
              </div>
            )}

            {/* QUESTION WRITING */}
            {s.status === "question_writing" && (
              <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-purple-800" style={{ fontFamily: SYNE }}>
                    {isFounder ? "The audience is writing questions" : "Write your question now"}
                  </div>
                  <div className="text-2xl font-extrabold text-purple-700 tabular-nums" style={{ fontFamily: SYNE }}>
                    {deadlineMs != null ? fmtClock(deadlineMs) : "1:00"}
                  </div>
                </div>
                {!isFounder && iAmIn && (
                  <>
                    <textarea
                      value={myQuestionText}
                      onChange={(e) => setMyQuestionText(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="One sharp, specific question. It stays hidden until it's asked or answered."
                      className="mt-3 w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-base text-gray-900 focus:border-brand focus:outline-none"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{state.questions.length} questions locked in</span>
                      <button onClick={saveQuestion} className="rounded-lg hs-gradient px-5 py-2 text-sm font-bold text-white hover:hs-gradient">
                        {savedQuestion ? "Update question" : "Lock in question"}
                      </button>
                    </div>
                    {savedQuestion && <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-gray-600">Locked: "{savedQuestion.text}"</div>}
                  </>
                )}
                {!isFounder && !iAmIn && (
                  <div className="mt-3 text-sm text-gray-600">
                    You're watching as an observer. <button onClick={join} className="font-semibold text-purple-700 underline">Grab a challenger seat</button> to ask.
                  </div>
                )}
                {isFounder && (
                  <div className="mt-3 text-sm text-gray-600">{state.questions.length} questions being written. You'll face the first three shortly.</div>
                )}
              </div>
            )}

            {/* QA — the race */}
            {s.status === "qa_phase" && raceInfo && (
              <div className="space-y-4">
                {/* Current live questions */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-bold" style={{ fontFamily: SYNE }}>Round {s.current_race_round} — live questions</div>
                    <div className="text-xs text-gray-500">Q&A ends in {fmtClock(raceInfo.qaEnd - serverNow)}</div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[0, 1, 2].map((slot) => {
                      const q = currentLive[slot];
                      return (
                        <div key={slot} className={`rounded-xl border-2 p-3 text-sm min-h-[84px] ${q ? "border-red-200 bg-red-50" : "border-dashed border-gray-200 bg-gray-50"}`}>
                          {q ? (
                            <>
                              <div className="font-medium text-gray-900">{q.question_text}</div>
                              <div className="mt-1 text-[11px] text-gray-500">
                                {q.asker_name}{q.asker_is_investor ? " · Verified investor" : ""}
                              </div>
                            </>
                          ) : (
                            <div className="grid h-full place-items-center text-xs text-[#71717A]">Slot {slot + 1} — won by the race</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* The race button */}
                {!isFounder && iAmIn && (
                  <RaceButton
                    raceOpensAt={raceInfo.roundOpensAt + clockOffset * 0} // roundOpensAt already in server time
                    round={raceInfo.currentRound}
                    sessionId={sessionId}
                    myQuestion={savedQuestion && !savedQuestion.live ? { text: savedQuestion.text } : null}
                    hasClickedRound={lastRace?.round ?? null}
                    onResult={(r) => setLastRace(r)}
                  />
                )}
                {!isFounder && iAmIn && savedQuestion?.live && (
                  <div className="rounded-xl bg-green-50 p-4 text-center text-sm font-semibold text-green-700">
                    ⚡ Your question made it live — watch the founder answer.
                  </div>
                )}
                {!isFounder && !iAmIn && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                    Watching as observer — challenger seats race to ask.
                  </div>
                )}
                {isFounder && currentLive.length > 0 && (
                  <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-widest text-red-600">Answer on camera — ~{Math.round(s.answer_seconds_per_question / 60)} min each</div>
                    {currentLive.map((q, i) => (
                      <div key={q.id} className="mt-2 text-sm font-medium text-gray-900">{i + 1}. {q.question_text} <span className="text-xs text-gray-500">— {q.asker_name}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CLOSING */}
            {s.status === "closing" && (
              <div className="rounded-2xl bg-gray-900 p-8 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand">Closing statement</div>
                <div className="mt-2 text-4xl font-extrabold text-foreground tabular-nums" style={{ fontFamily: SYNE }}>
                  {deadlineMs != null ? fmtClock(deadlineMs) : "2:00"}
                </div>
                <div className="mt-4 flex justify-center gap-8 text-sm">
                  <div><span className="text-2xl font-bold text-green-400">{liveQuestions.length}</span><div className="text-gray-400">answered live</div></div>
                  <div><span className="text-2xl font-bold text-amber-400">{state.questions.length - liveQuestions.length}</span><div className="text-gray-400">go to the written round</div></div>
                </div>
                <div className="mt-3 text-xs text-gray-500">Badge pending — every written question must be answered within 48 hours.</div>
              </div>
            )}
          </div>
        )}

        {/* ── WRITTEN / COMPLETED / EXPIRED ── */}
        {["written_phase", "completed", "expired"].includes(s.status) && (
          <div className="space-y-6">
            <div className={`rounded-2xl border-2 p-6 ${s.status === "completed" ? "border-green-200 bg-green-50" : s.status === "expired" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              {s.status === "written_phase" && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-amber-800" style={{ fontFamily: SYNE }}>Written round in progress</div>
                    {s.written_deadline_at && (
                      <div className="text-sm font-semibold text-amber-700">
                        {fmtLong(new Date(s.written_deadline_at).getTime() - serverNow)} left
                      </div>
                    )}
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-200/60">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${state.questions.length ? Math.round((answeredCount / state.questions.length) * 100) : 0}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-amber-700">
                    Founder has answered {answeredCount}/{state.questions.length} questions. Badge unlocks at {state.questions.length}/{state.questions.length}.
                  </div>
                </>
              )}
              {s.status === "completed" && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-green-800" style={{ fontFamily: SYNE }}>
                      🔥 Roast complete — all {state.questions.length} questions answered
                    </div>
                    <div className="mt-1 text-xs text-green-700">Roast Survivor · Level {s.level} awarded {s.badge_awarded_at ? new Date(s.badge_awarded_at).toLocaleDateString() : ""}</div>
                  </div>
                  {st?.profile_slug && (
                    <a href={`/p/${st.profile_slug}`} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700">
                      View verified profile →
                    </a>
                  )}
                </div>
              )}
              {s.status === "expired" && (
                <div>
                  <div className="text-sm font-bold text-red-800" style={{ fontFamily: SYNE }}>
                    Incomplete — the 48-hour written round expired
                  </div>
                  <div className="mt-1 text-xs text-red-700">
                    The founder completed the live session but answered {answeredCount} of {state.questions.length} written questions before the deadline. No badge was awarded. This record is permanent.
                  </div>
                </div>
              )}
            </div>

            <QARecord state={state} />

            <div className="flex justify-center">
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Share this Roast
              </button>
            </div>
          </div>
        )}

        {s.status === "cancelled" && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
            This Roast was cancelled before going live.
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Loader2,
  Calendar,
  Users,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { createRoastSession, controlRoast, ROAST_LEVELS } from "@/lib/roast-fn";

export const Route = createFileRoute("/app/roast/")({
  component: RoastManagement,
});

const STATUS_PILL: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  scheduled: {
    label: "Scheduled",
    bg: "rgba(124,58,237,0.12)",
    color: "#A855F7",
  },
  lobby: { label: "Lobby open", bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  pitch_phase: { label: "LIVE", bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
  question_writing: {
    label: "LIVE",
    bg: "rgba(239,68,68,0.12)",
    color: "#EF4444",
  },
  qa_phase: { label: "LIVE", bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
  closing: { label: "LIVE", bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
  written_phase: {
    label: "Written round",
    bg: "rgba(245,158,11,0.12)",
    color: "#F59E0B",
  },
  completed: {
    label: "Completed",
    bg: "rgba(16,185,129,0.12)",
    color: "#10B981",
  },
  expired: {
    label: "Expired — incomplete",
    bg: "rgba(239,68,68,0.12)",
    color: "#EF4444",
  },
  cancelled: {
    label: "Cancelled",
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.4)",
  },
};

const LIVE_STATUSES = [
  "lobby",
  "pitch_phase",
  "question_writing",
  "qa_phase",
  "closing",
];

interface RoastSessionRow {
  id: string;
  status: string;
  level: number;
  scheduled_at: string;
  max_audience: number;
  badge_awarded: boolean;
  written_deadline_at: string | null;
}

function RoastManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showSchedule, setShowSchedule] = useState(false);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [rulesAck, setRulesAck] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: startup } = useQuery({
    queryKey: ["roast-startup", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name")
        .eq("founder_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["roast-sessions", startup?.id],
    enabled: !!startup?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("roast_sessions")
        .select("*")
        .eq("startup_id", startup!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as RoastSessionRow[];
    },
  });

  const { data: questionCounts = {} } = useQuery({
    queryKey: ["roast-question-counts", startup?.id, sessions.length],
    enabled: sessions.length > 0,
    queryFn: async () => {
      const ids = sessions.map((s) => s.id);
      const { data } = await supabase
        .from("roast_questions")
        .select("session_id, is_answered")
        .in("session_id", ids)
        .is("removed_at", null);
      const counts: Record<string, { total: number; answered: number }> = {};
      for (const q of data ?? []) {
        counts[q.session_id] ??= { total: 0, answered: 0 };
        counts[q.session_id].total++;
        if (q.is_answered) counts[q.session_id].answered++;
      }
      return counts;
    },
  });

  const activeSession = sessions.find((s) =>
    [
      "scheduled",
      "lobby",
      "pitch_phase",
      "question_writing",
      "qa_phase",
      "closing",
      "written_phase",
    ].includes(s.status),
  );

  const schedule = async () => {
    if (!startup?.id || creating) return;
    if (!dateStr || !timeStr) {
      toast.error("Pick a date and time.");
      return;
    }
    if (!rulesAck) {
      toast.error("You must acknowledge the Roast rules first.");
      return;
    }
    const scheduledAt = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()) {
      toast.error("Pick a future date and time.");
      return;
    }
    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired — sign in again");
        return;
      }
      const r = await createRoastSession({
        data: {
          userAccessToken: session.access_token,
          startupId: startup.id,
          level,
          scheduledAt: scheduledAt.toISOString(),
          rulesAcknowledged: rulesAck,
        },
      });
      if (r.ok && r.sessionId) {
        navigator.clipboard
          .writeText(`https://hockystick.app/roast/${r.sessionId}`)
          .catch(() => {});
        toast.success(
          "Roast scheduled — public link copied. Share it to fill the room.",
        );
        setShowSchedule(false);
        setRulesAck(false);
        qc.invalidateQueries({ queryKey: ["roast-sessions", startup.id] });
      } else if (r.error === "session_already_active") {
        toast.error(
          "You already have an active Roast — finish or cancel it first.",
        );
      } else if (
        r.error === "video_unavailable" ||
        r.error === "video_room_failed"
      ) {
        toast.error("Video room could not be created. Try again in a minute.");
      } else {
        toast.error("Could not schedule the Roast.");
      }
    } catch (e) {
      console.error("[roast] schedule failed:", e);
      toast.error("Could not schedule the Roast.");
    } finally {
      setCreating(false);
    }
  };

  const cancel = async (sessionId: string) => {
    if (
      !confirm(
        "Cancel this Roast? Registered challengers will see it as cancelled.",
      )
    )
      return;
    setCancellingId(sessionId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired");
        return;
      }
      const r = await controlRoast({
        data: {
          userAccessToken: session.access_token,
          sessionId,
          action: "cancel",
        },
      });
      if (r.ok) {
        toast.success("Roast cancelled");
        qc.invalidateQueries({ queryKey: ["roast-sessions", startup?.id] });
      } else
        toast.error("Could not cancel — live sessions can't be cancelled.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight flex items-center gap-2"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            <Flame className="h-6 w-6" style={{ color: "#EF4444" }} /> Founder
            Roast
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A live public pitch challenge. One minute to pitch, a competitive
            Q&A, and every question answered on the record.
          </p>
        </div>
        {!activeSession && startup?.id && (
          <button
            onClick={() => setShowSchedule(true)}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            style={{ background: "#EF4444" }}
            data-testid="schedule-roast-btn"
          >
            Schedule a Roast
          </button>
        )}
      </div>

      {!startup?.id && (
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          Build your{" "}
          <Link
            to="/app/profile-builder"
            className="text-brand hover:underline"
          >
            company profile
          </Link>{" "}
          first — the Roast is attached to it.
        </div>
      )}

      {/* Schedule form */}
      {showSchedule && (
        <div
          className="mb-6 rounded-xl border-2 bg-card p-6"
          style={{ borderColor: "rgba(239,68,68,0.4)" }}
        >
          <div
            className="text-sm font-semibold mb-4"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Schedule your Roast
          </div>

          {/* Level selector */}
          <div className="grid gap-3 sm:grid-cols-3 mb-5">
            {([1, 2, 3] as const).map((l) => {
              const cfg = ROAST_LEVELS[l];
              const selected = level === l;
              return (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className="rounded-xl border-2 p-4 text-left transition-colors"
                  style={{
                    borderColor: selected
                      ? "#EF4444"
                      : "rgba(255,255,255,0.08)",
                    background: selected
                      ? "rgba(239,68,68,0.06)"
                      : "transparent",
                  }}
                >
                  <div
                    className="text-sm font-bold"
                    style={{ fontFamily: "Syne, sans-serif" }}
                  >
                    Level {l}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Up to {cfg.maxAudience} challengers · {cfg.qaMinutes} min
                    Q&A
                  </div>
                  <div className="text-xs mt-2">
                    <span className="line-through text-muted-foreground">
                      ${cfg.priceUsd}
                    </span>{" "}
                    <span
                      className="font-semibold"
                      style={{ color: "#10B981" }}
                    >
                      Free during beta
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 mb-5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Date
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Time (your local time)
              </label>
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
          </div>

          {/* The rules — explicit acknowledgement required */}
          <div
            className="rounded-lg p-4 mb-4"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: "#EF4444" }}
              />
              <div className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  The Roast rules — read before scheduling.
                </span>
                <ul className="mt-1.5 space-y-1 list-disc pl-4">
                  <li>
                    The session is public and stays public until your funding
                    round closes.
                  </li>
                  <li>
                    <span className="font-semibold text-foreground">
                      You cannot delete or hide questions — ever.
                    </span>{" "}
                    Only platform moderation can remove abuse, and removals are
                    publicly counted.
                  </li>
                  <li>
                    Every question not answered live must be answered in writing
                    within 48 hours, or the session is permanently marked
                    incomplete and no badge is awarded.
                  </li>
                  <li>
                    Minimal answers ("yes", "noted") are flagged; flags stay
                    visible even if you confirm them.
                  </li>
                </ul>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rulesAck}
                onChange={(e) => setRulesAck(e.target.checked)}
                className="h-4 w-4"
                data-testid="rules-ack"
              />
              <span className="text-xs font-medium text-foreground">
                I understand and accept these rules.
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={schedule}
              disabled={creating || !rulesAck}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#EF4444" }}
              data-testid="confirm-schedule"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Schedule Level ${level} Roast`
              )}
            </button>
            <button
              onClick={() => setShowSchedule(false)}
              className="rounded-lg border border-border/60 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sessions */}
      {isLoading ? (
        <div className="rounded-xl border border-border/60 bg-card p-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : sessions.length === 0 && startup?.id ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card p-10 text-center">
          <Flame
            className="h-8 w-8 mx-auto mb-3"
            style={{ color: "rgba(239,68,68,0.4)" }}
          />
          <div className="text-sm font-medium">No Roasts yet</div>
          <div className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            Host a live public pitch challenge to earn the Roast Survivor badge
            — the single strongest trust signal a founder can show an investor.
            Voluntary, on camera, on the record.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const pill = STATUS_PILL[s.status] ?? STATUS_PILL.scheduled;
            const qc2 = questionCounts[s.id];
            const isLive = LIVE_STATUSES.includes(s.status);
            return (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: pill.bg, color: pill.color }}
                    >
                      {pill.label}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">
                        Level {s.level} Roast
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(s.scheduled_at).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          max {s.max_audience}
                        </span>
                        {qc2 && (
                          <span>
                            {qc2.answered}/{qc2.total} answered
                          </span>
                        )}
                        {s.badge_awarded && (
                          <span
                            className="inline-flex items-center gap-1"
                            style={{ color: "#10B981" }}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Badge awarded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {s.status === "scheduled" && (
                      <>
                        <a
                          href={`/app/roast/${s.id}/live`}
                          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
                          style={{ background: "#EF4444" }}
                        >
                          Go live →
                        </a>
                        <button
                          onClick={() => cancel(s.id)}
                          disabled={cancellingId === s.id}
                          className="rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          {cancellingId === s.id ? "…" : "Cancel"}
                        </button>
                      </>
                    )}
                    {isLive && (
                      <a
                        href={`/app/roast/${s.id}/live`}
                        className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
                        style={{ background: "#EF4444" }}
                      >
                        Open control panel →
                      </a>
                    )}
                    {s.status === "written_phase" && (
                      <a
                        href={`/app/roast/${s.id}/answers`}
                        className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
                        style={{ background: "#F59E0B" }}
                      >
                        Answer questions ({qc2 ? qc2.total - qc2.answered : "…"}{" "}
                        left) →
                      </a>
                    )}
                    <a
                      href={`/roast/${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Public page <ExternalLink className="h-3 w-3" />
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `https://hockystick.app/roast/${s.id}`,
                        );
                        toast.success("Public link copied");
                      }}
                      className="rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
                {s.status === "written_phase" && s.written_deadline_at && (
                  <div
                    className="mt-3 rounded-lg px-3.5 py-2.5 text-xs"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.25)",
                      color: "#F59E0B",
                    }}
                  >
                    Written round deadline:{" "}
                    {new Date(s.written_deadline_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    — miss it and the session is permanently marked incomplete.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Flame,
  Loader2,
  Calendar,
  Users,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Video,
  MessageSquareWarning,
  ShieldCheck,
  ChevronDown,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { createRoastSession, controlRoast, ROAST_LEVELS } from "@/lib/roast-fn";
import { PaymentConfirm } from "@/components/app/PaymentConfirm";
import { color, font, radius, space } from "@/lib/design-tokens";

export const Route = createFileRoute("/app/roast/")({
  // R9 relocation: this URL's content moved — see nav-structure.ts.
  beforeLoad: () => {
    throw redirect({ to: "/app/prepare/badges/founder-roast" as any, replace: true });
  },
  component: RoastManagement,
});

const STATUS_PILL: Record<string, { label: string; text: string; bg: string }> = {
  scheduled: { label: "Scheduled", text: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
  lobby: { label: "Lobby open", text: "#B45309", bg: "rgba(217,119,6,0.1)" },
  pitch_phase: { label: "LIVE", text: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  question_writing: { label: "LIVE", text: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  qa_phase: { label: "LIVE", text: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  closing: { label: "LIVE", text: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  written_phase: { label: "Written round", text: "#B45309", bg: "rgba(217,119,6,0.1)" },
  completed: { label: "Completed", text: "#059669", bg: "rgba(5,150,105,0.1)" },
  expired: { label: "Expired — incomplete", text: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  cancelled: { label: "Cancelled", text: color.inkTertiary, bg: "rgba(113,113,122,0.1)" },
};

const LIVE_STATUSES = ["lobby", "pitch_phase", "question_writing", "qa_phase", "closing"];

interface RoastSessionRow {
  id: string;
  status: string;
  level: number;
  scheduled_at: string;
  max_audience: number;
  badge_awarded: boolean;
  written_deadline_at: string | null;
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
        fontSize: 12, fontWeight: 500, color: color.ink, background: color.white,
        border: `1px solid ${color.border}`, borderRadius: radius.control, cursor: "pointer",
        ...style,
      }}
    />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { style, ...rest } = props;
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px",
        fontSize: 13, fontWeight: 500, color: "#fff", background: "#7C3AED",
        border: "none", borderRadius: radius.control, cursor: "pointer",
        ...style,
      }}
    />
  );
}

// R9: `view="reports"` renders only the completed sessions — Founder Roast
// Reports leaf. Unset renders the full management page (schedule + live +
// completed), unchanged.
export function RoastManagement({ view }: { view?: "reports" } = {}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleStep, setScheduleStep] = useState<"details" | "payment">("details");
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [rulesAck, setRulesAck] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  // R13 — the overview/importance block is now always reachable (not a
  // one-time block that vanishes after the first session), open by
  // default only for a founder who has never scheduled one.
  const [overviewOpen, setOverviewOpen] = useState<boolean | null>(null);

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
    queryFn: async () => {
      const { data } = await supabase
        .from("roast_sessions")
        .select("*")
        .eq("startup_id", startup!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as RoastSessionRow[];
    },
  });

  // R13 step 7 — replaces the old refetchInterval: 30_000 poll.
  // roast_sessions was already added to supabase_realtime in R12B — a
  // session's own status changes (e.g. an audience member's action
  // auto-advances a phase via autoAdvanceRoast) now reach this list live
  // instead of up to 30s late.
  useEffect(() => {
    if (!startup?.id) return;
    const channel = supabase
      .channel(`roast-sessions-list:${startup.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roast_sessions", filter: `startup_id=eq.${startup.id}` },
        () => { qc.invalidateQueries({ queryKey: ["roast-sessions", startup.id] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [startup?.id, qc]);

  const isOverviewOpen = overviewOpen ?? sessions.length === 0;

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
    ["scheduled", "lobby", "pitch_phase", "question_writing", "qa_phase", "closing", "written_phase"].includes(s.status),
  );

  const schedule = async (paymentConfirmed: boolean) => {
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
          paymentConfirmed,
        },
      });
      if (r.ok && r.sessionId) {
        navigator.clipboard.writeText(`https://hockystick.app/roast/${r.sessionId}`).catch(() => {});
        toast.success("Roast scheduled — public link copied. Share it to fill the room.");
        setShowSchedule(false);
        setScheduleStep("details");
        setRulesAck(false);
        qc.invalidateQueries({ queryKey: ["roast-sessions", startup.id] });
      } else if (r.error === "session_already_active") {
        toast.error("You already have an active Roast — finish or cancel it first.");
      } else if (r.error === "payment_not_confirmed") {
        toast.error("Confirm payment before scheduling.");
      } else if (r.error === "video_unavailable" || r.error === "video_room_failed") {
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
    if (!confirm("Cancel this Roast? Registered challengers will see it as cancelled.")) return;
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
        data: { userAccessToken: session.access_token, sessionId, action: "cancel" },
      });
      if (r.ok) {
        toast.success("Roast cancelled");
        qc.invalidateQueries({ queryKey: ["roast-sessions", startup?.id] });
      } else toast.error("Could not cancel — live sessions can't be cancelled.");
    } finally {
      setCancellingId(null);
    }
  };

  const cfg = ROAST_LEVELS[level];

  return (
    <div style={{ maxWidth: space.contentMaxWidth, margin: "0 auto", padding: space.page }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: space.block }}>
        <div>
          <h1 style={{ fontFamily: font.display, fontSize: 28, fontWeight: 700, color: color.ink, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Flame style={{ width: 24, height: 24, color: "#DC2626" }} />
            {view === "reports" ? "Founder Roast Reports" : "Founder Roast"}
          </h1>
          <p style={{ fontSize: 13, color: color.inkSecondary, marginTop: 4 }}>
            {view === "reports" ? "Your completed Roast sessions and outcomes." : "Pitch live — answer everything on the record."}
          </p>
        </div>
        {view !== "reports" && !activeSession && startup?.id && (
          <PrimaryButton onClick={() => { setShowSchedule(true); setScheduleStep("details"); }} data-testid="schedule-roast-btn" style={{ background: "#DC2626" }}>
            Schedule a Roast
          </PrimaryButton>
        )}
      </div>

      {!startup?.id && (
        <div style={{ border: `1px solid ${color.border}`, background: color.white, padding: 32, textAlign: "center", fontSize: 13, color: color.inkSecondary }}>
          Build your{" "}
          <Link to="/app/profile-builder" style={{ color: "#7C3AED" }}>
            company profile
          </Link>{" "}
          first — the Roast is attached to it.
        </div>
      )}

      {/* R13 — overview/importance block: always reachable via its own
          toggle, not a one-time block that vanishes after the first
          session. Open by default only if the founder has never run one. */}
      {view !== "reports" && startup?.id && (
        <div style={{ marginBottom: space.block, border: `1px solid ${color.border}`, background: color.white }}>
          <button
            type="button"
            onClick={() => setOverviewOpen(!isOverviewOpen)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            <span style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink }}>
              What is a Founder Roast?
            </span>
            <ChevronDown style={{ width: 16, height: 16, color: color.inkTertiary, transform: isOverviewOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
          </button>
          {isOverviewOpen && (
            <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: color.inkSecondary, lineHeight: 1.6, margin: 0 }}>
                A live, public Q&amp;A where investors and other founders challenge your pitch on the
                record. Every question gets answered — live or in writing within 48 hours — and
                nothing is ever deleted or hidden. It's the strongest trust signal a founder can earn
                on Hockystick: completing one earns a verified Roast badge that stays on your profile.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { icon: Calendar, title: "1. Schedule", body: "Pick a level, pay the fee, and set a time. We generate a public link — share it to fill the room." },
                  { icon: Video, title: "2. Go live", body: "Pitch, then take questions from anyone who joined. Answer on camera in real time." },
                  { icon: MessageSquareWarning, title: "3. Close the loop", body: "Anything unanswered live must get a written answer within 48 hours, or the session is marked incomplete." },
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} style={{ border: `1px solid ${color.border}`, padding: 14 }}>
                    <Icon style={{ width: 14, height: 14, color: "#DC2626", marginBottom: 8 }} />
                    <div style={{ fontSize: 13, fontWeight: 500, color: color.ink }}>{title}</div>
                    <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4, lineHeight: 1.5 }}>{body}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)", padding: 12 }}>
                <ShieldCheck style={{ width: 14, height: 14, color: "#059669", flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: color.inkSecondary, lineHeight: 1.5, margin: 0 }}>
                  Completing a Roast at any level earns a verified badge — the only badge investors know
                  can't be gamed, because the whole thing happened in public.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schedule form */}
      {view !== "reports" && showSchedule && (
        <div style={{ marginBottom: space.block, border: `2px solid rgba(220,38,38,0.4)`, background: color.white, padding: 20 }}>
          <div style={{ fontFamily: font.display, fontSize: 14, fontWeight: 700, color: color.ink, marginBottom: 16 }}>
            Schedule your Roast
          </div>

          {scheduleStep === "details" ? (
            <>
              {/* Level selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                {([1, 2, 3] as const).map((l) => {
                  const c = ROAST_LEVELS[l];
                  const selected = level === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      style={{
                        textAlign: "left", padding: 14, cursor: "pointer",
                        border: selected ? "2px solid #DC2626" : `1px solid ${color.border}`,
                        background: selected ? "rgba(220,38,38,0.04)" : color.white,
                      }}
                    >
                      <div style={{ fontFamily: font.display, fontSize: 13, fontWeight: 700, color: color.ink }}>Level {l}</div>
                      <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4 }}>
                        Up to {c.maxAudience} challengers · {c.qaMinutes} min Q&amp;A
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: color.ink, marginTop: 8 }}>${c.priceUsd}</div>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: color.inkTertiary, marginBottom: 4 }}>Date</label>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    style={{ width: "100%", height: 36, border: `1px solid ${color.border}`, background: color.white, padding: "0 10px", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: color.inkTertiary, marginBottom: 4 }}>Time (your local time)</label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    style={{ width: "100%", height: 36, border: `1px solid ${color.border}`, background: color.white, padding: "0 10px", fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ background: "rgba(220,38,38,0.05)", border: "1px solid rgba(220,38,38,0.2)", padding: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <AlertTriangle style={{ width: 14, height: 14, color: "#DC2626", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12, color: color.inkSecondary, lineHeight: 1.6 }}>
                    <span style={{ fontWeight: 600, color: color.ink }}>The Roast rules — read before scheduling.</span>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                      <li>The session is public and stays public until your funding round closes.</li>
                      <li><span style={{ fontWeight: 600, color: color.ink }}>You cannot delete or hide questions — ever.</span> Only platform moderation can remove abuse, and removals are publicly counted.</li>
                      <li>Every question not answered live must be answered in writing within 48 hours, or the session is permanently marked incomplete and no badge is awarded.</li>
                      <li>Minimal answers ("yes", "noted") are flagged; flags stay visible even if you confirm them.</li>
                    </ul>
                  </div>
                </div>
                <label style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={rulesAck} onChange={(e) => setRulesAck(e.target.checked)} style={{ height: 14, width: 14 }} data-testid="rules-ack" />
                  <span style={{ fontSize: 12, fontWeight: 500, color: color.ink }}>I understand and accept these rules.</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <PrimaryButton
                  onClick={() => {
                    if (!dateStr || !timeStr) { toast.error("Pick a date and time."); return; }
                    if (!rulesAck) { toast.error("You must acknowledge the Roast rules first."); return; }
                    setScheduleStep("payment");
                  }}
                  disabled={!rulesAck}
                  style={{ background: "#DC2626", opacity: !rulesAck ? 0.5 : 1 }}
                  data-testid="continue-to-payment"
                >
                  Continue to payment
                </PrimaryButton>
                <SecondaryButton onClick={() => setShowSchedule(false)}>Cancel</SecondaryButton>
              </div>
            </>
          ) : (
            <PaymentConfirm
              feeLabel={`Level ${level} Roast participation fee`}
              feeUsd={cfg.priceUsd}
              confirming={creating}
              onConfirm={() => schedule(true)}
              onCancel={() => setScheduleStep("details")}
              terms={[
                "The fee confirms your slot — it is never refunded for a completed session.",
                "The badge is earned by completing the Roast, not by paying the fee.",
                `This is a Level ${level} Roast: up to ${cfg.maxAudience} challengers, ${cfg.qaMinutes} minutes of live Q&A.`,
              ]}
            />
          )}
        </div>
      )}

      {/* Sessions */}
      {(() => {
        const visibleSessions = view === "reports" ? sessions.filter((s) => ["completed", "expired"].includes(s.status)) : sessions;
        return isLoading ? (
          <div style={{ border: `1px solid ${color.border}`, background: color.white, padding: 32, textAlign: "center" }}>
            <Loader2 style={{ width: 20, height: 20, color: color.inkTertiary }} className="animate-spin mx-auto" />
          </div>
        ) : visibleSessions.length === 0 && startup?.id ? (
          <div style={{ border: `1px dashed ${color.border}`, background: color.white, padding: 40, textAlign: "center" }}>
            <Flame style={{ width: 32, height: 32, color: "rgba(220,38,38,0.35)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: color.ink }}>{view === "reports" ? "No completed Roasts yet" : "No Roasts yet"}</div>
            <div style={{ fontSize: 12, color: color.inkTertiary, marginTop: 4, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
              The strongest trust signal a founder can earn.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {visibleSessions.map((s) => {
              const pill = STATUS_PILL[s.status] ?? STATUS_PILL.scheduled;
              const qc2 = questionCounts[s.id];
              const isLive = LIVE_STATUSES.includes(s.status);
              return (
                <div key={s.id} style={{ border: `1px solid ${color.border}`, background: color.white, padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: radius.control, color: pill.text, background: pill.bg }}>
                        {pill.label}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: color.ink }}>Level {s.level} Roast</div>
                        <div style={{ fontSize: 12, color: color.inkTertiary, display: "flex", alignItems: "center", gap: 12, marginTop: 2 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Calendar style={{ width: 12, height: 12 }} />
                            {new Date(s.scheduled_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Users style={{ width: 12, height: 12 }} />
                            max {s.max_audience}
                          </span>
                          {qc2 && <span>{qc2.answered}/{qc2.total} answered</span>}
                          {s.badge_awarded && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#059669" }}>
                              <CheckCircle2 style={{ width: 12, height: 12 }} /> Badge awarded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {s.status === "scheduled" && (
                        <>
                          <a href={`/app/roast/${s.id}/live`} style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", fontSize: 12, fontWeight: 500, color: "#fff", background: "#DC2626", borderRadius: radius.control, textDecoration: "none" }}>
                            Go live →
                          </a>
                          <SecondaryButton onClick={() => cancel(s.id)} disabled={cancellingId === s.id}>
                            {cancellingId === s.id ? "…" : "Cancel"}
                          </SecondaryButton>
                        </>
                      )}
                      {isLive && (
                        <a href={`/app/roast/${s.id}/live`} style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", fontSize: 12, fontWeight: 500, color: "#fff", background: "#DC2626", borderRadius: radius.control, textDecoration: "none" }}>
                          Open control panel →
                        </a>
                      )}
                      {s.status === "written_phase" && (
                        <a href={`/app/roast/${s.id}/answers`} style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", fontSize: 12, fontWeight: 500, color: "#fff", background: "#B45309", borderRadius: radius.control, textDecoration: "none" }}>
                          Answer questions ({qc2 ? qc2.total - qc2.answered : "…"} left) →
                        </a>
                      )}
                      {/* R13 step 5 — public link stays visible and copyable
                          inside the Founder Roast page itself. */}
                      <a href={`/roast/${s.id}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 32, padding: "0 12px", fontSize: 12, color: color.ink, background: color.white, border: `1px solid ${color.border}`, borderRadius: radius.control, textDecoration: "none" }}>
                        Public page <ExternalLink style={{ width: 12, height: 12 }} />
                      </a>
                      <SecondaryButton
                        onClick={() => {
                          navigator.clipboard.writeText(`https://hockystick.app/roast/${s.id}`);
                          toast.success("Public link copied");
                        }}
                      >
                        <Copy style={{ width: 12, height: 12 }} />
                        Copy link
                      </SecondaryButton>
                    </div>
                  </div>
                  {s.status === "written_phase" && s.written_deadline_at && (
                    <div style={{ marginTop: 12, padding: "10px 14px", fontSize: 12, background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.25)", color: "#B45309" }}>
                      Written round deadline: {new Date(s.written_deadline_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} — miss it and the session is permanently marked incomplete.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar, CheckCircle2, Video, MapPin, Loader2, X, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useDealRoom } from "@/hooks/useDealRoom";
import { upsertDealRoomMeeting } from "@/lib/deal-room-workflow-fn";
import { skipMeeting, updateMeetingNotes } from "@/lib/deal-room-fn";
import { createInterviewRoom, mintInterviewToken } from "@/lib/interview-fn";
import { LawyerGate, useLawyerGateState } from "@/components/app/LawyerGate";

// R14B step 3 — the interview stage sequencer, re-mounting the old
// (orphaned) Stage3Panel 3-slot pattern as a real route, extended to the
// five interview stages. Mount point: /app/deal-rooms/$id/meetings —
// inside the deal-room boundary only, per §9.6.
export const Route = createFileRoute("/app/deal-rooms/$id/meetings")({
  component: MeetingsPage,
});

const STAGES: { number: 1 | 2 | 3 | 4 | 5; slug: string; label: string }[] = [
  { number: 1, slug: "introduction", label: "Introduction" },
  { number: 2, slug: "product_demo", label: "Product Demo" },
  { number: 3, slug: "financial_discussion", label: "Financial Discussion" },
  { number: 4, slug: "terms_discussion", label: "Terms Discussion" },
  { number: 5, slug: "investment_terms", label: "Investment Terms" },
];

type MeetingRow = {
  id: string;
  meeting_number: number;
  stage_slug: string;
  meeting_type: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  notes_shared: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
};

function statusOf(m: MeetingRow | undefined): "done" | "skipped" | "scheduled" | "unscheduled" {
  if (m?.meeting_type === "skipped" && m?.completed_at) return "skipped";
  if (m?.completed_at) return "done";
  if (m?.scheduled_at) return "scheduled";
  return "unscheduled";
}

const CHIP: Record<string, { label: string; bg: string; text: string }> = {
  done: { label: "Done", bg: "rgba(16,185,129,0.1)", text: "#059669" },
  skipped: { label: "Skipped", bg: "#F4F4F5", text: "#71717A" },
  scheduled: { label: "Scheduled", bg: "rgba(245,158,11,0.1)", text: "#B45309" },
  unscheduled: { label: "Not scheduled", bg: "#F4F4F5", text: "#71717A" },
};

function StatusChip({ status }: { status: string }) {
  const c = CHIP[status] ?? CHIP.unscheduled;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text, borderRadius: 2 }}
    >
      {c.label}
    </span>
  );
}

// ── Embedded Daily call (private room + token) ──────────────────────────────
function InterviewCall({ roomUrl, token, onLeft, onError }: {
  roomUrl: string; token: string; onLeft: () => void; onError: (msg: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!containerRef.current || frameRef.current) return;
      const { default: DailyIframe } = await import("@daily-co/daily-js");
      if (cancelled || !containerRef.current) return;
      const frame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: { width: "100%", height: "100%", border: "0" },
        showLeaveButton: true,
        showFullscreenButton: true,
      });
      frameRef.current = frame;
      frame.on("left-meeting", onLeft);
      frame.on("error", (e: any) => onError(e?.errorMsg || "The meeting room is unavailable."));
      frame.join({ url: roomUrl, token }).catch((e: any) => {
        onError(e?.errorMsg || e?.message || "Could not join the meeting room.");
      });
    })();
    return () => {
      cancelled = true;
      try { frameRef.current?.destroy(); } catch { /* already gone */ }
      frameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, token]);

  return <div ref={containerRef} className="w-full bg-black" style={{ height: 480 }} />;
}

function MeetingsPage() {
  const ctx = useDealRoom();
  const { dealRoomId, isInvestor, isFounder, userId, founderUserId, investorUserId, companyName } = ctx;
  const qc = useQueryClient();
  const { gateOpen } = useLawyerGateState(dealRoomId);

  const { data: meetings = [], isLoading } = useQuery<MeetingRow[]>({
    queryKey: ["interview-meetings", dealRoomId],
    enabled: !!dealRoomId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_meetings")
        .select("id, meeting_number, stage_slug, meeting_type, scheduled_at, completed_at, notes_shared, daily_room_name, daily_room_url")
        .eq("deal_room_id", dealRoomId)
        .order("meeting_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MeetingRow[];
    },
  });

  // Investor-private notes — RLS returns zero rows for anyone else, the
  // enabled flag just avoids a pointless request.
  const meetingIds = meetings.map((m) => m.id);
  const { data: privateNotes = [] } = useQuery<{ meeting_id: string; notes: string | null }[]>({
    queryKey: ["interview-private-notes", dealRoomId, meetingIds.join(",")],
    enabled: isInvestor && meetingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_room_meeting_private_notes")
        .select("meeting_id, notes")
        .in("meeting_id", meetingIds);
      if (error) throw error;
      return data ?? [];
    },
  });
  const privateByMeeting = new Map(privateNotes.map((n) => [n.meeting_id, n.notes ?? ""]));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["interview-meetings", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["interview-private-notes", dealRoomId] });
    qc.invalidateQueries({ queryKey: ["deal-room-workflow", dealRoomId] });
  };

  // ── Per-stage local form state ──
  const [dates, setDates] = useState<Record<number, string>>({});
  const [types, setTypes] = useState<Record<number, "video" | "in_person">>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [skipOpen, setSkipOpen] = useState<number | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [notesOpen, setNotesOpen] = useState<number | null>(null);
  const [sharedDraft, setSharedDraft] = useState("");
  const [privateDraft, setPrivateDraft] = useState("");

  // ── Join state ──
  const [joining, setJoining] = useState<number | null>(null);
  const [call, setCall] = useState<{ meetingNumber: number; roomUrl: string; token: string } | null>(null);
  const [joinError, setJoinError] = useState<{ meetingNumber: number; message: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const schedule = async (num: 1 | 2 | 3 | 4 | 5) => {
    const date = dates[num];
    if (!date || !userId) return;
    setSaving(num);
    try {
      const r = await upsertDealRoomMeeting({
        data: {
          deal_room_id: dealRoomId,
          meeting_number: num,
          scheduled_at: new Date(date).toISOString(),
          meeting_type: types[num] ?? "video",
          actor_user_id: userId,
        },
      });
      if (r.ok) { toast.success("Meeting scheduled"); invalidate(); }
      else toast.error("Could not schedule");
    } catch { toast.error("Could not schedule"); }
    finally { setSaving(null); }
  };

  const markDone = async (num: 1 | 2 | 3 | 4 | 5) => {
    if (!userId) return;
    setSaving(num);
    try {
      const r = await upsertDealRoomMeeting({
        data: { deal_room_id: dealRoomId, meeting_number: num, completed_at: new Date().toISOString(), actor_user_id: userId },
      });
      if (r.ok) { toast.success("Meeting marked done"); invalidate(); }
      else toast.error("Could not update");
    } catch { toast.error("Could not update"); }
    finally { setSaving(null); }
  };

  const skip = async (num: 1 | 2 | 3 | 4 | 5) => {
    if (!userId) return;
    setSaving(num);
    try {
      const r = await skipMeeting({
        data: { deal_room_id: dealRoomId, meeting_number: num, actor_user_id: userId, reason: skipReason.trim() || undefined },
      });
      if (r.ok) { toast.success("Meeting skipped"); setSkipOpen(null); setSkipReason(""); invalidate(); }
      else toast.error("Could not skip");
    } catch { toast.error("Could not skip"); }
    finally { setSaving(null); }
  };

  const saveNotes = async (num: 1 | 2 | 3 | 4 | 5) => {
    setSaving(num);
    try {
      const r = await updateMeetingNotes({
        data: {
          deal_room_id: dealRoomId,
          meeting_number: num,
          notes_shared: sharedDraft,
          ...(isInvestor ? { notes_investor: privateDraft } : {}),
        },
      });
      if (r.ok) { toast.success("Notes saved"); setNotesOpen(null); invalidate(); }
      else toast.error("Could not save notes");
    } catch { toast.error("Could not save notes"); }
    finally { setSaving(null); }
  };

  const join = async (num: 1 | 2 | 3 | 4 | 5, opts?: { forceNew?: boolean }) => {
    setJoining(num);
    setJoinError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Session expired — sign in again"); return; }
      const created = await createInterviewRoom({
        data: { userAccessToken: session.access_token, dealRoomId, meetingNumber: num, forceNew: opts?.forceNew },
      });
      if (!created.ok) {
        setJoinError({ meetingNumber: num, message: `Could not prepare the meeting room (${created.error}).` });
        return;
      }
      const minted = await mintInterviewToken({
        data: { userAccessToken: session.access_token, dealRoomId, meetingNumber: num },
      });
      if (!minted.ok || !minted.token || !minted.roomUrl) {
        setJoinError({ meetingNumber: num, message: `Could not get a join token (${minted.error}).` });
        return;
      }
      invalidate();
      setCall({ meetingNumber: num, roomUrl: minted.roomUrl, token: minted.token });
    } catch {
      setJoinError({ meetingNumber: num, message: "Could not reach the meeting service." });
    } finally {
      setJoining(null);
      setRegenerating(false);
    }
  };

  const regenerate = async (num: 1 | 2 | 3 | 4 | 5) => {
    setRegenerating(true);
    setCall(null);
    await join(num, { forceNew: true });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#7C3AED]" />
          <h1 className="text-lg font-bold tracking-tight text-[#0A0A0B]" style={{ fontFamily: "Syne, sans-serif" }}>
            Interviews
          </h1>
        </div>
        <p className="mt-1 text-sm text-[#52525B]">
          Five structured meeting stages, in sequence. Each stage can be scheduled or skipped.
        </p>
      </div>

      {/* Active call panel */}
      {call && (
        <div className="mb-6 border border-[#E4E4E7] bg-white">
          <div className="flex items-center justify-between border-b border-[#E4E4E7] px-4 py-2.5">
            <span className="text-sm font-semibold text-[#0A0A0B]">
              {STAGES.find((s) => s.number === call.meetingNumber)?.label} — live
            </span>
            <button
              onClick={() => setCall(null)}
              className="grid h-7 w-7 place-items-center text-[#71717A] hover:text-[#0A0A0B]"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <InterviewCall
            roomUrl={call.roomUrl}
            token={call.token}
            onLeft={() => setCall(null)}
            onError={(message) => {
              setJoinError({ meetingNumber: call.meetingNumber, message });
              setCall(null);
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="border border-[#E4E4E7] bg-white p-6 text-sm text-[#71717A]">Loading meeting stages…</div>
      ) : (
        <div className="flex flex-col gap-3">
          {STAGES.map((stage) => {
            const m = meetings.find((x) => x.meeting_number === stage.number);
            const status = statusOf(m);
            const isLawyerStage = stage.slug === "investment_terms";
            const isOnline = (m?.meeting_type ?? "video") !== "in_person";
            const errHere = joinError?.meetingNumber === stage.number ? joinError : null;

            return (
              <div key={stage.number} className="border border-[#E4E4E7] bg-white" data-testid={`interview-stage-${stage.slug}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="grid h-7 w-7 shrink-0 place-items-center border text-xs font-semibold"
                      style={{
                        borderColor: status === "done" ? "rgba(16,185,129,0.4)" : "#E4E4E7",
                        color: status === "done" ? "#059669" : "#71717A",
                      }}
                    >
                      {status === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : stage.number}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#0A0A0B]">{stage.label}</span>
                        <StatusChip status={status} />
                        {m?.scheduled_at && status !== "skipped" && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#71717A]">
                            {isOnline ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {new Date(m.scheduled_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                            {" · "}{isOnline ? "Online" : "In person"}
                          </span>
                        )}
                      </div>
                      {m?.notes_shared && (
                        <div className="mt-1 text-xs text-[#52525B] max-w-xl truncate">{m.notes_shared}</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {isLawyerStage && !gateOpen ? (
                    <LawyerGate
                      dealRoomId={dealRoomId}
                      companyName={companyName}
                      userId={userId}
                      isFounder={isFounder}
                      founderUserId={founderUserId}
                      investorUserId={investorUserId}
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Join — both parties, online + scheduled or done-pending */}
                      {status === "scheduled" && isOnline && (
                        <button
                          onClick={() => join(stage.number)}
                          disabled={joining === stage.number}
                          className="inline-flex h-8 items-center gap-1.5 bg-[#7C3AED] px-3 text-xs font-medium text-white disabled:opacity-60"
                          style={{ borderRadius: 2 }}
                        >
                          {joining === stage.number ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                          Join meeting
                        </button>
                      )}

                      {isInvestor && status === "unscheduled" && (
                        <>
                          <select
                            value={types[stage.number] ?? "video"}
                            onChange={(e) => setTypes((p) => ({ ...p, [stage.number]: e.target.value as "video" | "in_person" }))}
                            className="h-8 border border-[#E4E4E7] bg-white px-2 text-xs text-[#0A0A0B]"
                            style={{ borderRadius: 2 }}
                          >
                            <option value="video">Online</option>
                            <option value="in_person">In person</option>
                          </select>
                          <input
                            type="datetime-local"
                            value={dates[stage.number] ?? ""}
                            onChange={(e) => setDates((p) => ({ ...p, [stage.number]: e.target.value }))}
                            className="h-8 border border-[#E4E4E7] bg-white px-2 text-xs text-[#0A0A0B]"
                            style={{ borderRadius: 2 }}
                          />
                          <button
                            onClick={() => schedule(stage.number)}
                            disabled={!dates[stage.number] || saving === stage.number}
                            className="inline-flex h-8 items-center bg-[#7C3AED] px-3 text-xs font-medium text-white disabled:opacity-50"
                            style={{ borderRadius: 2 }}
                            data-testid={`schedule-stage-${stage.number}`}
                          >
                            {saving === stage.number ? "…" : "Schedule"}
                          </button>
                          <button
                            onClick={() => { setSkipOpen(skipOpen === stage.number ? null : stage.number); setSkipReason(""); }}
                            className="inline-flex h-8 items-center border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#0A0A0B]"
                            style={{ borderRadius: 2 }}
                          >
                            Skip
                          </button>
                        </>
                      )}

                      {isInvestor && status === "scheduled" && (
                        <>
                          <button
                            onClick={() => markDone(stage.number)}
                            disabled={saving === stage.number}
                            className="inline-flex h-8 items-center border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#059669]"
                            style={{ borderRadius: 2 }}
                          >
                            Mark done
                          </button>
                          <button
                            onClick={() => { setSkipOpen(skipOpen === stage.number ? null : stage.number); setSkipReason(""); }}
                            className="inline-flex h-8 items-center border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#0A0A0B]"
                            style={{ borderRadius: 2 }}
                          >
                            Skip
                          </button>
                        </>
                      )}

                      {isInvestor && (status === "scheduled" || status === "done") && (
                        <button
                          onClick={() => {
                            setNotesOpen(notesOpen === stage.number ? null : stage.number);
                            setSharedDraft(m?.notes_shared ?? "");
                            setPrivateDraft(m ? (privateByMeeting.get(m.id) ?? "") : "");
                          }}
                          className="inline-flex h-8 items-center border border-[#E4E4E7] bg-white px-3 text-xs font-medium text-[#0A0A0B]"
                          style={{ borderRadius: 2 }}
                        >
                          Notes
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Join error + regenerate */}
                {errHere && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E4E7] bg-[rgba(245,158,11,0.06)] px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#B45309]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {errHere.message} The room may have expired.
                    </span>
                    <button
                      onClick={() => regenerate(stage.number)}
                      disabled={regenerating}
                      className="inline-flex h-7 items-center border border-[#E4E4E7] bg-white px-2.5 text-xs font-medium text-[#0A0A0B] disabled:opacity-60"
                      style={{ borderRadius: 2 }}
                    >
                      {regenerating ? "Regenerating…" : "Regenerate room"}
                    </button>
                  </div>
                )}

                {/* Skip-with-reason */}
                {skipOpen === stage.number && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[#E4E4E7] px-4 py-2.5">
                    <input
                      value={skipReason}
                      onChange={(e) => setSkipReason(e.target.value.slice(0, 300))}
                      placeholder="Reason (optional) — visible to both parties"
                      className="h-8 flex-1 min-w-[220px] border border-[#E4E4E7] bg-white px-2 text-xs text-[#0A0A0B]"
                      style={{ borderRadius: 2 }}
                    />
                    <button
                      onClick={() => skip(stage.number)}
                      disabled={saving === stage.number}
                      className="inline-flex h-8 items-center bg-[#7C3AED] px-3 text-xs font-medium text-white disabled:opacity-60"
                      style={{ borderRadius: 2 }}
                    >
                      Confirm skip
                    </button>
                  </div>
                )}

                {/* Notes editor (investor) */}
                {notesOpen === stage.number && isInvestor && (
                  <div className="border-t border-[#E4E4E7] px-4 py-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#71717A] mb-1">Shared notes — visible to both parties</label>
                      <textarea
                        value={sharedDraft}
                        onChange={(e) => setSharedDraft(e.target.value)}
                        rows={2}
                        className="w-full border border-[#E4E4E7] bg-white px-2 py-1.5 text-sm text-[#0A0A0B] resize-none"
                        style={{ borderRadius: 2 }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#71717A] mb-1">Private notes — investor only</label>
                      <textarea
                        value={privateDraft}
                        onChange={(e) => setPrivateDraft(e.target.value)}
                        rows={2}
                        className="w-full border border-[#E4E4E7] bg-white px-2 py-1.5 text-sm text-[#0A0A0B] resize-none"
                        style={{ borderRadius: 2 }}
                      />
                    </div>
                    <button
                      onClick={() => saveNotes(stage.number)}
                      disabled={saving === stage.number}
                      className="inline-flex h-8 items-center bg-[#7C3AED] px-3 text-xs font-medium text-white disabled:opacity-60"
                      style={{ borderRadius: 2 }}
                    >
                      {saving === stage.number ? "Saving…" : "Save notes"}
                    </button>
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

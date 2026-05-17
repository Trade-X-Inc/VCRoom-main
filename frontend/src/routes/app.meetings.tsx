import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday, isFuture, isPast, isThisWeek, startOfWeek, addWeeks } from "date-fns";
import { toast } from "sonner";
import {
  Calendar, Clock, ExternalLink, Plus, Loader2, ChevronDown, ChevronRight,
  Video, Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/meetings")({
  component: Meetings,
});

function isNextWeek(date: Date): boolean {
  const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
  const nextWeekEnd = addWeeks(nextWeekStart, 1);
  return date >= nextWeekStart && date < nextWeekEnd;
}

type Meeting = {
  id: string;
  title: string;
  scheduled_at: string;
  meeting_link: string | null;
  notes: string | null;
  platform: string | null;
  prep_notes: string | null;
  vc_lead_id: string | null;
  created_by: string;
  vc_leads: { investor_name: string; firm_name: string | null; email: string | null } | null;
};

type VCLeadOption = { id: string; investor_name: string; firm_name: string | null };

function Meetings() {
  const { user } = useAuth();
  const isInvestor = user?.role === "investor";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [expandedPrep, setExpandedPrep] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: "",
    scheduledAt: "",
    meetingLink: "",
    platform: "",
    prepNotes: "",
    vcLeadId: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["my-meetings", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, vc_leads!vc_lead_id(investor_name, firm_name, email)")
        .eq("created_by", user!.id)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Meeting[];
    },
  });

  const { data: vcLeads = [] } = useQuery<VCLeadOption[]>({
    queryKey: ["vc-leads-select", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("vc_leads")
        .select("id, investor_name, firm_name")
        .eq("founder_id", user!.id)
        .order("investor_name", { ascending: true });
      return (data ?? []) as VCLeadOption[];
    },
  });

  const todayMeetings = meetings.filter((m) => isToday(new Date(m.scheduled_at)));
  const upcomingMeetings = meetings.filter((m) => isFuture(new Date(m.scheduled_at)) && !isToday(new Date(m.scheduled_at)));
  const pastMeetings = meetings.filter((m) => isPast(new Date(m.scheduled_at)) && !isToday(new Date(m.scheduled_at)));

  const thisWeek = upcomingMeetings.filter((m) => isThisWeek(new Date(m.scheduled_at), { weekStartsOn: 1 }));
  const nextWeek = upcomingMeetings.filter((m) => isNextWeek(new Date(m.scheduled_at), { weekStartsOn: 1 }));
  const later = upcomingMeetings.filter(
    (m) =>
      !isThisWeek(new Date(m.scheduled_at), { weekStartsOn: 1 }) &&
      !isNextWeek(new Date(m.scheduled_at), { weekStartsOn: 1 }),
  );

  const togglePrep = (id: string) =>
    setExpandedPrep((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.scheduledAt || !user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("meetings").insert({
        title: f.title,
        scheduled_at: new Date(f.scheduledAt).toISOString(),
        meeting_link: f.meetingLink || null,
        platform: f.platform || null,
        prep_notes: f.prepNotes || null,
        vc_lead_id: f.vcLeadId || null,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("Meeting scheduled");
      queryClient.invalidateQueries({ queryKey: ["my-meetings", user.id] });
      setF({ title: "", scheduledAt: "", meetingLink: "", platform: "", prepNotes: "", vcLeadId: "" });
      setShowForm(false);
    } catch {
      toast.error("Failed to schedule meeting");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse mb-2" />
        <div className="h-4 w-72 rounded bg-muted/60 animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
          <div className="text-sm text-muted-foreground mt-0.5">
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} scheduled
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
        >
          <Plus className="h-4 w-4" /> Schedule meeting
        </button>
      </div>

      {/* Schedule form */}
      {showForm && (
        <form onSubmit={submit} className="mb-6 rounded-xl border border-border/60 bg-card p-5 shadow-card space-y-3">
          <div className="text-sm font-semibold mb-1">New meeting</div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Title *</label>
              <input
                required
                value={f.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Intro call / Partner meeting…"
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date &amp; Time *</label>
              <input
                type="datetime-local"
                required
                value={f.scheduledAt}
                onChange={(e) => set("scheduledAt", e.target.value)}
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            {!isInvestor && (
              <div>
                <label className="text-xs text-muted-foreground">VC lead</label>
                <select
                  value={f.vcLeadId}
                  onChange={(e) => set("vcLeadId", e.target.value)}
                  className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
                >
                  <option value="">— None —</option>
                  {vcLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.investor_name}{l.firm_name ? ` · ${l.firm_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Platform</label>
              <select
                value={f.platform}
                onChange={(e) => set("platform", e.target.value)}
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              >
                <option value="">— Select —</option>
                {["Zoom", "Google Meet", "Microsoft Teams", "Phone", "In-person", "Other"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Meeting link</label>
              <input
                type="url"
                value={f.meetingLink}
                onChange={(e) => set("meetingLink", e.target.value)}
                placeholder="https://zoom.us/j/…"
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Prep notes</label>
              <textarea
                value={f.prepNotes}
                onChange={(e) => set("prepNotes", e.target.value)}
                rows={2}
                placeholder="Key points to cover, questions to ask…"
                className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!f.title || !f.scheduledAt || saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-4 py-1.5 text-sm shadow-glow disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save meeting
            </button>
          </div>
        </form>
      )}

      {meetings.length === 0 && !showForm && (
        <div className="rounded-xl border border-border/60 bg-card shadow-card p-12 flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium">No meetings scheduled yet</div>
          <div className="text-xs text-muted-foreground max-w-xs">
            {isInvestor
              ? "Schedule meetings with founders directly from here."
              : "Schedule meetings directly here or set a lead's status to trigger a meeting."}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"
          >
            <Plus className="h-4 w-4" /> Schedule meeting
          </button>
        </div>
      )}

      {/* TODAY */}
      {todayMeetings.length > 0 && (
        <section className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Today ({todayMeetings.length})
          </div>
          <div className="space-y-3">
            {todayMeetings.map((m) => (
              <MeetingRow key={m.id} m={m} variant="today" prepOpen={expandedPrep.has(m.id)} onTogglePrep={() => togglePrep(m.id)} />
            ))}
          </div>
        </section>
      )}

      {/* UPCOMING */}
      {upcomingMeetings.length > 0 && (
        <section className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Upcoming ({upcomingMeetings.length})
          </div>
          <div className="space-y-5">
            {thisWeek.length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground mb-2 pl-1">This week</div>
                <div className="space-y-2">
                  {thisWeek.map((m) => (
                    <MeetingRow key={m.id} m={m} variant="upcoming" prepOpen={expandedPrep.has(m.id)} onTogglePrep={() => togglePrep(m.id)} />
                  ))}
                </div>
              </div>
            )}
            {nextWeek.length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground mb-2 pl-1">Next week</div>
                <div className="space-y-2">
                  {nextWeek.map((m) => (
                    <MeetingRow key={m.id} m={m} variant="upcoming" prepOpen={expandedPrep.has(m.id)} onTogglePrep={() => togglePrep(m.id)} />
                  ))}
                </div>
              </div>
            )}
            {later.length > 0 && (
              <div>
                <div className="text-[11px] text-muted-foreground mb-2 pl-1">Later</div>
                <div className="space-y-2">
                  {later.map((m) => (
                    <MeetingRow key={m.id} m={m} variant="upcoming" prepOpen={expandedPrep.has(m.id)} onTogglePrep={() => togglePrep(m.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAST */}
      {pastMeetings.length > 0 && (
        <section>
          <button
            onClick={() => setPastOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"
          >
            {pastOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Past ({pastMeetings.length})
          </button>
          {pastOpen && (
            <div className="space-y-2 opacity-60">
              {pastMeetings.map((m) => (
                <MeetingRow key={m.id} m={m} variant="past" prepOpen={false} onTogglePrep={() => {}} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function MeetingRow({
  m,
  variant,
  prepOpen,
  onTogglePrep,
}: {
  m: Meeting;
  variant: "today" | "upcoming" | "past";
  prepOpen: boolean;
  onTogglePrep: () => void;
}) {
  const d = new Date(m.scheduled_at);
  const investorName = m.vc_leads?.investor_name;
  const firmName = m.vc_leads?.firm_name;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-card p-4",
        variant === "today" && "border-l-4 border-l-warning",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Date badge */}
        <div
          className={cn(
            "shrink-0 grid place-items-center rounded-lg w-12 h-12 text-center",
            variant === "today"
              ? "bg-gradient-brand text-brand-foreground"
              : variant === "past"
              ? "bg-muted/60 text-muted-foreground"
              : "bg-brand/10 text-brand",
          )}
        >
          <div className="text-[10px] font-semibold uppercase">{format(d, "MMM")}</div>
          <div className="text-lg font-bold leading-none">{format(d, "d")}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{m.title}</span>
            {variant === "today" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
                Today
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {format(d, "h:mm a")}
            </span>
            {m.platform && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Video className="h-3 w-3" /> {m.platform}
              </span>
            )}
            {investorName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                {investorName}{firmName ? ` · ${firmName}` : ""}
              </span>
            )}
          </div>

          {(m.prep_notes || m.notes) && (
            <button
              onClick={onTogglePrep}
              className="mt-1.5 text-xs text-brand hover:underline inline-flex items-center gap-1"
            >
              {prepOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {prepOpen ? "Hide" : "Show"} prep notes
            </button>
          )}

          {prepOpen && (m.prep_notes || m.notes) && (
            <div className="mt-2 rounded-md bg-accent/50 p-3 text-xs text-muted-foreground">
              {m.prep_notes || m.notes}
            </div>
          )}
        </div>

        {m.meeting_link && variant !== "past" && (
          <a
            href={m.meeting_link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/5 text-brand px-3 py-1.5 text-xs hover:bg-brand/10"
          >
            <ExternalLink className="h-3 w-3" /> Join
          </a>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X, Trash2, Loader2, Plus, Copy, Calendar, MessageSquare, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { generateOutreachEmail } from "@/lib/ai-fn";

export type LeadStatus =
  | "New"
  | "Shortlisted"
  | "Contacted"
  | "Replied"
  | "Meeting Booked"
  | "Interested"
  | "Deal Room Created"
  | "Rejected"
  | "Follow Up";

export interface VCLead {
  id: string;
  founder_id: string;
  investor_name: string;
  firm_name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  website?: string | null;
  sector?: string | null;
  stage?: string | null;
  geography?: string | null;
  ticket_size?: string | null;
  status: LeadStatus;
  notes?: string | null;
  follow_up_date?: string | null;
  source?: string | null;
  relationship_strength?: string | null;
  last_contacted?: string | null;
  next_action?: string | null;
  created_at: string;
  updated_at: string;
}

export const ALL_STATUSES: LeadStatus[] = [
  "New", "Shortlisted", "Contacted", "Replied",
  "Meeting Booked", "Interested", "Deal Room Created", "Follow Up", "Rejected",
];

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Growth"] as const;
const REL_STRENGTHS = ["Cold", "Warm", "Hot", "Intro"] as const;
const MEETING_TYPES = ["Intro", "Deep Dive", "Partner", "Follow-up"] as const;
const PLATFORMS = ["Zoom", "Google Meet", "Phone", "In Person"] as const;
type Tab = "profile" | "outreach" | "meetings" | "notes";

const inputCls =
  "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

const emptyForm = {
  investor_name: "", firm_name: "", email: "", phone: "",
  linkedin_url: "", twitter_url: "", website: "",
  sector: "", stage: "", geography: "", ticket_size: "",
  status: "New" as LeadStatus, follow_up_date: "", notes: "",
  source: "", relationship_strength: "", last_contacted: "", next_action: "",
};

interface LeadDrawerProps {
  open: boolean;
  lead: VCLead | null;
  onClose: () => void;
  onSaved: () => void;
}

export function LeadDrawer({ open, lead, onClose, onSaved }: LeadDrawerProps) {
  const isEdit = !!lead;
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [f, setF] = useState(emptyForm);

  // Outreach state
  const [emailType, setEmailType] = useState<"cold" | "followup">("cold");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");

  // Meeting form state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [mf, setMf] = useState({
    title: "", scheduled_at: "", meeting_type: "Intro", platform: "Zoom",
    meeting_link: "", notes: "",
  });

  // Notes tab state
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("profile");
    setGeneratedEmail("");
    setShowMeetingForm(false);
    setNewNote("");
    if (lead) {
      setF({
        investor_name: lead.investor_name ?? "",
        firm_name: lead.firm_name ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        linkedin_url: lead.linkedin_url ?? "",
        twitter_url: lead.twitter_url ?? "",
        website: lead.website ?? "",
        sector: lead.sector ?? "",
        stage: lead.stage ?? "",
        geography: lead.geography ?? "",
        ticket_size: lead.ticket_size ?? "",
        status: lead.status,
        follow_up_date: lead.follow_up_date ?? "",
        notes: lead.notes ?? "",
        source: lead.source ?? "",
        relationship_strength: lead.relationship_strength ?? "",
        last_contacted: lead.last_contacted ?? "",
        next_action: lead.next_action ?? "",
      });
    } else {
      setF(emptyForm);
    }
  }, [open, lead]);

  // Meetings query — always called (Rules of Hooks)
  const { data: meetings = [], refetch: refetchMeetings } = useQuery({
    queryKey: ["lead-meetings", lead?.id],
    enabled: !!lead?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("vc_lead_id", lead!.id)
        .order("scheduled_at", { ascending: true });
      return data ?? [];
    },
  });

  if (!open) return null;

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.investor_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        investor_name: f.investor_name.trim(),
        firm_name: f.firm_name || null,
        email: f.email || null,
        phone: f.phone || null,
        linkedin_url: f.linkedin_url || null,
        twitter_url: f.twitter_url || null,
        website: f.website || null,
        sector: f.sector || null,
        stage: f.stage || null,
        geography: f.geography || null,
        ticket_size: f.ticket_size || null,
        status: f.status,
        follow_up_date: f.follow_up_date || null,
        notes: f.notes || null,
        source: f.source || null,
        relationship_strength: f.relationship_strength || null,
        last_contacted: f.last_contacted || null,
        next_action: f.next_action || null,
        updated_at: new Date().toISOString(),
      };
      if (isEdit) {
        const { error } = await supabase.from("vc_leads").update(payload).eq("id", lead.id).eq("founder_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vc_leads").insert({ ...payload, founder_id: user!.id });
        if (error) throw error;
      }
      toast.success("Lead saved");
      onSaved();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("vc_leads").delete().eq("id", lead.id).eq("founder_id", user!.id);
      if (error) throw error;
      toast.success("Lead deleted");
      onSaved();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateEmail = async (type: "cold" | "followup") => {
    if (!user?.id || !lead) return;
    setEmailType(type);
    setGeneratingEmail(true);
    setGeneratedEmail("");
    try {
      const result = await generateOutreachEmail({
        data: { userId: user.id, leadId: lead.id, type },
      });
      setGeneratedEmail(`Subject: ${result.subject}\n\n${result.body}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleSaveEmailToNotes = async () => {
    if (!lead || !generatedEmail) return;
    const tag = emailType === "cold" ? "Cold Email" : "Follow-up Email";
    const entry = `**${tag} (${new Date().toLocaleDateString()}):**\n${generatedEmail}`;
    const appended = [f.notes, entry].filter(Boolean).join("\n\n---\n\n");
    await supabase.from("vc_leads").update({ notes: appended, updated_at: new Date().toISOString() }).eq("id", lead.id);
    setF((s) => ({ ...s, notes: appended }));
    queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
    toast.success("Saved to notes");
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.id) return;
    setSchedulingMeeting(true);
    try {
      const { error } = await supabase.from("meetings").insert({
        vc_lead_id: lead.id,
        title: mf.title,
        scheduled_at: mf.scheduled_at,
        meeting_type: mf.meeting_type,
        platform: mf.platform,
        meeting_link: mf.meeting_link || null,
        notes: mf.notes || null,
      });
      if (error) throw error;
      toast.success("Meeting scheduled");
      setShowMeetingForm(false);
      setMf({ title: "", scheduled_at: "", meeting_type: "Intro", platform: "Zoom", meeting_link: "", notes: "" });
      refetchMeetings();
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule");
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const handleAddNote = async () => {
    if (!lead || !newNote.trim()) return;
    setAddingNote(true);
    const entry = `${newNote.trim()}\n_${new Date().toLocaleString()}_`;
    const appended = [f.notes, entry].filter(Boolean).join("\n\n---\n\n");
    try {
      const { error } = await supabase.from("vc_leads").update({ notes: appended, updated_at: new Date().toISOString() }).eq("id", lead.id);
      if (error) throw error;
      setF((s) => ({ ...s, notes: appended }));
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["leads", user?.id] });
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const notesList = f.notes ? f.notes.split("\n\n---\n\n").filter(Boolean).reverse() : [];

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "outreach", label: "Outreach", icon: MessageSquare },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "notes", label: "Notes", icon: Plus },
  ];

  return (
    <>
      <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[480px] border-l border-border/60 bg-background shadow-elev flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-border/60 flex items-center justify-between px-5 shrink-0">
          <h2 className="text-sm font-semibold">{isEdit ? f.investor_name || "Edit lead" : "Add lead"}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/60 flex shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* ── TAB 1: PROFILE ── */}
            {activeTab === "profile" && (
              <div className="space-y-3">
                <Field label="Investor name *">
                  <input required value={f.investor_name} onChange={(e) => set("investor_name", e.target.value)} placeholder="Sarah Johnson" className={inputCls} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Firm name">
                    <input value={f.firm_name} onChange={(e) => set("firm_name", e.target.value)} placeholder="Sequoia Capital" className={inputCls} />
                  </Field>
                  <Field label="Email *">
                    <input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="sarah@sequoia.com" className={inputCls} />
                  </Field>
                  <Field label="Phone">
                    <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 0100" className={inputCls} />
                  </Field>
                  <Field label="LinkedIn URL">
                    <input value={f.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="linkedin.com/in/..." className={inputCls} />
                  </Field>
                  <Field label="Twitter / X">
                    <input value={f.twitter_url} onChange={(e) => set("twitter_url", e.target.value)} placeholder="@username" className={inputCls} />
                  </Field>
                  <Field label="Website">
                    <input value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="sequoiacap.com" className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sector">
                    <input value={f.sector} onChange={(e) => set("sector", e.target.value)} placeholder="SaaS, FinTech…" className={inputCls} />
                  </Field>
                  <Field label="Stage">
                    <select value={f.stage} onChange={(e) => set("stage", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Geography">
                    <input value={f.geography} onChange={(e) => set("geography", e.target.value)} placeholder="US, Europe…" className={inputCls} />
                  </Field>
                  <Field label="Ticket size">
                    <input value={f.ticket_size} onChange={(e) => set("ticket_size", e.target.value)} placeholder="$500K–$2M" className={inputCls} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status">
                    <select value={f.status} onChange={(e) => set("status", e.target.value as LeadStatus)} className={inputCls}>
                      {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Relationship">
                    <select value={f.relationship_strength} onChange={(e) => set("relationship_strength", e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {REL_STRENGTHS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                  <Field label="Follow-up date">
                    <input type="date" value={f.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Last contacted">
                    <input type="date" value={f.last_contacted} onChange={(e) => set("last_contacted", e.target.value)} className={inputCls} />
                  </Field>
                </div>

                <Field label="Source (how you found them)">
                  <input value={f.source} onChange={(e) => set("source", e.target.value)} placeholder="LinkedIn, intro from John, conference…" className={inputCls} />
                </Field>

                <Field label="Next action">
                  <input value={f.next_action} onChange={(e) => set("next_action", e.target.value)} placeholder="Send deck, follow up on meeting…" className={inputCls} />
                </Field>

                <Field label="Notes">
                  <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={4} placeholder="Context, intro source, thesis fit…" className={cn(inputCls, "resize-none")} />
                </Field>
              </div>
            )}

            {/* ── TAB 2: OUTREACH ── */}
            {activeTab === "outreach" && (
              <div className="space-y-4">
                {!isEdit && (
                  <div className="rounded-lg border border-border/60 bg-accent/30 p-4 text-sm text-muted-foreground text-center">
                    Save this lead first to generate outreach emails.
                  </div>
                )}
                {isEdit && (
                  <>
                    <div className="rounded-lg border border-border/60 bg-card p-4">
                      <div className="text-sm font-semibold mb-3">AI Email Generator</div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Generate a personalised email for{" "}
                        <strong>{f.investor_name}</strong>
                        {f.firm_name ? ` at ${f.firm_name}` : ""}.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateEmail("cold")}
                          disabled={generatingEmail}
                          className="flex-1 rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {generatingEmail && emailType === "cold" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Cold email
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateEmail("followup")}
                          disabled={generatingEmail}
                          className="flex-1 rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {generatingEmail && emailType === "followup" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Follow-up
                        </button>
                      </div>
                    </div>

                    {generatingEmail && !generatedEmail && (
                      <div className="rounded-lg border border-border/60 bg-card p-6 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating email…
                      </div>
                    )}

                    {generatedEmail && (
                      <div className="rounded-lg border border-brand/30 bg-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-brand uppercase tracking-wide">
                            {emailType === "cold" ? "Cold Email" : "Follow-up Email"}
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(generatedEmail); toast.success("Copied!"); }}
                              className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-accent"
                            >
                              <Copy className="h-3 w-3" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveEmailToNotes}
                              className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs hover:bg-accent"
                            >
                              Save to notes
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={generatedEmail}
                          onChange={(e) => setGeneratedEmail(e.target.value)}
                          rows={12}
                          className={cn(inputCls, "resize-none text-xs font-mono")}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── TAB 3: MEETINGS ── */}
            {activeTab === "meetings" && (
              <div className="space-y-4">
                {!isEdit ? (
                  <div className="rounded-lg border border-border/60 bg-accent/30 p-4 text-sm text-muted-foreground text-center">
                    Save this lead first to schedule meetings.
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowMeetingForm((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Schedule meeting
                    </button>

                    {showMeetingForm && (
                      <form onSubmit={handleScheduleMeeting} className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
                        <div className="text-sm font-semibold">New meeting</div>
                        <Field label="Title">
                          <input required value={mf.title} onChange={(e) => setMf((s) => ({ ...s, title: e.target.value }))} placeholder="Intro call with Sarah" className={inputCls} />
                        </Field>
                        <Field label="Date & Time">
                          <input required type="datetime-local" value={mf.scheduled_at} onChange={(e) => setMf((s) => ({ ...s, scheduled_at: e.target.value }))} className={inputCls} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Type">
                            <select value={mf.meeting_type} onChange={(e) => setMf((s) => ({ ...s, meeting_type: e.target.value }))} className={inputCls}>
                              {MEETING_TYPES.map((t) => <option key={t}>{t}</option>)}
                            </select>
                          </Field>
                          <Field label="Platform">
                            <select value={mf.platform} onChange={(e) => setMf((s) => ({ ...s, platform: e.target.value }))} className={inputCls}>
                              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                            </select>
                          </Field>
                        </div>
                        <Field label="Meeting link (optional)">
                          <input value={mf.meeting_link} onChange={(e) => setMf((s) => ({ ...s, meeting_link: e.target.value }))} placeholder="https://zoom.us/j/..." className={inputCls} />
                        </Field>
                        <Field label="Prep notes">
                          <textarea value={mf.notes} onChange={(e) => setMf((s) => ({ ...s, notes: e.target.value }))} rows={2} placeholder="Questions to ask, talking points…" className={cn(inputCls, "resize-none")} />
                        </Field>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={() => setShowMeetingForm(false)} className="flex-1 rounded-md border border-border/60 py-2 text-xs hover:bg-accent">Cancel</button>
                          <button type="submit" disabled={schedulingMeeting} className="flex-1 rounded-md bg-gradient-brand text-brand-foreground py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
                            {schedulingMeeting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Schedule
                          </button>
                        </div>
                      </form>
                    )}

                    {meetings.length === 0 && !showMeetingForm && (
                      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                        No meetings yet
                      </div>
                    )}

                    {meetings.map((m: any) => (
                      <div key={m.id} className="rounded-lg border border-border/60 bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium">{m.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : "—"}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {m.meeting_type && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">{m.meeting_type}</span>}
                            {m.platform && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">{m.platform}</span>}
                          </div>
                        </div>
                        {m.meeting_link && (
                          <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-brand hover:underline truncate">
                            {m.meeting_link}
                          </a>
                        )}
                        {m.notes && <div className="mt-2 text-xs text-muted-foreground">{m.notes}</div>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── TAB 4: NOTES & ACTIVITY ── */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                {isEdit && (
                  <div className="space-y-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      placeholder="Add a note, update, or observation…"
                      className={cn(inputCls, "resize-none")}
                    />
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={addingNote || !newNote.trim()}
                      className="w-full rounded-md bg-gradient-brand text-brand-foreground py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {addingNote && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Add note
                    </button>
                  </div>
                )}

                {notesList.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                    No notes yet
                  </div>
                ) : (
                  notesList.map((note, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-card p-4">
                      <pre className="text-sm whitespace-pre-wrap font-sans">{note}</pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer — only show Save on profile tab */}
          {activeTab === "profile" && (
            <div className="shrink-0 border-t border-border/60 px-5 py-3 flex items-center justify-between gap-2">
              {isEdit ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-1.5 text-sm hover:bg-destructive/10 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              ) : <div />}
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !f.investor_name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isEdit ? "Save changes" : "Add lead"}
                </button>
              </div>
            </div>
          )}
        </form>
      </aside>
    </>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Star, ChevronDown, ChevronRight, CheckCircle2, Clock, FileQuestion, Users,
  FileCheck, XCircle, LogOut, AlertTriangle, Download, Printer, ZoomIn, ZoomOut,
  ArrowLeft, ArrowRight, FileText, Send, Sparkles, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase, createNotification, logActivity } from "@/lib/supabase";

// --- Types ---
type ReviewSectionKey = "pitch" | "financial" | "team" | "meeting" | "dd" | "qa";
type SectionStatus = "Not reviewed" | "In review" | "Done";
type DecisionStatus =
  | "Under Review"
  | "Request More Info"
  | "Move to Partner Review"
  | "Term Sheet Ready"
  | "Not Proceeding"
  | "Exit";

interface SectionState {
  status: SectionStatus;
  rating: number;
  notes: string;
  checks: Record<string, boolean>;
}

interface DecisionRow {
  id: string;
  status: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// --- Constants ---
const DOCS = [
  "Pitch deck v3.pdf",
  "Financial model.xlsx",
  "Cohort analysis v2.pdf",
  "Cap table.xlsx",
  "Customer references.pdf",
  "Architecture overview.pdf",
];

const STAGES = ["Deal Sourced", "Under Review", "Partner Review", "Term Sheet", "Closed"];

const SECTION_META: Array<{ key: ReviewSectionKey; label: string; checks: string[] }> = [
  { key: "pitch", label: "Pitch & Narrative", checks: ["Clear problem statement", "Market size defined", "Unique value proposition", "Compelling story"] },
  { key: "financial", label: "Financial Model", checks: ["Revenue projections", "Unit economics", "Burn rate & runway", "Path to profitability"] },
  { key: "team", label: "Team", checks: ["Founder-market fit", "Technical expertise", "Domain experience", "Advisory network"] },
  { key: "meeting", label: "Meeting Notes", checks: ["Key topics covered", "Action items captured", "Follow-up scheduled", "Red flags noted"] },
  { key: "dd", label: "Due Diligence", checks: ["Legal structure", "IP ownership", "Customer references", "Financials verified"] },
  { key: "qa", label: "Q&A", checks: ["All questions answered", "No unanswered concerns", "Founder responsive", "Satisfactory responses"] },
];

const DECISION_TO_DB: Record<DecisionStatus, string> = {
  "Under Review": "under_review",
  "Request More Info": "info_requested",
  "Move to Partner Review": "partner_review",
  "Term Sheet Ready": "term_sheet",
  "Not Proceeding": "rejected",
  "Exit": "exited",
};

const DB_TO_DECISION: Record<string, DecisionStatus> = {
  under_review: "Under Review",
  info_requested: "Request More Info",
  partner_review: "Move to Partner Review",
  term_sheet: "Term Sheet Ready",
  rejected: "Not Proceeding",
  exited: "Exit",
};

// --- Helpers ---
function decisionTone(status: DecisionStatus): string {
  if (status === "Term Sheet Ready") return "success";
  if (status === "Move to Partner Review") return "violet";
  if (status === "Request More Info") return "warning";
  if (status === "Not Proceeding" || status === "Exit") return "destructive";
  return "brand";
}

function initSections(metadata: Record<string, unknown> | null | undefined): Record<ReviewSectionKey, SectionState> {
  const empty = (): SectionState => ({ status: "Not reviewed", rating: 0, notes: "", checks: {} });
  return {
    pitch: (metadata?.["pitch_review"] as SectionState | undefined) ?? empty(),
    financial: (metadata?.["financial_review"] as SectionState | undefined) ?? empty(),
    team: (metadata?.["team_review"] as SectionState | undefined) ?? empty(),
    meeting: (metadata?.["meeting_review"] as SectionState | undefined) ?? empty(),
    dd: (metadata?.["dd_review"] as SectionState | undefined) ?? empty(),
    qa: (metadata?.["qa_review"] as SectionState | undefined) ?? empty(),
  };
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// --- Shared hook ---
function useLatestDecision(dealRoomId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["decision", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("decisions")
        .select("id, status, notes, metadata, created_at")
        .eq("deal_room_id", dealRoomId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as DecisionRow | null;
    },
  });
}

// --- Main export ---
export function ReviewTab({
  dealRoomId,
  currentUserRole,
  startupId,
}: {
  dealRoomId: string;
  currentUserRole: "investor" | "founder";
  startupId: string;
}) {
  return currentUserRole === "investor"
    ? <InvestorReview dealRoomId={dealRoomId} startupId={startupId} />
    : <FounderReview dealRoomId={dealRoomId} />;
}

// --- Investor view ---
function InvestorReview({ dealRoomId, startupId }: { dealRoomId: string; startupId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: decision } = useLatestDecision(dealRoomId);
  const [sections, setSections] = useState<Record<ReviewSectionKey, SectionState>>(initSections(null));
  const [activeDoc, setActiveDoc] = useState(DOCS[0]);
  const [docNotes, setDocNotes] = useState<Record<string, string>>({});
  const [reviewedDocs, setReviewedDocs] = useState<Record<string, boolean>>({});
  const prevIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (decision === undefined) return;
    const newId = decision?.id ?? null;
    if (newId !== prevIdRef.current) {
      prevIdRef.current = newId;
      setSections(initSections(decision?.metadata));
    }
  }, [decision]);

  const completed = Object.values(sections).filter((s) => s.status === "Done").length;
  const ratings = Object.values(sections).map((s) => s.rating).filter((r) => r > 0);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const handleChange = (key: ReviewSectionKey, updated: SectionState) => {
    setSections((prev) => ({ ...prev, [key]: updated }));
  };

  const handleSave = async (key: ReviewSectionKey, updated: SectionState) => {
    const newSections = { ...sections, [key]: updated };
    setSections(newSections);

    const metaPayload: Record<string, SectionState> = {};
    for (const k of Object.keys(newSections) as ReviewSectionKey[]) {
      metaPayload[`${k}_review`] = newSections[k];
    }

    if (decision?.id) {
      await supabase.from("decisions").update({ metadata: metaPayload }).eq("id", decision.id);
    } else {
      await supabase.from("decisions").insert({
        deal_room_id: dealRoomId,
        decided_by: user!.id,
        status: "under_review",
        metadata: metaPayload,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
  };

  const handleDecision = async (
    type: DecisionStatus,
    extra?: { requestInfo?: { what: string; deadline: string }; reason?: string; message?: string },
  ) => {
    if (!user?.id) return;

    const metaPayload: Record<string, unknown> = {};
    for (const k of Object.keys(sections) as ReviewSectionKey[]) {
      metaPayload[`${k}_review`] = sections[k];
    }
    if (extra?.requestInfo) metaPayload["request_info"] = extra.requestInfo;
    if (extra?.reason) metaPayload["reason"] = extra.reason;

    await supabase.from("decisions").insert({
      deal_room_id: dealRoomId,
      decided_by: user.id,
      status: DECISION_TO_DB[type],
      notes: extra?.message ?? null,
      metadata: metaPayload,
    });

    await logActivity(dealRoomId, user.id, `Decision: ${type}`);

    if (startupId) {
      const { data: startup } = await supabase
        .from("startups")
        .select("founder_id")
        .eq("id", startupId)
        .maybeSingle();
      if (startup?.founder_id) {
        await createNotification(
          startup.founder_id,
          `Deal update: ${type}`,
          extra?.message ?? `An investor updated your deal status to "${type}".`,
          "decision",
          dealRoomId,
          `/app/deal-room/${dealRoomId}`,
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["decision", dealRoomId] });
  };

  const currentDecisionStatus = decision?.status ? DB_TO_DECISION[decision.status] : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 p-6 lg:p-8">
      <div className="space-y-5 min-w-0">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Investment Review</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete each section before making a final decision.</p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{completed} of 6 sections reviewed</span>
              <span>{Math.round((completed / 6) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-brand transition-all" style={{ width: `${(completed / 6) * 100}%` }} />
            </div>
          </div>
        </div>

        {SECTION_META.map((meta) => (
          <ReviewSection
            key={meta.key}
            meta={meta}
            state={sections[meta.key]}
            onChange={(updated) => handleChange(meta.key, updated)}
            onSave={(updated) => handleSave(meta.key, updated)}
          />
        ))}

        <DecisionZone avg={avg} currentStatus={currentDecisionStatus} onDecision={handleDecision} />
      </div>

      <div className="lg:sticky lg:top-4 self-start">
        <DocumentPreview
          activeDoc={activeDoc}
          setActiveDoc={setActiveDoc}
          docNotes={docNotes}
          setDocNotes={setDocNotes}
          reviewedDocs={reviewedDocs}
          setReviewedDocs={setReviewedDocs}
        />
      </div>
    </div>
  );
}

function ReviewSection({
  meta,
  state,
  onChange,
  onSave,
}: {
  meta: (typeof SECTION_META)[number];
  state: SectionState;
  onChange: (updated: SectionState) => void;
  onSave: (updated: SectionState) => void;
}) {
  const [open, setOpen] = useState(false);
  const wordCount = state.notes.trim().split(/\s+/).filter(Boolean).length;
  const overLimit = wordCount > 500;
  const done = state.status === "Done";

  const bump = (patch: Partial<SectionState>) => {
    const updated = { ...state, ...patch };
    if (updated.status === "Not reviewed") updated.status = "In review";
    onChange(updated);
  };

  return (
    <div className={cn("rounded-2xl border bg-card shadow-card overflow-hidden transition-colors", done ? "border-success/40" : "border-border/60")}>
      <button onClick={() => setOpen((o) => !o)} className={cn("w-full flex items-center gap-3 px-5 py-4 text-left", done && "bg-success/5")}>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1">
          <div className="text-sm font-semibold">{meta.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {state.rating > 0 ? `${state.rating}/5 stars` : "Not rated"} · {Object.values(state.checks).filter(Boolean).length}/{meta.checks.length} checks
          </div>
        </div>
        <StatusPill status={state.status} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/60 pt-4">
          <StarRating value={state.rating} onChange={(v) => bump({ rating: v })} />

          <div>
            <textarea
              value={state.notes}
              onChange={(e) => bump({ notes: e.target.value })}
              placeholder={`Your notes on ${meta.label.toLowerCase()}`}
              className={cn(
                "w-full min-h-[100px] rounded-[10px] border bg-background p-3 text-sm focus:outline-none focus:border-brand/50",
                overLimit ? "border-destructive/60" : "border-border/60",
              )}
            />
            <div className={cn("text-[11px] mt-1 flex justify-end", overLimit ? "text-destructive" : "text-muted-foreground")}>
              {wordCount} / 500 words
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {meta.checks.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm rounded-md border border-border/60 px-3 py-2 hover:bg-accent/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!state.checks[c]}
                  onChange={(e) => bump({ checks: { ...state.checks, [c]: e.target.checked } })}
                  className="h-4 w-4 rounded border-border accent-[hsl(var(--brand))]"
                />
                <span>{c}</span>
              </label>
            ))}
          </div>

          {meta.key === "qa" && (
            <button className="text-xs inline-flex items-center gap-1 text-brand hover:underline">
              <Download className="h-3 w-3" /> Download Q&A Report
            </button>
          )}

          <div className="flex justify-end pt-2 border-t border-border/40">
            <button
              onClick={() => onSave({ ...state, status: "Done" })}
              disabled={overLimit}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark as reviewed
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Done" ? "bg-success/15 text-success" :
    status === "In review" ? "bg-warning/15 text-warning" :
    "bg-muted text-muted-foreground";
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", tone)}>{status}</span>;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} className="p-0.5">
          <Star className={cn("h-5 w-5 transition-colors", n <= value ? "fill-warning text-warning" : "text-muted-foreground/40")} />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">{value > 0 ? `${value}/5` : "Tap to rate"}</span>
    </div>
  );
}

// --- Decision Zone ---
type DecisionExtra = { requestInfo?: { what: string; deadline: string }; reason?: string; message?: string };

function DecisionZone({
  avg,
  currentStatus,
  onDecision,
}: {
  avg: number;
  currentStatus: DecisionStatus | undefined;
  onDecision: (type: DecisionStatus, extra?: DecisionExtra) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-destructive/40 bg-destructive/5 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <div>
          <div className="text-sm font-semibold">Decision Zone</div>
          <div className="text-xs text-muted-foreground">Your decision will be visible to the founder immediately.</div>
        </div>
      </div>

      <div className="rounded-[10px] bg-card border border-border/60 p-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overall deal score</div>
          <div className="text-3xl font-semibold mt-1">{avg.toFixed(1)} <span className="text-base text-muted-foreground font-normal">/ 5.0</span></div>
        </div>
        {currentStatus && (
          <span className={`text-xs px-3 py-1.5 rounded-full bg-${decisionTone(currentStatus)}/15 text-${decisionTone(currentStatus)} font-medium`}>
            {currentStatus}
          </span>
        )}
      </div>

      <div className="grid gap-2.5">
        <DecisionButton type="Under Review" icon={Clock} tone="brand" label="Under Review" sub="Still evaluating" onDecision={onDecision} />
        <DecisionButton type="Request More Info" icon={FileQuestion} tone="warning" label="Request More Info" sub="Ask the founder for specifics" onDecision={onDecision} />
        <DecisionButton type="Move to Partner Review" icon={Users} tone="violet" label="Move to Partner Review" sub="Escalate to your partnership" onDecision={onDecision} />
        <DecisionButton type="Term Sheet Ready" icon={FileCheck} tone="success" label="Term Sheet Ready" sub="Notify founder you're ready to proceed" onDecision={onDecision} />
        <DecisionButton type="Not Proceeding" icon={XCircle} tone="destructive" label="Not Proceeding" sub="Decline with reason" onDecision={onDecision} />
        <DecisionButton type="Exit" icon={LogOut} tone="muted-foreground" label="Exit Deal Room" sub="Remove your access" onDecision={onDecision} />
      </div>
    </div>
  );
}

function DecisionButton({
  type, icon: Icon, tone, label, sub, onDecision,
}: {
  type: DecisionStatus;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  tone: string;
  label: string;
  sub: string;
  onDecision: (type: DecisionStatus, extra?: DecisionExtra) => Promise<void>;
}) {
  const [openForm, setOpenForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("Stage too early");
  const [message, setMessage] = useState("");
  const [what, setWhat] = useState("");
  const [deadline, setDeadline] = useState("");

  const requiresForm = type === "Request More Info" || type === "Not Proceeding" || type === "Exit";
  const requiresConfirm = type === "Term Sheet Ready";

  const submit = async () => {
    setLoading(true);
    try {
      if (type === "Request More Info") {
        if (!what.trim()) return;
        await onDecision(type, { requestInfo: { what, deadline } });
      } else if (type === "Not Proceeding" || type === "Exit") {
        await onDecision(type, { reason, message });
      } else {
        await onDecision(type);
      }
      setOpenForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (requiresForm || requiresConfirm) {
      setOpenForm(true);
    } else {
      setLoading(true);
      try { await onDecision(type); } finally { setLoading(false); }
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          "w-full h-12 rounded-[10px] border flex items-center gap-3 px-4 text-left transition-colors disabled:opacity-60",
          `border-${tone}/40 bg-${tone}/10 hover:bg-${tone}/15 text-${tone}`,
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">{label}</div>
          <div className="text-[11px] opacity-80">{sub}</div>
        </div>
      </button>

      {openForm && (
        <div className="mt-2 rounded-[10px] border border-border/60 bg-card p-4 space-y-3">
          {type === "Request More Info" && (
            <>
              <div>
                <label className="text-xs font-medium">What information is needed?</label>
                <textarea value={what} onChange={(e) => setWhat(e.target.value)} className="mt-1 w-full min-h-[80px] rounded-[10px] border border-border/60 bg-background p-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Deadline</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-[10px] border border-border/60 bg-background p-2 text-sm" />
              </div>
            </>
          )}
          {(type === "Not Proceeding" || type === "Exit") && (
            <>
              <div>
                <label className="text-xs font-medium">Reason</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-[10px] border border-border/60 bg-background p-2 text-sm">
                  {["Stage too early", "Outside thesis", "Team concerns", "Market concerns", "Financial concerns", "Other"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Message to founder (optional)</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 w-full min-h-[60px] rounded-[10px] border border-border/60 bg-background p-2 text-sm" />
              </div>
            </>
          )}
          {requiresConfirm && (
            <div className="text-sm">This will notify the founder you are ready to proceed to term sheet. Continue?</div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpenForm(false)} className="rounded-[10px] border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
            <button onClick={submit} disabled={loading} className="inline-flex items-center gap-1.5 rounded-[10px] bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow disabled:opacity-60">
              <Send className="h-3.5 w-3.5" /> {requiresConfirm ? "Confirm" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Document preview (session-local) ---
function DocumentPreview({
  activeDoc,
  setActiveDoc,
  docNotes,
  setDocNotes,
  reviewedDocs,
  setReviewedDocs,
}: {
  activeDoc: string;
  setActiveDoc: (d: string) => void;
  docNotes: Record<string, string>;
  setDocNotes: (notes: Record<string, string>) => void;
  reviewedDocs: Record<string, boolean>;
  setReviewedDocs: (docs: Record<string, boolean>) => void;
}) {
  const note = docNotes[activeDoc] ?? "";
  const reviewed = !!reviewedDocs[activeDoc];
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setSavedAt(new Date().toLocaleTimeString()), 800);
    return () => clearTimeout(t);
  }, [note]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
      <div className="p-4 border-b border-border/60 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <select value={activeDoc} onChange={(e) => { setActiveDoc(e.target.value); setPage(1); }} className="flex-1 rounded-[10px] border border-border/60 bg-background p-2 text-sm">
            {DOCS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent"><ArrowLeft className="h-3.5 w-3.5" /></button>
            <span className="text-muted-foreground px-1">Page {page} of 12</span>
            <button onClick={() => setPage((p) => Math.min(12, p + 1))} className="grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent"><ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent"><ZoomOut className="h-3.5 w-3.5" /></button>
            <span className="text-muted-foreground px-1">{zoom}%</span>
            <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent"><ZoomIn className="h-3.5 w-3.5" /></button>
            <button onClick={() => window.print()} className="grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent"><Printer className="h-3.5 w-3.5" /></button>
            <button className="grid h-7 w-7 place-items-center rounded-md border border-border/60 hover:bg-accent"><Download className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="bg-muted/40 p-6 grid place-items-center min-h-[420px]">
        <div
          className="bg-background rounded-md shadow-elev w-full max-w-md aspect-[3/4] grid place-items-center text-center p-6"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
        >
          <div>
            <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto" />
            <div className="text-sm font-medium mt-3">{activeDoc}</div>
            <div className="text-xs text-muted-foreground mt-1">Page {page} preview</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 border-t border-border/60">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Your notes on this document</span>
          <span className="text-muted-foreground">{savedAt ? `Saved ${savedAt}` : "Auto-saves"}</span>
        </div>
        <textarea
          value={note}
          onChange={(e) => setDocNotes({ ...docNotes, [activeDoc]: e.target.value })}
          placeholder="Notes for this document only…"
          className="w-full min-h-[90px] rounded-[10px] border border-border/60 bg-background p-2 text-sm focus:outline-none focus:border-brand/50"
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{note.length} chars</span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewedDocs({ ...reviewedDocs, [activeDoc]: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--brand))]"
            />
            <span>Mark this document as reviewed</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// --- Founder view ---
function FounderReview({ dealRoomId }: { dealRoomId: string }) {
  const { user } = useAuth();
  const { data: decision, isLoading } = useLatestDecision(dealRoomId);

  const dbStatus = decision?.status ?? null;
  const displayStatus = dbStatus ? DB_TO_DECISION[dbStatus] : null;

  const currentStageIndex = useMemo(() => {
    if (!dbStatus) return 1;
    if (dbStatus === "term_sheet") return 4;
    if (dbStatus === "partner_review") return 3;
    if (dbStatus === "info_requested" || dbStatus === "under_review") return 2;
    if (dbStatus === "rejected" || dbStatus === "exited") return -1;
    return 1;
  }, [dbStatus]);

  const { data: activitiesData } = useQuery({
    queryKey: ["investor-activities", dealRoomId, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, action, created_at")
        .eq("deal_room_id", dealRoomId)
        .neq("actor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });
  const activities = activitiesData ?? [];

  const sections = initSections(decision?.metadata);

  const decisionForCard = displayStatus
    ? {
        status: displayStatus,
        updatedAt: decision!.created_at,
        requestInfo: (decision!.metadata as Record<string, unknown> | null)?.["request_info"] as { what: string; deadline?: string } | undefined,
        reason: (decision!.metadata as Record<string, unknown> | null)?.["reason"] as string | undefined,
        message: decision!.notes,
      }
    : null;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted/60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Deal Progress</h2>
        <p className="text-sm text-muted-foreground mt-1">Track where investors are in their review process.</p>
      </div>

      {/* Stage tracker */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STAGES.map((stage, i) => {
            const done = currentStageIndex >= 0 && i < currentStageIndex;
            const current = currentStageIndex >= 0 && i === currentStageIndex;
            return (
              <div key={stage} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "h-9 w-9 rounded-full grid place-items-center text-xs font-semibold",
                    done ? "bg-success/15 text-success" :
                    current ? "bg-violet/15 text-violet ring-2 ring-violet" :
                    "bg-muted text-muted-foreground",
                  )}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className={cn("text-[11px] text-center w-20", current ? "text-violet font-semibold" : "text-muted-foreground")}>{stage}</div>
                </div>
                {i < STAGES.length - 1 && <div className={cn("h-0.5 w-8", done ? "bg-success" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </div>

      <DecisionStatusCard decision={decisionForCard} />

      {/* Review progress */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
        <div className="text-sm font-semibold mb-4">Review Progress</div>
        <div className="space-y-3">
          {SECTION_META.map((meta) => {
            const s = sections[meta.key];
            const checks = Object.values(s.checks).filter(Boolean).length;
            const total = meta.checks.length;
            const pct = s.status === "Done" ? 100 : Math.round((checks / total) * 100);
            return (
              <div key={meta.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-muted-foreground">{s.status === "Done" ? "Complete ✓" : pct === 0 ? "Not started" : `${pct}% reviewed`}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full transition-all", s.status === "Done" ? "bg-success" : "bg-gradient-brand")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
        <div className="text-sm font-semibold mb-3">Activity</div>
        {activities.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center">
            <Sparkles className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
            Investor activity will appear here as they review your deal.
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span className="flex-1">{a.action}</span>
                <span className="text-xs text-muted-foreground">{relTime(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface CardDecision {
  status: DecisionStatus;
  updatedAt: string;
  requestInfo?: { what: string; deadline?: string };
  reason?: string;
  message?: string | null;
}

function DecisionStatusCard({ decision }: { decision: CardDecision | null }) {
  if (!decision) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card border-l-4 border-l-brand">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand" />
          <div className="text-sm font-semibold">Awaiting investor review</div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">No decisions yet.</div>
      </div>
    );
  }

  const { status, updatedAt, requestInfo, reason, message } = decision;

  type Config = { tone: string; emoji: string; title: string; body: ReactNode };
  const config: Record<DecisionStatus, Config> = {
    "Under Review": { tone: "brand", emoji: "🔍", title: "Under Review", body: <>Last activity: {relTime(updatedAt)}</> },
    "Request More Info": {
      tone: "warning", emoji: "⚠️", title: "Information Requested",
      body: (
        <div className="space-y-1">
          <div><span className="font-medium">Requested:</span> {requestInfo?.what || "—"}</div>
          {requestInfo?.deadline && <div><span className="font-medium">Deadline:</span> {requestInfo.deadline}</div>}
          <button className="mt-2 inline-flex items-center gap-1 text-warning text-xs font-medium hover:underline">Upload requested documents →</button>
        </div>
      ),
    },
    "Move to Partner Review": { tone: "violet", emoji: "⭐", title: "Advanced to Partner Review", body: <>Your deal has been escalated. This is a strong positive signal.</> },
    "Term Sheet Ready": { tone: "success", emoji: "🎉", title: "Term Sheet Ready!", body: <>Congratulations — the investor is ready to proceed. Check your email.</> },
    "Not Proceeding": {
      tone: "muted-foreground", emoji: "✕", title: "Not Proceeding",
      body: (
        <div className="space-y-1">
          <div><span className="font-medium">Reason:</span> {reason || "—"}</div>
          {message && <div className="text-sm">"{message}"</div>}
          <div className="text-xs italic mt-2">This is not the end. Keep going.</div>
        </div>
      ),
    },
    "Exit": { tone: "muted-foreground", emoji: "←", title: "Investor Exited", body: <>{reason || "Investor has left the deal room."}</> },
  };

  const c = config[status];
  return (
    <div className={`rounded-2xl border bg-card p-6 shadow-card border-l-4 border-l-${c.tone} bg-${c.tone}/5`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{c.emoji}</span>
        <div className="text-sm font-semibold">{c.title}</div>
      </div>
      <div className="text-sm text-muted-foreground mt-2">{c.body}</div>
    </div>
  );
}

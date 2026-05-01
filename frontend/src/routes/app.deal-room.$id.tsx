import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutGrid, FileText, MessageSquare, ListChecks, StickyNote, Activity,
  Calendar, Gavel, Download, CheckCircle2, AlertTriangle, Clock, Plus,
  ArrowLeft, Lock, Sparkles, X, MessagesSquare,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AIChat } from "@/components/ai/AIChat";
import { DealRoomChat } from "@/components/app/DealRoomChat";
import { DDChecklist } from "@/components/app/DDChecklist";
import { Dropzone } from "@/components/app/Dropzone";

export const Route = createFileRoute("/app/deal-room/$id")({
  component: DealRoom,
});

const tabs = [
  { k: "overview", l: "Overview", i: LayoutGrid },
  { k: "documents", l: "Documents", i: FileText },
  { k: "chat", l: "Team chat", i: MessagesSquare },
  { k: "qa", l: "Q&A", i: MessageSquare },
  { k: "checklist", l: "Checklist", i: ListChecks },
  { k: "notes", l: "Notes", i: StickyNote },
  { k: "timeline", l: "Timeline", i: Activity },
  { k: "meetings", l: "Meetings", i: Calendar },
  { k: "decision", l: "Decision", i: Gavel },
];

function DealRoom() {
  const [tab, setTab] = useState("overview");
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <div className="flex h-[calc(100vh-4rem)] relative">
      {/* DR sidebar */}
      <aside className="w-[260px] border-r border-border/60 bg-sidebar flex flex-col">
        <div className="p-5 border-b border-border/60">
          <Link to={"/app/deal-rooms" as any} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All deal rooms</Link>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold">A</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">Atlas Robotics</div>
              <div className="text-[11px] text-muted-foreground">NEA · Series A</div>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow" /> Active · NDA signed
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {tabs.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
            >
              <t.i className={`h-4 w-4 ${tab === t.k ? "text-brand" : ""}`} />
              {t.l}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/60 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 inline mr-1" /> Encrypted · watermarked
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {tab === "overview" && <Overview />}
        {tab === "documents" && <Documents />}
        {tab === "chat" && <div className="h-full"><DealRoomChat /></div>}
        {tab === "qa" && <QA />}
        {tab === "checklist" && <DDChecklist />}
        {tab === "notes" && <Notes />}
        {tab === "timeline" && <Timeline />}
        {tab === "meetings" && <MeetingsTab />}
        {tab === "decision" && <Decision />}
      </main>

      {/* AI floating action */}
      {!aiOpen && (
        <button
          onClick={() => setAiOpen(true)}
          className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-gradient-brand text-brand-foreground px-4 py-2.5 text-sm font-medium shadow-glow hover:scale-[1.02] transition-transform"
        >
          <Sparkles className="h-4 w-4" /> Ask AI
        </button>
      )}

      {/* AI slide-over */}
      {aiOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm" onClick={() => setAiOpen(false)} />
          <aside className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[440px] border-l border-border/60 bg-background shadow-elev flex flex-col">
            <div className="h-14 border-b border-border/60 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
                <div>
                  <div className="text-sm font-semibold leading-tight">Deal Room AI</div>
                  <div className="text-[10px] text-muted-foreground">Atlas Robotics</div>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 min-h-0">
              <AIChat
                compact
                scope="the Atlas Robotics deal room"
                initialAssistant="I have context on this deal room — documents, Q&A, diligence checklist, and team. Ask me anything."
                starters={[
                  "Summarize this deal in 3 bullets.",
                  "What diligence items are still open?",
                  "Draft a follow-up to Sara Khan.",
                  "Flag the top 3 risks.",
                ]}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function Overview() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Atlas Robotics</h2>
      <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Industrial robots that learn from one demonstration. Replacing fixed-function automation across F500 manufacturing.</p>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["ARR", "$4.2M", "+318%"], ["Customers", "12", "F500: 4"], ["Burn", "$280K", "/mo"], ["Runway", "18mo", "post-raise"]].map(([l, v, d]) => (
          <div key={l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="mt-1 text-xl font-semibold">{v}</div>
            <div className="text-[11px] text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="text-sm font-semibold">Founders</div>
          <div className="mt-3 space-y-3">
            {[["Jordan Reeves", "CEO · ex-Tesla Autopilot"], ["Mei Tan", "CTO · ex-Google Brain"], ["Sam Cole", "CPO · ex-Stripe"]].map(([n, r]) => (
              <div key={n} className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground text-xs font-semibold">{n.split(" ").map(s => s[0]).join("")}</div>
                <div><div className="text-sm font-medium">{n}</div><div className="text-xs text-muted-foreground">{r}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
          <div className="text-sm font-semibold">Round details</div>
          <div className="mt-3 space-y-2.5 text-sm">
            {[["Round", "Series A"], ["Target", "$8M"], ["Soft circled", "$3.2M"], ["Lead", "Open"], ["Valuation", "$48M post"], ["Close", "~6 weeks"]].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Documents() {
  const items = [
    ["Pitch deck v3.pdf", "Pitch", "ok"],
    ["Financial model.xlsx", "Financials", "ok"],
    ["Cohort analysis v2.pdf", "Financials", "ok"],
    ["Cap table.xlsx", "Legal", "review"],
    ["Customer references.pdf", "Market", "ok"],
    ["Architecture overview.pdf", "Technical", "ok"],
  ];
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-accent">Request document</button>
      </div>
      <div className="mt-5">
        <Dropzone />
      </div>
      <div className="mt-5 rounded-xl border border-border/60 bg-card shadow-card divide-y divide-border/60">
        {items.map(([n, c, st]) => (
          <div key={n} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 group">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-accent"><FileText className="h-4 w-4 text-brand" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{n}</div>
              <div className="text-xs text-muted-foreground">{c}</div>
            </div>
            {st === "ok" ? (
              <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-warning text-xs"><AlertTriangle className="h-3.5 w-3.5" /> Review</span>
            )}
            <button className="text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QA() {
  const msgs = [
    { me: false, w: "Sara Khan", t: "Can you walk through your retention curve at the cohort level?" },
    { me: true, w: "Jordan", t: "Yes — gross retention is 96% over 24 months. Net is 134% driven by SaaS attach. Cohort doc just dropped under Financials." },
    { me: false, w: "Sara Khan", t: "Great. What's the largest customer concentration risk?" },
    { me: true, w: "Jordan", t: "Top customer is 18% of ARR; top 3 are 41%. Diversification target is <30% top-1 by year-end." },
  ];
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Q&amp;A</h2>
      <div className="text-sm text-muted-foreground">12 questions · 8 answered</div>
      <div className="mt-5 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.me ? "flex-row-reverse" : ""}`}>
            <div className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold shrink-0 ${m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"}`}>{m.w.split(" ").map(s => s[0]).join("")}</div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.me ? "bg-gradient-brand text-brand-foreground" : "bg-accent"}`}>
              <div className={`text-[11px] mb-0.5 ${m.me ? "text-brand-foreground/70" : "text-muted-foreground"}`}>{m.w}</div>
              <div className="text-sm">{m.t}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <input placeholder="Ask a question…" className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
        <button className="rounded-md bg-gradient-brand text-brand-foreground px-4 text-sm">Send</button>
      </div>
    </div>
  );
}


function Notes() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Notes</h2>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-sm shadow-glow"><Plus className="h-4 w-4" /> Note</button>
      </div>
      <div className="mt-5 grid gap-3">
        {[
          { p: false, w: "Sara Khan", d: "2h ago", t: "Strong technical team. Concerned about hardware capex — need to dig into BOM and gross margin trajectory." },
          { p: true, w: "Private · me", d: "yesterday", t: "Lead is between us and Bessemer. We move fast or we lose it." },
          { p: false, w: "Mark Lin (partner)", d: "2d ago", t: "Like the founder. Want to see Q4 cohort before partner meeting." },
        ].map((n, i) => (
          <div key={i} className={`rounded-xl border border-border/60 p-4 shadow-card ${n.p ? "bg-warning/5 border-warning/30" : "bg-card"}`}>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium">{n.w}</span>
              <span className="text-muted-foreground">{n.d}</span>
              {n.p && <span className="ml-auto text-[10px] uppercase tracking-wider text-warning">Private</span>}
            </div>
            <div className="mt-2 text-sm">{n.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Timeline() {
  const events = [
    ["NDA signed by Sara Khan", "2m ago", "success"],
    ["Cohort analysis v2 uploaded", "1h ago", "brand"],
    ["Q&A: 'retention curve' answered", "3h ago", "violet"],
    ["Partner meeting scheduled — Wed 1PM", "1d ago", "warning"],
    ["Deal room opened by Jordan", "3d ago", "muted-foreground"],
  ];
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Timeline</h2>
      <div className="mt-6 relative pl-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
        {events.map(([t, d, c], i) => (
          <div key={i} className="relative pb-6 last:pb-0">
            <div className={`absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-${c} ring-4 ring-background`} />
            <div className="text-sm font-medium">{t}</div>
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingsTab() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Meetings</h2>
      <div className="mt-5 space-y-3">
        {[
          { d: "Wed · 1:00 PM", w: "Partner meeting · NEA", n: "Discuss Q4 cohort, term sheet shape" },
          { d: "Mon · 10:00 AM", w: "Tech deep-dive", n: "Architecture walkthrough with NEA tech advisor" },
        ].map((m, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{m.w}</div>
              <span className="text-xs text-muted-foreground">{m.d}</span>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{m.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Decision() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold tracking-tight">Decision</h2>
      <div className="text-sm text-muted-foreground">Set status, risk level, and partner notes.</div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["Accept", "success", true],
            ["Hold", "warning", false],
            ["Pass", "destructive", false],
          ].map(([l, c, sel]: any) => (
            <button key={l} className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${sel ? `border-${c} bg-${c}/10 text-${c}` : "border-border/60 hover:bg-accent"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="mt-6 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Risk level</div>
        <div className="mt-3 flex gap-2">
          {["Low", "Medium", "High"].map((r, i) => (
            <button key={r} className={`flex-1 rounded-md border px-3 py-2 text-sm ${i === 0 ? "border-success bg-success/10 text-success" : "border-border/60 hover:bg-accent"}`}>{r}</button>
          ))}
        </div>

        <div className="mt-6 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Notes</div>
        <textarea
          defaultValue="Strong founding team with deep domain expertise. Lead Series A at $48M post, $5M check. Conditional on completing Q4 cohort review and finalizing customer references."
          className="mt-3 w-full min-h-[120px] rounded-md border border-border/60 bg-background p-3 text-sm focus:outline-none focus:border-brand/50"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent">Save draft</button>
          <button className="rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow">Submit decision</button>
        </div>
      </div>
    </div>
  );
}

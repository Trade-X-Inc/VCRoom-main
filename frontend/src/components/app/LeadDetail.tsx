import { useState } from "react";
import { X, Mail, Calendar, MessageSquare, StickyNote, Sparkles, Send, RotateCw, Copy, Check, ExternalLink, Globe, MapPin, Plus } from "lucide-react";
import type { Lead } from "@/lib/mock";
import { cn } from "@/lib/utils";

type Tab = "overview" | "email" | "notes" | "followup";

export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[640px] bg-background border-l border-border/60 shadow-elev flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-brand text-brand-foreground font-semibold">{lead.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">{lead.name}</h2>
                <span className="inline-flex items-center text-[10px] rounded-full bg-accent px-1.5 py-0.5 font-medium">{lead.stage}</span>
              </div>
              <div className="text-sm text-muted-foreground">{lead.firm} · {lead.role ?? "Partner"}</div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lead.location ?? "San Francisco, CA"}</span>
                <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{(lead.firm).toLowerCase().replace(/\s+/g, "")}.com</span>
              </div>
            </div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { i: Mail, l: "Message", k: "msg" },
              { i: Calendar, l: "Schedule", k: "cal" },
              { i: Sparkles, l: "AI Email", k: "email" as Tab },
              { i: StickyNote, l: "Note", k: "notes" as Tab },
            ].map((a) => (
              <button
                key={a.l}
                onClick={() => { if (a.k === "email" || a.k === "notes") setTab(a.k); }}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card p-3 text-xs hover:bg-accent transition-colors"
              >
                <a.i className="h-4 w-4 text-brand" />
                <span className="font-medium">{a.l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border/60 px-5">
          <div className="flex gap-1">
            {([
              ["overview", "Overview"],
              ["email", "Email Assistant"],
              ["notes", "Notes"],
              ["followup", "Follow-up"],
            ] as [Tab, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={cn(
                  "px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                  tab === k ? "border-brand text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "overview" && <Overview lead={lead} />}
          {tab === "email" && <EmailAssistantPanel lead={lead} />}
          {tab === "notes" && <NotesPanel />}
          {tab === "followup" && <FollowUpPanel />}
        </div>
      </aside>
    </>
  );
}

function Overview({ lead }: { lead: Lead }) {
  return (
    <div className="p-5 space-y-5">
      <Section title="Investment focus">
        <div className="grid grid-cols-3 gap-3">
          <Stat l="Check size" v={lead.check} />
          <Stat l="Thesis" v={lead.thesis} />
          <Stat l="Stage" v={lead.stage} />
        </div>
      </Section>
      <Section title="About">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {lead.bio ?? `${lead.name} leads ${lead.thesis.toLowerCase()} investments at ${lead.firm}. Recent investments span enterprise SaaS, developer tools, and applied AI. Known for hands-on diligence and fast decisions.`}
        </p>
      </Section>
      <Section title="Recent portfolio">
        <div className="flex flex-wrap gap-1.5">
          {(lead.portfolio ?? ["Anthropic", "Vercel", "Figma", "Linear", "Replit"]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs">
              {p} <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
            </span>
          ))}
        </div>
      </Section>
      <Section title="Activity">
        <div className="space-y-2">
          {[
            { t: "Replied to your intro email", d: lead.lastTouch ?? "2 days ago" },
            { t: "Viewed your pitch deck v3", d: "3 days ago" },
            { t: "Added to pipeline", d: "1 week ago" },
          ].map((a) => (
            <div key={a.t} className="flex items-center justify-between text-sm py-1.5">
              <span>{a.t}</span>
              <span className="text-xs text-muted-foreground">{a.d}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{l}</div>
      <div className="mt-0.5 text-sm font-medium truncate">{v}</div>
    </div>
  );
}

function EmailAssistantPanel({ lead }: { lead: Lead }) {
  const [tone, setTone] = useState<"Direct" | "Warm" | "Formal">("Direct");
  const [copied, setCopied] = useState(false);
  const draft = `Hi ${lead.name.split(" ")[0]},

Quick note — we're closing our Series A and ${lead.firm}'s thesis around ${lead.thesis.toLowerCase()} feels like a strong fit.

We've grown ARR 4.2x in 12 months and signed two F500 pilots. Would you be open to a 20-min call next week?

Pitch deck attached. Happy to share the data room afterward.

Best,
Jordan`;

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-5">
      <div className="rounded-none border border-border/60 bg-card overflow-hidden shadow-card">
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 bg-gradient-soft">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">AI draft · for {lead.name}</div>
            <div className="text-[11px] text-muted-foreground">Personalized using your profile + their thesis</div>
          </div>
          <button className="text-xs inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 hover:bg-accent"><RotateCw className="h-3 w-3" /> Regen</button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground w-14">To</span>
            <span className="font-medium">{lead.email ?? `${lead.name.split(" ")[0].toLowerCase()}@${lead.firm.toLowerCase().replace(/\s+/g, "")}.com`}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-muted-foreground w-14">Subject</span>
            <span className="font-medium">Atlas Robotics — Series A · {lead.thesis}</span>
          </div>
          <div className="border-t border-border/60 pt-3">
            <textarea defaultValue={draft} className="w-full min-h-[220px] resize-none bg-transparent text-sm leading-relaxed focus:outline-none" />
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border/60 bg-gradient-soft flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {(["Direct", "Warm", "Formal"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={cn("rounded-md border border-border/60 px-2 py-1 text-[11px]", tone === t ? "bg-accent" : "hover:bg-accent/60")}
              >{t}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs hover:bg-accent">
              {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-1.5 text-xs shadow-glow"><Send className="h-3 w-3" /> Send</button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
        AI uses: your founder profile, the investor's recent posts, and shared connections. Always review before sending.
      </div>
    </div>
  );
}

function NotesPanel() {
  return (
    <div className="p-5 space-y-3">
      <button className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border/60 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
        <Plus className="h-4 w-4" /> New note
      </button>
      {[
        { t: "Mentioned timeline pressure — wants to wrap diligence in 2 weeks.", d: "Yesterday · me" },
        { t: "Co-invested with Sequoia in 2 of last 4 deals. Mention that for warm-intro angle.", d: "3d ago · me" },
      ].map((n, i) => (
        <div key={i} className="rounded-none border border-border/60 bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">{n.d}</div>
          <div className="mt-1 text-sm">{n.t}</div>
        </div>
      ))}
    </div>
  );
}

function FollowUpPanel() {
  const items = [
    { t: "Send Q3 cohort doc", d: "Today · 5 PM", done: false },
    { t: "Schedule partner meeting follow-up", d: "Wed", done: false },
    { t: "Share 2 customer references", d: "Done", done: true },
  ];
  return (
    <div className="p-5 space-y-2">
      <div className="text-xs text-muted-foreground mb-2">Auto-tracked from your conversations</div>
      {items.map((it, i) => (
        <div key={i} className="rounded-none border border-border/60 bg-card p-4 flex items-center gap-3 shadow-xs">
          <button className={cn("h-5 w-5 rounded-full border-2 grid place-items-center", it.done ? "border-success bg-success/10" : "border-border/60")}>
            {it.done && <Check className="h-3 w-3 text-success" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className={cn("text-sm", it.done && "line-through text-muted-foreground")}>{it.t}</div>
            <div className="text-xs text-muted-foreground">{it.d}</div>
          </div>
          <button className="text-muted-foreground hover:text-foreground"><MessageSquare className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

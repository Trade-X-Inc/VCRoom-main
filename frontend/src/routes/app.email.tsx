import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, Copy, RotateCw } from "lucide-react";
import { useState } from "react";
export const Route = createFileRoute("/app/email")({
  component: EmailComposer,
});

const templates = [
  { k: "cold", label: "Cold outreach" },
  { k: "follow", label: "Follow-up" },
  { k: "update", label: "Investor update" },
  { k: "intro", label: "Warm intro reply" },
];

const sample = "";

function EmailComposer() {
  const [tab, setTab] = useState("cold");
  const [to, setTo] = useState("");
  const [body, setBody] = useState(sample);
  const [status, setStatus] = useState("");
  const sendInvite = () => {
    if (!to) { setStatus("Enter a recipient email first."); return; }
    const subject = encodeURIComponent("Hockystick — Invitation");
    const bodyEncoded = encodeURIComponent(body);
    window.open(`mailto:${to}?subject=${subject}&body=${bodyEncoded}`, "_blank");
    setStatus("Opened in your email client.");
  };
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-lg font-bold tracking-tight">AI Email Assistant</h1>
        <div className="text-sm text-muted-foreground">Drafts that sound like you. Approved by you.</div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-3">
          <div className="rounded-none border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Templates</div>
            <div className="mt-2 space-y-1">
              {templates.map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={`w-full text-left rounded-md px-2.5 py-2 text-sm transition-colors ${tab === t.k ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-none border border-border/60 bg-card p-4 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient</div>
            <div className="mt-3">
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="investor@firm.com" className="w-full rounded-md border border-border/60 bg-background/60 px-3 py-2 text-sm focus:outline-none focus:border-brand/50" />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Tone</div>
            <div className="mt-1.5 flex gap-1.5">
              {["Direct", "Warm", "Formal"].map((t, i) => (
                <button key={t} className={`flex-1 rounded-md border border-border/60 px-2 py-1.5 text-xs ${i === 0 ? "bg-accent" : "hover:bg-accent/60"}`}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-none border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-brand text-brand-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
            <div className="flex-1">
              <div className="text-sm font-medium">AI draft · Cold outreach</div>
              <div className="text-xs text-muted-foreground">Written in your voice based on your profile</div>
            </div>
            <button className="text-xs inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1.5 hover:bg-accent"><RotateCw className="h-3 w-3" /> Regenerate</button>
          </div>

          <div className="p-5 space-y-3">
            <div className="flex gap-2 text-sm items-center">
              <span className="text-muted-foreground w-16">To</span>
              <span className="font-medium text-sm">{to || <span className="text-muted-foreground italic">Enter recipient above</span>}</span>
            </div>
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground w-16">Subject</span>
              <span className="font-medium text-muted-foreground italic">AI-generated subject line</span>
            </div>
            <div className="border-t border-border/60 pt-4">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full min-h-[300px] resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between bg-gradient-soft">
            <div className="text-xs text-muted-foreground">Reading time: 28s · Tone: direct · Sentiment: confident</div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-2 text-sm hover:bg-accent"><Copy className="h-3.5 w-3.5" /> Copy</button>
              <button onClick={sendInvite} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Send className="h-3.5 w-3.5" /> Send</button>
            </div>
          </div>
          {status && <div className="px-5 pb-4 text-xs text-muted-foreground">{status}</div>}
        </div>
      </div>
    </div>
  );
}

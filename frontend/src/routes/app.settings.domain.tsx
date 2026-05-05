import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Mail, CheckCircle2, Copy, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings/domain")({
  component: DomainEmail,
});

interface Domain { name: string; verified: boolean; primary: boolean; }
const initial: Domain[] = [
  { name: "ventureroom.app", verified: true, primary: true },
];

function DomainEmail() {
  const [domains, setDomains] = useState<Domain[]>(initial);
  const [input, setInput] = useState("");
  const [emailFrom, setEmailFrom] = useState("notifications@atlas.ai");
  const [signed, setSigned] = useState(true);

  const addDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.match(/^[a-z0-9.-]+\.[a-z]{2,}$/i)) return;
    setDomains((d) => [...d, { name: input, verified: false, primary: false }]);
    setInput("");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card shadow-card p-5">
        <h2 className="text-sm font-semibold inline-flex items-center gap-2"><Globe className="h-4 w-4 text-brand" /> Custom domains</h2>
        <p className="text-xs text-muted-foreground mt-1">Connect your own domain to host deal rooms and outbound emails.</p>

        <form onSubmit={addDomain} className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="yourdomain.com" className="flex-1 rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
          <button className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow"><Plus className="h-4 w-4" /> Add domain</button>
        </form>

        <div className="mt-4 space-y-2">
          {domains.map((d) => (
            <div key={d.name} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{d.name}</span>
                {d.primary && <span className="text-[10px] rounded bg-brand/10 text-brand px-1.5 py-0.5">Primary</span>}
                <span className={cn("inline-flex items-center gap-1 text-[11px]", d.verified ? "text-success" : "text-warning")}>
                  {d.verified ? <><CheckCircle2 className="h-3 w-3" /> Verified</> : "Pending DNS"}
                </span>
              </div>
              <button onClick={() => setDomains((xs) => xs.filter((x) => x.name !== d.name))} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg bg-muted/40 border border-border/60 p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required DNS records</div>
          {[
            ["TXT", "@", "v=spf1 include:ventureroom.app ~all"],
            ["CNAME", "vr._domainkey", "vr-dkim.ventureroom.app"],
            ["MX", "@", "10 mx.ventureroom.app"],
          ].map(([t, host, val]) => (
            <div key={t + host} className="grid grid-cols-[60px_120px_1fr_auto] items-center gap-2 text-xs font-mono">
              <span className="font-semibold">{t}</span>
              <span className="text-muted-foreground truncate">{host}</span>
              <span className="truncate">{val}</span>
              <button onClick={() => navigator.clipboard.writeText(val as string)} className="p-1 text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card shadow-card p-5 space-y-3">
        <h2 className="text-sm font-semibold inline-flex items-center gap-2"><Mail className="h-4 w-4 text-brand" /> Email configuration</h2>
        <div>
          <label className="text-xs text-muted-foreground">Default "From" address</label>
          <input value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={signed} onChange={(e) => setSigned(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
          DKIM-sign all outbound messages
        </label>
      </section>
    </div>
  );
}

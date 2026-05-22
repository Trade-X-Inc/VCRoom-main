import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Key, Smartphone, AlertTriangle, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/settings/security")({
  component: Security,
});

function Security() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  const [twoFA, setTwoFA] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(true);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card shadow-card p-5 space-y-4">
        <h2 className="text-sm font-semibold inline-flex items-center gap-2"><Shield className="h-4 w-4 text-brand" /> Authentication</h2>
        <Row icon={Smartphone} title="Two-factor authentication" sub="Required for all admin actions.">
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </Row>
        <Row icon={Key} title="Auto-logout after 30 min inactivity" sub="Recommended for shared devices.">
          <Toggle checked={sessionTimeout} onChange={setSessionTimeout} />
        </Row>
      </section>

      <section className="rounded-xl border border-border/60 bg-card shadow-card p-5">
        <h2 className="text-sm font-semibold">Active sessions</h2>
        <div className="mt-3 divide-y divide-border/60">
          {[
            { dev: "MacBook Pro · Chrome", loc: "San Francisco, US", current: true },
            { dev: "iPhone 15 · Safari", loc: "San Francisco, US" },
          ].map((s) => (
            <div key={s.dev} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{s.dev} {s.current && <span className="text-[10px] rounded bg-brand/10 text-brand px-1.5 py-0.5 ml-1">This device</span>}</div>
                <div className="text-xs text-muted-foreground">{s.loc}</div>
              </div>
              {!s.current && <button className="text-xs text-muted-foreground hover:text-destructive">Revoke</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-sm font-semibold inline-flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Danger zone</h2>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Sign out of all devices</div>
            <div className="text-xs text-muted-foreground">Ends every active session.</div>
          </div>
          <button onClick={() => { signOut(); nav({ to: "/sign-in", search: { redirect: "/app" }, replace: true }); }} className="rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm hover:bg-destructive/10 inline-flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Sign out everywhere
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ icon: Icon, title, sub, children }: { icon: any; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-foreground/70 shrink-0"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-gradient-brand" : "bg-muted border border-border/60"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

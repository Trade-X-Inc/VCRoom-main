import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Check, Download } from "lucide-react";

export const Route = createFileRoute("/app/settings/billing")({
  component: Billing,
});

function Billing() {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card shadow-card p-5">
        <h2 className="text-sm font-semibold inline-flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand" /> Plan</h2>
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {[
            { name: "Starter", price: "Free", features: ["1 deal room", "5 documents", "Basic Q&A"] },
            { name: "Growth", price: "$49/mo", features: ["Unlimited rooms", "100 docs", "AI advisor"], current: true },
            { name: "Fund", price: "$199/mo", features: ["Unlimited rooms", "Custom domain", "API access"] },
          ].map((p) => (
            <div key={p.name} className={`rounded-xl border p-4 ${p.current ? "border-brand bg-brand/5" : "border-border/60"}`}>
              <div className="flex items-center justify-between">
                <div className="font-semibold">{p.name}</div>
                {p.current && <span className="text-[10px] rounded bg-brand/10 text-brand px-1.5 py-0.5">Current</span>}
              </div>
              <div className="text-xl font-semibold mt-1">{p.price}</div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {p.features.map((f) => <li key={f} className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> {f}</li>)}
              </ul>
              <button className={`mt-4 w-full rounded-md py-2 text-sm ${p.current ? "border border-border/60" : "bg-gradient-brand text-brand-foreground shadow-glow"}`}>{p.current ? "Manage" : "Upgrade"}</button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card shadow-card p-5">
        <h2 className="text-sm font-semibold">Invoices</h2>
        <div className="mt-3 divide-y divide-border/60">
          {["May 2026", "Apr 2026", "Mar 2026"].map((m) => (
            <div key={m} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{m}</div>
                <div className="text-xs text-muted-foreground">$49.00 · Paid</div>
              </div>
              <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Download className="h-3.5 w-3.5" /> PDF</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

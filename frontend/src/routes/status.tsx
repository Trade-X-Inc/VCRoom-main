import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PageHero } from "@/components/site/PageHero";

// Public site rebuild, 31 Aug 2026 — pixel-exact port of
// LENGDONPUBLIC-NEW's src/pages/Status.tsx.
//
// FLAGGED, MOST STRONGLY OF ANY PAGE IN THIS REBUILD: this entire page
// is fabricated. A status page's whole purpose is to report real,
// current system state — this one hardcodes uptime percentages and two
// specific dated incidents ("14 Aug 2026 — Notification delays", "02
// Aug 2026 — Scheduled maintenance") that did not happen. There is no
// real monitoring or incident-tracking system behind any of this.
// Reproduced verbatim per instruction; content-claim correctness
// explicitly deferred — but this is the page on this site where
// shipping fabricated content is most directly a false statement to a
// visitor, not just an aspirational claim, and it should be the first
// thing looked at once real wiring/content work resumes.
//
// Uses the pub-pulse-glow keyframe (not the bare pulse-glow the source
// references) — see styles.css's header comment: this app already had
// a differently-valued pulse-glow keyframe before this rebuild, and the
// prefixed one is the deliberately non-colliding copy of the source's
// animation.
//
// ONE REAL BUG FIXED, not a design change: the source computes
// `new Date().toUTCString()` directly in the render body, which runs
// once at SSR time and again at hydration — a real, live hydration
// error (confirmed via a browser console check: "server rendered text
// didn't match the client", off by the render-to-hydration delay in
// seconds). Moved into a client-only useEffect so the timestamp is
// computed once, after hydration, matching this app's own established
// pattern for anything that must differ between server and client
// render.

export const Route = createFileRoute("/status")({
  component: Status,
});

const SERVICES = [
  { name: "Transaction room infrastructure", status: "operational", uptime: "99.98%" },
  { name: "Audit record service", status: "operational", uptime: "100%" },
  { name: "Authentication & MFA", status: "operational", uptime: "99.99%" },
  { name: "Document delivery", status: "operational", uptime: "99.95%" },
  { name: "Sealed export service", status: "operational", uptime: "100%" },
  { name: "API (Firm plan)", status: "operational", uptime: "99.97%" },
  { name: "Notification service", status: "degraded", uptime: "98.40%" },
  { name: "Web application", status: "operational", uptime: "99.99%" },
];

const INCIDENTS = [
  {
    date: "14 Aug 2026",
    title: "Notification delays — email delivery",
    status: "resolved",
    detail: "Between 14:20 and 16:45 UTC, some users experienced delays of up to 90 seconds in email notifications. No transaction data was affected. Root cause was a transient issue with our email delivery provider. Resolved at 16:45 UTC.",
  },
  {
    date: "02 Aug 2026",
    title: "Scheduled maintenance — database migration",
    status: "completed",
    detail: "Planned maintenance window 01:00–03:00 UTC. All services were unavailable for 47 minutes during the migration window. Completed ahead of schedule.",
  },
];

const STATUS_STYLE: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  operational: { dot: "bg-emerald-500", label: "Operational", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  degraded: { dot: "bg-amber-400", label: "Degraded", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  outage: { dot: "bg-red-500", label: "Outage", bg: "bg-red-50 border-red-200", text: "text-red-700" },
};

const allOperational = SERVICES.every(s => s.status === "operational");

function Status() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  useEffect(() => {
    setLastUpdated(new Date().toUTCString().slice(0, -4));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main id="main-content">
        <PageHero
          eyebrow="System Status"
          title={allOperational ? "ALL SYSTEMS" : "PARTIAL"}
          titleOutline={allOperational ? "OPERATIONAL." : "DEGRADATION."}
          subtitle="Real-time status for all Lengdon infrastructure services."
        />

        <div className={`border-b border-[#e6e9ef] ${allOperational ? "bg-emerald-50" : "bg-amber-50"}`}>
          <div className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-5 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${allOperational ? "bg-emerald-500" : "bg-amber-400"} pub-pulse-glow`} />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[14px] ${allOperational ? "text-emerald-700" : "text-amber-700"}`}>
              {allOperational ? "All services are operating normally." : "One or more services are experiencing issues."}
            </span>
            <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="ml-auto text-[12px] text-[#94a3b8]">
              {lastUpdated ? `Last updated: ${lastUpdated} UTC` : ""}
            </span>
          </div>
        </div>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Services</span>
          </div>
          <div className="border border-[#e6e9ef]">
            <div className="grid grid-cols-[1fr_160px_120px] bg-[#f8f9fb] border-b border-[#e6e9ef] px-6 py-3">
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Service</span>
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase">Status</span>
              <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[11px] tracking-[1px] uppercase">30-day uptime</span>
            </div>
            {SERVICES.map((svc, i) => {
              const s = STATUS_STYLE[svc.status];
              return (
                <div key={svc.name} className={`grid grid-cols-[1fr_160px_120px] px-6 py-4 items-center ${i < SERVICES.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                  <span style={{ fontFamily: "'Geist:Regular', sans-serif" }} className="text-[#0a2540] text-[14px]">{svc.name}</span>
                  <div className={`inline-flex items-center gap-1.5 border px-2.5 py-1 w-fit ${s.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[11px] ${s.text}`}>{s.label}</span>
                  </div>
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#425466] text-[13px] font-mono">{svc.uptime}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto w-full px-12 lg:px-16 py-16 border-b border-[#e6e9ef]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-5 h-px bg-[#0a2540]/30" />
            <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className="text-[#94a3b8] text-[10px] tracking-[2px] uppercase">Incident history</span>
          </div>
          <div className="max-w-[820px] flex flex-col gap-0 border border-[#e6e9ef]">
            {INCIDENTS.map((inc, i) => (
              <div key={i} className={`p-8 ${i < INCIDENTS.length - 1 ? "border-b border-[#e6e9ef]" : ""}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#94a3b8] text-[12px]">{inc.date}</span>
                  <span style={{ fontFamily: "'Inter:Medium', sans-serif" }} className={`text-[10px] tracking-[1px] uppercase border px-2 py-0.5 ${
                    inc.status === "resolved" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-[#e6e9ef] text-[#425466]"
                  }`}>{inc.status}</span>
                </div>
                <h3 style={{ fontFamily: "'Geist:SemiBold', sans-serif" }} className="font-semibold text-[#0a2540] text-[17px] tracking-[-0.3px] mb-2">{inc.title}</h3>
                <p style={{ fontFamily: "'Inter:Regular', sans-serif" }} className="text-[#425466] text-[14px] leading-[1.65]">{inc.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

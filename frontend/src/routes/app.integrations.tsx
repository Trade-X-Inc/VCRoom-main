import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Lock, CheckCircle, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/integrations")({
  beforeLoad: () => { throw redirect({ to: "/app/settings" }); },
  head: () => ({ meta: [{ title: "Integrations — Hockystick" }] }),
  component: Integrations,
});

const COMING_SOON = [
  { name: "Salesforce", slug: "salesforce", desc: "Enterprise CRM sync for fund management", color: "from-blue-600 to-cyan-600", waiting: 189 },
  { name: "Notion", slug: "notion", desc: "Export deal notes and DD reports to Notion", color: "from-gray-700 to-gray-900", waiting: 412 },
  { name: "Slack", slug: "slack", desc: "Get deal room notifications in Slack", color: "from-purple-600 to-indigo-600", waiting: 567 },
  { name: "Zapier", slug: "zapier", desc: "Connect Hockystick to 5,000+ apps", color: "from-orange-500 to-yellow-500", waiting: 321 },
  { name: "Linear", slug: "linear", desc: "Create tasks from deal room action items", color: "from-blue-500 to-purple-600", waiting: 156 },
];

const LIVE = [
  { abbr: "HS", name: "HubSpot CRM", sub: "Contacts sync", desc: "Contacts and signups sync automatically to HubSpot CRM.", color: "from-orange-600 to-red-600" },
  { abbr: "GC", name: "Google Calendar", sub: "Meetings sync", desc: "Deal room meetings sync automatically to Google Calendar.", color: "from-blue-600 to-red-600" },
  { abbr: "EM", name: "Email Notifications", sub: "Via Resend", desc: "Instant email alerts for important deal room updates.", color: "from-purple-600 to-indigo-600" },
  { abbr: "DW", name: "Document Watermarking", sub: "Automatic", desc: "All documents are watermarked with recipient info for security.", color: "from-amber-600 to-orange-600" },
];

function Integrations() {
  const { user } = useAuth();
  const [notifying, setNotifying] = useState<string | null>(null);
  const [notified, setNotified] = useState<Set<string>>(new Set());

  const handleNotify = async (slug: string, name: string) => {
    if (!user?.email) { toast.error("Email not found"); return; }
    setNotifying(slug);
    try {
      await supabase.from("waitlist_entries").insert({
        full_name: user.full_name || "",
        email: user.email,
        role: user.role,
        problem: `Integration notification: ${name}`,
      });
      toast.success(`We'll notify you when ${name} launches.`);
      setNotified((s) => new Set(s).add(slug));
    } catch (err) {
      toast.error((err as any).message || "Failed to save");
    } finally {
      setNotifying(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Syne, sans-serif" }}>
          Integrations
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Connect Hockystick with your existing tools.</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Live now</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {LIVE.map((item) => (
            <div key={item.name} className="rounded-xl border border-border/60 bg-card shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {item.abbr}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{item.name}</div>
                  <div className="text-[11px] text-muted-foreground">{item.sub}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-green-600 mb-2">
                <CheckCircle className="h-3.5 w-3.5" /> Active
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Coming Q3 2026</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMING_SOON.map((item) => (
            <div key={item.slug} className="rounded-xl border border-border/60 bg-card shadow-sm p-5 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold text-foreground">{item.name}</div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-2 py-0.5">
                  <Lock className="h-3 w-3" /> Q3
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{item.desc}</p>
              {notified.has(item.slug) ? (
                <p className="text-xs text-[#7C3AED] font-medium text-center">You'll be notified.</p>
              ) : (
                <button onClick={() => handleNotify(item.slug, item.name)} disabled={notifying === item.slug}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#7C3AED]/40 text-[#7C3AED] px-3 py-2 text-xs font-semibold hover:bg-[#7C3AED]/5 transition-colors disabled:opacity-50">
                  <Bell className="h-3.5 w-3.5" />
                  {notifying === item.slug ? "Saving..." : "Notify me"}
                </button>
              )}
              <p className="text-[10px] text-muted-foreground text-center mt-2">{item.waiting} waiting</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#7C3AED]/20 bg-gradient-to-br from-purple-950/10 to-indigo-950/10 p-7">
        <h2 className="text-base font-semibold mb-2" style={{ fontFamily: "Syne, sans-serif" }}>API Access</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Build custom integrations with our REST API. Available on the Fund plan ($199/mo).
        </p>
        <a href="mailto:hello@hockystick.app"
          className="inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] text-white px-4 py-2 text-sm font-semibold hover:bg-[#6d28d9] transition-colors">
          Contact us
        </a>
      </div>
    </div>
  );
}

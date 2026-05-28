import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Lock, CheckCircle, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/integrations")({
  head: () => ({
    meta: [{ title: "Integrations — Hockystick" }],
  }),
  beforeLoad: async ({ context }) => {
    if (!context.user?.id) {
      throw new Error("Unauthorized");
    }
  },
  component: Integrations,
});

interface ComingSoonIntegration {
  name: string;
  slug: string;
  description: string;
  color: string;
  waiting?: number;
}

const comingSoonIntegrations: ComingSoonIntegration[] = [
  {
    name: "HubSpot CRM",
    slug: "hubspot",
    description: "Sync your VC pipeline with HubSpot contacts",
    color: "from-orange-600 to-red-600",
    waiting: 234,
  },
  {
    name: "Salesforce",
    slug: "salesforce",
    description: "Enterprise CRM sync for fund management",
    color: "from-blue-600 to-cyan-600",
    waiting: 189,
  },
  {
    name: "Notion",
    slug: "notion",
    description: "Export deal notes and DD reports to Notion",
    color: "from-gray-700 to-gray-900",
    waiting: 412,
  },
  {
    name: "Slack",
    slug: "slack",
    description: "Get deal room notifications in Slack",
    color: "from-purple-600 to-indigo-600",
    waiting: 567,
  },
  {
    name: "Zapier",
    slug: "zapier",
    description: "Connect Hockystick to 5,000+ apps",
    color: "from-orange-500 to-yellow-500",
    waiting: 321,
  },
  {
    name: "Linear",
    slug: "linear",
    description: "Create tasks from deal room action items",
    color: "from-blue-500 to-purple-600",
    waiting: 156,
  },
];

function Integrations() {
  const { user } = useAuth();
  const [notifyingIntegration, setNotifyingIntegration] = useState<string | null>(null);

  const handleNotifyMe = async (integration: ComingSoonIntegration) => {
    if (!user?.email) {
      toast.error("Email not found");
      return;
    }

    setNotifyingIntegration(integration.slug);

    try {
      const { error } = await supabase.from("waitlist_entries").insert({
        full_name: user.full_name || "",
        email: user.email,
        role: user.role,
        company: "",
        problem: `Integration notification: ${integration.name}`,
        referral_code: `integration-${integration.slug}`,
      });

      if (error) throw error;

      toast.success(`You'll be notified when ${integration.name} launches!`);
    } catch (err) {
      toast.error((err as any).message || "Failed to save notification");
    } finally {
      setNotifyingIntegration(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Connect Hockystick with your existing tools
        </p>
      </div>

      {/* Section 1: Available Now */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available now</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Google Calendar */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-red-600 flex items-center justify-center text-white font-semibold text-sm">
                GC
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Google Calendar</h3>
                <p className="text-xs text-muted-foreground">Meetings sync</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-400 mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>Connected</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Your deal room meetings sync automatically to Google Calendar.
            </p>
          </div>

          {/* Email Notifications */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                EN
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Email Notifications</h3>
                <p className="text-xs text-muted-foreground">Via Resend</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-400 mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>Active</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Get instant email alerts for important deal room updates.
            </p>
          </div>

          {/* Document Watermarking */}
          <div className="bg-card border border-border/60 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                DW
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Document Watermarking</h3>
                <p className="text-xs text-muted-foreground">Automatic</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-400 mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>Active</span>
            </div>

            <p className="text-sm text-muted-foreground">
              All documents are watermarked with recipient info for security.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Coming Soon */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Coming soon</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {comingSoonIntegrations.map((integration) => (
            <div
              key={integration.slug}
              className="bg-card border border-border/60 rounded-xl p-6 opacity-75"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`h-10 w-10 rounded-lg bg-gradient-to-br ${integration.color} flex items-center justify-center text-white font-semibold text-sm`}
                  >
                    {integration.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{integration.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background rounded px-2 py-1">
                  <Lock className="h-3 w-3" />
                  Q3 2026
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {integration.description}
              </p>

              <Button
                onClick={() => handleNotifyMe(integration)}
                disabled={notifyingIntegration === integration.slug}
                variant="outline"
                size="sm"
                className="w-full gap-2 mb-3"
              >
                <Bell className="h-3.5 w-3.5" />
                {notifyingIntegration === integration.slug
                  ? "Saving..."
                  : "Notify me"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {integration.waiting || 0} waiting
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: API Access */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Build your own</h2>
        <div className="bg-gradient-to-br from-purple-950/30 to-indigo-950/30 border border-purple-500/20 rounded-xl p-8">
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold mb-3">API Access</h3>
            <p className="text-muted-foreground mb-6">
              Build custom integrations with our REST API. Connect Hockystick to your proprietary systems, data warehouses, and internal tools.
            </p>

            <div className="bg-background/50 border border-purple-500/10 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">
                🔑 Full API documentation available with our <span className="font-semibold text-foreground">Fund plan ($199/mo)</span>
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              Questions? Reach out to{" "}
              <a
                href="mailto:hello@hockystick.app"
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                hello@hockystick.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

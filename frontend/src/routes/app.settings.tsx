import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Globe, Bell, CreditCard, Shield, Building2, User, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/settings")({
  component: SettingsLayout,
});

const tabs = [
  { to: "/app/settings", label: "General", icon: Building2, exact: true },
  { to: "/app/settings/domain", label: "Domain & Email", icon: Globe },
  { to: "/app/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/app/settings/billing", label: "Billing", icon: CreditCard },
  { to: "/app/settings/security", label: "Security", icon: Shield },
];

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = path === "/app/settings";

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>
      <p className="text-sm text-muted-foreground mt-1">Manage workspace, domain, notifications, billing and security.</p>

      <div className="mt-6 grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to as any}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <t.icon className={cn("h-4 w-4", active && "text-brand")} /> {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0">
          {isIndex ? <General /> : <Outlet />}
        </div>
      </div>
    </div>
  );
}

function General() {
  const { user } = useAuth();
  const isInvestor = user?.role === "investor";
  const [workspaceName, setWorkspaceName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: startup } = useQuery({
    queryKey: ["startup", user?.id],
    enabled: !!user?.id && !isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("startups")
        .select("id, company_name, website, description")
        .eq("founder_id", user!.id);
      return data?.[0] ?? null;
    },
  });

  const { data: investorProfile } = useQuery({
    queryKey: ["investor-profile-settings", user?.id],
    enabled: !!user?.id && isInvestor,
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_profiles")
        .select("id, fund_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (isInvestor) {
      setWorkspaceName(investorProfile?.fund_name ?? user?.fullName ?? "");
    } else {
      setWorkspaceName(startup?.company_name ?? user?.workspace ?? "");
    }
  }, [startup, investorProfile, isInvestor, user]);

  const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function handleSave() {
    if (!user?.id || !workspaceName.trim()) return;
    setSaving(true);
    try {
      if (isInvestor) {
        await supabase.from("investor_profiles").update({ fund_name: workspaceName.trim() }).eq("user_id", user.id);
      } else {
        await supabase.from("startups").update({ company_name: workspaceName.trim() }).eq("founder_id", user.id);
      }
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Workspace">
        <div>
          <label className="text-xs text-muted-foreground">Workspace name</label>
          <div className="mt-1 flex items-center rounded-md border border-border/60 bg-background overflow-hidden">
            <input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Your company name"
              className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
            />
          </div>
        </div>
        <Field label="Public URL slug" value={slug} prefix="ventureroom.app/" placeholder="your-company" />
        <Sel label="Default language" options={["English", "Español", "Français", "Deutsch", "العربية"]} />
        <Sel label="Time zone" options={["UTC", "America/Los_Angeles", "America/New_York", "Europe/London", "Asia/Dubai"]} />
      </Card>

      <Card title="Account">
        <div className="space-y-2">
          <Link
            to="/app/profile"
            className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Edit profile</span>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>
          <Link
            to="/app/users"
            className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 text-sm hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Team & users</span>
            </div>
            <span className="text-xs text-muted-foreground">→</span>
          </Link>
        </div>
        <div className="pt-2 border-t border-border/60 mt-2">
          <button
            disabled
            title="Contact support to delete your account"
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-destructive/40 cursor-not-allowed w-full"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete account</span>
            <span className="ml-auto text-[10px] text-muted-foreground/60">Contact support</span>
          </button>
        </div>
      </Card>

      <SaveBar onSave={handleSave} saving={saving} />
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-card p-5 space-y-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  defaultValue,
  prefix,
  placeholder,
}: {
  label: string;
  value?: string;
  defaultValue?: string;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center rounded-md border border-border/60 bg-background overflow-hidden">
        {prefix && (
          <span className="text-xs text-muted-foreground px-3 border-r border-border/60 bg-muted/30 py-2">{prefix}</span>
        )}
        <input
          defaultValue={value ?? defaultValue ?? ""}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
        />
      </div>
    </div>
  );
}

export function Sel({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <select className="mt-1 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function SaveBar({ onSave, saving }: { onSave?: () => void; saving?: boolean }) {
  return (
    <div className="flex justify-end gap-2">
      <button className="rounded-md border border-border/60 px-4 py-2 text-sm hover:bg-accent">Reset</button>
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-md bg-gradient-brand text-brand-foreground px-4 py-2 text-sm shadow-glow disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Settings, Bell, Shield, HelpCircle, Info } from "lucide-react";
import { InvestorHelpGuide, AboutSection } from "@/components/app/HelpGuide";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/investor/settings")({
  component: InvestorSettingsPage,
});

interface EmailPrefs {
  thesis_match: boolean;
  deal_activity: boolean;
  access_updates: boolean;
  product_news: boolean;
}

const DEFAULT_PREFS: EmailPrefs = {
  thesis_match: true,
  deal_activity: true,
  access_updates: true,
  product_news: false,
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        background: on ? "var(--gradient-brand)" : "var(--accent)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "18px" : "2px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function PrefRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "16px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#ffffff", marginBottom: "2px" }}>
          {label}
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
      <Toggle on={value} onChange={onChange} />
    </div>
  );
}

const sidebarTabs = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "help", label: "How to use", icon: HelpCircle },
  { id: "about", label: "About", icon: Info },
];

function InvestorSettingsPage() {
  const search = useSearch({ strict: false }) as { tab?: string };
  const [activeTab, setActiveTab] = useState<string>(
    search?.tab === "help" ? "help" : search?.tab === "about" ? "about" : "notifications"
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-brand" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Left sidebar */}
        <nav className="w-[200px] shrink-0 space-y-1">
          {sidebarTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              data-testid={`settings-tab-${t.id}`}
              className={cn(
                "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                activeTab === t.id
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              <t.icon className={cn("h-4 w-4", activeTab === t.id && "text-brand")} />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div className="flex-1 min-w-0">
          {activeTab === "notifications" && <InvestorNotificationsPanel />}
          {activeTab === "security" && <InvestorSecurityPanel />}
          {activeTab === "help" && <InvestorHelpGuide />}
          {activeTab === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function InvestorNotificationsPanel() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<EmailPrefs>(DEFAULT_PREFS);
  const [loadedPrefs, setLoadedPrefs] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("investor_profiles")
      .select("email_preferences")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.email_preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...data.email_preferences });
        }
        setLoadedPrefs(true);
      });
  }, [user?.id]);

  const handlePrefChange = (key: keyof EmailPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("investor_profiles")
        .update({ email_preferences: next })
        .eq("user_id", user.id);
      if (error) {
        toast.error("Could not save preferences");
      } else {
        toast.success("Saved");
      }
    }, 500);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Email preferences</h2>
        <p className="text-sm text-muted-foreground mb-4">Control which emails Hockystick sends you.</p>

        {!loadedPrefs ? (
          <div className="text-sm text-muted-foreground py-4">Loading…</div>
        ) : (
          <div className="divide-y divide-border/40">
            <PrefRow
              label="New startup matches"
              description="Get emailed when a founder matching your investment thesis joins Hockystick."
              value={prefs.thesis_match}
              onChange={(v) => handlePrefChange("thesis_match", v)}
            />
            <PrefRow
              label="Deal room updates"
              description="Get emailed when a founder adds documents or activity to a shared deal room."
              value={prefs.deal_activity}
              onChange={(v) => handlePrefChange("deal_activity", v)}
            />
            <PrefRow
              label="Profile access updates"
              description="Get emailed when a founder approves or declines your profile access request."
              value={prefs.access_updates}
              onChange={(v) => handlePrefChange("access_updates", v)}
            />
            <PrefRow
              label="Product news"
              description="Occasional updates about new Hockystick features."
              value={prefs.product_news}
              onChange={(v) => handlePrefChange("product_news", v)}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function InvestorSecurityPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("investor_profiles")
        .update({ deletion_requested_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Deletion requested. Your account will be removed within 24 hours.");
      navigate({ to: "/sign-in" as any });
    } catch {
      toast.error("Could not process deletion request. Contact support@hockystick.app");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border/60 bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Account</h2>

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40 mb-4">
          <div>
            <div className="text-sm font-medium text-foreground mb-0.5">Email address</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
          <div className="text-xs text-muted-foreground text-right max-w-[180px] leading-relaxed">
            To change your email, contact{" "}
            <a href="mailto:support@hockystick.app" className="text-brand hover:text-brand/80">
              support@hockystick.app
            </a>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-foreground mb-0.5">Delete account</div>
            <div className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Permanently remove your investor profile and all associated data. This cannot be undone.
            </div>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Delete account
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-card border border-border/60 rounded-2xl p-7 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-10 w-10 rounded-full bg-red-500/10 grid place-items-center mb-4">
              <span className="text-red-400 text-lg">⚠</span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Are you sure?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              This will permanently delete your investor profile, deal room memberships, and all saved data.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {deleting ? "Processing…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/app/settings/notifications")({
  component: NotificationsSettings,
});

interface NotifPrefs {
  deal_room_view: boolean;
  new_message: boolean;
  document_comment: boolean;
  weekly_digest: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  deal_room_view: true,
  new_message: true,
  document_comment: true,
  weekly_digest: true,
};

const PREFS_CONFIG: { key: keyof NotifPrefs; label: string; description: string }[] = [
  {
    key: "deal_room_view",
    label: "Investor viewed my deal room",
    description: "Get notified when an investor opens your deal room for the first time.",
  },
  {
    key: "new_message",
    label: "New message received",
    description: "Email alerts for new team messages and investor Q&A replies.",
  },
  {
    key: "document_comment",
    label: "Document activity",
    description: "Alerts when investors download or comment on your documents.",
  },
  {
    key: "weekly_digest",
    label: "Weekly activity digest",
    description: "A Monday morning summary of your round progress and investor activity.",
  },
];

function NotificationsSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  const { data: userRow, isLoading } = useQuery({
    queryKey: ["settings-notif-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("notification_prefs")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (userRow?.notification_prefs) {
      setPrefs({ ...DEFAULT_PREFS, ...(userRow.notification_prefs as Partial<NotifPrefs>) });
    }
  }, [userRow]);

  const toggle = (key: keyof NotifPrefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ notification_prefs: prefs, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["settings-notif-prefs"] });
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="rounded-none border border-border/60 bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold">Email notifications</h2>
      </div>

      <div className="space-y-1 divide-y divide-border/60">
        {PREFS_CONFIG.map(({ key, label, description }) => (
          <label key={key} className="flex items-start gap-3 py-3.5 cursor-pointer group">
            <div className="mt-0.5 relative">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => toggle(key)}
                className="sr-only peer"
              />
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                prefs[key] ? "hs-gradient border-brand" : "border-border/60 bg-background group-hover:border-brand/40"
              }`}>
                {prefs[key] && (
                  <svg className="h-2.5 w-2.5 text-brand-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end pt-1 border-t border-border/60">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md hs-gradient text-brand-foreground px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save preferences
        </button>
      </div>
    </section>
  );
}

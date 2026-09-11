import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LcsButton } from "@/components/lcs";

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
      <div className="flex items-center justify-center py-16" style={{ color: "var(--lcs-ink-muted)" }}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="border p-5 flex flex-col gap-5" style={{ borderColor: "var(--lcs-line)" }}>
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" style={{ color: "var(--lcs-accent)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>Email notifications</h2>
      </div>

      <div className="flex flex-col">
        {PREFS_CONFIG.map(({ key, label, description }, i) => (
          <label
            key={key}
            className="flex items-start gap-3 py-3.5 cursor-pointer"
            style={{ borderTop: i > 0 ? "1px solid var(--lcs-line)" : undefined }}
          >
            <div className="mt-0.5">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={() => toggle(key)}
                className="sr-only"
              />
              <div
                className="h-4 w-4 flex items-center justify-center transition-colors"
                style={{
                  border: `1.5px solid ${prefs[key] ? "var(--lcs-accent)" : "var(--lcs-line)"}`,
                  background: prefs[key] ? "var(--lcs-accent)" : "var(--lcs-white)",
                }}
              >
                {prefs[key] && (
                  <svg className="h-2.5 w-2.5" style={{ color: "var(--lcs-white)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: "var(--lcs-ink)", fontFamily: "var(--font-lcs-ui)" }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--lcs-ink-muted)", fontFamily: "var(--font-lcs-ui)" }}>{description}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex justify-end pt-1" style={{ borderTop: "1px solid var(--lcs-line)" }}>
        <LcsButton variant="primary" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save preferences
        </LcsButton>
      </div>
    </section>
  );
}

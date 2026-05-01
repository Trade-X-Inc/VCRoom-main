import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState } from "react";
import { notifRulesDefault, type NotifRule } from "@/lib/mock";
import { Bell, Mail, Smartphone, Save, Briefcase, FileText, MessageSquare, UserPlus, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/settings/notifications")({
  component: () => <AppShell><NotifRulesPage /></AppShell>,
});

const groupIcon: Record<NotifRule["group"], any> = {
  "Deal activity": Briefcase,
  "Documents": FileText,
  "Messages": MessageSquare,
  "Team & invites": UserPlus,
  "AI insights": Sparkles,
};

function NotifRulesPage() {
  const { t } = useI18n();
  const [rules, setRules] = useState<NotifRule[]>(notifRulesDefault);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const update = (id: string, key: "email" | "inApp" | "push", value: boolean) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const groups = Array.from(new Set(rules.map((r) => r.group))) as NotifRule["group"][];

  const save = () => {
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">{t("rules.title")}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("rules.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-success">Saved at {savedAt}</span>}
          <button onClick={save} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-brand text-brand-foreground px-3 py-2 text-sm shadow-glow">
            <Save className="h-4 w-4" /> {t("common.save")}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div className="col-span-6">{t("rules.events")}</div>
          <div className="col-span-2 text-center inline-flex items-center justify-center gap-1"><Mail className="h-3.5 w-3.5" />{t("rules.email")}</div>
          <div className="col-span-2 text-center inline-flex items-center justify-center gap-1"><Bell className="h-3.5 w-3.5" />{t("rules.inApp")}</div>
          <div className="col-span-2 text-center inline-flex items-center justify-center gap-1"><Smartphone className="h-3.5 w-3.5" />{t("rules.push")}</div>
        </div>
        {groups.map((g) => {
          const Icon = groupIcon[g];
          return (
            <div key={g}>
              <div className="px-5 py-2.5 bg-muted/40 border-b border-border/60 flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {g}
              </div>
              {rules.filter((r) => r.group === g).map((r) => (
                <div key={r.id} className="grid grid-cols-12 items-center px-5 py-3.5 border-b border-border/60 last:border-0 hover:bg-accent/30 transition-colors">
                  <div className="col-span-6">
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                  </div>
                  {(["email", "inApp", "push"] as const).map((k) => (
                    <div key={k} className="col-span-2 flex justify-center">
                      <Toggle checked={r[k]} onChange={(v) => update(r.id, k, v)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        checked ? "bg-gradient-brand" : "bg-muted border border-border/60"
      )}
    >
      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

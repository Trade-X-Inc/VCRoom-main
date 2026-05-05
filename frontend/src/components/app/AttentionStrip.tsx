import { useState } from "react";
import { AlertCircle, Clock, Info, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttentionItem {
  id: string;
  level: "urgent" | "soon" | "info";
  icon?: any;
  title: string;
  href?: string;
}

const tone = {
  urgent: { border: "border-l-destructive", icon: AlertCircle, color: "text-destructive" },
  soon: { border: "border-l-warning", icon: Clock, color: "text-warning" },
  info: { border: "border-l-brand", icon: Info, color: "text-brand" },
};

export function AttentionStrip({ items, onAct }: { items: AttentionItem[]; onAct?: (id: string) => void }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = items.filter((i) => !dismissed.includes(i.id));

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 px-5 py-4 flex items-center gap-3 text-sm">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <span className="font-medium text-success">You're all caught up ✓</span>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {visible.map((item) => {
        const t = tone[item.level];
        const Icon = item.icon ?? t.icon;
        return (
          <div
            key={item.id}
            className={cn(
              "snap-start min-w-[300px] max-w-[340px] rounded-2xl border border-border/60 bg-card shadow-card p-4 border-l-4 flex flex-col gap-3",
              t.border
            )}
          >
            <div className="flex items-start gap-2.5">
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", t.color)} />
              <div className="text-sm leading-snug">{item.title}</div>
            </div>
            <div className="mt-auto flex justify-end">
              <button
                onClick={() => { onAct?.(item.id); setDismissed((d) => [...d, item.id]); }}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                Act now <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

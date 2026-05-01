import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AIChat } from "@/components/ai/AIChat";

export const Route = createFileRoute("/app/advisor")({
  component: Advisor,
});

function Advisor() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 lg:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow"><Sparkles className="h-4 w-4" /></div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">AI Advisor</h1>
            <div className="text-xs text-muted-foreground">Strategic assistant trained on fundraising, term sheets & diligence.</div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <AIChat
          starters={[
            "What should I focus on this week?",
            "Draft an update email for stalled investors.",
            "Explain the term sheet Bessemer is likely to offer.",
            "What's missing from my data room before partner meetings?",
          ]}
        />
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/solutions/investor-pipeline")({
  head: () => ({
    meta: [
      { title: "Investor Pipeline Management Tool — Venture Room" },
      { name: "description", content: "Manage every investor relationship across the full lifecycle of your raise." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="Pipeline"
      title="Every investor. Every stage. One view."
      sub="A purpose-built pipeline for the way fundraises actually work — with AI follow-ups, intro tracking, and stage analytics."
      Icon={TrendingUp}
      features={[
        ["Multi-stage kanban", "Drag, drop, decide. Stages tuned for fundraising."],
        ["Auto-nudge", "AI nags the right investor at the right time, in your voice."],
        ["Conversion analytics", "See where deals stall and where to double down."],
      ]}
    />
  ),
});

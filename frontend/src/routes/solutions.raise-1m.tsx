import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/solutions/raise-1m")({
  head: () => ({
    meta: [
      { title: "Raise Your First $1M — Hockeystick" },
      { name: "description", content: "The complete playbook and platform to raise your first million." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="First raise"
      title="Raise your first $1M."
      sub="Templates, target lists, AI cold emails, and a deal room ready to go. Built for the founder raising for the first time."
      Icon={Sparkles}
      features={[
        ["Investor target lists", "AI-curated based on your stage, sector, and geography."],
        ["Cold email templates", "Battle-tested by founders who actually raised."],
        ["Closing kit", "SAFE templates, NDA, data room — included."],
      ]}
    />
  ),
});

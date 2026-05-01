import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { ListChecks } from "lucide-react";

export const Route = createFileRoute("/solutions/due-diligence")({
  head: () => ({
    meta: [
      { title: "Startup Due Diligence Platform — Venture Room" },
      { name: "description", content: "Templated due diligence across legal, financial, technical, and market." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="Due Diligence"
      title="Diligence, structured."
      sub="Templated checklists across legal, financial, technical, and market — so nothing gets missed and decisions get made faster."
      Icon={ListChecks}
      features={[
        ["Smart templates", "Stage-specific checklists curated by top operators and counsel."],
        ["Live progress", "See completion %, owner, and status across every workstream."],
        ["Audit-ready exports", "Generate a complete diligence packet in one click."],
      ]}
    />
  ),
});

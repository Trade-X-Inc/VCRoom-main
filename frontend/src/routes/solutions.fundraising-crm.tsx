import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { Layers } from "lucide-react";

export const Route = createFileRoute("/solutions/fundraising-crm")({
  head: () => ({
    meta: [
      { title: "Fundraising CRM for Startups — Venture Room" },
      { name: "description", content: "The fundraising CRM built for startups. Pipeline, AI email, follow-ups, and analytics." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="Fundraising CRM"
      title="The CRM built for raising capital."
      sub="Salesforce wasn't built for raising a Series A. Venture Room is. Pipeline, outreach, and follow-ups designed for fundraising."
      Icon={Layers}
      features={[
        ["Investor-aware pipeline", "Stages that match how raises actually work — from intro to term sheet."],
        ["Inbox-native", "Two-way email sync. Replies update the stage automatically."],
        ["Founder analytics", "Reply rate, meeting conversion, time-in-stage — across the whole raise."],
      ]}
    />
  ),
});

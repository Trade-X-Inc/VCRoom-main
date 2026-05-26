import { createFileRoute } from "@tanstack/react-router";
import { SolutionPage } from "@/components/site/SolutionPage";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/investors")({
  head: () => ({
    meta: [
      { title: "For Investors — Hockystick" },
      { name: "description", content: "Evaluate, diligence, and decide. The structured deal room investors actually use." },
    ],
  }),
  component: () => (
    <SolutionPage
      eyebrow="For Investors"
      title="Decide faster. With more clarity."
      sub="Bring every deal into one structured environment. AI summarizes risk. Your team sees status at a glance."
      Icon={Briefcase}
      features={[
        ["Deal pipeline", "All sourced deals, scored and stage-tagged. Filters for sector, stage, geography."],
        ["AI risk analysis", "Auto-summarized red flags, key metrics, and competitive context per deal."],
        ["Decision board", "Accept, reject, hold — with notes, risk level, and partner sign-off in one place."],
      ]}
    />
  ),
});
